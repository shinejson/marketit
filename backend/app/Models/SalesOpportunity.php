<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesOpportunity extends Model
{
    use Auditable, BelongsToTenant;

    public const STAGES = ['prospecting', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

    public const TRANSITIONS = [
        'prospecting' => ['qualified', 'lost'],
        'qualified' => ['proposal', 'negotiation', 'lost', 'prospecting'],
        'proposal' => ['negotiation', 'won', 'lost', 'qualified'],
        'negotiation' => ['won', 'lost', 'proposal'],
        'won' => [],
        'lost' => ['prospecting'],
    ];

    /** Default close probability applied per stage when none is supplied. */
    public const STAGE_PROBABILITY = [
        'prospecting' => 20,
        'qualified' => 40,
        'proposal' => 60,
        'negotiation' => 80,
        'won' => 100,
        'lost' => 0,
    ];

    protected $fillable = [
        'tenant_id', 'customer_id', 'lead_id', 'owner_id', 'created_by', 'number', 'title',
        'stage', 'expected_value', 'probability', 'currency', 'expected_close_date',
        'lost_reason', 'notes', 'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'expected_value' => 'decimal:2',
            'expected_close_date' => 'date:Y-m-d',
            'closed_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(SalesCustomer::class, 'customer_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(SalesLead::class, 'lead_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(SalesQuote::class, 'opportunity_id');
    }

    public function canTransitionTo(string $stage): bool
    {
        return in_array($stage, self::TRANSITIONS[$this->stage] ?? [], true);
    }

    public function isOpen(): bool
    {
        return ! in_array($this->stage, ['won', 'lost'], true);
    }
}
