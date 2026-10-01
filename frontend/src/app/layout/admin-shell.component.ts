import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet],
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

    <!-- SVG Icon Templates -->
    <ng-template #navIcon let-name>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        @switch (name) {
          @case ('dashboard') {
            <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" />
          }
          @case ('analytics') {
            <line x1="4" y1="20" x2="20" y2="20" /><rect x="6" y="11" width="3" height="7" /><rect x="13" y="7" width="3" height="11" /><rect x="17.5" y="13" width="3" height="5" />
          }
          @case ('tenants') {
            <path d="M3 9l1.5-5h15L21 9" /><path d="M5 9v11h14V9" /><path d="M9.5 20v-5.5h5V20" />
          }
          @case ('users') {
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          }
          @case ('subscriptions') {
            <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /><path d="M7 15h2" /><path d="M13 15h4" />
          }
          @case ('orders') {
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          }
          @case ('domains') {
            <circle cx="12" cy="12" r="9" /><line x1="3" y1="12" x2="21" y2="12" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
          }
          @case ('ads') {
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" />
          }
          @case ('audit') {
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
          }
          @case ('settings') {
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .7.4 1.31 1.05 1.6.31.14.65.22 1 .25l.5.01a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          }
          @case ('search') {
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          }
          @case ('bell') {
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          }
          @case ('sun') {
            <circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
          }
          @case ('moon') {
            <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
          }
          @case ('chevron') {
            <polyline points="6 9 12 15 18 9" />
          }
          @case ('menu') {
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          }
        }
      </svg>
    </ng-template>

    <ng-template #miniIcon let-name>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        @switch (name) {
          @case ('logout') {
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          }
        }
      </svg>
    </ng-template>
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
