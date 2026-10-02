import { Routes } from '@angular/router';
import { authGuard, marketingPortalGuard, roleGuard } from './core/auth.guard';

const tenantConsoleChildren: Routes = [
  { path: '', loadComponent: () => import('./features/seller/dashboard.component').then((m) => m.SellerDashboardComponent) },
  { path: 'stores', loadComponent: () => import('./features/seller/stores.component').then((m) => m.SellerStoresComponent) },
  { path: 'products', loadComponent: () => import('./features/seller/products.component').then((m) => m.SellerProductsComponent) },
  { path: 'orders', loadComponent: () => import('./features/seller/orders.component').then((m) => m.SellerOrdersComponent) },
  { path: 'inventory', loadComponent: () => import('./features/seller/inventory.component').then((m) => m.SellerInventoryComponent) },
  { path: 'ads', loadComponent: () => import('./features/seller/ads.component').then((m) => m.SellerAdsComponent) },
  { path: 'domains', loadComponent: () => import('./features/seller/domains.component').then((m) => m.SellerDomainsComponent) },
  { path: 'api-keys', loadComponent: () => import('./features/seller/api-keys.component').then((m) => m.SellerApiKeysComponent) },
  { path: 'webhooks', loadComponent: () => import('./features/seller/webhooks.component').then((m) => m.SellerWebhooksComponent) },
  { path: 'ai', loadComponent: () => import('./features/seller/ai.component').then((m) => m.SellerAiComponent) },
  { path: 'analytics', loadComponent: () => import('./features/seller/analytics.component').then((m) => m.SellerAnalyticsComponent) },
  { path: 'departments/:dept', loadComponent: () => import('./features/seller/department.component').then((m) => m.SellerDepartmentComponent) },
  { path: 'users', loadComponent: () => import('./features/seller/users.component').then((m) => m.SellerUsersComponent) },
  { path: 'settings', loadComponent: () => import('./features/seller/settings.component').then((m) => m.SellerSettingsComponent) },
  { path: 'backups', loadComponent: () => import('./features/seller/backups.component').then((m) => m.SellerBackupsComponent) },
  { path: 'support', loadComponent: () => import('./features/seller/support.component').then((m) => m.TenantSupportComponent) },
];

export const routes: Routes = [
  {
    path: 'admin/login',
    loadComponent: () => import('./features/auth/console-login.component').then((m) => m.ConsoleLoginComponent),
    data: { portal: 'admin' },
  },
  {
    path: 'tenant/login',
    loadComponent: () => import('./features/auth/console-login.component').then((m) => m.ConsoleLoginComponent),
    data: { portal: 'tenant' },
  },
  { path: 'seller/login', redirectTo: 'tenant/login' },
  {
    path: '',
    canActivate: [marketingPortalGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./features/marketplace/home.component').then((m) => m.HomeComponent) },
      { path: 'products', loadComponent: () => import('./features/marketplace/catalog.component').then((m) => m.CatalogComponent) },
      { path: 'products/:slug', loadComponent: () => import('./features/marketplace/product.component').then((m) => m.ProductComponent) },
      { path: 'stores', loadComponent: () => import('./features/marketplace/stores.component').then((m) => m.StoresComponent) },
      { path: 'stores/:slug', loadComponent: () => import('./features/marketplace/store.component').then((m) => m.StoreComponent) },
      { path: 'login', loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent) },
      { path: 'cart', canActivate: [authGuard], loadComponent: () => import('./features/customer/cart.component').then((m) => m.CartComponent) },
      { path: 'checkout', canActivate: [authGuard], loadComponent: () => import('./features/customer/checkout.component').then((m) => m.CheckoutComponent) },
      { path: 'orders', canActivate: [authGuard], loadComponent: () => import('./features/customer/orders.component').then((m) => m.OrdersComponent) },
      { path: 'orders/:id', canActivate: [authGuard], loadComponent: () => import('./features/customer/order-detail.component').then((m) => m.OrderDetailComponent) },
      { path: 'sell', canActivate: [authGuard], loadComponent: () => import('./features/auth/sell.component').then((m) => m.SellComponent) },
    ],
  },
  {
    path: 'tenant',
    canActivate: [roleGuard('tenant_owner', 'store_staff')],
    loadComponent: () => import('./layout/seller-shell.component').then((m) => m.SellerShellComponent),
    children: tenantConsoleChildren,
  },
  {
    path: 'seller',
    canActivate: [roleGuard('tenant_owner', 'store_staff')],
    loadComponent: () => import('./layout/seller-shell.component').then((m) => m.SellerShellComponent),
    children: tenantConsoleChildren,
  },
  {
    path: 'admin',
    canActivate: [roleGuard('super_admin')],
    loadComponent: () => import('./layout/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', loadComponent: () => import('./features/admin/dashboard.component').then((m) => m.AdminDashboardComponent) },
      { path: 'tenants', loadComponent: () => import('./features/admin/tenants.component').then((m) => m.AdminTenantsComponent) },
      { path: 'users', loadComponent: () => import('./features/admin/users.component').then((m) => m.AdminUsersComponent) },
      { path: 'subscriptions', loadComponent: () => import('./features/admin/subscriptions.component').then((m) => m.AdminSubscriptionsComponent) },
      { path: 'settings', loadComponent: () => import('./features/admin/settings.component').then((m) => m.AdminSettingsComponent) },
      { path: 'orders', loadComponent: () => import('./features/admin/orders.component').then((m) => m.AdminOrdersComponent) },
      { path: 'audit', loadComponent: () => import('./features/admin/audit.component').then((m) => m.AdminAuditComponent) },
      { path: 'analytics', loadComponent: () => import('./features/admin/analytics.component').then((m) => m.AdminAnalyticsComponent) },
      { path: 'domains', loadComponent: () => import('./features/admin/domains.component').then((m) => m.AdminDomainsComponent) },
      { path: 'ads', loadComponent: () => import('./features/admin/ads.component').then((m) => m.AdminAdsComponent) },
      {
        path: 'support',
        loadComponent: () => import('./features/admin/support-overview.component').then((m) => m.AdminSupportOverviewComponent),
      },
      {
        path: 'support/tickets',
        loadComponent: () => import('./features/admin/support-tickets.component').then((m) => m.AdminSupportTicketsComponent),
      },
      {
        path: 'support/chats',
        loadComponent: () => import('./features/admin/support-chats.component').then((m) => m.AdminSupportChatsComponent),
      },
      {
        path: 'support/tasks',
        loadComponent: () => import('./features/admin/support-tasks.component').then((m) => m.AdminSupportTasksComponent),
      },
      {
        path: 'support/guides',
        loadComponent: () => import('./features/admin/support-guides.component').then((m) => m.AdminSupportGuidesComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
