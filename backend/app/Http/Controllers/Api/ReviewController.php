<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Review;
use App\Models\ReviewReport;
use App\Models\Store;
use App\Services\Commerce\ReviewService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * §9 / §17 — public review reads and shopper writes.
 */
class ReviewController extends Controller
{
    public function __construct(protected ReviewService $reviews) {}

    /** Approved reviews for a product (public). */
    public function forProduct(Request $request, string $slug): JsonResponse
    {
        TenantContext::bypass(true);
        try {
            $product = Product::query()->where('slug', $slug)->firstOrFail();

            return response()->json($this->listing($request, $product->id, $product->store_id, false));
        } finally {
            TenantContext::bypass(false);
        }
    }

    /** Approved reviews for a store (public). */
    public function forStore(Request $request, string $slug): JsonResponse
    {
        TenantContext::bypass(true);
        try {
            $store = Store::query()->where('slug', $slug)->firstOrFail();

            return response()->json($this->listing($request, null, $store->id, true));
        } finally {
            TenantContext::bypass(false);
        }
    }

    /** Reviews the signed-in shopper has written. */
    public function mine(Request $request): JsonResponse
    {
        TenantContext::bypass(true);
        try {
            $page = Review::query()
                ->with(['product:id,name,slug', 'store:id,name,slug'])
                ->where('user_id', $request->user()->id)
                ->orderByDesc('id')
                ->paginate($request->integer('per_page', 15));

            return response()->json([
                'data' => collect($page->items())->map(fn (Review $r) => $this->present($r, true))->all(),
                'meta' => $this->meta($page),
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    /** Delivered purchases still waiting for a review. */
    public function pending(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->reviews->pendingFor($request->user())]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'store_id' => ['required', 'integer', 'exists:stores,id'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:160'],
            'body' => ['nullable', 'string', 'max:4000'],
        ]);

        $review = $this->reviews->submit($request->user(), $data);

        return response()->json(['data' => $this->present($review, true)], 201);
    }

    public function update(Request $request, Review $review): JsonResponse
    {
        abort_unless((int) $review->user_id === (int) $request->user()->id, 403, 'You can only edit your own review.');

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:160'],
            'body' => ['nullable', 'string', 'max:4000'],
        ]);

        $updated = $this->reviews->submit($request->user(), [
            'store_id' => $review->store_id,
            'product_id' => $review->product_id,
            ...$data,
        ]);

        return response()->json(['data' => $this->present($updated, true)]);
    }

    public function destroy(Request $request, Review $review): JsonResponse
    {
        abort_unless((int) $review->user_id === (int) $request->user()->id, 403, 'You can only remove your own review.');
        $review->delete();
        $this->reviews->recalculateFor($review);

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function vote(Request $request, Review $review): JsonResponse
    {
        $data = $request->validate(['helpful' => ['nullable', 'boolean']]);
        $updated = $this->reviews->vote($review, $request->user(), (bool) ($data['helpful'] ?? true));

        return response()->json(['data' => ['id' => $updated->id, 'helpful_count' => $updated->helpful_count]]);
    }

    public function report(Request $request, Review $review): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'in:'.implode(',', ReviewReport::REASONS)],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->reviews->report($review, $request->user(), $data['reason'], $data['note'] ?? null);

        return response()->json(['data' => ['reported' => true]], 201);
    }

    // ----------------------------------------------------------- internals

    protected function listing(Request $request, ?int $productId, int $storeId, bool $storeLevelOnly): array
    {
        $query = Review::query()
            ->with(['user:id,name,avatar_url', 'product:id,name,slug'])
            ->where('status', Review::STATUS_APPROVED);

        if ($productId) {
            $query->where('product_id', $productId);
        } elseif ($storeLevelOnly) {
            $query->where('store_id', $storeId)->whereNull('product_id');
        }

        if ($request->filled('rating')) {
            $query->where('rating', $request->integer('rating'));
        }
        if ($request->boolean('verified_only')) {
            $query->where('is_verified_purchase', true);
        }

        match ($request->string('sort', 'recent')->toString()) {
            'helpful' => $query->orderByDesc('helpful_count')->orderByDesc('id'),
            'highest' => $query->orderByDesc('rating')->orderByDesc('id'),
            'lowest' => $query->orderBy('rating')->orderByDesc('id'),
            default => $query->orderByDesc('id'),
        };

        $page = $query->paginate($request->integer('per_page', 10));

        return [
            'data' => collect($page->items())->map(fn (Review $r) => $this->present($r))->all(),
            'summary' => $this->reviews->summary($productId, $storeLevelOnly ? $storeId : null),
            'meta' => $this->meta($page),
        ];
    }

    protected function present(Review $review, bool $owner = false): array
    {
        return [
            'id' => $review->id,
            'rating' => (int) $review->rating,
            'title' => $review->title,
            'body' => $review->body,
            'status' => $review->status,
            'is_verified_purchase' => (bool) $review->is_verified_purchase,
            'helpful_count' => (int) $review->helpful_count,
            'created_at' => $review->created_at,
            'response_body' => $review->response_body,
            'responded_at' => $review->responded_at,
            'author' => $owner ? null : [
                'name' => $review->user?->name ?? 'MarketHub shopper',
                'avatar_url' => $review->user?->avatar_url,
            ],
            'product' => $review->product ? [
                'id' => $review->product->id,
                'name' => $review->product->name,
                'slug' => $review->product->slug,
            ] : null,
            'store' => $review->relationLoaded('store') && $review->store ? [
                'id' => $review->store->id,
                'name' => $review->store->name,
                'slug' => $review->store->slug,
            ] : null,
            'moderation_note' => $owner ? $review->moderation_note : null,
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
