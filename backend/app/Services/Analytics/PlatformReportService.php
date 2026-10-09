<?php

namespace App\Services\Analytics;

use App\Models\AdCampaign;
use App\Models\AdClick;
use App\Models\AdImpression;
use App\Models\AnalyticsEvent;
use App\Models\PayoutBatch;
use App\Models\SellerOrder;
use App\Models\SellerSettlement;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Platform-wide reporting rollups for the super-admin report workspace
 * (/admin/reports).
 *
 * Mirrors {@see TenantAnalyticsService}: every window is computed together
 * with the immediately preceding window of the same length so KPI cards can
 * show "vs previous period" deltas. Passing a tenant id narrows every rollup to
 * that tenant; leaving it null covers the whole marketplace. Queries run with
 * the tenant scope bypassed and explicit tenant filters.
 */
class PlatformReportService
{
    /** Order states that never count as revenue. */
    protected const EXCLUDED_STATES = [SellerOrder::STATUS_CANCELLED, SellerOrder::STATUS_REFUNDED];

    /** How many tenants the leaderboard lists, ranked by GMV. */
    protected const LEADERBOARD_LIMIT = 25;

    public function report(int $days = 30, ?int $tenantId = null): array
    {
        $days = max(1, min(365, $days));
        $bypassed = TenantContext::isBypassed();
        TenantContext::bypass(true);

        try {
            $end = now()->endOfDay();
            $start = now()->subDays($days - 1)->startOfDay();
            $prevEnd = $start->copy()->subSecond();
            $prevStart = $start->copy()->subDays($days);

            $current = $this->totals($start, $end, $tenantId);
            $previous = $this->totals($prevStart, $prevEnd, $tenantId);
            $platform = $tenantId ? $this->totals($start, $end, null) : $current;

            $tenants = $this->tenantLeaderboard($start, $end, $tenantId, (float) $platform['gmv']);
            $tenantStatus = $this->tenantStatus($tenantId);
            $billing = $this->billing($tenantId);
            $payouts = $this->payouts($start, $end, $tenantId);

            return [
                'range' => [
                    'days' => $days,
                    'start' => $start->toDateString(),
                    'end' => $end->toDateString(),
                    'previous_start' => $prevStart->toDateString(),
                    'previous_end' => $prevEnd->toDateString(),
                ],
                'scope' => [
                    'tenant_id' => $tenantId,
                    'tenant_name' => $tenantId ? $this->tenantName($tenantId) : null,
                ],
                'kpis' => $this->kpis($current, $previous),
                'series' => $this->series($start, $days, $tenantId),
                'funnel' => $this->funnel($start, $end, $tenantId),
                'status_mix' => $this->statusMix($start, $end, $tenantId),
                'top_products' => $this->topProducts($start, $end, $tenantId),
                'tenants' => $tenants,
                'customers' => $this->customers($start, $end, $tenantId),
                'ads' => $this->ads($start, $end, $tenantId),
                'billing' => $billing,
                'payouts' => $payouts,
                'tenant_status' => $tenantStatus,
                'tenant_options' => $this->tenantOptions(),
                'highlights' => $this->highlights($current, $previous, $tenants, $tenantStatus, $payouts),
            ];
        } finally {
            TenantContext::bypass($bypassed);
        }
    }

    // ----------------------------------------------------------- internals

    /** Seller orders in the window, with the tenant filter applied when scoped. */
    protected function orders(Carbon $start, Carbon $end, ?int $tenantId)
    {
        return SellerOrder::withoutGlobalScopes()
            ->when($tenantId, fn ($q) => $q->where('seller_orders.tenant_id', $tenantId))
            ->whereBetween('seller_orders.created_at', [$start, $end])
            ->whereNotIn('seller_orders.status', self::EXCLUDED_STATES);
    }

    /** Product-view events in the window (storefront traffic). */
    protected function views(Carbon $start, Carbon $end, ?int $tenantId)
    {
        return AnalyticsEvent::query()
            ->where('type', 'product.viewed')
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->whereBetween('created_at', [$start, $end]);
    }

