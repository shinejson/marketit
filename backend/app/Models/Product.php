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

    public const TYPE_PHYSICAL = 'physical';
    public const TYPE_DIGITAL = 'digital';
    public const TYPE_SERVICE = 'service';

    protected $fillable = [
        'tenant_id',
        'store_id',
        'category_id',
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
        'brand',
        'has_variants',
        'is_featured',
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
            'unit_amount' => 'decimal:3',
            'weight' => 'decimal:3',
            'length' => 'decimal:2',
            'width' => 'decimal:2',
            'height' => 'decimal:2',
            'has_variants' => 'boolean',
            'is_featured' => 'boolean',
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
}
