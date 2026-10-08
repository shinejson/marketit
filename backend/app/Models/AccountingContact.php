<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AccountingContact extends Model
{
    use Auditable, BelongsToTenant;

    public const TYPES = ['customer', 'vendor', 'both'];

    protected $fillable = [
        'tenant_id', 'type', 'name', 'email', 'phone', 'tax_id', 'address',
        'currency', 'payment_terms', 'opening_balance', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'payment_terms' => 'integer',
            'opening_balance' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(AccountingInvoice::class, 'contact_id');
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class, 'vendor_id');
    }

    /** Bills raised against this contact (vendor side of the relationship). */
    public function expenses(): HasMany
    {
        return $this->hasMany(AccountingExpense::class, 'vendor_id');
    }
}
