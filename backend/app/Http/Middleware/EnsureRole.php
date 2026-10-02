<?php

namespace App\Http\Middleware;

use App\Support\TenantAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Authentication required.');
        }

        $user->loadMissing('roles');

        foreach ($roles as $role) {
            if ($role === 'super_admin' && $user->isSuperAdmin()) {
                return $next($request);
            }
            if ($role === 'tenant_owner' && $user->isTenantOwner()) {
                $this->assertTenantAccessActive($user);

                return $next($request);
            }
            if ($role === 'store_staff' && $user->isStoreStaff()) {
                $this->assertTenantAccessActive($user);

                return $next($request);
            }
            if ($role === 'customer' && ($user->isCustomer() || $user->isTenantOwner() || $user->isStoreStaff() || $user->isSuperAdmin())) {
                return $next($request);
            }
            if ($role === 'tenant' && ($user->isTenantOwner() || $user->isStoreStaff())) {
                $this->assertTenantAccessActive($user);

                return $next($request);
            }
        }

        abort(403, 'Insufficient role.');
    }

    /**
     * A tenant admin can suspend a colleague's console access without deleting
     * the account; the assignment stays in place but stops opening doors.
     */
    protected function assertTenantAccessActive($user): void
    {
        abort_if(
            TenantAccess::isSuspended($user),
            403,
            'Your access to this workspace has been suspended by an administrator.'
        );
    }
}
