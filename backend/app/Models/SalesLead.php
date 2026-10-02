<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesLead extends Model
{
    use Auditable, BelongsToTenant;

    public const STATUSES = ['new', 'contacted', 'qualified', 'disqualified', 'converted'];
    public const SOURCES = ['web', 'referral', 'campaign', 'walk_in', 'partner', 'other'];

    public const TRANSITIONS = [
        'new' => ['contacted', 'qualified', 'disqualified'],
        'contacted' => ['qualified', 'disqualified'],
        'qualified' => ['disqualified', 'converted', 'contacted'],
        'disqualified' => ['new'],
        'converted' => [],
    ];

    protected $fillable = [
        'tenant_id', 'owner_id', 'created_by', 'converted_customer_id', 'name', 'company',
        'email', 'phone', 'source', 'status', 'estimated_value', 'currency', 'notes',
        'last_contacted_at', 'converted_at',
    ];

    protected function casts(): array
    {
        return [
            'estimated_value' => 'decimal:2',
            'last_contacted_at' => 'datetime',
            'converted_at' => 'datetime',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(SalesCustomer::class, 'converted_customer_id');
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }

    public function isConverted(): bool
    {
        return $this->status === 'converted';
    }
}
