<?php

namespace App\Services\Analytics;

use App\Models\AdCampaign;
use App\Models\AdClick;
use App\Models\AdImpression;
use App\Models\Inventory;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\SellerOrder;
use App\Models\SellerSettlement;
use App\Models\TenantSetting;
use App\Support\TenantContext;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DepartmentAnalyticsService
{
    public function overview(int $tenantId): array
    {
        return [
            'finance' => $this->finance($tenantId),
            'sales' => $this->sales($tenantId),
            'operations' => $this->operations($tenantId),
            'marketing' => $this->marketing($tenantId),
        ];
    }

    public function finance(int $tenantId): array
    {
        $orders = $this->tenantOrders($tenantId);
        $gmv = $this->money((clone $orders)->sum('subtotal'));
        $commission = $this->money((clone $orders)->sum('commission'));
        $delivery = $this->money((clone $orders)->sum('delivery_fee'));
        $net = $this->money((clone $orders)->sum('net_settlement'));

        $settlements = SellerSettlement::query()
            ->whereIn('seller_order_id', (clone $orders)->select('id'));
        $pending = $this->money((clone $settlements)->where('status', SellerSettlement::STATUS_PENDING)->sum('net'));
        $released = $this->money((clone $settlements)->where('status', SellerSettlement::STATUS_RELEASED)->sum('net'));
        $refunded = $this->money((clone $settlements)->sum('refund_amount'));

        $monthGmv = $this->money(
            (clone $orders)->where('created_at', '>=', now()->startOfMonth())->sum('subtotal')
        );

        $kpis = [
            ['key' => 'gmv', 'label' => 'Gross merchandise value', 'value' => $gmv, 'format' => 'currency'],
            ['key' => 'net', 'label' => 'Net settlement', 'value' => $net, 'format' => 'currency'],
            ['key' => 'commission', 'label' => 'Platform commission', 'value' => $commission, 'format' => 'currency'],
            ['key' => 'pending', 'label' => 'Pending payouts', 'value' => $pending, 'format' => 'currency'],
            ['key' => 'released', 'label' => 'Released payouts', 'value' => $released, 'format' => 'currency'],
            ['key' => 'refunds', 'label' => 'Refunds', 'value' => $refunded, 'format' => 'currency'],
        ];

        $goals = $this->goals($tenantId, 'finance');
        $progress = [
            $this->progressItem('Monthly GMV', $monthGmv, $goals['monthly_gmv'] ?? 8000, 'currency'),
            $this->progressItem('Released payouts share', $this->share($released, $net), $goals['released_settlements'] ?? 70, 'percent'),
        ];

        return [
            'department' => 'finance',
            'title' => 'Finance',
            'kpis' => $kpis,
            'progress' => $progress,
            'charts' => [
                $this->lineChart('Revenue vs commission (14 days)', $this->dailyFinance($tenantId), [
                    ['key' => 'gmv', 'label' => 'GMV', 'color' => '#1f4b3a'],
                    ['key' => 'commission', 'label' => 'Commission', 'color' => '#c45c26'],
                    ['key' => 'net', 'label' => 'Net', 'color' => '#c9a227'],
                ]),
                $this->donutChart('Settlement mix', [
                    ['label' => 'Pending', 'value' => (float) $pending, 'color' => '#c9a227'],
                    ['label' => 'Released', 'value' => (float) $released, 'color' => '#1f4b3a'],
                    ['label' => 'Refunds', 'value' => (float) $refunded, 'color' => '#9b2c2c'],
                ]),
            ],
            'table' => [
                'title' => 'Recent settlements',
                'columns' => ['Order', 'Gross', 'Commission', 'Net', 'Status'],
                'rows' => SellerSettlement::query()
                    ->with('sellerOrder')
                    ->whereIn('seller_order_id', SellerOrder::query()->where('tenant_id', $tenantId)->select('id'))
                    ->orderByDesc('id')
                    ->limit(8)
                    ->get()
                    ->map(fn (SellerSettlement $s) => [
                        '#'.($s->sellerOrder?->id ?? $s->seller_order_id),
                        $this->money($s->gross),
                        $this->money($s->commission),
                        $this->money($s->net),
                        $s->status,
                    ])
                    ->all(),
            ],
            'meta' => ['delivery_fees' => $delivery, 'month_gmv' => $monthGmv],
        ];
    }

    public function sales(int $tenantId): array
    {
        $orders = $this->tenantOrders($tenantId);
        $count = (clone $orders)->count();
        $gmv = $this->money((clone $orders)->sum('subtotal'));
        $aov = $count > 0 ? $this->money(((float) $gmv) / $count) : '0.00';
        $open = (clone $orders)->whereIn('status', [
            SellerOrder::STATUS_AWAITING_FULFILLMENT,
            SellerOrder::STATUS_PROCESSING,
        ])->count();
        $monthOrders = (clone $orders)->where('created_at', '>=', now()->startOfMonth())->count();

        $statusRows = (clone $orders)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $topProducts = OrderItem::query()
            ->select('product_name', DB::raw('sum(qty) as units'), DB::raw('sum(unit_price * qty) as revenue'))
            ->whereIn('seller_order_id', SellerOrder::query()->where('tenant_id', $tenantId)->select('id'))
            ->groupBy('product_name')
            ->orderByDesc('revenue')
            ->limit(6)
            ->get();

        $goals = $this->goals($tenantId, 'sales');

        return [
            'department' => 'sales',
            'title' => 'Sales',
            'kpis' => [
                ['key' => 'orders', 'label' => 'Orders', 'value' => (string) $count, 'format' => 'number'],
                ['key' => 'gmv', 'label' => 'Sales volume', 'value' => $gmv, 'format' => 'currency'],
                ['key' => 'aov', 'label' => 'Avg order value', 'value' => $aov, 'format' => 'currency'],
                ['key' => 'open', 'label' => 'Open orders', 'value' => (string) $open, 'format' => 'number'],
            ],
            'progress' => [
                $this->progressItem('Monthly orders', (string) $monthOrders, $goals['monthly_orders'] ?? 40, 'number'),
                $this->progressItem('Average order value', $aov, $goals['avg_order_value'] ?? 80, 'currency'),
            ],
            'charts' => [
                $this->lineChart('Orders & GMV (14 days)', $this->dailySales($tenantId), [
                    ['key' => 'orders', 'label' => 'Orders', 'color' => '#c45c26'],
                    ['key' => 'gmv', 'label' => 'GMV', 'color' => '#1f4b3a'],
                ]),
                $this->barChart('Pipeline by status', $statusRows->map(fn ($v, $k) => [
                    'label' => str_replace('_', ' ', (string) $k),
                    'value' => (float) $v,
                    'color' => '#c45c26',
                ])->values()->all()),
            ],
            'table' => [
                'title' => 'Top products',
                'columns' => ['Product', 'Units', 'Revenue'],
                'rows' => $topProducts->map(fn ($r) => [
                    $r->product_name,
                    (string) $r->units,
                    $this->money($r->revenue),
                ])->all(),
            ],
        ];
    }

    public function operations(int $tenantId): array
    {
        $orders = $this->tenantOrders($tenantId);
        $total = (clone $orders)->count();
        $delivered = (clone $orders)->whereIn('status', [
            SellerOrder::STATUS_DELIVERED,
            SellerOrder::STATUS_COMPLETED,
        ])->count();
        $open = (clone $orders)->whereIn('status', [
            SellerOrder::STATUS_AWAITING_FULFILLMENT,
            SellerOrder::STATUS_PROCESSING,
        ])->count();
        $shipped = (clone $orders)->where('status', SellerOrder::STATUS_SHIPPED)->count();

        $inventories = Inventory::query()->where('tenant_id', $tenantId)->with('variant.product')->get();
        $skuCount = $inventories->count();
        $lowStock = $inventories->filter(fn (Inventory $i) => $i->isLowStock())->count();
        $units = $inventories->sum(fn (Inventory $i) => $i->available());
        $inStockRate = $skuCount > 0 ? round((($skuCount - $lowStock) / $skuCount) * 100, 1) : 100;
        $fulfillmentRate = $total > 0 ? round(($delivered / $total) * 100, 1) : 0;

        $productsActive = Product::query()->where('tenant_id', $tenantId)->where('status', Product::STATUS_ACTIVE)->count();
        $productsDraft = Product::query()->where('tenant_id', $tenantId)->where('status', Product::STATUS_DRAFT)->count();

        $goals = $this->goals($tenantId, 'operations');

        return [
            'department' => 'operations',
            'title' => 'Operations',
            'kpis' => [
                ['key' => 'open', 'label' => 'Open fulfilment', 'value' => (string) $open, 'format' => 'number'],
                ['key' => 'shipped', 'label' => 'In transit', 'value' => (string) $shipped, 'format' => 'number'],
                ['key' => 'low_stock', 'label' => 'Low-stock SKUs', 'value' => (string) $lowStock, 'format' => 'number'],
                ['key' => 'units', 'label' => 'Units on hand', 'value' => (string) $units, 'format' => 'number'],
            ],
            'progress' => [
                $this->progressItem('Fulfilment rate', (string) $fulfillmentRate, $goals['fulfillment_rate'] ?? 85, 'percent'),
                $this->progressItem('In-stock rate', (string) $inStockRate, $goals['in_stock_rate'] ?? 90, 'percent'),
            ],
            'charts' => [
                $this->donutChart('Catalogue health', [
                    ['label' => 'Active', 'value' => (float) $productsActive, 'color' => '#1f4b3a'],
                    ['label' => 'Draft', 'value' => (float) $productsDraft, 'color' => '#c9a227'],
                    ['label' => 'Low stock', 'value' => (float) $lowStock, 'color' => '#9b2c2c'],
                ]),
                $this->barChart('Fulfilment pipeline', [
                    ['label' => 'Open', 'value' => (float) $open, 'color' => '#c45c26'],
                    ['label' => 'Shipped', 'value' => (float) $shipped, 'color' => '#c9a227'],
                    ['label' => 'Delivered', 'value' => (float) $delivered, 'color' => '#1f4b3a'],
                ]),
            ],
            'table' => [
                'title' => 'Low-stock watchlist',
                'columns' => ['Product', 'Available', 'Threshold'],
                'rows' => $inventories
                    ->filter(fn (Inventory $i) => $i->isLowStock())
                    ->take(8)
                    ->map(fn (Inventory $i) => [
                        $i->variant?->product?->name ?? 'SKU '.$i->variant_id,
                        (string) $i->available(),
                        (string) $i->low_stock_threshold,
                    ])
                    ->values()
                    ->all(),
            ],
        ];
    }

    public function marketing(int $tenantId): array
    {
        $campaigns = AdCampaign::query()->where('tenant_id', $tenantId)->get();
        $active = $campaigns->where('status', AdCampaign::STATUS_ACTIVE)->count();
        $spend = $this->money($campaigns->sum('spent_total'));
        $ids = $campaigns->pluck('id');
        $impressions = AdImpression::query()->whereIn('campaign_id', $ids)->count();
        $clicks = AdClick::query()->whereIn('campaign_id', $ids)->count();
        $ctr = $impressions > 0 ? round(($clicks / $impressions) * 100, 2) : 0.0;

        $daily = $this->padDays(14, function (Carbon $day) use ($ids) {
            $start = $day->copy()->startOfDay();
            $end = $day->copy()->endOfDay();

            return [
                'label' => $day->format('M j'),
                'impressions' => (float) AdImpression::query()->whereIn('campaign_id', $ids)->whereBetween('created_at', [$start, $end])->count(),
                'clicks' => (float) AdClick::query()->whereIn('campaign_id', $ids)->whereBetween('created_at', [$start, $end])->count(),
            ];
        });

        $goals = $this->goals($tenantId, 'marketing');

        return [
            'department' => 'marketing',
            'title' => 'Marketing',
            'kpis' => [
                ['key' => 'campaigns', 'label' => 'Active campaigns', 'value' => (string) $active, 'format' => 'number'],
                ['key' => 'spend', 'label' => 'Ad spend', 'value' => $spend, 'format' => 'currency'],
                ['key' => 'impressions', 'label' => 'Impressions', 'value' => (string) $impressions, 'format' => 'number'],
                ['key' => 'ctr', 'label' => 'Click-through rate', 'value' => (string) $ctr, 'format' => 'percent'],
            ],
            'progress' => [
                $this->progressItem('CTR vs target', (string) $ctr, $goals['ad_ctr'] ?? 2.5, 'percent'),
                $this->progressItem('Active campaigns', (string) $active, $goals['campaigns_active'] ?? 2, 'number'),
            ],
            'charts' => [
                $this->lineChart('Impressions vs clicks (14 days)', $daily, [
                    ['key' => 'impressions', 'label' => 'Impressions', 'color' => '#1f4b3a'],
                    ['key' => 'clicks', 'label' => 'Clicks', 'color' => '#c45c26'],
                ]),
                $this->barChart('Spend by campaign', $campaigns->map(fn (AdCampaign $c) => [
                    'label' => $c->name,
                    'value' => (float) $c->spent_total,
                    'color' => '#c45c26',
                ])->values()->all()),
            ],
            'table' => [
                'title' => 'Campaigns',
                'columns' => ['Name', 'Status', 'Bid', 'Spend'],
                'rows' => $campaigns->map(fn (AdCampaign $c) => [
                    $c->name,
                    $c->status,
                    $this->money($c->bid_cpc),
                    $this->money($c->spent_total),
                ])->all(),
            ],
        ];
    }

    protected function tenantOrders(int $tenantId)
    {
        return SellerOrder::query()
            ->where('tenant_id', $tenantId)
            ->whereNotIn('status', [SellerOrder::STATUS_CANCELLED]);
    }

    protected function dailyFinance(int $tenantId): array
    {
        $rows = $this->dailySums($tenantId);

        return $this->padDays(14, function (Carbon $day) use ($rows) {
            $key = $day->toDateString();
            $row = $rows->get($key);

            return [
                'label' => $day->format('M j'),
                'gmv' => (float) ($row->gmv ?? 0),
                'commission' => (float) ($row->commission ?? 0),
                'net' => (float) ($row->net ?? 0),
            ];
        });
    }

    protected function dailySales(int $tenantId): array
    {
        $rows = $this->dailySums($tenantId);

        return $this->padDays(14, function (Carbon $day) use ($rows) {
            $key = $day->toDateString();
            $row = $rows->get($key);

            return [
                'label' => $day->format('M j'),
                'orders' => (float) ($row->orders ?? 0),
                'gmv' => (float) ($row->gmv ?? 0),
            ];
        });
    }

    protected function dailySums(int $tenantId): Collection
    {
        return SellerOrder::query()
            ->where('tenant_id', $tenantId)
            ->whereNotIn('status', [SellerOrder::STATUS_CANCELLED])
            ->where('created_at', '>=', now()->subDays(14)->startOfDay())
            ->select(
                DB::raw('date(created_at) as day'),
                DB::raw('sum(subtotal) as gmv'),
                DB::raw('sum(commission) as commission'),
                DB::raw('sum(net_settlement) as net'),
                DB::raw('count(*) as orders')
            )
            ->groupBy('day')
            ->get()
            ->keyBy('day');
    }

    protected function padDays(int $days, callable $fn): array
    {
        $out = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $out[] = $fn(now()->subDays($i)->startOfDay());
        }

        return $out;
    }

    protected function goals(int $tenantId, string $department): array
    {
        $bypassed = TenantContext::isBypassed();
        TenantContext::bypass(true);
        try {
            $settings = TenantSetting::withoutGlobalScopes()->where('tenant_id', $tenantId)->first();
        } finally {
            TenantContext::bypass($bypassed);
        }

        if (! $settings) {
            return TenantSetting::DEFAULT_GOALS[$department] ?? [];
        }

        return $settings->goalsFor($department);
    }

    protected function progressItem(string $label, string $current, float|int|string $target, string $format): array
    {
        $cur = (float) $current;
        $tgt = (float) $target;
        $pct = $tgt > 0 ? min(100, round(($cur / $tgt) * 100, 1)) : 0;

        return [
            'label' => $label,
            'current' => $current,
            'target' => (string) $target,
            'percent' => $pct,
            'format' => $format,
        ];
    }

    protected function share(string $part, string $whole): string
    {
        $w = (float) $whole;
        if ($w <= 0) {
            return '0';
        }

        return number_format(((float) $part / $w) * 100, 1, '.', '');
    }

    protected function money(mixed $value): string
    {
        return number_format((float) $value, 2, '.', '');
    }

    protected function lineChart(string $title, array $points, array $series): array
    {
        return ['type' => 'line', 'title' => $title, 'points' => $points, 'series' => $series];
    }

    protected function barChart(string $title, array $bars): array
    {
        return ['type' => 'bar', 'title' => $title, 'bars' => $bars];
    }

    protected function donutChart(string $title, array $slices): array
    {
        return ['type' => 'donut', 'title' => $title, 'slices' => $slices];
    }
}
