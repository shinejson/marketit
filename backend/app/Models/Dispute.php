<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A customer-raised case against a seller order (§18 "Reviews and disputes").
 * Escalation path: customer opens → seller responds → platform arbitrates.
 */
class Dispute extends Model
{
    public const STATUS_OPEN = 'open';
    public const STATUS_AWAITING_SELLER = 'awaiting_seller';
    public const STATUS_AWAITING_CUSTOMER = 'awaiting_customer';
    public const STATUS_ESCALATED = 'escalated';
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_CLOSED = 'closed';

    public const STATUSES = [
        self::STATUS_OPEN,
        self::STATUS_AWAITING_SELLER,
        self::STATUS_AWAITING_CUSTOMER,
        self::STATUS_ESCALATED,
        self::STATUS_RESOLVED,
        self::STATUS_REJECTED,
        self::STATUS_CLOSED,
    ];

    public const OPEN_STATUSES = [
        self::STATUS_OPEN,
        self::STATUS_AWAITING_SELLER,
        self::STATUS_AWAITING_CUSTOMER,
        self::STATUS_ESCALATED,
    ];

    public const TYPES = [
        'item_not_received',
        'not_as_described',
        'damaged',
        'wrong_item',
        'late_delivery',
        'unauthorised',
        'other',
    ];

    public const OUTCOMES = [
        'refund_full',
        'refund_partial',
        'replacement',
        'no_action',
        'seller_favour',
        'customer_favour',
    ];

    protected $fillable = [
        'reference',
        'order_id',
        'seller_order_id',
        'tenant_id',
        'store_id',
        'raised_by_user_id',
        'type',
        'status',
        'priority',
        'subject',
        'description',
        'amount_claimed',
        'currency',
        'resolution',
        'outcome',
        'assigned_admin_id',
        'escalated_at',
        'seller_due_at',
        'resolved_at',
        'last_activity_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_claimed' => 'decimal:2',
            'escalated_at' => 'datetime',
            'seller_due_at' => 'datetime',
            'resolved_at' => 'datetime',
            'last_activity_at' => 'datetime',
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

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function raisedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'raised_by_user_id');
    }

    public function assignedAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_admin_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(DisputeMessage::class)->orderBy('created_at');
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function isOpen(): bool
    {
        return in_array($this->status, self::OPEN_STATUSES, true);
    }

    public function isOverdue(): bool
    {
        return $this->seller_due_at !== null
            && $this->seller_due_at->isPast()
            && $this->status === self::STATUS_AWAITING_SELLER;
    }
}
