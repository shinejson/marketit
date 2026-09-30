import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-seller-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="dash">
      <aside>
        <a routerLink="/" class="brand serif">MarketHub</a>
        <p class="muted">Tenant console</p>
        <nav>
          <a routerLink="/seller" routerLinkActive="on" [routerLinkActiveOptions]="{exact:true}">Dashboard</a>
          <p class="label">Departments</p>
          @for (d of departments; track d.key) {
            <a [routerLink]="'/seller/departments/' + d.key" routerLinkActive="on">{{ d.label }}</a>
          }
          <p class="label">Commerce</p>
          <a routerLink="/seller/orders" routerLinkActive="on">Orders</a>
          <a routerLink="/seller/products" routerLinkActive="on">Products</a>
          <a routerLink="/seller/inventory" routerLinkActive="on">Inventory</a>
          <a routerLink="/seller/ads" routerLinkActive="on">Ads</a>
          <a routerLink="/seller/analytics" routerLinkActive="on">Analytics</a>
          @if (isOwner()) {
            <p class="label">Admin</p>
            <a routerLink="/seller/users" routerLinkActive="on">Users</a>
            <a routerLink="/seller/settings" routerLinkActive="on">Settings</a>
            <a routerLink="/seller/backups" routerLinkActive="on">Backups</a>
            <a routerLink="/seller/domains" routerLinkActive="on">Domains</a>
            <a routerLink="/seller/api-keys" routerLinkActive="on">API keys</a>
            <a routerLink="/seller/webhooks" routerLinkActive="on">Webhooks</a>
            <a routerLink="/seller/ai" routerLinkActive="on">AI</a>
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
    @media (max-width: 800px) { .dash { grid-template-columns: 1fr; } }
  `],
})
export class SellerShellComponent {
  auth = inject(AuthService);
  isOwner = computed(() => this.auth.hasRole('tenant_owner'));
  departments = [
    { key: 'finance', label: 'Finance' },
    { key: 'sales', label: 'Sales' },
    { key: 'operations', label: 'Operations' },
    { key: 'marketing', label: 'Marketing' },
  ];
}
