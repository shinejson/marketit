<?php

namespace App\Models;

use App\Support\TenantAccess;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'status',
        'avatar_url',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function roles(): HasMany
    {
        return $this->hasMany(UserRole::class);
    }

    public function socialIdentities(): HasMany
    {
        return $this->hasMany(SocialIdentity::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function cart(): HasOne
    {
        return $this->hasOne(Cart::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }

    public function ownedTenants(): HasMany
    {
        return $this->hasMany(Tenant::class, 'owner_user_id');
    }

    public function hasRole(string $role, ?int $tenantId = null): bool
    {
        return $this->roles->contains(function (UserRole $userRole) use ($role, $tenantId) {
            if ($userRole->role !== $role) {
                return false;
            }
            if ($tenantId === null) {
                return true;
            }

            return (int) $userRole->tenant_id === $tenantId;
        });
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    public function isTenantOwner(?int $tenantId = null): bool
    {
        return $this->hasRole('tenant_owner', $tenantId);
    }

    public function isStoreStaff(?int $tenantId = null): bool
    {
        return $this->hasRole('store_staff', $tenantId);
    }

    public function isCustomer(): bool
    {
        return $this->hasRole('customer') || $this->roles->isEmpty();
    }

    public function tenantId(): ?int
    {
        $role = $this->roles->first(fn (UserRole $r) => in_array($r->role, ['tenant_owner', 'store_staff'], true));

        return $role?->tenant_id;
    }

    /**
     * Permissions this user holds inside a tenant. Tenant owners resolve to the
     * full catalog; staff resolve to their assigned tenant role plus any
     * per-user overrides.
     *
     * @return string[]
     */
    public function tenantPermissions(?int $tenantId = null): array
    {
        return TenantAccess::permissionsFor($this, $tenantId);
    }

    public function hasTenantPermission(string $permission, ?int $tenantId = null): bool
    {
        return TenantAccess::allows($this, $permission, $tenantId);
    }

    /** A tenant can lock a staff member out without deleting the account. */
    public function tenantAccessSuspended(?int $tenantId = null): bool
    {
        return TenantAccess::isSuspended($this, $tenantId);
    }

    public function primaryRole(): string
    {
        if ($this->isSuperAdmin()) {
            return 'super_admin';
        }
        if ($this->isTenantOwner()) {
            return 'tenant_owner';
        }
        if ($this->isStoreStaff()) {
            return 'store_staff';
        }
        if ($this->isCustomer()) {
            return 'customer';
        }

        // Custom roles are managed from the platform console. They do not
        // replace the built-in portal roles above, but should still surface as
        // the user's primary role in administration responses.
        return $this->roles->first()?->role ?? 'customer';
    }
}
