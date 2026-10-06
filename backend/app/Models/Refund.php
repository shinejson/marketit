<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A refund against one seller order (§12). Deliberately not tenant-scoped at
 * the model level: a customer must be able to read their own refunds even
 * though the row carries the seller's tenant_id.
 */
class Refund extends Model
{
    public const TYPE_FULL = 'full';
    public const TYPE_PARTIAL = 'partial';
    public const TYPE_SHIPPING_ONLY = 'shipping_only';
    public const TYPE_GOODWILL = 'goodwill';

    public const TYPES = [self::TYPE_FULL, self::TYPE_PARTIAL, self::TYPE_SHIPPING_ONLY, self::TYPE_GOODWILL];

    public const STATUS_REQUESTED = 'requested';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_FAILED = 'failed';

    public const STATUSES = [
        self::STATUS_REQUESTED,
        self::STATUS_APPROVED,
        self::STATUS_PROCESSING,
        self::STATUS_COMPLETED,
        self::STATUS_REJECTED,
        self::STATUS_FAILED,
    ];

    /** Still awaiting a decision or still moving money. */
    public const OPEN_STATUSES = [
        self::STATUS_REQUESTED,
        self::STATUS_APPROVED,
        self::STATUS_PROCESSING,
    ];

    public const REASONS = [
        'item_not_received',
        'not_as_described',
        'damaged',
        'wrong_item',
        'late_delivery',
        'changed_mind',
        'duplicate_charge',
        'other',
    ];

    protected $fillable = [
        'reference',
        'order_id',
        'seller_order_id',
        'tenant_id',
        'payment_transaction_id',
        'dispute_id',
        'requested_by_user_id',
        'type',
        'reason',
        'customer_note',
        'status',
        'amount',
        'commission_reversal',
        'delivery_refund',
        'net_seller_impact',
        'currency',
        'restock',
        'gateway_ref',
        'decision_note',
        'reviewed_by_user_id',
        'reviewed_at',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'commission_reversal' => 'decimal:2',
            'delivery_refund' => 'decimal:2',
            'net_seller_impact' => 'decimal:2',
            'restock' => 'boolean',
            'reviewed_at' => 'datetime',
            'processed_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function sellerOrder(): BelongsTo
    {
        return $this->belongsTo(SellerOrder::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function dispute(): BelongsTo
    {
        return $this->belongsTo(Dispute::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(RefundItem::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function isOpen(): bool
    {
        return in_array($this->status, [self::STATUS_REQUESTED, self::STATUS_APPROVED, self::STATUS_PROCESSING], true);
    }

    public function isSettled(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }
}
