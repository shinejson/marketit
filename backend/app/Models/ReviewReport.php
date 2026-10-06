<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewReport extends Model
{
    public const STATUS_OPEN = 'open';
    public const STATUS_DISMISSED = 'dismissed';
    public const STATUS_ACTIONED = 'actioned';

    public const STATUSES = [
        self::STATUS_OPEN,
        self::STATUS_DISMISSED,
        self::STATUS_ACTIONED,
    ];

    public const REASONS = [
        'spam',
        'offensive',
        'off_topic',
        'fake',
        'personal_data',
        'other',
    ];

    protected $fillable = [
        'review_id',
        'user_id',
        'reason',
        'note',
        'status',
        'handled_by_user_id',
        'handled_at',
    ];

    protected function casts(): array
    {
        return ['handled_at' => 'datetime'];
    }

    public function review(): BelongsTo
    {
        return $this->belongsTo(Review::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
