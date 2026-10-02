<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesCustomer extends Model
{
    use Auditable, BelongsToTenant;

    public const STATUSES = ['active', 'inactive'];
    public const SEGMENTS = ['standard', 'wholesale', 'retail', 'enterprise', 'vip'];

    protected $fillable = [
        'tenant_id', 'created_by', 'name', 'company', 'email', 'phone',
        'segment', 'status', 'currency', 'notes',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(SalesLead::class, 'converted_customer_id');
    }

    public function opportunities(): HasMany
    {
        return $this->hasMany(SalesOpportunity::class, 'customer_id');
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(SalesQuote::class, 'customer_id');
    }
}
