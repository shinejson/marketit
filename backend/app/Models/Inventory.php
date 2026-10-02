<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Inventory extends Model
{
    use Auditable, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'variant_id',
        'quantity',
        'reserved',
        'low_stock_threshold',
        'batch_reference',
        'expires_at',
        'location',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'date',
        ];
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class)->latest('id');
    }

    public function available(): int
    {
        return max(0, (int) $this->quantity - (int) $this->reserved);
    }

    public function isLowStock(): bool
    {
        return $this->available() <= (int) $this->low_stock_threshold;
    }
}
