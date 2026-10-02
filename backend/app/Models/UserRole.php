<?php

namespace App\Models;

use App\Support\TenantAccess;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserRole extends Model
{
    protected $fillable = [
        'user_id',
        'role',
        'tenant_id',
        'store_id',
        'department',
        'tenant_role_id',
        'permissions',
        'status',
        'title',
        'invited_at',
    ];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'invited_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function tenantRole(): BelongsTo
    {
        return $this->belongsTo(TenantRole::class, 'tenant_role_id');
    }

    /** True when this assignment carries its own permission list. */
    public function hasCustomPermissions(): bool
    {
        return is_array($this->permissions);
    }

    /** @return string[] */
    public function effectivePermissions(): array
    {
        return TenantAccess::permissionsForAssignment($this);
    }

    public function isActive(): bool
    {
        return ($this->status ?? TenantAccess::STATUS_ACTIVE) !== TenantAccess::STATUS_SUSPENDED;
    }
}
