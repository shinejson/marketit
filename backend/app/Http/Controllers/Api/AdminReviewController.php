<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\ReviewReport;
use App\Models\Store;
use App\Services\Commerce\ReviewService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * §17 / §18 / §27 — the platform review moderation desk.
 */
class AdminReviewController extends Controller
{
    public function __construct(protected ReviewService $reviews) {}

    public function index(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $query = Review::query()->with([
            'user:id,name,email',
            'product:id,name,slug',
            'store:id,name,slug,tenant_id',
            'store.tenant:id,name',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->integer('tenant_id'));
        }
        if ($request->filled('store_id')) {
            $query->where('store_id', $request->integer('store_id'));
        }
        if ($request->filled('rating')) {
            $query->where('rating', $request->integer('rating'));
        }
        if ($request->boolean('reported_only')) {
            $query->where('report_count', '>', 0);
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('title', 'like', $term)->orWhere('body', 'like', $term));
        }

        match ($request->string('sort', 'recent')->toString()) {
            'reported' => $query->orderByDesc('report_count')->orderByDesc('id'),
            'lowest' => $query->orderBy('rating')->orderByDesc('id'),
            default => $query->orderByDesc('id'),
        };

        $page = $query->paginate($request->integer('per_page', 20));

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

    public function show(Review $review): JsonResponse
    {
        TenantContext::bypass(true);
        $review->load(['user:id,name,email', 'product:id,name,slug', 'store:id,name,slug', 'reports.reporter:id,name,email']);

        return response()->json(['data' => [
            ...$this->present($review),
            'reports' => $review->reports->map(fn (ReviewReport $r) => [
                'id' => $r->id,
                'reason' => $r->reason,
                'note' => $r->note,
                'status' => $r->status,
                'reporter' => $r->reporter?->name,
                'created_at' => $r->created_at,
            ])->values(),
        ]]);
    }

    public function moderate(Request $request, Review $review): JsonResponse
    {
        TenantContext::bypass(true);

        $data = $request->validate([
            'status' => ['required', 'in:'.implode(',', Review::STATUSES)],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = $this->reviews->moderate($review, $data['status'], $request->user(), $data['note'] ?? null);

        return response()->json(['data' => $this->present($updated->load(['user', 'product', 'store']))]);
    }

    /** Approve or reject several at once from the queue. */
    public function bulkModerate(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
            'status' => ['required', 'in:'.implode(',', Review::STATUSES)],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = 0;
        foreach (Review::query()->whereIn('id', $data['ids'])->get() as $review) {
            $this->reviews->moderate($review, $data['status'], $request->user(), $data['note'] ?? null);
            $updated++;
        }

        return response()->json(['data' => ['updated' => $updated]]);
    }

    public function destroy(Review $review): JsonResponse
    {
        TenantContext::bypass(true);
        $review->delete();
        $this->reviews->recalculateFor($review);

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function reports(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $query = ReviewReport::query()->with(['review.product:id,name,slug', 'review.store:id,name', 'reporter:id,name,email']);
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        } else {
            $query->where('status', ReviewReport::STATUS_OPEN);
        }

        $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (ReviewReport $r) => [
                'id' => $r->id,
                'review_id' => $r->review_id,
                'reason' => $r->reason,
                'note' => $r->note,
                'status' => $r->status,
                'created_at' => $r->created_at,
                'reporter' => $r->reporter ? ['id' => $r->reporter->id, 'name' => $r->reporter->name] : null,
                'review' => $r->review ? [
                    'id' => $r->review->id,
                    'rating' => (int) $r->review->rating,
                    'title' => $r->review->title,
                    'body' => $r->review->body,
                    'status' => $r->review->status,
                    'product' => $r->review->product?->name,
                    'store' => $r->review->store?->name,
                ] : null,
            ])->all(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function resolveReport(Request $request, ReviewReport $report): JsonResponse
    {
        TenantContext::bypass(true);

        $data = $request->validate([
            'status' => ['required', 'in:'.implode(',', ReviewReport::STATUSES)],
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

    /** Store trust leaderboard for the admin dashboard. */
    public function storeRatings(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $stores = Store::query()
            ->with('tenant:id,name')
            ->where('rating_count', '>', 0)
            ->orderByDesc('rating_avg')
            ->orderByDesc('rating_count')
            ->limit($request->integer('limit', 20))
            ->get(['id', 'tenant_id', 'name', 'slug', 'rating_avg', 'rating_count']);

        return response()->json([
            'data' => $stores->map(fn (Store $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'slug' => $s->slug,
                'tenant' => $s->tenant?->name,
                'rating_avg' => (float) $s->rating_avg,
                'rating_count' => (int) $s->rating_count,
            ])->values(),
        ]);
    }

    // ----------------------------------------------------------- internals

    protected function summary(): array
    {
        $base = Review::query();

        return [
            'total' => (clone $base)->count(),
            'pending' => (clone $base)->where('status', Review::STATUS_PENDING)->count(),
            'flagged' => (clone $base)->where('status', Review::STATUS_FLAGGED)->count(),
            'rejected' => (clone $base)->where('status', Review::STATUS_REJECTED)->count(),
            'reported' => (clone $base)->where('report_count', '>', 0)->count(),
            'open_reports' => ReviewReport::query()->where('status', ReviewReport::STATUS_OPEN)->count(),
            'average' => round((float) (clone $base)->where('status', Review::STATUS_APPROVED)->avg('rating'), 2),
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
            'moderation_note' => $review->moderation_note,
            'moderated_at' => $review->moderated_at,
            'response_body' => $review->response_body,
            'created_at' => $review->created_at,
            'customer' => $review->user ? [
                'id' => $review->user->id,
                'name' => $review->user->name,
                'email' => $review->user->email,
            ] : null,
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
            'tenant' => $review->relationLoaded('store') && $review->store?->relationLoaded('tenant')
                ? $review->store->tenant?->name
                : null,
        ];
    }
}
