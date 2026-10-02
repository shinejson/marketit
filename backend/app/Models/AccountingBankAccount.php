<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AccountingBankAccount extends Model
{
    use Auditable, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'ledger_account_id', 'name', 'bank_name', 'account_number_last4',
        'currency', 'opening_balance', 'is_active',
    ];

    protected function casts(): array
    {
        return ['opening_balance' => 'decimal:2', 'is_active' => 'boolean'];
    }

    public function ledgerAccount(): BelongsTo
    {
        return $this->belongsTo(AccountingAccount::class, 'ledger_account_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(AccountingBankTransaction::class, 'bank_account_id');
    }
}
