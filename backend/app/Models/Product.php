<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Product extends Model
{
    use Auditable, BelongsToTenant;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_ARCHIVED = 'archived';

    public const MODERATION_PENDING = 'pending';
    public const MODERATION_APPROVED = 'approved';
    public const MODERATION_FLAGGED = 'flagged';
    public const MODERATION_REJECTED = 'rejected';

    public const MODERATION_STATUSES = [
        self::MODERATION_PENDING,
        self::MODERATION_APPROVED,
        self::MODERATION_FLAGGED,
        self::MODERATION_REJECTED,
    ];

    /** Moderation states a shopper is allowed to see. */
    public const PUBLIC_MODERATION_STATUSES = [
        self::MODERATION_APPROVED,
        self::MODERATION_FLAGGED,
    ];

    public const TYPE_PHYSICAL = 'physical';
    public const TYPE_DIGITAL = 'digital';
    public const TYPE_SERVICE = 'service';

    protected $fillable = [
        'tenant_id',
        'store_id',
        'category_id',
        'platform_category_id',
        'name',
        'slug',
        'description',
        'short_description',
        'status',
        'product_type',
        'catalog_preset',
        'price',
        'compare_at_price',
        'cost_price',
        'tax_class',
        'tax_rate',
        'brand',
        'has_variants',
        'is_featured',
        'moderation_status',
        'moderation_note',
        'moderated_by_user_id',
        'moderated_at',
        'unit',
        'unit_amount',
        'min_order_qty',
        'max_order_qty',
        'track_inventory',
        'allow_backorder',
        'low_stock_threshold',
        'requires_shipping',
        'weight',
        'weight_unit',
        'length',
        'width',
        'height',
        'dimension_unit',
        'condition',
        'warranty_months',
        'is_perishable',
        'shelf_life_days',
        'storage_requirement',
        'country_of_origin',
        'barcode',
        'tags',
        'specs',
        'option_schema',
        'seo_title',
        'seo_description',
        'published_at',
    ];

    protected $appends = ['available_stock', 'stock_state', 'primary_image_url', 'margin_percent'];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'compare_at_price' => 'decimal:2',
            'cost_price' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'unit_amount' => 'decimal:3',
            'weight' => 'decimal:3',
            'length' => 'decimal:2',
            'width' => 'decimal:2',
            'height' => 'decimal:2',
            'has_variants' => 'boolean',
            'is_featured' => 'boolean',
            'rating_avg' => 'decimal:2',
            'rating_count' => 'integer',
            'report_count' => 'integer',
            'moderated_at' => 'datetime',
            'track_inventory' => 'boolean',
            'allow_backorder' => 'boolean',
            'requires_shipping' => 'boolean',
            'is_perishable' => 'boolean',
            'min_order_qty' => 'integer',
            'max_order_qty' => 'integer',
            'low_stock_threshold' => 'integer',
            'warranty_months' => 'integer',
            'shelf_life_days' => 'integer',
            'tags' => 'array',
            'specs' => 'array',
            'option_schema' => 'array',
            'published_at' => 'datetime',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function platformCategory(): BelongsTo
    {
        return $this->belongsTo(PlatformCategory::class, 'platform_category_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(ProductReport::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('position');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('position')->orderBy('id');
    }

    public function inventories(): HasManyThrough
    {
        return $this->hasManyThrough(Inventory::class, ProductVariant::class, 'product_id', 'variant_id');
    }

    public function primaryImage(): ?ProductImage
    {
        return $this->images->firstWhere('is_primary', true) ?? $this->images->first();
    }

    /** Sellable units across every variant (quantity minus reservations). */
    public function getAvailableStockAttribute(): int
    {
        if (! $this->relationLoaded('variants')) {
            return 0;
        }

        return (int) $this->variants->sum(function (ProductVariant $variant) {
            $inventory = $variant->relationLoaded('inventory') ? $variant->inventory : null;

            return $inventory ? max(0, (int) $inventory->quantity - (int) $inventory->reserved) : 0;
        });
    }

    /**
     * Normalised stock signal used by the catalog filters and badges.
     * Untracked items (services, digital) are always "in_stock".
     */
    public function getStockStateAttribute(): string
    {
        if (! $this->track_inventory) {
            return 'untracked';
        }

        $available = $this->available_stock;
        if ($available <= 0) {
            return $this->allow_backorder ? 'backorder' : 'out_of_stock';
        }

        return $available <= (int) $this->low_stock_threshold ? 'low_stock' : 'in_stock';
    }

    public function getPrimaryImageUrlAttribute(): ?string
    {
        if (! $this->relationLoaded('images')) {
            return null;
        }

        $image = $this->images->firstWhere('is_primary', true) ?? $this->images->first();

        return $image?->url;
    }

    /** Visible in the marketplace? Rejected and unreviewed listings are not. */
    public function isPubliclyVisible(): bool
    {
        return $this->status === self::STATUS_ACTIVE
            && in_array($this->moderation_status, self::PUBLIC_MODERATION_STATUSES, true);
    }

    /** Gross margin on the base price, null when no cost is recorded. */
    public function getMarginPercentAttribute(): ?float
    {
        $price = (float) $this->price;
        $cost = (float) $this->cost_price;
        if ($cost <= 0 || $price <= 0) {
            return null;
        }

        return round((($price - $cost) / $price) * 100, 1);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
