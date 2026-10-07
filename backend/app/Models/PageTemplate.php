<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PageTemplate extends Model
{
    use Auditable;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PENDING_REVIEW = 'pending_review';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'category_id',
        'created_by',
        'name',
        'slug',
        'description',
        'thumbnail',
        'designer_name',
        'price',
        'currency',
        'status',
        'version',
        'definition',
        'is_featured',
        'rating_avg',
        'rating_count',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'definition' => 'array',
            'is_featured' => 'boolean',
            'rating_avg' => 'decimal:2',
            'rating_count' => 'integer',
            'price' => 'decimal:2',
            'published_at' => 'datetime',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(TemplateCategory::class, 'category_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(TemplatePurchase::class, 'template_id');
    }

    public function installations(): HasMany
    {
        return $this->hasMany(TenantTemplate::class, 'template_id');
    }

    public function isFree(): bool
    {
        return (float) $this->price <= 0;
    }
}
