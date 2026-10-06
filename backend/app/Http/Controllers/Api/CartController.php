<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Services\CartService;
use App\Services\Commerce\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(
        protected CartService $carts,
        protected CouponService $coupons,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $cart = $this->carts->get($request->user());

        return response()->json(['data' => $this->payload($request, $cart)]);
    }

    public function add(Request $request): JsonResponse
    {
        $data = $request->validate([
            'variant_id' => ['required', 'integer'],
            'qty' => ['required', 'integer', 'min:1'],
        ]);
        $cart = $this->carts->addItem($request->user(), (int) $data['variant_id'], (int) $data['qty']);

        return response()->json(['data' => $this->payload($request, $cart)], 201);
    }

    public function update(Request $request, int $item): JsonResponse
    {
        $data = $request->validate([
            'qty' => ['required', 'integer', 'min:0'],
        ]);
        $cart = $this->carts->updateItem($request->user(), $item, (int) $data['qty']);

        return response()->json(['data' => $this->payload($request, $cart)]);
    }

    public function destroy(Request $request, int $item): JsonResponse
    {
        $cart = $this->carts->removeItem($request->user(), $item);

        return response()->json(['data' => $this->payload($request, $cart)]);
    }

    /** §18 — attach a promo code to the basket. */
    public function applyCoupon(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:48']]);

        $cart = $this->carts->get($request->user());
        $groups = $this->payload($request, $cart, false)['groups'];

        $this->coupons->applyToCart($request->user(), $cart, $data['code'], $groups);

        return response()->json(['data' => $this->payload($request, $cart->fresh())]);
    }

    public function removeCoupon(Request $request): JsonResponse
    {
        $cart = $this->carts->get($request->user());
        $this->coupons->clearCart($cart);

        return response()->json(['data' => $this->payload($request, $cart->fresh())]);
    }

    /**
     * §16 — pick a delivery option per store and re-price the basket.
     *
     * The choice is not persisted: the storefront passes it back on every
     * read and again at checkout, so a stale quote can never be charged.
     */
    public function chooseDelivery(Request $request): JsonResponse
    {
        $request->validate([
            'address_id' => ['nullable', 'integer', 'exists:addresses,id'],
            'delivery_choices' => ['nullable', 'array'],
        ]);

        $cart = $this->carts->get($request->user());

        return response()->json(['data' => $this->payload($request, $cart)]);
    }

    // ----------------------------------------------------------- internals

    /**
     * Resolve the shipping address + delivery picks the client sent, falling
     * back to the customer's default address so quotes are sensible on load.
     */
    protected function payload(Request $request, $cart, bool $applyCoupon = true): array
    {
        $address = null;
        if ($request->filled('address_id')) {
            $address = Address::query()
                ->where('user_id', $request->user()->id)
                ->find($request->integer('address_id'));
        }
        $address ??= Address::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->first();

        $choices = $request->input('delivery_choices', []);
        if (is_string($choices)) {
            $choices = json_decode($choices, true) ?: [];
        }

        return $this->carts->groupedPayload($cart, [
            'address' => $address,
            'delivery_choices' => is_array($choices) ? $choices : [],
            'apply_coupon' => $applyCoupon,
        ]);
    }
}
