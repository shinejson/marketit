<?php

namespace App\Services\Commerce;

use App\Models\Cart;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\CouponTarget;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * §18 / §22 #18 — coupon validation, pricing and redemption.
 *
 * Discounts are calculated on the eligible subset of a multi-store cart and
 * then split back across the seller groups pro rata, so each seller order
 * carries its own share and commission is charged on the net figure.
 */
class CouponService
{
    /** Look a code up without caring about case or padding. */
    public function find(string $code): ?Coupon
    {
        $code = strtoupper(trim($code));
        if ($code === '') {
            return null;
        }

        return Coupon::query()->whereRaw('UPPER(code) = ?', [$code])->first();
    }

    /**
     * Validate a code against a grouped cart payload and return the coupon
     * plus the discount it would produce.
     *
     * @param  array<int, array<string, mixed>>  $groups
     * @return array{coupon: Coupon, discount: array<string, mixed>}
     */
    public function validateForCart(?User $user, string $code, array $groups): array
    {
        $coupon = $this->find($code);
        if (! $coupon) {
            throw ValidationException::withMessages(['coupon' => 'That coupon code does not exist.']);
        }

        $this->assertUsable($coupon, $user);

        $discount = $this->discountFor($coupon, $groups);
        if (bccomp($discount['eligible_subtotal'], (string) $coupon->min_subtotal, 2) === -1) {
            throw ValidationException::withMessages([
                'coupon' => 'This code needs a qualifying subtotal of at least '.number_format((float) $coupon->min_subtotal, 2).'.',
            ]);
        }
        if (bccomp($discount['total'], '0', 2) <= 0) {
            throw ValidationException::withMessages(['coupon' => 'This code does not apply to anything in your basket.']);
        }

        return ['coupon' => $coupon, 'discount' => $discount];
    }

    /** Throws when the coupon window, status or usage caps block redemption. */
    public function assertUsable(Coupon $coupon, ?User $user): void
    {
        if ($coupon->status !== Coupon::STATUS_ACTIVE) {
            throw ValidationException::withMessages(['coupon' => 'This coupon is not currently active.']);
        }
        if ($coupon->starts_at && $coupon->starts_at->isFuture()) {
            throw ValidationException::withMessages(['coupon' => 'This coupon is not available yet.']);
        }
        if ($coupon->ends_at && $coupon->ends_at->isPast()) {
            throw ValidationException::withMessages(['coupon' => 'This coupon has expired.']);
        }
        if ($coupon->usage_limit !== null && $coupon->used_count >= $coupon->usage_limit) {
            throw ValidationException::withMessages(['coupon' => 'This coupon has been fully redeemed.']);
        }

        if (! $user) {
            return;
        }

        if ($coupon->per_user_limit !== null) {
            $used = CouponRedemption::query()
                ->where('coupon_id', $coupon->id)
                ->where('user_id', $user->id)
                ->where('status', CouponRedemption::STATUS_APPLIED)
                ->count();
            if ($used >= $coupon->per_user_limit) {
                throw ValidationException::withMessages(['coupon' => 'You have already used this coupon.']);
            }
        }

        if ($coupon->first_order_only) {
            $hasOrder = Order::query()
                ->where('user_id', $user->id)
                ->whereNotIn('status', [Order::STATUS_CANCELLED, Order::STATUS_PENDING_PAYMENT])
                ->exists();
            if ($hasOrder) {
                throw ValidationException::withMessages(['coupon' => 'This code is for first orders only.']);
            }
        }
    }

    /**
     * Price a coupon against a grouped cart.
     *
     * @param  array<int, array<string, mixed>>  $groups
     * @return array{total:string, per_store:array<int,string>, eligible_subtotal:string, free_shipping:bool, type:string}
     */
    public function discountFor(Coupon $coupon, array $groups): array
    {
        $targets = $this->targets($coupon);
        $eligible = [];
        $eligibleSubtotal = '0.00';
        $eligibleDelivery = '0.00';

        foreach ($groups as $group) {
            $storeId = (int) ($group['store']['id'] ?? 0);
            $tenantId = (int) ($group['store']['tenant_id'] ?? 0);

            if ($coupon->tenant_id !== null && (int) $coupon->tenant_id !== $tenantId) {
                continue;
            }
            if ($coupon->store_id !== null && (int) $coupon->store_id !== $storeId) {
                continue;
            }
            if ($coupon->applies_to === Coupon::APPLIES_STORES
                && ! in_array($storeId, $targets[CouponTarget::TYPE_STORE] ?? [], true)) {
                continue;
            }

            $groupEligible = '0.00';
            foreach ($group['items'] ?? [] as $item) {
                if (! $this->itemMatches($coupon, $targets, $item)) {
                    continue;
                }
                $groupEligible = bcadd($groupEligible, (string) ($item['line_total'] ?? '0'), 2);
            }

            if (bccomp($groupEligible, '0', 2) <= 0) {
                continue;
            }

            $eligible[$storeId] = $groupEligible;
            $eligibleSubtotal = bcadd($eligibleSubtotal, $groupEligible, 2);
            $eligibleDelivery = bcadd($eligibleDelivery, (string) ($group['delivery_fee'] ?? $group['store']['delivery_fee'] ?? '0'), 2);
        }

        if (bccomp($eligibleSubtotal, '0', 2) <= 0) {
            return [
                'total' => '0.00',
                'per_store' => [],
                'eligible_subtotal' => '0.00',
                'free_shipping' => false,
                'type' => (string) $coupon->discount_type,
            ];
        }

        if ($coupon->discount_type === Coupon::TYPE_FREE_SHIPPING) {
            $total = $eligibleDelivery;
            if ($coupon->max_discount !== null && bccomp($total, (string) $coupon->max_discount, 2) === 1) {
                $total = $this->money($coupon->max_discount);
            }

            return [
                'total' => $total,
                'per_store' => $this->spread($total, $eligible),
                'eligible_subtotal' => $eligibleSubtotal,
                'free_shipping' => true,
                'type' => Coupon::TYPE_FREE_SHIPPING,
            ];
        }

        $total = $coupon->discount_type === Coupon::TYPE_PERCENTAGE
            ? bcdiv(bcmul($eligibleSubtotal, (string) $coupon->value, 6), '100', 2)
            : $this->money($coupon->value);

        if ($coupon->max_discount !== null && bccomp($total, (string) $coupon->max_discount, 2) === 1) {
            $total = $this->money($coupon->max_discount);
        }
        if (bccomp($total, $eligibleSubtotal, 2) === 1) {
            $total = $eligibleSubtotal;
        }

        return [
            'total' => $total,
            'per_store' => $this->spread($total, $eligible),
            'eligible_subtotal' => $eligibleSubtotal,
            'free_shipping' => false,
            'type' => (string) $coupon->discount_type,
        ];
    }

