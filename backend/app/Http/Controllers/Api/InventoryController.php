<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Models\Store;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Tenant stock control.
 *
 * The inventory workspace needs more than a flat "low stock" list: it is the
 * screen a merchant uses to receive deliveries, correct counts, write off
 * damage, move stock between locations and spot perishables that are about to
 * expire. Every write goes through {@see applyMovement()} so the stock ledger
 * always explains the current balance.
 */
class InventoryController extends Controller
{
    /** Sort keys the grid may use, mapped to SQL expressions. */
    protected const SORTS = [
        'available_asc' => ['available', 'asc'],
        'available_desc' => ['available', 'desc'],
        'value_desc' => ['retail_value', 'desc'],
        'name_asc' => ['product_name', 'asc'],
        'name_desc' => ['product_name', 'desc'],
        'updated_desc' => ['inventories.updated_at', 'desc'],
        'expiry_asc' => ['inventories.expires_at', 'asc'],
    ];

    // ------------------------------------------------------------- reading

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        $base = $this->baseQuery($request);

        $list = (clone $base)->with(['variant.product.images', 'variant.product.store']);
        $this->applyStateFilter($list, $request->string('state')->toString());

        [$column, $direction] = self::SORTS[$request->string('sort', 'available_asc')->toString()]
            ?? self::SORTS['available_asc'];
        $list->orderBy($column, $direction)->orderBy('inventories.id');

        $perPage = min(100, max(5, $request->integer('per_page', 20)));
        $page = $list->paginate($perPage);

        return response()->json([
            'data' => collect($page->items())->map(fn (Inventory $row) => $this->present($row))->all(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
            'stats' => $this->buildStats(clone $base),
            'filters' => $this->filterOptions(),
        ]);
    }

