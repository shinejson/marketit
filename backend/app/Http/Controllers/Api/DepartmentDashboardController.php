<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TenantSetting;
use App\Services\Analytics\DepartmentAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentDashboardController extends Controller
{
    public function __construct(protected DepartmentAnalyticsService $analytics) {}

    public function overview(Request $request): JsonResponse
    {
        $tenantId = $this->tenantId($request);
        $data = $this->analytics->overview($tenantId);

        return response()->json([
            'data' => [
                'departments' => collect($data)->map(fn (array $d) => [
                    'key' => $d['department'],
                    'title' => $d['title'],
                    'kpis' => $d['kpis'],
                    'progress' => $d['progress'],
                ])->values()->all(),
            ],
        ]);
    }

    public function show(Request $request, string $department): JsonResponse
    {
        $department = strtolower($department);
        abort_unless(in_array($department, TenantSetting::DEPARTMENTS, true), 404);

        $tenantId = $this->tenantId($request);
        $payload = match ($department) {
            'finance' => $this->analytics->finance($tenantId),
            'sales' => $this->analytics->sales($tenantId),
            'operations' => $this->analytics->operations($tenantId),
            'marketing' => $this->analytics->marketing($tenantId),
        };

        return response()->json(['data' => $payload]);
    }

    protected function tenantId(Request $request): int
    {
        $id = $request->user()?->tenantId();
        abort_unless($id, 403, 'No tenant context.');

        return (int) $id;
    }
}
