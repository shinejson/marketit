import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CurrencyService } from '../core/currency.service';

interface NavItem {
  path: string;
  label: string;
  icon: 'home' | 'bag' | 'store' | 'cart' | 'orders' | 'quote' | 'heart';
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
              @if (item.icon === 'heart' && wishlistCount() > 0) {
                <span class="nav-badge">{{ wishlistCount() }}</span>
              }
            </a>
          }
        </nav>

        <!-- Desktop auth actions -->
        <div class="actions desktop-actions">
          <!-- Shoppers browse in whichever currency they think in; prices are
               converted from each store's own currency at the platform rate. -->
          <label class="currency-picker" title="Show prices in">
            <span>{{ currency.displayMeta().symbol }}</span>
            <select [value]="currency.display()" (change)="onCurrencyChange($event)" aria-label="Display currency">
              @for (c of currency.currencies(); track c.code) { <option [value]="c.code">{{ c.code }}</option> }
            </select>
          </label>
          @for (a of actionLinks(); track a.path) {
            <a [routerLink]="a.path" class="btn" [class.ghost]="a.ghost" (click)="closeMenu()">{{ a.label }}</a>
          }
          @if (auth.isLoggedIn()) {
            <a routerLink="/wishlist" class="wishlist-btn" title="Saved Wishlist" aria-label="View Wishlist" (click)="closeMenu()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="wishlist-icon" aria-hidden="true">
                <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l1.7 1.7L12 21.2l7.1-6.8 1.7-1.7a5 5 0 0 0 0-7.1z" />
              </svg>
              @if (wishlistCount() > 0) {
                <span class="wishlist-badge">{{ wishlistCount() }}</span>
              }
            </a>
            <div class="dropdown-wrap" (click)="$event.stopPropagation()">
              <button
                type="button"
                class="profile-btn"
                (click)="toggleProfile()"
                [attr.aria-expanded]="profileOpen()"
                aria-label="User account menu"
                title="Account menu"
              >
                @if (auth.user()?.avatar_url) {
                  <img [src]="auth.user()?.avatar_url" [alt]="auth.user()?.name" class="avatar-img" />
                } @else {
                  <span class="avatar">{{ initials() }}</span>
                }
                <span class="who">
                  <span class="who-name">{{ auth.user()?.name }}</span>
                  <span class="who-role muted">{{ roleLabel() }}</span>
                </span>
                <svg class="chevron-icon" [class.open]="profileOpen()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              @if (profileOpen()) {
                <div class="dropdown profile-panel">
                  <div class="profile-info">
                    <p class="who-name">{{ auth.user()?.name }}</p>
                    <p class="muted email">{{ auth.user()?.email }}</p>
                    @if (auth.user()?.tenant_name) {
                      <p class="pill">{{ auth.user()?.tenant_name }}</p>
                    }
                  </div>
                  <a routerLink="/profile" (click)="closeProfile()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="panel-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>My profile</span>
                  </a>
                  <a routerLink="/orders" (click)="closeProfile()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="panel-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    <span>My orders</span>
                  </a>
                  <a routerLink="/quotes" (click)="closeProfile()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="panel-icon"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8z"/><path d="M8.5 10.5h7M8.5 13.5h4"/></svg>
                    <span>My quotes</span>
                  </a>
                  <a routerLink="/wishlist" (click)="closeProfile()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="panel-icon"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l1.7 1.7L12 21.2l7.1-6.8 1.7-1.7a5 5 0 0 0 0-7.1z"/></svg>
                    <span>My wishlist</span>
                    @if (wishlistCount() > 0) { <span class="notif-count">{{ wishlistCount() }}</span> }
                  </a>
                  <a routerLink="/reviews" (click)="closeProfile()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="panel-icon"><path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8-5.2-2.75L6.8 19.6l1-5.8-4.2-4.1 5.8-.85z"/></svg>
                    <span>My reviews</span>
                  </a>
                  <a routerLink="/support-cases" (click)="closeProfile()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="panel-icon"><path d="M2.5 6.5h10.5v10H2.5z"/><path d="M13 9.5h4l3.5 3.5v3.5H13z"/><circle cx="6.75" cy="18" r="1.8"/><circle cx="16.75" cy="18" r="1.8"/></svg>
                    <span>Refunds &amp; tracking</span>
                  </a>
                  <a routerLink="/notifications" (click)="closeProfile()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="panel-icon"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
                    <span>Notifications</span>
                    @if (unreadNotifications() > 0) { <span class="notif-count">{{ unreadNotifications() }}</span> }
                  </a>
                  @if (hasTenantRole()) {
                    <a routerLink="/tenant" (click)="closeProfile()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="panel-icon"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                      <span>Tenant console</span>
                    </a>
                  }
                  @if (hasAdminRole()) {
                    <a routerLink="/admin" (click)="closeProfile()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="panel-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      <span>Admin console</span>
                    </a>
                  }
                  <button type="button" class="logout-btn" (click)="onLogout()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="panel-icon"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    <span>Log out</span>
                  </button>
                </div>
              }
            </div>
          }
        </div>

        @if (auth.isLoggedIn()) {
          <a routerLink="/wishlist" class="wishlist-btn mobile-wishlist-btn" title="Saved Wishlist" aria-label="View Wishlist" (click)="closeMenu()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="wishlist-icon" aria-hidden="true">
              <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l1.7 1.7L12 21.2l7.1-6.8 1.7-1.7a5 5 0 0 0 0-7.1z" />
            </svg>
            @if (wishlistCount() > 0) {
              <span class="wishlist-badge">{{ wishlistCount() }}</span>
            }
          </a>
        }

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
                @if (item.icon === 'heart' && wishlistCount() > 0) {
                  <span class="nav-badge">{{ wishlistCount() }}</span>
                }
              </a>
            }
          </nav>
          <div class="panel-actions">
            @for (a of actionLinks(); track a.path) {
              <a [routerLink]="a.path" class="btn" [class.ghost]="a.ghost" (click)="closeMenu()">{{ a.label }}</a>
            }
            @if (auth.isLoggedIn()) {
              <a routerLink="/profile" class="btn profile-link-mobile" (click)="closeMenu()">
                @if (auth.user()?.avatar_url) {
                  <img [src]="auth.user()?.avatar_url" [alt]="auth.user()?.name" class="avatar-sm-img" />
                } @else {
                  <span class="avatar-sm">{{ initials() }}</span>
                }
                <span>Profile ({{ auth.user()?.name }})</span>
              </a>
              <button class="btn ghost logout-btn-mobile" (click)="onLogout()">Log out</button>
            }
          </div>
        </div>
      </div>
    </header>
    <main><router-outlet /></main>
    <footer class="site-footer">
      <div class="wrap">
        <!-- Brand band: the vision (§2) + CTAs + how the square works (§10–§12) -->
        <section class="foot-hero">
          <div class="foot-intro">
            <p class="foot-kicker">The market square, open every day</p>
            <h2 class="serif">One marketplace. Many stores.</h2>
            <p class="foot-lede">
              Browse independent stalls, keep a single multi-store cart and check out once —
              every store packs and delivers its own orders.
            </p>
            <div class="foot-cta">
              <a routerLink="/products" class="btn light">Shop the square</a>
              <a routerLink="/sell" class="btn outline">Open your store</a>
            </div>
          </div>

          <ul class="foot-points">
            <li>
              <span class="fp-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
              </span>
              <div>
                <strong>One cart, everywhere</strong>
                <p>Shop across many independent stores without juggling separate checkouts.</p>
              </div>
            </li>
            <li>
              <span class="fp-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
              </span>
              <div>
                <strong>Pay once at checkout</strong>
                <p>One master order pays every seller in a single secure transaction.</p>
              </div>
            </li>
            <li>
              <span class="fp-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13" rx="1.5" /><path d="M16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2" /><circle cx="18.5" cy="18.5" r="2" /></svg>
              </span>
              <div>
                <strong>Stores ship their own</strong>
                <p>Each stall packs its part of the order and tracks it to your door.</p>
              </div>
            </li>
          </ul>
        </section>

        <!-- Directory: brand + link columns (only routes that exist in app.routes.ts) -->
        <div class="foot-links">
          <div class="foot-brandcol">
            <a routerLink="/" class="foot-logo serif">MarketHub</a>
            <p class="muted">A multi-store marketplace SaaS — many sellers, one square, one checkout.</p>
            <span class="foot-pill"><i></i> Demo build</span>
          </div>

          <nav class="foot-col" aria-label="Marketplace links">
            <h3>Marketplace</h3>
            <a routerLink="/products">All products</a>
            <a routerLink="/stores">Stores</a>
            <a routerLink="/wishlist">Wishlist</a>
            <a routerLink="/cart">Cart</a>
            <a routerLink="/orders">My orders</a>
          </nav>

          <nav class="foot-col" aria-label="Account and help links">
            <h3>Account &amp; help</h3>
            <a routerLink="/login">Log in</a>
            <a routerLink="/register">Create account</a>
            <a routerLink="/notifications">Notifications</a>
            <a routerLink="/support-cases">Support centre</a>
            <a routerLink="/reviews">My reviews</a>
          </nav>

          <nav class="foot-col" aria-label="Selling links">
            <h3>Selling</h3>
            <a routerLink="/sell">Open your store</a>
            <a routerLink="/tenant/login">Seller console</a>
            <p class="foot-note">Payouts, analytics and seller support live inside the console.</p>
          </nav>
        </div>

        <div class="foot-rule" aria-hidden="true"></div>

        <div class="foot-bottom">
          <p>© {{ year }} MarketHub · Phase 1 marketplace SaaS — demo accounts use password <code>password</code>.</p>
          <button class="to-top" type="button" aria-label="Back to top" (click)="scrollTop()">
            Back to top
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
          </button>
        </div>
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
          @case ('heart') {
            <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l1.7 1.7L12 21.2l7.1-6.8 1.7-1.7a5 5 0 0 0 0-7.1z" />
          }
          @case ('quote') {
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8z" /><path d="M8.5 10.5h7M8.5 13.5h4" />
          }
        }
      </svg>
    </ng-template>
  `,
  styles: [`
    .top { position: sticky; top: 0; z-index: 20; background: rgba(244,239,230,.92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 72px;
    }
    .brand { font-size: 26px; flex: 0 0 auto; }
    .currency-picker {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 40px;
      padding: 0 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--card);
      color: var(--ink);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-sizing: border-box;
      white-space: nowrap;
      transition: background .15s ease, border-color .15s ease;
    }
    .currency-picker:hover {
      background: var(--paper-2);
      border-color: var(--ink-soft);
    }
    .currency-picker span {
      color: var(--accent);
      font-weight: 800;
      font-size: 13px;
      line-height: 1;
    }
    .currency-picker select {
      border: 0;
      background: transparent;
      color: var(--ink);
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      outline: none;
      padding: 0;
      line-height: 1;
    }
    .desktop-nav {
      display: flex;
      gap: 4px;
      justify-content: center;
      align-items: center;
      flex: 1 1 auto;
      flex-wrap: nowrap;
    }
    .desktop-nav a {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-weight: 600;
      color: var(--ink-soft);
      padding: 8px 14px;
      border-radius: 999px;
      white-space: nowrap;
      transition: color .15s ease, background .15s ease;
    }
    .desktop-nav a:hover { color: var(--ink); background: var(--paper-2); }
    .desktop-nav a.on { color: var(--accent); background: rgba(196, 92, 38, .12); }
    .desktop-nav a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .desktop-nav svg { width: 18px; height: 18px; flex: none; }
    .actions {
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: flex-end;
      flex: 0 0 auto;
      flex-wrap: nowrap;
    }
    .desktop-actions .btn {
      height: 40px;
      padding: 0 18px;
      border-radius: 999px;
      font-size: 13.5px;
      font-weight: 600;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      line-height: 1;
      transition: background .15s ease, border-color .15s ease;
    }

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

    /* Layout + footer styling live in layout/shell-footer.scss (global) so this
       component stays within its anyComponentStyle budget. */

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
      .mobile-wishlist-btn { display: inline-flex; margin-left: auto; margin-right: 4px; }
    }

    /* Dropdown wrapper & Profile button */
    .dropdown-wrap { position: relative; }
    .wishlist-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: var(--card);
      color: var(--ink);
      cursor: pointer;
      box-sizing: border-box;
      transition: background .15s ease, border-color .15s ease, color .15s ease;
      text-decoration: none;
      flex: none;
    }
    .wishlist-btn:hover { background: var(--paper-2); border-color: var(--ink-soft); color: var(--accent); }
    .wishlist-btn svg { width: 19px; height: 19px; }
    .wishlist-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: 999px;
      background: var(--accent);
      color: #fff;
      font-size: 10px;
      font-weight: 800;
      line-height: 18px;
      text-align: center;
      box-shadow: 0 2px 5px rgba(0,0,0,.15);
    }
    .nav-badge {
      margin-left: 4px;
      min-width: 17px;
      padding: 1px 5px;
      border-radius: 999px;
      background: var(--accent);
      color: #fff;
      font-size: 10px;
      font-weight: 800;
      text-align: center;
      line-height: 1.2;
    }
    .mobile-wishlist-btn { display: none; }
    .notif-count { margin-left: auto; min-width: 20px; padding: 1px 6px; border-radius: 999px; background: var(--accent); color: #fff; font-size: 10.5px; font-weight: 800; text-align: center; }
    .profile-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 40px;
      padding: 0 12px 0 4px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: var(--card);
      color: var(--ink);
      cursor: pointer;
      box-sizing: border-box;
      white-space: nowrap;
      transition: background .15s ease, border-color .15s ease;
    }
    .profile-btn:hover { background: var(--paper-2); border-color: var(--ink-soft); }
    .profile-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .chevron-icon { width: 14px; height: 14px; color: var(--ink-soft); transition: transform .18s ease; flex: none; }
    .chevron-icon.open { transform: rotate(180deg); }
    .avatar {
      width: 32px; height: 32px; border-radius: 999px; background: var(--ink); color: var(--paper);
      display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex: none;
    }
    .avatar-img { width: 32px; height: 32px; border-radius: 999px; object-fit: cover; flex: none; }
    .who { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.15; text-align: left; }
    .who-name { font-weight: 700; font-size: 13px; max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .who-role { font-size: 10.5px; }

    /* Profile panel dropdown */
    .dropdown {
      position: absolute; top: calc(100% + 8px); right: 0;
      background: var(--card); border: 1px solid var(--line); border-radius: 14px;
      box-shadow: var(--shadow); overflow: hidden; z-index: 50;
    }
    .profile-panel { width: 250px; padding: 6px; }
    .profile-info { padding: 10px 10px 12px; border-bottom: 1px solid var(--line); margin-bottom: 6px; }
    .profile-info .who-name { font-size: 14px; font-weight: 750; }
    .profile-info .email { font-size: 12px; margin: 2px 0 6px; word-break: break-all; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(196, 92, 38, .12); color: var(--accent); font-size: 11px; font-weight: 700; }
    .profile-panel a {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px; border-radius: 10px; font-weight: 600; font-size: 13.5px;
      color: var(--ink); text-decoration: none; transition: background .12s ease;
    }
    .profile-panel a:hover { background: var(--paper-2); }
    .panel-icon { width: 16px; height: 16px; flex: none; color: var(--ink-soft); }
    .logout-btn {
      width: 100%; display: flex; align-items: center; gap: 10px; text-align: left;
      background: none; border: 0; padding: 9px 10px; border-radius: 10px;
      font-weight: 600; font-size: 13.5px; color: var(--danger); cursor: pointer;
      transition: background .12s ease;
    }
    .logout-btn:hover { background: var(--paper-2); }
    .logout-btn .panel-icon { color: var(--danger); }

    /* Mobile profile button */
    .profile-link-mobile { display: inline-flex; align-items: center; gap: 8px; }
    .avatar-sm { width: 24px; height: 24px; border-radius: 999px; background: var(--ink); color: var(--paper); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex: none; }
    .avatar-sm-img { width: 24px; height: 24px; border-radius: 999px; object-fit: cover; flex: none; }
    .logout-btn-mobile { color: var(--danger) !important; }

    @media (max-width: 960px) {
      .desktop-nav a { padding: 7px 10px; font-size: 13px; gap: 5px; }
      .desktop-nav svg { width: 16px; height: 16px; }
      .who-role { display: none; }
      .who-name { max-width: 90px; }
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
  currency = inject(CurrencyService);
  private api = inject(ApiService);

  /** §20 — unread badge on the account menu's notification entry. */
  unreadNotifications = signal(0);
  wishlistCount = signal(0);
  private router = inject(Router);
  menuOpen = signal(false);
  profileOpen = signal(false);

  /** Switch the storefront's display currency (persisted per browser). */
  onCurrencyChange(event: Event): void {
    this.currency.setDisplay((event.target as HTMLSelectElement).value);
  }

  initials = computed(() => {
    const name = this.auth.user()?.name ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join('') || 'U';
  });

  roleLabel = computed(() => {
    const user = this.auth.user();
    if (!user) return '';
    if (user.role === 'super_admin') return 'Admin';
    if (user.role === 'tenant_owner') return 'Seller';
    if (user.role === 'store_staff') return user.department ? `${user.department} staff` : 'Staff';
    if (user.role === 'customer') return 'Customer';
    return user.role;
  });

  hasTenantRole = computed(() => this.auth.hasRole('tenant_owner', 'store_staff'));
  hasAdminRole = computed(() => this.auth.hasRole('super_admin'));

  private readonly baseNav: NavItem[] = [
    { path: '/', label: 'Home', icon: 'home', exact: true },
    { path: '/products', label: 'Products', icon: 'bag', exact: false },
    { path: '/stores', label: 'Stores', icon: 'store', exact: false },
    { path: '/platform', label: 'Store Builder', icon: 'store', exact: false },
    { path: '/wishlist', label: 'Wishlist', icon: 'heart', exact: false },
    { path: '/cart', label: 'Cart', icon: 'cart', exact: false },
    { path: '/orders', label: 'Orders', icon: 'orders', exact: false },
  ];

  /** Wishlist, Cart and Orders only make sense for a signed-in customer. */
  navItems = computed(() => (this.auth.isLoggedIn() ? this.baseNav : this.baseNav.slice(0, 4)));

  /** Guest: Log in / Join. Signed in: role entry points. */
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
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.closeMenu();
      this.closeProfile();
      this.loadWishlistCount();
    });

    if (this.auth.isLoggedIn()) {
      this.loadWishlistCount();
      this.api.notificationSummary('customer').subscribe({
        next: (res) => this.unreadNotifications.set(res.data?.unread ?? 0),
        error: () => undefined,
      });
    }
  }

  loadWishlistCount(): void {
    if (!this.auth.isLoggedIn()) {
      this.wishlistCount.set(0);
      return;
    }
    this.api.wishlist().subscribe({
      next: (res) => this.wishlistCount.set(res.data?.counts?.items ?? res.data?.items?.length ?? 0),
      error: () => undefined,
    });
  }

  /** Footer copyright year — rendered once so it can't drift mid-session. */
  readonly year = new Date().getFullYear();

  /** "Back to top" control in the site footer. */
  scrollTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleMenu() {
    this.menuOpen.update((open) => !open);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  toggleProfile() {
    this.profileOpen.update((open) => !open);
  }

  closeProfile() {
    this.profileOpen.set(false);
  }

  onLogout() {
    this.closeProfile();
    this.closeMenu();
    this.wishlistCount.set(0);
    this.auth.logout();
  }

  @HostListener('document:click')
  onDocClick() {
    this.closeProfile();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMenu();
    this.closeProfile();
  }
}
