<?php

namespace App\Services\Commerce;

use App\Models\OrderItem;
use App\Models\PlatformSetting;
use App\Models\Product;
use App\Models\Review;
use App\Models\ReviewReport;
use App\Models\ReviewVote;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * §9 / §17 — reviews, ratings and trust.
 *
 * A review is "verified" when the reviewer actually bought the item from
 * that store. Ratings are denormalised onto products and stores on every
 * status change so listings never aggregate on read.
 */
class ReviewService
{
    public function __construct(protected NotificationService $notifications) {}

    /** Does the platform hold new reviews for moderation? */
    public function autoPublishes(): bool
    {
        $setting = PlatformSetting::get('moderate_reviews');

        return ! filter_var($setting ?? false, FILTER_VALIDATE_BOOL);
    }

    /**
     * Create (or replace) a shopper's review.
     *
     * @param  array{rating:int, title?:string|null, body?:string|null, product_id?:int|null, store_id:int, seller_order_id?:int|null}  $data
     */
    public function submit(User $user, array $data): Review
    {
        return $this->withoutTenantScope(function () use ($user, $data) {
            $store = Store::withoutGlobalScopes()->findOrFail($data['store_id']);
            $product = null;
            if (! empty($data['product_id'])) {
                $product = Product::withoutGlobalScopes()->findOrFail($data['product_id']);
                if ((int) $product->store_id !== (int) $store->id) {
                    throw ValidationException::withMessages(['product_id' => 'That product does not belong to this store.']);
                }
            }

            [$verified, $sellerOrderId, $orderItemId] = $this->verifyPurchase($user, $store, $product);

            if ($this->requiresPurchase() && ! $verified) {
                throw ValidationException::withMessages([
                    'review' => 'Only verified buyers can review this '.($product ? 'product' : 'store').'.',
                ]);
            }

            $existing = Review::withoutGlobalScopes()
                ->where('user_id', $user->id)
                ->where('store_id', $store->id)
                ->when($product, fn ($q) => $q->where('product_id', $product->id))
                ->when(! $product, fn ($q) => $q->whereNull('product_id'))
                ->first();

            $status = $this->autoPublishes() ? Review::STATUS_APPROVED : Review::STATUS_PENDING;

            $payload = [
                'tenant_id' => $store->tenant_id,
                'store_id' => $store->id,
                'product_id' => $product?->id,
                'user_id' => $user->id,
                'seller_order_id' => $sellerOrderId,
                'order_item_id' => $orderItemId,
                'rating' => max(1, min(5, (int) $data['rating'])),
                'title' => $data['title'] ?? null,
                'body' => $data['body'] ?? null,
                'status' => $status,
                'is_verified_purchase' => $verified,
                'published_at' => $status === Review::STATUS_APPROVED ? now() : null,
            ];

            $review = $existing
                ? tap($existing)->update([...$payload, 'moderated_at' => null, 'moderation_note' => null])
                : Review::withoutGlobalScopes()->create($payload);

            $this->recalculate($product, $store);

            $this->notifications->toTenant($store->tenant_id, 'review', 'New '.$review->rating.'★ review', [
                'body' => $product ? 'On "'.$product->name.'".' : 'On your storefront.',
                'action_url' => '/tenant/reviews',
                'action_label' => 'Read review',
                'subject_type' => Review::class,
                'subject_id' => $review->id,
            ]);

            if ($status === Review::STATUS_PENDING) {
                $this->notifications->toAdmins('review', 'Review awaiting moderation', [
                    'body' => 'A new review needs approval before it goes live.',
                    'action_url' => '/admin/reviews',
                    'action_label' => 'Moderate',
                    'subject_type' => Review::class,
                    'subject_id' => $review->id,
                ]);
            }

            return $review->fresh();
        });
    }

