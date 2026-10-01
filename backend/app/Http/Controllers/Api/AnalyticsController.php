<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Analytics\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(protected AnalyticsService $analytics) {}

    public function tenant(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->analytics->marts($request->user()->tenantId())]);
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
