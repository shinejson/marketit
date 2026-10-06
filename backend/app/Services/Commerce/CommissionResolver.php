<?php

namespace App\Services\Commerce;

use App\Models\CommissionRule;
use App\Models\CommissionTier;
use App\Models\Plan;
use App\Models\PlatformSetting;
use App\Models\Subscription;
use Illuminate\Support\Collection;

/**
 * §14 / §18 — the configurable commission engine.
 *
 * Replaces the static config('markethub.commission_rate'). Rules are matched
 * against the sale's scope (product, category, store, tenant, plan, global);
 * the most specific active rule wins, with `priority` breaking ties. Rates
 * are stored as percentages (5.0000 === 5%).
 */
class CommissionResolver
{
    /** @var Collection<int, CommissionRule>|null */
    protected ?Collection $cache = null;

    /** @var array<int, int|null> */
    protected array $planCache = [];

    /**
     * Work out what the platform keeps from one seller group.
     *
     * @param  array{tenant_id?:int|null, store_id?:int|null, product_ids?:int[], category_ids?:int[], delivery_fee?:string|float}  $context
     */
    public function quote(string $saleAmount, array $context = []): CommissionQuote
    {
        $saleAmount = $this->money($saleAmount);
        $deliveryFee = $this->money($context['delivery_fee'] ?? '0');
        $rule = $this->matchRule($saleAmount, $context);

        if (! $rule) {
            return $this->fallbackQuote($saleAmount, $context['tenant_id'] ?? null);
        }

        $basis = $rule->include_delivery ? bcadd($saleAmount, $deliveryFee, 2) : $saleAmount;
        [$amount, $effectiveRate] = $this->calculate($rule, $basis);

        $amount = $this->clamp($rule, $amount, $basis);

        return new CommissionQuote(
            amount: $amount,
            rate: $effectiveRate,
            ruleId: $rule->id,
            ruleName: $rule->name,
            calculation: (string) $rule->calculation,
            basis: $basis,
        );
    }

    /**
     * No rule matched. Fall back through the subscription plan's own rate,
     * then the platform setting, then the historical config value.
     */
    public function fallbackQuote(string $saleAmount, ?int $tenantId = null): CommissionQuote
    {
        $saleAmount = $this->money($saleAmount);
        [$rate, $source] = $this->fallbackRatePercent($tenantId);
        $amount = bcdiv(bcmul($saleAmount, $rate, 6), '100', 2);

        return new CommissionQuote(
            amount: $amount,
            rate: $rate,
            ruleId: null,
            ruleName: $source,
            calculation: CommissionRule::CALC_PERCENTAGE,
            basis: $saleAmount,
        );
    }

    /** @return array{0:string,1:string} [percent, human label for the source] */
    public function fallbackRatePercent(?int $tenantId = null): array
    {
        $planId = $this->planFor($tenantId);
        if ($planId) {
            $planRate = Plan::query()->whereKey($planId)->value('commission_rate');
            if ($planRate !== null) {
                return [number_format((float) $planRate, 4, '.', ''), 'Subscription plan rate'];
            }
        }

        $setting = PlatformSetting::get('commission_rate');
        if (is_numeric($setting)) {
            return [number_format((float) $setting, 4, '.', ''), 'Platform setting'];
        }

        return [$this->defaultRatePercent(), 'Platform default'];
    }

    /** config() stores a fraction (0.05); rules store a percentage (5). */
    public function defaultRatePercent(): string
    {
        return number_format(((float) config('markethub.commission_rate', 0.05)) * 100, 4, '.', '');
    }

    /** Find the winning rule for a sale, or null to fall back to config. */
    public function matchRule(string $saleAmount, array $context = []): ?CommissionRule
    {
        $candidates = $this->rules()->filter(function (CommissionRule $rule) use ($saleAmount, $context) {
            if (bccomp($saleAmount, (string) $rule->min_order_amount, 2) === -1) {
                return false;
            }

            return $this->scopeMatches($rule, $context);
        });

        if ($candidates->isEmpty()) {
            return null;
        }

        return $candidates
            ->sortByDesc(fn (CommissionRule $rule) => [$rule->specificity(), (int) $rule->priority, (int) $rule->id])
            ->first();
    }

    /** Explain which rule applies without charging anything (admin preview). */
    public function explain(string $saleAmount, array $context = []): array
    {
        $quote = $this->quote($saleAmount, $context);
        $rule = $quote->ruleId ? $this->rules()->firstWhere('id', $quote->ruleId) : null;


        return [
            ...$quote->toArray(),
            'sale_amount' => $this->money($saleAmount),
            'seller_receives' => bcsub($this->money($saleAmount), $quote->amount, 2),
            'scope_type' => $rule?->scope_type ?? CommissionRule::SCOPE_GLOBAL,
            'scope_id' => $rule?->scope_id,
            'matched' => $rule !== null,
        ];
    }

