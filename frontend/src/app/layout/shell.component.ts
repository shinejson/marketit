import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: 'home' | 'bag' | 'store' | 'cart' | 'orders';
  exact: boolean;
}

interface ActionLink {
  path: string;
  label: string;
  ghost: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet],
  template: `
    <header class="top">
      <div class="wrap bar">
        <a routerLink="/" class="brand serif" (click)="closeMenu()">MarketHub</a>

        <!-- Desktop nav: centered, icons + labels (hidden on small screens) -->
        <nav class="desktop-nav">
          @for (item of navItems(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: item.exact }" (click)="closeMenu()">
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: item.icon }" />
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <!-- Desktop auth actions -->
        <div class="actions desktop-actions">
          @for (a of actionLinks(); track a.path) {
            <a [routerLink]="a.path" class="btn" [class.ghost]="a.ghost" (click)="closeMenu()">{{ a.label }}</a>
          }
          @if (auth.isLoggedIn()) {
            <button class="btn" (click)="auth.logout()">Log out</button>
          }
        </div>

        <!-- Hamburger (small screens) -->
        <button
          type="button"
          class="burger"
          (click)="toggleMenu()"
          [attr.aria-expanded]="menuOpen()"
          aria-controls="mobile-menu"
          [attr.aria-label]="menuOpen() ? 'Close menu' : 'Open menu'"
        >
          @if (menuOpen()) {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          } @else {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          }
        </button>
      </div>

      <!-- Mobile menu panel -->
      <div class="mobile-panel" id="mobile-menu" [class.open]="menuOpen()">
        <div class="wrap panel-inner">
          <nav class="mobile-nav">
            @for (item of navItems(); track item.path) {
              <a [routerLink]="item.path" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: item.exact }" (click)="closeMenu()">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: item.icon }" />
                <span>{{ item.label }}</span>
              </a>
            }
          </nav>
          <div class="panel-actions">
            @for (a of actionLinks(); track a.path) {
              <a [routerLink]="a.path" class="btn" [class.ghost]="a.ghost" (click)="closeMenu()">{{ a.label }}</a>
            }
            @if (auth.isLoggedIn()) {
              <button class="btn" (click)="auth.logout()">Log out</button>
            }
          </div>
        </div>
      </div>
    </header>
    <main><router-outlet /></main>
    <footer>
      <div class="wrap">
        <p class="serif">One marketplace. Many stores.</p>
        <p class="muted">Phase 1 marketplace SaaS — demo accounts use password <code>password</code>.</p>
      </div>
    </footer>

    <!-- Shared nav icon -->
    <ng-template #navIcon let-name>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        @switch (name) {
          @case ('home') {
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
          }
          @case ('bag') {
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
          }
          @case ('store') {
            <path d="M3 9l1.5-5h15L21 9" /><path d="M5 9v11h14V9" /><path d="M9.5 20v-5.5h5V20" />
          }
          @case ('cart') {
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          }
          @case ('orders') {
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          }
        }
      </svg>
    </ng-template>
  `,
  styles: [`
    .top { position: sticky; top: 0; z-index: 20; background: rgba(244,239,230,.92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
    .bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 20px; min-height: 72px; }
    .brand { font-size: 26px; justify-self: start; }
    .desktop-nav { display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; }
    .desktop-nav a {
      display: inline-flex; align-items: center; gap: 7px;
      font-weight: 600; color: var(--ink-soft);
      padding: 8px 14px; border-radius: 999px;
      transition: color .15s ease, background .15s ease;
    }
    .desktop-nav a:hover { color: var(--ink); background: var(--paper-2); }
    .desktop-nav a.on { color: var(--accent); background: rgba(196, 92, 38, .12); }
    .desktop-nav a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .desktop-nav svg { width: 18px; height: 18px; flex: none; }
    .actions { display:flex; gap: 8px; align-items:center; justify-content: flex-end; flex-wrap: wrap; justify-self: end; }

    /* Hamburger + mobile panel (small screens only) */
    .burger {
      display: none;
      align-items: center; justify-content: center;
      width: 42px; height: 42px; padding: 0;
      border: 1px solid var(--line); border-radius: 12px;
      background: var(--card); color: var(--ink); cursor: pointer;
    }
    .burger svg { width: 20px; height: 20px; }
    .burger:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .mobile-panel {
      display: none;
      max-height: 0; overflow: hidden;
      border-top: 1px solid transparent;
      transition: max-height .25s ease;
    }
    .mobile-panel.open { max-height: 520px; border-top-color: var(--line); }

    main { min-height: calc(100vh - 200px); }
    footer { padding: 40px 0 56px; border-top: 1px solid var(--line); }

    @media (max-width: 720px) {
      .bar { display: flex; justify-content: space-between; padding: 10px 0; gap: 10px; }
      .brand { font-size: 24px; }
      .desktop-nav, .desktop-actions { display: none; }
      .burger { display: inline-flex; margin-left: auto; }
      .mobile-panel { display: block; }
      .panel-inner { padding: 10px 0 16px; }
      .mobile-nav { display: flex; flex-direction: column; gap: 2px; }
      .mobile-nav a {
        display: flex; align-items: center; gap: 10px;
        padding: 12px; border-radius: 12px;
        font-weight: 600; color: var(--ink-soft);
      }
      .mobile-nav a:hover { color: var(--ink); background: var(--paper-2); }
      .mobile-nav a.on { color: var(--accent); background: rgba(196, 92, 38, .12); }
      .mobile-nav svg { width: 18px; height: 18px; flex: none; }
      .panel-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
      .panel-actions .btn { flex: 1 1 auto; }
    }

    @media (max-width: 400px) {
      .brand { font-size: 21px; }
      .burger { width: 40px; height: 40px; }
      .mobile-nav a { padding: 11px 10px; }
    }
  `],
})
export class ShellComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  menuOpen = signal(false);

  private readonly baseNav: NavItem[] = [
    { path: '/', label: 'Home', icon: 'home', exact: true },
    { path: '/products', label: 'Products', icon: 'bag', exact: false },
    { path: '/stores', label: 'Stores', icon: 'store', exact: false },
    { path: '/cart', label: 'Cart', icon: 'cart', exact: false },
    { path: '/orders', label: 'Orders', icon: 'orders', exact: false },
  ];

  /** Cart and Orders only make sense for a signed-in customer. */
  navItems = computed(() => (this.auth.isLoggedIn() ? this.baseNav : this.baseNav.slice(0, 3)));

  /** Guest: Log in / Join. Signed in: role entry points (Log out renders separately). */
  actionLinks = computed<ActionLink[]>(() => {
    if (!this.auth.isLoggedIn()) {
      return [
        { path: '/login', label: 'Log in', ghost: true },
        { path: '/register', label: 'Join', ghost: false },
      ];
    }
    const links: ActionLink[] = [];
    const staff = ['tenant_owner', 'store_staff'];
    if (this.auth.hasRole(...staff)) links.push({ path: '/tenant', label: 'Tenant admin', ghost: true });
    if (this.auth.hasRole('super_admin')) links.push({ path: '/admin', label: 'Admin', ghost: true });
    if (!this.auth.hasRole(...staff, 'super_admin')) links.push({ path: '/sell', label: 'Sell', ghost: true });
    return links;
  });

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.closeMenu());
  }

  toggleMenu() {
    this.menuOpen.update((open) => !open);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMenu();
  }
}
