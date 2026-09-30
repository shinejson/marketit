<?php

namespace App\Policies;

use App\Models\Store;
use App\Models\Tenant;
use App\Models\User;

class StorePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isTenantOwner() || $user->isStoreStaff() || $user->isSuperAdmin();
    }

    public function view(User $user, Store $store): bool
    {
        return $this->owns($user, $store);
    }

    /** Only approved tenants may open a store. */
    public function create(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if (! $user->isTenantOwner()) {
            return false;
        }

        $tenantId = $user->tenantId();

        return $tenantId !== null
            && Tenant::query()->whereKey($tenantId)->where('status', Tenant::STATUS_ACTIVE)->exists();
    }

    public function update(User $user, Store $store): bool
    {
        return $this->owns($user, $store) && ($user->isTenantOwner() || $user->isSuperAdmin());
    }

    public function delete(User $user, Store $store): bool
    {
        return $this->owns($user, $store) && $user->isTenantOwner();
    }

    protected function owns(User $user, Store $store): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return (int) $user->tenantId() === (int) $store->tenant_id;
    }
}
