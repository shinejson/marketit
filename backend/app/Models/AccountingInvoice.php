<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AccountingInvoice extends Model
{
    use Auditable, BelongsToTenant;

    public const STATUSES = ['draft', 'sent', 'partial', 'paid', 'overdue', 'void'];

    protected $fillable = [
        'tenant_id', 'contact_id', 'created_by', 'number', 'customer_name', 'customer_email',
        'issue_date', 'due_date', 'status', 'subtotal', 'tax_total', 'discount_total',
        'total', 'amount_paid', 'balance_due', 'currency', 'notes', 'sent_at', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date:Y-m-d',
            'due_date' => 'date:Y-m-d',
            'sent_at' => 'datetime',
            'paid_at' => 'datetime',
            'subtotal' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'total' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'balance_due' => 'decimal:2',
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(AccountingContact::class, 'contact_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(AccountingInvoiceItem::class, 'invoice_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(AccountingPayment::class, 'invoice_id');
    }
}
