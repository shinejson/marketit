<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountingBankTransaction extends Model
{
    use Auditable, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'bank_account_id', 'payment_id', 'transaction_date',
        'description', 'reference', 'amount', 'status', 'reconciled_at',
    ];

    protected function casts(): array
    {
        return [
            'transaction_date' => 'date:Y-m-d', 'amount' => 'decimal:2',
            'reconciled_at' => 'datetime',
        ];
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(AccountingBankAccount::class, 'bank_account_id');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(AccountingPayment::class, 'payment_id');
    }
}
