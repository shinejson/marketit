<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\PlatformCategory;
use App\Models\Product;
use App\Models\ProductReport;
use App\Services\Notifications\NotificationService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * §7 / §18 / §22 #7 — global catalog management.
 *
 * Two jobs live here: the marketplace-wide category tree every tenant maps
 * their own categories onto, and the product moderation queue.
 */
class AdminCatalogController extends Controller
{
    public function __construct(protected NotificationService $notifications) {}

    // -------------------------------------------------- platform categories

    public function categories(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $categories = PlatformCategory::query()
            ->withCount(['children', 'tenantCategories', 'products'])
            ->orderBy('position')
            ->orderBy('name')
            ->get();

        $tree = $this->buildTree($categories);

        return response()->json([
            'data' => [
                'tree' => $tree,
                'flat' => $categories->map(fn (PlatformCategory $c) => $this->presentCategory($c))->values(),
                'summary' => [
                    'total' => $categories->count(),
                    'active' => $categories->where('is_active', true)->count(),
                    'featured' => $categories->where('is_featured', true)->count(),
                    'unmapped_tenant_categories' => Category::query()->whereNull('platform_category_id')->count(),
                    'unmapped_products' => Product::query()->whereNull('platform_category_id')->count(),
                ],
            ],
        ]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $this->categoryRules($request);

        $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['name']);
        $category = PlatformCategory::query()->create($data);

        return response()->json(['data' => $this->presentCategory($category)], 201);
    }

    public function updateCategory(Request $request, PlatformCategory $category): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $this->categoryRules($request, $category);

        if (! empty($data['slug']) && $data['slug'] !== $category->slug) {
            $data['slug'] = $this->uniqueSlug($data['slug'], $category->id);
        }
        if (! empty($data['parent_id']) && (int) $data['parent_id'] === (int) $category->id) {
            throw ValidationException::withMessages(['parent_id' => 'A category cannot be its own parent.']);
        }

        $category->update($data);

