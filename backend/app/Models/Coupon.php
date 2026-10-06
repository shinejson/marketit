<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A discount code (§18). tenant_id === null means the super admin owns it and
 * it applies across the marketplace; otherwise only that seller's lines are
 * discounted. Deliberately not using BelongsToTenant: platform coupons must
 * stay visible inside a tenant request.
 */
class Coupon extends Model
{
    public const TYPE_PERCENTAGE = 'percentage';
    public const TYPE_FIXED = 'fixed';
    public const TYPE_FREE_SHIPPING = 'free_shipping';

    public const TYPES = [self::TYPE_PERCENTAGE, self::TYPE_FIXED, self::TYPE_FREE_SHIPPING];

    public const STATUS_DRAFT = 'draft';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_PAUSED = 'paused';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_ARCHIVED = 'archived';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_ACTIVE,
        self::STATUS_PAUSED,
        self::STATUS_EXPIRED,
        self::STATUS_ARCHIVED,
    ];

    public const APPLIES_ALL = 'all';
    public const APPLIES_PRODUCTS = 'products';
    public const APPLIES_CATEGORIES = 'categories';
    public const APPLIES_STORES = 'stores';

    protected $fillable = [
        'tenant_id',
        'store_id',
        'code',
        'name',
        'description',
        'discount_type',
        'value',
        'currency',
        'min_subtotal',
        'max_discount',
        'usage_limit',
        'per_user_limit',
        'used_count',
        'redeemed_value',
        'applies_to',
        'is_stackable',
        'first_order_only',
        'auto_apply',
        'starts_at',
        'ends_at',
        'status',
        'created_by_user_id',
    ];

    protected $appends = ['is_live', 'remaining_uses'];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'min_subtotal' => 'decimal:2',
            'max_discount' => 'decimal:2',
            'redeemed_value' => 'decimal:2',
            'usage_limit' => 'integer',
            'per_user_limit' => 'integer',
            'used_count' => 'integer',
            'is_stackable' => 'boolean',
            'first_order_only' => 'boolean',
            'auto_apply' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function targets(): HasMany
    {
        return $this->hasMany(CouponTarget::class);
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(CouponRedemption::class);
    }

    public function scopeLive(Builder $query): Builder
    {
        $now = now();

        return $query->where('status', self::STATUS_ACTIVE)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now));
    }

    public function isPlatformWide(): bool
    {
        return $this->tenant_id === null;
    }

    public function getIsLiveAttribute(): bool
    {
        if ($this->status !== self::STATUS_ACTIVE) {
            return false;
        }
        if ($this->starts_at && $this->starts_at->isFuture()) {
            return false;
        }
        if ($this->ends_at && $this->ends_at->isPast()) {
            return false;
        }

        return ! ($this->usage_limit !== null && $this->used_count >= $this->usage_limit);
    }

    public function getRemainingUsesAttribute(): ?int
    {
        if ($this->usage_limit === null) {
            return null;
        }

        return max(0, (int) $this->usage_limit - (int) $this->used_count);
    }
}
