<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\PlatformSetting;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Services\Notifications\NotificationService;
use App\Support\ProductCatalog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Tenant catalog API.
 *
 * One endpoint family has to serve very different goods — a dress with
 * size/colour variants, mangoes sold by the kilo with a shelf life, a laptop
 * with a warranty, a downloadable template, a tailoring service. The shape is
 * kept uniform (product → variants → inventory) while the vertical-specific
 * data lives in `specs`/`option_schema`, described by App\Support\ProductCatalog.
 */
class ProductController extends Controller
{
    /** Columns safe to sort the catalog by. */
    protected const SORTABLE_COLUMNS = ['id', 'name', 'price', 'created_at', 'updated_at', 'status'];

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        // Everything except `status` and the stock filter, so tab counts stay
        // truthful while a tab is active.
        $base = Product::query();
        $this->applyCommonFilters($base, $request);

        $list = (clone $base)->with(['images', 'variants.inventory', 'category', 'store']);
        if ($request->filled('status')) {
            $list->where('status', $request->string('status'));
        }
        $this->applyStockFilter($list, $request->string('stock')->toString());

        $sortBy = $request->string('sort_by', 'created_at')->toString();
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'created_at';
        $sortDir = strtolower($request->string('sort_dir', 'desc')->toString()) === 'asc' ? 'asc' : 'desc';
        $list->orderBy($sortBy, $sortDir);
        if ($sortBy !== 'id') {
            $list->orderByDesc('id');
        }

