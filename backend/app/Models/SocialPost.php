<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialPost extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_SCHEDULED = 'scheduled';
    public const STATUS_PUBLISHED = 'published';

    protected $fillable = [
        'campaign_id',
        'body',
        'link_url',
        'channels',
        'status',
        'scheduled_for',
        'published_at',
        'impressions',
        'clicks',
        'engagements',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'channels' => 'array',
            'scheduled_for' => 'datetime',
            'published_at' => 'datetime',
            'impressions' => 'integer',
            'clicks' => 'integer',
            'engagements' => 'integer',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(MarketingCampaign::class, 'campaign_id');
    }
}
