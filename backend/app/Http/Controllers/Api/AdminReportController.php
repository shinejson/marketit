<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\Analytics\PlatformReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Super-admin report workspace (/admin/reports): platform-wide sales, seller
 * leaderboard, storefront funnel, billing and payout pipeline for a window,
 * optionally narrowed to a single tenant.
 */
class AdminReportController extends Controller
{
    public function __construct(protected PlatformReportService $reports) {}

    public function index(Request $request): JsonResponse
    {
        $days = max(1, min(365, $request->integer('days', 30)));

        $tenantId = $request->filled('tenant_id') ? $request->integer('tenant_id') : null;
        if ($tenantId !== null) {
            abort_unless(Tenant::query()->whereKey($tenantId)->exists(), 404, 'Tenant not found.');
        }

        return response()->json([
            'data' => $this->reports->report($days, $tenantId),
        ]);
    }
}
