<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HelpArticle;
use App\Models\Inventory;
use App\Models\OrderItem;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\SupportChat;
use App\Models\SupportChatMessage;
use App\Models\SupportTask;
use App\Models\SupportTicket;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Tenant console home.
 *
 * Returns a single consolidated payload the dashboard renders in one pass:
 * headline KPIs with period-over-period deltas, a revenue trend, order status
 * mix, top performing products, store performance, inventory alerts, recent
 * orders and a service-desk snapshot (tickets, tasks and live chat messages).
 */
class DashboardController extends Controller
{
    /** Statuses that never count towards revenue. */
    protected const VOID_STATUSES = [SellerOrder::STATUS_CANCELLED, SellerOrder::STATUS_REFUNDED];

    public function summary(Request $request): JsonResponse
    {
        $days = max(7, min(90, (int) $request->integer('days', 30)));
        $now = now();
        $start = $now->copy()->subDays($days - 1)->startOfDay();
        $prevStart = $start->copy()->subDays($days);
        $prevEnd = $start->copy()->subSecond();
        $today = $now->copy()->startOfDay();
        $yesterday = $today->copy()->subDay();

        $current = $this->periodStats($start, $now);
        $previous = $this->periodStats($prevStart, $prevEnd);
        $todayStats = $this->periodStats($today, $now);
        $yesterdayStats = $this->periodStats($yesterday, $today->copy()->subSecond());

        $openOrders = SellerOrder::query()
            ->whereIn('status', [SellerOrder::STATUS_AWAITING_FULFILLMENT, SellerOrder::STATUS_PROCESSING])
            ->count();

        $inventories = Inventory::query()->with(['variant.product:id,name'])->get();
        $lowStock = $inventories->filter(fn (Inventory $i) => $i->isLowStock());

        return response()->json([
            'data' => [
                'generated_at' => $now->toIso8601String(),
                'range' => [
                    'days' => $days,
                    'from' => $start->toDateString(),
                    'to' => $now->toDateString(),
                ],

                // Legacy keys kept so older clients keep working.
                'sales_today' => (string) $todayStats['revenue'],
                'open_orders' => $openOrders,
                'low_stock' => $lowStock->count(),

                'kpis' => [
                    'revenue_today' => $this->metric($todayStats['revenue'], $yesterdayStats['revenue'], 'currency', 'vs yesterday'),
                    'revenue_period' => $this->metric($current['revenue'], $previous['revenue'], 'currency', 'vs previous period'),
                    'orders_period' => $this->metric($current['orders'], $previous['orders'], 'number', 'vs previous period'),
                    'avg_order_value' => $this->metric($current['aov'], $previous['aov'], 'currency', 'vs previous period'),
                    'net_settlement' => $this->metric($current['net'], $previous['net'], 'currency', 'after commission'),
                    'units_sold' => $this->metric($current['units'], $previous['units'], 'number', 'vs previous period'),
                    'open_orders' => $this->metric($openOrders, $openOrders, 'number', 'awaiting action'),
                    'low_stock' => $this->metric($lowStock->count(), $lowStock->count(), 'number', 'variants below threshold'),
                ],

                'sales_chart' => $this->trend($start, $now),
                'status_breakdown' => $this->statusBreakdown($start),
                'top_products' => $this->topProducts($start, $prevStart, $prevEnd),
                'stores' => $this->storePerformance($start),
                'inventory_alerts' => $this->inventoryAlerts($lowStock),
                'recent_orders' => $this->recentOrders(),
                'support' => $this->supportSnapshot($request),
            ],
        ]);
    }

    // ------------------------------------------------------------- helpers

    /**
     * Revenue / order aggregates for an arbitrary window.
     *
     * @return array{revenue: float, orders: int, aov: float, net: float, units: int}
     */
    protected function periodStats(Carbon $from, Carbon $to): array
    {
        $row = SellerOrder::query()
            ->whereBetween('created_at', [$from, $to])
            ->whereNotIn('status', self::VOID_STATUSES)
            ->selectRaw('count(*) as orders, coalesce(sum(subtotal),0) as revenue, coalesce(sum(net_settlement),0) as net')
            ->first();

        $units = (int) OrderItem::query()
            ->whereIn('seller_order_id', SellerOrder::query()
                ->whereBetween('created_at', [$from, $to])
                ->whereNotIn('status', self::VOID_STATUSES)
                ->select('id'))
            ->sum('qty');

        $orders = (int) ($row->orders ?? 0);
        $revenue = round((float) ($row->revenue ?? 0), 2);

        return [
            'revenue' => $revenue,
            'orders' => $orders,
            'net' => round((float) ($row->net ?? 0), 2),
            'units' => $units,
            'aov' => $orders > 0 ? round($revenue / $orders, 2) : 0.0,
        ];
    }