    /** Attach a validated code to the shopper's cart. */
    public function applyToCart(User $user, Cart $cart, string $code, array $groups): array
    {
        $result = $this->validateForCart($user, $code, $groups);
        $cart->forceFill([
            'coupon_id' => $result['coupon']->id,
            'coupon_code' => $result['coupon']->code,
        ])->save();

        return $result;
    }

    public function clearCart(Cart $cart): void
    {
        $cart->forceFill(['coupon_id' => null, 'coupon_code' => null])->save();
    }

    /**
     * Write the redemption rows once an order exists.
     *
     * @param  array<int, array{seller_order_id:int, amount:string}>  $allocations
     */
    public function redeem(Coupon $coupon, Order $order, array $allocations, string $total): void
    {
        DB::transaction(function () use ($coupon, $order, $allocations, $total) {
            foreach ($allocations as $allocation) {
                CouponRedemption::query()->create([
                    'coupon_id' => $coupon->id,
                    'user_id' => $order->user_id,
                    'order_id' => $order->id,
                    'seller_order_id' => $allocation['seller_order_id'],
                    'code' => $coupon->code,
                    'amount' => $allocation['amount'],
                    'currency' => $order->currency,
                    'status' => CouponRedemption::STATUS_APPLIED,
                ]);
            }

            $coupon->increment('used_count');
            $coupon->increment('redeemed_value', (float) $total);
        });
    }

    /** Give the usage back when an order is cancelled before payment. */
    public function release(Order $order): void
    {
        $redemptions = CouponRedemption::query()
            ->where('order_id', $order->id)
            ->where('status', CouponRedemption::STATUS_APPLIED)
            ->get();

        if ($redemptions->isEmpty()) {
            return;
        }

        DB::transaction(function () use ($redemptions) {
            $byCoupon = $redemptions->groupBy('coupon_id');
            foreach ($byCoupon as $couponId => $rows) {
                $coupon = Coupon::query()->find($couponId);
                if ($coupon) {
                    $coupon->used_count = max(0, (int) $coupon->used_count - 1);
                    $coupon->redeemed_value = max(0, (float) $coupon->redeemed_value - (float) $rows->sum('amount'));
                    $coupon->save();
                }
                CouponRedemption::query()
                    ->whereIn('id', $rows->pluck('id'))
                    ->update(['status' => CouponRedemption::STATUS_RELEASED]);
            }
        });
    }

    /**
     * Targets indexed by type.
     *
     * @return array<string, int[]>
     */
    public function targets(Coupon $coupon): array
    {
        $grouped = [];
        foreach ($coupon->targets()->get() as $target) {
            $grouped[$target->target_type][] = (int) $target->target_id;
        }

        return $grouped;
    }

    protected function itemMatches(Coupon $coupon, array $targets, array $item): bool
    {
        return match ($coupon->applies_to) {
            Coupon::APPLIES_PRODUCTS => in_array((int) ($item['product_id'] ?? 0), $targets[CouponTarget::TYPE_PRODUCT] ?? [], true),
            Coupon::APPLIES_CATEGORIES => in_array((int) ($item['category_id'] ?? 0), $targets[CouponTarget::TYPE_CATEGORY] ?? [], true),
            default => true,
        };
    }

    /**
     * Split a total across stores pro rata on their eligible subtotal, with
     * the rounding remainder landing on the largest group.
     *
     * @param  array<int,string>  $weights
     * @return array<int,string>
     */
    protected function spread(string $total, array $weights): array
    {
        $sum = '0.00';
        foreach ($weights as $value) {
            $sum = bcadd($sum, $value, 2);
        }
        if (bccomp($sum, '0', 2) <= 0) {
            return [];
        }

        $allocated = '0.00';
        $result = [];
        $keys = array_keys($weights);
        foreach ($keys as $index => $storeId) {
            if ($index === count($keys) - 1) {
                $result[$storeId] = bcsub($total, $allocated, 2);
                break;
            }
            $share = bcdiv(bcmul($total, $weights[$storeId], 6), $sum, 2);
            $result[$storeId] = $share;
            $allocated = bcadd($allocated, $share, 2);
        }

        return $result;
    }

    protected function money(string|float|int|null $value): string
    {
        return number_format((float) ($value ?? 0), 2, '.', '');
    }
}
