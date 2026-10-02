<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A knowledge-base guide. Articles are authored in the super-admin console and
 * surfaced to tenants (and optionally customers) in the help centre.
 */
class HelpArticle extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_REVIEW = 'review';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_ARCHIVED = 'archived';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_REVIEW,
        self::STATUS_PUBLISHED,
        self::STATUS_ARCHIVED,
    ];

    public const AUDIENCES = ['tenant', 'customer', 'internal', 'all'];

    protected $fillable = [
        'category_id',
        'title',
        'slug',
        'excerpt',
        'body',
        'status',
        'audience',
        'tags',
        'is_pinned',
        'read_minutes',
        'views',
        'helpful_yes',
        'helpful_no',
        'author_id',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'is_pinned' => 'boolean',
            'read_minutes' => 'integer',
            'views' => 'integer',
            'helpful_yes' => 'integer',
            'helpful_no' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(HelpCategory::class, 'category_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PUBLISHED);
    }

    /** Percentage of readers who marked the guide helpful (null when unrated). */
    public function helpfulScore(): ?int
    {
        $total = $this->helpful_yes + $this->helpful_no;

        return $total > 0 ? (int) round(($this->helpful_yes / $total) * 100) : null;
    }
}
