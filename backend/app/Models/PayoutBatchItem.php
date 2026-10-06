<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayoutBatchItem extends Model
{
    protected $fillable = [
        'payout_batch_id',
        'seller_settlement_id',
        'gross',
        'commission',
        'refund_amount',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'gross' => 'decimal:2',
            'commission' => 'decimal:2',
            'refund_amount' => 'decimal:2',
            'amount' => 'decimal:2',
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(PayoutBatch::class, 'payout_batch_id');
    }

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(SellerSettlement::class, 'seller_settlement_id');
    }
}