        $perPage = min(100, max(1, $request->integer('per_page', 15)));
        $page = $list->paginate($perPage);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
            'stats' => $this->buildStats(clone $base),
        ]);
    }

    /**
     * Everything the product editor needs to render itself: stores, category
     * tree, catalog presets with their spec schemas, units and enums.
     */
    public function meta(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        $stores = Store::query()
            ->withCount('products')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'status', 'currency', 'country']);

        $categories = Category::query()->orderBy('name')->get(['id', 'name', 'slug', 'parent_id']);

        $tags = Product::query()
            ->whereNotNull('tags')
            ->pluck('tags')
            ->flatMap(fn ($t) => is_array($t) ? $t : [])
            ->unique()
            ->sort()
            ->values();

        $brands = Product::query()
            ->whereNotNull('brand')
            ->distinct()
            ->orderBy('brand')
            ->pluck('brand')
            ->values();

        return response()->json([
            'data' => [
                'stores' => $stores,
                'categories' => $categories,
                'presets' => ProductCatalog::presets(),
                'units' => ProductCatalog::UNITS,
                'types' => ProductCatalog::TYPES,
                'conditions' => ProductCatalog::CONDITIONS,
                'storage_requirements' => ProductCatalog::STORAGE_REQUIREMENTS,
                'statuses' => [Product::STATUS_DRAFT, Product::STATUS_ACTIVE, Product::STATUS_ARCHIVED],
                'tags' => $tags,
                'brands' => $brands,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Product::class);
        $tenantId = $request->user()->tenantId();
        $data = $request->validate($this->rules($tenantId, creating: true));

        // §7 — when the platform moderates listings, new products queue for
        // approval instead of appearing on the storefront straight away.
        $moderates = filter_var(PlatformSetting::get('moderate_new_products', false) ?? false, FILTER_VALIDATE_BOOL);

        $product = DB::transaction(function () use ($data, $request, $moderates) {
            $product = Product::query()->create([
                ...$this->productAttributes($data, null),
                'moderation_status' => $moderates ? Product::MODERATION_PENDING : Product::MODERATION_APPROVED,
            ]);
            $this->syncVariants($product, $data['variants'] ?? null, $data, creating: true);
            $this->syncImageUrls($product, $data['image_urls'] ?? null);
            $this->applyPublishedAt($product);

            return $product;
        });

        if ($moderates) {
            app(NotificationService::class)->toAdmins('catalog', 'Listing awaiting approval', [
                'body' => '"'.$product->name.'" needs a moderation decision.',
                'action_url' => '/admin/catalog',
                'action_label' => 'Moderate catalog',
                'subject_type' => Product::class,
                'subject_id' => $product->id,
            ]);
        }

        return response()->json(['data' => $this->fresh($product)], 201);
    }

    public function show(Product $product): JsonResponse
    {
        $this->authorize('view', $product);

        return response()->json(['data' => $this->fresh($product)]);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);
        $tenantId = $request->user()->tenantId() ?? $product->tenant_id;
        $data = $request->validate($this->rules($tenantId, creating: false));

        DB::transaction(function () use ($product, $data) {
            $product->update($this->productAttributes($data, $product));
            if (array_key_exists('variants', $data)) {
                $this->syncVariants($product, $data['variants'], $data, creating: false);
            }
            if (array_key_exists('image_urls', $data)) {
                $this->syncImageUrls($product, $data['image_urls']);
            }
            $this->applyPublishedAt($product);
        });

        return response()->json(['data' => $this->fresh($product)]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->authorize('delete', $product);

        // Variants referenced by an order cannot be removed (restrictOnDelete),
        // so the product is archived instead of silently 500-ing.
        if ($this->hasSalesHistory($product)) {
            $product->update(['status' => Product::STATUS_ARCHIVED]);

            return response()->json([
                'data' => ['ok' => true, 'archived' => true],
                'message' => 'This product has order history, so it was archived instead of deleted.',
            ]);
        }

        $product->delete();

        return response()->json(['data' => ['ok' => true, 'archived' => false]]);
    }

    /** Clone a listing — the fastest way to add the next colourway or pack size. */
    public function duplicate(Request $request, Product $product): JsonResponse
    {
        $this->authorize('create', Product::class);
        $this->authorize('view', $product);
        $product->load(['variants.inventory', 'images']);

        $copy = DB::transaction(function () use ($product, $request) {
            $attributes = $product->only(array_diff($product->getFillable(), ['slug', 'published_at']));
            $name = $request->string('name')->toString() ?: $product->name.' (copy)';
            $copy = Product::query()->create(array_merge($attributes, [
                'name' => $name,
                'slug' => $this->uniqueSlug($name, (int) $product->store_id),
                'status' => Product::STATUS_DRAFT,
                'is_featured' => false,
                'published_at' => null,
            ]));

            foreach ($product->variants as $index => $variant) {
                $new = ProductVariant::query()->create([
                    'product_id' => $copy->id,
                    'tenant_id' => $copy->tenant_id,
                    'sku' => $this->uniqueSku($variant->sku.'-COPY'),
                    'name' => $variant->name,
                    'options' => $variant->options,
                    'price_override' => $variant->price_override,
                    'cost_price' => $variant->cost_price,
                    'weight' => $variant->weight,
                    'status' => $variant->status,
                    'position' => $index,
                ]);
                Inventory::query()->create([
                    'tenant_id' => $copy->tenant_id,
                    'variant_id' => $new->id,
                    'quantity' => 0,
                    'reserved' => 0,
                    'low_stock_threshold' => $variant->inventory?->low_stock_threshold ?? $copy->low_stock_threshold,
                ]);
            }

            foreach ($product->images as $image) {
                ProductImage::query()->create([
                    'tenant_id' => $copy->tenant_id,
                    'product_id' => $copy->id,
                    'path' => $image->path,
                    'position' => $image->position,
                    'is_primary' => $image->is_primary,
                ]);
            }

            return $copy;
        });

        return response()->json(['data' => $this->fresh($copy)], 201);
    }

    /** Bulk merchandising actions from the catalog table's selection bar. */
    public function bulk(Request $request): JsonResponse
    {
        $this->authorize('create', Product::class);
        $tenantId = $request->user()->tenantId();
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
            'action' => ['required', Rule::in(['activate', 'draft', 'archive', 'delete', 'feature', 'unfeature', 'category', 'price_adjust', 'tag'])],
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('tenant_id', $tenantId)],
            'percent' => ['nullable', 'numeric', 'between:-90,500'],
            'tag' => ['nullable', 'string', 'max:40'],
        ]);

        $products = Product::query()->whereIn('id', $data['ids'])->get();
        $affected = 0;
        $archivedInstead = 0;

        foreach ($products as $product) {
            if (! $request->user()->can('update', $product)) {
                continue;
            }

            switch ($data['action']) {
                case 'activate':
                    $product->update(['status' => Product::STATUS_ACTIVE]);
                    $this->applyPublishedAt($product);
                    break;
                case 'draft':
                    $product->update(['status' => Product::STATUS_DRAFT]);
                    break;
                case 'archive':
                    $product->update(['status' => Product::STATUS_ARCHIVED]);
                    break;
                case 'feature':
                    $product->update(['is_featured' => true]);
                    break;
                case 'unfeature':
                    $product->update(['is_featured' => false]);
                    break;
                case 'category':
                    $product->update(['category_id' => $data['category_id'] ?? null]);
                    break;
                case 'tag':
                    $tags = collect($product->tags ?? [])->push(Str::slug((string) ($data['tag'] ?? '')))
                        ->filter()->unique()->values()->all();
                    $product->update(['tags' => $tags]);
                    break;
                case 'price_adjust':
                    $percent = (float) ($data['percent'] ?? 0);
                    $product->update(['price' => max(0, round((float) $product->price * (1 + $percent / 100), 2))]);
                    break;
                case 'delete':
                    if (! $request->user()->can('delete', $product)) {
                        continue 2;
                    }
                    if ($this->hasSalesHistory($product)) {
                        $product->update(['status' => Product::STATUS_ARCHIVED]);
                        $archivedInstead++;
                    } else {
                        $product->delete();
                    }
                    break;
            }
            $affected++;
        }

        return response()->json([
            'data' => ['affected' => $affected, 'archived_instead' => $archivedInstead],
        ]);
    }

    // ------------------------------------------------------------- variants

    public function storeVariant(Request $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);
        $data = $request->validate([
            'sku' => ['required', 'string', 'max:64'],
            'name' => ['nullable', 'string', 'max:120'],
            'options' => ['nullable', 'array'],
            'price_override' => ['nullable', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'barcode' => ['nullable', 'string', 'max:64'],
            'quantity' => ['nullable', 'integer', 'min:0'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ]);
        $variant = ProductVariant::query()->create([
            'product_id' => $product->id,
            'tenant_id' => $product->tenant_id,
            'sku' => $this->uniqueSku($data['sku']),
            'name' => $data['name'] ?? null,
            'options' => $data['options'] ?? [],
            'price_override' => $data['price_override'] ?? null,
            'cost_price' => $data['cost_price'] ?? null,
            'weight' => $data['weight'] ?? null,
            'barcode' => $data['barcode'] ?? null,
            'status' => $data['status'] ?? ProductVariant::STATUS_ACTIVE,
            'position' => (int) $product->variants()->max('position') + 1,
        ]);
        Inventory::query()->create([
            'tenant_id' => $product->tenant_id,
            'variant_id' => $variant->id,
            'quantity' => $data['quantity'] ?? 0,
            'reserved' => 0,
            'low_stock_threshold' => $data['low_stock_threshold'] ?? $product->low_stock_threshold ?? 5,
        ]);
        $product->update(['has_variants' => $product->variants()->count() > 1]);

        return response()->json(['data' => $variant->load('inventory')], 201);
    }

    public function updateVariant(Request $request, Product $product, ProductVariant $variant): JsonResponse
    {
        $this->authorize('update', $product);
        abort_unless((int) $variant->product_id === (int) $product->id, 404);
        $data = $request->validate([
            'sku' => ['sometimes', 'string', 'max:64'],
            'name' => ['nullable', 'string', 'max:120'],
            'options' => ['nullable', 'array'],
            'price_override' => ['nullable', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'barcode' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ]);
        $variant->update($data);

        return response()->json(['data' => $variant->fresh('inventory')]);
    }

    public function destroyVariant(Product $product, ProductVariant $variant): JsonResponse
    {
        $this->authorize('update', $product);
        abort_unless((int) $variant->product_id === (int) $product->id, 404);

        if ($this->variantHasSales($variant)) {
            $variant->update(['status' => ProductVariant::STATUS_INACTIVE]);

            return response()->json([
                'data' => ['ok' => true, 'deactivated' => true],
                'message' => 'Variant has order history, so it was deactivated instead of deleted.',
            ]);
        }

        $variant->delete();
        $product->update(['has_variants' => $product->variants()->count() > 1]);

        return response()->json(['data' => ['ok' => true, 'deactivated' => false]]);
    }

    // --------------------------------------------------------------- images

    public function storeImage(Request $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);
        $request->validate([
            'image' => ['required', 'file', 'image', 'max:5120'],
            'is_primary' => ['sometimes', 'boolean'],
        ]);
        $path = $request->file('image')->store('tenants/'.$product->tenant_id.'/products/'.$product->id, 'public');
        if ($request->boolean('is_primary')) {
            $product->images()->update(['is_primary' => false]);
        }
        $image = ProductImage::query()->create([
            'tenant_id' => $product->tenant_id,
            'product_id' => $product->id,
            'path' => $path,
            'position' => (int) $product->images()->max('position') + 1,
            'is_primary' => $request->boolean('is_primary') || $product->images()->count() === 0,
        ]);

        return response()->json(['data' => $image], 201);
    }

    public function destroyImage(Product $product, ProductImage $image): JsonResponse
    {
        $this->authorize('update', $product);
        abort_unless((int) $image->product_id === (int) $product->id, 404);
        $wasPrimary = (bool) $image->is_primary;
        $image->delete();
        if ($wasPrimary) {
            $product->images()->orderBy('position')->first()?->update(['is_primary' => true]);
        }

        return response()->json(['data' => ['ok' => true]]);
    }

    public function reorderImages(Request $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);
        $data = $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['integer'],
        ]);
        foreach ($data['order'] as $pos => $id) {
            ProductImage::query()->where('product_id', $product->id)->whereKey($id)->update(['position' => $pos]);
        }
        $product->images()->update(['is_primary' => false]);
        $product->images()->orderBy('position')->first()?->update(['is_primary' => true]);

        return response()->json(['data' => $product->fresh('images')->images]);
    }

    // -------------------------------------------------------------- helpers

    /**
     * @return array<string, mixed>
     */
    protected function rules(?int $tenantId, bool $creating): array
    {
        $required = $creating ? 'required' : 'sometimes';

        return [
            'store_id' => [$creating ? 'required' : 'sometimes', Rule::exists('stores', 'id')->where('tenant_id', $tenantId)],
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('tenant_id', $tenantId)],
            'name' => [$required, 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'short_description' => ['nullable', 'string', 'max:320'],
            'status' => ['nullable', Rule::in([Product::STATUS_DRAFT, Product::STATUS_ACTIVE, Product::STATUS_ARCHIVED])],
            'product_type' => ['nullable', Rule::in(ProductCatalog::TYPES)],
            'catalog_preset' => ['nullable', Rule::in(ProductCatalog::presetKeys())],

            'price' => [$required, 'numeric', 'min:0'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'tax_class' => ['nullable', 'string', 'max:32'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'brand' => ['nullable', 'string', 'max:255'],

            'unit' => ['nullable', Rule::in(ProductCatalog::unitValues())],
            'unit_amount' => ['nullable', 'numeric', 'min:0'],
            'min_order_qty' => ['nullable', 'integer', 'min:1'],
            'max_order_qty' => ['nullable', 'integer', 'min:1'],

            'track_inventory' => ['nullable', 'boolean'],
            'allow_backorder' => ['nullable', 'boolean'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'quantity' => ['nullable', 'integer', 'min:0'],

            'requires_shipping' => ['nullable', 'boolean'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'weight_unit' => ['nullable', 'string', 'max:8'],
            'length' => ['nullable', 'numeric', 'min:0'],
            'width' => ['nullable', 'numeric', 'min:0'],
            'height' => ['nullable', 'numeric', 'min:0'],
            'dimension_unit' => ['nullable', 'string', 'max:8'],

            'condition' => ['nullable', Rule::in(ProductCatalog::CONDITIONS)],
            'warranty_months' => ['nullable', 'integer', 'min:0', 'max:600'],
            'is_perishable' => ['nullable', 'boolean'],
            'shelf_life_days' => ['nullable', 'integer', 'min:0', 'max:3650'],
            'storage_requirement' => ['nullable', Rule::in(ProductCatalog::STORAGE_REQUIREMENTS)],
            'country_of_origin' => ['nullable', 'string', 'max:64'],
            'barcode' => ['nullable', 'string', 'max:64'],

            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:40'],
            'specs' => ['nullable', 'array'],
            'option_schema' => ['nullable', 'array'],
            'option_schema.*.name' => ['required_with:option_schema', 'string', 'max:40'],
            'option_schema.*.values' => ['nullable', 'array'],

            'is_featured' => ['nullable', 'boolean'],
            'has_variants' => ['nullable', 'boolean'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:320'],
            'sku' => ['nullable', 'string', 'max:64'],

            'variants' => ['nullable', 'array'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.sku' => ['nullable', 'string', 'max:64'],
            'variants.*.name' => ['nullable', 'string', 'max:120'],
            'variants.*.options' => ['nullable', 'array'],
            'variants.*.price_override' => ['nullable', 'numeric', 'min:0'],
            'variants.*.cost_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.barcode' => ['nullable', 'string', 'max:64'],
            'variants.*.weight' => ['nullable', 'numeric', 'min:0'],
            'variants.*.quantity' => ['nullable', 'integer', 'min:0'],
            'variants.*.low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'variants.*.batch_reference' => ['nullable', 'string', 'max:64'],
            'variants.*.expires_at' => ['nullable', 'date'],
            'variants.*.location' => ['nullable', 'string', 'max:64'],
            'variants.*.status' => ['nullable', Rule::in(['active', 'inactive'])],

            'image_urls' => ['nullable', 'array'],
            'image_urls.*' => ['string', 'max:2048'],
        ];
    }

    /**
     * Map the validated payload onto product columns, applying the preset
     * defaults for anything the client left out on create.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function productAttributes(array $data, ?Product $existing): array
    {
        $preset = ProductCatalog::preset($data['catalog_preset'] ?? $existing?->catalog_preset ?? 'general');
        $defaults = $preset['defaults'] ?? [];

        $columns = [
            'store_id', 'category_id', 'name', 'description', 'short_description', 'status',
            'product_type', 'catalog_preset', 'price', 'compare_at_price', 'cost_price', 'tax_class', 'tax_rate', 'brand',
            'unit', 'unit_amount', 'min_order_qty', 'max_order_qty',
            'track_inventory', 'allow_backorder', 'low_stock_threshold',
            'requires_shipping', 'weight', 'weight_unit', 'length', 'width', 'height', 'dimension_unit',
            'condition', 'warranty_months', 'is_perishable', 'shelf_life_days', 'storage_requirement',
            'country_of_origin', 'barcode', 'tags', 'specs', 'option_schema',
            'is_featured', 'seo_title', 'seo_description',
        ];

        $attributes = [];
        foreach ($columns as $column) {
            if (array_key_exists($column, $data)) {
                $attributes[$column] = $data[$column];
            } elseif (! $existing && array_key_exists($column, $defaults)) {
                $attributes[$column] = $defaults[$column];
            }
        }

        if (! $existing) {
            $attributes['status'] = $data['status'] ?? Product::STATUS_DRAFT;
            $attributes['catalog_preset'] = $data['catalog_preset'] ?? 'general';
            $attributes['slug'] = $this->uniqueSlug($data['slug'] ?? $data['name'], (int) $data['store_id']);
        } elseif (! empty($data['slug']) && $data['slug'] !== $existing->slug) {
            $attributes['slug'] = $this->uniqueSlug($data['slug'], (int) ($data['store_id'] ?? $existing->store_id), $existing->id);
        }

        // Non-shipped goods never need stock/shipping plumbing.
        $type = $attributes['product_type'] ?? $existing?->product_type ?? Product::TYPE_PHYSICAL;
        if ($type !== Product::TYPE_PHYSICAL && ! array_key_exists('requires_shipping', $data)) {
            $attributes['requires_shipping'] = false;
        }

        return $attributes;
    }

    /**
     * Create/update/remove variants to match the payload. When no variant
     * array is supplied on create we still make the implicit default variant,
     * because inventory and order items always hang off a variant.
     *
     * @param  array<int, array<string, mixed>>|null  $variants
     * @param  array<string, mixed>  $data
     */
    protected function syncVariants(Product $product, ?array $variants, array $data, bool $creating): void
    {
        $variants = array_values(array_filter($variants ?? [], fn ($v) => is_array($v)));

        if (! $variants) {
            if (! $creating) {
                return;
            }
            $variants = [[
                'sku' => $data['sku'] ?? null,
                'options' => ['default' => 'standard'],
                'quantity' => $data['quantity'] ?? 0,
                'low_stock_threshold' => $data['low_stock_threshold'] ?? null,
            ]];
        }

        $keep = [];
        foreach ($variants as $index => $row) {
            $options = is_array($row['options'] ?? null) ? $row['options'] : [];
            $label = $this->variantLabel($options, $row['name'] ?? null);
            $existing = ! empty($row['id'])
                ? $product->variants()->whereKey($row['id'])->first()
                : null;

            $attributes = [
                'name' => $label,
                'options' => $options ?: ['default' => 'standard'],
                'price_override' => $row['price_override'] ?? null,
                'cost_price' => $row['cost_price'] ?? null,
                'weight' => $row['weight'] ?? null,
                'barcode' => $row['barcode'] ?? null,
                'status' => $row['status'] ?? ProductVariant::STATUS_ACTIVE,
                'position' => $index,
            ];

            if ($existing) {
                $sku = $row['sku'] ?? $existing->sku;
                $existing->update($attributes + ['sku' => $this->uniqueSku($sku, $existing->id)]);
                $variant = $existing;
            } else {
                $sku = $row['sku'] ?: $this->generateSku($product->name, $label, $index);
                $variant = ProductVariant::query()->create($attributes + [
                    'product_id' => $product->id,
                    'tenant_id' => $product->tenant_id,
                    'sku' => $this->uniqueSku($sku),
                ]);
            }

            $inventory = $variant->inventory()->first() ?? new Inventory([
                'tenant_id' => $product->tenant_id,
                'variant_id' => $variant->id,
                'reserved' => 0,
            ]);
            $inventory->tenant_id = $product->tenant_id;
            $inventory->variant_id = $variant->id;
            if (array_key_exists('quantity', $row) && $row['quantity'] !== null) {
                $inventory->quantity = (int) $row['quantity'];
            }
            $inventory->low_stock_threshold = (int) ($row['low_stock_threshold']
                ?? $inventory->low_stock_threshold
                ?? $product->low_stock_threshold
                ?? 5);
            $inventory->batch_reference = $row['batch_reference'] ?? $inventory->batch_reference;
            $inventory->expires_at = $row['expires_at'] ?? $inventory->expires_at;
            $inventory->location = $row['location'] ?? $inventory->location;
            $inventory->save();

            $keep[] = $variant->id;
        }

        // Drop variants the editor removed, unless they carry order history.
        foreach ($product->variants()->whereNotIn('id', $keep)->get() as $orphan) {
            if ($this->variantHasSales($orphan)) {
                $orphan->update(['status' => ProductVariant::STATUS_INACTIVE]);

                continue;
            }
            $orphan->delete();
        }

        $product->forceFill(['has_variants' => count($keep) > 1])->save();
    }

    /**
     * Attach externally hosted / already-uploaded images by path. The
     * multipart upload endpoint remains the primary route; this keeps
     * seeded placeholders and imports working.
     *
     * @param  array<int, string>|null  $urls
     */
    protected function syncImageUrls(Product $product, ?array $urls): void
    {
        if ($urls === null) {
            return;
        }

        $paths = collect($urls)
            ->map(fn ($u) => ltrim(Str::after((string) $u, '/storage/'), '/'))
            ->filter()
            ->values();

        $product->images()->whereNotIn('path', $paths)->delete();

        foreach ($paths as $position => $path) {
            $image = $product->images()->firstOrNew(['path' => $path]);
            $image->tenant_id = $product->tenant_id;
            $image->product_id = $product->id;
            $image->position = $position;
            $image->is_primary = $position === 0;
            $image->save();
        }
    }

    protected function applyPublishedAt(Product $product): void
    {
        if ($product->status === Product::STATUS_ACTIVE && ! $product->published_at) {
            $product->forceFill(['published_at' => now()])->save();
        }
    }

    protected function applyCommonFilters(Builder $query, Request $request): void
    {
        if ($request->filled('store_id')) {
            $query->where('store_id', $request->integer('store_id'));
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }
        if ($request->filled('product_type')) {
            $query->where('product_type', $request->string('product_type'));
        }
        if ($request->filled('catalog_preset')) {
            $query->where('catalog_preset', $request->string('catalog_preset'));
        }
        if ($request->filled('brand')) {
            $query->where('brand', $request->string('brand'));
        }
        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }
        if ($request->filled('price_min')) {
            $query->where('price', '>=', (float) $request->input('price_min'));
        }
        if ($request->filled('price_max')) {
            $query->where('price', '<=', (float) $request->input('price_max'));
        }
        if ($request->filled('tag')) {
            $query->where('tags', 'like', '%"'.$request->string('tag')->toString().'"%');
        }
        if ($request->filled('q')) {
            $like = '%'.trim($request->string('q')->toString()).'%';
            $query->where(function (Builder $w) use ($like) {
                $w->where('name', 'like', $like)
                    ->orWhere('brand', 'like', $like)
                    ->orWhere('barcode', 'like', $like)
                    ->orWhere('short_description', 'like', $like)
                    ->orWhereHas('variants', fn (Builder $v) => $v->where('sku', 'like', $like));
            });
        }
    }

    /**
     * Correlated subquery returning sellable units for the current product
     * row. Keeping it in SQL means stock filters still paginate correctly.
     */
    protected function availableStockSql(): string
    {
        return '(select coalesce(sum(inventories.quantity - inventories.reserved), 0)'
            .' from product_variants'
            .' left join inventories on inventories.variant_id = product_variants.id'
            .' where product_variants.product_id = products.id)';
    }

    protected function applyStockFilter(Builder $query, string $stock): void
    {
        if (! $stock) {
            return;
        }

        $available = $this->availableStockSql();

        match ($stock) {
            'untracked' => $query->where('products.track_inventory', false),
            'out_of_stock' => $query->where('products.track_inventory', true)
                ->where('products.allow_backorder', false)
                ->whereRaw("$available <= 0"),
            'backorder' => $query->where('products.track_inventory', true)
                ->where('products.allow_backorder', true)
                ->whereRaw("$available <= 0"),
            'low_stock' => $query->where('products.track_inventory', true)
                ->whereRaw("$available > 0")
                ->whereRaw("$available <= products.low_stock_threshold"),
            'in_stock' => $query->where('products.track_inventory', true)
                ->whereRaw("$available > products.low_stock_threshold"),
            default => null,
        };
    }

    /**
     * Catalog health KPIs. Stock figures need the variant inventory, so they
     * are computed with one extra aggregate query rather than N+1 loads.
     *
     * @return array<string, int|float>
     */
    protected function buildStats(Builder $base): array
    {
        $statusCounts = (clone $base)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $ids = (clone $base)->pluck('id');

        $rows = Product::query()
            ->withoutGlobalScopes()
            ->whereIn('products.id', $ids)
            ->leftJoin('product_variants', 'product_variants.product_id', '=', 'products.id')
            ->leftJoin('inventories', 'inventories.variant_id', '=', 'product_variants.id')
            ->groupBy('products.id')
            ->selectRaw('products.id, products.price, products.cost_price, products.track_inventory, products.low_stock_threshold')
            ->selectRaw('COALESCE(SUM(inventories.quantity - inventories.reserved), 0) as available')
            ->get();

        $lowStock = 0;
        $outOfStock = 0;
        $units = 0;
        $retailValue = 0.0;
        $costValue = 0.0;

        foreach ($rows as $row) {
            $available = (int) $row->available;
            $units += max(0, $available);
            $retailValue += max(0, $available) * (float) $row->price;
            $costValue += max(0, $available) * (float) $row->cost_price;
            if (! $row->track_inventory) {
                continue;
            }
            if ($available <= 0) {
                $outOfStock++;
            } elseif ($available <= (int) $row->low_stock_threshold) {
                $lowStock++;
            }
        }

        return [
            'total_count' => (int) $statusCounts->sum(),
            'active_count' => (int) ($statusCounts[Product::STATUS_ACTIVE] ?? 0),
            'draft_count' => (int) ($statusCounts[Product::STATUS_DRAFT] ?? 0),
            'archived_count' => (int) ($statusCounts[Product::STATUS_ARCHIVED] ?? 0),
            'low_stock_count' => $lowStock,
            'out_of_stock_count' => $outOfStock,
            'total_units' => $units,
            'retail_value' => round($retailValue, 2),
            'inventory_cost' => round($costValue, 2),
            'featured_count' => (int) (clone $base)->where('is_featured', true)->count(),
        ];
    }

    protected function fresh(Product $product): Product
    {
        return $product->fresh(['images', 'variants.inventory', 'category', 'store']);
    }

    /** @param array<string, mixed> $options */
    protected function variantLabel(array $options, ?string $fallback = null): string
    {
        $parts = collect($options)
            ->reject(fn ($value, $key) => $key === 'default' || $value === null || $value === '')
            ->map(fn ($value) => is_scalar($value) ? (string) $value : '')
            ->filter()
            ->values();

        return $parts->isNotEmpty() ? $parts->implode(' / ') : ($fallback ?: 'Default');
    }

    protected function generateSku(string $productName, string $label, int $index): string
    {
        $base = strtoupper(Str::slug(Str::limit($productName, 18, ''), '-'));
        $suffix = $label && $label !== 'Default'
            ? strtoupper(Str::slug(Str::limit($label, 12, ''), '-'))
            : str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);

        return trim($base.'-'.$suffix, '-');
    }

    protected function uniqueSku(string $sku, ?int $ignoreId = null): string
    {
        $sku = Str::upper(trim($sku)) ?: 'SKU-'.Str::upper(Str::random(6));
        $candidate = $sku;
        $i = 1;
        while (ProductVariant::query()
            ->where('sku', $candidate)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists()) {
            $candidate = $sku.'-'.(++$i);
        }

        return Str::limit($candidate, 64, '');
    }

    protected function uniqueSlug(string $value, int $storeId, ?int $ignoreId = null): string
    {
        $base = Str::slug($value) ?: 'product';
        $candidate = $base;
        $i = 1;
        while (Product::query()
            ->where('store_id', $storeId)
            ->where('slug', $candidate)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists()) {
            $candidate = $base.'-'.(++$i);
        }

        return $candidate;
    }

    protected function hasSalesHistory(Product $product): bool
    {
        return DB::table('order_items')
            ->join('product_variants', 'product_variants.id', '=', 'order_items.variant_id')
            ->where('product_variants.product_id', $product->id)
            ->exists();
    }

    protected function variantHasSales(ProductVariant $variant): bool
    {
        return DB::table('order_items')->where('variant_id', $variant->id)->exists()
            || DB::table('cart_items')->where('variant_id', $variant->id)->exists();
    }
}
