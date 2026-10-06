<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WishlistItem extends Model
{
    protected $fillable = [
        'user_id',
        'product_id',
        'variant_id',
        'store_id',
        'note',
        'price_at_save',
        'notify_on_restock',
        'notify_on_price_drop',
    ];

    protected function casts(): array
    {
        return [
            'price_at_save' => 'decimal:2',
            'notify_on_restock' => 'boolean',
            'notify_on_price_drop' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
