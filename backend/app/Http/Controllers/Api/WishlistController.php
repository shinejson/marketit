<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\WishlistItem;
use App\Models\WishlistStore;
use App\Services\CartService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * §9 / §20 #6 — wishlist and favourites.
 */
class WishlistController extends Controller
{
    public function __construct(protected CartService $carts) {}

    public function index(Request $request): JsonResponse
    {
        TenantContext::bypass(true);
        try {
            $items = WishlistItem::query()
                ->with(['product.images', 'product.store:id,name,slug,currency', 'variant.inventory'])
                ->where('user_id', $request->user()->id)
                ->orderByDesc('id')
                ->get()
                ->map(fn (WishlistItem $item) => $this->present($item))
                ->values();

            $stores = WishlistStore::query()
                ->with('store:id,name,slug,logo_path,rating_avg,rating_count')
                ->where('user_id', $request->user()->id)
                ->orderByDesc('id')
                ->get()
                ->map(fn (WishlistStore $row) => [
                    'id' => $row->id,
                    'store' => $row->store ? [
                        'id' => $row->store->id,
                        'name' => $row->store->name,
                        'slug' => $row->store->slug,
                        'logo_path' => $row->store->logo_path,
                        'rating_avg' => (float) $row->store->rating_avg,
                        'rating_count' => (int) $row->store->rating_count,
                    ] : null,
                ])
                ->values();

            return response()->json([
                'data' => [
                    'items' => $items,
                    'stores' => $stores,
                    'counts' => ['items' => $items->count(), 'stores' => $stores->count()],
                ],
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    /** Lightweight id list the storefront uses to light up heart icons. */
    public function ids(Request $request): JsonResponse
    {
        return response()->json([
            'data' => [
                'product_ids' => WishlistItem::query()
                    ->where('user_id', $request->user()->id)
                    ->pluck('product_id')
                    ->map(fn ($id) => (int) $id)
                    ->values(),
                'store_ids' => WishlistStore::query()
                    ->where('user_id', $request->user()->id)
                    ->pluck('store_id')
                    ->map(fn ($id) => (int) $id)
                    ->values(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'note' => ['nullable', 'string', 'max:255'],
            'notify_on_restock' => ['nullable', 'boolean'],
            'notify_on_price_drop' => ['nullable', 'boolean'],
        ]);

        TenantContext::bypass(true);
        try {
            $product = Product::query()->findOrFail($data['product_id']);
            $variant = ! empty($data['variant_id'])
                ? ProductVariant::query()->where('product_id', $product->id)->findOrFail($data['variant_id'])
                : null;

            $item = WishlistItem::query()->updateOrCreate(
                [
                    'user_id' => $request->user()->id,
                    'product_id' => $product->id,
                    'variant_id' => $variant?->id,
                ],
                [
                    'store_id' => $product->store_id,
                    'note' => $data['note'] ?? null,
                    'price_at_save' => $variant?->effectivePrice() ?? $product->price,
                    'notify_on_restock' => $data['notify_on_restock'] ?? false,
                    'notify_on_price_drop' => $data['notify_on_price_drop'] ?? true,
                ],
            );

            $item->load(['product.images', 'product.store:id,name,slug,currency', 'variant.inventory']);

            return response()->json(['data' => $this->present($item)], 201);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function destroy(Request $request, int $item): JsonResponse
    {
        WishlistItem::query()
            ->where('user_id', $request->user()->id)
            ->whereKey($item)
            ->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    /** Remove by product, so the storefront heart can toggle without an id. */
    public function destroyByProduct(Request $request, int $product): JsonResponse
    {
        WishlistItem::query()
            ->where('user_id', $request->user()->id)
            ->where('product_id', $product)
            ->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function toggleStore(Request $request): JsonResponse
    {
        $data = $request->validate(['store_id' => ['required', 'integer', 'exists:stores,id']]);

        $existing = WishlistStore::query()
            ->where('user_id', $request->user()->id)
            ->where('store_id', $data['store_id'])
            ->first();

        if ($existing) {
            $existing->delete();

            return response()->json(['data' => ['saved' => false]]);
        }

        WishlistStore::query()->create([
            'user_id' => $request->user()->id,
            'store_id' => $data['store_id'],
        ]);

        return response()->json(['data' => ['saved' => true]], 201);
    }

    /** Move a saved item straight into the basket (§9). */
    public function moveToCart(Request $request, int $item): JsonResponse
    {
        $wishlistItem = WishlistItem::query()
            ->where('user_id', $request->user()->id)
            ->whereKey($item)
            ->firstOrFail();

        TenantContext::bypass(true);
        try {
            $variantId = $wishlistItem->variant_id
                ?? ProductVariant::query()
                    ->where('product_id', $wishlistItem->product_id)
                    ->where('status', ProductVariant::STATUS_ACTIVE)
                    ->orderBy('id')
                    ->value('id');
        } finally {
            TenantContext::bypass(false);
        }

        if (! $variantId) {
            throw ValidationException::withMessages(['variant' => 'This product has no purchasable option right now.']);
        }

        $cart = $this->carts->addItem($request->user(), (int) $variantId, max(1, $request->integer('qty', 1)));
        $wishlistItem->delete();

        return response()->json(['data' => $this->carts->groupedPayload($cart)]);
    }

    protected function present(WishlistItem $item): array
    {
        $product = $item->product;
        $variant = $item->variant;
        $current = $variant?->effectivePrice() ?? ($product ? (string) $product->price : '0.00');
        $saved = $item->price_at_save !== null ? (string) $item->price_at_save : null;

        return [
            'id' => $item->id,
            'product_id' => $item->product_id,
            'variant_id' => $item->variant_id,
            'note' => $item->note,
            'notify_on_restock' => (bool) $item->notify_on_restock,
            'notify_on_price_drop' => (bool) $item->notify_on_price_drop,
            'price_at_save' => $saved,
            'current_price' => $current,
            'price_dropped' => $saved !== null && bccomp($current, $saved, 2) === -1,
            'created_at' => $item->created_at,
            'product' => $product ? [
                'id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'price' => (string) $product->price,
                'image' => $product->primaryImage()?->url,
                'status' => $product->status,
                'rating_avg' => (float) $product->rating_avg,
                'rating_count' => (int) $product->rating_count,
                'in_stock' => $variant
                    ? $variant->availableQty() > 0
                    : ($product->relationLoaded('variants') ? $product->available_stock > 0 : true),
                'store' => $product->store ? [
                    'id' => $product->store->id,
                    'name' => $product->store->name,
                    'slug' => $product->store->slug,
                    'currency' => $product->store->currency,
                ] : null,
            ] : null,
            'variant' => $variant ? [
                'id' => $variant->id,
                'sku' => $variant->sku,
                'options' => $variant->options,
                'available' => $variant->availableQty(),
            ] : null,
        ];
    }
}
