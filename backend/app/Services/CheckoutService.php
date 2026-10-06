<?php

namespace App\Services;

use App\Models\Address;
use App\Models\CheckoutIdempotency;
use App\Models\Coupon;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PaymentTransaction;
use App\Models\PlatformSetting;
use App\Models\ProductVariant;
use App\Models\SellerOrder;
use App\Models\SellerSettlement;
use App\Models\Store;
use App\Models\User;
use App\Services\Commerce\CommissionResolver;
use App\Services\Commerce\CouponService;
use App\Services\Delivery\DeliveryService;
use App\Services\Integration\EventBus;
use App\Services\Notifications\NotificationService;
use App\Services\Payment\PaymentConfiguration;
use App\Services\Payment\PaymentGateway;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function __construct(
        protected CartService $carts,
        protected PaymentGateway $gateway,
        protected PaymentConfiguration $payments,
        protected EventBus $events,
        protected CommissionResolver $commissions,
        protected CouponService $coupons,
        protected DeliveryService $delivery,
        protected NotificationService $notifications,
    ) {}

    /**
     * Price the basket before payment: delivery options per store, coupon
     * discount and the resulting totals.
     *
     * @param  array{address_id?:int|null, delivery_choices?:array<int,int|null>}  $options
     */
    public function quote(User $user, array $options = []): array
    {
        $cart = $this->carts->get($user);
        if ($cart->items->isEmpty()) {
            throw ValidationException::withMessages(['cart' => 'Cart is empty.']);
        }
        $this->revalidatePrices($cart);

        return $this->carts->groupedPayload($cart, [
            'address' => $this->resolveAddress($user, $options['address_id'] ?? null),
            'delivery_choices' => $options['delivery_choices'] ?? [],
        ]);
    }

    public function checkout(
        User $user,
        int $shippingAddressId,
        string $idempotencyKey,
        string $paymentMethod = 'card',
        array $deliveryChoices = [],
    ): array {
        $existing = CheckoutIdempotency::query()
            ->where('key', $idempotencyKey)
            ->where('user_id', $user->id)
            ->where('expires_at', '>', now())
            ->first();

        if ($existing) {
            return $existing->response;
        }

        $address = Address::query()
            ->where('user_id', $user->id)
            ->whereKey($shippingAddressId)
            ->firstOrFail();

        $payload = DB::transaction(function () use ($user, $address, $idempotencyKey, $paymentMethod, $deliveryChoices) {
            $cart = $this->carts->get($user);
            if ($cart->items->isEmpty()) {
                throw ValidationException::withMessages(['cart' => 'Cart is empty.']);
            }

            $this->revalidatePrices($cart);
            $quote = $this->carts->groupedPayload($cart, [
                'address' => $address,
                'delivery_choices' => $deliveryChoices,
            ]);

            // A coupon that went stale between basket and pay must not slip
            // through: re-assert it before the order is written.
            $coupon = null;
            if ($cart->coupon_id) {
                $coupon = Coupon::query()->find($cart->coupon_id);
                if ($coupon) {
                    $this->coupons->assertUsable($coupon, $user);
                }
            }

            $order = Order::query()->create([
                'user_id' => $user->id,
                'subtotal' => $quote['totals']['subtotal'],
                'discount_total' => $quote['totals']['discount_total'],
                'delivery_total' => $quote['totals']['delivery_total'],
                'tax_total' => $quote['totals']['tax_total'],
                'grand_total' => $quote['totals']['grand_total'],
                'currency' => $quote['totals']['currency'],
                'coupon_id' => $coupon?->id,
                'coupon_code' => $coupon?->code,
                'status' => Order::STATUS_PENDING_PAYMENT,
                'shipping_address_id' => $address->id,
                'placed_at' => now(),
                'idempotency_key' => $idempotencyKey,
            ]);

            $allocations = [];

            foreach ($quote['groups'] as $group) {
                $subtotal = $group['subtotal'];
                $discount = (string) ($group['discount'] ?? '0.00');
                $delivery = (string) ($group['delivery_fee'] ?? $group['store']['delivery_fee'] ?? '0.00');
                $netSale = bcsub($subtotal, $discount, 2);
                if (bccomp($netSale, '0', 2) === -1) {
                    $netSale = '0.00';
                }

                $storeId = (int) $group['store']['id'];
                $tenantId = (int) ($group['store']['tenant_id'] ?? 0);
                if (! $tenantId) {
                    $firstItem = $cart->items->firstWhere('store_id', $storeId);
                    $tenantId = (int) ($firstItem?->variant?->tenant_id
                        ?? ProductVariant::withoutGlobalScopes()->find($group['items'][0]['variant_id'])?->tenant_id);
                }

                // §14 — commission comes from the rule engine, not a constant.
                $commissionQuote = $this->commissions->quote($netSale, [
                    'tenant_id' => $tenantId,
                    'store_id' => $storeId,
                    'delivery_fee' => $delivery,
                    'product_ids' => array_values(array_filter(array_column($group['items'], 'product_id'))),
                    'category_ids' => array_values(array_filter(array_column($group['items'], 'category_id'))),
                ]);

                $net = bcsub(bcadd($netSale, $delivery, 2), $commissionQuote->amount, 2);
                $deliveryChoice = $group['delivery'] ?? [];

                $sellerOrder = SellerOrder::withoutGlobalScopes()->create([
                    'order_id' => $order->id,
                    'tenant_id' => $tenantId,
                    'store_id' => $storeId,
                    'subtotal' => $subtotal,
                    'discount' => $discount,
                    'delivery_fee' => $delivery,
                    'delivery_method_id' => $deliveryChoice['method_id'] ?? null,
                    'delivery_zone_id' => $deliveryChoice['zone_id'] ?? null,
                    'delivery_type' => $deliveryChoice['type'] ?? null,
                    'commission' => $commissionQuote->amount,
                    'commission_rate' => $commissionQuote->rate,
                    'commission_rule_id' => $commissionQuote->ruleId,
                    'net_settlement' => $net,
                    'status' => SellerOrder::STATUS_AWAITING_FULFILLMENT,
                ]);

                foreach ($group['items'] as $line) {
                    $this->reserveInventory($line['variant_id'], $line['qty']);

                    OrderItem::query()->create([
                        'seller_order_id' => $sellerOrder->id,
                        'variant_id' => $line['variant_id'],
                        'product_name' => $line['product_name'],
                        'sku' => $line['sku'],
                        'unit_price' => $line['unit_price'],
                        'qty' => $line['qty'],
                        'line_tax' => (string) ($line['line_tax'] ?? '0.00'),
                        'options' => $line['options'],
                    ]);
                }

                SellerSettlement::query()->create([
                    'seller_order_id' => $sellerOrder->id,
                    'tenant_id' => $tenantId,
                    'gross' => $netSale,
                    'commission' => $commissionQuote->amount,
                    'commission_rate' => $commissionQuote->rate,
                    'delivery_fee' => $delivery,
                    'refund_amount' => '0.00',
                    'net' => $net,
                    'currency' => $order->currency,
                    'status' => SellerSettlement::STATUS_PENDING,
                ]);

                // §16 — open the shipment so the seller has something to
                // attach a carrier and tracking number to.
                $this->delivery->ensureShipment($sellerOrder, [
                    'type' => $deliveryChoice['type'] ?? null,
                    'carrier' => $deliveryChoice['carrier'] ?? null,
                    'service_level' => $deliveryChoice['service_level'] ?? null,
                    'cost' => $delivery,
                    'status' => ($deliveryChoice['type'] ?? null) === 'pickup'
                        ? \App\Models\Shipment::STATUS_READY_FOR_PICKUP
                        : \App\Models\Shipment::STATUS_PENDING,
                ]);

                if (bccomp($discount, '0', 2) === 1) {
                    $allocations[] = ['seller_order_id' => $sellerOrder->id, 'amount' => $discount];
                }
            }

            if ($coupon && $allocations) {
                $this->coupons->redeem($coupon, $order, $allocations, $quote['totals']['discount_total']);
            }

            $intent = $this->gateway->createIntent($order, (string) $order->grand_total, $paymentMethod);

            PaymentTransaction::query()->create([
                'order_id' => $order->id,
                'gateway' => $this->payments->provider(),
                'gateway_ref' => $intent->gatewayRef,
                'amount' => $order->grand_total,
                'status' => PaymentTransaction::STATUS_INITIATED,
                'idempotency_key' => $idempotencyKey,
                'meta' => ['checkout_url' => $intent->url, 'intent_type' => $intent->type, ...$intent->meta],
            ]);

            $this->carts->clear($user);
            $this->coupons->clearCart($cart);

            $order->load('sellerOrders');

            return [
                'order' => [
                    'id' => $order->id,
                    'status' => $order->status,
                    'grand_total' => (string) $order->grand_total,
                    'discount_total' => (string) $order->discount_total,
                    'coupon_code' => $order->coupon_code,
                    'currency' => $order->currency,
                ],
                'seller_orders' => $order->sellerOrders->map(fn ($so) => [
                    'id' => $so->id,
                    'store_id' => $so->store_id,
                    'subtotal' => (string) $so->subtotal,
                    'discount' => (string) $so->discount,
                    'delivery_fee' => (string) $so->delivery_fee,
                    'commission' => (string) $so->commission,
                    'status' => $so->status,
                ])->all(),
                'payment' => [
                    'type' => $intent->type,
                    'url' => $intent->url,
                    'gateway_ref' => $intent->gatewayRef,
                    'method' => $paymentMethod,
                    'provider' => $this->payments->provider(),
                ],
            ];
        });

        CheckoutIdempotency::query()->create([
            'key' => $idempotencyKey,
            'user_id' => $user->id,
            'response' => $payload,
            'status_code' => 201,
            'expires_at' => now()->addHours((int) config('markethub.idempotency_ttl_hours')),
        ]);

        $this->events->emit(null, 'order.placed', [
            'order_id' => $payload['order']['id'],
            'grand_total' => $payload['order']['grand_total'],
        ], hash('sha256', 'u:'.$user->id));

        $this->notifications->toCustomer($user->id, 'order', 'Order #'.$payload['order']['id'].' placed', [
            'body' => 'We are waiting for your payment to confirm the order.',
            'action_url' => '/orders/'.$payload['order']['id'],
            'action_label' => 'View order',
            'subject_type' => Order::class,
            'subject_id' => $payload['order']['id'],
        ]);

        foreach ($payload['seller_orders'] as $so) {
            $sellerOrder = SellerOrder::withoutGlobalScopes()->find($so['id']);
            $tenantId = $sellerOrder?->tenant_id;
            if ($tenantId) {
                $this->events->emit((int) $tenantId, 'order.placed', [
                    'order_id' => $payload['order']['id'],
                    'seller_order_id' => $so['id'],
                    'store_id' => $so['store_id'],
                    'subtotal' => $so['subtotal'],
                ], hash('sha256', 'u:'.$user->id));

                $this->notifications->toTenant((int) $tenantId, 'order', 'New order #'.$payload['order']['id'], [
                    'body' => 'A customer placed an order worth '.$so['subtotal'].'. It will appear once payment clears.',
                    'action_url' => '/tenant/orders',
                    'action_label' => 'Open orders',
                    'subject_type' => SellerOrder::class,
                    'subject_id' => $so['id'],
                ]);
            }
        }

        return $payload;
    }

    protected function resolveAddress(User $user, ?int $addressId): ?Address
    {
        $query = Address::query()->where('user_id', $user->id);

        if ($addressId) {
            return (clone $query)->whereKey($addressId)->first()
                ?? $query->orderByDesc('is_default')->orderBy('id')->first();
        }

        return $query->orderByDesc('is_default')->orderBy('id')->first();
    }

    protected function revalidatePrices($cart): void
    {
        TenantContext::bypass(true);
        try {
            foreach ($cart->items as $item) {
                $variant = ProductVariant::query()->with(['product', 'inventory'])->find($item->variant_id);
                if (! $variant || $variant->status !== ProductVariant::STATUS_ACTIVE || $variant->product->status !== 'active') {
                    throw ValidationException::withMessages(['cart' => 'A product in your cart is no longer available.']);
                }
                if (! $variant->product->isPubliclyVisible()) {
                    throw ValidationException::withMessages(['cart' => 'A product in your cart is under review and cannot be purchased right now.']);
                }
                if ($variant->availableQty() < $item->qty) {
                    throw ValidationException::withMessages(['qty' => "Insufficient stock for {$variant->product->name}."]);
                }
                $current = $variant->effectivePrice();
                if (bccomp((string) $current, (string) $item->unit_price, 2) !== 0) {
                    $item->update(['unit_price' => $current]);
                    $item->unit_price = $current;
                }
            }
        } finally {
            TenantContext::bypass(false);
        }
    }

    protected function reserveInventory(int $variantId, int $qty): void
    {
        $inventory = Inventory::withoutGlobalScopes()
            ->where('variant_id', $variantId)
            ->lockForUpdate()
            ->first();

        if (! $inventory) {
            throw ValidationException::withMessages(['inventory' => 'Inventory record missing.']);
        }

        $available = (int) $inventory->quantity - (int) $inventory->reserved;
        if ($available < $qty) {
            throw ValidationException::withMessages(['qty' => 'Insufficient inventory at checkout.']);
        }

        $inventory->reserved = (int) $inventory->reserved + $qty;
        $inventory->version = (int) $inventory->version + 1;
        $inventory->save();
    }

    public function markPaid(Order $order): void
    {
        if ($order->status !== Order::STATUS_PENDING_PAYMENT) {
            return;
        }

        $holdDays = (int) (PlatformSetting::get('payout_hold_days', 7) ?: 7);

        DB::transaction(function () use ($order, $holdDays) {
            $order->update(['status' => Order::STATUS_PAID]);
            foreach ($order->sellerOrders()->withoutGlobalScopes()->get() as $sellerOrder) {
                foreach ($sellerOrder->items as $item) {
                    $inventory = Inventory::withoutGlobalScopes()
                        ->where('variant_id', $item->variant_id)
                        ->lockForUpdate()
                        ->first();
                    if ($inventory) {
                        $inventory->quantity = max(0, (int) $inventory->quantity - (int) $item->qty);
                        $inventory->reserved = max(0, (int) $inventory->reserved - (int) $item->qty);
                        $inventory->version = (int) $inventory->version + 1;
                        $inventory->save();
                    }
                }

                // §12 — the settlement clock starts when the money lands.
                SellerSettlement::query()
                    ->where('seller_order_id', $sellerOrder->id)
                    ->whereNull('available_at')
                    ->update(['available_at' => now()->addDays($holdDays)]);
            }
        });

        $order->load('sellerOrders');
        $this->events->emit(null, 'order.paid', [
            'order_id' => $order->id,
            'grand_total' => (string) $order->grand_total,
        ]);

        $this->notifications->toCustomer($order->user_id, 'payment', 'Payment received for order #'.$order->id, [
            'body' => 'Thanks — your payment cleared and the sellers are preparing your items.',
            'action_url' => '/orders/'.$order->id,
            'action_label' => 'Track order',
            'level' => 'success',
            'subject_type' => Order::class,
            'subject_id' => $order->id,
        ]);

        foreach ($order->sellerOrders as $sellerOrder) {
            $this->events->emit((int) $sellerOrder->tenant_id, 'order.paid', [
                'order_id' => $order->id,
                'seller_order_id' => $sellerOrder->id,
                'store_id' => $sellerOrder->store_id,
            ]);
            $this->notifications->toTenant((int) $sellerOrder->tenant_id, 'order', 'Order #'.$order->id.' is paid', [
                'body' => 'Payment cleared — this order is ready to fulfil.',
                'action_url' => '/tenant/orders',
                'action_label' => 'Fulfil order',
                'level' => 'success',
                'subject_type' => SellerOrder::class,
                'subject_id' => $sellerOrder->id,
            ]);
        }
    }

    public function releaseReservation(Order $order): void
    {
        DB::transaction(function () use ($order) {
            foreach ($order->sellerOrders()->withoutGlobalScopes()->get() as $sellerOrder) {
                foreach ($sellerOrder->items as $item) {
                    $inventory = Inventory::withoutGlobalScopes()
                        ->where('variant_id', $item->variant_id)
                        ->lockForUpdate()
                        ->first();
                    if ($inventory) {
                        $inventory->reserved = max(0, (int) $inventory->reserved - (int) $item->qty);
                        $inventory->version = (int) $inventory->version + 1;
                        $inventory->save();
                    }
                }
                $sellerOrder->update(['status' => SellerOrder::STATUS_CANCELLED]);
                SellerSettlement::query()
                    ->where('seller_order_id', $sellerOrder->id)
                    ->whereIn('status', [SellerSettlement::STATUS_PENDING, SellerSettlement::STATUS_AVAILABLE])
                    ->update(['status' => SellerSettlement::STATUS_REVERSED, 'net' => 0]);
            }
            $order->update(['status' => Order::STATUS_CANCELLED]);
        });

        // Hand the coupon usage back so the shopper can try again.
        $this->coupons->release($order);

        $this->notifications->toCustomer($order->user_id, 'order', 'Order #'.$order->id.' cancelled', [
            'body' => 'The order was cancelled and any reserved stock has been released.',
            'action_url' => '/orders/'.$order->id,
            'action_label' => 'View order',
            'level' => 'warning',
            'subject_type' => Order::class,
            'subject_id' => $order->id,
        ]);
    }

    /** Store lookup helper shared with the checkout controller. */
    public function storeFor(int $storeId): ?Store
    {
        return Store::withoutGlobalScopes()->find($storeId);
    }
}
