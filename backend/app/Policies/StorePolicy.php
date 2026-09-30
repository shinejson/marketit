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

    /** Tenant owners can prepare draft stores while pending; publishing requires tenant approval. */
    public function create(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if (! $user->isTenantOwner()) {
            return false;
        }

        $tenantId = $user->tenantId();
        $tenant = $tenantId ? Tenant::query()->find($tenantId) : null;

        return (bool) $tenant?->canCreateStore();
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
