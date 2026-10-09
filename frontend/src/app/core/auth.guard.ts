import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { PortalService } from './portal.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const portal = inject(PortalService);
  if (auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree([portal.loginPathForUrl(state.url)]);
};

export const roleGuard = (...roles: string[]): CanActivateFn => {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const portal = inject(PortalService);
    if (!auth.isLoggedIn()) {
      return router.createUrlTree([portal.loginPathForUrl(state.url)]);
    }
    if (!auth.hasRole(...roles)) {
      return router.createUrlTree([portal.dashboardForRole(auth.role())]);
    }
    return true;
  };
};

/**
 * Tenant permission gate for console pages, e.g. `permissionGuard('finance.view')`.
 *
 * This is a convenience redirect only — every permission is enforced again by
 * the API on each request, so a hand-edited URL never widens what someone can
 * read. Sessions created before the API started returning permissions carry no
 * list at all; those are let through so the page can ask the server itself.
 */
export const permissionGuard = (...permissions: string[]): CanActivateFn => {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const portal = inject(PortalService);
    if (!auth.isLoggedIn()) {
      return router.createUrlTree([portal.loginPathForUrl(state.url)]);
    }
    if (auth.permissionsKnown() && !auth.hasPermission(...permissions)) {
      return router.createUrlTree([portal.dashboardForRole(auth.role())]);
    }
    return true;
  };
};

/** Keeps console subdomains from rendering the public marketplace shell. */
export const marketingPortalGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const portal = inject(PortalService);
  const requestedPortal = portal.hostPortal();

  if (requestedPortal === 'marketplace') {
    return true;
  }

  let target = portal.loginPath(requestedPortal);
  if (requestedPortal === 'admin' && auth.hasRole('super_admin')) {
    target = '/admin';
  }
  if (requestedPortal === 'tenant' && auth.hasRole('tenant_owner', 'store_staff')) {
    target = '/tenant';
  }

  return router.createUrlTree([target]);
};
