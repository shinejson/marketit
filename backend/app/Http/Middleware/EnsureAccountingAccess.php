<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Restricts sensitive books to tenant owners and finance-assigned staff. */
class EnsureAccountingAccess
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

        $hasFinanceRole = $user->roles->contains(fn ($role) =>
            $role->role === 'store_staff'
            && (int) $role->tenant_id === (int) $tenantId
            && $role->department === 'finance'
        );
        abort_unless($hasFinanceRole, 403, 'Finance department access is required.');

        return $next($request);
    }
}
