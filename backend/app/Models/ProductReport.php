<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductReport extends Model
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
        'counterfeit',
        'prohibited',
        'misleading',
        'offensive',
        'wrong_category',
        'pricing',
        'other',
    ];

    protected $fillable = [
        'product_id',
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

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
