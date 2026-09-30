<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use Auditable;

    public const STATUS_TRIALING = 'trialing';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_PAST_DUE = 'past_due';
    public const STATUS_CANCELED = 'canceled';
    public const STATUS_EXPIRED = 'expired';

    public const STATUSES = [
        self::STATUS_TRIALING,
        self::STATUS_ACTIVE,
        self::STATUS_PAST_DUE,
        self::STATUS_CANCELED,
        self::STATUS_EXPIRED,
    ];

    /** Statuses that still generate recurring revenue. */
    public const BILLABLE = [self::STATUS_ACTIVE, self::STATUS_PAST_DUE];

    protected $fillable = [
        'tenant_id', 'plan_id', 'status', 'amount', 'currency', 'interval',
        'trial_ends_at', 'started_at', 'current_period_start', 'current_period_end',
        'canceled_at', 'cancel_at_period_end',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'cancel_at_period_end' => 'boolean',
            'trial_ends_at' => 'datetime',
            'started_at' => 'datetime',
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
            'canceled_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(SubscriptionInvoice::class);
    }

    public function monthlyAmount(): float
    {
        return $this->interval === 'yearly' ? round((float) $this->amount / 12, 2) : (float) $this->amount;
    }
}
