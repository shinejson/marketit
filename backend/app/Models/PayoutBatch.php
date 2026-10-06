<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A batch of seller settlements released together (§22 #16).
 */
class PayoutBatch extends Model
{
    use BelongsToTenant;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PENDING_APPROVAL = 'pending_approval';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_PAID = 'paid';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_PENDING_APPROVAL,
        self::STATUS_PROCESSING,
        self::STATUS_PAID,
        self::STATUS_FAILED,
        self::STATUS_CANCELLED,
    ];

    protected $fillable = [
        'tenant_id',
        'payout_account_id',
        'reference',
        'status',
        'currency',
        'gross',
        'commission',
        'delivery_fees',
        'refunds',
        'adjustments',
        'net',
        'settlement_count',
        'period_start',
        'period_end',
        'method',
        'external_ref',
        'notes',
        'failure_reason',
        'created_by_user_id',
        'released_by_user_id',
        'released_at',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'gross' => 'decimal:2',
            'commission' => 'decimal:2',
            'delivery_fees' => 'decimal:2',
            'refunds' => 'decimal:2',
            'adjustments' => 'decimal:2',
            'net' => 'decimal:2',
            'settlement_count' => 'integer',
            'period_start' => 'date',
            'period_end' => 'date',
            'released_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(PayoutBatchItem::class);
    }

    public function settlements(): HasMany
    {
        return $this->hasMany(SellerSettlement::class);
    }

    public function adjustmentEntries(): HasMany
    {
        return $this->hasMany(PayoutAdjustment::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(PayoutAccount::class, 'payout_account_id');
    }

    public function isEditable(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_PENDING_APPROVAL], true);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
