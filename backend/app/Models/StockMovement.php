<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    use BelongsToTenant;

    public const TYPE_RECEIPT = 'receipt';
    public const TYPE_ADJUSTMENT = 'adjustment';
    public const TYPE_COUNT = 'count';
    public const TYPE_DAMAGE = 'damage';
    public const TYPE_TRANSFER = 'transfer';
    public const TYPE_RETURN = 'return';
    public const TYPE_SALE = 'sale';

    public const TYPES = [
        self::TYPE_RECEIPT,
        self::TYPE_ADJUSTMENT,
        self::TYPE_COUNT,
        self::TYPE_DAMAGE,
        self::TYPE_TRANSFER,
        self::TYPE_RETURN,
        self::TYPE_SALE,
    ];

    protected $fillable = [
        'tenant_id',
        'inventory_id',
        'variant_id',
        'user_id',
        'type',
        'quantity',
        'quantity_before',
        'quantity_after',
        'reference',
        'location',
        'note',
        'unit_cost',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'quantity_before' => 'integer',
            'quantity_after' => 'integer',
            'unit_cost' => 'decimal:2',
        ];
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
