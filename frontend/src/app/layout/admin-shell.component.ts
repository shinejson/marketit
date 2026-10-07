import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AppNotification } from '../core/models';
import { AuthService } from '../core/auth.service';
import { CurrencyService } from '../core/currency.service';
import { ThemeService } from '../core/theme.service';

type IconName =
  | 'dashboard' | 'analytics' | 'tenants' | 'stores' | 'store' | 'users' | 'subscriptions' | 'orders'
  | 'domains' | 'ads' | 'audit' | 'settings' | 'shield' | 'logout' | 'search' | 'bell'
  | 'sun' | 'moon' | 'chevron' | 'menu'
  | 'lifebuoy' | 'ticket' | 'chat' | 'tasks' | 'guides'
  | 'star' | 'percent' | 'payout' | 'gavel' | 'catalog' | 'tag';

interface NavEntry {
  key: string;
  label: string;
  icon: IconName;
  exact?: boolean;
}

interface SearchEntry {
  label: string;
  path: string;
  icon: IconName;
  section: string;
}

const SIDEBAR_KEY = 'mh_admin_sidebar_collapsed';
const MOBILE_BREAKPOINT = 900;

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet],
  template: `
    <div class="dash">
      @if (mobileOpen()) {
        <div class="backdrop" (click)="collapsed.set(true)"></div>
      }

      <aside [class.collapsed]="collapsed()">
        <div class="brand-row">
          <a routerLink="/admin" class="brand serif" (click)="onNavigate()">
            <span class="mark">M</span><span class="label-text">arketHub</span>
          </a>
        </div>
        <p class="muted subtitle label-text">Super admin console</p>

        <nav>
          <p class="section-label label-text">Overview</p>
          @for (o of overviewItems; track o.key) {
            <a
              [routerLink]="adminLink(o.key)"
              routerLinkActive="on"
              [routerLinkActiveOptions]="{ exact: !!o.exact }"
              (click)="onNavigate()"
              [title]="collapsed() ? o.label : ''"
            >
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: o.icon }" />
              <span class="label-text">{{ o.label }}</span>
            </a>
          }

          <p class="section-label label-text">Manage</p>
          @for (m of manageItems; track m.key) {
            <a [routerLink]="adminLink(m.key)" routerLinkActive="on" (click)="onNavigate()" [title]="collapsed() ? m.label : ''">
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: m.icon }" />
              <span class="label-text">{{ m.label }}</span>
            </a>
          }

          @if (commerceItems.length) {
            <p class="section-label label-text">Commerce</p>
            @for (c of commerceItems; track c.key) {
              <a [routerLink]="adminLink(c.key)" routerLinkActive="on" (click)="onNavigate()" [title]="collapsed() ? c.label : ''">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: c.icon }" />
                <span class="label-text">{{ c.label }}</span>
              </a>
            }
          }

          <p class="section-label label-text">Service desk</p>
          @for (s of supportItems; track s.key) {
            <a [routerLink]="adminLink(s.key)" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: !!s.exact }" (click)="onNavigate()" [title]="collapsed() ? s.label : ''">
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: s.icon }" />
              <span class="label-text">{{ s.label }}</span>
            </a>
          }

          <p class="section-label label-text">Platform</p>
          @for (p of platformItems; track p.key) {
            <a [routerLink]="adminLink(p.key)" routerLinkActive="on" (click)="onNavigate()" [title]="collapsed() ? p.label : ''">
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: p.icon }" />
              <span class="label-text">{{ p.label }}</span>
            </a>
          }
        </nav>

        <button class="btn ghost logout" (click)="auth.logout()" [title]="collapsed() ? 'Log out' : ''">
          <ng-container [ngTemplateOutlet]="miniIcon" [ngTemplateOutletContext]="{ $implicit: 'logout' }" />
          <span class="label-text">Log out</span>
        </button>
      </aside>

      <div class="content">
        <header class="topnav">
          <button type="button" class="icon-btn hamburger" (click)="toggleSidebar()" [attr.aria-expanded]="!collapsed()" aria-label="Toggle sidebar">
            <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'menu' }" />
          </button>

          <div class="search" (click)="$event.stopPropagation()">
            <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'search' }" />
            <input
              type="text"
              placeholder="Search…"
              [value]="searchTerm()"
              (input)="onSearchInput($event)"
              (focus)="onSearchFocus()"
              (keydown.enter)="goToFirstResult()"
              (keydown.escape)="clearSearch()"
              aria-label="Search the super admin console"
            />
            @if (searchTerm() && showSearchPanel()) {
              <div class="dropdown search-results">
                @if (searchResults().length) {
                  @for (r of searchResults(); track r.path) {
                    <a [routerLink]="r.path" (click)="clearSearch()">
                      <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: r.icon }" />
                      <span>
                        <span class="r-label">{{ r.label }}</span>
                        <span class="r-section muted">{{ r.section }}</span>
                      </span>
                    </a>
                  }
                } @else {
                  <p class="empty-note muted">No matches for "{{ searchTerm() }}"</p>
                }
              </div>
            }
          </div>

          <div class="top-actions">
            <!-- Notifications Dropdown -->
            <div class="dropdown-wrap" (click)="$event.stopPropagation()">
              <button type="button" class="icon-btn" (click)="toggleNotifications()" aria-label="Notifications" [attr.aria-expanded]="notifOpen()">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'bell' }" />
                @if (unreadCount() > 0) { <span class="badge">{{ unreadCount() }}</span> }
              </button>
              @if (notifOpen()) {
                <div class="dropdown notif-panel">
                  <div class="dropdown-head">
                    <span>Platform Alerts</span>
                    @if (unreadCount() > 0) {
                      <button type="button" class="link-btn" (click)="markAllRead()">Mark all read</button>
                    }
                  </div>
                  @if (notifications().length) {
                    <ul>
                      @for (n of notifications(); track n.id) {
                        <li [class.unread]="!n.read" (click)="openNotification(n)">
                          <span class="dot" [class.hide]="n.read"></span>
                          <div class="n-body">
                            <p class="n-title">{{ n.title }}</p>
                            <p class="n-msg muted">{{ n.body }}</p>
                            <p class="n-time muted">{{ ago(n.created_at) }}</p>
                          </div>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="empty-note muted">No notifications yet.</p>
                  }
                  <a class="notif-footer" routerLink="/admin/notifications" (click)="closeMenus()">Open notification center <span>→</span></a>
                </div>
              }
            </div>

            <!-- Theme Toggle -->
            <button
              type="button"
              class="icon-btn"
              (click)="theme.toggle()"
              [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: theme.theme() === 'dark' ? 'sun' : 'moon' }" />
            </button>

            <!-- Super Admin Profile -->
            <div class="dropdown-wrap" (click)="$event.stopPropagation()">
              <button type="button" class="profile-btn" (click)="toggleProfile()" [attr.aria-expanded]="profileOpen()">
                <span class="avatar">{{ initials() }}</span>
                <span class="who">
                  <span class="who-name">{{ auth.user()?.name || 'Super Admin' }}</span>
                  <span class="who-role muted">Platform Admin</span>
                </span>
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
              </button>
              @if (profileOpen()) {
                <div class="dropdown profile-panel">
                  <div class="profile-info">
                    <p class="who-name">{{ auth.user()?.name || 'Super Admin' }}</p>
                    <p class="muted email">{{ auth.user()?.email || 'admin@markethub.test' }}</p>
                    <span class="pill admin-pill">Super Admin</span>
                  </div>
                  <a routerLink="/admin" (click)="closeMenus()">Dashboard</a>
                  <a routerLink="/admin/settings" (click)="closeMenus()">Platform Settings</a>
                  <button type="button" class="logout-btn" (click)="auth.logout()">Log out</button>
                </div>
              }
            </div>
          </div>
        </header>

        <section class="body"><router-outlet /></section>
      </div>
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
          @case ('store') {
            <path d="M3 9l1.5-5h15L21 9" /><path d="M5 9v11h14V9" /><path d="M9.5 20v-5.5h5V20" />
          }
          @case ('stores') {
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
          @case ('star') {
            <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8-5.2-2.75L6.8 19.6l1-5.8-4.2-4.1 5.8-.85z" />
          }
          @case ('percent') {
            <line x1="19" y1="5" x2="5" y2="19" /><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" />
          }
          @case ('payout') {
            <rect x="2.5" y="6" width="19" height="12.5" rx="2" /><circle cx="12" cy="12.25" r="2.75" /><path d="M6 12.25h.01M18 12.25h.01" />
          }
          @case ('gavel') {
            <path d="M14.5 3.5l6 6M17.5 6.5l-7 7M11.5 2.5l4 4" /><path d="M3 21h9" /><path d="M9.5 8.5l6 6-4 4-6-6z" />
          }
          @case ('catalog') {
            <path d="M4 4.5h6.5a2 2 0 0 1 2 2V20a1.8 1.8 0 0 0-1.8-1.5H4z" /><path d="M20 4.5h-6.5a2 2 0 0 0-2 2V20a1.8 1.8 0 0 1 1.8-1.5H20z" />
          }
          @case ('tag') {
            <path d="M3 12.5V4.5a1.5 1.5 0 0 1 1.5-1.5h8L21 11.5a1.6 1.6 0 0 1 0 2.2l-7.3 7.3a1.6 1.6 0 0 1-2.2 0z" /><circle cx="7.75" cy="7.75" r="1.4" />
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
          @case ('lifebuoy') {
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><line x1="4.9" y1="4.9" x2="9.2" y2="9.2" /><line x1="14.8" y1="14.8" x2="19.1" y2="19.1" /><line x1="14.8" y1="9.2" x2="19.1" y2="4.9" /><line x1="4.9" y1="19.1" x2="9.2" y2="14.8" />
          }
          @case ('ticket') {
            <path d="M3 9.5V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5z" /><line x1="14" y1="5" x2="14" y2="19" stroke-dasharray="2.5 2.5" />
          }
          @case ('chat') {
            <path d="M21 14a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="8" y1="8.5" x2="16" y2="8.5" /><line x1="8" y1="12" x2="13" y2="12" />
          }
          @case ('tasks') {
            <polyline points="3 7 5 9 9 5" /><polyline points="3 17 5 19 9 15" /><line x1="12" y1="7" x2="21" y2="7" /><line x1="12" y1="17" x2="21" y2="17" />
          }
          @case ('guides') {
            <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5z" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="13.5" y2="11" />
          }
          @case ('shield') {
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" />
          }
          @case ('settings') {
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .7.4 1.31 1.05 1.6.31.14.65.22 1 .25l.5.01a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
    .dash { display: flex; min-height: 100vh; position: relative; background: var(--paper); }

    /* ---------- Sidebar ---------- */
    aside {
      width: 240px; flex: none;
      position: sticky; top: 0; height: 100vh;
      overflow: hidden;
      padding: 24px 16px 16px 16px; border-right: 1px solid rgba(255,255,255,.08);
      background: #171511; color: #f4efe6; display: flex; flex-direction: column; gap: 8px;
      transition: width .2s ease, transform .2s ease;
      z-index: 10;
    }
    :host-context([data-theme="dark"]) aside {
      background: #110f0b;
      border-right-color: var(--line);
    }
    .brand-row { display: flex; align-items: center; flex: none; }
    .brand { font-size: 22px; display: flex; align-items: center; gap: 6px; color: #f4efe6; }
    .brand .mark {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 9px; background: var(--accent); color: #fff;
      font-size: 16px; font-weight: 700; flex: none;
    }
    .subtitle { margin: 2px 0 4px; font-size: 12px; letter-spacing: .04em; color: #a89f8f; flex: none; }
    nav {
      display: flex; flex-direction: column; gap: 3px;
      margin: 8px -16px 0 -16px; padding: 0 16px 8px 16px;
      overflow-y: auto; overflow-x: hidden;
      flex: 1 1 auto; min-height: 0;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,.2) transparent;
    }
    nav::-webkit-scrollbar,
    aside::-webkit-scrollbar {
      width: 4px;
    }
    nav::-webkit-scrollbar-track,
    aside::-webkit-scrollbar-track {
      background: transparent;
    }
    nav::-webkit-scrollbar-thumb,
    aside::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,.2);
      border-radius: 999px;
    }
    nav::-webkit-scrollbar-thumb:hover,
    aside::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,.38);
    }
    .section-label { margin: 14px 10px 4px; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: #8e8574; font-weight: 700; white-space: nowrap; }
    nav a {
      display: flex; align-items: center; gap: 11px;
      padding: 9px 12px; border-radius: 12px; font-weight: 600; color: #dfd7c9;
      white-space: nowrap; font-size: 13.5px; transition: background .15s ease, color .15s ease;
    }
    nav a svg { width: 18px; height: 18px; flex: none; opacity: .88; }
    nav a:hover { background: rgba(255,255,255,.08); color: #fff; }
    nav a.on { background: var(--accent); color: #fff; }
    nav a.on svg { opacity: 1; }
    .logout {
      display: flex; align-items: center; gap: 10px; justify-content: flex-start;
      background: transparent; color: #dfd7c9; border: 1px solid rgba(255,255,255,.14);
      margin-top: auto; flex: none;
    }
    .logout:hover { background: rgba(255,255,255,.08); color: #fff; }
    .logout svg { width: 18px; height: 18px; flex: none; }

    /* Collapsed = icon-only rail (desktop) */
    @media (min-width: 901px) {
      aside.collapsed { width: 76px; padding-left: 14px; padding-right: 14px; }
      aside.collapsed .label-text { display: none; }
      aside.collapsed .brand { justify-content: center; }
      aside.collapsed nav a { justify-content: center; padding: 10px; }
      aside.collapsed nav { margin-left: -14px; margin-right: -14px; padding-left: 14px; padding-right: 14px; }
      aside.collapsed .section-label { text-align: center; }
      aside.collapsed .logout { justify-content: center; }
    }

    /* Collapsed = hidden off-canvas drawer (mobile) */
    @media (max-width: 900px) {
      aside {
        position: fixed; top: 0; left: 0; height: 100vh; width: 264px;
        transform: translateX(-100%); box-shadow: var(--shadow); z-index: 40;
      }
      aside:not(.collapsed) { transform: translateX(0); }
      .backdrop { position: fixed; inset: 0; background: rgba(10, 8, 5, .55); z-index: 35; }
    }
    @media (min-width: 901px) { .backdrop { display: none; } }

    /* ---------- Content column ---------- */
    .content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .body { padding: 28px; }

    /* ---------- Top nav ---------- */
    .topnav {
      position: sticky; top: 0; z-index: 20;
      display: flex; align-items: center; gap: 14px;
      padding: 12px 24px; border-bottom: 1px solid var(--line);
      background: rgba(244,239,230,.92); backdrop-filter: blur(10px);
    }
    :host-context([data-theme="dark"]) .topnav { background: rgba(21,19,15,.92); }

    .icon-btn {
      position: relative; display: inline-flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border-radius: 12px; border: 1px solid var(--line);
      background: var(--card); color: var(--ink); cursor: pointer; flex: none;
    }
    .icon-btn:hover { background: var(--paper-2); }
    .icon-btn svg { width: 19px; height: 19px; }
    .hamburger { margin-right: 2px; }

    .search { position: relative; flex: 1; max-width: 480px; display: flex; align-items: center; }
    .search svg { position: absolute; left: 13px; width: 17px; height: 17px; color: var(--ink-soft); pointer-events: none; }
    .search input {
      width: 100%; padding: 10px 14px 10px 38px; border-radius: 999px;
      border: 1px solid var(--line); background: var(--card); color: var(--ink); font: inherit;
    }
    .search input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }

    .dropdown {
      position: absolute; top: calc(100% + 8px); right: 0;
      background: var(--card); border: 1px solid var(--line); border-radius: 14px;
      box-shadow: var(--shadow); overflow: hidden; z-index: 30;
    }
    .search-results { left: 0; right: auto; width: 100%; max-height: 360px; overflow-y: auto; padding: 6px; }
    .search-results a { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 10px; }
    .search-results a:hover { background: var(--paper-2); }
    .search-results svg { width: 16px; height: 16px; flex: none; color: var(--ink-soft); }
    .search-results .r-label { display: block; font-weight: 600; font-size: 14px; }
    .search-results .r-section { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
    .empty-note { padding: 14px; font-size: 13px; margin: 0; }

    .top-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
    .dropdown-wrap { position: relative; }

    .badge {
      position: absolute; top: -4px; right: -4px;
      min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px;
      background: var(--accent); color: #fff; font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; line-height: 1;
    }

    .notif-panel { width: 340px; max-width: 86vw; }
    .dropdown-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--line); font-weight: 700; font-size: 14px; }
    .link-btn { background: none; border: 0; color: var(--accent); font-weight: 600; font-size: 12px; cursor: pointer; }
    .notif-panel ul { list-style: none; margin: 0; padding: 4px; max-height: 360px; overflow-y: auto; }
    .notif-panel li { display: flex; gap: 10px; padding: 10px; border-radius: 10px; cursor: pointer; }
    .notif-panel li:hover { background: var(--paper-2); }
    .notif-panel li.unread .n-title { font-weight: 700; }
    .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--accent); margin-top: 6px; flex: none; }
    .dot.hide { background: transparent; }
    .n-body p { margin: 0; }
    .n-title { font-size: 13.5px; }
    .n-msg { font-size: 12.5px; margin-top: 2px !important; }
    .n-time { font-size: 11px; margin-top: 4px !important; }
    .notif-footer { display: flex; justify-content: space-between; align-items: center; margin: 4px; padding: 10px; border-top: 1px solid var(--line); color: var(--accent); font-size: 12px; font-weight: 700; }
    .notif-footer span { font-size: 16px; line-height: 1; }

    .profile-btn {
      display: flex; align-items: center; gap: 8px; padding: 5px 10px 5px 5px;
      border-radius: 999px; border: 1px solid var(--line); background: var(--card); color: var(--ink); cursor: pointer;
    }
    .profile-btn:hover { background: var(--paper-2); }
    .profile-btn svg { width: 14px; height: 14px; color: var(--ink-soft); }
    .avatar {
      width: 30px; height: 30px; border-radius: 999px; background: var(--ink); color: var(--paper);
      display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex: none;
    }
    .who { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2; }
    .who-name { font-weight: 700; font-size: 13px; }
    .who-role { font-size: 11px; }

    .profile-panel { width: 240px; padding: 6px; }
    .profile-info { padding: 10px 10px 12px; border-bottom: 1px solid var(--line); margin-bottom: 6px; }
    .profile-info .who-name { font-size: 14px; }
    .profile-info .email { font-size: 12px; margin: 2px 0 6px; }
    .admin-pill { background: rgba(196,92,38,.16); color: var(--accent); font-size: 11px; }
    .profile-panel a { display: block; padding: 9px 10px; border-radius: 10px; font-weight: 600; font-size: 13.5px; }
    .profile-panel a:hover { background: var(--paper-2); }
    .logout-btn { width: 100%; text-align: left; background: none; border: 0; padding: 9px 10px; border-radius: 10px; font-weight: 600; font-size: 13.5px; color: var(--danger); cursor: pointer; }
    .logout-btn:hover { background: var(--paper-2); }

    @media (max-width: 720px) {
      .who { display: none; }
      .topnav {
        padding: 8px 12px;
        gap: 8px;
        width: 100%;
        box-sizing: border-box;
      }
      .icon-btn {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        flex: none;
      }
      .icon-btn svg {
        width: 17px;
        height: 17px;
      }
      .top-actions {
        gap: 6px;
        flex: none;
      }
      .profile-btn {
        height: 36px;
        padding: 3px 6px 3px 3px;
        gap: 4px;
        flex: none;
      }
      .profile-btn svg {
        width: 12px;
        height: 12px;
      }
      .avatar {
        width: 28px;
        height: 28px;
        font-size: 11px;
      }
      .search {
        position: relative;
        flex: 1;
        min-width: 0;
      }
      .search svg {
        left: 10px;
        width: 15px;
        height: 15px;
      }
      .search input {
        height: 36px;
        padding: 0 10px 0 32px;
        font-size: 13px;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }
      .search-results {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        width: min(340px, calc(100vw - 24px));
        max-width: calc(100vw - 24px);
      }
      .notif-panel {
        max-width: calc(100vw - 24px);
        right: -40px;
      }
      .profile-panel {
        max-width: calc(100vw - 24px);
        right: 0;
      }
      .body { padding: 16px 12px; }
    }

    @media (max-width: 480px) {
      .topnav {
        padding: 8px 10px;
        gap: 6px;
      }
      .top-actions {
        gap: 4px;
      }
      .icon-btn {
        width: 34px;
        height: 34px;
      }
      .profile-btn {
        height: 34px;
        padding: 2px 4px 2px 2px;
      }
      .avatar {
        width: 26px;
        height: 26px;
        font-size: 10.5px;
      }
      .profile-btn svg {
        display: none;
      }
      .search input {
        height: 34px;
        padding: 0 8px 0 28px;
        font-size: 12.5px;
      }
      .search svg {
        left: 9px;
        width: 13px;
        height: 13px;
      }
      .notif-panel {
        right: -80px;
      }
    }
  `],
})
export class AdminShellComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  private api = inject(ApiService);
  private currency = inject(CurrencyService);
  private router = inject(Router);

  readonly overviewItems: NavEntry[] = [
    { key: '', label: 'Dashboard', icon: 'dashboard', exact: true },
    { key: 'analytics', label: 'Analytics', icon: 'analytics' },
  ];

  readonly manageItems: NavEntry[] = [
    { key: 'tenants', label: 'Tenants', icon: 'tenants' },
    { key: 'stores', label: 'Stores', icon: 'store' },
    { key: 'users', label: 'Customers & users', icon: 'users' },
    { key: 'catalog', label: 'Catalog & Moderation', icon: 'catalog' },
    { key: 'orders', label: 'Orders', icon: 'orders' },
    { key: 'subscriptions', label: 'Plans & billing', icon: 'subscriptions' },
    { key: 'reviews', label: 'Reviews', icon: 'star' },
    { key: 'commissions', label: 'Commissions', icon: 'percent' },
    { key: 'payouts', label: 'Payouts', icon: 'payout' },
    { key: 'disputes', label: 'Disputes & Refunds', icon: 'gavel' },
    { key: 'coupons', label: 'Coupons', icon: 'tag' },
  ];

  readonly commerceItems: NavEntry[] = [];

  readonly supportItems: NavEntry[] = [
    { key: 'support', label: 'Support overview', icon: 'lifebuoy', exact: true },
    { key: 'support/tickets', label: 'Tickets', icon: 'ticket' },
    { key: 'support/chats', label: 'Live chat', icon: 'chat' },
    { key: 'support/tasks', label: 'Service tasks', icon: 'tasks' },
    { key: 'support/guides', label: 'Help & guides', icon: 'guides' },
  ];

  readonly platformItems: NavEntry[] = [
    { key: 'domains', label: 'Domains', icon: 'domains' },
    { key: 'ads', label: 'Ads & Marketing', icon: 'ads' },
    { key: 'audit', label: 'Audit log', icon: 'audit' },
    { key: 'security', label: 'Security', icon: 'shield' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
  ];

  /** Sidebar collapse state */
  collapsed = signal(this.initialCollapsed());
  mobileOpen = computed(() => !this.collapsed());

  // ---- Search ----
  searchTerm = signal('');
  searchFocused = signal(false);
  showSearchPanel = computed(() => this.searchFocused());

  searchIndex = computed<SearchEntry[]>(() => {
    const items: SearchEntry[] = [];
    for (const o of this.overviewItems) {
      items.push({ label: o.label, path: this.adminLink(o.key), icon: o.icon, section: 'Overview' });
    }
    for (const m of this.manageItems) {
      items.push({ label: m.label, path: this.adminLink(m.key), icon: m.icon, section: 'Manage' });
    }
    for (const c of this.commerceItems) {
      items.push({ label: c.label, path: this.adminLink(c.key), icon: c.icon, section: 'Commerce' });
    }
    for (const s of this.supportItems) {
      items.push({ label: s.label, path: this.adminLink(s.key), icon: s.icon, section: 'Service desk' });
    }
    for (const p of this.platformItems) {
      items.push({ label: p.label, path: this.adminLink(p.key), icon: p.icon, section: 'Platform' });
    }
    // Search aliases for instant discovery of nested sub-features
    items.push(
      { label: 'Moderation', path: this.adminLink('catalog'), icon: 'catalog', section: 'Manage' },
      { label: 'Disputes', path: this.adminLink('disputes'), icon: 'gavel', section: 'Manage' },
      { label: 'Refunds', path: this.adminLink('disputes'), icon: 'gavel', section: 'Manage' }
    );
    return items;
  });

  searchResults = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return [];
    return this.searchIndex().filter((i) => i.label.toLowerCase().includes(term));
  });

  // ---- Notifications (live platform alerts, §20) ----
  notifications = signal<AppNotification[]>([]);
  unreadCount = signal(0);
  notifOpen = signal(false);
  profileOpen = signal(false);

  initials = computed(() => {
    const name = this.auth.user()?.name ?? 'Super Admin';
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join('') || 'SA';
  });

  constructor() {
    // Platform figures are reported in the base currency, whatever a tenant
    // workspace or storefront on this browser is displaying.
    this.currency.setDisplay(this.currency.base(), false);

    // Seed the bell badge so unread platform alerts are visible without opening it.
    this.api.notificationSummary('admin').subscribe({
      next: (res) => this.unreadCount.set(res.data?.unread ?? 0),
      error: () => undefined,
    });

    effect(() => {
      if (typeof window === 'undefined' || this.isMobile()) return;
      try {
        localStorage.setItem(SIDEBAR_KEY, this.collapsed() ? '1' : '0');
      } catch {
        /* ignore storage failures */
      }
    });
  }

  adminLink(path = ''): string {
    return path ? `/admin/${path}` : '/admin';
  }

  toggleSidebar() {
    this.collapsed.update((v) => !v);
  }

  onNavigate() {
    this.closeMenus();
    if (this.isMobile()) this.collapsed.set(true);
  }

  onSearchInput(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onSearchFocus() {
    this.searchFocused.set(true);
    this.notifOpen.set(false);
    this.profileOpen.set(false);
  }

  clearSearch() {
    this.searchTerm.set('');
    this.searchFocused.set(false);
  }

  goToFirstResult() {
    const result = this.searchResults()[0];
    if (result) {
      this.router.navigateByUrl(result.path);
      this.clearSearch();
    }
  }

  toggleNotifications() {
    if (!this.notifOpen()) this.loadNotifications();
    this.notifOpen.update((v) => !v);
    this.profileOpen.set(false);
    this.searchFocused.set(false);
  }

  loadNotifications() {
    this.api.notifications({ audience: 'admin', per_page: '8' }).subscribe({
      next: (res) => {
        this.notifications.set(res.data || []);
        this.unreadCount.set(res.summary?.unread ?? 0);
      },
      error: () => undefined,
    });
  }

  openNotification(notification: AppNotification) {
    if (!notification.read) {
      this.api.markNotificationRead(notification.id).subscribe({ next: () => undefined, error: () => undefined });
      this.notifications.update((list) => list.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
      this.unreadCount.update((count) => Math.max(0, count - 1));
    }
    this.closeMenus();
    if (notification.action_url) this.router.navigateByUrl(notification.action_url);
  }

  markAllRead() {
    this.api.markAllNotificationsRead('admin').subscribe({
      next: () => this.loadNotifications(),
      error: () => undefined,
    });
    this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
    this.unreadCount.set(0);
  }

  /** Relative timestamp for the notification dropdown. */
  ago(value?: string | null): string {
    if (!value) return '';
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  toggleProfile() {
    this.profileOpen.update((v) => !v);
    this.notifOpen.set(false);
    this.searchFocused.set(false);
  }

  closeMenus() {
    this.notifOpen.set(false);
    this.profileOpen.set(false);
    this.searchFocused.set(false);
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeMenus();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMenus();
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
  }

  private initialCollapsed(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.isMobile()) return true;
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  }
}
