import { Injectable } from '@angular/core';

export type PortalKind = 'marketplace' | 'tenant' | 'admin';

const ADMIN_SUBDOMAINS = new Set(['admin', 'superadmin', 'platform']);
const TENANT_CONSOLE_SUBDOMAINS = new Set(['tenant', 'tenants', 'seller', 'sellers', 'console']);
const RESERVED_SUBDOMAINS = new Set([
  ...ADMIN_SUBDOMAINS,
  ...TENANT_CONSOLE_SUBDOMAINS,
  'api',
  'app',
  'www',
  'market',
  'marketplace',
]);

@Injectable({ providedIn: 'root' })
export class PortalService {
  host(): string {
    return typeof window === 'undefined' ? '' : window.location.hostname.toLowerCase();
  }

  /**
   * The portal requested by the current hostname. Supports:
   * - admin.example.com / superadmin.example.com -> super admin console
   * - tenants.example.com / seller.example.com -> shared tenant console
   * - {tenant-slug}.example.com -> tenant console slug fallback
   */
  hostPortal(hostname = this.host()): PortalKind {
    const first = this.firstLabel(hostname);
    if (!first) return 'marketplace';
    if (ADMIN_SUBDOMAINS.has(first)) return 'admin';
    if (TENANT_CONSOLE_SUBDOMAINS.has(first) || this.looksLikeTenantSlugHost(hostname, first)) return 'tenant';
    return 'marketplace';
  }

  portalForUrl(url: string): PortalKind {
    if (url.startsWith('/admin')) return 'admin';
    if (url.startsWith('/tenant') || url.startsWith('/seller')) return 'tenant';
    return this.hostPortal();
  }

  loginPathForUrl(url: string): string {
    return this.loginPath(this.portalForUrl(url));
  }

  loginPath(portal: PortalKind): string {
    if (portal === 'admin') return '/admin/login';
    if (portal === 'tenant') return '/tenant/login';
    return '/login';
  }

  dashboardForRole(role: string | null | undefined): string {
    if (role === 'super_admin') return '/admin';
    if (role === 'tenant_owner' || role === 'store_staff') return '/tenant';
    return '/';
  }

  marketplaceUrl(path = '/'): string {
    if (typeof window === 'undefined') return path;

    const location = window.location;
    const host = this.host();
    if (!host || host.endsWith('.e2b.app') || host.endsWith('.monkeycode-ai.live')) return path;

    const labels = host.split('.');
    const first = labels[0];
    let marketplaceHost = host;
    if (host.endsWith('.localhost') || (labels.length > 2 && (RESERVED_SUBDOMAINS.has(first) || this.looksLikeTenantSlugHost(host, first)))) {
      marketplaceHost = labels.slice(1).join('.') || host;
    }

    const port = location.port ? `:${location.port}` : '';
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${location.protocol}//${marketplaceHost}${port}${normalizedPath}`;
  }

  /** Example hostnames used in the UI/help text. */
  exampleHost(portal: 'admin' | 'tenant'): string {
    const host = this.host();
    if (!host || host === 'localhost') {
      return portal === 'admin' ? 'admin.localhost' : 'tenants.localhost';
    }
    if (host.endsWith('.e2b.app') || host.endsWith('.monkeycode-ai.live')) {
      return portal === 'admin' ? 'admin.markethub.test' : 'tenants.markethub.test';
    }

    const labels = host.split('.');
    const first = labels[0];
    const root = labels.length > 2 && RESERVED_SUBDOMAINS.has(first) ? labels.slice(1).join('.') : host;

    return portal === 'admin' ? `admin.${root}` : `tenants.${root}`;
  }

  private firstLabel(hostname: string): string | null {
    const clean = hostname.replace(/:\d+$/, '').toLowerCase();
    if (!clean || clean === 'localhost') return null;
    return clean.split('.')[0] || null;
  }

  private looksLikeTenantSlugHost(hostname: string, first: string): boolean {
    if (!first || RESERVED_SUBDOMAINS.has(first)) return false;

    // Arena/live-preview hosts are infrastructure hosts, not tenant slugs.
    if (hostname.endsWith('.e2b.app') || hostname.endsWith('.monkeycode-ai.live')) return false;

    if (hostname.endsWith('.localhost')) return true;
    return hostname.split('.').length >= 3;
  }
}
