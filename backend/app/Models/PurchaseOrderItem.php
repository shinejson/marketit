<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrderItem extends Model
{
    protected $fillable = [
        'purchase_order_id', 'description', 'sku', 'quantity', 'received_quantity',
        'unit_cost', 'tax_rate', 'line_subtotal', 'line_tax', 'line_total',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2', 'received_quantity' => 'decimal:2', 'unit_cost' => 'decimal:2',
            'tax_rate' => 'decimal:2', 'line_subtotal' => 'decimal:2',
            'line_tax' => 'decimal:2', 'line_total' => 'decimal:2',
        ];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }
}
