<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\CommissionRule;
use App\Models\CommissionTier;
use App\Models\Plan;
use App\Models\SellerSettlement;
use App\Models\Store;
use App\Models\Tenant;
use App\Services\Commerce\CommissionResolver;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * §14 / §18 / §22 #15 — the configurable commission engine.
 *
 * Replaces the single `markethub.commission_rate` constant with a
 * priority-ordered rule set scoped to a plan, tenant, store, category or
 * individual product.
 */
class AdminCommissionController extends Controller
{
    public function __construct(protected CommissionResolver $resolver) {}

    public function index(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $query = CommissionRule::query()->with('tiers');

        if ($request->filled('scope_type')) {
            $query->where('scope_type', $request->string('scope_type'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('description', 'like', $term));
        }

        $rules = $query->orderByDesc('priority')->orderBy('id')->get()
            ->sortByDesc(fn (CommissionRule $rule) => [$rule->specificity(), (int) $rule->priority, (int) $rule->id])
            ->values();

        return response()->json([
            'data' => $rules->map(fn (CommissionRule $rule) => $this->present($rule))->values(),
            'summary' => $this->summary(),
            'defaults' => [
                'platform_rate' => $this->resolver->defaultRatePercent(),
                'config_rate' => number_format((float) config('markethub.commission_rate', 0.05) * 100, 4, '.', ''),
            ],
        ]);
    }

    public function show(CommissionRule $rule): JsonResponse
    {
        TenantContext::bypass(true);

        return response()->json(['data' => $this->present($rule->load('tiers'), true)]);
    }

    public function store(Request $request): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $this->validatePayload($request);

        $rule = CommissionRule::query()->create([
            ...collect($data)->except('tiers')->all(),
            'created_by_user_id' => $request->user()->id,
        ]);

        $this->syncTiers($rule, $data['tiers'] ?? []);
        $this->resolver->flushCache();

        return response()->json(['data' => $this->present($rule->fresh('tiers'), true)], 201);
    }

    public function update(Request $request, CommissionRule $rule): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $this->validatePayload($request, $rule);

        $rule->update(collect($data)->except('tiers')->all());

        if (array_key_exists('tiers', $data)) {
            $this->syncTiers($rule, $data['tiers'] ?? []);
        }
        $this->resolver->flushCache();