    public function flushCache(): void
    {
        $this->cache = null;
        $this->planCache = [];
    }

    /** @return Collection<int, CommissionRule> */
    protected function rules(): Collection
    {
        if ($this->cache === null) {
            $this->cache = CommissionRule::query()->active()->with('tiers')->get();
        }

        return $this->cache;
    }

    protected function scopeMatches(CommissionRule $rule, array $context): bool
    {
        return match ($rule->scope_type) {
            CommissionRule::SCOPE_GLOBAL => true,
            CommissionRule::SCOPE_TENANT => (int) $rule->scope_id === (int) ($context['tenant_id'] ?? 0),
            CommissionRule::SCOPE_STORE => (int) $rule->scope_id === (int) ($context['store_id'] ?? 0),
            CommissionRule::SCOPE_CATEGORY => in_array((int) $rule->scope_id, array_map('intval', $context['category_ids'] ?? []), true),
            CommissionRule::SCOPE_PRODUCT => in_array((int) $rule->scope_id, array_map('intval', $context['product_ids'] ?? []), true),
            CommissionRule::SCOPE_PLAN => (int) $rule->scope_id === (int) $this->planFor($context['tenant_id'] ?? null),
            default => false,
        };
    }

    protected function planFor(?int $tenantId): ?int
    {
        if (! $tenantId) {
            return null;
        }
        if (array_key_exists($tenantId, $this->planCache)) {
            return $this->planCache[$tenantId];
        }

        $planId = Subscription::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('status', ['active', 'trialing', 'trial'])
            ->orderByDesc('id')
            ->value('plan_id');

        return $this->planCache[$tenantId] = $planId ? (int) $planId : null;
    }

    /** @return array{0:string,1:string} [amount, effective rate percent] */
    protected function calculate(CommissionRule $rule, string $basis): array
    {
        switch ($rule->calculation) {
            case CommissionRule::CALC_FLAT:
                $amount = $this->money($rule->flat_fee);
                break;

            case CommissionRule::CALC_PERCENTAGE_PLUS_FLAT:
                $amount = bcadd(
                    bcdiv(bcmul($basis, (string) $rule->rate, 6), '100', 2),
                    $this->money($rule->flat_fee),
                    2,
                );
                break;

            case CommissionRule::CALC_TIERED:
                $tier = $this->tierFor($rule, $basis);
                $rate = $tier ? (string) $tier->rate : (string) $rule->rate;
                $flat = $tier ? (string) $tier->flat_fee : (string) $rule->flat_fee;
                $amount = bcadd(bcdiv(bcmul($basis, $rate, 6), '100', 2), $this->money($flat), 2);
                break;

            default:
                $amount = bcdiv(bcmul($basis, (string) $rule->rate, 6), '100', 2);
        }

        return [$amount, $this->effectiveRate($amount, $basis)];
    }

    protected function tierFor(CommissionRule $rule, string $basis): ?CommissionTier
    {
        return $rule->tiers->first(function (CommissionTier $tier) use ($basis) {
            if (bccomp($basis, (string) $tier->from_amount, 2) === -1) {
                return false;
            }

            return $tier->to_amount === null || bccomp($basis, (string) $tier->to_amount, 2) <= 0;
        });
    }

    protected function clamp(CommissionRule $rule, string $amount, string $basis): string
    {
        if ($rule->min_fee !== null && bccomp($amount, (string) $rule->min_fee, 2) === -1) {
            $amount = $this->money($rule->min_fee);
        }
        if ($rule->max_fee !== null && bccomp($amount, (string) $rule->max_fee, 2) === 1) {
            $amount = $this->money($rule->max_fee);
        }
        // Never take more than the sale itself.
        if (bccomp($amount, $basis, 2) === 1) {
            $amount = $basis;
        }

        return bccomp($amount, '0', 2) === -1 ? '0.00' : $amount;
    }

    protected function effectiveRate(string $amount, string $basis): string
    {
        if (bccomp($basis, '0', 2) <= 0) {
            return '0.0000';
        }

        return bcdiv(bcmul($amount, '100', 6), $basis, 4);
    }

    protected function money(string|float|int|null $value): string
    {
        return number_format((float) ($value ?? 0), 2, '.', '');
    }
}
