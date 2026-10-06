import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AppNotification, NotificationSummary } from '../../core/models';

const PREFERENCE_LABELS: Record<string, string> = {
  order: 'Order updates',
  payment: 'Payments and receipts',
  payout: 'Payout activity',
  review: 'Reviews and replies',
  dispute: 'Refunds and disputes',
  catalog: 'Catalogue decisions',
  inventory: 'Stock alerts',
  security: 'Security alerts',
  system: 'Platform announcements',
  promotion: 'Offers and promotions',
};

@Component({
  selector: 'app-notification-centre',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="wrap cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">Notification centre</p>
          <h1>{{ heading() }}</h1>
          <p class="intro">
            Everything that needs your attention — order movements, payments, reviews and account activity — in one
            timeline.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
          <button class="btn ghost" type="button" (click)="markAll()" [disabled]="!summary()?.unread">Mark all read</button>
          <button class="btn ghost" type="button" (click)="clearRead()">Clear read</button>
        </div>
      </header>

      <section class="cx-stats">
        <div class="cx-stat warn"><span>Unread</span><strong>{{ summary()?.unread ?? 0 }}</strong><small>Needs a look</small></div>
        <div class="cx-stat"><span>Today</span><strong>{{ summary()?.today ?? 0 }}</strong><small>Arrived in the last 24h</small></div>
        <div class="cx-stat"><span>Total</span><strong>{{ summary()?.total ?? 0 }}</strong><small>In your inbox</small></div>
        <div class="cx-stat"><span>Categories</span><strong>{{ categoryKeys().length }}</strong><small>Active alert streams</small></div>
      </section>

      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }
      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }

      <div class="cx-toolbar">
        <div class="cx-tabs">
          <button type="button" [class.on]="filter() === 'all'" (click)="setFilter('all')">All</button>
          <button type="button" [class.on]="filter() === 'unread'" (click)="setFilter('unread')">
            Unread <b>{{ summary()?.unread ?? 0 }}</b>
          </button>
        </div>
        <select [ngModel]="category()" (ngModelChange)="setCategory($event)" aria-label="Filter by category">
          <option value="">Every category</option>
          @for (key of categoryKeys(); track key) {
            <option [value]="key">{{ label(key) }} ({{ summary()?.by_category?.[key] }})</option>
          }
        </select>
        <button class="mini spacer" type="button" (click)="showPrefs.set(!showPrefs())">
          {{ showPrefs() ? 'Hide preferences' : 'Notification preferences' }}
        </button>
      </div>

      @if (showPrefs()) {
        <section class="cx-panel">
          <header><div><h2>What you get notified about</h2><p>Switches apply to this notification centre.</p></div></header>
          <div class="cx-panel-body cx-form">
            <div class="row">
              @for (key of prefKeys(); track key) {
                <label class="check">
                  <input type="checkbox" [checked]="prefs()[key]" (change)="togglePref(key)" />
                  {{ label(key) }}
                </label>
              }
            </div>
            <div class="actions">
              <button class="btn" type="button" (click)="savePrefs()" [disabled]="savingPrefs()">
                {{ savingPrefs() ? 'Saving…' : 'Save preferences' }}
              </button>
            </div>
          </div>
        </section>
      }

      <section class="cx-panel">
        <header>
          <div><h2>Timeline</h2><p>{{ rows().length }} shown</p></div>
        </header>

        @if (loading()) {
          <div class="cx-skeleton"><span></span><span></span><span></span><span></span><span></span></div>
        } @else if (!rows().length) {
          <div class="cx-empty">
            <strong>You are all caught up</strong>
            <p>New alerts about your orders, payments and reviews will land here.</p>
          </div>
        } @else {
          <div class="cx-panel-body cx-list">
            @for (note of rows(); track note.id) {
              <article class="cx-item" [class.unread]="!note.read">
                <div class="top">
                  <span class="chip plain" [class]="'chip plain ' + levelClass(note.level)">{{ label(note.category) }}</span>
                  <strong>{{ note.title }}</strong>
                  <span class="when">{{ note.created_at ? (note.created_at | date: 'MMM d, HH:mm') : '' }}</span>
                </div>
                @if (note.body) { <p>{{ note.body }}</p> }
                <div class="top">
                  @if (note.action_url) {
                    <button class="mini go" type="button" (click)="open(note)">{{ note.action_label || 'View' }}</button>
                  }
                  @if (note.read) {
                    <button class="mini" type="button" (click)="toggleRead(note)">Mark unread</button>
                  } @else {
                    <button class="mini" type="button" (click)="toggleRead(note)">Mark read</button>
                  }
                  <button class="mini danger" type="button" (click)="archive(note)">Dismiss</button>
                </div>
              </article>
            }
          </div>
          <footer>
            <span>Page {{ page() }} of {{ lastPage() }}</span>
            <span class="cx-pager">
              <button type="button" [disabled]="page() <= 1" (click)="go(page() - 1)">Previous</button>
              <button type="button" [disabled]="page() >= lastPage()" (click)="go(page() + 1)">Next</button>
            </span>
          </footer>
        }
      </section>

      <p class="muted foot">
        Looking for something older? Dismissed alerts are archived, not deleted — ask support if you need them back.
        @if (audience === 'customer') { <a routerLink="/orders">Go to orders</a> }
      </p>
    </div>
  `,
  styles: [
    `
      .foot { font-size: 12px; }
      .foot a { color: var(--accent); font-weight: 650; }
      .chip.info { color: var(--ink-soft); }
      .chip.success { color: var(--ok); }
      .chip.warning { color: var(--gold); }
      .chip.critical { color: var(--danger); }
    `,
  ],
})
export class NotificationCentreComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  /** Set to `tenant` / `admin` through route data by the seller and super-admin consoles. */
  audience: 'customer' | 'tenant' | 'admin' =
    (this.route.snapshot.data['audience'] as 'customer' | 'tenant' | 'admin') ?? 'customer';

  rows = signal<AppNotification[]>([]);
  summary = signal<NotificationSummary | null>(null);
  loading = signal(true);
  error = signal('');
  message = signal('');
  filter = signal<'all' | 'unread'>('all');
  category = signal('');
  page = signal(1);
  lastPage = signal(1);

  showPrefs = signal(false);
  prefs = signal<Record<string, boolean>>({});
  savingPrefs = signal(false);

  categoryKeys = computed(() => Object.keys(this.summary()?.by_category ?? {}));
  heading = computed(() =>
    this.audience === 'admin' ? 'Platform alerts' : this.audience === 'tenant' ? 'Seller alerts' : 'Your alerts',
  );
  prefKeys = computed(() => Object.keys(this.prefs()));

  constructor() {
    this.load();
    this.api.notificationPreferences().subscribe({
      next: (res) => this.prefs.set(res.data || {}),
      error: () => undefined,
    });
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    const params: Record<string, string> = { page: String(this.page()), per_page: '20', audience: this.audience };
    if (this.filter() === 'unread') params['unread'] = '1';
    if (this.category()) params['category'] = this.category();

    this.api.notifications(params).subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.summary.set(res.summary);
        this.lastPage.set(res.meta?.last_page || 1);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load your notifications.');
      },
    });
  }

  setFilter(value: 'all' | 'unread') {
    this.filter.set(value);
    this.page.set(1);
    this.load();
  }

  setCategory(value: string) {
    this.category.set(value);
    this.page.set(1);
    this.load();
  }

  go(page: number) {
    this.page.set(Math.max(1, Math.min(page, this.lastPage())));
    this.load();
  }

  toggleRead(note: AppNotification) {
    const call = note.read ? this.api.markNotificationUnread(note.id) : this.api.markNotificationRead(note.id);
    call.subscribe({ next: () => this.load(), error: () => this.error.set('That update did not stick.') });
  }

  markAll() {
    this.api.markAllNotificationsRead(this.audience).subscribe({
      next: (res) => {
        this.message.set(`${res.data.updated} notification(s) marked as read.`);
        this.load();
      },
      error: () => this.error.set('We could not mark everything as read.'),
    });
  }

  archive(note: AppNotification) {
    this.api.archiveNotification(note.id).subscribe({ next: () => this.load(), error: () => this.error.set('Dismiss failed.') });
  }

  clearRead() {
    this.api.clearReadNotifications().subscribe({
      next: (res) => {
        this.message.set(`${res.data.archived} read notification(s) cleared.`);
        this.load();
      },
      error: () => this.error.set('We could not clear your read notifications.'),
    });
  }

  open(note: AppNotification) {
    if (!note.read) this.api.markNotificationRead(note.id).subscribe({ next: () => undefined, error: () => undefined });
    const url = note.action_url || '';
    if (!url) return;
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener');
      return;
    }
    this.router.navigateByUrl(url);
  }

  togglePref(key: string) {
    this.prefs.set({ ...this.prefs(), [key]: !this.prefs()[key] });
  }

  savePrefs() {
    this.savingPrefs.set(true);
    this.api.updateNotificationPreferences(this.prefs()).subscribe({
      next: (res) => {
        this.prefs.set(res.data || {});
        this.savingPrefs.set(false);
        this.message.set('Notification preferences saved.');
      },
      error: () => {
        this.savingPrefs.set(false);
        this.error.set('Preferences could not be saved.');
      },
    });
  }

  label(key: string): string {
    return PREFERENCE_LABELS[key] || key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  levelClass(level: string): string {
    return level || 'info';
  }
}
