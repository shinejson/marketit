<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerSettlement extends Model
{
    /** Money is earned but still inside the hold window. */
    public const STATUS_PENDING = 'pending';
    /** Hold cleared — eligible to be swept into a payout batch. */
    public const STATUS_AVAILABLE = 'available';
    /** Sitting in a batch that has not been paid yet. */
    public const STATUS_PROCESSING = 'processing';
    /** Paid out to the seller. */
    public const STATUS_PAID = 'paid';
    /** Kept back by an admin (open dispute, fraud review...). */
    public const STATUS_ON_HOLD = 'on_hold';
    /** Fully refunded — nothing left to pay. */
    public const STATUS_REVERSED = 'reversed';
    /** Legacy alias kept so older rows keep rendering. */
    public const STATUS_RELEASED = 'released';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_AVAILABLE,
        self::STATUS_PROCESSING,
        self::STATUS_PAID,
        self::STATUS_ON_HOLD,
        self::STATUS_REVERSED,
    ];

    protected $fillable = [
        'seller_order_id',
        'tenant_id',
        'payout_batch_id',
        'gross',
        'commission',
        'commission_rate',
        'delivery_fee',
        'refund_amount',
        'net',
        'currency',
        'status',
        'available_at',
        'released_at',
        'hold_reason',
    ];

    protected function casts(): array
    {
        return [
            'gross' => 'decimal:2',
            'commission' => 'decimal:2',
            'delivery_fee' => 'decimal:2',
            'refund_amount' => 'decimal:2',
            'net' => 'decimal:2',
            'commission_rate' => 'decimal:4',
            'available_at' => 'datetime',
            'released_at' => 'datetime',
        ];
    }

    public function sellerOrder(): BelongsTo
    {
        return $this->belongsTo(SellerOrder::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(PayoutBatch::class, 'payout_batch_id');
    }

    /** Can this settlement be swept into a new payout batch right now? */
    public function isPayable(): bool
    {
        return $this->status === self::STATUS_AVAILABLE
            && $this->payout_batch_id === null
            && bccomp((string) $this->net, '0', 2) === 1;
    }

    /** Recompute net from gross + delivery − commission − refunds. */
    public function recalculateNet(): string
    {
        $net = bcsub(
            bcadd((string) $this->gross, (string) $this->delivery_fee, 2),
            bcadd((string) $this->commission, (string) $this->refund_amount, 2),
            2,
        );

        return bccomp($net, '0', 2) === -1 ? '0.00' : $net;
    }
}
