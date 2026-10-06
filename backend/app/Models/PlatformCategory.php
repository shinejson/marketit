<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * The marketplace-wide taxonomy the super admin curates (§7):
 * Electronics → Mobile Phones → Smartphones.
 *
 * Tenant categories and products map onto it so shoppers can browse one
 * coherent tree across every store.
 */
class PlatformCategory extends Model
{
    protected $fillable = [
        'parent_id',
        'name',
        'slug',
        'description',
        'icon',
        'image_url',
        'position',
        'is_active',
        'is_featured',
        'seo_title',
        'seo_description',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('position')->orderBy('name');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'platform_category_id');
    }

    public function tenantCategories(): HasMany
    {
        return $this->hasMany(Category::class, 'platform_category_id');
    }

    /** Breadcrumb trail from the root down to this node. */
    public function path(): string
    {
        $parts = [$this->name];
        $node = $this->parent;
        $guard = 0;
        while ($node && $guard++ < 10) {
            array_unshift($parts, $node->name);
            $node = $node->parent;
        }

        return implode(' › ', $parts);
    }
}
