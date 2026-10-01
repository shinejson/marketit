import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

type NavItem = { label: string; route: string; icon: string; exact?: boolean };
type NavGroup = { title: string; items: NavItem[] };

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="dash" [class.collapsed]="collapsed()">
      <aside class="sidebar">
        <div class="brand-row">
          <a routerLink="/" class="brand serif"><span class="brand-mark">M</span><span class="brand-name">MarketHub</span></a>
        </div>
        <div class="workspace"><span class="avatar small">SA</span><span class="brand-name"><b>Super admin</b><small>Platform workspace</small></span></div>
        <nav aria-label="Admin navigation">
          @for (group of filteredGroups(); track group.title) {
            <p class="section">{{ group.title }}</p>
            @for (item of group.items; track item.route) {
              <a [routerLink]="item.route" routerLinkActive="on" [routerLinkActiveOptions]="{exact: item.exact ?? false}" [title]="collapsed() ? item.label : ''">
                <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span><span class="nav-label">{{ item.label }}</span>
              </a>
            }
          }
          @if (filteredGroups().length === 0) { <div class="no-results">No pages found</div> }
        </nav>
        <button class="logout" (click)="auth.logout()"><span class="nav-icon">↪</span><span class="nav-label">Log out</span></button>
      </aside>

      <section class="main-area">
        <header class="topbar">
          <button class="icon-btn menu-btn" (click)="toggleSidebar()" [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'" [attr.aria-expanded]="!collapsed()">☰</button>
          <div class="top-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search anything..." [value]="search()" (input)="search.set($any($event.target).value)" aria-label="Search admin pages"><kbd>⌘ K</kbd></div>
          <div class="top-actions">
            <button class="icon-btn notification" (click)="notificationsOpen.set(!notificationsOpen())" aria-label="Notifications">♢<i></i></button>
            @if (notificationsOpen()) { <div class="popover notification-pop"><b>Notifications</b><p>You're all caught up.</p><small>New activity will appear here.</small></div> }
            <button class="theme-btn" (click)="theme.toggle()" [attr.aria-label]="theme.theme() === 'dark' ? 'Use light theme' : 'Use dark theme'"><span>{{ theme.theme() === 'dark' ? '☀' : '☾' }}</span><span class="theme-label">{{ theme.theme() === 'dark' ? 'Light' : 'Dark' }}</span></button>
            <button class="profile" (click)="profileOpen.set(!profileOpen())" aria-label="Open profile menu"><span class="avatar">SA</span><span class="profile-copy"><b>Super Admin</b><small>Administrator</small></span><span class="chevron">⌄</span></button>
            @if (profileOpen()) { <div class="popover profile-pop"><a routerLink="/admin/settings" (click)="profileOpen.set(false)">⚙ Account settings</a><button (click)="auth.logout()">↪ Log out</button></div> }
          </div>
        </header>
        <main class="content"><router-outlet /></main>
      </section>
    </div>
  `,
  styles: [`
    .dash { display:grid; grid-template-columns: 248px 1fr; min-height:100vh; transition:grid-template-columns .22s ease; }
    .dash.collapsed { grid-template-columns: 76px 1fr; }
    .sidebar { position:sticky; top:0; height:100vh; padding:24px 14px 18px; border-right:1px solid var(--line); background:#1c1914; color:#f4efe6; display:flex; flex-direction:column; overflow:hidden; }
    .brand-row { padding:0 10px 22px; border-bottom:1px solid #39342d; }.brand { display:flex; align-items:center; gap:10px; font-size:22px; white-space:nowrap; }.brand-mark { display:grid; place-items:center; width:30px; height:30px; border-radius:9px; color:white; background:var(--accent); font:700 16px Georgia; }.workspace { display:flex; align-items:center; gap:10px; margin:20px 8px 8px; min-width:210px; }.workspace small,.profile-copy small { display:block; color:#9a9181; font-size:11px; margin-top:2px; }.avatar { display:grid; place-items:center; width:36px; height:36px; flex:none; border-radius:50%; background:#e9b949; color:#392c12; font-size:11px; font-weight:800; }.avatar.small { width:32px; height:32px; }
    nav { display:flex; flex-direction:column; gap:4px; margin:8px 0 auto; overflow-y:auto; }.section { margin:16px 10px 5px; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#9a9181; white-space:nowrap; }.collapsed .section { font-size:0; height:8px; margin:10px 0; border-top:1px solid #39342d; }.sidebar nav a,.logout { display:flex; align-items:center; gap:12px; min-height:42px; padding:9px 12px; border-radius:11px; color:#d4ccbd; font-weight:600; font-size:14px; white-space:nowrap; }.sidebar nav a:hover,.logout:hover { background:rgba(255,255,255,.08); color:#fff; }.sidebar nav a.on { background:#c45c26; color:#fff; }.nav-icon { width:20px; text-align:center; flex:none; font-size:19px; line-height:1; }.collapsed .brand-name,.collapsed .nav-label,.collapsed .profile-copy,.collapsed .chevron { display:none; }.collapsed .brand,.collapsed .workspace { justify-content:center; min-width:0; }.collapsed .workspace { margin-left:0; }.collapsed .sidebar nav a,.collapsed .logout { justify-content:center; padding-inline:0; }.logout { width:100%; border:0; background:transparent; color:#d4ccbd; cursor:pointer; text-align:left; }.no-results { color:#9a9181; padding:16px 10px; font-size:13px; }
    .main-area { min-width:0; }.topbar { position:sticky; z-index:5; top:0; height:76px; display:flex; align-items:center; gap:20px; padding:0 32px; border-bottom:1px solid var(--line); background:color-mix(in srgb, var(--paper) 94%, transparent); backdrop-filter:blur(12px); }.icon-btn { border:0; background:transparent; color:var(--ink); cursor:pointer; font-size:23px; padding:8px; border-radius:10px; }.icon-btn:hover { background:var(--paper-2); }.top-search { display:flex; align-items:center; gap:10px; width:min(390px,45vw); padding:9px 12px; border:1px solid var(--line); background:var(--card); border-radius:11px; color:var(--ink-soft); }.top-search input { border:0; outline:0; width:100%; background:transparent; color:var(--ink); }.top-search kbd { white-space:nowrap; color:var(--ink-soft); font-size:11px; }.top-actions { display:flex; align-items:center; gap:12px; margin-left:auto; position:relative; }.notification { position:relative; font-size:25px; }.notification i { position:absolute; top:6px; right:6px; width:6px; height:6px; background:var(--accent); border:2px solid var(--paper); border-radius:50%; }.theme-btn,.profile { display:flex; align-items:center; gap:8px; border:1px solid var(--line); background:transparent; color:var(--ink); border-radius:10px; padding:8px 10px; cursor:pointer; }.theme-btn:hover,.profile:hover { background:var(--paper-2); }.profile { border:0; text-align:left; }.profile-copy { display:block; font-size:13px; line-height:1.1; }.chevron { font-size:18px; }.popover { position:absolute; z-index:10; right:0; top:52px; width:230px; padding:16px; background:var(--card); border:1px solid var(--line); border-radius:14px; box-shadow:var(--shadow); color:var(--ink); }.popover p { margin:14px 0 3px; }.popover small { color:var(--ink-soft); }.profile-pop { top:58px; display:flex; flex-direction:column; gap:4px; }.profile-pop a,.profile-pop button { padding:10px; border:0; background:transparent; color:var(--ink); text-align:left; border-radius:8px; cursor:pointer; }.profile-pop a:hover,.profile-pop button:hover { background:var(--paper-2); }.content { padding:28px; }
    @media (max-width:760px) { .dash,.dash.collapsed { grid-template-columns:1fr; }.sidebar { position:fixed; z-index:20; width:248px; transform:translateX(0); box-shadow:var(--shadow); }.dash.collapsed .sidebar { transform:translateX(-100%); }.topbar { padding:0 16px; gap:8px; }.theme-label,.profile-copy,.chevron { display:none; }.top-search { width:auto; flex:1; }.content { padding:18px 14px; } }
  `],
})
export class AdminShellComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  collapsed = signal(false);
  search = signal('');
  notificationsOpen = signal(false);
  profileOpen = signal(false);
  groups: NavGroup[] = [
    { title: 'Overview', items: [{ label: 'Dashboard', route: '/admin', icon: '⌂', exact: true }, { label: 'Analytics', route: '/admin/analytics', icon: '⌁' }] },
    { title: 'Manage', items: [{ label: 'Tenants', route: '/admin/tenants', icon: '▦' }, { label: 'Users', route: '/admin/users', icon: '♙' }, { label: 'Subscriptions', route: '/admin/subscriptions', icon: '◈' }, { label: 'Orders', route: '/admin/orders', icon: '☷' }] },
    { title: 'Platform', items: [{ label: 'Domains', route: '/admin/domains', icon: '◎' }, { label: 'Ads', route: '/admin/ads', icon: '◇' }, { label: 'Audit log', route: '/admin/audit', icon: '▤' }, { label: 'Settings', route: '/admin/settings', icon: '⚙' }] },
  ];
  filteredGroups = computed(() => { const q = this.search().trim().toLowerCase(); return this.groups.map(g => ({ ...g, items: g.items.filter(i => !q || i.label.toLowerCase().includes(q)) })).filter(g => g.items.length); });
  toggleSidebar() { this.collapsed.update(v => !v); }
}