    protected function totals(Carbon $start, Carbon $end, ?int $tenantId): array
    {
        $orders = $this->orders($start, $end, $tenantId);

        $row = (clone $orders)->toBase()->select(DB::raw(
            'count(*) as orders,'.
            'coalesce(sum(seller_orders.subtotal),0) as gmv,'.
            'coalesce(sum(seller_orders.commission),0) as commission,'.
            'coalesce(sum(seller_orders.net_settlement),0) as net'
        ))->first();

        $units = (int) DB::table('order_items')
            ->join('seller_orders', 'seller_orders.id', '=', 'order_items.seller_order_id')
            ->when($tenantId, fn ($q) => $q->where('seller_orders.tenant_id', $tenantId))
            ->whereNotIn('seller_orders.status', self::EXCLUDED_STATES)
            ->whereBetween('seller_orders.created_at', [$start, $end])
            ->sum('order_items.qty');

        $buyers = (int) (clone $orders)
            ->join('orders', 'orders.id', '=', 'seller_orders.order_id')
            ->whereNotNull('orders.user_id')
            ->distinct()
            ->count('orders.user_id');

        $activeTenants = (int) (clone $orders)->distinct()->count('seller_orders.tenant_id');

        $newTenants = Tenant::query()
            ->when($tenantId, fn ($q) => $q->whereKey($tenantId))
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $views = $this->views($start, $end, $tenantId)->count();

        $orderCount = (int) ($row->orders ?? 0);
        $gmv = (float) ($row->gmv ?? 0);

        return [
            'orders' => $orderCount,
            'gmv' => round($gmv, 2),
            'commission' => round((float) ($row->commission ?? 0), 2),
            'net' => round((float) ($row->net ?? 0), 2),
            'units' => $units,
            'views' => $views,
            'buyers' => $buyers,
            'active_tenants' => $activeTenants,
            'new_tenants' => $newTenants,
            'aov' => $orderCount > 0 ? round($gmv / $orderCount, 2) : 0.0,
            'conversion' => $views > 0 ? round(($orderCount / $views) * 100, 2) : 0.0,
        ];
    }

    protected function kpis(array $current, array $previous): array
    {
        $keys = ['gmv', 'commission', 'net', 'orders', 'aov', 'units', 'buyers', 'active_tenants', 'new_tenants', 'views', 'conversion'];
        $out = [];

        foreach ($keys as $key) {
            $now = (float) ($current[$key] ?? 0);
            $was = (float) ($previous[$key] ?? 0);

            $out[$key] = [
                'value' => $current[$key] ?? 0,
                'previous' => $previous[$key] ?? 0,
                'delta_percent' => $was > 0 ? round((($now - $was) / $was) * 100, 1) : ($now > 0 ? 100.0 : 0.0),
                'direction' => $now > $was ? 'up' : ($now < $was ? 'down' : 'flat'),
            ];
        }

        return $out;
    }

    /** Zero-filled daily revenue, commission, orders and views for the trend chart. */
    protected function series(Carbon $start, int $days, ?int $tenantId): array
    {
        $orders = SellerOrder::withoutGlobalScopes()
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->whereNotIn('status', self::EXCLUDED_STATES)
            ->where('created_at', '>=', $start)
            ->toBase()
            ->select(
                DB::raw('date(created_at) as day'),
                DB::raw('coalesce(sum(subtotal),0) as gmv'),
                DB::raw('coalesce(sum(commission),0) as commission'),
                DB::raw('count(*) as orders'),
            )
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        $views = AnalyticsEvent::query()
            ->where('type', 'product.viewed')
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->where('created_at', '>=', $start)
            ->toBase()
            ->select(DB::raw('date(created_at) as day'), DB::raw('count(*) as total'))
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        $out = [];
        for ($i = 0; $i < $days; $i++) {
            $day = $start->copy()->addDays($i)->toDateString();
            $out[] = [
                'day' => $day,
                'gmv' => round((float) ($orders->get($day)?->gmv ?? 0), 2),
                'commission' => round((float) ($orders->get($day)?->commission ?? 0), 2),
                'orders' => (int) ($orders->get($day)?->orders ?? 0),
                'views' => (int) ($views->get($day)?->total ?? 0),
            ];
        }

        return $out;
    }

