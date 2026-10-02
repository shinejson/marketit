<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Analytics\AnalyticsService;
use App\Services\Analytics\TenantAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(
        protected AnalyticsService $analytics,
        protected TenantAnalyticsService $tenantAnalytics,
    ) {}

    /**
     * Tenant reporting workspace: windowed KPIs with period-over-period
     * deltas, daily series, funnel, product/store breakdowns and ad spend.
     * The legacy all-time `marts` payload is kept under `lifetime` so older
     * clients keep working.
     */
    public function tenant(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenantId();
        $days = max(1, min(365, $request->integer('days', 30)));
        $storeId = $request->filled('store_id') ? $request->integer('store_id') : null;

        $report = $this->tenantAnalytics->report($tenantId, $days, $storeId);
        $lifetime = $this->analytics->marts($tenantId);

        return response()->json([
            'data' => $report + [
                'lifetime' => [
                    'gmv' => $lifetime['gmv'],
                    'commission' => $lifetime['commission'],
                    'orders' => $lifetime['orders'],
                    'take_rate' => $lifetime['take_rate'],
                ],
                // Backwards-compatible top-level keys.
                'gmv' => $report['kpis']['gmv']['value'],
                'orders' => $report['kpis']['orders']['value'],
                'views' => $report['kpis']['views']['value'],
            ],
        ]);
    }

    public function platform(Request $request): JsonResponse
    {
        $days = max(7, min(365, $request->integer('days', 30)));

        return response()->json(['data' => $this->analytics->marts(null, $days)]);
    }

    public function platformInsights(Request $request): JsonResponse
    {
        $days = max(7, min(365, $request->integer('days', 30)));

        return response()->json(['data' => $this->analytics->narrate(null, 'platform', $days)]);
    }
}
