<?php

namespace App\Services\Analytics;

use App\Models\AdCampaign;
use App\Models\AdClick;
use App\Models\AdImpression;
use App\Models\AnalyticsEvent;
use App\Models\SellerOrder;
use App\Support\TenantContext;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Reporting rollups for the tenant analytics workspace.
 *
 * Everything is computed for a window *and* the immediately preceding window
 * of the same length, so the UI can show "vs previous period" deltas instead
 * of bare numbers. Queries run with the tenant scope bypassed and an explicit
 * tenant filter, matching {@see AnalyticsService}.
 */
class TenantAnalyticsService
{
    /** Order states that should never count as revenue. */
    protected const EXCLUDED_STATES = [SellerOrder::STATUS_CANCELLED, SellerOrder::STATUS_REFUNDED];

    public function report(int $tenantId, int $days = 30, ?int $storeId = null): array
    {
        $days = max(1, min(365, $days));
        $bypassed = TenantContext::isBypassed();
        TenantContext::bypass(true);

        try {
            $end = now()->endOfDay();
            $start = now()->subDays($days - 1)->startOfDay();
            $prevEnd = $start->copy()->subSecond();
            $prevStart = $start->copy()->subDays($days);

            $current = $this->totals($tenantId, $start, $end, $storeId);
            $previous = $this->totals($tenantId, $prevStart, $prevEnd, $storeId);

            return [
                'range' => [
                    'days' => $days,
                    'start' => $start->toDateString(),
                    'end' => $end->toDateString(),
                    'previous_start' => $prevStart->toDateString(),
                    'previous_end' => $prevEnd->toDateString(),
                ],
                'kpis' => $this->kpis($current, $previous),
                'series' => $this->series($tenantId, $start, $days, $storeId),
                'funnel' => $this->funnel($tenantId, $start, $end),
                'status_mix' => $this->statusMix($tenantId, $start, $end, $storeId),
                'top_products' => $this->topProducts($tenantId, $start, $end, $storeId),
                'stores' => $this->storeBreakdown($tenantId, $start, $end),
                'customers' => $this->customers($tenantId, $start, $end, $storeId),
                'ads' => $this->ads($tenantId, $start, $end),
                'highlights' => $this->highlights($current, $previous),
            ];
        } finally {
            TenantContext::bypass($bypassed);
        }
    }

    // ----------------------------------------------------------- internals

    protected function orders(int $tenantId, Carbon $start, Carbon $end, ?int $storeId = null)
    {
        return SellerOrder::withoutGlobalScopes()
            ->where('seller_orders.tenant_id', $tenantId)
            ->when($storeId, fn ($q) => $q->where('seller_orders.store_id', $storeId))
            ->whereBetween('seller_orders.created_at', [$start, $end])
            ->whereNotIn('seller_orders.status', self::EXCLUDED_STATES);
    }

    protected function totals(int $tenantId, Carbon $start, Carbon $end, ?int $storeId): array
    {
        $row = $this->orders($tenantId, $start, $end, $storeId)
            ->toBase()
            ->select(DB::raw(
                'count(*) as orders,'.
                'coalesce(sum(subtotal),0) as gmv,'.
                'coalesce(sum(commission),0) as commission,'.
                'coalesce(sum(net_settlement),0) as net,'.
                'coalesce(sum(delivery_fee),0) as delivery'
            ))->first();

        $units = (int) DB::table('order_items')
            ->join('seller_orders', 'seller_orders.id', '=', 'order_items.seller_order_id')
            ->where('seller_orders.tenant_id', $tenantId)
            ->when($storeId, fn ($q) => $q->where('seller_orders.store_id', $storeId))
            ->whereNotIn('seller_orders.status', self::EXCLUDED_STATES)
            ->whereBetween('seller_orders.created_at', [$start, $end])
            ->sum('order_items.qty');

        $views = AnalyticsEvent::query()
            ->where('tenant_id', $tenantId)
            ->where('type', 'product.viewed')
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $customers = (int) $this->orders($tenantId, $start, $end, $storeId)
            ->join('orders', 'orders.id', '=', 'seller_orders.order_id')
            ->distinct()
            ->count('orders.user_id');

        $orders = (int) ($row->orders ?? 0);
        $gmv = (float) ($row->gmv ?? 0);

        return [
            'orders' => $orders,
            'gmv' => round($gmv, 2),
            'commission' => round((float) ($row->commission ?? 0), 2),
            'net' => round((float) ($row->net ?? 0), 2),
            'delivery' => round((float) ($row->delivery ?? 0), 2),
            'units' => $units,
            'views' => $views,
            'customers' => $customers,
            'aov' => $orders > 0 ? round($gmv / $orders, 2) : 0.0,
            'conversion' => $views > 0 ? round(($orders / $views) * 100, 2) : 0.0,
        ];
    }

