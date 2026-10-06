<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Refund;
use App\Models\SellerOrder;
use App\Services\Commerce\RefundService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * §12 / §18 — refunds.
 *
 * Customers open requests against their own seller orders; sellers triage
 * the queue for their workspace. Both share one presenter so the Angular
 * models stay identical on either side.
 */
class RefundController extends Controller
{
    public function __construct(protected RefundService $refunds) {}

    /** Customer: my refund requests. */
    public function mine(Request $request): JsonResponse
    {
        TenantContext::bypass(true);
        try {
            $page = Refund::query()
                ->with(['items.orderItem', 'sellerOrder.store:id,name,slug'])
                ->whereHas('order', fn ($q) => $q->where('user_id', $request->user()->id))
                ->orderByDesc('id')
                ->paginate($request->integer('per_page', 15));

            return response()->json([
                'data' => collect($page->items())->map(fn (Refund $r) => $this->present($r))->all(),
                'meta' => $this->meta($page),
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    /** Customer: open a refund request on one seller order. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'seller_order_id' => ['required', 'integer', 'exists:seller_orders,id'],
            'type' => ['nullable', 'in:'.implode(',', Refund::TYPES)],
            'reason' => ['required', 'in:'.implode(',', Refund::REASONS)],
            'customer_note' => ['nullable', 'string', 'max:2000'],
            'amount' => ['nullable', 'numeric', 'min:0.01'],
            'items' => ['nullable', 'array'],
            'items.*.order_item_id' => ['required_with:items', 'integer'],
            'items.*.qty' => ['required_with:items', 'integer', 'min:1'],
        ]);

        TenantContext::bypass(true);
        try {
            $sellerOrder = SellerOrder::withoutGlobalScopes()
                ->whereHas('order', fn ($q) => $q->where('user_id', $request->user()->id))
                ->findOrFail($data['seller_order_id']);

            $refund = $this->refunds->create($sellerOrder, $request->user(), $data);

            return response()->json(['data' => $this->present($refund)], 201);
        } finally {
            TenantContext::bypass(false);
        }
    }

    /** Customer: withdraw a request that has not been decided yet. */
    public function cancel(Request $request, Refund $refund): JsonResponse
    {
        TenantContext::bypass(true);
        try {
            abort_unless((int) ($refund->order?->user_id) === (int) $request->user()->id, 403, 'Not your refund.');
            abort_unless($refund->status === Refund::STATUS_REQUESTED, 422, 'This refund is already being handled.');

            $refund->update(['status' => Refund::STATUS_REJECTED, 'decision_note' => 'Withdrawn by the customer.']);

            return response()->json(['data' => $this->present($refund->fresh())]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    /** Seller: the refund queue for this workspace. */
    public function index(Request $request): JsonResponse
    {
        $query = Refund::query()
            ->with(['items.orderItem', 'order:id,user_id,currency,placed_at', 'order.user:id,name,email', 'sellerOrder:id,store_id,grand_total'])
            ->where('tenant_id', TenantContext::id());

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('reference', 'like', $term)->orWhere('customer_note', 'like', $term));
        }

        $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (Refund $r) => $this->present($r, true))->all(),
            'summary' => $this->summary(TenantContext::id()),
            'meta' => $this->meta($page),
        ]);
    }

    public function show(Refund $refund): JsonResponse
    {
        $this->assertTenant($refund);

        return response()->json(['data' => $this->present($refund->load(['items.orderItem', 'order.user:id,name,email']), true)]);
    }

    /** Seller/admin: approve and immediately process. */
    public function approve(Request $request, Refund $refund): JsonResponse
    {
        $this->assertTenant($refund);
        $data = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        $updated = $this->refunds->approve($refund, $request->user(), $data['note'] ?? null);

        return response()->json(['data' => $this->present($updated, true)]);
    }

    public function reject(Request $request, Refund $refund): JsonResponse
    {
        $this->assertTenant($refund);
        $data = $request->validate(['note' => ['required', 'string', 'max:1000']]);

        $updated = $this->refunds->reject($refund, $request->user(), $data['note']);

        return response()->json(['data' => $this->present($updated, true)]);
    }

    /** Seller: issue a goodwill refund without a customer request. */
    public function issue(Request $request): JsonResponse
    {
        $data = $request->validate([
            'seller_order_id' => ['required', 'integer', 'exists:seller_orders,id'],
            'type' => ['nullable', 'in:'.implode(',', Refund::TYPES)],
            'reason' => ['nullable', 'in:'.implode(',', Refund::REASONS)],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'customer_note' => ['nullable', 'string', 'max:2000'],
            'restock' => ['nullable', 'boolean'],
        ]);

        $sellerOrder = SellerOrder::query()->findOrFail($data['seller_order_id']);
        abort_unless((int) $sellerOrder->tenant_id === (int) TenantContext::id(), 403, 'Not your order.');

        $refund = $this->refunds->create($sellerOrder, $request->user(), [
            ...$data,
            'reason' => $data['reason'] ?? 'other',
            'type' => $data['type'] ?? Refund::TYPE_GOODWILL,
            'status' => Refund::STATUS_APPROVED,
        ]);

        $processed = $this->refunds->process($refund->fresh(), $request->user());

        return response()->json(['data' => $this->present($processed, true)], 201);
    }

    /** What is still refundable on a seller order. */
    public function refundable(SellerOrder $sellerOrder): JsonResponse
    {
        abort_unless((int) $sellerOrder->tenant_id === (int) TenantContext::id(), 403, 'Not your order.');

        return response()->json([
            'data' => [
                'seller_order_id' => $sellerOrder->id,
                'grand_total' => (string) $sellerOrder->grand_total,
                'refunded_total' => $sellerOrder->refundedTotal(),
                'refundable_total' => $sellerOrder->refundableTotal(),
                'currency' => $sellerOrder->currency,
                'items' => $sellerOrder->items()->get()->map(fn ($item) => [
                    'order_item_id' => $item->id,
                    'product_name' => $item->product_name,
                    'sku' => $item->sku,
                    'qty' => (int) $item->qty,
                    'unit_price' => (string) $item->unit_price,
                    'line_total' => (string) $item->line_total,
                ])->values(),
            ],
        ]);
    }

    // ----------------------------------------------------------- internals

    protected function assertTenant(Refund $refund): void
    {
        abort_unless((int) $refund->tenant_id === (int) TenantContext::id(), 403, 'Not your workspace.');
    }

    protected function summary(?int $tenantId): array
    {
        $base = Refund::query()->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId));

        return [
            'open' => (clone $base)->whereIn('status', Refund::OPEN_STATUSES)->count(),
            'completed' => (clone $base)->where('status', Refund::STATUS_COMPLETED)->count(),
            'rejected' => (clone $base)->where('status', Refund::STATUS_REJECTED)->count(),
            'refunded_value' => number_format(
                (float) (clone $base)->where('status', Refund::STATUS_COMPLETED)->sum('amount'), 2, '.', ''
            ),
        ];
    }

