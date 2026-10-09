/**
 * Tenant permission keys understood by the console, mirrored from
 * `App\Models\TenantRole::permissionGroups()` on the API.
 *
 * These only drive navigation and route redirects. The API re-checks every one
 * of them on every request, so hiding a link here is convenience, never the
 * security boundary.
 */

/** Permissions that unlock at least one report in the tenant Report Center. */
export const REPORT_VIEW_PERMISSIONS = [
  'analytics.view',
  'orders.view',
  'inventory.view',
  'catalog.view',
  'finance.view',
  'customers.view',
  'marketing.view',
  'team.view',
] as const;
