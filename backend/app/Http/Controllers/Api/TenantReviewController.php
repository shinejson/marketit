<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Services\Commerce\ReviewService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * §17 — the seller's review inbox: read feedback, reply publicly, flag abuse.
 *
 * Sellers can never approve or delete a review; that stays with the platform
 * so ratings cannot be gamed.
 */
class TenantReviewController extends Controller
{
    public function __construct(protected ReviewService $reviews) {}

    public function index(Request $request): JsonResponse
    {
        $query = Review::query()
            ->with(['user:id,name,avatar_url', 'product:id,name,slug', 'store:id,name,slug'])
            ->where('tenant_id', TenantContext::id());

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('store_id')) {
            $query->where('store_id', $request->integer('store_id'));
        }
        if ($request->filled('rating')) {
            $query->where('rating', $request->integer('rating'));
        }
        if ($request->boolean('needs_response')) {
            $query->whereNull('response_body')->where('status', Review::STATUS_APPROVED);
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('title', 'like', $term)->orWhere('body', 'like', $term));
        }

        $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (Review $r) => $this->present($r))->all(),
            'summary' => $this->summary(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function respond(Request $request, Review $review): JsonResponse
    {
        $this->assertOwned($review);
        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $updated = $this->reviews->respond($review, $request->user(), $data['body']);

        return response()->json(['data' => $this->present($updated->load(['user', 'product', 'store']))]);
    }

    /** Seller asks the platform to look at an abusive review. */
    public function report(Request $request, Review $review): JsonResponse
    {
        $this->assertOwned($review);
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:64'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->reviews->report($review, $request->user(), $data['reason'], $data['note'] ?? null);

        return response()->json(['data' => ['reported' => true]], 201);
    }

    protected function assertOwned(Review $review): void
    {
        abort_unless((int) $review->tenant_id === (int) TenantContext::id(), 403, 'Not your workspace.');
    }

    protected function summary(): array
    {
        $base = Review::query()->where('tenant_id', TenantContext::id());
        $approved = (clone $base)->where('status', Review::STATUS_APPROVED);

        return [
            'total' => (clone $base)->count(),
            'approved' => (clone $approved)->count(),
            'pending' => (clone $base)->where('status', Review::STATUS_PENDING)->count(),
            'flagged' => (clone $base)->where('status', Review::STATUS_FLAGGED)->count(),
            'needs_response' => (clone $approved)->whereNull('response_body')->count(),
            'average' => round((float) (clone $approved)->avg('rating'), 2),
            'detractors' => (clone $approved)->where('rating', '<=', 2)->count(),
            'promoters' => (clone $approved)->where('rating', '>=', 4)->count(),
        ];
    }

    protected function present(Review $review): array
    {
        return [
            'id' => $review->id,
            'rating' => (int) $review->rating,
            'title' => $review->title,
            'body' => $review->body,
            'status' => $review->status,
            'is_verified_purchase' => (bool) $review->is_verified_purchase,
            'helpful_count' => (int) $review->helpful_count,
            'report_count' => (int) $review->report_count,
            'response_body' => $review->response_body,
            'responded_at' => $review->responded_at,
            'created_at' => $review->created_at,
            'customer' => [
                'id' => $review->user?->id,
                'name' => $review->user?->name ?? 'MarketHub shopper',
                'avatar_url' => $review->user?->avatar_url,
            ],
            'product' => $review->product ? [
                'id' => $review->product->id,
                'name' => $review->product->name,
                'slug' => $review->product->slug,
            ] : null,
            'store' => $review->store ? [
                'id' => $review->store->id,
                'name' => $review->store->name,
                'slug' => $review->store->slug,
            ] : null,
        ];
    }
}
