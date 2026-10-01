<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketingCampaign extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_PAUSED = 'paused';
    public const STATUS_COMPLETED = 'completed';

    public const OBJECTIVES = ['awareness', 'traffic', 'conversions', 'engagement', 'seller_acquisition'];

    protected $fillable = [
        'name',
        'objective',
        'status',
        'channels',
        'daily_budget',
        'total_budget',
        'spend',
        'impressions',
        'clicks',
        'conversions',
        'starts_at',
        'ends_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'channels' => 'array',
            'daily_budget' => 'decimal:2',
            'total_budget' => 'decimal:2',
            'spend' => 'decimal:2',
            'impressions' => 'integer',
            'clicks' => 'integer',
            'conversions' => 'integer',
            'starts_at' => 'date',
            'ends_at' => 'date',
        ];
    }

    public function posts(): HasMany
    {
        return $this->hasMany(SocialPost::class, 'campaign_id');
    }
}
