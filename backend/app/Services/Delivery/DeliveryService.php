<?php

namespace App\Services\Delivery;

use App\Models\Address;
use App\Models\DeliveryMethod;
use App\Models\DeliveryZone;
use App\Models\SellerOrder;
use App\Models\Shipment;
use App\Models\ShipmentEvent;
use App\Models\Store;
use App\Support\TenantContext;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * §16 — delivery zones, fulfilment options and tracking.
 *
 * Stores that have not configured zones keep working exactly as before: the
 * flat `stores.delivery_fee` / `stores.delivery_days` pair is surfaced as a
 * single "Standard delivery" option.
 */
class DeliveryService
{
    /**
     * Every fulfilment option a shopper can pick for one store.
     *
     * @return array<int, array<string, mixed>>
     */
    public function optionsForStore(Store $store, ?Address $address, string $subtotal, int $itemCount = 1): array
    {
        $zone = $this->matchZone($store, $address);
        $methods = $this->methodsFor($store, $zone);

        if ($methods->isEmpty()) {
            return [$this->legacyOption($store, $subtotal, $zone)];
        }

        $options = [];
        foreach ($methods as $method) {
            $options[] = $this->describeMethod($method, $store, $zone, $subtotal, $itemCount);
        }

        // Pickup always first, then cheapest.
        usort($options, function (array $a, array $b) {
            if ($a['type'] === DeliveryMethod::TYPE_PICKUP xor $b['type'] === DeliveryMethod::TYPE_PICKUP) {
                return $a['type'] === DeliveryMethod::TYPE_PICKUP ? -1 : 1;
            }

            return bccomp($a['fee'], $b['fee'], 2);
        });

        return $options;
    }

    /**
     * Resolve the option a checkout should charge for: the explicit choice
     * when it is still valid, otherwise the store default.
     *
     * @return array<string, mixed>
     */
    public function quoteForStore(Store $store, ?Address $address, string $subtotal, int $itemCount = 1, ?int $methodId = null): array
    {
        $options = $this->optionsForStore($store, $address, $subtotal, $itemCount);

        if ($methodId) {
            foreach ($options as $option) {
                if ((int) ($option['method_id'] ?? 0) === $methodId) {
                    return $option;
                }
            }
        }

        foreach ($options as $option) {
            if (! empty($option['is_default'])) {
                return $option;
            }
        }

        return $options[0] ?? $this->legacyOption($store, $subtotal, null);
    }

    /** The best-matching zone for an address, or the store's default zone. */
    public function matchZone(Store $store, ?Address $address): ?DeliveryZone
    {
        $zones = $this->zonesFor($store);
        if ($zones->isEmpty()) {
            return null;
        }

        $matches = $zones->filter(fn (DeliveryZone $zone) => $zone->covers(
            $address?->country,
            $address?->state,
            $address?->city,
            $address?->postal_code,
        ));

        if ($matches->isEmpty()) {
            return $zones->firstWhere('is_default', true);
        }

        return $matches
            ->sortByDesc(fn (DeliveryZone $zone) => [$zone->specificity(), (int) $zone->priority, (int) $zone->id])
            ->first();
    }

    /** @return Collection<int, DeliveryZone> */
    public function zonesFor(Store $store): Collection
    {
        return $this->withoutTenantScope(fn () => DeliveryZone::withoutGlobalScopes()
            ->where('tenant_id', $store->tenant_id)
            ->where('status', DeliveryZone::STATUS_ACTIVE)
            ->where(fn ($q) => $q->whereNull('store_id')->orWhere('store_id', $store->id))
            ->orderByDesc('priority')
            ->get());
    }

    /** @return Collection<int, DeliveryMethod> */
    public function methodsFor(Store $store, ?DeliveryZone $zone): Collection
    {
        return $this->withoutTenantScope(function () use ($store, $zone) {
            $query = DeliveryMethod::withoutGlobalScopes()
                ->where('tenant_id', $store->tenant_id)
                ->where('status', DeliveryMethod::STATUS_ACTIVE)
                ->where(fn ($q) => $q->whereNull('store_id')->orWhere('store_id', $store->id));

            $query->where(function ($q) use ($zone) {
                $q->whereNull('delivery_zone_id');
                if ($zone) {
                    $q->orWhere('delivery_zone_id', $zone->id);
                }
            });

            return $query->orderBy('position')->orderBy('id')->get();
        });
    }

