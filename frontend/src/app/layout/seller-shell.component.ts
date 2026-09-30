import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-seller-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="dash">
      <aside>
        <a [routerLink]="tenantLink()" class="brand serif">MarketHub</a>
        <p class="muted">Tenant console</p>
        <nav>
          <a [routerLink]="tenantLink()" routerLinkActive="on" [routerLinkActiveOptions]="{exact:true}">Dashboard</a>
          <p class="label">Departments</p>
          @for (d of departments; track d.key) {
            <a [routerLink]="tenantLink('departments/' + d.key)" routerLinkActive="on">{{ d.label }}</a>
          }
          <p class="label">Commerce</p>
          <a [routerLink]="tenantLink('stores')" routerLinkActive="on">Stores</a>
          <a [routerLink]="tenantLink('orders')" routerLinkActive="on">Orders</a>
          <a [routerLink]="tenantLink('products')" routerLinkActive="on">Products</a>
          <a [routerLink]="tenantLink('inventory')" routerLinkActive="on">Inventory</a>
          <a [routerLink]="tenantLink('ads')" routerLinkActive="on">Ads</a>
          <a [routerLink]="tenantLink('analytics')" routerLinkActive="on">Analytics</a>
          @if (isOwner()) {
            <p class="label">Admin</p>
            <a [routerLink]="tenantLink('users')" routerLinkActive="on">Users</a>
            <a [routerLink]="tenantLink('settings')" routerLinkActive="on">Settings</a>
            <a [routerLink]="tenantLink('backups')" routerLinkActive="on">Backups</a>
            <a [routerLink]="tenantLink('domains')" routerLinkActive="on">Domains</a>
            <a [routerLink]="tenantLink('api-keys')" routerLinkActive="on">API keys</a>
            <a [routerLink]="tenantLink('webhooks')" routerLinkActive="on">Webhooks</a>
            <a [routerLink]="tenantLink('ai')" routerLinkActive="on">AI</a>
          }
        </nav>
        <button class="btn ghost" (click)="auth.logout()">Log out</button>
      </aside>
      <section class="body"><router-outlet /></section>
    </div>
  `,
  styles: [`
    .dash { display:grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
    aside { padding: 28px 20px; border-right: 1px solid var(--line); background: #f7f1e4; display:flex; flex-direction:column; gap: 12px; }
    .brand { font-size: 22px; }
    nav { display:flex; flex-direction:column; gap: 4px; margin: 16px 0 auto; }
    nav a { padding: 8px 12px; border-radius: 12px; font-weight: 600; }
    nav a.on { background: var(--ink); color: #fff; }
    .label { margin: 12px 12px 4px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); font-weight: 700; }
    .body { padding: 28px; }
    @media (max-width: 800px) { .dash { grid-template-columns: 1fr; } aside { position: static; } }
  `],
})
export class SellerShellComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  isOwner = computed(() => this.auth.hasRole('tenant_owner'));
  departments = [
    { key: 'finance', label: 'Finance' },
    { key: 'sales', label: 'Sales' },
    { key: 'operations', label: 'Operations' },
    { key: 'marketing', label: 'Marketing' },
  ];

  tenantLink(path = ''): string {
    const base = this.router.url.startsWith('/seller') ? '/seller' : '/tenant';
    return path ? `${base}/${path}` : base;
  }
}
