<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AccountingAccount extends Model
{
    use Auditable, BelongsToTenant;

    public const TYPES = ['asset', 'liability', 'equity', 'income', 'expense'];

    protected $fillable = [
        'tenant_id', 'code', 'name', 'type', 'subtype', 'system_key',
        'description', 'is_system', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_system' => 'boolean', 'is_active' => 'boolean'];
    }

    public function lines(): HasMany
    {
        return $this->hasMany(AccountingJournalLine::class, 'account_id');
    }
}
