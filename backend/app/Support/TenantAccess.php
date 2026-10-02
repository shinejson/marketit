<?php

namespace App\Support;

use App\Models\TenantRole;
use App\Models\User;
use App\Models\UserRole;

/**
 * Resolves what a system user may do inside a tenant.
 *
 * Precedence, highest first:
 *   1. Tenant owners are unrestricted — they always hold every permission.
 *   2. An explicit per-user override list on the assignment (`user_roles.permissions`).
 *   3. The permissions of the tenant role the admin assigned.
 *   4. Nothing.
 *
 * A suspended assignment resolves to no permissions at all, which is what the
 * console and middleware use to lock someone out without deleting them.
 */
class TenantAccess
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_INVITED = 'invited';
    public const STATUS_SUSPENDED = 'suspended';

    public const STATUSES = [self::STATUS_ACTIVE, self::STATUS_INVITED, self::STATUS_SUSPENDED];

    /** The portal access levels a tenant may hand out. */
    public const ACCESS_LEVELS = ['tenant_owner', 'store_staff'];

    /** @return string[] */
    public static function permissionsFor(User $user, ?int $tenantId = null): array
    {
        $assignment = self::assignment($user, $tenantId);

        return $assignment ? self::permissionsForAssignment($assignment) : [];
    }

    /** @return string[] */
    public static function permissionsForAssignment(UserRole $assignment): array
    {
        if ($assignment->status === self::STATUS_SUSPENDED) {
            return [];
        }

        if ($assignment->role === 'tenant_owner') {
            return TenantRole::permissionKeys();
        }

        $overrides = $assignment->permissions;
        if (is_array($overrides)) {
            return self::sanitize($overrides);
        }

        $role = $assignment->relationLoaded('tenantRole')
            ? $assignment->tenantRole
            : $assignment->tenantRole()->withoutGlobalScopes()->first();

        return self::sanitize($role?->permissions ?? []);
    }

    public static function allows(User $user, string $permission, ?int $tenantId = null): bool
    {
        return in_array($permission, self::permissionsFor($user, $tenantId), true);
    }

    /** The tenant console assignment (owner or staff) for a user. */
    public static function assignment(User $user, ?int $tenantId = null): ?UserRole
    {
        $user->loadMissing('roles');
        $tenantId ??= $user->tenantId();

        if (! $tenantId) {
            return null;
        }

        return $user->roles->first(fn (UserRole $role) => in_array($role->role, self::ACCESS_LEVELS, true)
            && (int) $role->tenant_id === (int) $tenantId);
    }

    public static function isSuspended(User $user, ?int $tenantId = null): bool
    {
        return self::assignment($user, $tenantId)?->status === self::STATUS_SUSPENDED;
    }

    /** Drop anything that is not in the published catalog. */
    public static function sanitize(array $permissions): array
    {
        $catalog = TenantRole::permissionKeys();

        return array_values(array_unique(array_filter(
            $permissions,
            fn ($permission) => is_string($permission) && in_array($permission, $catalog, true)
        )));
    }
}