        return response()->json(['data' => $this->presentCategory($category->fresh())]);
    }

    public function destroyCategory(PlatformCategory $category): JsonResponse
    {
        TenantContext::bypass(true);

        if ($category->children()->exists()) {
            throw ValidationException::withMessages(['category' => 'Move or delete the child categories first.']);
        }

        // Detach rather than orphan: tenant rows keep working, just unmapped.
        Category::query()->where('platform_category_id', $category->id)->update(['platform_category_id' => null]);
        Product::query()->where('platform_category_id', $category->id)->update(['platform_category_id' => null]);
        $category->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function reorderCategories(Request $request): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $request->validate([
            'order' => ['required', 'array', 'min:1'],
            'order.*.id' => ['required', 'integer'],
            'order.*.position' => ['required', 'integer', 'min:0'],
            'order.*.parent_id' => ['nullable', 'integer'],
        ]);

        foreach ($data['order'] as $row) {
            PlatformCategory::query()->whereKey($row['id'])->update([
                'position' => $row['position'],
                'parent_id' => $row['parent_id'] ?? null,
            ]);
        }

        return response()->json(['data' => ['reordered' => count($data['order'])]]);
    }

    /** Tenant categories waiting to be mapped onto the global tree. */
    public function tenantCategories(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $query = Category::query()->with(['tenant:id,name', 'platformCategory:id,name']);
        if ($request->boolean('unmapped_only')) {
            $query->whereNull('platform_category_id');
        }
        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->integer('tenant_id'));
        }
        if ($request->filled('q')) {
            $query->where('name', 'like', '%'.$request->string('q').'%');
        }

        $page = $query->orderBy('name')->paginate($request->integer('per_page', 25));

        return response()->json([
            'data' => collect($page->items())->map(fn (Category $c) => [
                'id' => $c->id,
                'tenant_id' => $c->tenant_id,
                'tenant' => $c->tenant?->name,
                'name' => $c->name,
                'slug' => $c->slug,
                'platform_category_id' => $c->platform_category_id,
                'platform_category' => $c->platformCategory?->name,
                'products_count' => Product::query()->where('category_id', $c->id)->count(),
            ])->all(),
            'meta' => $this->meta($page),
        ]);
    }

    /** Point a tenant category (and its products) at a global category. */
    public function mapCategory(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $data = $request->validate([
            'category_ids' => ['required', 'array', 'min:1'],
            'category_ids.*' => ['integer'],
            'platform_category_id' => ['nullable', 'integer', 'exists:platform_categories,id'],
            'cascade_products' => ['nullable', 'boolean'],
        ]);

        Category::query()
            ->whereIn('id', $data['category_ids'])
            ->update(['platform_category_id' => $data['platform_category_id'] ?? null]);

        $products = 0;
        if ($data['cascade_products'] ?? true) {
            $products = Product::query()
                ->whereIn('category_id', $data['category_ids'])
                ->update(['platform_category_id' => $data['platform_category_id'] ?? null]);
        }

        return response()->json(['data' => [
            'categories' => count($data['category_ids']),
            'products' => $products,
        ]]);
    }

    // ---------------------------------------------------- product moderation

    public function products(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $query = Product::query()->with([
            'store:id,name,slug,tenant_id',
            'tenant:id,name',
            'category:id,name',
            'platformCategory:id,name',
            'images',
        ]);

        if ($request->filled('moderation_status')) {
            $query->where('moderation_status', $request->string('moderation_status'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->integer('tenant_id'));
        }
        if ($request->filled('store_id')) {
            $query->where('store_id', $request->integer('store_id'));
        }
        if ($request->boolean('reported_only')) {
            $query->where('report_count', '>', 0);
        }
        if ($request->boolean('unmapped_only')) {
            $query->whereNull('platform_category_id');
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('sku', 'like', $term));
        }

        match ($request->string('sort', 'recent')->toString()) {
            'reported' => $query->orderByDesc('report_count')->orderByDesc('id'),
            'rating' => $query->orderByDesc('rating_avg')->orderByDesc('rating_count'),
            default => $query->orderByDesc('id'),
        };

        $page = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (Product $p) => $this->presentProduct($p))->all(),
            'summary' => $this->productSummary(),
            'meta' => $this->meta($page),
        ]);
    }

    public function moderateProduct(Request $request, Product $product): JsonResponse
    {
        TenantContext::bypass(true);

        $data = $request->validate([
            'moderation_status' => ['required', 'in:'.implode(',', Product::MODERATION_STATUSES)],
            'note' => ['nullable', 'string', 'max:1000'],
            'platform_category_id' => ['nullable', 'integer', 'exists:platform_categories,id'],
        ]);

        $product->update([
            'moderation_status' => $data['moderation_status'],
            'moderation_note' => $data['note'] ?? null,
            'moderated_by_user_id' => $request->user()->id,
            'moderated_at' => now(),
            ...(array_key_exists('platform_category_id', $data)
                ? ['platform_category_id' => $data['platform_category_id']]
                : []),
        ]);

        if ($data['moderation_status'] === Product::MODERATION_REJECTED) {
            // A rejected listing must not stay on the storefront.
            $product->update(['status' => Product::STATUS_DRAFT]);
            $this->notifications->toTenant($product->tenant_id, 'catalog', 'Listing rejected: '.$product->name, [
                'body' => $data['note'] ?: 'This listing breaches the marketplace catalog rules.',
                'action_url' => '/tenant/products',
                'action_label' => 'Edit listing',
                'level' => 'critical',
                'subject_type' => Product::class,
                'subject_id' => $product->id,
            ]);
        }

        if ($data['moderation_status'] === Product::MODERATION_APPROVED) {
            $this->notifications->toTenant($product->tenant_id, 'catalog', 'Listing approved: '.$product->name, [
                'body' => 'Your product is live on the marketplace.',
                'action_url' => '/tenant/products',
                'action_label' => 'View listing',
                'level' => 'success',
                'subject_type' => Product::class,
                'subject_id' => $product->id,
            ]);
        }

        return response()->json(['data' => $this->presentProduct($product->fresh(['store', 'tenant', 'category', 'images']))]);
    }

    public function bulkModerateProducts(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
            'moderation_status' => ['required', 'in:'.implode(',', Product::MODERATION_STATUSES)],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $attributes = [
            'moderation_status' => $data['moderation_status'],
            'moderation_note' => $data['note'] ?? null,
            'moderated_by_user_id' => $request->user()->id,
            'moderated_at' => now(),
        ];
        if ($data['moderation_status'] === Product::MODERATION_REJECTED) {
            $attributes['status'] = Product::STATUS_DRAFT;
        }

        $updated = Product::query()->whereIn('id', $data['ids'])->update($attributes);

        return response()->json(['data' => ['updated' => $updated]]);
    }

    /** Shopper-reported listings. */
    public function productReports(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $query = ProductReport::query()->with(['product:id,name,slug,store_id,moderation_status', 'product.store:id,name', 'reporter:id,name,email']);
        $query->where('status', $request->string('status', ProductReport::STATUS_OPEN));

        $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (ProductReport $r) => [
                'id' => $r->id,
                'product_id' => $r->product_id,
                'product' => $r->product ? [
                    'id' => $r->product->id,
                    'name' => $r->product->name,
                    'slug' => $r->product->slug,
                    'store' => $r->product->store?->name,
                    'moderation_status' => $r->product->moderation_status,
                ] : null,
                'reason' => $r->reason,
                'note' => $r->note,
                'status' => $r->status,
                'reporter' => $r->reporter?->name,
                'created_at' => $r->created_at,
            ])->all(),
            'meta' => $this->meta($page),
        ]);
    }

    public function resolveProductReport(Request $request, ProductReport $report): JsonResponse
    {
        TenantContext::bypass(true);

        $data = $request->validate([
            'status' => ['required', 'in:'.implode(',', ProductReport::STATUSES)],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $report->update([
            'status' => $data['status'],
            'note' => $data['note'] ?? $report->note,
            'handled_by_user_id' => $request->user()->id,
            'handled_at' => now(),
        ]);

        return response()->json(['data' => ['id' => $report->id, 'status' => $report->status]]);
    }

    // ----------------------------------------------------------- internals

    protected function categoryRules(Request $request, ?PlatformCategory $category = null): array
    {
        return $request->validate([
            'parent_id' => ['nullable', 'integer', 'exists:platform_categories,id'],
            'name' => [$category ? 'sometimes' : 'required', 'string', 'max:160'],
            'slug' => ['nullable', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:500'],
            'icon' => ['nullable', 'string', 'max:64'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'position' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'is_featured' => ['nullable', 'boolean'],
            'seo_title' => ['nullable', 'string', 'max:160'],
            'seo_description' => ['nullable', 'string', 'max:300'],
        ]);
    }

    protected function uniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $base = Str::slug($value) ?: 'category';
        $slug = $base;
        $n = 2;
        while (PlatformCategory::query()
            ->where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists()) {
            $slug = $base.'-'.$n++;
        }

        return $slug;
    }

    /** @param \Illuminate\Support\Collection<int, PlatformCategory> $categories */
    protected function buildTree($categories, ?int $parentId = null): array
    {
        return $categories
            ->where('parent_id', $parentId)
            ->map(fn (PlatformCategory $c) => [
                ...$this->presentCategory($c),
                'children' => $this->buildTree($categories, $c->id),
            ])
            ->values()
            ->all();
    }

    protected function presentCategory(PlatformCategory $category): array
    {
        return [
            'id' => $category->id,
            'parent_id' => $category->parent_id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'icon' => $category->icon,
            'image_url' => $category->image_url,
            'position' => (int) $category->position,
            'is_active' => (bool) $category->is_active,
            'is_featured' => (bool) $category->is_featured,
            'seo_title' => $category->seo_title,
            'seo_description' => $category->seo_description,
            'children_count' => (int) ($category->children_count ?? 0),
            'tenant_categories_count' => (int) ($category->tenant_categories_count ?? 0),
            'products_count' => (int) ($category->products_count ?? 0),
        ];
    }

    protected function productSummary(): array
    {
        $base = Product::query();

        return [
            'total' => (clone $base)->count(),
            'pending' => (clone $base)->where('moderation_status', Product::MODERATION_PENDING)->count(),
            'rejected' => (clone $base)->where('moderation_status', Product::MODERATION_REJECTED)->count(),
            'flagged' => (clone $base)->where('moderation_status', Product::MODERATION_FLAGGED)->count(),
            'reported' => (clone $base)->where('report_count', '>', 0)->count(),
            'unmapped' => (clone $base)->whereNull('platform_category_id')->count(),
            'open_reports' => ProductReport::query()->where('status', ProductReport::STATUS_OPEN)->count(),
        ];
    }

    protected function presentProduct(Product $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'sku' => $product->sku,
            'price' => (string) $product->price,
            'status' => $product->status,
            'moderation_status' => $product->moderation_status,
            'moderation_note' => $product->moderation_note,
            'moderated_at' => $product->moderated_at,
            'report_count' => (int) $product->report_count,
            'rating_avg' => (float) $product->rating_avg,
            'rating_count' => (int) $product->rating_count,
            'image' => $product->primaryImage()?->url,
            'created_at' => $product->created_at,
            'tenant' => $product->relationLoaded('tenant') ? $product->tenant?->name : null,
            'tenant_id' => $product->tenant_id,
            'store' => $product->relationLoaded('store') && $product->store ? [
                'id' => $product->store->id,
                'name' => $product->store->name,
                'slug' => $product->store->slug,
            ] : null,
            'category' => $product->relationLoaded('category') ? $product->category?->name : null,
            'platform_category_id' => $product->platform_category_id,
            'platform_category' => $product->relationLoaded('platformCategory') ? $product->platformCategory?->name : null,
        ];
    }

    protected function meta($page): array
    {
        return [
            'page' => $page->currentPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
            'last_page' => $page->lastPage(),
        ];
    }
}