    protected function kpis(array $current, array $previous): array
    {
        $keys = ['gmv', 'orders', 'aov', 'net', 'units', 'customers', 'views', 'conversion', 'commission'];
        $out = [];
        foreach ($keys as $key) {
            $now = $current[$key] ?? 0;
            $was = $previous[$key] ?? 0;
            $out[$key] = [
                'value' => $now,
                'previous' => $was,
                'delta_percent' => $was > 0 ? round((($now - $was) / $was) * 100, 1) : ($now > 0 ? 100.0 : 0.0),
                'direction' => $now > $was ? 'up' : ($now < $was ? 'down' : 'flat'),
            ];
        }

        return $out;
    }

    /** Daily revenue/orders/units/views for the trend chart. */
    protected function series(int $tenantId, Carbon $start, int $days, ?int $storeId): array
    {
        $orders = SellerOrder::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereNotIn('status', self::EXCLUDED_STATES)
            ->where('created_at', '>=', $start)
            ->toBase()
            ->select(DB::raw('date(created_at) as day'), DB::raw('sum(subtotal) as gmv'), DB::raw('count(*) as orders'))
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        $views = AnalyticsEvent::query()
            ->where('tenant_id', $tenantId)
            ->where('type', 'product.viewed')
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
                'orders' => (int) ($orders->get($day)?->orders ?? 0),
                'views' => (int) ($views->get($day)?->total ?? 0),
            ];
        }

        return $out;
    }

    protected function funnel(int $tenantId, Carbon $start, Carbon $end): array
    {
        $count = fn (string $type) => AnalyticsEvent::query()
            ->where('tenant_id', $tenantId)
            ->where('type', $type)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $views = $count('product.viewed');
        $carts = $count('cart.updated');
        $checkouts = $count('order.placed');
        $paid = $count('order.paid');

        $rate = fn (int $a, int $b) => $b > 0 ? round(($a / $b) * 100, 1) : 0.0;

        return [
            'steps' => [
                ['key' => 'views', 'label' => 'Product views', 'value' => $views, 'rate' => 100.0],
                ['key' => 'carts', 'label' => 'Added to cart', 'value' => $carts, 'rate' => $rate($carts, $views)],
                ['key' => 'checkouts', 'label' => 'Checkout started', 'value' => $checkouts, 'rate' => $rate($checkouts, $views)],
                ['key' => 'paid', 'label' => 'Paid', 'value' => $paid, 'rate' => $rate($paid, $views)],
            ],
            'cart_abandonment' => $carts > 0 ? round((($carts - $paid) / $carts) * 100, 1) : 0.0,
        ];
    }

    protected function statusMix(int $tenantId, Carbon $start, Carbon $end, ?int $storeId): array
    {
        return SellerOrder::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereBetween('created_at', [$start, $end])
            ->toBase()
            ->select('status', DB::raw('count(*) as total'), DB::raw('coalesce(sum(subtotal),0) as gmv'))
            ->groupBy('status')
            ->get()
            ->map(fn ($row) => [
                'status' => $row->status,
                'count' => (int) $row->total,
                'gmv' => round((float) $row->gmv, 2),
            ])->all();
    }

    protected function topProducts(int $tenantId, Carbon $start, Carbon $end, ?int $storeId): array
    {
        return DB::table('order_items')
            ->join('seller_orders', 'seller_orders.id', '=', 'order_items.seller_order_id')
            ->where('seller_orders.tenant_id', $tenantId)
            ->when($storeId, fn ($q) => $q->where('seller_orders.store_id', $storeId))
            ->whereNotIn('seller_orders.status', self::EXCLUDED_STATES)
            ->whereBetween('seller_orders.created_at', [$start, $end])
            ->groupBy('order_items.product_name', 'order_items.sku')
            ->select(
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
                'name' => $row->product_name,
                'sku' => $row->sku,
                'units' => (int) $row->units,
                'revenue' => round((float) $row->revenue, 2),
                'orders' => (int) $row->orders,
            ])->all();
    }

    protected function storeBreakdown(int $tenantId, Carbon $start, Carbon $end): array
    {
        return SellerOrder::withoutGlobalScopes()
            ->where('seller_orders.tenant_id', $tenantId)
            ->whereNotIn('seller_orders.status', self::EXCLUDED_STATES)
            ->whereBetween('seller_orders.created_at', [$start, $end])
            ->join('stores', 'stores.id', '=', 'seller_orders.store_id')
            ->toBase()
            ->select(
                'stores.id',
                'stores.name',
                'stores.currency',
                DB::raw('count(*) as orders'),
                DB::raw('coalesce(sum(seller_orders.subtotal),0) as gmv'),
                DB::raw('coalesce(sum(seller_orders.net_settlement),0) as net'),
            )
            ->groupBy('stores.id', 'stores.name', 'stores.currency')
            ->orderByDesc('gmv')
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'currency' => $row->currency,
                'orders' => (int) $row->orders,
                'gmv' => round((float) $row->gmv, 2),
                'net' => round((float) $row->net, 2),
            ])->all();
    }

    protected function customers(int $tenantId, Carbon $start, Carbon $end, ?int $storeId): array
    {
        $rows = $this->orders($tenantId, $start, $end, $storeId)
            ->join('orders', 'orders.id', '=', 'seller_orders.order_id')
            ->toBase()
            ->select('orders.user_id', DB::raw('count(*) as orders'), DB::raw('sum(seller_orders.subtotal) as gmv'))
            ->groupBy('orders.user_id')
            ->get();

        $repeat = $rows->filter(fn ($r) => (int) $r->orders > 1)->count();
        $total = $rows->count();
        $gmv = (float) $rows->sum('gmv');

        return [
            'buyers' => $total,
            'repeat_buyers' => $repeat,
            'repeat_rate' => $total > 0 ? round(($repeat / $total) * 100, 1) : 0.0,
            'revenue_per_buyer' => $total > 0 ? round($gmv / $total, 2) : 0.0,
        ];
    }

    protected function ads(int $tenantId, Carbon $start, Carbon $end): array
    {
        $campaignIds = AdCampaign::withoutGlobalScopes()->where('tenant_id', $tenantId)->pluck('id');
        if ($campaignIds->isEmpty()) {
            return ['impressions' => 0, 'clicks' => 0, 'spend' => 0.0, 'ctr' => 0.0, 'avg_cpc' => 0.0, 'roas' => null];
        }

        $impressions = AdImpression::query()->whereIn('campaign_id', $campaignIds)->whereBetween('created_at', [$start, $end])->count();
        $clicks = AdClick::query()->whereIn('campaign_id', $campaignIds)->whereBetween('created_at', [$start, $end]);
        $clickCount = (clone $clicks)->count();
        $spend = (float) (clone $clicks)->sum('cost');

        return [
            'impressions' => $impressions,
            'clicks' => $clickCount,
            'spend' => round($spend, 2),
            'ctr' => $impressions > 0 ? round(($clickCount / $impressions) * 100, 2) : 0.0,
            'avg_cpc' => $clickCount > 0 ? round($spend / $clickCount, 4) : 0.0,
            'roas' => null,
        ];
    }

    /** Short, plain-language takeaways rendered above the charts. */
    protected function highlights(array $current, array $previous): array
    {
        $out = [];
        $delta = fn (float $now, float $was) => $was > 0 ? round((($now - $was) / $was) * 100, 1) : ($now > 0 ? 100.0 : 0.0);

        $gmvDelta = $delta((float) $current['gmv'], (float) $previous['gmv']);
        $out[] = [
            'tone' => $gmvDelta >= 0 ? 'positive' : 'negative',
            'title' => 'Revenue '.($gmvDelta >= 0 ? 'up' : 'down').' '.abs($gmvDelta).'%',
            'detail' => 'Compared with the previous period of the same length.',
        ];

        if ($current['orders'] > 0) {
            $out[] = [
                'tone' => 'neutral',
                'title' => 'Average order value '.number_format($current['aov'], 2),
                'detail' => $current['orders'].' orders from '.$current['customers'].' buyers.',
            ];
        }

        if ($current['views'] > 0) {
            $tone = $current['conversion'] >= ($previous['conversion'] ?? 0) ? 'positive' : 'negative';
            $out[] = [
                'tone' => $tone,
                'title' => 'Conversion at '.$current['conversion'].'%',
                'detail' => $current['views'].' product views recorded in the window.',
            ];
        } else {
            $out[] = [
                'tone' => 'neutral',
                'title' => 'No storefront traffic recorded',
                'detail' => 'Publish products and share your store link to start collecting view data.',
            ];
        }

        return $out;
    }
}
