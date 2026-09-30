<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** Plans, tenant subscriptions and the invoices they generate. */
class AdminSubscriptionController extends Controller
{
    // ---------------------------------------------------------------- plans

    public function plans(): JsonResponse
    {
        $plans = Plan::query()
            ->withCount(['subscriptions as subscribers_count' => fn ($q) => $q->whereIn('status', Subscription::BILLABLE)])
            ->orderBy('sort_order')->orderBy('price')
            ->get();

        return response()->json(['data' => $plans]);
    }

    public function storePlan(Request $request): JsonResponse
    {
        $data = $this->validatePlan($request);
        $data['slug'] = Str::slug($data['slug'] ?? $data['name']);

        if (Plan::query()->where('slug', $data['slug'])->exists()) {
            $data['slug'] .= '-'.Str::lower(Str::random(4));
        }

        return response()->json(['data' => Plan::query()->create($data)], 201);
    }

    public function updatePlan(Request $request, Plan $plan): JsonResponse
    {
        $plan->update($this->validatePlan($request, $plan));

        return response()->json(['data' => $plan->fresh()]);
    }

    public function destroyPlan(Plan $plan): JsonResponse
    {
        if ($plan->subscriptions()->exists()) {
            abort(422, 'Plan still has subscriptions. Archive it instead by turning it inactive.');
        }

        $plan->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    private function validatePlan(Request $request, ?Plan $plan = null): array
    {
        return $request->validate([
            'name' => [$plan ? 'sometimes' : 'required', 'string', 'max:80'],
            'slug' => ['nullable', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:255'],
            'price' => [$plan ? 'sometimes' : 'required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'interval' => ['nullable', Rule::in(Plan::INTERVALS)],
            'trial_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'commission_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'max_products' => ['nullable', 'integer', 'min:0'],
            'max_stores' => ['nullable', 'integer', 'min:0'],
            'max_staff' => ['nullable', 'integer', 'min:0'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:120'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    // -------------------------------------------------------- subscriptions

    public function index(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $query = Subscription::query()->with(['tenant:id,name,business_name,status', 'plan']);

            if (($status = $request->string('status')->toString()) && $status !== 'all') {
                $query->where('status', $status);
            }
            if ($request->filled('plan_id')) {
                $query->where('plan_id', $request->integer('plan_id'));
            }
            if ($term = trim((string) $request->string('q'))) {
                $like = '%'.$term.'%';
                $query->whereHas('tenant', fn ($q) => $q->where('name', 'like', $like)->orWhere('business_name', 'like', $like));
            }

            $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

            return response()->json([
                'data' => $page->items(),
                'meta' => [
                    'page' => $page->currentPage(),
                    'per_page' => $page->perPage(),
                    'total' => $page->total(),
                    'last_page' => $page->lastPage(),
                ],
                'stats' => $this->stats(),
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    /** Create or move a tenant onto a plan; issues the first invoice. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tenant_id' => ['required', 'integer', 'exists:tenants,id'],
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
            'status' => ['nullable', Rule::in(Subscription::STATUSES)],
            'trial_days' => ['nullable', 'integer', 'min:0', 'max:365'],
        ]);

        TenantContext::bypass(true);

        try {
            $plan = Plan::query()->findOrFail($data['plan_id']);
            $tenant = Tenant::query()->findOrFail($data['tenant_id']);
            $trialDays = $data['trial_days'] ?? $plan->trial_days;
            $now = CarbonImmutable::now();
            $status = $data['status'] ?? ($trialDays > 0 ? Subscription::STATUS_TRIALING : Subscription::STATUS_ACTIVE);

            $subscription = DB::transaction(function () use ($tenant, $plan, $status, $trialDays, $now) {
                // One live subscription per tenant: retire whatever is running.
                Subscription::query()
                    ->where('tenant_id', $tenant->id)
                    ->whereIn('status', [Subscription::STATUS_ACTIVE, Subscription::STATUS_TRIALING, Subscription::STATUS_PAST_DUE])
                    ->update(['status' => Subscription::STATUS_CANCELED, 'canceled_at' => $now]);

                $subscription = Subscription::query()->create([
                    'tenant_id' => $tenant->id,
                    'plan_id' => $plan->id,
                    'status' => $status,
                    'amount' => $plan->price,
                    'currency' => $plan->currency,
                    'interval' => $plan->interval,
                    'trial_ends_at' => $trialDays > 0 ? $now->addDays($trialDays) : null,
                    'started_at' => $now,
                    'current_period_start' => $now,
                    'current_period_end' => $this->periodEnd($now, $plan->interval),
                ]);

                if ($status !== Subscription::STATUS_TRIALING && (float) $plan->price > 0) {
                    $this->issueInvoice($subscription);
                }

                return $subscription;
            });

            return response()->json(['data' => $subscription->load(['tenant:id,name,business_name', 'plan'])], 201);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function update(Request $request, Subscription $subscription): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(Subscription::STATUSES)],
            'plan_id' => ['sometimes', 'integer', 'exists:plans,id'],
            'cancel_at_period_end' => ['sometimes', 'boolean'],
        ]);

        TenantContext::bypass(true);

        try {
            if (isset($data['plan_id']) && (int) $data['plan_id'] !== (int) $subscription->plan_id) {
                $plan = Plan::query()->findOrFail($data['plan_id']);
                $data['amount'] = $plan->price;
                $data['currency'] = $plan->currency;
                $data['interval'] = $plan->interval;
            }

            if (($data['status'] ?? null) === Subscription::STATUS_CANCELED) {
                $data['canceled_at'] = now();
            }

            $subscription->update($data);

            return response()->json(['data' => $subscription->fresh(['tenant:id,name,business_name', 'plan'])]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    /** Roll the subscription into its next billing period and invoice it. */
    public function renew(Subscription $subscription): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $start = CarbonImmutable::now();
            $subscription->update([
                'status' => Subscription::STATUS_ACTIVE,
                'current_period_start' => $start,
                'current_period_end' => $this->periodEnd($start, $subscription->interval),
            ]);

            $invoice = (float) $subscription->amount > 0 ? $this->issueInvoice($subscription->fresh()) : null;

            return response()->json(['data' => ['subscription' => $subscription->fresh('plan'), 'invoice' => $invoice]]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    // ------------------------------------------------------------- invoices

    public function invoices(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $query = SubscriptionInvoice::query()->with(['tenant:id,name,business_name', 'subscription.plan:id,name']);

            if (($status = $request->string('status')->toString()) && $status !== 'all') {
                $query->where('status', $status);
            }
            if ($request->filled('tenant_id')) {
                $query->where('tenant_id', $request->integer('tenant_id'));
            }

            $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

            return response()->json([
                'data' => $page->items(),
                'meta' => [
                    'page' => $page->currentPage(),
                    'per_page' => $page->perPage(),
                    'total' => $page->total(),
                    'last_page' => $page->lastPage(),
                ],
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function updateInvoice(Request $request, SubscriptionInvoice $invoice): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in([
                SubscriptionInvoice::STATUS_OPEN,
                SubscriptionInvoice::STATUS_PAID,
                SubscriptionInvoice::STATUS_FAILED,
                SubscriptionInvoice::STATUS_VOID,
            ])],
        ]);

        $invoice->update([
            'status' => $data['status'],
            'paid_at' => $data['status'] === SubscriptionInvoice::STATUS_PAID ? now() : null,
        ]);

        return response()->json(['data' => $invoice->fresh(['tenant:id,name,business_name'])]);
    }

    // ---------------------------------------------------------------- stats

    public function stats(): array
    {
        TenantContext::bypass(true);

        try {
            $subscriptions = Subscription::query()->get();
            $billable = $subscriptions->whereIn('status', Subscription::BILLABLE);
            $mrr = round($billable->sum(fn (Subscription $s) => $s->monthlyAmount()), 2);
            $canceled = $subscriptions->where('status', Subscription::STATUS_CANCELED)->count();
            $total = max(1, $subscriptions->count());

            $invoices = SubscriptionInvoice::query()->get(['amount', 'status', 'issued_at']);
            $months = collect(range(5, 0))->map(function (int $back) use ($invoices) {
                $month = CarbonImmutable::now()->startOfMonth()->subMonths($back);

                return [
                    'date' => $month->format('Y-m'),
                    'value' => round((float) $invoices
                        ->where('status', SubscriptionInvoice::STATUS_PAID)
                        ->filter(fn ($i) => $i->issued_at && CarbonImmutable::parse($i->issued_at)->format('Y-m') === $month->format('Y-m'))
                        ->sum('amount'), 2),
                ];
            })->values()->all();

            return [
                'mrr' => $mrr,
                'arr' => round($mrr * 12, 2),
                'arpa' => $billable->count() ? round($mrr / $billable->count(), 2) : 0,
                'active' => $billable->count(),
                'trialing' => $subscriptions->where('status', Subscription::STATUS_TRIALING)->count(),
                'past_due' => $subscriptions->where('status', Subscription::STATUS_PAST_DUE)->count(),
                'canceled' => $canceled,
                'churn_rate' => round(($canceled / $total) * 100, 1),
                'outstanding' => round((float) $invoices->whereIn('status', [SubscriptionInvoice::STATUS_OPEN, SubscriptionInvoice::STATUS_FAILED])->sum('amount'), 2),
                'collected' => round((float) $invoices->where('status', SubscriptionInvoice::STATUS_PAID)->sum('amount'), 2),
                'by_status' => $subscriptions->groupBy('status')->map->count(),
                'revenue_by_month' => $months,
            ];
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function statsEndpoint(): JsonResponse
    {
        return response()->json(['data' => $this->stats()]);
    }

    private function periodEnd(CarbonImmutable $start, string $interval): CarbonImmutable
    {
        return $interval === 'yearly' ? $start->addYear() : $start->addMonth();
    }

    private function issueInvoice(Subscription $subscription): SubscriptionInvoice
    {
        return SubscriptionInvoice::query()->create([
            'subscription_id' => $subscription->id,
            'tenant_id' => $subscription->tenant_id,
            'number' => 'INV-'.now()->format('Ym').'-'.Str::upper(Str::random(6)),
            'amount' => $subscription->amount,
            'currency' => $subscription->currency,
            'status' => SubscriptionInvoice::STATUS_OPEN,
            'period_start' => $subscription->current_period_start,
            'period_end' => $subscription->current_period_end,
            'issued_at' => now(),
        ]);
    }
}
