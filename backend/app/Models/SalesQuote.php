<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesQuote extends Model
{
    use Auditable, BelongsToTenant;

    public const STATUSES = ['draft', 'sent', 'accepted', 'declined', 'expired', 'void'];

    public const TRANSITIONS = [
        'draft' => ['sent', 'void'],
        'sent' => ['accepted', 'declined', 'expired', 'void', 'draft'],
        'accepted' => [],
        'declined' => ['draft'],
        'expired' => ['sent', 'draft'],
        'void' => [],
    ];

    protected $fillable = [
        'tenant_id', 'customer_id', 'customer_user_id', 'source', 'request_message',
        'opportunity_id', 'created_by', 'number',
        'customer_name', 'customer_email', 'issue_date', 'expiry_date', 'status',
        'subtotal', 'tax_total', 'discount_total', 'total', 'currency', 'notes',
        'sent_at', 'accepted_at',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date:Y-m-d',
            'expiry_date' => 'date:Y-m-d',
            'sent_at' => 'datetime',
            'accepted_at' => 'datetime',
            'subtotal' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(SalesCustomer::class, 'customer_id');
    }

    /** Marketplace account that raised this quote as a customer request. */
    public function customerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_user_id');
    }

    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(SalesOpportunity::class, 'opportunity_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SalesQuoteItem::class, 'quote_id');
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }
}