    /** Stores, locations and movement types used by the workspace toolbar. */
    public function meta(): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        return response()->json([
            'data' => $this->filterOptions() + [
                'movement_types' => StockMovement::TYPES,
            ],
        ]);
    }

    /** Ledger feed — all recent movements, or the history of one variant. */
    public function movements(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        $query = StockMovement::query()
            ->with(['variant.product:id,name,store_id', 'user:id,name'])
            ->latest('id');

        if ($request->filled('variant_id')) {
            $query->where('variant_id', $request->integer('variant_id'));
        }
        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        $movements = $query->limit(min(200, max(5, $request->integer('limit', 40))))->get();

        return response()->json([
            'data' => $movements->map(fn (StockMovement $m) => [
                'id' => $m->id,
                'type' => $m->type,
                'quantity' => $m->quantity,
                'quantity_before' => $m->quantity_before,
                'quantity_after' => $m->quantity_after,
                'reference' => $m->reference,
                'location' => $m->location,
                'note' => $m->note,
                'created_at' => $m->created_at?->toIso8601String(),
                'actor' => $m->user?->name,
                'variant_id' => $m->variant_id,
                'sku' => $m->variant?->sku,
                'product_name' => $m->variant?->product?->name,
            ])->all(),
        ]);
    }

    public function lowStock(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        $rows = $this->baseQuery($request)
            ->with(['variant.product.images', 'variant.product.store'])
            ->whereRaw('(inventories.quantity - inventories.reserved) <= inventories.low_stock_threshold')
            ->orderBy('available')
            ->limit(200)
            ->get();

        return response()->json(['data' => $rows->map(fn (Inventory $row) => $this->present($row))->all()]);
    }

    public function show(ProductVariant $variant): JsonResponse
    {
        $variant->load('product');
        $this->authorize('view', $variant->product);
        $inventory = $variant->inventory;
        abort_unless($inventory, 404);

        return response()->json(['data' => $inventory]);
    }

    // ------------------------------------------------------------- writing

    /** Legacy direct edit kept for the product editor; now ledger-backed. */
    public function update(Request $request, ProductVariant $variant): JsonResponse
    {
        $variant->load('product');
        $this->authorize('update', $variant->product);
        $data = $request->validate([
            'quantity' => ['sometimes', 'integer', 'min:0'],
            'low_stock_threshold' => ['sometimes', 'integer', 'min:0'],
            'adjustment' => ['nullable', 'integer'],
        ]);

        $inventory = $variant->inventory;
        abort_unless($inventory, 404);

        if (isset($data['adjustment']) && (int) $data['adjustment'] !== 0) {
            $this->applyMovement($inventory, StockMovement::TYPE_ADJUSTMENT, (int) $data['adjustment'], [
                'note' => 'Adjusted from the product editor',
            ]);
        }
        if (isset($data['quantity'])) {
            $this->applyMovement($inventory, StockMovement::TYPE_COUNT, (int) $data['quantity'] - (int) $inventory->quantity, [
                'note' => 'Counted from the product editor',
            ]);
        }
        if (isset($data['low_stock_threshold'])) {
            $inventory->low_stock_threshold = $data['low_stock_threshold'];
            $inventory->version = (int) $inventory->version + 1;
            $inventory->save();
        }

        return response()->json(['data' => $inventory->fresh()]);
    }

    /**
     * Receive, adjust, count, write off or relocate a single stock line.
     *
     * `receipt`, `adjustment`, `damage` and `return` take a signed delta;
     * `count` takes the counted quantity and books the difference.
     */
    public function adjust(Request $request, Inventory $inventory): JsonResponse
    {
        $this->authorizeInventory($inventory, 'update');

        $data = $request->validate([
            'type' => ['required', Rule::in(StockMovement::TYPES)],
            'quantity' => ['required', 'integer'],
            'reference' => ['nullable', 'string', 'max:64'],
            'note' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:64'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'batch_reference' => ['nullable', 'string', 'max:64'],
            'expires_at' => ['nullable', 'date'],
        ]);

        $type = $data['type'];
        $delta = (int) $data['quantity'];
        if ($type === StockMovement::TYPE_COUNT) {
            abort_if($delta < 0, 422, 'A stock count cannot be negative.');
            $delta -= (int) $inventory->quantity;
        }
        if (in_array($type, [StockMovement::TYPE_DAMAGE], true)) {
            $delta = -abs($delta);
        }
        if (in_array($type, [StockMovement::TYPE_RECEIPT, StockMovement::TYPE_RETURN], true)) {
            $delta = abs($delta);
        }

        foreach (['low_stock_threshold', 'batch_reference', 'expires_at'] as $field) {
            if (array_key_exists($field, $data) && $data[$field] !== null) {
                $inventory->{$field} = $data[$field];
            }
        }
        if (! empty($data['location'])) {
            $inventory->location = $data['location'];
        }

        $movement = $this->applyMovement($inventory, $type, $delta, [
            'reference' => $data['reference'] ?? null,
            'note' => $data['note'] ?? null,
            'location' => $data['location'] ?? $inventory->location,
            'unit_cost' => $data['unit_cost'] ?? null,
        ]);

        $fresh = Inventory::query()
            ->with(['variant.product.images', 'variant.product.store'])
            ->findOrFail($inventory->id);

        return response()->json([
            'data' => $this->present($fresh),
            'movement_id' => $movement?->id,
        ]);
    }

    /**
     * Bulk actions from the grid: restock to a level, apply a delta, set a
     * reorder threshold or move several lines to another location.
     */
    public function bulk(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
            'action' => ['required', Rule::in(['receive', 'adjust', 'restock_to', 'set_threshold', 'relocate'])],
            'quantity' => ['nullable', 'integer'],
            'location' => ['nullable', 'string', 'max:64'],
            'note' => ['nullable', 'string', 'max:255'],
            'reference' => ['nullable', 'string', 'max:64'],
        ]);

        $rows = Inventory::query()->whereIn('id', $data['ids'])->get();
        $affected = 0;

        foreach ($rows as $inventory) {
            switch ($data['action']) {
                case 'receive':
                    $this->applyMovement($inventory, StockMovement::TYPE_RECEIPT, abs((int) ($data['quantity'] ?? 0)), [
                        'note' => $data['note'] ?? 'Bulk receipt',
                        'reference' => $data['reference'] ?? null,
                    ]);
                    break;
                case 'adjust':
                    $this->applyMovement($inventory, StockMovement::TYPE_ADJUSTMENT, (int) ($data['quantity'] ?? 0), [
                        'note' => $data['note'] ?? 'Bulk adjustment',
                        'reference' => $data['reference'] ?? null,
                    ]);
                    break;
                case 'restock_to':
                    $target = max(0, (int) ($data['quantity'] ?? 0));
                    $this->applyMovement($inventory, StockMovement::TYPE_COUNT, $target - (int) $inventory->quantity, [
                        'note' => $data['note'] ?? 'Bulk restock to target level',
                    ]);
                    break;
                case 'set_threshold':
                    $inventory->low_stock_threshold = max(0, (int) ($data['quantity'] ?? 0));
                    $inventory->save();
                    break;
                case 'relocate':
                    $inventory->location = $data['location'] ?: null;
                    $inventory->save();
                    break;
            }
            $affected++;
        }

        return response()->json(['data' => ['affected' => $affected]]);
    }

    // ------------------------------------------------------------- helpers

    /** Joined, tenant-scoped query with the derived columns the grid sorts on. */
    protected function baseQuery(Request $request): Builder
    {
        $query = Inventory::query()
            ->join('product_variants as v', 'v.id', '=', 'inventories.variant_id')
            ->join('products as p', 'p.id', '=', 'v.product_id')
            ->leftJoin('stores as s', 's.id', '=', 'p.store_id')
            ->select([
                'inventories.*',
                'p.name as product_name',
                DB::raw('(inventories.quantity - inventories.reserved) as available'),
                DB::raw('(inventories.quantity * coalesce(v.price_override, p.price)) as retail_value'),
                DB::raw('(inventories.quantity * coalesce(v.cost_price, p.cost_price, 0)) as cost_value'),
            ]);

        if ($search = trim((string) $request->string('q'))) {
            $like = '%'.$search.'%';
            $query->where(function (Builder $q) use ($like) {
                $q->where('p.name', 'like', $like)
                    ->orWhere('v.sku', 'like', $like)
                    ->orWhere('v.barcode', 'like', $like)
                    ->orWhere('p.brand', 'like', $like)
                    ->orWhere('inventories.batch_reference', 'like', $like)
                    ->orWhere('inventories.location', 'like', $like);
            });
        }
        if ($request->filled('store_id')) {
            $query->where('p.store_id', $request->integer('store_id'));
        }
        if ($request->filled('location')) {
            $query->where('inventories.location', $request->string('location'));
        }
        if ($request->boolean('tracked_only')) {
            $query->where('p.track_inventory', true);
        }

        return $query;
    }

    protected function applyStateFilter(Builder $query, string $state): void
    {
        match ($state) {
            'out_of_stock' => $query->whereRaw('(inventories.quantity - inventories.reserved) <= 0'),
            'low_stock' => $query->whereRaw('(inventories.quantity - inventories.reserved) > 0')
                ->whereRaw('(inventories.quantity - inventories.reserved) <= inventories.low_stock_threshold'),
            'in_stock' => $query->whereRaw('(inventories.quantity - inventories.reserved) > inventories.low_stock_threshold'),
            'reserved' => $query->where('inventories.reserved', '>', 0),
            'expiring' => $query->whereNotNull('inventories.expires_at')
                ->whereDate('inventories.expires_at', '<=', now()->addDays(30)->toDateString()),
            default => null,
        };
    }

    protected function buildStats(Builder $base): array
    {
        $row = (clone $base)->reorder()->toBase()->select(DB::raw(
            'count(*) as sku_count,'.
            'coalesce(sum(inventories.quantity),0) as units_on_hand,'.
            'coalesce(sum(inventories.reserved),0) as units_reserved,'.
            'coalesce(sum(inventories.quantity - inventories.reserved),0) as units_available,'.
            'coalesce(sum(inventories.quantity * coalesce(v.price_override, p.price)),0) as retail_value,'.
            'coalesce(sum(inventories.quantity * coalesce(v.cost_price, p.cost_price, 0)),0) as cost_value,'.
            'sum(case when (inventories.quantity - inventories.reserved) <= 0 then 1 else 0 end) as out_of_stock_count,'.
            'sum(case when (inventories.quantity - inventories.reserved) > 0 '.
            'and (inventories.quantity - inventories.reserved) <= inventories.low_stock_threshold then 1 else 0 end) as low_stock_count'
        ))->first();

        $expiring = (clone $base)->reorder()->toBase()
            ->whereNotNull('inventories.expires_at')
            ->whereDate('inventories.expires_at', '<=', now()->addDays(30)->toDateString())
            ->count();

        return [
            'sku_count' => (int) ($row->sku_count ?? 0),
            'units_on_hand' => (int) ($row->units_on_hand ?? 0),
            'units_reserved' => (int) ($row->units_reserved ?? 0),
            'units_available' => (int) ($row->units_available ?? 0),
            'retail_value' => round((float) ($row->retail_value ?? 0), 2),
            'cost_value' => round((float) ($row->cost_value ?? 0), 2),
            'low_stock_count' => (int) ($row->low_stock_count ?? 0),
            'out_of_stock_count' => (int) ($row->out_of_stock_count ?? 0),
            'expiring_count' => (int) $expiring,
            'healthy_count' => max(0, (int) ($row->sku_count ?? 0) - (int) ($row->low_stock_count ?? 0) - (int) ($row->out_of_stock_count ?? 0)),
        ];
    }

    protected function filterOptions(): array
    {
        return [
            'stores' => Store::query()->orderBy('name')->get(['id', 'name', 'currency'])->all(),
            'locations' => Inventory::query()
                ->whereNotNull('location')
                ->distinct()
                ->orderBy('location')
                ->pluck('location')
                ->values()
                ->all(),
        ];
    }

    /** Flatten an inventory row into the shape the workspace grid renders. */
    protected function present(Inventory $row): array
    {
        $variant = $row->variant;
        $product = $variant?->product;
        $available = $row->available();
        $threshold = (int) $row->low_stock_threshold;
        $price = (float) ($variant?->price_override ?? $product?->price ?? 0);
        $cost = (float) ($variant?->cost_price ?? $product?->cost_price ?? 0);

        $state = 'in_stock';
        if ($product && ! $product->track_inventory) {
            $state = 'untracked';
        } elseif ($available <= 0) {
            $state = $product?->allow_backorder ? 'backorder' : 'out_of_stock';
        } elseif ($available <= $threshold) {
            $state = 'low_stock';
        }

        $daysToExpiry = $row->expires_at ? now()->startOfDay()->diffInDays($row->expires_at, false) : null;

        return [
            'id' => $row->id,
            'variant_id' => $row->variant_id,
            'quantity' => (int) $row->quantity,
            'reserved' => (int) $row->reserved,
            'available' => $available,
            'low_stock_threshold' => $threshold,
            'reorder_suggestion' => max(0, ($threshold * 3) - $available),
            'location' => $row->location,
            'batch_reference' => $row->batch_reference,
            'expires_at' => $row->expires_at?->toDateString(),
            'days_to_expiry' => $daysToExpiry === null ? null : (int) $daysToExpiry,
            'state' => $state,
            'unit_price' => round($price, 2),
            'unit_cost' => round($cost, 2),
            'retail_value' => round($price * (int) $row->quantity, 2),
            'cost_value' => round($cost * (int) $row->quantity, 2),
            'updated_at' => $row->updated_at?->toIso8601String(),
            'variant' => $variant ? [
                'id' => $variant->id,
                'sku' => $variant->sku,
                'name' => $variant->name,
                'barcode' => $variant->barcode,
                'options' => $variant->options,
            ] : null,
            'product' => $product ? [
                'id' => $product->id,
                'name' => $product->name,
                'status' => $product->status,
                'unit' => $product->unit,
                'product_type' => $product->product_type,
                'track_inventory' => (bool) $product->track_inventory,
                'allow_backorder' => (bool) $product->allow_backorder,
                'is_perishable' => (bool) $product->is_perishable,
                'image' => $product->relationLoaded('images') ? $product->primaryImage()?->url : null,
            ] : null,
            'store' => $product?->store ? ['id' => $product->store->id, 'name' => $product->store->name] : null,
        ];
    }

    /** Mutate the balance and write the ledger entry in one transaction. */
    protected function applyMovement(Inventory $inventory, string $type, int $delta, array $attributes = []): ?StockMovement
    {
        if ($delta === 0 && $type !== StockMovement::TYPE_COUNT) {
            $inventory->save();

            return null;
        }

        return DB::transaction(function () use ($inventory, $type, $delta, $attributes) {
            $before = (int) $inventory->quantity;
            $after = max(0, $before + $delta);
            $inventory->quantity = $after;
            $inventory->version = (int) $inventory->version + 1;
            $inventory->save();

            return StockMovement::query()->create([
                'tenant_id' => $inventory->tenant_id,
                'inventory_id' => $inventory->id,
                'variant_id' => $inventory->variant_id,
                'user_id' => auth()->id(),
                'type' => $type,
                'quantity' => $after - $before,
                'quantity_before' => $before,
                'quantity_after' => $after,
                'reference' => $attributes['reference'] ?? null,
                'location' => $attributes['location'] ?? $inventory->location,
                'note' => $attributes['note'] ?? null,
                'unit_cost' => $attributes['unit_cost'] ?? null,
            ]);
        });
    }

    protected function authorizeInventory(Inventory $inventory, string $ability): void
    {
        $product = $inventory->variant?->product;
        abort_unless($product, 404);
        $this->authorize($ability, $product);
    }
}
