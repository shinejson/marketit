<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Everything the super-admin home screen needs in a single round trip:
 * KPI cards with period-over-period deltas, daily time series for the charts,
 * plan/status breakdowns and a leaderboard of the best performing tenants.
 *
 * Aggregation happens in PHP after a narrow column select so the queries stay
 * portable between SQLite (local/dev) and MySQL (production).
 */
class AdminOverviewController extends Controller
{
    /** Order statuses that count as realised marketplace revenue. */
    private const REVENUE_STATUSES = [
        Order::STATUS_PAID,
        Order::STATUS_PARTIALLY_FULFILLED,
        Order::STATUS_FULFILLED,
        Order::STATUS_COMPLETED,
    ];

    public function __invoke(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $days = max(7, min(365, $request->integer('days', 30)));
            $end = CarbonImmutable::now()->endOfDay();
            $start = $end->subDays($days - 1)->startOfDay();
            $prevStart = $start->subDays($days);
            $prevEnd = $start->subSecond();

            $orders = Order::query()
                ->whereBetween('created_at', [$prevStart, $end])
                ->get(['id', 'grand_total', 'status', 'created_at']);

            $current = $orders->filter(fn ($o) => $o->created_at >= $start);
            $previous = $orders->filter(fn ($o) => $o->created_at < $start);

            $revenue = fn ($rows) => (float) $rows->whereIn('status', self::REVENUE_STATUSES)->sum('grand_total');

            $tenants = Tenant::query()->get(['id', 'name', 'business_name', 'status', 'created_at']);
            $newTenants = $tenants->filter(fn ($t) => $t->created_at >= $start);
            $prevTenants = $tenants->filter(fn ($t) => $t->created_at >= $prevStart && $t->created_at < $start);

            $users = User::query()->get(['id', 'created_at']);
            $newUsers = $users->filter(fn ($u) => $u->created_at >= $start);
            $prevUsers = $users->filter(fn ($u) => $u->created_at >= $prevStart && $u->created_at < $start);

            $subscriptions = Subscription::query()->with('plan:id,name,slug')->get();
            $mrr = $subscriptions->whereIn('status', Subscription::BILLABLE)
                ->sum(fn (Subscription $s) => $s->monthlyAmount());

            return response()->json([
                'data' => [
                    'range' => [
                        'days' => $days,
                        'start' => $start->toDateString(),
                        'end' => $end->toDateString(),
                    ],
                    'kpis' => [
                        'gmv' => $this->kpi($revenue($current), $revenue($previous), 'currency'),
                        'orders' => $this->kpi($current->count(), $previous->count()),
                        'new_tenants' => $this->kpi($newTenants->count(), $prevTenants->count()),
                        'new_users' => $this->kpi($newUsers->count(), $prevUsers->count()),
                        'mrr' => $this->kpi(round($mrr, 2), round($this->previousMrr($subscriptions, $start), 2), 'currency'),
                        'commission' => $this->kpi(
                            (float) SellerOrder::withoutGlobalScopes()->whereBetween('created_at', [$start, $end])->sum('commission'),
                            (float) SellerOrder::withoutGlobalScopes()->whereBetween('created_at', [$prevStart, $prevEnd])->sum('commission'),
                            'currency',
                        ),
                    ],
                    'totals' => [
                        'tenants' => $tenants->count(),
                        'active_tenants' => $tenants->where('status', Tenant::STATUS_ACTIVE)->count(),
                        'pending_tenants' => $tenants->where('status', Tenant::STATUS_PENDING)->count(),
                        'stores' => Store::query()->count(),
                        'products' => Product::query()->count(),
                        'users' => $users->count(),
                        'orders' => Order::query()->count(),
                        'open_invoices' => SubscriptionInvoice::query()->where('status', SubscriptionInvoice::STATUS_OPEN)->count(),
                    ],
                    'series' => [
                        'revenue' => $this->dailySeries($start, $end, $current->whereIn('status', self::REVENUE_STATUSES), fn ($o) => (float) $o->grand_total),
                        'orders' => $this->dailySeries($start, $end, $current, fn () => 1),
                        'tenants' => $this->dailySeries($start, $end, $newTenants, fn () => 1),
                        'users' => $this->dailySeries($start, $end, $newUsers, fn () => 1),
                    ],
                    'tenant_status' => $tenants->groupBy('status')->map->count(),
                    'plan_distribution' => $this->planDistribution($subscriptions),
                    'top_tenants' => $this->topTenants($start, $end),
                    'recent_activity' => AuditLog::query()->with('actor:id,name')->latest('id')->limit(8)->get()
                        ->map(fn (AuditLog $log) => [
                            'id' => $log->id,
                            'action' => $log->action,
                            'entity' => class_basename((string) $log->subject_type).' #'.$log->subject_id,
                            'actor' => $log->actor?->name ?? 'system',
                            'created_at' => $log->created_at,
                        ]),
                ],
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    /** KPI card payload: value, comparison value and percentage delta. */
    private function kpi(float|int $value, float|int $previous, string $format = 'number'): array
    {
        $change = $previous > 0 ? round((($value - $previous) / $previous) * 100, 1) : ($value > 0 ? 100.0 : 0.0);

        return [
            'value' => $value,
            'previous' => $previous,
            'change' => $change,
            'direction' => $change > 0 ? 'up' : ($change < 0 ? 'down' : 'flat'),
            'format' => $format,
        ];
    }

    /** MRR from subscriptions that already existed before the current window. */
    private function previousMrr($subscriptions, CarbonImmutable $start): float
    {
        return $subscriptions
            ->filter(fn (Subscription $s) => $s->created_at < $start && in_array($s->status, Subscription::BILLABLE, true))
            ->sum(fn (Subscription $s) => $s->monthlyAmount());
    }

    /** Zero-filled daily buckets so the chart never has gaps. */
    private function dailySeries(CarbonImmutable $start, CarbonImmutable $end, $rows, callable $value): array
    {
        $buckets = [];
        for ($day = $start; $day <= $end; $day = $day->addDay()) {
            $buckets[$day->toDateString()] = 0;
        }

        foreach ($rows as $row) {
            $key = CarbonImmutable::parse($row->created_at)->toDateString();
            if (array_key_exists($key, $buckets)) {
                $buckets[$key] += $value($row);
            }
        }

        return collect($buckets)
            ->map(fn ($v, $k) => ['date' => $k, 'value' => round((float) $v, 2)])
            ->values()
            ->all();
    }

    private function planDistribution($subscriptions): array
    {
        $plans = Plan::query()->orderBy('sort_order')->get();

        return $plans->map(function (Plan $plan) use ($subscriptions) {
            $subs = $subscriptions->where('plan_id', $plan->id);

            return [
                'plan' => $plan->name,
                'slug' => $plan->slug,
                'subscribers' => $subs->count(),
                'mrr' => round($subs->whereIn('status', Subscription::BILLABLE)->sum(fn (Subscription $s) => $s->monthlyAmount()), 2),
            ];
        })->all();
    }

    /** Best performing tenants in the window, ranked by settled seller revenue. */
    private function topTenants(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $rows = SellerOrder::withoutGlobalScopes()
            ->whereBetween('created_at', [$start, $end])
            ->get(['tenant_id', 'subtotal', 'commission']);

        $names = Tenant::query()->pluck('business_name', 'id');
        $fallback = Tenant::query()->pluck('name', 'id');

        return $rows->groupBy('tenant_id')
            ->map(fn ($group, $tenantId) => [
                'tenant_id' => (int) $tenantId,
                'name' => $names->get($tenantId) ?: ($fallback->get($tenantId) ?? 'Tenant #'.$tenantId),
                'orders' => $group->count(),
                'revenue' => round((float) $group->sum('subtotal'), 2),
                'commission' => round((float) $group->sum('commission'), 2),
            ])
            ->sortByDesc('revenue')
            ->take(6)
            ->values()
            ->all();
    }
}
