<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayoutAdjustment extends Model
{
    use BelongsToTenant;

    public const KIND_CREDIT = 'credit';
    public const KIND_DEBIT = 'debit';

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPLIED = 'applied';
    public const STATUS_VOID = 'void';

    protected $fillable = [
        'tenant_id',
        'payout_batch_id',
        'kind',
        'reason',
        'amount',
        'currency',
        'status',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(PayoutBatch::class, 'payout_batch_id');
    }

    /** Signed value: credits add to the payout, debits subtract. */
    public function signedAmount(): string
    {
        $amount = (string) $this->amount;

        return $this->kind === self::KIND_DEBIT ? bcmul($amount, '-1', 2) : bcadd($amount, '0', 2);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
