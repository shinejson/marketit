import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type NotificationType = 'order' | 'seller' | 'security' | 'system';
type NotificationFilter = 'all' | 'unread' | NotificationType;
type PreferenceKey = 'order_updates' | 'seller_applications' | 'security_alerts' | 'digest';

interface AdminNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  group: 'Today' | 'Yesterday';
  read: boolean;
  reference?: string;
}

@Component({
  selector: 'app-admin-orders',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <header class="page-head">
        <div>
          <p class="eyebrow">Platform inbox</p>
          <div class="title-row">
            <div class="title-mark"><span class="pulse"></span><span></span><span></span></div>
            <div><h1>Notifications</h1><p class="intro">A clear view of the updates that need your attention across MarketHub.</p></div>
          </div>
        </div>
        <div class="head-actions">
          <span class="sync-status"><i></i> Synced just now</span>
          @if (unreadCount()) { <button class="btn accent" type="button" (click)="markAllRead()">Mark all as read</button> }
        </div>
      </header>

      <section class="summary-grid" aria-label="Notification summary">
        <article class="summary card"><div class="summary-icon orange"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10.3 21h3.4"/></svg></div><div><span>Unread</span><strong>{{ unreadCount() }}</strong><small>Needs your review</small></div></article>
        <article class="summary card"><div class="summary-icon green"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/></svg></div><div><span>Today</span><strong>{{ todayCount() }}</strong><small>Updates received today</small></div></article>
        <article class="summary card"><div class="summary-icon blue"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg></div><div><span>Order updates</span><strong>{{ typeCount('order') }}</strong><small>Fulfilment and payments</small></div></article>
        <article class="summary card"><div class="summary-icon purple"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg></div><div><span>System alerts</span><strong>{{ typeCount('system') + typeCount('security') }}</strong><small>Security and platform health</small></div></article>
      </section>

      <div class="layout">
        <section class="inbox card">
          <div class="inbox-head">
            <div><div class="section-kicker">Inbox</div><h2>Recent activity</h2><p class="muted">Stay on top of orders, seller applications and platform health.</p></div>
            <span class="inbox-count">{{ filteredNotifications().length }} updates</span>
          </div>
          <div class="toolbar">
            <label class="search-box"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input [(ngModel)]="query" type="search" placeholder="Search notifications" aria-label="Search notifications" /></label>
            <div class="tabs" role="tablist" aria-label="Notification filters">
              <button type="button" [class.on]="filter() === 'all'" (click)="filter.set('all')">All <b>{{ notifications().length }}</b></button>
              <button type="button" [class.on]="filter() === 'unread'" (click)="filter.set('unread')">Unread <b>{{ unreadCount() }}</b></button>
              <button type="button" [class.on]="filter() === 'order'" (click)="filter.set('order')">Orders <b>{{ typeCount('order') }}</b></button>
              <button type="button" [class.on]="filter() === 'system'" (click)="filter.set('system')">System <b>{{ typeCount('system') + typeCount('security') }}</b></button>
            </div>
          </div>

          @if (filteredNotifications().length) {
            <div class="notification-list">
              @for (group of groupedNotifications(); track group.label) {
                <div class="date-group"><span>{{ group.label }}</span><i></i></div>
                @for (item of group.items; track item.id) {
                  <article class="notification" [class.unread]="!item.read" (click)="markRead(item.id)">
                    <div [class]="'type-icon ' + item.type">
                      @switch (item.type) {
                        @case ('order') { <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h3"/></svg> }
                        @case ('seller') { <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16v11H4zM3 9l2-5h14l2 5M9 20v-6h6v6"/></svg> }
                        @case ('security') { <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s8-4 8-10V5l-8-3-8 3v6c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg> }
                        @default { <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.01"/></svg> }
                      }
                    </div>
                    <div class="notification-copy"><div class="notification-line"><strong>{{ item.title }}</strong><span [class]="'kind ' + item.type">{{ typeLabel(item.type) }}</span></div><p>{{ item.message }}</p><div class="notification-meta"><span>{{ item.time }}</span>@if (item.reference) { <i></i><span>{{ item.reference }}</span> }</div></div>
                    @if (!item.read) { <span class="unread-dot" aria-label="Unread"></span> } @else { <span class="read-check" aria-label="Read">✓</span> }
                    <button class="more-btn" type="button" (click)="$event.stopPropagation(); markRead(item.id)" [attr.aria-label]="item.read ? 'Mark as read' : 'Mark as read'" title="Mark as read">{{ item.read ? 'Read' : 'Mark read' }}</button>
                  </article>
                }
              }
            </div>
          } @else {
            <div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10.3 21h3.4"/></svg></div><h3>{{ query ? 'No matching notifications' : 'You are all caught up' }}</h3><p class="muted">{{ query ? 'Try another search term or clear the current filter.' : 'New platform updates will appear here.' }}</p>@if (query) { <button type="button" class="btn ghost" (click)="query = ''; filter.set('all')">Clear filters</button> }</div>
          }
          <footer class="inbox-foot"><span class="muted">Showing the latest {{ notifications().length }} updates</span><a routerLink="/admin/audit">View audit log <span>→</span></a></footer>
        </section>

        <aside class="side-column">
          <section class="preferences card">
            <div class="section-kicker">Preferences</div><h2>Notification settings</h2><p class="muted">Choose what should appear in your admin inbox.</p>
            <div class="preference-list">
              <div class="preference"><span class="pref-icon order">▣</span><span><strong>Order updates</strong><small>Payments and fulfilment</small></span><button type="button" class="switch" [class.on]="preferences().order_updates" (click)="togglePreference('order_updates')" [attr.aria-pressed]="preferences().order_updates" aria-label="Toggle order updates"><i></i></button></div>
              <div class="preference"><span class="pref-icon seller">⌂</span><span><strong>Seller applications</strong><small>New tenants to review</small></span><button type="button" class="switch" [class.on]="preferences().seller_applications" (click)="togglePreference('seller_applications')" [attr.aria-pressed]="preferences().seller_applications" aria-label="Toggle seller applications"><i></i></button></div>
              <div class="preference"><span class="pref-icon security">✓</span><span><strong>Security alerts</strong><small>Always recommended</small></span><button type="button" class="switch" [class.on]="preferences().security_alerts" (click)="togglePreference('security_alerts')" [attr.aria-pressed]="preferences().security_alerts" aria-label="Toggle security alerts"><i></i></button></div>
              <div class="preference"><span class="pref-icon digest">✦</span><span><strong>Weekly digest</strong><small>Performance summary</small></span><button type="button" class="switch" [class.on]="preferences().digest" (click)="togglePreference('digest')" [attr.aria-pressed]="preferences().digest" aria-label="Toggle weekly digest"><i></i></button></div>
            </div>
            <a class="settings-link" routerLink="/admin/settings">Manage all settings <span>→</span></a>
          </section>

          <section class="health card"><div class="health-head"><div><div class="section-kicker">Platform pulse</div><h2>Everything looks good</h2></div><span class="pulse-check">✓</span></div><div class="health-bar"><span></span></div><div class="health-stats"><div><strong>99.98%</strong><small>Uptime this month</small></div><div><strong>42 ms</strong><small>Average response</small></div></div><p class="last-sync"><i></i> Last checked a few seconds ago</p></section>

          <section class="help-card"><div class="help-icon">?</div><div><strong>Need a little more context?</strong><p class="muted">The audit log keeps the complete, immutable record of every platform action.</p><a routerLink="/admin/audit">Open audit log <span>→</span></a></div></section>
        </aside>
      </div>
    </main>
  `,
  styles: [`
    :host { display:block; }
    .page { max-width:1440px; margin:0 auto; padding-bottom:50px; }
    .page-head { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; flex-wrap:wrap; margin-bottom:22px; }.eyebrow, .section-kicker { margin:0 0 7px; color:var(--accent); font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }.title-row { display:flex; align-items:center; gap:14px; }.title-mark { display:grid; grid-template-columns:repeat(3,6px); align-items:end; gap:3px; width:38px; height:38px; padding:10px; border-radius:12px; background:var(--ink); }.title-mark span { display:block; height:14px; border-radius:3px; background:var(--accent); opacity:.7; }.title-mark span:nth-child(2) { height:19px; opacity:.85; }.title-mark span:nth-child(3) { height:9px; }.title-mark .pulse { box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 25%,transparent); }.title-row h1 { margin:0; font-size:clamp(30px,3vw,42px); line-height:1.05; }.intro { margin:8px 0 0; color:var(--ink-soft); font-size:14px; }.head-actions { display:flex; align-items:center; gap:14px; }.sync-status { display:flex; align-items:center; gap:7px; color:var(--ink-soft); font-size:12px; font-weight:650; }.sync-status i, .last-sync i { display:inline-block; width:7px; height:7px; border-radius:50%; background:#4ca878; box-shadow:0 0 0 4px rgba(76,168,120,.13); }.btn { border:0; border-radius:999px; padding:11px 16px; color:#fff; background:var(--ink); cursor:pointer; font-size:12px; font-weight:700; }.btn.accent { background:var(--accent); }.btn.ghost { color:var(--ink); background:transparent; border:1px solid var(--line); }.btn:hover { filter:brightness(.97); }.btn:focus-visible, button:focus-visible, input:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
    .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px; }.summary { display:flex; align-items:center; gap:12px; min-height:96px; padding:16px; }.summary-icon { display:grid; place-items:center; width:38px; height:38px; flex:none; border-radius:12px; }.summary-icon svg { width:19px; height:19px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }.summary-icon.orange { color:#b45724; background:#f8e8de; }.summary-icon.green { color:#247451; background:#e3f1e9; }.summary-icon.blue { color:#356f91; background:#e4eff6; }.summary-icon.purple { color:#6b4f89; background:#eee8f6; }:root[data-theme="dark"] .summary-icon.orange { background:rgba(180,87,36,.2); }:root[data-theme="dark"] .summary-icon.green { background:rgba(36,116,81,.2); }:root[data-theme="dark"] .summary-icon.blue { background:rgba(53,111,145,.2); }:root[data-theme="dark"] .summary-icon.purple { background:rgba(107,79,137,.2); }.summary span { display:block; color:var(--ink-soft); font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }.summary strong { display:block; margin:3px 0 1px; font:650 24px Fraunces,Georgia,serif; }.summary small { display:block; color:var(--ink-soft); font-size:11px; }
    .layout { display:grid; grid-template-columns:minmax(0,1fr) 330px; gap:18px; align-items:start; }.inbox, .preferences, .health { overflow:hidden; }.inbox-head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding:21px 22px 15px; }.inbox-head h2, .preferences h2, .health h2 { margin:0 0 4px; font-size:22px; }.inbox-head p, .preferences > p { margin:0; font-size:12px; }.inbox-count { padding:5px 9px; border-radius:999px; background:var(--paper-2); color:var(--ink-soft); font-size:11px; font-weight:750; white-space:nowrap; }
    .toolbar { display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:0 22px 15px; border-bottom:1px solid var(--line); }.search-box { position:relative; display:flex; align-items:center; flex:1; min-width:200px; }.search-box svg { position:absolute; left:12px; width:16px; height:16px; fill:none; stroke:var(--ink-soft); stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; pointer-events:none; }.search-box input { width:100%; border:1px solid var(--line); border-radius:11px; padding:10px 12px 10px 36px; background:var(--paper); color:var(--ink); font-size:12.5px; }.tabs { display:flex; gap:3px; padding:4px; border-radius:11px; background:var(--paper-2); }.tabs button { border:0; border-radius:8px; padding:7px 9px; background:transparent; color:var(--ink-soft); cursor:pointer; font-size:11px; font-weight:700; white-space:nowrap; }.tabs button.on { background:var(--ink); color:var(--card); }.tabs b { margin-left:3px; opacity:.7; font-size:10px; }
    .notification-list { padding:7px 12px 5px; }.date-group { display:flex; align-items:center; gap:8px; padding:12px 10px 6px; color:var(--ink-soft); font-size:10px; font-weight:800; letter-spacing:.11em; text-transform:uppercase; }.date-group i { flex:1; height:1px; background:var(--line); }.notification { display:flex; align-items:flex-start; gap:12px; padding:14px 10px; border-radius:13px; cursor:pointer; transition:background .15s ease; }.notification:hover, .notification.unread { background:color-mix(in srgb,var(--accent) 5%,transparent); }.notification.unread { box-shadow:inset 3px 0 var(--accent); }.type-icon { display:grid; place-items:center; width:36px; height:36px; flex:none; border-radius:11px; }.type-icon svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }.type-icon.order { color:#356f91; background:#e4eff6; }.type-icon.seller { color:#247451; background:#e3f1e9; }.type-icon.security { color:#8b5d17; background:#fbefda; }.type-icon.system { color:#6b4f89; background:#eee8f6; }:root[data-theme="dark"] .type-icon.order { background:rgba(53,111,145,.2); }:root[data-theme="dark"] .type-icon.seller { background:rgba(36,116,81,.2); }:root[data-theme="dark"] .type-icon.security { background:rgba(139,93,23,.2); }:root[data-theme="dark"] .type-icon.system { background:rgba(107,79,137,.2); }.notification-copy { flex:1; min-width:0; }.notification-line { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }.notification-line strong { font-size:13.5px; }.notification-copy > p { margin:4px 0 5px; color:var(--ink-soft); font-size:12px; line-height:1.42; }.kind { padding:3px 6px; border-radius:5px; font-size:9px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }.kind.order { color:#356f91; background:#e4eff6; }.kind.seller { color:#247451; background:#e3f1e9; }.kind.security { color:#a36a15; background:#fbefda; }.kind.system { color:#6b4f89; background:#eee8f6; }.notification-meta { display:flex; align-items:center; gap:7px; color:var(--ink-soft); font-size:10.5px; }.notification-meta i { width:3px; height:3px; border-radius:50%; background:var(--line); }.unread-dot { width:7px; height:7px; margin:8px 2px 0 0; flex:none; border-radius:50%; background:var(--accent); box-shadow:0 0 0 4px rgba(196,92,38,.12); }.read-check { width:18px; margin-top:3px; color:var(--ok); font-size:12px; font-weight:800; text-align:center; }.more-btn { align-self:center; opacity:0; border:1px solid var(--line); border-radius:7px; padding:5px 7px; background:var(--card); color:var(--ink-soft); font-size:10px; cursor:pointer; white-space:nowrap; transition:opacity .15s ease; }.notification:hover .more-btn, .notification:focus-within .more-btn { opacity:1; }.more-btn:hover { color:var(--accent); border-color:var(--accent); }.inbox-foot { display:flex; justify-content:space-between; gap:12px; padding:14px 22px; border-top:1px solid var(--line); font-size:11px; }.inbox-foot a, .settings-link, .help-card a { color:var(--accent); font-weight:750; }.inbox-foot a span, .settings-link span, .help-card a span { margin-left:4px; }
    .side-column { display:grid; gap:14px; }.preferences { padding:20px; }.preferences > p { margin-bottom:15px; }.preference-list { border-top:1px solid var(--line); }.preference { display:flex; align-items:center; gap:9px; padding:13px 0; border-bottom:1px solid var(--line); cursor:pointer; }.pref-icon { display:grid; place-items:center; width:27px; height:27px; flex:none; border-radius:8px; font-size:13px; font-weight:800; }.pref-icon.order { color:#356f91; background:#e4eff6; }.pref-icon.seller { color:#247451; background:#e3f1e9; }.pref-icon.security { color:#a36a15; background:#fbefda; }.pref-icon.digest { color:#6b4f89; background:#eee8f6; }.preference > span:nth-child(2) { display:grid; flex:1; gap:2px; }.preference strong { font-size:12px; }.preference small { color:var(--ink-soft); font-size:10.5px; }.switch { width:35px; height:20px; padding:2px; border:0; border-radius:999px; background:var(--paper-2); cursor:pointer; transition:background .15s ease; }.switch i { display:block; width:16px; height:16px; border-radius:50%; background:var(--card); box-shadow:0 1px 3px rgba(0,0,0,.2); transition:transform .15s ease; }.switch.on { background:var(--accent); }.switch.on i { transform:translateX(15px); }.settings-link { display:block; margin-top:16px; font-size:11.5px; }
    .health { padding:20px; }.health-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }.health h2 { font-size:18px; }.pulse-check { display:grid; place-items:center; width:28px; height:28px; border-radius:50%; background:#e3f1e9; color:var(--ok); font-weight:800; }.health-bar { height:7px; margin:18px 0 14px; border-radius:99px; background:var(--paper-2); overflow:hidden; }.health-bar span { display:block; width:99.98%; height:100%; border-radius:inherit; background:linear-gradient(90deg,#2e805b,#7fc294); }.health-stats { display:grid; grid-template-columns:1fr 1fr; gap:12px; }.health-stats strong { display:block; font:650 17px Fraunces,Georgia,serif; }.health-stats small { color:var(--ink-soft); font-size:10px; }.last-sync { display:flex; align-items:center; gap:7px; margin:15px 0 0; color:var(--ink-soft); font-size:10px; }.help-card { display:flex; gap:10px; padding:16px; border:1px solid color-mix(in srgb,var(--gold) 35%,var(--line)); border-radius:var(--radius); background:linear-gradient(125deg,color-mix(in srgb,var(--gold) 10%,var(--card)),var(--card)); }.help-icon { display:grid; place-items:center; width:28px; height:28px; flex:none; border-radius:9px; background:var(--ink); color:var(--gold); font-weight:800; }.help-card strong { font-size:13px; }.help-card p { margin:4px 0 10px; font-size:11.5px; line-height:1.45; }.help-card a { font-size:11.5px; }
    .empty-state { display:grid; justify-items:center; padding:70px 24px; text-align:center; }.empty-icon { display:grid; place-items:center; width:48px; height:48px; margin-bottom:12px; border-radius:15px; background:var(--paper-2); color:var(--ink-soft); }.empty-icon svg { width:23px; height:23px; fill:none; stroke:currentColor; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; }.empty-state h3 { margin:0 0 5px; font-size:18px; }.empty-state p { margin:0 0 15px; font-size:13px; }
    @media (max-width:1120px) { .layout { grid-template-columns:1fr; }.side-column { grid-template-columns:repeat(2,minmax(0,1fr)); align-items:start; }.help-card { grid-column:span 2; } } @media (max-width:780px) { .summary-grid { grid-template-columns:repeat(2,1fr); }.side-column { grid-template-columns:1fr; }.help-card { grid-column:auto; }.toolbar { align-items:stretch; }.search-box { flex-basis:100%; }.tabs { overflow-x:auto; }.head-actions { width:100%; justify-content:space-between; } } @media (max-width:520px) { .summary-grid { grid-template-columns:1fr; }.inbox-head, .toolbar { padding-left:14px; padding-right:14px; }.inbox-foot { padding-left:14px; padding-right:14px; }.notification { padding-left:7px; padding-right:7px; }.more-btn { display:none; }.title-row { align-items:flex-start; } }
  `],
})
export class AdminOrdersComponent {
  notifications = signal<AdminNotification[]>([
    { id: 1, type: 'order', title: 'Order #10492 completed', message: 'A high-value order from Northstar Gadgets was completed across 3 stores.', time: '12 minutes ago', group: 'Today', read: false, reference: '$1,420.00 GMV' },
    { id: 2, type: 'seller', title: 'New seller application', message: 'Accra Food Hub submitted an application and is ready for review.', time: '48 minutes ago', group: 'Today', read: false, reference: 'Review application' },
    { id: 3, type: 'security', title: 'Security policy updated', message: 'Two-factor authentication was enabled for all platform administrators.', time: '2 hours ago', group: 'Today', read: false, reference: 'Security' },
    { id: 4, type: 'order', title: 'Payment captured', message: 'Payment for order #10487 was successfully captured and allocated to 2 sellers.', time: '3 hours ago', group: 'Today', read: true, reference: '$286.40 GMV' },
    { id: 5, type: 'system', title: 'Scheduled maintenance complete', message: 'The platform health check completed successfully with no customer impact.', time: '5 hours ago', group: 'Today', read: true, reference: 'Platform health' },
    { id: 6, type: 'seller', title: 'Seller application approved', message: 'Kente & Co is now active and their storefront is visible in the marketplace.', time: 'Yesterday, 16:24', group: 'Yesterday', read: true, reference: 'Kente & Co' },
    { id: 7, type: 'order', title: 'Delivery exception reported', message: 'Order #10461 needs attention — the carrier could not confirm a delivery attempt.', time: 'Yesterday, 13:08', group: 'Yesterday', read: false, reference: 'Operations' },
    { id: 8, type: 'system', title: 'Subscription renewal processed', message: 'Northstar Electronics renewed the Growth plan for another billing period.', time: 'Yesterday, 09:42', group: 'Yesterday', read: true, reference: 'Billing' },
  ]);

  filter = signal<NotificationFilter>('all');
  query = '';
  preferences = signal<Record<PreferenceKey, boolean>>({ order_updates: true, seller_applications: true, security_alerts: true, digest: false });

  unreadCount = computed(() => this.notifications().filter((item) => !item.read).length);
  todayCount = computed(() => this.notifications().filter((item) => item.group === 'Today').length);

  filteredNotifications = computed(() => {
    const term = this.query.trim().toLowerCase();
    const filter = this.filter();
    return this.notifications().filter((item) => {
      const matchesFilter = filter === 'all' || (filter === 'unread' ? !item.read : filter === 'system' ? ['system', 'security'].includes(item.type) : item.type === filter);
      const matchesSearch = !term || [item.title, item.message, item.type, item.reference].filter(Boolean).join(' ').toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  });

  groupedNotifications = computed(() => {
    const rows = this.filteredNotifications();
    return (['Today', 'Yesterday'] as const)
      .map((label) => ({ label, items: rows.filter((item) => item.group === label) }))
      .filter((group) => group.items.length);
  });

  typeCount(type: NotificationType): number {
    return this.notifications().filter((item) => item.type === type).length;
  }

  typeLabel(type: NotificationType): string {
    return type === 'seller' ? 'Seller' : type.charAt(0).toUpperCase() + type.slice(1);
  }

  markRead(id: number) {
    this.notifications.update((items) => items.map((item) => item.id === id ? { ...item, read: true } : item));
  }

  markAllRead() {
    this.notifications.update((items) => items.map((item) => ({ ...item, read: true })));
  }

  togglePreference(key: PreferenceKey) {
    this.preferences.update((current) => ({ ...current, [key]: !current[key] }));
  }
}
