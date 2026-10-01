<?php

namespace App\Services\Analytics;

use App\Models\AdCampaign;
use App\Models\AdClick;
use App\Models\AdImpression;
use App\Models\AiInsight;
use App\Models\AnalyticsEvent;
use App\Models\SellerOrder;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    public function marts(?int $tenantId = null, ?int $days = null): array
    {
        $bypassed = TenantContext::isBypassed();
        TenantContext::bypass(true);
        try {
            $since = $days !== null ? now()->subDays($days - 1)->startOfDay() : null;
            $orders = SellerOrder::withoutGlobalScopes()
                ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
                ->when($since, fn ($q) => $q->where('created_at', '>=', $since))
                ->whereNotIn('status', [SellerOrder::STATUS_CANCELLED]);

            $gmv = (string) (clone $orders)->sum('subtotal');
            $commission = (string) (clone $orders)->sum('commission');
            $count = (clone $orders)->count();

            $events = AnalyticsEvent::query()
                ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
                ->when($since, fn ($q) => $q->where('created_at', '>=', $since));
            $funnel = [
                'views' => (clone $events)->where('type', 'product.viewed')->count(),
                'carts' => (clone $events)->where('type', 'cart.updated')->count(),
                'checkouts' => (clone $events)->where('type', 'order.placed')->count(),
                'paid' => (clone $events)->where('type', 'order.paid')->count(),
            ];

            $windowDays = $days ?? 30;
            $dailySince = now()->subDays($windowDays - 1)->startOfDay();
            $daily = SellerOrder::withoutGlobalScopes()
                ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
                ->select(DB::raw('date(created_at) as day'), DB::raw('sum(subtotal) as gmv'), DB::raw('count(*) as orders'))
                ->whereNotIn('status', [SellerOrder::STATUS_CANCELLED])
                ->where('created_at', '>=', $dailySince)
                ->groupBy('day')
                ->orderBy('day')
                ->get()
                ->map(fn ($r) => ['day' => $r->day, 'gmv' => (string) $r->gmv, 'orders' => (int) $r->orders])
                ->all();

            $impressionQuery = AdImpression::query()
                ->when($tenantId, function ($q) use ($tenantId) {
                    $q->whereIn('campaign_id', AdCampaign::withoutGlobalScopes()->where('tenant_id', $tenantId)->select('id'));
                })
                ->when($since, fn ($q) => $q->where('created_at', '>=', $since));
            $clickQuery = AdClick::query()
                ->when($tenantId, function ($q) use ($tenantId) {
                    $q->whereIn('campaign_id', AdCampaign::withoutGlobalScopes()->where('tenant_id', $tenantId)->select('id'));
                })
                ->when($since, fn ($q) => $q->where('created_at', '>=', $since));
            $impressions = (clone $impressionQuery)->count();
            $clicks = (clone $clickQuery)->count();
            $adSpend = (string) (clone $clickQuery)->sum('cost');

            $takeRate = bccomp($gmv, '0', 2) === 0 ? '0.00' : bcmul(bcdiv($commission, $gmv, 4), '100', 2);

            return [
                'range' => $days !== null ? [
                    'days' => $days,
                    'start' => $since?->toDateString(),
                    'end' => now()->toDateString(),
                ] : null,
                'gmv' => $gmv,
                'commission' => $commission,
                'take_rate' => $takeRate,
                'orders' => $count,
                'funnel' => $funnel,
                'daily' => $daily,
                'ads' => [
                    'impressions' => $impressions,
                    'clicks' => $clicks,
                    'spend' => $adSpend,
                    'ctr' => $impressions ? round($clicks / $impressions, 4) : 0,
                ],
            ];
        } finally {
            TenantContext::bypass($bypassed);
        }
    }

    public function narrate(?int $tenantId, string $scope, ?int $days = null): AiInsight
    {
        $marts = $this->marts($tenantId, $days);
        $fingerprint = hash('sha256', json_encode($marts));
        $gmv = $marts['gmv'];
        $orders = $marts['orders'];
        $take = $marts['take_rate'];
        $paid = $marts['funnel']['paid'];
        $views = $marts['funnel']['views'];
        $conversion = $views > 0 ? round(($paid / $views) * 100, 1) : 0;
        $narrative = $scope === 'platform'
            ? "Platform GMV is {$gmv} across {$orders} seller orders (take rate {$take}%). Conversion from recorded views to paid is {$conversion}%."
            : "Your store GMV is {$gmv} across {$orders} orders. Recorded view-to-paid conversion is {$conversion}%. Ad spend is {$marts['ads']['spend']}.";

        return AiInsight::query()->create([
            'tenant_id' => $tenantId,
            'insight_type' => 'sales_summary',
            'payload' => [
                'narrative' => $narrative,
                'metrics' => $marts,
                'window' => $days !== null ? $days.'d' : 'all_time',
                'source' => 'oltp_rollups',
            ],
            'data_fingerprint' => $fingerprint,
            'generated_at' => now(),
        ]);
    }
}
