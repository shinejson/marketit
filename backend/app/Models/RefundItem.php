<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefundItem extends Model
{
    protected $fillable = [
        'refund_id',
        'order_item_id',
        'qty',
        'unit_price',
        'amount',
        'restock',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'integer',
            'unit_price' => 'decimal:2',
            'amount' => 'decimal:2',
            'restock' => 'boolean',
        ];
    }

    public function refund(): BelongsTo
    {
        return $this->belongsTo(Refund::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }
}