        return response()->json(['data' => $this->present($rule->fresh('tiers'), true)]);
    }

    public function destroy(CommissionRule $rule): JsonResponse
    {
        TenantContext::bypass(true);
        $rule->delete();
        $this->resolver->flushCache();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function toggle(CommissionRule $rule): JsonResponse
    {
        TenantContext::bypass(true);
        $rule->update([
            'status' => $rule->status === CommissionRule::STATUS_ACTIVE
                ? CommissionRule::STATUS_INACTIVE
                : CommissionRule::STATUS_ACTIVE,
        ]);
        $this->resolver->flushCache();

        return response()->json(['data' => $this->present($rule->fresh('tiers'))]);
    }

    /** Drag-and-drop reordering of the priority stack. */
    public function reorder(Request $request): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $request->validate([
            'order' => ['required', 'array', 'min:1'],
            'order.*.id' => ['required', 'integer'],
            'order.*.priority' => ['required', 'integer', 'min:0', 'max:9999'],
        ]);

        foreach ($data['order'] as $row) {
            CommissionRule::query()->whereKey($row['id'])->update(['priority' => $row['priority']]);
        }
        $this->resolver->flushCache();

        return response()->json(['data' => ['reordered' => count($data['order'])]]);
    }

    /** "What would we charge on a sale of X from store Y?" */
    public function simulate(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0'],
            'tenant_id' => ['nullable', 'integer'],
            'store_id' => ['nullable', 'integer'],
            'category_id' => ['nullable', 'integer'],
            'product_id' => ['nullable', 'integer'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
        ]);

        $explanation = $this->resolver->explain(
            number_format((float) $data['amount'], 2, '.', ''),
            [
                'tenant_id' => $data['tenant_id'] ?? null,
                'store_id' => $data['store_id'] ?? null,
                'delivery_fee' => number_format((float) ($data['delivery_fee'] ?? 0), 2, '.', ''),
                'category_ids' => array_values(array_filter([$data['category_id'] ?? null])),
                'product_ids' => array_values(array_filter([$data['product_id'] ?? null])),
            ],
        );

        return response()->json(['data' => $explanation]);
    }

    /** Dropdown data for the rule builder. */
    public function meta(): JsonResponse
    {
        TenantContext::bypass(true);

        return response()->json([
            'data' => [
                'scope_types' => CommissionRule::SCOPES,
                'calculations' => CommissionRule::CALCULATIONS,
                'plans' => Plan::query()->orderBy('id')->get(['id', 'name', 'commission_rate']),
                'tenants' => Tenant::query()->orderBy('name')->limit(500)->get(['id', 'name']),
                'stores' => Store::query()->orderBy('name')->limit(500)->get(['id', 'tenant_id', 'name']),
                'categories' => Category::query()->orderBy('name')->limit(500)->get(['id', 'tenant_id', 'name']),
            ],
        ]);
    }

    /** Commission actually earned, for the revenue dashboard (§14). */
    public function earnings(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $from = $request->date('from') ?? now()->subDays(30)->startOfDay();
        $to = $request->date('to') ?? now()->endOfDay();

        $settlements = SellerSettlement::query()->whereBetween('created_at', [$from, $to]);

        $byTenant = (clone $settlements)
            ->whereNotNull('tenant_id')
            ->selectRaw('tenant_id, SUM(commission_amount) as commission, SUM(gross_amount) as gross, COUNT(*) as orders')
            ->groupBy('tenant_id')
            ->orderByDesc('commission')
            ->limit(10)
            ->get();

        $tenantNames = Tenant::query()->whereIn('id', $byTenant->pluck('tenant_id')->filter())->pluck('name', 'id');

        $gross = (float) (clone $settlements)->sum('gross_amount');
        $commission = (float) (clone $settlements)->sum('commission_amount');

        return response()->json([
            'data' => [
                'range' => ['from' => $from, 'to' => $to],
                'commission_total' => number_format($commission, 2, '.', ''),
                'gross_total' => number_format($gross, 2, '.', ''),
                'net_to_sellers' => number_format((float) (clone $settlements)->sum('net_amount'), 2, '.', ''),
                'settlement_count' => (clone $settlements)->count(),
                'effective_rate' => $gross > 0 ? number_format(($commission / $gross) * 100, 2, '.', '') : '0.00',
                'top_tenants' => $byTenant->map(fn ($row) => [
                    'tenant_id' => (int) $row->tenant_id,
                    'tenant' => $tenantNames[$row->tenant_id] ?? 'Unassigned',
                    'commission' => number_format((float) $row->commission, 2, '.', ''),
                    'gross' => number_format((float) $row->gross, 2, '.', ''),
                    'orders' => (int) $row->orders,
                ])->values(),
            ],
        ]);
    }

    // ----------------------------------------------------------- internals

    protected function validatePayload(Request $request, ?CommissionRule $rule = null): array
    {
        $data = $request->validate([
            'name' => [$rule ? 'sometimes' : 'required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:500'],
            'scope_type' => [$rule ? 'sometimes' : 'required', 'in:'.implode(',', CommissionRule::SCOPES)],
            'scope_id' => ['nullable', 'integer'],
            'calculation' => [$rule ? 'sometimes' : 'required', 'in:'.implode(',', CommissionRule::CALCULATIONS)],
            'rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'flat_fee' => ['nullable', 'numeric', 'min:0'],
            'min_fee' => ['nullable', 'numeric', 'min:0'],
            'max_fee' => ['nullable', 'numeric', 'min:0'],
            'min_order_amount' => ['nullable', 'numeric', 'min:0'],
            'include_delivery' => ['nullable', 'boolean'],
            'priority' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'status' => ['nullable', 'in:active,inactive'],
            'effective_from' => ['nullable', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'tiers' => ['nullable', 'array'],
            'tiers.*.from_amount' => ['required_with:tiers', 'numeric', 'min:0'],
            'tiers.*.to_amount' => ['nullable', 'numeric', 'min:0'],
            'tiers.*.rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tiers.*.flat_fee' => ['nullable', 'numeric', 'min:0'],
        ]);

        $scope = $data['scope_type'] ?? $rule?->scope_type;
        if ($scope && $scope !== CommissionRule::SCOPE_GLOBAL
            && empty($data['scope_id']) && ! $rule?->scope_id) {
            throw ValidationException::withMessages(['scope_id' => 'Pick what this rule applies to.']);
        }

        $calculation = $data['calculation'] ?? $rule?->calculation;
        if ($calculation === CommissionRule::CALC_TIERED && empty($data['tiers']) && ! $rule?->tiers()->exists()) {
            throw ValidationException::withMessages(['tiers' => 'A tiered rule needs at least one band.']);
        }

        if (isset($data['min_fee'], $data['max_fee']) && $data['max_fee'] !== null && $data['min_fee'] !== null
            && (float) $data['max_fee'] < (float) $data['min_fee']) {
            throw ValidationException::withMessages(['max_fee' => 'The cap cannot be lower than the floor.']);
        }

        if ($scope === CommissionRule::SCOPE_GLOBAL) {
            $data['scope_id'] = null;
        }

        return $data;
    }

    protected function syncTiers(CommissionRule $rule, array $tiers): void
    {
        $rule->tiers()->delete();
        foreach ($tiers as $tier) {
            CommissionTier::query()->create([
                'commission_rule_id' => $rule->id,
                'from_amount' => $tier['from_amount'],
                'to_amount' => $tier['to_amount'] ?? null,
                'rate' => $tier['rate'] ?? 0,
                'flat_fee' => $tier['flat_fee'] ?? 0,
            ]);
        }
    }

    protected function summary(): array
    {
        $base = CommissionRule::query();

        return [
            'total' => (clone $base)->count(),
            'active' => (clone $base)->where('status', CommissionRule::STATUS_ACTIVE)->count(),
            'scheduled' => (clone $base)->whereNotNull('effective_from')->whereDate('effective_from', '>', now())->count(),
            'expired' => (clone $base)->whereNotNull('effective_to')->whereDate('effective_to', '<', now())->count(),
            'by_scope' => (clone $base)
                ->selectRaw('scope_type, COUNT(*) as entries')
                ->groupBy('scope_type')
                ->pluck('entries', 'scope_type'),
        ];
    }

    protected function present(CommissionRule $rule, bool $detailed = false): array
    {
        $payload = [
            'id' => $rule->id,
            'name' => $rule->name,
            'description' => $rule->description,
            'scope_type' => $rule->scope_type,
            'scope_id' => $rule->scope_id,
            'scope_label' => $rule->scopeLabel(),
            'calculation' => $rule->calculation,
            'rate' => (string) $rule->rate,
            'flat_fee' => (string) $rule->flat_fee,
            'min_fee' => $rule->min_fee !== null ? (string) $rule->min_fee : null,
            'max_fee' => $rule->max_fee !== null ? (string) $rule->max_fee : null,
            'min_order_amount' => (string) $rule->min_order_amount,
            'include_delivery' => (bool) $rule->include_delivery,
            'priority' => (int) $rule->priority,
            'specificity' => $rule->specificity(),
            'status' => $rule->status,
            'effective_from' => $rule->effective_from?->toDateString(),
            'effective_to' => $rule->effective_to?->toDateString(),
            'is_live' => $rule->isLive(),
            'summary' => $rule->summaryLine(),
            'created_at' => $rule->created_at,
        ];

        if ($detailed || $rule->relationLoaded('tiers')) {
            $payload['tiers'] = $rule->tiers->map(fn (CommissionTier $t) => [
                'id' => $t->id,
                'from_amount' => (string) $t->from_amount,
                'to_amount' => $t->to_amount !== null ? (string) $t->to_amount : null,
                'rate' => (string) $t->rate,
                'flat_fee' => (string) $t->flat_fee,
            ])->values();
        }

        return $payload;
    }
}
