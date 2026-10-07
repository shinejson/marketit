<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\PlatformCategory;
use App\Models\PlatformSetting;
use App\Models\Product;
use App\Models\Store;
use App\Models\Tenant;
use App\Services\Ads\AdAuctionService;
use App\Services\Integration\EventBus;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MarketController extends Controller
{
    public function __construct(
        protected AdAuctionService $ads,
        protected EventBus $events,
    ) {}

    public function products(Request $request): JsonResponse
    {
        TenantContext::bypass(true);
        try {
            $q = Product::query()
                ->with(['images', 'store', 'category', 'variants.inventory'])
                ->where('status', Product::STATUS_ACTIVE)
                ->whereIn('moderation_status', Product::PUBLIC_MODERATION_STATUSES)
                ->whereHas('store', fn ($s) => $s
                    ->where('status', Store::STATUS_ACTIVE)
                    ->whereHas('tenant', fn ($t) => $t->where('status', Tenant::STATUS_ACTIVE)));

            if ($request->filled('q')) {
                $term = '%'.$request->string('q').'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('name', 'like', $term)->orWhere('description', 'like', $term);
                });
            }
            if ($request->filled('category_id')) {
                $q->where('category_id', $request->integer('category_id'));
            }
            if ($request->filled('store_id')) {
                $q->where('store_id', $request->integer('store_id'));
            }
            if ($request->filled('min_price')) {
                $q->where('price', '>=', $request->input('min_price'));
            }
            if ($request->filled('max_price')) {
                $q->where('price', '<=', $request->input('max_price'));
            }

            $sort = $request->string('sort', 'newest');
            match ((string) $sort) {
                'price_asc' => $q->orderBy('price'),
                'price_desc' => $q->orderByDesc('price'),
                'name' => $q->orderBy('name'),
                default => $q->orderByDesc('id'),
            };

            $page = $q->paginate($request->integer('per_page', 12));
            $cards = collect($page->items())->map(fn (Product $p) => $this->productCard($p))->all();
            $sponsored = $this->ads->auction(
                slot: $request->filled('category_id') ? 'category' : 'search',
                query: $request->string('q')->toString() ?: null,
                categoryId: $request->filled('category_id') ? $request->integer('category_id') : null,
                userId: $request->user()?->id,
            );
            if ($sponsored) {
                $adCard = $this->productCard($sponsored['product']);
                $adCard['sponsored'] = true;
                $adCard['impression_id'] = $sponsored['impression_id'];
                array_unshift($cards, $adCard);
            }

            return response()->json([
                'data' => $cards,
                'sponsored' => $sponsored ? [
                    'impression_id' => $sponsored['impression_id'],
                    'product_id' => $sponsored['product_id'],
                ] : null,
                'meta' => [
                    'page' => $page->currentPage(),
                    'per_page' => $page->perPage(),
                    'total' => $page->total(),
                    'last_page' => $page->lastPage(),
                ],
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function product(string $slug): JsonResponse
    {
        TenantContext::bypass(true);
        try {
            $product = Product::query()
                ->with(['images', 'store', 'category', 'variants.inventory'])
                ->where('slug', $slug)
                ->where('status', Product::STATUS_ACTIVE)
                ->whereIn('moderation_status', Product::PUBLIC_MODERATION_STATUSES)
                ->whereHas('store', fn ($s) => $s
                    ->where('status', Store::STATUS_ACTIVE)
                    ->whereHas('tenant', fn ($t) => $t->where('status', Tenant::STATUS_ACTIVE)))
                ->firstOrFail();

            $this->events->emit($product->tenant_id, 'product.viewed', [
                'product_id' => $product->id,
                'store_id' => $product->store_id,
            ]);

            return response()->json(['data' => $this->productCard($product, true)]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function stores(Request $request): JsonResponse
    {
        TenantContext::bypass(true);
        try {
            $q = Store::query()
                ->where('status', Store::STATUS_ACTIVE)
                ->whereHas('tenant', fn ($t) => $t->where('status', Tenant::STATUS_ACTIVE));
            if ($request->filled('q')) {
                $q->where('name', 'like', '%'.$request->string('q').'%');
            }
            if ($request->boolean('top_rated')) {
                $q->orderByDesc('rating_avg')->orderByDesc('rating_count');
            } else {
                $q->orderBy('name');
            }
            $page = $q->paginate($request->integer('per_page', 12));

            return response()->json([
                'data' => collect($page->items())->map(fn (Store $s) => [
                    ...$s->toArray(),
                    'rating_avg' => (float) $s->rating_avg,
                    'rating_count' => (int) $s->rating_count,
                ])->all(),
                'meta' => [
                    'page' => $page->currentPage(),
                    'per_page' => $page->perPage(),
                    'total' => $page->total(),
                    'last_page' => $page->lastPage(),
                ],
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function store(Request $request, string $slug): JsonResponse
    {
        TenantContext::bypass(true);
        try {
            $store = Store::query()->where('slug', $slug)->firstOrFail();

            if ($store->status !== Store::STATUS_ACTIVE) {
                $user = $request->user('sanctum');
                $canViewDraft = $user && ($user->isSuperAdmin() || (int) $user->tenantId() === (int) $store->tenant_id);
                abort_unless($canViewDraft, 404, 'Store is not active.');
            } else {
                abort_unless($store->tenant && $store->tenant->status === Tenant::STATUS_ACTIVE, 404, 'Store is not active.');
            }

            $products = Product::query()
                ->with(['images', 'variants.inventory'])
                ->where('store_id', $store->id)
                ->where('status', Product::STATUS_ACTIVE)
                ->whereIn('moderation_status', Product::PUBLIC_MODERATION_STATUSES)
                ->orderByDesc('id')
                ->limit(24)
                ->get()
                ->map(fn (Product $p) => $this->productCard($p));

            return response()->json([
                'data' => [
                    'store' => $store,
                    'products' => $products,
                ],
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function contact(Request $request, string $slug): JsonResponse
    {
        TenantContext::bypass(true);
        try {
            $store = Store::query()->where('slug', $slug)->firstOrFail();
            $request->validate([
                'name' => ['required', 'string', 'max:100'],
                'email' => ['required', 'email', 'max:150'],
                'subject' => ['nullable', 'string', 'max:200'],
                'message' => ['required', 'string', 'max:2000'],
            ]);

            return response()->json([
                'data' => [
                    'sent' => true,
                    'message' => 'Thank you for reaching out to ' . $store->name . '! Your message has been received.',
                ],
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function categories(): JsonResponse
    {
        TenantContext::bypass(true);
        try {
            // §7 — the curated marketplace tree is the shopper-facing taxonomy.
            try {
                $platform = PlatformCategory::query()
                    ->with(['children' => fn ($q) => $q->where('is_active', true)])
                    ->where('is_active', true)
                    ->whereNull('parent_id')
                    ->orderBy('position')
                    ->orderBy('name')
                    ->get();

                if ($platform->isNotEmpty()) {
                    return response()->json(['data' => $platform]);
                }
            } catch (\Throwable $e) {
                // Table might be unmigrated, empty, or unseeded; fall back to tenant categories.
            }

            // Nothing curated yet: fall back to the tenant-defined categories.
            try {
                $cats = Category::query()->with('children')->whereNull('parent_id')->orderBy('position')->get();

                return response()->json(['data' => $cats]);
            } catch (\Throwable $e) {
                return response()->json(['data' => []]);
            }
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function click(Request $request, int $impression): JsonResponse
    {
        $ok = $this->ads->recordClick($impression, $request->user()?->id);

        return response()->json(['data' => ['ok' => $ok]]);
    }

    public function heroSlides(): JsonResponse
    {
        $defaultSlides = [
            [
                'id' => 'slide_1',
                'image_url' => '/images/market-shopper.jpg',
                'tag' => 'Live market square · Independent stalls',
                'title' => 'A marketplace built like a city market',
                'link' => '/products',
                'alt' => 'Shopper browsing stalls in the bustling market square',
            ],
            [
                'id' => 'slide_2',
                'image_url' => 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80',
                'tag' => 'Handcrafted goods · Local artisans',
                'title' => 'Discover handcrafted & artisan items',
                'link' => '/products',
                'alt' => 'Artisan produce and handcrafted market goods',
            ],
            [
                'id' => 'slide_3',
                'image_url' => 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
                'tag' => 'Curated boutiques · Unique fashion & lifestyle',
                'title' => 'Curated independent boutiques',
                'link' => '/stores',
                'alt' => 'Curated independent boutiques and shops',
            ],
        ];

        $slides = PlatformSetting::get('hero_slides', $defaultSlides);
        if (!is_array($slides) || empty($slides)) {
            $slides = $defaultSlides;
        }

        $autoplay = filter_var(PlatformSetting::get('hero_autoplay', true), FILTER_VALIDATE_BOOL);
        $interval = (int) (PlatformSetting::get('hero_interval', 5) ?: 5);

        return response()->json([
            'data' => [
                'slides' => array_values($slides),
                'autoplay' => $autoplay,
                'interval' => $interval,
            ],
        ]);
    }

    protected function productCard(Product $p, bool $detailed = false): array
    {
        $compareAt = $p->compare_at_price !== null ? (float) $p->compare_at_price : null;
        $onSale = $compareAt !== null && $compareAt > (float) $p->price;

        $payload = [
            'id' => $p->id,
            'name' => $p->name,
            'slug' => $p->slug,
            'price' => (string) $p->price,
            'compare_at_price' => $p->compare_at_price !== null ? (string) $p->compare_at_price : null,
            'on_sale' => $onSale,
            'discount_percent' => $onSale ? (int) round((1 - ((float) $p->price / $compareAt)) * 100) : null,
            'tax_class' => $p->tax_class,
            'tax_rate' => $p->tax_rate !== null ? (string) $p->tax_rate : null,
            'unit' => $p->unit,
            'unit_amount' => $p->unit_amount !== null ? (string) $p->unit_amount : null,
            'min_order_qty' => (int) ($p->min_order_qty ?? 1),
            'brand' => $p->brand,
            'status' => $p->status,
            // Prices are denominated in the owning store's currency; the client
            // converts into whatever the shopper is browsing in.
            'currency' => $p->store?->currency ?? config('markethub.currency', 'USD'),
            'image' => $p->primaryImage()?->url,
            'images' => $p->images->map(fn ($i) => ['id' => $i->id, 'url' => $i->url, 'is_primary' => $i->is_primary])->all(),
            'store' => $p->store ? [
                'id' => $p->store->id,
                'name' => $p->store->name,
                'slug' => $p->store->slug,
                'currency' => $p->store->currency,
                'delivery_fee' => (string) $p->store->delivery_fee,
            ] : null,
            'category' => $p->category ? [
                'id' => $p->category->id,
                'name' => $p->category->name,
                'slug' => $p->category->slug,
            ] : null,
            'sponsored' => false,
            'rating_avg' => (float) $p->rating_avg,
            'rating_count' => (int) $p->rating_count,
            'variants' => $p->variants->map(fn ($v) => [
                'id' => $v->id,
                'sku' => $v->sku,
                'options' => $v->options,
                'price' => $v->effectivePrice(),
                'available' => $v->availableQty(),
                'status' => $v->status,
            ])->all(),
        ];
        if ($detailed) {
            $payload['description'] = $p->description;
            $payload['short_description'] = $p->short_description;
            $payload['tags'] = $p->tags ?? [];
            $payload['condition'] = $p->condition;
            $payload['warranty_months'] = $p->warranty_months;
        }

        return $payload;
    }
}