    protected function present(Refund $refund, bool $internal = false): array
    {
        return [
            'id' => $refund->id,
            'reference' => $refund->reference,
            'order_id' => $refund->order_id,
            'seller_order_id' => $refund->seller_order_id,
            'tenant_id' => $refund->tenant_id,
            'dispute_id' => $refund->dispute_id,
            'type' => $refund->type,
            'reason' => $refund->reason,
            'status' => $refund->status,
            'amount' => (string) $refund->amount,
            'delivery_refund' => (string) $refund->delivery_refund,
            'commission_reversal' => (string) $refund->commission_reversal,
            'net_seller_impact' => (string) $refund->net_seller_impact,
            'currency' => $refund->currency,
            'customer_note' => $refund->customer_note,
            'decision_note' => $refund->decision_note,
            'restock' => (bool) $refund->restock,
            'requested_at' => $refund->created_at,
            'reviewed_at' => $refund->reviewed_at,
            'processed_at' => $refund->processed_at,
            'gateway_ref' => $internal ? $refund->gateway_ref : null,
            'store' => $refund->relationLoaded('sellerOrder') && $refund->sellerOrder?->store ? [
                'id' => $refund->sellerOrder->store->id,
                'name' => $refund->sellerOrder->store->name,
                'slug' => $refund->sellerOrder->store->slug,
            ] : null,
            'customer' => $internal && $refund->relationLoaded('order') && $refund->order?->user ? [
                'id' => $refund->order->user->id,
                'name' => $refund->order->user->name,
                'email' => $refund->order->user->email,
            ] : null,
            'items' => $refund->relationLoaded('items')
                ? $refund->items->map(fn ($line) => [
                    'id' => $line->id,
                    'order_item_id' => $line->order_item_id,
                    'product_name' => $line->orderItem?->product_name,
                    'qty' => (int) $line->qty,
                    'unit_price' => (string) $line->unit_price,
                    'amount' => (string) $line->amount,
                ])->values()
                : [],
        ];
    }

    protected function meta($page): array
    {
        return [
            'page' => $page->currentPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
            'last_page' => $page->lastPage(),
        ];
    }
}
