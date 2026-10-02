<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountingPayment extends Model
{
    use Auditable, BelongsToTenant;

    public const METHODS = ['bank_transfer', 'card', 'cash', 'mobile_money', 'cheque', 'other'];

    protected $fillable = [
        'tenant_id', 'invoice_id', 'expense_id', 'created_by', 'reference', 'direction',
        'method', 'amount', 'currency', 'paid_on', 'notes',
    ];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'paid_on' => 'date:Y-m-d'];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(AccountingInvoice::class, 'invoice_id');
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(AccountingExpense::class, 'expense_id');
    }
}