    /** Approve / reject / flag from the admin moderation queue. */
    public function moderate(Review $review, string $status, ?User $actor = null, ?string $note = null): Review
    {
        if (! in_array($status, Review::STATUSES, true)) {
            throw ValidationException::withMessages(['status' => 'Unknown moderation status.']);
        }

        $review->update([
            'status' => $status,
            'published_at' => $status === Review::STATUS_APPROVED ? ($review->published_at ?? now()) : null,
            'moderated_by_user_id' => $actor?->id,
            'moderated_at' => now(),
            'moderation_note' => $note,
        ]);

        $this->recalculateFor($review);

        if ($status === Review::STATUS_REJECTED) {
            $this->notifications->toCustomer($review->user_id, 'review', 'Your review was not published', [
                'body' => $note ?: 'It did not meet the marketplace review guidelines.',
                'level' => 'warning',
                'subject_type' => Review::class,
                'subject_id' => $review->id,
            ]);
        }

        if ($status === Review::STATUS_APPROVED) {
            $this->notifications->toCustomer($review->user_id, 'review', 'Your review is live', [
                'body' => 'Thanks for helping other shoppers.',
                'level' => 'success',
                'subject_type' => Review::class,
                'subject_id' => $review->id,
            ]);
        }

        return $review->fresh();
    }

    /** Seller's public reply to a review. */
    public function respond(Review $review, User $author, string $body): Review
    {
        $review->update([
            'response_body' => $body,
            'responded_by_user_id' => $author->id,
            'responded_at' => now(),
        ]);

        $this->notifications->toCustomer($review->user_id, 'review', 'The seller replied to your review', [
            'body' => \Illuminate\Support\Str::limit($body, 120),
            'subject_type' => Review::class,
            'subject_id' => $review->id,
        ]);

        return $review->fresh();
    }

    public function vote(Review $review, User $user, bool $helpful): Review
    {
        ReviewVote::query()->updateOrCreate(
            ['review_id' => $review->id, 'user_id' => $user->id],
            ['helpful' => $helpful],
        );

        $review->update([
            'helpful_count' => ReviewVote::query()->where('review_id', $review->id)->where('helpful', true)->count(),
        ]);

        return $review->fresh();
    }

    public function report(Review $review, ?User $user, string $reason, ?string $note = null): ReviewReport
    {
        $report = ReviewReport::query()->create([
            'review_id' => $review->id,
            'user_id' => $user?->id,
            'reason' => $reason,
            'note' => $note,
            'status' => ReviewReport::STATUS_OPEN,
        ]);

        $review->increment('report_count');

        // Three strikes pulls it out of the storefront pending a decision.
        if ($review->fresh()->report_count >= 3 && $review->status === Review::STATUS_APPROVED) {
            $review->update(['status' => Review::STATUS_FLAGGED]);
            $this->recalculateFor($review);
        }

        $this->notifications->toAdmins('review', 'Review reported', [
            'body' => 'Reason: '.str_replace('_', ' ', $reason).'.',
            'action_url' => '/admin/reviews',
            'action_label' => 'Review report',
            'level' => 'warning',
            'subject_type' => Review::class,
            'subject_id' => $review->id,
        ]);

        return $report;
    }

    /** Rating distribution + average for a product or a store. */
    public function summary(?int $productId, ?int $storeId): array
    {
        return $this->withoutTenantScope(function () use ($productId, $storeId) {
            $query = Review::withoutGlobalScopes()->where('status', Review::STATUS_APPROVED);
            if ($productId) {
                $query->where('product_id', $productId);
            } elseif ($storeId) {
                $query->where('store_id', $storeId)->whereNull('product_id');
            }

            $rows = (clone $query)
                ->selectRaw('rating, COUNT(*) as entries')
                ->groupBy('rating')
                ->pluck('entries', 'rating');

            $total = (int) array_sum($rows->all());
            $weighted = 0;
            $distribution = [];
            for ($star = 5; $star >= 1; $star--) {
                $count = (int) ($rows[$star] ?? 0);
                $weighted += $star * $count;
                $distribution[] = [
                    'rating' => $star,
                    'count' => $count,
                    'percent' => $total > 0 ? round(($count / $total) * 100) : 0,
                ];
            }

            return [
                'average' => $total > 0 ? round($weighted / $total, 2) : 0,
                'count' => $total,
                'verified_count' => (clone $query)->where('is_verified_purchase', true)->count(),
                'distribution' => $distribution,
            ];
        });
    }

