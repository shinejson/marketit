<?php

namespace App\Services;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Coupon;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\TenantSetting;
use App\Models\User;
use App\Services\Commerce\CouponService;
use App\Services\Delivery\DeliveryService;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CartService
{
    public function __construct(
        protected DeliveryService $delivery,
        protected CouponService $coupons,
    ) {}

    public function getOrCreate(User $user): Cart
    {
        return Cart::query()->firstOrCreate(['user_id' => $user->id]);
    }

    public function get(User $user): Cart
    {
        $cart = $this->getOrCreate($user);
        $cart->load(['items.store', 'items.variant.product.images', 'items.variant.inventory']);

        return $cart;
    }

    public function addItem(User $user, int $variantId, int $qty): Cart
    {
        if ($qty < 1) {
            throw ValidationException::withMessages(['qty' => 'Quantity must be at least 1.']);
        }

        TenantContext::bypass(true);
        try {
            $variant = ProductVariant::query()
                ->with(['product.store', 'inventory'])
                ->findOrFail($variantId);
        } finally {
            TenantContext::bypass(false);
        }

        if ($variant->status !== ProductVariant::STATUS_ACTIVE || $variant->product->status !== 'active') {
            throw ValidationException::withMessages(['variant_id' => 'Product is not available.']);
        }

        if ($variant->availableQty() < $qty) {
            throw ValidationException::withMessages(['qty' => 'Insufficient inventory. Available: '.$variant->availableQty()]);
        }

        $cart = $this->getOrCreate($user);

        $item = $cart->items()->where('variant_id', $variantId)->first();
        if ($item) {
            $newQty = $item->qty + $qty;
            if ($variant->availableQty() < $newQty) {
                throw ValidationException::withMessages(['qty' => 'Insufficient inventory.']);
            }
            $item->update([
                'qty' => $newQty,
                'unit_price' => $variant->effectivePrice(),
            ]);
        } else {
            $cart->items()->create([
                'user_id' => $user->id,
                'store_id' => $variant->product->store_id,
                'variant_id' => $variant->id,
                'qty' => $qty,
                'unit_price' => $variant->effectivePrice(),
            ]);
        }

        return $this->get($user);
    }

    public function updateItem(User $user, int $itemId, int $qty): Cart
    {
        $cart = $this->getOrCreate($user);
        $item = $cart->items()->whereKey($itemId)->firstOrFail();

        if ($qty < 1) {
            $item->delete();

            return $this->get($user);
        }

        TenantContext::bypass(true);
        try {
            $variant = ProductVariant::query()->with('inventory')->findOrFail($item->variant_id);
        } finally {
            TenantContext::bypass(false);
        }

        if ($variant->availableQty() < $qty) {
            throw ValidationException::withMessages(['qty' => 'Insufficient inventory.']);
        }

        $item->update(['qty' => $qty, 'unit_price' => $variant->effectivePrice()]);

        return $this->get($user);
    }

    public function removeItem(User $user, int $itemId): Cart
    {
        $cart = $this->getOrCreate($user);
        $cart->items()->whereKey($itemId)->delete();

        return $this->get($user);
    }

    public function clear(User $user): void
    {
        $cart = $this->getOrCreate($user);
        $cart->items()->delete();
    }

    /**
     * Price the cart, grouped by seller store.
     *
     * @param  array{address?:Address|null, delivery_choices?:array<int,int|null>, apply_coupon?:bool}  $options
     */
    public function groupedPayload(Cart $cart, array $options = []): array
    {
        /** @var Address|null $address */
        $address = $options['address'] ?? null;
        $choices = $options['delivery_choices'] ?? [];
        $applyCoupon = $options['apply_coupon'] ?? true;

        $groups = [];
        $subtotal = '0.00';
        $tax = '0.00';
        $taxRates = []; // tenant_id => default rate cache

        foreach ($cart->items as $item) {
            $storeId = $item->store_id;
            if (! isset($groups[$storeId])) {
                $groups[$storeId] = [
                    'store' => [
                        'id' => $item->store->id,
                        'tenant_id' => $item->store->tenant_id,
                        'name' => $item->store->name,
                        'slug' => $item->store->slug,
                        'delivery_fee' => $item->store->delivery_fee,
                    ],
                    'items' => [],
                    'subtotal' => '0.00',
                    'tax' => '0.00',
                    'discount' => '0.00',
                    'qty' => 0,
                ];
            }

            $line = bcmul((string) $item->unit_price, (string) $item->qty, 2);
            $groups[$storeId]['subtotal'] = bcadd($groups[$storeId]['subtotal'], $line, 2);
            $groups[$storeId]['qty'] += (int) $item->qty;

            // Tax: per-product rate beats the tenant default; zero-rated /
            // exempt classes are always 0%. Rates are cached per tenant.
            $product = $item->variant->product;
            $tenantId = (int) ($product->tenant_id ?? $item->variant->tenant_id);
            if (! array_key_exists($tenantId, $taxRates)) {
                $taxRates[$tenantId] = (float) (TenantSetting::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->value('tax_rate') ?? 0);
            }
            $rate = $this->lineTaxRate($product, $taxRates[$tenantId]);
            $lineTax = bcmul($line, (string) ($rate / 100), 2);
            $tax = bcadd($tax, $lineTax, 2);
            $groups[$storeId]['tax'] = bcadd($groups[$storeId]['tax'], $lineTax, 2);
            $groups[$storeId]['items'][] = [
                'id' => $item->id,
                'variant_id' => $item->variant_id,
                'product_id' => $product->id,
                'category_id' => $product->category_id,
                'tenant_id' => $tenantId,
                'sku' => $item->variant->sku,
                'product_name' => $product->name,
                'product_slug' => $product->slug,
                'options' => $item->variant->options,
                'qty' => $item->qty,
                'unit_price' => $item->unit_price,
                'line_total' => $line,
                'tax_rate' => $rate,
                'line_tax' => $lineTax,
                'image' => $product->primaryImage()?->url,
                'available' => $item->variant->availableQty(),
            ];
            $subtotal = bcadd($subtotal, $line, 2);
        }

        // Delivery is quoted per store once its subtotal is known (§16).
        $delivery = '0.00';
        foreach ($groups as $storeId => $group) {
            $store = $cart->items->firstWhere('store_id', $storeId)?->store;
            if (! $store) {
                continue;
            }
            $options_ = $this->delivery->optionsForStore($store, $address, $group['subtotal'], (int) $group['qty']);
            $selected = $this->delivery->quoteForStore(
                $store,
                $address,
                $group['subtotal'],
                (int) $group['qty'],
                isset($choices[$storeId]) ? (int) $choices[$storeId] : null,
            );

            $groups[$storeId]['delivery_options'] = $options_;
            $groups[$storeId]['delivery'] = $selected;
            $groups[$storeId]['delivery_fee'] = $selected['fee'];
            $delivery = bcadd($delivery, $selected['fee'], 2);
        }

        $flat = array_values($groups);

        // Coupon (§18): priced against the eligible lines, then split back
        // across the seller groups so each order carries its own share.
        $discountTotal = '0.00';
        $couponPayload = null;
        if ($applyCoupon && $cart->coupon_id) {
            $coupon = Coupon::query()->find($cart->coupon_id);
            if ($coupon) {
                try {
                    $this->coupons->assertUsable($coupon, $cart->user_id ? User::query()->find($cart->user_id) : null);
                    $discount = $this->coupons->discountFor($coupon, $flat);
                    if (bccomp($discount['total'], '0', 2) === 1) {
                        $discountTotal = $discount['total'];
                        foreach ($discount['per_store'] as $storeId => $amount) {
                            if (isset($groups[$storeId])) {
                                $groups[$storeId]['discount'] = $amount;
                            }
                        }
                        $couponPayload = [
                            'id' => $coupon->id,
                            'code' => $coupon->code,
                            'name' => $coupon->name,
                            'discount_type' => $coupon->discount_type,
                            'value' => (string) $coupon->value,
                            'amount' => $discount['total'],
                            'free_shipping' => $discount['free_shipping'],
                        ];
                    } else {
                        $couponPayload = ['code' => $coupon->code, 'amount' => '0.00', 'invalid' => true, 'message' => 'This code does not apply to your basket.'];
                    }
                } catch (ValidationException $e) {
                    $couponPayload = [
                        'code' => $coupon->code,
                        'amount' => '0.00',
                        'invalid' => true,
                        'message' => collect($e->errors())->flatten()->first() ?? 'This coupon can no longer be used.',
                    ];
                }
            }
        }

        $grand = bcadd(bcsub(bcadd($subtotal, $delivery, 2), $discountTotal, 2), $tax, 2);
        if (bccomp($grand, '0', 2) === -1) {
            $grand = '0.00';
        }

        return [
            'id' => $cart->id,
            'groups' => array_values($groups),
            'coupon' => $couponPayload,
            'totals' => [
                'subtotal' => $subtotal,
                'discount_total' => $discountTotal,
                'delivery_total' => $delivery,
                'tax_total' => $tax,
                'grand_total' => $grand,
                'currency' => config('markethub.currency'),
            ],
        ];
    }

    /**
     * Effective tax rate (percent) for one cart line: the product's own
     * rate wins, the tenant default is the fallback, and zero-rated or
     * exempt classes always pay 0%.
     */
    protected function lineTaxRate(Product $product, float $tenantDefault): float
    {
        $class = strtolower((string) $product->tax_class);
        if (in_array($class, ['zero-rated', 'zero_rated', 'zero', 'exempt', 'out_of_scope'], true)) {
            return 0.0;
        }

        return $product->tax_rate !== null ? (float) $product->tax_rate : $tenantDefault;
    }
}