    /** Price one method against the cart. */
    protected function describeMethod(DeliveryMethod $method, Store $store, ?DeliveryZone $zone, string $subtotal, int $itemCount): array
    {
        $fee = $this->money($method->fee);

        // Zone-priced methods inherit the zone's rate card.
        if ($zone && $method->type !== DeliveryMethod::TYPE_PICKUP && bccomp($fee, '0', 2) === 0) {
            $fee = bcadd(
                $this->money($zone->base_fee),
                bcmul($this->money($zone->per_item_fee), (string) max(1, $itemCount), 2),
                2,
            );
        }

        if ($method->type === DeliveryMethod::TYPE_PICKUP) {
            $fee = '0.00';
        }

        $freeOver = $method->free_over ?? $zone?->free_over;
        if ($freeOver !== null && bccomp($subtotal, $this->money($freeOver), 2) >= 0) {
            $fee = '0.00';
        }

        return [
            'method_id' => $method->id,
            'zone_id' => $zone?->id,
            'zone_name' => $zone?->name,
            'name' => $method->name,
            'type' => $method->type,
            'carrier' => $method->carrier,
            'service_level' => $method->service_level,
            'fee' => $fee,
            'min_days' => (int) ($method->min_days ?: $zone?->min_days ?: 1),
            'max_days' => (int) ($method->max_days ?: $zone?->max_days ?: 5),
            'pickup_address' => $method->pickup_address,
            'pickup_hours' => $method->pickup_hours,
            'instructions' => $method->instructions,
            'is_default' => (bool) $method->is_default,
            'free_over' => $freeOver !== null ? $this->money($freeOver) : null,
        ];
    }

    /** Stores with no delivery configuration keep their flat fee. */
    protected function legacyOption(Store $store, string $subtotal, ?DeliveryZone $zone): array
    {
        $fee = $zone
            ? bcadd($this->money($zone->base_fee), '0', 2)
            : $this->money($store->delivery_fee);

        $freeOver = $zone?->free_over;
        if ($freeOver !== null && bccomp($subtotal, $this->money($freeOver), 2) >= 0) {
            $fee = '0.00';
        }

        return [
            'method_id' => null,
            'zone_id' => $zone?->id,
            'zone_name' => $zone?->name,
            'name' => $zone?->name ? $zone->name.' delivery' : 'Standard delivery',
            'type' => DeliveryMethod::TYPE_STORE_DELIVERY,
            'carrier' => null,
            'service_level' => null,
            'fee' => $fee,
            'min_days' => (int) ($zone?->min_days ?: 1),
            'max_days' => (int) ($zone?->max_days ?: ($store->delivery_days ?: 5)),
            'pickup_address' => null,
            'pickup_hours' => null,
            'instructions' => null,
            'is_default' => true,
            'free_over' => $freeOver !== null ? $this->money($freeOver) : null,
        ];
    }

    // ------------------------------------------------------------ shipments

    /** Open (or return) the shipment record for a seller order. */
    public function ensureShipment(SellerOrder $sellerOrder, array $attributes = []): Shipment
    {
        $existing = Shipment::withoutGlobalScopes()->where('seller_order_id', $sellerOrder->id)->first();
        if ($existing) {
            return $existing;
        }

        $order = $sellerOrder->order()->with('shippingAddress')->first();
        $address = $order?->shippingAddress;

        $shipment = Shipment::withoutGlobalScopes()->create([
            'tenant_id' => $sellerOrder->tenant_id,
            'store_id' => $sellerOrder->store_id,
            'seller_order_id' => $sellerOrder->id,
            'delivery_method_id' => $attributes['delivery_method_id'] ?? $sellerOrder->delivery_method_id,
            'delivery_zone_id' => $attributes['delivery_zone_id'] ?? $sellerOrder->delivery_zone_id,
            'reference' => $this->reference(),
            'type' => $attributes['type'] ?? $sellerOrder->delivery_type ?? DeliveryMethod::TYPE_STORE_DELIVERY,
            'carrier' => $attributes['carrier'] ?? null,
            'service_level' => $attributes['service_level'] ?? null,
            'status' => $attributes['status'] ?? Shipment::STATUS_PENDING,
            'cost' => $attributes['cost'] ?? $sellerOrder->delivery_fee,
            'recipient_name' => $address?->full_name,
            'recipient_phone' => $address?->phone,
            'destination' => $address ? $this->formatAddress($address) : null,
        ]);

        $this->recordEvent($shipment, $shipment->status, 'Shipment created.', null, null);

        return $shipment;
    }