    public function recalculateFor(Review $review): void
    {
        $product = $review->product_id
            ? Product::withoutGlobalScopes()->find($review->product_id)
            : null;
        $store = Store::withoutGlobalScopes()->find($review->store_id);
        $this->recalculate($product, $store);
    }

    /** Refresh the cached rating columns after any status change. */
    public function recalculate(?Product $product, ?Store $store): void
    {
        $this->withoutTenantScope(function () use ($product, $store) {
            if ($product) {
                $stats = DB::table('reviews')
                    ->where('product_id', $product->id)
                    ->where('status', Review::STATUS_APPROVED)
                    ->selectRaw('COUNT(*) as entries, COALESCE(AVG(rating), 0) as average')
                    ->first();

                $product->forceFill([
                    'rating_count' => (int) ($stats->entries ?? 0),
                    'rating_avg' => round((float) ($stats->average ?? 0), 2),
                ])->saveQuietly();
            }

            if ($store) {
                // A store's headline rating blends storefront reviews with
                // every approved product review in that store.
                $stats = DB::table('reviews')
                    ->where('store_id', $store->id)
                    ->where('status', Review::STATUS_APPROVED)
                    ->selectRaw('COUNT(*) as entries, COALESCE(AVG(rating), 0) as average')
                    ->first();

                $store->forceFill([
                    'rating_count' => (int) ($stats->entries ?? 0),
                    'rating_avg' => round((float) ($stats->average ?? 0), 2),
                ])->saveQuietly();
            }
        });
    }

    /**
     * Products a shopper has bought and not yet reviewed.
     *
     * @return array<int, array<string, mixed>>
     */
    public function pendingFor(User $user): array
    {
        return $this->withoutTenantScope(function () use ($user) {
            $sellerOrders = SellerOrder::withoutGlobalScopes()
                ->whereHas('order', fn ($q) => $q->where('user_id', $user->id))
                ->whereIn('status', [SellerOrder::STATUS_DELIVERED, SellerOrder::STATUS_COMPLETED])
                ->with(['items.variant.product.images', 'store:id,name,slug'])
                ->latest('id')
                ->limit(30)
                ->get();

            $reviewedProducts = Review::withoutGlobalScopes()
                ->where('user_id', $user->id)
                ->whereNotNull('product_id')
                ->pluck('product_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $pending = [];
            foreach ($sellerOrders as $sellerOrder) {
                foreach ($sellerOrder->items as $item) {
                    $product = $item->variant?->product;
                    if (! $product || in_array((int) $product->id, $reviewedProducts, true)) {
                        continue;
                    }
                    $pending[$product->id] = [
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'product_slug' => $product->slug,
                        'image' => $product->primaryImage()?->url,
                        'store_id' => $sellerOrder->store_id,
                        'store_name' => $sellerOrder->store?->name,
                        'seller_order_id' => $sellerOrder->id,
                        'order_id' => $sellerOrder->order_id,
                    ];
                }
            }

            return array_values($pending);
        });
    }

    protected function requiresPurchase(): bool
    {
        return filter_var(PlatformSetting::get('verified_reviews_only', false) ?? false, FILTER_VALIDATE_BOOL);
    }

    /** @return array{0:bool,1:int|null,2:int|null} */
    protected function verifyPurchase(User $user, Store $store, ?Product $product): array
    {
        $sellerOrder = SellerOrder::withoutGlobalScopes()
            ->where('store_id', $store->id)
            ->whereHas('order', fn ($q) => $q->where('user_id', $user->id))
            ->whereIn('status', [
                SellerOrder::STATUS_SHIPPED,
                SellerOrder::STATUS_DELIVERED,
                SellerOrder::STATUS_COMPLETED,
            ])
            ->latest('id')
            ->first();

        if (! $sellerOrder) {
            return [false, null, null];
        }

        if (! $product) {
            return [true, $sellerOrder->id, null];
        }

        $orderItem = OrderItem::query()
            ->where('seller_order_id', $sellerOrder->id)
            ->whereHas('variant', fn ($q) => $q->withoutGlobalScopes()->where('product_id', $product->id))
            ->first();

        return [$orderItem !== null, $sellerOrder->id, $orderItem?->id];
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
}
