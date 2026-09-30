import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="dash">
      <aside>
        <a routerLink="/" class="brand serif">MarketHub</a>
        <p class="muted">Super admin</p>
        <nav>
          <p class="section">Overview</p>
          <a routerLink="/admin" routerLinkActive="on" [routerLinkActiveOptions]="{exact:true}">Dashboard</a>
          <a routerLink="/admin/analytics" routerLinkActive="on">Analytics</a>

          <p class="section">Manage</p>
          <a routerLink="/admin/tenants" routerLinkActive="on">Tenants</a>
          <a routerLink="/admin/users" routerLinkActive="on">Users</a>
          <a routerLink="/admin/subscriptions" routerLinkActive="on">Subscriptions</a>
          <a routerLink="/admin/orders" routerLinkActive="on">Orders</a>

          <p class="section">Platform</p>
          <a routerLink="/admin/domains" routerLinkActive="on">Domains</a>
          <a routerLink="/admin/ads" routerLinkActive="on">Ads</a>
          <a routerLink="/admin/audit" routerLinkActive="on">Audit log</a>
          <a routerLink="/admin/settings" routerLinkActive="on">Settings</a>
        </nav>
        <button class="btn ghost" (click)="auth.logout()">Log out</button>
      </aside>
      <section class="body"><router-outlet /></section>
    </div>
  `,
  styles: [`
    .dash { display:grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
    aside { position: sticky; top: 0; height: 100vh; padding: 28px 20px; border-right: 1px solid var(--line); background: #1c1914; color: #f4efe6; display:flex; flex-direction:column; gap: 12px; }
    .brand { font-size: 22px; }
    .muted { color: #cfc6b4; }
    nav { display:flex; flex-direction:column; gap: 4px; margin: 16px 0 auto; overflow-y: auto; }
    .section { margin: 14px 0 4px; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #9a9181; }
    nav a { padding: 9px 12px; border-radius: 12px; font-weight: 600; font-size: 14px; }
    nav a:hover { background: rgba(255,255,255,.07); }
    nav a.on { background: #c45c26; color: #fff; }
    .body { padding: 28px; }
    .btn.ghost { color: #f4efe6; border-color: #4a453c; }
  `],
})
export class AdminShellComponent {
  auth = inject(AuthService);
}