    /** Apply a status / tracking update and append a scan event. */
    public function updateShipment(Shipment $shipment, array $data, ?int $actorId = null): Shipment
    {
        $previousStatus = $shipment->status;

        $shipment->fill(array_filter([
            'carrier' => $data['carrier'] ?? null,
            'service_level' => $data['service_level'] ?? null,
            'tracking_number' => $data['tracking_number'] ?? null,
            'tracking_url' => $data['tracking_url'] ?? null,
            'notes' => $data['notes'] ?? null,
            'recipient_name' => $data['recipient_name'] ?? null,
            'recipient_phone' => $data['recipient_phone'] ?? null,
        ], fn ($value) => $value !== null && $value !== ''));

        if (array_key_exists('estimated_delivery_from', $data)) {
            $shipment->estimated_delivery_from = $data['estimated_delivery_from'];
        }
        if (array_key_exists('estimated_delivery_to', $data)) {
            $shipment->estimated_delivery_to = $data['estimated_delivery_to'];
        }
        if (! empty($data['delivery_method_id'])) {
            $shipment->delivery_method_id = (int) $data['delivery_method_id'];
        }

        $status = $data['status'] ?? null;
        if ($status && $status !== $previousStatus) {
            $shipment->status = $status;
            if ($status === Shipment::STATUS_DELIVERED) {
                $shipment->delivered_at = now();
            }
            if (in_array($status, [Shipment::STATUS_IN_TRANSIT, Shipment::STATUS_PICKED_UP], true) && ! $shipment->dispatched_at) {
                $shipment->dispatched_at = now();
            }
        }

        // Derive a tracking URL from the method template when possible.
        if ($shipment->tracking_number && ! $shipment->tracking_url && $shipment->delivery_method_id) {
            $method = DeliveryMethod::withoutGlobalScopes()->find($shipment->delivery_method_id);
            $url = $method?->trackingUrlFor($shipment->tracking_number);
            if ($url) {
                $shipment->tracking_url = $url;
            }
        }

        $shipment->save();

        if ($status && $status !== $previousStatus) {
            $this->recordEvent(
                $shipment,
                $status,
                $data['event_description'] ?? (Shipment::STATUS_LABELS[$status] ?? ucfirst(str_replace('_', ' ', $status))),
                $data['location'] ?? null,
                $actorId,
            );
        }

        return $shipment->fresh(['events']);
    }

    public function recordEvent(Shipment $shipment, string $status, string $description, ?string $location = null, ?int $actorId = null): ShipmentEvent
    {
        return ShipmentEvent::query()->create([
            'shipment_id' => $shipment->id,
            'status' => $status,
            'description' => $description,
            'location' => $location,
            'recorded_by_user_id' => $actorId,
            'happened_at' => now(),
        ]);
    }

    public function reference(): string
    {
        return 'SHP-'.strtoupper(Str::random(10));
    }

    public function formatAddress(Address $address): string
    {
        return collect([
            $address->line1,
            $address->line2,
            $address->city,
            $address->state,
            $address->postal_code,
            $address->country,
        ])->filter()->implode(', ');
    }

    protected function withoutTenantScope(callable $callback): mixed
    {
        $bypassed = TenantContext::isBypassed();
        TenantContext::bypass(true);
        try {
            return $callback();
        } finally {
            TenantContext::bypass($bypassed);
        }
    }

    protected function money(string|float|int|null $value): string
    {
        return number_format((float) ($value ?? 0), 2, '.', '');
    }
}
