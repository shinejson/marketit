<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CouponTarget extends Model
{
    public const TYPE_PRODUCT = 'product';
    public const TYPE_CATEGORY = 'category';
    public const TYPE_STORE = 'store';

    protected $fillable = [
        'coupon_id',
        'target_type',
        'target_id',
    ];

    protected function casts(): array
    {
        return ['target_id' => 'integer'];
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }
}
