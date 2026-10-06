<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CouponRedemption extends Model
{
    public const STATUS_APPLIED = 'applied';
    public const STATUS_RELEASED = 'released';

    protected $fillable = [
        'coupon_id',
        'user_id',
        'order_id',
        'seller_order_id',
        'code',
        'amount',
        'currency',
        'status',
    ];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
