<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\SellerOrder;
use App\Services\Integration\EventBus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SellerOrderController extends Controller
{
    /** Columns that are safe to sort the fulfillment queue by. */
    protected const SORTABLE_COLUMNS = ['id', 'created_at', 'subtotal', 'net_settlement'];

    public function __construct(protected EventBus $events) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SellerOrder::class);

        // Base query carries every filter except status, so the status tab
        // badge counts stay accurate no matter which tab is currently active.
        $base = SellerOrder::query();
        $this->applyCommonFilters($base, $request);

        $stats = $this->buildStats(clone $base);

        $list = (clone $base)->with(['items', 'store', 'order.user', 'order.shippingAddress', 'settlement']);
        if ($request->filled('status')) {
            $list->where('status', $request->string('status'));
        }

        $sortBy = $request->string('sort_by', 'id')->toString();
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'id';
        $sortDir = strtolower($request->string('sort_dir', 'desc')->toString()) === 'asc' ? 'asc' : 'desc';
        $list->orderBy($sortBy, $sortDir);
        if ($sortBy !== 'id') {
            $list->orderByDesc('id');
        }

        $page = $list->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
            'stats' => $stats,
        ]);
    }

    public function show(SellerOrder $order): JsonResponse
    {
        $this->authorize('view', $order);

        return response()->json(['data' => $order->load(['items', 'store', 'order.user', 'order.shippingAddress', 'settlement'])]);
    }

    public function updateStatus(Request $request, SellerOrder $order): JsonResponse
    {
        $this->authorize('update', $order);
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(array_keys(SellerOrder::TRANSITIONS))],
        ]);
        if (! $order->canTransitionTo($data['status'])) {
            throw ValidationException::withMessages([
                'status' => "Cannot transition from {$order->status} to {$data['status']}.",
            ]);
        }
        $order->update(['status' => $data['status']]);
        $this->syncMasterOrder($order);
        $event = match ($data['status']) {
            SellerOrder::STATUS_SHIPPED => 'order.shipped',
            SellerOrder::STATUS_DELIVERED, SellerOrder::STATUS_COMPLETED => 'order.delivered',
            SellerOrder::STATUS_CANCELLED => 'order.cancelled',
            SellerOrder::STATUS_REFUNDED => 'order.refunded',
            default => null,
        };
        if ($event) {
            $this->events->emit((int) $order->tenant_id, $event, [
                'seller_order_id' => $order->id,
                'order_id' => $order->order_id,
                'status' => $data['status'],
            ]);
        }

        return response()->json(['data' => $order->fresh(['items', 'store', 'order.user', 'order.shippingAddress', 'settlement'])]);
    }

    /**
     * Apply search, store and date-range filters shared by the list and the
     * KPI stats queries. Status is intentionally excluded so callers can
     * decide whether/when to narrow by the active tab.
     */
    protected function applyCommonFilters(Builder $query, Request $request): void
    {
        if ($request->filled('store_id')) {
            $query->where('store_id', $request->integer('store_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->string('date_from')->toString());
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->string('date_to')->toString());
        }

        if ($request->filled('q')) {
            $like = '%'.trim($request->string('q')->toString()).'%';
            $query->where(function (Builder $w) use ($like) {
                $w->where('id', 'like', $like)
                    ->orWhere('order_id', 'like', $like)
                    ->orWhereHas('order.user', fn (Builder $u) => $u->where('name', 'like', $like)->orWhere('email', 'like', $like))
                    ->orWhereHas('items', fn (Builder $i) => $i->where('product_name', 'like', $like)->orWhere('sku', 'like', $like));
            });
        }
    }

    /**
     * @return array<string, int|float>
     */
    protected function buildStats(Builder $base): array
    {
        $statusCounts = (clone $base)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $nonCancelledPayout = (clone $base)
            ->whereNotIn('status', [SellerOrder::STATUS_CANCELLED, SellerOrder::STATUS_REFUNDED])
            ->sum('net_settlement');

        return [
            'total_count' => (int) $statusCounts->sum(),
            'awaiting_fulfillment_count' => (int) ($statusCounts[SellerOrder::STATUS_AWAITING_FULFILLMENT] ?? 0),
            'processing_count' => (int) ($statusCounts[SellerOrder::STATUS_PROCESSING] ?? 0),
            'shipped_count' => (int) ($statusCounts[SellerOrder::STATUS_SHIPPED] ?? 0),
            'delivered_count' => (int) ($statusCounts[SellerOrder::STATUS_DELIVERED] ?? 0),
            'completed_count' => (int) ($statusCounts[SellerOrder::STATUS_COMPLETED] ?? 0),
            'cancelled_count' => (int) ($statusCounts[SellerOrder::STATUS_CANCELLED] ?? 0) + (int) ($statusCounts[SellerOrder::STATUS_REFUNDED] ?? 0),
            'total_net_payout' => round((float) $nonCancelledPayout, 2),
        ];
    }

    protected function syncMasterOrder(SellerOrder $sellerOrder): void
    {
        $master = Order::query()->with(['sellerOrders' => fn ($q) => $q->withoutGlobalScopes()])->find($sellerOrder->order_id);
        if (! $master) {
            return;
        }
        $statuses = $master->sellerOrders()->withoutGlobalScopes()->pluck('status');
        if ($statuses->every(fn ($s) => in_array($s, [SellerOrder::STATUS_DELIVERED, SellerOrder::STATUS_COMPLETED], true))) {
            $master->update(['status' => Order::STATUS_FULFILLED]);
        } elseif ($statuses->contains(SellerOrder::STATUS_SHIPPED) || $statuses->contains(SellerOrder::STATUS_PROCESSING)) {
            $master->update(['status' => Order::STATUS_PARTIALLY_FULFILLED]);
        }
    }
}
