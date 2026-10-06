<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryMethod;
use App\Models\DeliveryZone;
use App\Models\SellerOrder;
use App\Models\Shipment;
use App\Models\ShipmentEvent;
use App\Models\Store;
use App\Services\Delivery\DeliveryService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * §16 / §22 #19 — delivery zones, pickup options, carriers and tracking.
 */
class DeliveryController extends Controller
{
    public function __construct(protected DeliveryService $delivery) {}

    /** Everything the seller's delivery settings screen needs in one call. */
    public function index(Request $request): JsonResponse
    {
        $tenantId = TenantContext::id();

        $zones = DeliveryZone::query()
            ->with(['methods' => fn ($q) => $q->orderBy('position')->orderBy('id')])
            ->where('tenant_id', $tenantId)
            ->orderBy('store_id')
            ->orderByDesc('priority')
            ->orderBy('id')
            ->get();

        // Methods that are not pinned to a zone apply store-wide.
        $looseMethods = DeliveryMethod::query()
            ->where('tenant_id', $tenantId)
            ->whereNull('delivery_zone_id')
            ->orderBy('position')
            ->get();

        return response()->json([
            'data' => [
                'stores' => Store::query()
                    ->where('tenant_id', $tenantId)
                    ->get(['id', 'name', 'slug', 'delivery_fee', 'delivery_days', 'country']),
                'zones' => $zones->map(fn (DeliveryZone $zone) => $this->presentZone($zone))->values(),
                'methods' => $looseMethods->map(fn (DeliveryMethod $m) => $this->presentMethod($m))->values(),
                'match_types' => DeliveryZone::MATCH_TYPES,
                'method_types' => DeliveryMethod::TYPES,
                'shipment_statuses' => Shipment::STATUSES,
                'status_labels' => Shipment::STATUS_LABELS,
            ],
        ]);
    }

    public function storeZone(Request $request): JsonResponse
    {
        $data = $this->zoneRules($request);
        if (! empty($data['store_id'])) {
            $this->assertStore((int) $data['store_id']);
        }

        $zone = DeliveryZone::query()->create([...$data, 'tenant_id' => TenantContext::id()]);
        $this->enforceSingleDefaultZone($zone);

        return response()->json(['data' => $this->presentZone($zone->fresh('methods'))], 201);
    }

    public function updateZone(Request $request, DeliveryZone $zone): JsonResponse
    {
        $this->assertOwned($zone->tenant_id);
        $zone->update($this->zoneRules($request, $zone));
        $this->enforceSingleDefaultZone($zone);

        return response()->json(['data' => $this->presentZone($zone->fresh('methods'))]);
    }

