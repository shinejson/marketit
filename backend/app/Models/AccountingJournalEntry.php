<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AccountingJournalEntry extends Model
{
    use Auditable, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'created_by', 'posted_by', 'number', 'entry_date', 'reference',
        'memo', 'status', 'source_type', 'source_id', 'total_debit', 'total_credit', 'posted_at',
    ];

    protected function casts(): array
    {
        return [
            'entry_date' => 'date:Y-m-d', 'posted_at' => 'datetime',
            'total_debit' => 'decimal:2', 'total_credit' => 'decimal:2',
        ];
    }

    public function lines(): HasMany
    {
        return $this->hasMany(AccountingJournalLine::class, 'journal_entry_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function poster(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }
}