    /** Shape a value + its delta so the UI never has to compute percentages. */
    protected function metric(float|int $value, float|int $previous, string $format, string $caption): array
    {
        $delta = $previous > 0 ? round((($value - $previous) / $previous) * 100, 1) : ($value > 0 ? 100.0 : 0.0);

        return [
            'value' => is_int($value) ? $value : round((float) $value, 2),
            'previous' => is_int($previous) ? $previous : round((float) $previous, 2),
            'delta' => $delta,
            'direction' => $delta > 0 ? 'up' : ($delta < 0 ? 'down' : 'flat'),
            'format' => $format,
            'caption' => $caption,
        ];
    }

    /** Daily revenue/orders series, zero-filled so the chart has no gaps. */
    protected function trend(Carbon $start, Carbon $end): array
    {
        $rows = SellerOrder::query()
            ->selectRaw('date(created_at) as day, sum(subtotal) as total, count(*) as orders')
            ->where('created_at', '>=', $start)
            ->whereNotIn('status', self::VOID_STATUSES)
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->keyBy('day');

        $series = [];
        for ($cursor = $start->copy(); $cursor <= $end; $cursor->addDay()) {
            $key = $cursor->toDateString();
            $row = $rows->get($key);
            $series[] = [
                'day' => $key,
                'label' => $cursor->format('d M'),
                'total' => round((float) ($row->total ?? 0), 2),
                'orders' => (int) ($row->orders ?? 0),
            ];
        }

        return $series;
    }

    protected function statusBreakdown(Carbon $start): array
    {
        $rows = SellerOrder::query()
            ->selectRaw('status, count(*) as total, coalesce(sum(subtotal),0) as value')
            ->where('created_at', '>=', $start)
            ->groupBy('status')
            ->get();

        return $rows->map(fn ($r) => [
            'status' => $r->status,
            'label' => ucwords(str_replace('_', ' ', (string) $r->status)),
            'count' => (int) $r->total,
            'value' => round((float) $r->value, 2),
        ])->sortByDesc('count')->values()->all();
    }

    /** Best sellers for the window, with movement against the previous window. */
    protected function topProducts(Carbon $start, Carbon $prevStart, Carbon $prevEnd): array
    {
        $aggregate = function (Carbon $from, ?Carbon $to = null) {
            $orders = SellerOrder::query()
                ->where('created_at', '>=', $from)
                ->whereNotIn('status', self::VOID_STATUSES);

            if ($to) {
                $orders->where('created_at', '<=', $to);
            }

            return OrderItem::query()
                ->whereIn('seller_order_id', $orders->select('id'))
                ->selectRaw('product_name, sku, sum(qty) as units, sum(qty * unit_price) as revenue, count(*) as lines')
                ->groupBy('product_name', 'sku')
                ->get()
                ->keyBy(fn ($r) => $r->sku ?: $r->product_name);
        };

        $currentRows = $aggregate($start);
        $previousRows = $aggregate($prevStart, $prevEnd);
        $totalRevenue = (float) $currentRows->sum(fn ($r) => (float) $r->revenue) ?: 1.0;

        $stock = Inventory::query()
            ->with('variant:id,sku')
            ->get()
            ->groupBy(fn (Inventory $i) => $i->variant?->sku)
            ->map(fn ($group) => (int) $group->sum(fn (Inventory $i) => $i->available()));

        return $currentRows
            ->sortByDesc(fn ($r) => (float) $r->revenue)
            ->take(8)
            ->values()
            ->map(function ($r) use ($previousRows, $totalRevenue, $stock) {
                $key = $r->sku ?: $r->product_name;
                $prev = (float) ($previousRows->get($key)->revenue ?? 0);
                $revenue = round((float) $r->revenue, 2);
                $delta = $prev > 0 ? round((($revenue - $prev) / $prev) * 100, 1) : ($revenue > 0 ? 100.0 : 0.0);

                return [
                    'name' => $r->product_name,
                    'sku' => $r->sku,
                    'units' => (int) $r->units,
                    'orders' => (int) $r->lines,
                    'revenue' => $revenue,
                    'share' => round(($revenue / $totalRevenue) * 100, 1),
                    'delta' => $delta,
                    'stock' => $stock[$key] ?? null,
                ];
            })
            ->all();
    }

    protected function storePerformance(Carbon $start): array
    {
        $rows = SellerOrder::query()
            ->selectRaw('store_id, count(*) as orders, coalesce(sum(subtotal),0) as revenue')
            ->where('created_at', '>=', $start)
            ->whereNotIn('status', self::VOID_STATUSES)
            ->groupBy('store_id')
            ->get();

        $stores = Store::query()->get(['id', 'name', 'status'])->keyBy('id');
        $total = (float) $rows->sum(fn ($r) => (float) $r->revenue) ?: 1.0;

        return $rows
            ->sortByDesc(fn ($r) => (float) $r->revenue)
            ->values()
            ->map(fn ($r) => [
                'id' => (int) $r->store_id,
                'name' => $stores[$r->store_id]->name ?? 'Store #'.$r->store_id,
                'status' => $stores[$r->store_id]->status ?? 'unknown',
                'orders' => (int) $r->orders,
                'revenue' => round((float) $r->revenue, 2),
                'share' => round(((float) $r->revenue / $total) * 100, 1),
            ])
            ->all();
    }

