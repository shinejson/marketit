<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Restricts the sales workspace to tenant owners and sales-assigned staff. */
class EnsureSalesAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user, 401, 'Authentication required.');
        $user->loadMissing('roles');

        $tenantId = $user->tenantId();
        if ($tenantId && $user->isTenantOwner($tenantId)) {
            return $next($request);
        }

        $hasSalesRole = $user->roles->contains(fn ($role) =>
            $role->role === 'store_staff'
            && (int) $role->tenant_id === (int) $tenantId
            && $role->department === 'sales'
        );
        abort_unless($hasSalesRole, 403, 'Sales department access is required.');

        return $next($request);
    }
}