    /**
     * Storefront funnel. Platform-level events are logged with a null tenant
     * and duplicated per seller, so only tenant-attributed events are counted
     * to avoid double counting.
     */
    protected function funnel(Carbon $start, Carbon $end, ?int $tenantId): array
    {
        $count = fn (string $type) => AnalyticsEvent::query()
            ->where('type', $type)
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId), fn ($q) => $q->whereNotNull('tenant_id'))
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $views = $count('product.viewed');
        $carts = $count('cart.updated');
        $placed = $count('order.placed');
        $paid = $count('order.paid');

        $rate = fn (int $a, int $b) => $b > 0 ? round(($a / $b) * 100, 1) : 0.0;

        return [
            'steps' => [
                ['key' => 'views', 'label' => 'Product views', 'value' => $views, 'rate' => 100.0],
                ['key' => 'carts', 'label' => 'Added to cart', 'value' => $carts, 'rate' => $rate($carts, $views)],
                ['key' => 'placed', 'label' => 'Seller orders placed', 'value' => $placed, 'rate' => $rate($placed, $views)],
                ['key' => 'paid', 'label' => 'Paid', 'value' => $paid, 'rate' => $rate($paid, $views)],
            ],
            'cart_abandonment' => $carts > 0 ? round((($carts - $paid) / $carts) * 100, 1) : 0.0,
        ];
    }

    /** Every seller order in the window by status, including cancelled and refunded. */
    protected function statusMix(Carbon $start, Carbon $end, ?int $tenantId): array
    {
        return SellerOrder::withoutGlobalScopes()
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->whereBetween('created_at', [$start, $end])
            ->toBase()
            ->select('status', DB::raw('count(*) as total'), DB::raw('coalesce(sum(subtotal),0) as gmv'))
            ->groupBy('status')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'status' => $row->status,
                'count' => (int) $row->total,
                'gmv' => round((float) $row->gmv, 2),
            ])->all();
    }

    /** Best-selling products across the marketplace, each tagged with its seller. */
    protected function topProducts(Carbon $start, Carbon $end, ?int $tenantId): array
    {
        return DB::table('order_items')
            ->join('seller_orders', 'seller_orders.id', '=', 'order_items.seller_order_id')
            ->join('tenants', 'tenants.id', '=', 'seller_orders.tenant_id')
            ->when($tenantId, fn ($q) => $q->where('seller_orders.tenant_id', $tenantId))
            ->whereNotIn('seller_orders.status', self::EXCLUDED_STATES)
            ->whereBetween('seller_orders.created_at', [$start, $end])
            ->groupBy('tenants.id', 'tenants.name', 'tenants.business_name', 'order_items.product_name', 'order_items.sku')
            ->select(
                'tenants.name as tenant_name',
                'tenants.business_name as tenant_business',
                'order_items.product_name',
                'order_items.sku',
                DB::raw('sum(order_items.qty) as units'),
                DB::raw('sum(order_items.qty * order_items.unit_price) as revenue'),
                DB::raw('count(distinct order_items.seller_order_id) as orders'),
            )
            ->orderByDesc('revenue')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'tenant' => $row->tenant_business ?: $row->tenant_name,
                'name' => $row->product_name,
                'sku' => $row->sku,
                'units' => (int) $row->units,
                'revenue' => round((float) $row->revenue, 2),
                'orders' => (int) $row->orders,
            ])->all();
    }

    /** Sellers ranked by GMV in the window, with take rate and share of the platform. */
    protected function tenantLeaderboard(Carbon $start, Carbon $end, ?int $tenantId, float $platformGmv): array
    {
        return SellerOrder::withoutGlobalScopes()
            ->join('tenants', 'tenants.id', '=', 'seller_orders.tenant_id')
            ->when($tenantId, fn ($q) => $q->where('seller_orders.tenant_id', $tenantId))
            ->whereNotIn('seller_orders.status', self::EXCLUDED_STATES)
            ->whereBetween('seller_orders.created_at', [$start, $end])
            ->toBase()
            ->select(
                'tenants.id',
                'tenants.name',
                'tenants.business_name',
                'tenants.status',
                DB::raw('count(*) as orders'),
                DB::raw('count(distinct seller_orders.store_id) as stores'),
                DB::raw('coalesce(sum(seller_orders.subtotal),0) as gmv'),
                DB::raw('coalesce(sum(seller_orders.commission),0) as commission'),
                DB::raw('coalesce(sum(seller_orders.net_settlement),0) as net'),
            )
            ->groupBy('tenants.id', 'tenants.name', 'tenants.business_name', 'tenants.status')
            ->orderByDesc('gmv')
            ->limit(self::LEADERBOARD_LIMIT)
            ->get()
            ->map(function ($row) use ($platformGmv) {
                $gmv = round((float) $row->gmv, 2);
                $commission = round((float) $row->commission, 2);

                return [
                    'id' => (int) $row->id,
                    'name' => $row->business_name ?: $row->name,
                    'status' => $row->status,
                    'stores' => (int) $row->stores,
                    'orders' => (int) $row->orders,
                    'gmv' => $gmv,
                    'commission' => $commission,
                    'net' => round((float) $row->net, 2),
                    'take_rate' => $gmv > 0 ? round(($commission / $gmv) * 100, 2) : 0.0,
                    'share' => $platformGmv > 0 ? round(($gmv / $platformGmv) * 100, 1) : 0.0,
                ];
            })
            ->values()
            ->all();
    }

    /** Buyer loyalty. A buyer is repeat when they placed more than one checkout. */
    protected function customers(Carbon $start, Carbon $end, ?int $tenantId): array
    {
        $rows = $this->orders($start, $end, $tenantId)
            ->join('orders', 'orders.id', '=', 'seller_orders.order_id')
            ->whereNotNull('orders.user_id')
            ->toBase()
            ->select(
                'orders.user_id',
                DB::raw('count(distinct seller_orders.order_id) as checkouts'),
                DB::raw('sum(seller_orders.subtotal) as gmv'),
            )
            ->groupBy('orders.user_id')
            ->get();

        $total = $rows->count();
        $repeat = $rows->filter(fn ($r) => (int) $r->checkouts > 1)->count();
        $gmv = (float) $rows->sum('gmv');

        return [
            'buyers' => $total,
            'repeat_buyers' => $repeat,
            'repeat_rate' => $total > 0 ? round(($repeat / $total) * 100, 1) : 0.0,
            'revenue_per_buyer' => $total > 0 ? round($gmv / $total, 2) : 0.0,
        ];
    }

    protected function ads(Carbon $start, Carbon $end, ?int $tenantId): array
    {
        $campaigns = fn () => AdCampaign::withoutGlobalScopes()
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->select('id');

        $impressions = AdImpression::query()
            ->whereIn('campaign_id', $campaigns())
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $clicks = AdClick::query()
            ->whereIn('campaign_id', $campaigns())
            ->whereBetween('created_at', [$start, $end]);

        $clickCount = (clone $clicks)->count();
        $spend = round((float) (clone $clicks)->sum('cost'), 2);

        return [
            'impressions' => $impressions,
            'clicks' => $clickCount,
            'spend' => $spend,
            'ctr' => $impressions > 0 ? round(($clickCount / $impressions) * 100, 2) : 0.0,
            'avg_cpc' => $clickCount > 0 ? round($spend / $clickCount, 4) : 0.0,
        ];
    }

    /**
     * Subscription revenue. MRR and open invoices are point-in-time snapshots;
     * collected invoices are limited to the window by the caller's period.
     */
    protected function billing(?int $tenantId): array
    {
        $subscriptions = Subscription::query()
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->whereIn('status', Subscription::BILLABLE)
            ->get();

        $invoices = SubscriptionInvoice::query()
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId));

        $open = (clone $invoices)->where('status', SubscriptionInvoice::STATUS_OPEN);

        return [
            'mrr' => round((float) $subscriptions->sum(fn (Subscription $s) => $s->monthlyAmount()), 2),
            'active_subscriptions' => $subscriptions->count(),
            'open_invoices' => (clone $open)->count(),
            'open_amount' => round((float) (clone $open)->sum('amount'), 2),
        ];
    }

    /** Payout pipeline: batches created in the window by status, plus settlements on hold. */
    protected function payouts(Carbon $start, Carbon $end, ?int $tenantId): array
    {
        $byStatus = PayoutBatch::query()
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->whereBetween('created_at', [$start, $end])
            ->toBase()
            ->select('status', DB::raw('count(*) as total'), DB::raw('coalesce(sum(net),0) as net'))
            ->groupBy('status')
            ->get()
            ->map(fn ($row) => [
                'status' => $row->status,
                'count' => (int) $row->total,
                'net' => round((float) $row->net, 2),
            ])->values()->all();

        $hold = SellerSettlement::query()
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->where('status', SellerSettlement::STATUS_ON_HOLD)
            ->toBase()
            ->selectRaw('count(*) as total, coalesce(sum(net),0) as net')
            ->first();

        return [
            'by_status' => $byStatus,
            'on_hold' => [
                'count' => (int) ($hold->total ?? 0),
                'net' => round((float) ($hold->net ?? 0), 2),
            ],
        ];
    }

    /** Current tenant count per lifecycle status (snapshot, not windowed). */
    protected function tenantStatus(?int $tenantId): array
    {
        $counts = Tenant::query()
            ->when($tenantId, fn ($q) => $q->whereKey($tenantId))
            ->toBase()
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        return collect([
            Tenant::STATUS_ACTIVE,
            Tenant::STATUS_PENDING,
            Tenant::STATUS_SUSPENDED,
            Tenant::STATUS_REJECTED,
        ])->map(fn (string $status) => [
            'status' => $status,
            'count' => (int) ($counts->get($status) ?? 0),
        ])->values()->all();
    }

    /** Every tenant, for the scope picker. */
    protected function tenantOptions(): array
    {
        return Tenant::query()
            ->orderBy('name')
            ->limit(500)
            ->get(['id', 'name', 'business_name'])
            ->map(fn (Tenant $tenant) => [
                'id' => $tenant->id,
                'name' => $tenant->business_name ?: $tenant->name,
            ])->values()->all();
    }

    protected function tenantName(int $tenantId): ?string
    {
        $tenant = Tenant::query()->find($tenantId, ['id', 'name', 'business_name']);

        return $tenant ? ($tenant->business_name ?: $tenant->name) : null;
    }

    /** Short, plain-language takeaways shown above the charts. */
    protected function highlights(array $current, array $previous, array $tenants, array $tenantStatus, array $payouts): array
    {
        $out = [];
        $gmv = (float) $current['gmv'];
        $was = (float) $previous['gmv'];
        $delta = $was > 0 ? round((($gmv - $was) / $was) * 100, 1) : ($gmv > 0 ? 100.0 : 0.0);

        $out[] = [
            'tone' => $delta > 0 ? 'positive' : ($delta < 0 ? 'negative' : 'neutral'),
            'title' => $delta === 0.0 ? 'Revenue flat' : 'Revenue '.($delta > 0 ? 'up' : 'down').' '.abs($delta).'%',
            'detail' => 'Compared with the previous period of the same length.',
        ];

        if ($current['orders'] > 0) {
            $out[] = [
                'tone' => 'neutral',
                'title' => 'Take rate '.number_format($gmv > 0 ? ($current['commission'] / $gmv) * 100 : 0, 1).'%',
                'detail' => number_format($current['commission'], 2).' commission on '.number_format($gmv, 2).' GMV across '.$current['orders'].' seller orders.',
            ];
        }

        if ($tenants !== []) {
            $leader = $tenants[0];
            $out[] = [
                'tone' => 'neutral',
                'title' => $leader['name'].' leads with '.$leader['share'].'% of GMV',
                'detail' => $leader['orders'].' orders from '.$leader['stores'].' store(s) in the window.',
            ];
        }

        $pending = 0;
        foreach ($tenantStatus as $row) {
            if ($row['status'] === Tenant::STATUS_PENDING) {
                $pending = (int) $row['count'];
            }
        }
        if ($pending > 0) {
            $out[] = [
                'tone' => 'neutral',
                'title' => $pending.' seller application(s) waiting',
                'detail' => 'Review them in Tenants to activate or reject.',
            ];
        }

        if ((int) $payouts['on_hold']['count'] > 0) {
            $out[] = [
                'tone' => 'negative',
                'title' => $payouts['on_hold']['count'].' settlement(s) on hold',
                'detail' => 'Release or reverse them from Payouts before the next batch.',
            ];
        }

        if ((int) $current['views'] === 0) {
            $out[] = [
                'tone' => 'neutral',
                'title' => 'No storefront traffic recorded',
                'detail' => 'Product views appear here once shoppers browse published stores.',
            ];
        }

        return array_slice($out, 0, 5);
    }
}
