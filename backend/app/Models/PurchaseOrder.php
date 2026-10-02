<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    use Auditable, BelongsToTenant;

    public const STATUSES = ['draft', 'pending_approval', 'approved', 'ordered', 'partially_received', 'received', 'cancelled'];
    public const TRANSITIONS = [
        'draft' => ['pending_approval', 'approved', 'cancelled'],
        'pending_approval' => ['approved', 'draft', 'cancelled'],
        'approved' => ['ordered', 'cancelled'],
        'ordered' => ['partially_received', 'received', 'cancelled'],
        'partially_received' => ['received', 'cancelled'],
        'received' => [],
        'cancelled' => [],
    ];

    protected $fillable = [
        'tenant_id', 'vendor_id', 'created_by', 'approved_by', 'number', 'vendor_name',
        'order_date', 'expected_date', 'status', 'subtotal', 'tax_total', 'total',
        'currency', 'notes', 'approved_at', 'received_at',
    ];

    protected function casts(): array
    {
        return [
            'order_date' => 'date:Y-m-d', 'expected_date' => 'date:Y-m-d',
            'approved_at' => 'datetime', 'received_at' => 'datetime',
            'subtotal' => 'decimal:2', 'tax_total' => 'decimal:2', 'total' => 'decimal:2',
        ];
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(AccountingContact::class, 'vendor_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }
}
