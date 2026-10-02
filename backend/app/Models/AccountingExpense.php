<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AccountingExpense extends Model
{
    use Auditable, BelongsToTenant;

    public const STATUSES = ['draft', 'pending', 'paid', 'overdue', 'void'];
    public const CATEGORIES = ['Inventory', 'Shipping', 'Marketing', 'Software', 'Rent', 'Payroll', 'Utilities', 'Professional services', 'Tax', 'Other'];

    protected $fillable = [
        'tenant_id', 'vendor_id', 'created_by', 'number', 'vendor_name', 'category',
        'description', 'expense_date', 'due_date', 'amount', 'tax_amount', 'total',
        'currency', 'status', 'receipt_reference', 'notes', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'expense_date' => 'date:Y-m-d', 'due_date' => 'date:Y-m-d', 'paid_at' => 'datetime',
            'amount' => 'decimal:2', 'tax_amount' => 'decimal:2', 'total' => 'decimal:2',
        ];
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(AccountingContact::class, 'vendor_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(AccountingPayment::class, 'expense_id');
    }
}