    public function destroyZone(DeliveryZone $zone): JsonResponse
    {
        $this->assertOwned($zone->tenant_id);
        $zone->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function storeMethod(Request $request): JsonResponse
    {
        $data = $this->methodRules($request);

        $storeId = $data['store_id'] ?? null;
        if (! empty($data['delivery_zone_id'])) {
            $zone = DeliveryZone::query()->findOrFail($data['delivery_zone_id']);
            $this->assertOwned($zone->tenant_id);
            $storeId = $storeId ?: $zone->store_id;
        }
        if ($storeId) {
            $this->assertStore((int) $storeId);
        }

        $method = DeliveryMethod::query()->create([
            ...$data,
            'tenant_id' => TenantContext::id(),
            'store_id' => $storeId,
        ]);

        return response()->json(['data' => $this->presentMethod($method)], 201);
    }

    public function updateMethod(Request $request, DeliveryMethod $method): JsonResponse
    {
        $this->assertOwned($method->tenant_id);
        $method->update($this->methodRules($request, $method));

        return response()->json(['data' => $this->presentMethod($method->fresh())]);
    }

    public function destroyMethod(DeliveryMethod $method): JsonResponse
    {
        $this->assertOwned($method->tenant_id);
        $method->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    /** The seller's shipment board. */
    public function shipments(Request $request): JsonResponse
    {
        $query = Shipment::query()
            ->with(['sellerOrder:id,order_id,store_id,status,grand_total,currency', 'method:id,name,type,carrier'])
            ->where('tenant_id', TenantContext::id());

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('store_id')) {
            $query->where('store_id', $request->integer('store_id'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('reference', 'like', $term)
                ->orWhere('tracking_number', 'like', $term)
                ->orWhere('recipient_name', 'like', $term));
        }

        $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (Shipment $s) => $this->presentShipment($s))->all(),
            'summary' => $this->shipmentSummary(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function showShipment(Shipment $shipment): JsonResponse
    {
        $this->assertOwned($shipment->tenant_id);
        $shipment->load(['events' => fn ($q) => $q->orderBy('happened_at')->orderBy('id'), 'method']);

        return response()->json(['data' => $this->presentShipment($shipment, true)]);
    }

    /** Create the shipment lazily for orders placed before delivery existed. */
    public function shipmentForOrder(SellerOrder $sellerOrder): JsonResponse
    {
        $this->assertOwned($sellerOrder->tenant_id);
        $shipment = $this->delivery->ensureShipment($sellerOrder);
        $shipment->load(['events' => fn ($q) => $q->orderBy('happened_at')->orderBy('id'), 'method']);

        return response()->json(['data' => $this->presentShipment($shipment, true)]);
    }

    public function updateShipment(Request $request, Shipment $shipment): JsonResponse
    {
        $this->assertOwned($shipment->tenant_id);

        $data = $request->validate([
            'status' => ['nullable', 'in:'.implode(',', Shipment::STATUSES)],
            'carrier' => ['nullable', 'string', 'max:120'],
            'service_level' => ['nullable', 'string', 'max:120'],
            'tracking_number' => ['nullable', 'string', 'max:160'],
            'tracking_url' => ['nullable', 'string', 'max:500'],
            'delivery_method_id' => ['nullable', 'integer', 'exists:delivery_methods,id'],
            'estimated_delivery_from' => ['nullable', 'date'],
            'estimated_delivery_to' => ['nullable', 'date', 'after_or_equal:estimated_delivery_from'],
            'recipient_name' => ['nullable', 'string', 'max:160'],
            'recipient_phone' => ['nullable', 'string', 'max:32'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'event_description' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:160'],
        ]);

        $updated = $this->delivery->updateShipment($shipment, $data, $request->user()->id);
        $updated->load(['events' => fn ($q) => $q->orderBy('happened_at')->orderBy('id'), 'method']);

        return response()->json(['data' => $this->presentShipment($updated, true)]);
    }

    /** Append a scan without changing the headline status. */
    public function addShipmentEvent(Request $request, Shipment $shipment): JsonResponse
    {
        $this->assertOwned($shipment->tenant_id);

        $data = $request->validate([
            'status' => ['required', 'in:'.implode(',', Shipment::STATUSES)],
            'description' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:160'],
        ]);

        $this->delivery->recordEvent(
            $shipment,
            $data['status'],
            $data['description'],
            $data['location'] ?? null,
            $request->user()->id,
        );

        $shipment->load(['events' => fn ($q) => $q->orderBy('happened_at')->orderBy('id'), 'method']);

        return response()->json(['data' => $this->presentShipment($shipment, true)], 201);
    }

    /** Customer-facing tracking lookup. */
    public function track(Request $request, string $reference): JsonResponse
    {
        TenantContext::bypass(true);
        try {
            $shipment = Shipment::withoutGlobalScopes()
                ->with([
                    'events' => fn ($q) => $q->orderBy('happened_at')->orderBy('id'),
                    'method',
                    'sellerOrder.order:id,user_id',
                    'store:id,name,slug',
                ])
                ->where(fn ($q) => $q->where('reference', $reference)->orWhere('tracking_number', $reference))
                ->firstOrFail();

            $owner = $shipment->sellerOrder?->order?->user_id;
            abort_unless($owner && (int) $owner === (int) $request->user()->id, 403, 'Not your shipment.');

            return response()->json(['data' => $this->presentShipment($shipment, true)]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    // ----------------------------------------------------------- internals

    protected function zoneRules(Request $request, ?DeliveryZone $zone = null): array
    {
        return $request->validate([
            'store_id' => ['nullable', 'integer', 'exists:stores,id'],
            'name' => [$zone ? 'sometimes' : 'required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:500'],
            'match_type' => [$zone ? 'sometimes' : 'required', 'in:'.implode(',', DeliveryZone::MATCH_TYPES)],
            'countries' => ['nullable', 'array'],
            'countries.*' => ['string', 'max:64'],
            'regions' => ['nullable', 'array'],
            'regions.*' => ['string', 'max:120'],
            'cities' => ['nullable', 'array'],
            'cities.*' => ['string', 'max:120'],
            'postcodes' => ['nullable', 'array'],
            'postcodes.*' => ['string', 'max:24'],
            'base_fee' => ['nullable', 'numeric', 'min:0'],
            'per_item_fee' => ['nullable', 'numeric', 'min:0'],
            'per_kg_fee' => ['nullable', 'numeric', 'min:0'],
            'free_over' => ['nullable', 'numeric', 'min:0'],
            'min_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'max_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'priority' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_default' => ['nullable', 'boolean'],
            'status' => ['nullable', 'in:active,inactive'],
        ]);
    }

    protected function methodRules(Request $request, ?DeliveryMethod $method = null): array
    {
        return $request->validate([
            'delivery_zone_id' => ['nullable', 'integer', 'exists:delivery_zones,id'],
            'store_id' => ['nullable', 'integer', 'exists:stores,id'],
            'name' => [$method ? 'sometimes' : 'required', 'string', 'max:160'],
            'type' => [$method ? 'sometimes' : 'required', 'in:'.implode(',', DeliveryMethod::TYPES)],
            'carrier' => ['nullable', 'string', 'max:120'],
            'service_level' => ['nullable', 'string', 'max:120'],
            'fee' => ['nullable', 'numeric', 'min:0'],
            'free_over' => ['nullable', 'numeric', 'min:0'],
            'min_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'max_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'pickup_address' => ['nullable', 'string', 'max:255'],
            'pickup_hours' => ['nullable', 'string', 'max:255'],
            'instructions' => ['nullable', 'string', 'max:1000'],
            'tracking_url_template' => ['nullable', 'string', 'max:500'],
            'is_default' => ['nullable', 'boolean'],
            'status' => ['nullable', 'in:active,inactive'],
            'position' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    protected function assertStore(int $storeId): void
    {
        Store::query()->where('tenant_id', TenantContext::id())->findOrFail($storeId);
    }

    protected function assertOwned(?int $tenantId): void
    {
        abort_unless($tenantId !== null && (int) $tenantId === (int) TenantContext::id(), 403, 'Not your workspace.');
    }

    protected function enforceSingleDefaultZone(DeliveryZone $zone): void
    {
        if (! $zone->is_default) {
            return;
        }
        DeliveryZone::query()
            ->where('store_id', $zone->store_id)
            ->whereKeyNot($zone->id)
            ->update(['is_default' => false]);
    }

    protected function shipmentSummary(): array
    {
        $base = Shipment::query()->where('tenant_id', TenantContext::id());

        return [
            'total' => (clone $base)->count(),
            'awaiting_dispatch' => (clone $base)->whereIn('status', [
                Shipment::STATUS_PENDING, Shipment::STATUS_READY_FOR_PICKUP,
            ])->count(),
            'in_transit' => (clone $base)->whereIn('status', [
                Shipment::STATUS_PICKED_UP, Shipment::STATUS_IN_TRANSIT, Shipment::STATUS_OUT_FOR_DELIVERY,
            ])->count(),
            'delivered' => (clone $base)->where('status', Shipment::STATUS_DELIVERED)->count(),
            'problem' => (clone $base)->whereIn('status', [Shipment::STATUS_FAILED, Shipment::STATUS_RETURNED])->count(),
        ];
    }

    protected function presentZone(DeliveryZone $zone): array
    {
        return [
            'id' => $zone->id,
            'store_id' => $zone->store_id,
            'name' => $zone->name,
            'description' => $zone->description,
            'match_type' => $zone->match_type,
            'countries' => $zone->countries ?? [],
            'regions' => $zone->regions ?? [],
            'cities' => $zone->cities ?? [],
            'postcodes' => $zone->postcodes ?? [],
            'base_fee' => (string) $zone->base_fee,
            'per_item_fee' => (string) $zone->per_item_fee,
            'per_kg_fee' => (string) $zone->per_kg_fee,
            'free_over' => $zone->free_over !== null ? (string) $zone->free_over : null,
            'min_days' => (int) $zone->min_days,
            'max_days' => (int) $zone->max_days,
            'priority' => (int) $zone->priority,
            'is_default' => (bool) $zone->is_default,
            'status' => $zone->status,
            'methods' => $zone->relationLoaded('methods')
                ? $zone->methods->map(fn (DeliveryMethod $m) => $this->presentMethod($m))->values()
                : [],
        ];
    }

    protected function presentMethod(DeliveryMethod $method): array
    {
        return [
            'id' => $method->id,
            'delivery_zone_id' => $method->delivery_zone_id,
            'store_id' => $method->store_id,
            'name' => $method->name,
            'type' => $method->type,
            'carrier' => $method->carrier,
            'service_level' => $method->service_level,
            'fee' => (string) $method->fee,
            'free_over' => $method->free_over !== null ? (string) $method->free_over : null,
            'min_days' => (int) $method->min_days,
            'max_days' => (int) $method->max_days,
            'pickup_address' => $method->pickup_address,
            'pickup_hours' => $method->pickup_hours,
            'instructions' => $method->instructions,
            'tracking_url_template' => $method->tracking_url_template,
            'is_default' => (bool) $method->is_default,
            'status' => $method->status,
            'position' => (int) $method->position,
        ];
    }

    protected function presentShipment(Shipment $shipment, bool $detailed = false): array
    {
        $payload = [
            'id' => $shipment->id,
            'reference' => $shipment->reference,
            'seller_order_id' => $shipment->seller_order_id,
            'order_id' => $shipment->sellerOrder?->order_id,
            'store_id' => $shipment->store_id,
            'status' => $shipment->status,
            'status_label' => $shipment->status_label,
            'type' => $shipment->type,
            'carrier' => $shipment->carrier,
            'service_level' => $shipment->service_level,
            'tracking_number' => $shipment->tracking_number,
            'tracking_url' => $shipment->tracking_url,
            'cost' => (string) $shipment->cost,
            'recipient_name' => $shipment->recipient_name,
            'recipient_phone' => $shipment->recipient_phone,
            'destination' => $shipment->destination,
            'estimated_delivery_from' => $shipment->estimated_delivery_from?->toDateString(),
            'estimated_delivery_to' => $shipment->estimated_delivery_to?->toDateString(),
            'dispatched_at' => $shipment->dispatched_at,
            'delivered_at' => $shipment->delivered_at,
            'created_at' => $shipment->created_at,
            'method' => $shipment->relationLoaded('method') && $shipment->method ? [
                'id' => $shipment->method->id,
                'name' => $shipment->method->name,
                'type' => $shipment->method->type,
                'carrier' => $shipment->method->carrier,
            ] : null,
            'store' => $shipment->relationLoaded('store') && $shipment->store ? [
                'id' => $shipment->store->id,
                'name' => $shipment->store->name,
                'slug' => $shipment->store->slug,
            ] : null,
        ];

        if ($detailed) {
            $payload['notes'] = $shipment->notes;
            $payload['events'] = $shipment->relationLoaded('events')
                ? $shipment->events->map(fn (ShipmentEvent $event) => [
                    'id' => $event->id,
                    'status' => $event->status,
                    'description' => $event->description,
                    'location' => $event->location,
                    'happened_at' => $event->happened_at,
                ])->values()
                : [];
        }

        return $payload;
    }
}