    protected function inventoryAlerts(\Illuminate\Support\Collection $lowStock): array
    {
        return $lowStock
            ->sortBy(fn (Inventory $i) => $i->available())
            ->take(6)
            ->values()
            ->map(fn (Inventory $i) => [
                'variant_id' => $i->variant_id,
                'name' => $i->variant?->product?->name ?? 'Variant #'.$i->variant_id,
                'sku' => $i->variant?->sku,
                'available' => $i->available(),
                'threshold' => (int) $i->low_stock_threshold,
                'severity' => $i->available() <= 0 ? 'out' : 'low',
            ])
            ->all();
    }

    protected function recentOrders(): array
    {
        return SellerOrder::query()
            ->with(['store:id,name', 'order.user:id,name,email'])
            ->orderByDesc('id')
            ->limit(8)
            ->get()
            ->map(fn (SellerOrder $o) => [
                'id' => $o->id,
                'reference' => $o->order_id ? 'ORD-'.str_pad((string) $o->order_id, 5, '0', STR_PAD_LEFT) : '#'.$o->id,
                'status' => $o->status,
                'subtotal' => (string) $o->subtotal,
                'store' => $o->store?->name,
                'customer' => $o->order?->user?->name ?? 'Guest',
                'created_at' => optional($o->created_at)->toIso8601String(),
            ])
            ->all();
    }

    /**
     * Service-desk snapshot: ticket/task counters plus the latest live-chat
     * messages so owners can read the conversation without leaving the home
     * screen.
     */
    protected function supportSnapshot(Request $request): array
    {
        $tenantId = $request->user()?->tenantId();
        if (! $tenantId) {
            return ['tickets' => [], 'tasks' => [], 'chat' => null, 'threads' => []];
        }

        TenantContext::bypass(true);

        try {
            $tickets = SupportTicket::query()->where('tenant_id', $tenantId)->get();
            $tasks = SupportTask::query()
                ->where('tenant_id', $tenantId)
                ->where('owner_type', 'tenant')
                ->get();

            $chats = SupportChat::query()
                ->where('tenant_id', $tenantId)
                ->with(['agent:id,name'])
                ->orderByDesc(DB::raw('coalesce(last_message_at, created_at)'))
                ->limit(4)
                ->get();

            $threads = $chats->map(function (SupportChat $chat) {
                $messages = SupportChatMessage::query()
                    ->where('chat_id', $chat->id)
                    ->orderByDesc('id')
                    ->limit(4)
                    ->get()
                    ->sortBy('id')
                    ->values();

                return [
                    'id' => $chat->id,
                    'topic' => $chat->topic ?: 'Support conversation',
                    'status' => $chat->status,
                    'priority' => $chat->priority,
                    'agent' => $chat->agent?->name,
                    'unread' => (int) $chat->unread_count,
                    'last_message_at' => optional($chat->last_message_at ?? $chat->created_at)->toIso8601String(),
                    'messages' => $messages->map(fn (SupportChatMessage $m) => [
                        'id' => $m->id,
                        'author' => $m->author_name,
                        'role' => $m->author_role,
                        'body' => $m->body,
                        'read' => $m->read_at !== null,
                        'at' => optional($m->created_at)->toIso8601String(),
                    ])->all(),
                ];
            })->all();

            $openTickets = $tickets->whereIn('status', SupportTicket::OPEN_STATUSES);

            return [
                'tickets' => [
                    'open' => $openTickets->count(),
                    'awaiting_you' => $tickets->where('status', SupportTicket::STATUS_PENDING)->count(),
                    'resolved' => $tickets->whereIn('status', [SupportTicket::STATUS_RESOLVED, SupportTicket::STATUS_CLOSED])->count(),
                    'total' => $tickets->count(),
                ],
                'tasks' => [
                    'open' => $tasks->where('status', '!=', SupportTask::STATUS_DONE)->count(),
                    'overdue' => $tasks->filter(fn (SupportTask $t) => $t->isOverdue())->count(),
                    'done' => $tasks->where('status', SupportTask::STATUS_DONE)->count(),
                    'total' => $tasks->count(),
                ],
                'guides' => [
                    'published' => HelpArticle::query()->published()->whereIn('audience', ['tenant', 'all'])->count(),
                ],
                'chat' => [
                    'unread' => (int) $chats->sum('unread_count'),
                    'active' => $chats->whereIn('status', [SupportChat::STATUS_QUEUED, SupportChat::STATUS_ACTIVE])->count(),
                ],
                'threads' => $threads,
            ];
        } finally {
            TenantContext::bypass(false);
        }
    }
}
