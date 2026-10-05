import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

type IconName =
  | 'home' | 'finance' | 'sales' | 'operations' | 'marketing' | 'store' | 'orders' | 'products'
  | 'inventory' | 'ads' | 'analytics' | 'users' | 'settings' | 'backups' | 'domains' | 'apikeys'
  | 'webhooks' | 'ai' | 'search' | 'bell' | 'sun' | 'moon' | 'chevron' | 'menu' | 'lifebuoy' | 'activity';

interface NavEntry {
  key: string;
  label: string;
  icon: IconName;
  faIcon?: string;
}

interface SearchEntry {
  label: string;
  path: string;
  icon: IconName;
  section: string;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const SIDEBAR_KEY = 'mh_tenant_sidebar_collapsed';
const MOBILE_BREAKPOINT = 900;

type SidebarSection = 'accounting' | 'sales' | 'operations' | 'marketing' | 'commerce' | 'admin';

@Component({
  selector: 'app-seller-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet],
  template: `
    <div class="dash">
      @if (mobileOpen()) {
        <div class="backdrop" (click)="collapsed.set(true)"></div>
      }

      <aside [class.collapsed]="collapsed()">
        <div class="brand-row">
          <a [routerLink]="tenantLink()" class="brand serif" (click)="onNavigate()">
            <span class="mark">M</span><span class="label-text">arketHub</span>
          </a>
        </div>
        <p class="muted subtitle label-text">Tenant console</p>

        <nav>
          <a
            [routerLink]="tenantLink()"
            routerLinkActive="on"
            [routerLinkActiveOptions]="{ exact: true }"
            (click)="onNavigate()"
            [title]="collapsed() ? 'Dashboard' : ''"
          >
            <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'home' }" />
            <span class="label-text">Dashboard</span>
          </a>

          @if (canViewAccounting()) {
          <p class="section-label label-text">Accounting</p>
          <div class="nav-group-wrapper" [class.open]="accountingOpen()">
            <button type="button" class="nav-group" [class.open]="accountingOpen()" (click)="toggleAccounting()" aria-label="Toggle accounting menu" [attr.aria-expanded]="accountingOpen()" [title]="collapsed() ? 'Finance & accounts' : ''">
              <span class="nav-group-copy">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'finance' }" />
                <span class="label-text">Finance & accounts</span>
              </span>
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
            </button>
            <div class="subnav" [class.open]="accountingOpen()">
              <div class="flyout-header">Finance & accounts</div>
              @for (item of accountingItems; track item.key) {
                <a [routerLink]="tenantLink(item.key)" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }" (click)="onNavigate()" [title]="collapsed() ? item.label : ''">
                  <i [class]="item.faIcon || ''" aria-hidden="true"></i><span>{{ item.label }}</span>
                </a>
              }
            </div>
          </div>
          }

          @if (canViewSales()) {
          <p class="section-label label-text">Sales</p>
          <div class="nav-group-wrapper" [class.open]="salesOpen()">
            <button type="button" class="nav-group" [class.open]="salesOpen()" (click)="toggleSales()" aria-label="Toggle sales menu" [attr.aria-expanded]="salesOpen()" [title]="collapsed() ? 'Sales workspace' : ''">
              <span class="nav-group-copy">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'sales' }" />
                <span class="label-text">Sales workspace</span>
              </span>
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
            </button>
            <div class="subnav" [class.open]="salesOpen()">
              <div class="flyout-header">Sales workspace</div>
              @for (item of salesItems; track item.key) {
                <a [routerLink]="tenantLink(item.key)" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }" (click)="onNavigate()" [title]="collapsed() ? item.label : ''">
                  <i [class]="item.faIcon || ''" aria-hidden="true"></i><span>{{ item.label }}</span>
                </a>
              }
            </div>
          </div>
          }

          @if (canViewOperations()) {
          <p class="section-label label-text">Operations</p>
          <div class="nav-group-wrapper" [class.open]="operationsOpen()">
            <button type="button" class="nav-group" [class.open]="operationsOpen()" (click)="toggleOperations()" aria-label="Toggle operations menu" [attr.aria-expanded]="operationsOpen()" [title]="collapsed() ? 'Operations' : ''">
              <span class="nav-group-copy">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'operations' }" />
                <span class="label-text">Operations</span>
              </span>
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
            </button>
            <div class="subnav" [class.open]="operationsOpen()">
              <div class="flyout-header">Operations</div>
              @for (item of operationsItems; track item.key) {
                <a [routerLink]="tenantLink(item.key)" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }" (click)="onNavigate()" [title]="collapsed() ? item.label : ''"><i [class]="item.faIcon || ''" aria-hidden="true"></i><span>{{ item.label }}</span></a>
              }
            </div>
          </div>
          }

          @if (canViewMarketing()) {
          <p class="section-label label-text">Marketing</p>
          <div class="nav-group-wrapper" [class.open]="marketingOpen()">
            <button type="button" class="nav-group" [class.open]="marketingOpen()" (click)="toggleMarketing()" aria-label="Toggle marketing menu" [attr.aria-expanded]="marketingOpen()" [title]="collapsed() ? 'Marketing' : ''">
              <span class="nav-group-copy">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'marketing' }" />
                <span class="label-text">Marketing</span>
              </span>
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
            </button>
            <div class="subnav" [class.open]="marketingOpen()">
              <div class="flyout-header">Marketing</div>
              @for (item of marketingItems; track item.key) {
                <a [routerLink]="tenantLink(item.key)" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }" (click)="onNavigate()" [title]="collapsed() ? item.label : ''"><i [class]="item.faIcon || ''" aria-hidden="true"></i><span>{{ item.label }}</span></a>
              }
            </div>
          </div>
          }

          <p class="section-label label-text">Commerce</p>
          <div class="nav-group-wrapper" [class.open]="commerceOpen()">
            <button type="button" class="nav-group" [class.open]="commerceOpen()" (click)="toggleCommerce()" aria-label="Toggle commerce menu" [attr.aria-expanded]="commerceOpen()" [title]="collapsed() ? 'Commerce' : ''">
              <span class="nav-group-copy">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'store' }" />
                <span class="label-text">Commerce</span>
              </span>
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
            </button>
            <div class="subnav grouped-subnav" [class.open]="commerceOpen()">
              <div class="flyout-header">Commerce</div>
              @for (c of commerceItems; track c.key) {
                <a [routerLink]="tenantLink(c.key)" routerLinkActive="on" (click)="onNavigate()" [title]="collapsed() ? c.label : ''">
                  <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: c.icon }" />
                  <span>{{ c.label }}</span>
                </a>
              }
            </div>
          </div>

          @if (isOwner()) {
            <p class="section-label label-text">Admin</p>
            <div class="nav-group-wrapper nav-group-bottom" [class.open]="adminOpen()">
              <button type="button" class="nav-group" [class.open]="adminOpen()" (click)="toggleAdmin()" aria-label="Toggle admin menu" [attr.aria-expanded]="adminOpen()" [title]="collapsed() ? 'Admin' : ''">
                <span class="nav-group-copy">
                  <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'settings' }" />
                  <span class="label-text">Admin</span>
                </span>
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
              </button>
              <div class="subnav grouped-subnav" [class.open]="adminOpen()">
                <div class="flyout-header">Admin</div>
                @for (a of adminItems; track a.key) {
                  <a [routerLink]="tenantLink(a.key)" routerLinkActive="on" (click)="onNavigate()" [title]="collapsed() ? a.label : ''">
                    <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: a.icon }" />
                    <span>{{ a.label }}</span>
                  </a>
                }
              </div>
            </div>
          }

          <p class="section-label label-text">Support</p>
          <a [routerLink]="tenantLink('support')" routerLinkActive="on" (click)="onNavigate()" [title]="collapsed() ? 'Help centre' : ''">
            <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'lifebuoy' }" />
            <span class="label-text">Help centre</span>
          </a>
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
              aria-label="Search the tenant console"
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
            <div class="dropdown-wrap" (click)="$event.stopPropagation()">
              <button type="button" class="icon-btn" (click)="toggleNotifications()" aria-label="Notifications" [attr.aria-expanded]="notifOpen()">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'bell' }" />
                @if (unreadCount() > 0) { <span class="badge">{{ unreadCount() }}</span> }
              </button>
              @if (notifOpen()) {
                <div class="dropdown notif-panel">
                  <div class="dropdown-head">
                    <span>Notifications</span>
                    @if (unreadCount() > 0) {
                      <button type="button" class="link-btn" (click)="markAllRead()">Mark all read</button>
                    }
                  </div>
                  @if (notifications().length) {
                    <ul>
                      @for (n of notifications(); track n.id) {
                        <li [class.unread]="!n.read" (click)="markRead(n.id)">
                          <span class="dot" [class.hide]="n.read"></span>
                          <div class="n-body">
                            <p class="n-title">{{ n.title }}</p>
                            <p class="n-msg muted">{{ n.message }}</p>
                            <p class="n-time muted">{{ n.time }}</p>
                          </div>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="empty-note muted">You're all caught up.</p>
                  }
                </div>
              }
            </div>

            <button
              type="button"
              class="icon-btn"
              (click)="theme.toggle()"
              [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: theme.theme() === 'dark' ? 'sun' : 'moon' }" />
            </button>

            <div class="dropdown-wrap" (click)="$event.stopPropagation()">
              <button type="button" class="profile-btn" (click)="toggleProfile()" [attr.aria-expanded]="profileOpen()">
                <span class="avatar">{{ initials() }}</span>
                <span class="who">
                  <span class="who-name">{{ auth.user()?.name }}</span>
                  <span class="who-role muted">{{ roleLabel() }}</span>
                </span>
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
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
                  <a [routerLink]="tenantLink()" (click)="closeMenus()">Dashboard</a>
                  @if (isOwner()) {
                    <a [routerLink]="tenantLink('settings')" (click)="closeMenus()">Account settings</a>
                  }
                  <button type="button" class="logout-btn" (click)="auth.logout()">Log out</button>
                </div>
              }
            </div>
          </div>
        </header>

        <section class="body"><router-outlet /></section>
      </div>
    </div>

    <ng-template #navIcon let-name>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        @switch (name) {
          @case ('home') {
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
          }
          @case ('lifebuoy') {
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><line x1="4.9" y1="4.9" x2="9.2" y2="9.2" /><line x1="14.8" y1="14.8" x2="19.1" y2="19.1" /><line x1="14.8" y1="9.2" x2="19.1" y2="4.9" /><line x1="4.9" y1="19.1" x2="9.2" y2="14.8" />
          }
          @case ('finance') {
            <circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2c0 2.5-5 1.5-5 4 0 1.1 1.1 2 2.5 2s2.5-.9 2.5-2" />
          }
          @case ('sales') {
            <polyline points="3 17 9 11 13 15 21 6" /><polyline points="14 6 21 6 21 13" />
          }
          @case ('operations') {
            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
          }
          @case ('marketing') {
            <path d="M3 11v3a1 1 0 0 0 1 1h3l4 4V6L7 10H4a1 1 0 0 0-1 1z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />
          }
          @case ('store') {
            <path d="M3 9l1.5-5h15L21 9" /><path d="M5 9v11h14V9" /><path d="M9.5 20v-5.5h5V20" />
          }
          @case ('orders') {
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          }
          @case ('products') {
            <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3v5.59a2 2 0 0 0 .59 1.42l9.58 9.58a2 2 0 0 0 2.83 0l3.59-3.59a2 2 0 0 0 0-2.59z" /><circle cx="8" cy="8" r="1.2" />
          }
          @case ('inventory') {
            <rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" /><line x1="10" y1="13" x2="14" y2="13" />
          }
          @case ('ads') {
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" />
          }
          @case ('analytics') {
            <line x1="4" y1="20" x2="20" y2="20" /><rect x="6" y="11" width="3" height="7" /><rect x="13" y="7" width="3" height="11" /><rect x="17.5" y="13" width="3" height="5" />
          }
          @case ('users') {
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          }
          @case ('settings') {
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .7.4 1.31 1.05 1.6.31.14.65.22 1 .25l.5.01a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          }
          @case ('backups') {
            <ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
          }
          @case ('activity') {
            <path d="M12 8v5l3 2" /><circle cx="12" cy="12" r="9" />
          }
          @case ('domains') {
            <circle cx="12" cy="12" r="9" /><line x1="3" y1="12" x2="21" y2="12" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
          }
          @case ('apikeys') {
            <circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.9 12.1 20 3l1.5 1.5L20 6l1.5 1.5L20 9" />
          }
          @case ('webhooks') {
            <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="12" cy="18" r="3" /><path d="M8.5 7.5 10 15M15.5 7.5 14 15" />
          }
          @case ('ai') {
            <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" /><circle cx="12" cy="12" r="3.2" />
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
      padding: 24px 16px 16px 16px; border-right: 1px solid var(--line);
      background: #f7f1e4; display: flex; flex-direction: column; gap: 8px;
      transition: width .2s ease, transform .2s ease;
      z-index: 10;
    }
    /* Dark-chrome rules use :host-context, NOT :root[data-theme="dark"]: Angular's view encapsulation scopes :root inside component styles, so :root[data-theme] can never match and these rules used to be dead. */
    :host-context([data-theme="dark"]) aside { background: #1a1712; }
    .brand-row { display: flex; align-items: center; flex: none; }
    .brand { font-size: 22px; display: flex; align-items: center; gap: 2px; }
    .brand .mark {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 9px; background: var(--ink); color: var(--paper);
      font-size: 16px; flex: none;
    }
    .subtitle { margin: 2px 0 4px; font-size: 13px; flex: none; }
    nav {
      display: flex; flex-direction: column; gap: 2px;
      margin: 8px -16px 0 -16px; padding: 0 16px 8px 16px;
      overflow-y: auto; overflow-x: hidden;
      flex: 1 1 auto; min-height: 0;
      scrollbar-width: thin;
      scrollbar-color: rgba(0,0,0,.18) transparent;
    }
    :host-context([data-theme="dark"]) nav {
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
      background: rgba(0,0,0,.18);
      border-radius: 999px;
    }
    :host-context([data-theme="dark"]) nav::-webkit-scrollbar-thumb,
    :host-context([data-theme="dark"]) aside::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,.2);
    }
    nav::-webkit-scrollbar-thumb:hover,
    aside::-webkit-scrollbar-thumb:hover {
      background: rgba(0,0,0,.35);
    }
    :host-context([data-theme="dark"]) nav::-webkit-scrollbar-thumb:hover,
    :host-context([data-theme="dark"]) aside::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,.38);
    }
    .section-label { margin: 14px 10px 4px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); font-weight: 700; white-space: nowrap; }
    nav a {
      display: flex; align-items: center; gap: 11px;
      padding: 9px 12px; border-radius: 12px; font-weight: 600; color: var(--ink);
      white-space: nowrap;
    }
    nav a svg { width: 18px; height: 18px; flex: none; }
    nav a:hover { background: rgba(0,0,0,.06); }
    :host-context([data-theme="dark"]) nav a:hover { background: rgba(255,255,255,.07); }
    nav a.on { background: var(--ink); color: var(--paper); }
    .nav-group {
      width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 9px 10px; border: 0; border-radius: 12px; background: transparent; color: var(--ink);
      font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer;
    }
    .nav-group:hover { background: rgba(0,0,0,.06); }
    :host-context([data-theme="dark"]) .nav-group:hover { background: rgba(255,255,255,.07); }
    .nav-group-copy { display: flex; align-items: center; gap: 11px; }
    .nav-group svg { width: 18px; height: 18px; flex: none; }
    .nav-group > svg { width: 13px; height: 13px; transition: transform .18s ease; }
    .nav-group.open > svg { transform: rotate(180deg); }
    .subnav {
      display: none;
      flex-direction: column;
      gap: 1px;
      margin: 1px 0 4px 15px;
      padding-left: 11px;
      border-left: 1px solid var(--line);
    }
    .subnav.open { display: flex; }
    .flyout-header { display: none; }
    .subnav a {
      min-height: 30px; padding: 6px 9px; gap: 8px; border-radius: 9px;
      color: var(--ink-soft); font-size: 12px; display: flex; align-items: center;
      text-decoration: none;
    }
    .subnav a:hover { background: rgba(0,0,0,.06); }
    :host-context([data-theme="dark"]) .subnav a:hover { background: rgba(255,255,255,.07); }
    .subnav a.on { background: color-mix(in srgb, var(--accent-2) 14%, transparent); color: var(--accent-2); }
    .subnav a i { width: 15px; text-align: center; font-size: 11px; flex: none; }
    .subnav a svg { width: 15px; height: 15px; flex: none; }
    .logout {
      display: flex; align-items: center; gap: 10px; justify-content: flex-start;
      background: transparent; color: var(--ink); border: 1px solid var(--line);
      margin-top: auto; flex: none;
    }
    .logout svg { width: 18px; height: 18px; flex: none; }

    /* Collapsed = icon-only rail (desktop) */
    @media (min-width: 901px) {
      aside.collapsed {
        width: 76px;
        padding-left: 14px;
        padding-right: 14px;
        overflow: visible;
        z-index: 30;
      }
      aside.collapsed .label-text { display: none; }
      aside.collapsed .brand { justify-content: center; }
      aside.collapsed nav a { justify-content: center; padding: 10px; }
      aside.collapsed nav {
        margin-left: -14px;
        margin-right: -14px;
        padding-left: 14px;
        padding-right: 14px;
        overflow: visible;
      }
      aside.collapsed .section-label { display: none; }
      aside.collapsed .logout { justify-content: center; }
      aside.collapsed .nav-group-wrapper {
        position: relative;
        width: 100%;
      }
      aside.collapsed .nav-group {
        justify-content: center;
        padding: 10px;
        border-radius: 12px;
      }
      aside.collapsed .nav-group > svg { display: none; }
      aside.collapsed .nav-group-copy { justify-content: center; }

      /* In collapsed mode, hide inline subnav by default */
      aside.collapsed .subnav {
        display: none !important;
      }

      /* Hover state reveals the floating flyout menu to the right */
      aside.collapsed .nav-group-wrapper:hover .nav-group {
        background: rgba(0,0,0,.06);
      }
      :host-context([data-theme="dark"]) aside.collapsed .nav-group-wrapper:hover .nav-group {
        background: rgba(255,255,255,.07);
      }

      aside.collapsed .nav-group-wrapper:hover .subnav {
        display: flex !important;
        flex-direction: column;
        position: absolute;
        left: calc(100% + 8px);
        top: 0;
        min-width: 220px;
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        background: #f7f1e4;
        border: 1px solid var(--line);
        border-radius: 14px;
        box-shadow: 0 12px 32px rgba(0,0,0,0.18);
        padding: 8px;
        margin: 0;
        z-index: 1000;
      }
      :host-context([data-theme="dark"]) aside.collapsed .nav-group-wrapper:hover .subnav {
        background: #1f1c16;
        box-shadow: 0 12px 32px rgba(0,0,0,0.55);
      }

      /* Bottom-anchored flyout for lower groups like Admin */
      aside.collapsed .nav-group-wrapper.nav-group-bottom:hover .subnav {
        top: auto;
        bottom: 0;
      }

      /* Invisible hover bridge to prevent losing hover when moving mouse towards the flyout */
      aside.collapsed .nav-group-wrapper:hover .subnav::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: -12px;
        width: 12px;
      }

      /* Flyout header in collapsed mode */
      aside.collapsed .nav-group-wrapper .flyout-header {
        display: block;
        padding: 6px 10px 8px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
        color: var(--ink-soft);
        border-bottom: 1px solid var(--line);
        margin-bottom: 4px;
      }

      /* Subnav links inside flyout */
      aside.collapsed .nav-group-wrapper .subnav a {
        justify-content: flex-start !important;
        padding: 7px 10px !important;
        min-height: 32px;
        gap: 10px;
        border-radius: 8px;
        font-size: 12.5px;
        font-weight: 600;
        color: var(--ink);
        white-space: nowrap;
      }
      aside.collapsed .nav-group-wrapper .subnav a svg,
      aside.collapsed .nav-group-wrapper .subnav a i {
        width: 15px;
        height: 15px;
        font-size: 12px;
        text-align: center;
        flex: none;
      }
      aside.collapsed .nav-group-wrapper .subnav a:hover {
        background: rgba(0,0,0,.06);
      }
      :host-context([data-theme="dark"]) aside.collapsed .nav-group-wrapper .subnav a:hover {
        background: rgba(255,255,255,.08);
      }
      aside.collapsed .nav-group-wrapper .subnav a.on {
        background: var(--ink);
        color: var(--paper);
      }
    }

    /* Collapsed = hidden off-canvas drawer (mobile) */
    @media (max-width: 900px) {
      aside {
        position: fixed; top: 0; left: 0; height: 100vh; width: 264px;
        transform: translateX(-100%); box-shadow: var(--shadow); z-index: 40;
      }
      aside:not(.collapsed) { transform: translateX(0); }
      .backdrop { position: fixed; inset: 0; background: rgba(10, 8, 5, .45); z-index: 35; }
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

    .group-divider {
      height: 1px; margin: 8px 0 6px; background: var(--line); }
    .subnav-title {
      padding: 2px 8px 0; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); font-weight: 700; }
    .grouped-subnav { margin-top: 0; }
    .grouped-subnav .subnav-title { margin-top: 2px; }
    .grouped-subnav a {
      padding-left: 10px;
    }
    .grouped-subnav .label-text { overflow: visible; }
  `],
})
export class SellerShellComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  private router = inject(Router);

  isOwner = computed(() => this.auth.hasRole('tenant_owner'));
  canViewAccounting = computed(() => this.isOwner() || this.auth.user()?.department === 'finance');
  canViewSales = computed(() => this.isOwner() || this.auth.user()?.department === 'sales');
  canViewOperations = computed(() => this.isOwner() || this.auth.user()?.department === 'operations');
  canViewMarketing = computed(() => this.isOwner() || this.auth.user()?.department === 'marketing');

  readonly accountingItems: NavEntry[] = [
    { key: 'departments/finance', faIcon: 'fa-solid fa-table-columns', label: 'Overview', icon: 'finance' },
    { key: 'accounting/invoices', faIcon: 'fa-solid fa-file-invoice', label: 'Invoices', icon: 'finance' },
    { key: 'accounting/payments', faIcon: 'fa-solid fa-credit-card', label: 'Payments', icon: 'finance' },
    { key: 'accounting/expenses', faIcon: 'fa-solid fa-receipt', label: 'Expenses', icon: 'finance' },
    { key: 'accounting/procurement', faIcon: 'fa-solid fa-cart-shopping', label: 'Procurement', icon: 'operations' },
    { key: 'accounting/vendors', faIcon: 'fa-solid fa-handshake', label: 'Customers & vendors', icon: 'users' },
    { key: 'accounting/reconciliation', faIcon: 'fa-solid fa-building-columns', label: 'Bank reconciliation', icon: 'finance' },
    { key: 'accounting/chart-of-accounts', faIcon: 'fa-solid fa-book', label: 'Chart of accounts', icon: 'analytics' },
    { key: 'accounting/journals', faIcon: 'fa-solid fa-book-open', label: 'General journal', icon: 'finance' },
    { key: 'accounting/reports', faIcon: 'fa-solid fa-chart-column', label: 'Financial reports', icon: 'analytics' },
  ];

  readonly salesItems: NavEntry[] = [
    { key: 'departments/sales', faIcon: 'fa-solid fa-table-columns', label: 'Overview', icon: 'sales' },
    { key: 'sales/leads', faIcon: 'fa-solid fa-user-plus', label: 'Leads', icon: 'users' },
    { key: 'sales/pipeline', faIcon: 'fa-solid fa-filter', label: 'Pipeline', icon: 'sales' },
    { key: 'sales/quotes', faIcon: 'fa-solid fa-file-lines', label: 'Quotes', icon: 'finance' },
    { key: 'sales/customers', faIcon: 'fa-solid fa-user-group', label: 'Customers', icon: 'users' },
  ];

  readonly operationsItems: NavEntry[] = [
    { key: 'departments/operations', faIcon: 'fa-solid fa-table-columns', label: 'Overview', icon: 'operations' },
    { key: 'operations/fulfillment', faIcon: 'fa-solid fa-truck-fast', label: 'Fulfilment', icon: 'orders' },
    { key: 'operations/inventory', faIcon: 'fa-solid fa-boxes-stacked', label: 'Inventory', icon: 'inventory' },
    { key: 'operations/catalog', faIcon: 'fa-solid fa-folder-open', label: 'Catalogue', icon: 'products' },
  ];

  readonly marketingItems: NavEntry[] = [
    { key: 'departments/marketing', faIcon: 'fa-solid fa-table-columns', label: 'Overview', icon: 'marketing' },
    { key: 'marketing/campaigns', faIcon: 'fa-solid fa-bullhorn', label: 'Campaigns', icon: 'ads' },
    { key: 'marketing/performance', faIcon: 'fa-solid fa-chart-line', label: 'Performance', icon: 'analytics' },
  ];

  readonly commerceItems: NavEntry[] = [
    { key: 'stores', label: 'Stores', icon: 'store' },
    { key: 'orders', label: 'Orders', icon: 'orders' },
    { key: 'products', label: 'Products', icon: 'products' },
    { key: 'inventory', label: 'Inventory', icon: 'inventory' },
    { key: 'ads', label: 'Ads', icon: 'ads' },
    { key: 'analytics', label: 'Analytics', icon: 'analytics' },
  ];

  readonly adminItems: NavEntry[] = [
    { key: 'users', label: 'Users & permissions', icon: 'users' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
    { key: 'activity', label: 'Activity log', icon: 'activity' },
    { key: 'backups', label: 'Backups', icon: 'backups' },
    { key: 'domains', label: 'Domains', icon: 'domains' },
    { key: 'api-keys', label: 'API keys', icon: 'apikeys' },
    { key: 'webhooks', label: 'Webhooks', icon: 'webhooks' },
    { key: 'ai', label: 'AI', icon: 'ai' },
  ];

  activeSection = signal<SidebarSection | null>(this.initialSection());

  /** Accordion menu state: opening one dropdown automatically closes the others. */
  accountingOpen = computed(() => this.activeSection() === 'accounting');
  salesOpen = computed(() => this.activeSection() === 'sales');
  operationsOpen = computed(() => this.activeSection() === 'operations');
  marketingOpen = computed(() => this.activeSection() === 'marketing');
  commerceOpen = computed(() => this.activeSection() === 'commerce');
  adminOpen = computed(() => this.activeSection() === 'admin');

  /** Sidebar collapse (icon rail on desktop, off-canvas drawer on mobile). */
  collapsed = signal(this.initialCollapsed());
  /** Backdrop only ever paints on small screens (hidden via CSS at desktop widths). */
  mobileOpen = computed(() => !this.collapsed());

  // ---- Search ----
  searchTerm = signal('');
  searchFocused = signal(false);
  showSearchPanel = computed(() => this.searchFocused());

  searchIndex = computed<SearchEntry[]>(() => {
    const items: SearchEntry[] = [{ label: 'Dashboard', path: this.tenantLink(), icon: 'home', section: 'Overview' }];
    if (this.canViewAccounting()) {
      for (const a of this.accountingItems) {
        items.push({ label: a.label, path: this.tenantLink(a.key), icon: a.icon, section: 'Accounting' });
      }
    }
    if (this.canViewSales()) {
      for (const s of this.salesItems) {
        items.push({ label: s.label, path: this.tenantLink(s.key), icon: s.icon, section: 'Sales' });
      }
    }
    if (this.canViewOperations()) {
      for (const item of this.operationsItems) items.push({ label: item.label, path: this.tenantLink(item.key), icon: item.icon, section: 'Operations' });
    }
    if (this.canViewMarketing()) {
      for (const item of this.marketingItems) items.push({ label: item.label, path: this.tenantLink(item.key), icon: item.icon, section: 'Marketing' });
    }
    for (const c of this.commerceItems) {
      items.push({ label: c.label, path: this.tenantLink(c.key), icon: c.icon, section: 'Commerce' });
    }
    if (this.isOwner()) {
      for (const a of this.adminItems) {
        items.push({ label: a.label, path: this.tenantLink(a.key), icon: a.icon, section: 'Admin' });
      }
    }
    return items;
  });

  searchResults = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return [];
    return this.searchIndex().filter((i) => i.label.toLowerCase().includes(term));
  });

  // ---- Notifications (demo data; wire to a real feed when the API exists) ----
  notifications = signal<NotificationItem[]>([
    { id: 1, title: 'New order received', message: 'Order #10456 was just placed for $128.40.', time: '5m ago', read: false },
    { id: 2, title: 'Low stock alert', message: '“Ceramic Mug — Sand” has 3 units left.', time: '1h ago', read: false },
    { id: 3, title: 'Payout sent', message: 'Your weekly payout of $2,340.00 was sent.', time: 'Yesterday', read: false },
    { id: 4, title: 'Staff invite accepted', message: 'A new teammate joined your store.', time: '2 days ago', read: true },
  ]);
  unreadCount = computed(() => this.notifications().filter((n) => !n.read).length);
  notifOpen = signal(false);
  profileOpen = signal(false);

  initials = computed(() => {
    const name = this.auth.user()?.name ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join('') || 'U';
  });

  roleLabel = computed(() => {
    const user = this.auth.user();
    if (!user) return '';
    if (user.role === 'tenant_owner') return 'Tenant owner';
    if (user.role === 'store_staff') return user.department ? `${user.department} staff` : 'Store staff';
    return user.role;
  });

  constructor() {
    effect(() => {
      if (typeof window === 'undefined' || this.isMobile()) return;
      try {
        localStorage.setItem(SIDEBAR_KEY, this.collapsed() ? '1' : '0');
      } catch {
        /* ignore storage failures (private mode, etc.) */
      }
    });
  }

  tenantLink(path = ''): string {
    const base = this.router.url.startsWith('/seller') ? '/seller' : '/tenant';
    return path ? `${base}/${path}` : base;
  }

  toggleSidebar() {
    this.collapsed.update((v) => !v);
  }

  private initialSection(): SidebarSection | null {
    if (typeof window === 'undefined') return 'commerce';
    const url = window.location.pathname || this.router.url;
    if (url.includes('/accounting') || url.includes('/departments/finance')) return 'accounting';
    if (url.includes('/sales') || url.includes('/departments/sales')) return 'sales';
    if (url.includes('/operations') || url.includes('/departments/operations')) return 'operations';
    if (url.includes('/marketing') || url.includes('/departments/marketing')) return 'marketing';
    if (
      url.includes('/users') ||
      url.includes('/settings') ||
      url.includes('/backups') ||
      url.includes('/domains') ||
      url.includes('/api-keys') ||
      url.includes('/webhooks') ||
      url.includes('/ai')
    ) {
      return 'admin';
    }
    return 'commerce';
  }

  toggleSection(section: SidebarSection) {
    this.activeSection.update((current) => (current === section ? null : section));
  }

  toggleAccounting() {
    this.toggleSection('accounting');
  }

  toggleSales() {
    this.toggleSection('sales');
  }

  toggleOperations() {
    this.toggleSection('operations');
  }

  toggleMarketing() {
    this.toggleSection('marketing');
  }

  toggleCommerce() {
    this.toggleSection('commerce');
  }

  toggleAdmin() {
    this.toggleSection('admin');
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
    this.notifOpen.update((v) => !v);
    this.profileOpen.set(false);
    this.searchFocused.set(false);
  }

  markRead(id: number) {
    this.notifications.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  markAllRead() {
    this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
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
