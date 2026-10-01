import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuditLogEntry, AuditLogFacets, AuditLogStats } from '../../core/models';

interface AuditFilterState {
  q: string;
  action: string;
  subject_type: string;
  actor_id: string;
  ip: string;
  tenant_id: string;
  from: string;
  to: string;
}

const PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 400;
/** Roughly ten event rows visible at once — the rest scroll underneath. */
const VISIBLE_ROWS = 10;
const ROW_HEIGHT_PX = 62;
const HEADER_HEIGHT_PX = 43;

@Component({
  selector: 'app-admin-audit',
  imports: [FormsModule, DatePipe, DecimalPipe],
  template: `
    <header class="head">
      <div>
        <p class="eyebrow">Platform security</p>
        <h1>Audit log</h1>
        <p class="muted intro">
          Every create, update, and delete across the platform — who performed it, from which IP address, and exactly
          when. Newest events first.
        </p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" type="button" (click)="exportCsv()" [disabled]="!rows().length">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/></svg>
          Export CSV
        </button>
        <button class="btn ghost" type="button" (click)="refresh()" [disabled]="loading()">
          <svg viewBox="0 0 24 24" aria-hidden="true" [class.spin]="loading()"><path d="M20 12a8 8 0 1 1-2.5-5.8M20 3.5V7h-3.5"/></svg>
          Refresh
        </button>
      </div>
    </header>

    @if (stats(); as s) {
      <div class="grid kpis">
        <div class="card kpi">
          <p class="muted label">Total events</p>
          <strong>{{ s.total | number }}</strong>
          <p class="muted tiny">{{ activeFilterCount() ? 'matching current filters' : 'across all time' }}</p>
        </div>
        <div class="card kpi"><p class="muted label">Today</p><strong>{{ s.today | number }}</strong></div>
        <div class="card kpi"><p class="muted label">Last 7 days</p><strong>{{ s.last_7_days | number }}</strong></div>
        <div class="card kpi"><p class="muted label">Users involved</p><strong>{{ s.unique_actors | number }}</strong></div>
        <div class="card kpi"><p class="muted label">Unique IP addresses</p><strong>{{ s.unique_ips | number }}</strong></div>
      </div>
    }

    <section class="card filters" aria-label="Audit log filters">
      <div class="filters-grid">
        <label class="filter wide">
          <span>Search</span>
          <div class="search-box">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
            <input
              type="text"
              [(ngModel)]="filters.q"
              (input)="queueSearch()"
              (keyup.enter)="applySearch()"
              placeholder="Action, subject, user, IP…"
              aria-label="Search audit events"
            />
          </div>
        </label>

        <label class="filter">
          <span>Action</span>
          <select [(ngModel)]="filters.action" (change)="apply()" aria-label="Filter by action">
            <option value="">All actions</option>
            @for (a of facets()?.actions ?? []; track a.value) {
              <option [value]="a.value">{{ a.value }} ({{ a.count | number }})</option>
            }
          </select>
        </label>

        <label class="filter">
          <span>Subject</span>
          <select [(ngModel)]="filters.subject_type" (change)="apply()" aria-label="Filter by subject type">
            <option value="">All subjects</option>
            @for (s of facets()?.subject_types ?? []; track s.value) {
              <option [value]="s.value">{{ subjectLabel(s.value) }} ({{ s.count | number }})</option>
            }
          </select>
        </label>

        <label class="filter">
          <span>User</span>
          <select [(ngModel)]="filters.actor_id" (change)="apply()" aria-label="Filter by user">
            <option value="">All users</option>
            @for (a of facets()?.actors ?? []; track a.id) {
              <option [value]="a.id">{{ a.name }} — {{ a.email }} ({{ a.count | number }})</option>
            }
          </select>
        </label>

        <label class="filter">
          <span>IP address</span>
          <select [(ngModel)]="filters.ip" (change)="apply()" aria-label="Filter by IP address">
            <option value="">All IP addresses</option>
            @for (i of facets()?.ips ?? []; track i.value) {
              <option [value]="i.value">{{ i.value }} ({{ i.count | number }})</option>
            }
          </select>
        </label>

        <label class="filter">
          <span>Tenant</span>
          <select [(ngModel)]="filters.tenant_id" (change)="apply()" aria-label="Filter by tenant">
            <option value="">All tenants</option>
            @for (t of facets()?.tenants ?? []; track t.id) {
              <option [value]="t.id">{{ t.name }} ({{ t.count | number }})</option>
            }
          </select>
        </label>

        <label class="filter">
          <span>From date</span>
          <input type="date" [(ngModel)]="filters.from" (change)="apply()" aria-label="Events from date" />
        </label>

        <label class="filter">
          <span>To date</span>
          <input type="date" [(ngModel)]="filters.to" (change)="apply()" aria-label="Events to date" />
        </label>
      </div>

      <div class="filter-foot">
        @if (activeFilterCount()) {
          <span class="chip on">{{ activeFilterCount() }} filter{{ activeFilterCount() === 1 ? '' : 's' }} active</span>
          <button class="btn ghost small-btn" type="button" (click)="clearFilters()">Clear filters</button>
        } @else {
          <span class="muted small">No filters — showing the full platform timeline.</span>
        }
        @if (facetsError()) {
          <span class="muted small facets-error">Filter options could not be loaded — search still works.</span>
        }
      </div>
    </section>

    @if (error()) {
      <p class="err" role="alert">{{ error() }}</p>
    }

    <div class="card log-card">
      <div class="log-head">
        <div>
          <h2>Event timeline</h2>
          <p class="muted small">
            Showing 1–{{ rows().length | number }} of {{ total() | number }} events · newest first
            @if (lastUpdated(); as updated) {
              · updated {{ updated | date: 'HH:mm:ss' }}
            }
          </p>
        </div>
        <span class="order-chip" title="Events are ordered newest first">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/></svg>
          Newest first
        </span>
      </div>

      @if (loading() && !rows().length) {
        <div class="skeleton-load">
          @for (s of skeletons; track s) {
            <div class="skeleton" [style.height.px]="44" [style.margin-bottom.px]="12"></div>
          }
        </div>
      } @else if (!rows().length) {
        <div class="empty">
          @if (error()) {
            <p><strong>Could not load the audit log.</strong></p>
            <button class="btn ghost" type="button" (click)="refresh()">Try again</button>
          } @else {
            <p><strong>No audit events match these filters.</strong></p>
            @if (activeFilterCount()) {
              <button class="btn ghost" type="button" (click)="clearFilters()">Clear filters</button>
            }
          }
        </div>
      } @else {
        <div
          #scroller
          class="table-scroll"
          (scroll)="onScroll($event)"
          role="region"
          aria-label="Audit event list — scroll for older events"
        >
          <table>
            <thead>
              <tr>
                <th>Date &amp; time</th>
                <th>User</th>
                <th>Action</th>
                <th>Subject</th>
                <th>Tenant</th>
                <th>IP address</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.id) {
                <tr
                  tabindex="0"
                  [class.selected]="detail()?.id === row.id"
                  (click)="openDetail(row)"
                  (keydown.enter)="openDetail(row)"
                >
                  <td>
                    <strong>{{ row.created_at | date: 'MMM d, y' }}</strong>
                    <p class="muted small">{{ row.created_at | date: 'HH:mm:ss' }} · {{ relTime(row.created_at) }}</p>
                  </td>
                  <td>
                    @if (row.actor; as actor) {
                      <div class="actor">
                        <span class="avatar" [style.background]="avatarColor(actor.id)">{{ initials(actor.name) }}</span>
                        <span class="actor-copy">
                          <strong>{{ actor.name }}</strong>
                          <p class="muted small">{{ actor.email }}</p>
                        </span>
                      </div>
                    } @else {
                      <div class="actor">
                        <span class="avatar sys">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/></svg>
                        </span>
                        <span class="actor-copy">
                          <strong>System</strong>
                          <p class="muted small">Automated process</p>
                        </span>
                      </div>
                    }
                  </td>
                  <td><span [class]="'pill act ' + actionClass(row.action)">{{ row.action }}</span></td>
                  <td>
                    <strong>{{ subjectLabel(row.subject_type) }}</strong>
                    @if (row.subject_id) {
                      <p class="muted small">#{{ row.subject_id }}</p>
                    }
                  </td>
                  <td>
                    @if (row.tenant; as t) {
                      <span class="muted small">{{ t.name }}</span>
                    } @else if (row.tenant_id) {
                      <span class="muted small">Deleted tenant #{{ row.tenant_id }}</span>
                    } @else {
                      <span class="muted small">Platform</span>
                    }
                  </td>
                  <td>
                    @if (row.ip) {
                      <button
                        class="ip"
                        type="button"
                        (click)="filterByIp(row.ip!); $event.stopPropagation()"
                        [title]="'Show only events from ' + row.ip"
                      >
                        {{ row.ip }}
                      </button>
                    } @else {
                      <span class="muted small">—</span>
                    }
                  </td>
                </tr>
              }
              @if (loadingMore()) {
                <tr class="state-row"><td colspan="6"><span class="spinner" aria-hidden="true"></span> Loading older events…</td></tr>
              }
              @if (!hasMore() && rows().length) {
                <tr class="state-row end"><td colspan="6">End of the audit trail — {{ total() | number }} events total</td></tr>
              }
            </tbody>
          </table>
        </div>

        <div class="log-foot">
          <span class="muted small">Scroll for older events · {{ rows().length | number }} of {{ total() | number }} loaded</span>
          <button class="btn ghost" type="button" [disabled]="!hasMore() || loadingMore() || loading()" (click)="loadMore()">
            Load more
          </button>
        </div>
      }
    </div>

    @if (detail(); as d) {
      <div class="modal-backdrop" (click)="closeDetail()">
        <section
          class="modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-detail-title"
          (click)="$event.stopPropagation()"
        >
          <header class="modal-head">
            <div>
              <p class="eyebrow">Event #{{ d.id }}</p>
              <h2 id="audit-detail-title">
                <span [class]="'pill act ' + actionClass(d.action)">{{ d.action }}</span>
                {{ subjectLabel(d.subject_type) }}@if (d.subject_id) { · #{{ d.subject_id }} }
              </h2>
              <p class="muted small">{{ d.created_at | date: 'EEEE, MMMM d, y' }} at {{ d.created_at | date: 'HH:mm:ss' }} ({{ relTime(d.created_at) }})</p>
            </div>
            <button class="icon-btn close" type="button" (click)="closeDetail()" title="Close" aria-label="Close event details">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
            </button>
          </header>

          <div class="detail-grid">
            <div class="detail-row">
              <span class="muted small">User</span>
              @if (d.actor; as actor) {
                <div class="actor">
                  <span class="avatar" [style.background]="avatarColor(actor.id)">{{ initials(actor.name) }}</span>
                  <span><strong>{{ actor.name }}</strong><p class="muted small">{{ actor.email }}</p></span>
                </div>
              } @else {
                <strong>System</strong>
                <p class="muted small">Automated process</p>
              }
            </div>
            <div class="detail-row">
              <span class="muted small">IP address</span>
              @if (d.ip) {
                <div class="ip-actions">
                  <code>{{ d.ip }}</code>
                  <button class="icon-btn" type="button" (click)="copyIp(d.ip!)" title="Copy IP address" aria-label="Copy IP address">
                    @if (copiedIp() === d.ip) {
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
                    } @else {
                      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1.5 1.5 0 0 1 1.5-1.5H15"/></svg>
                    }
                  </button>
                </div>
              } @else {
                <span class="muted small">Not recorded</span>
              }
            </div>
            <div class="detail-row">
              <span class="muted small">Tenant</span>
              @if (d.tenant; as t) {
                <strong>{{ t.name }}</strong>
              } @else if (d.tenant_id) {
                <strong>Deleted tenant #{{ d.tenant_id }}</strong>
              } @else {
                <strong>Platform-wide</strong>
              }
            </div>
            <div class="detail-row">
              <span class="muted small">Changed fields</span>
              @if (changedKeys(d).length) {
                <div class="keys">
                  @for (k of changedKeys(d); track k) {
                    <code class="key">{{ k }}</code>
                  }
                </div>
              } @else {
                <span class="muted small">—</span>
              }
            </div>
          </div>

          @if (d.diff?.before || d.diff?.after) {
            <div class="diff">
              <div class="diff-col">
                <p class="muted label">Before</p>
                <pre>{{ pretty(d.diff.before) }}</pre>
              </div>
              <div class="diff-col">
                <p class="muted label">After</p>
                <pre>{{ pretty(d.diff.after) }}</pre>
              </div>
            </div>
          } @else {
            <p class="muted small no-diff">No change payload was recorded for this event.</p>
          }

          <footer class="modal-actions">
            @if (d.actor) {
              <button class="btn ghost" type="button" (click)="filterByActor(d)">Show all events by this user</button>
            }
            @if (d.ip) {
              <button class="btn ghost" type="button" (click)="filterByIp(d.ip)">Show all events from this IP</button>
            }
            <button class="btn" type="button" (click)="closeDetail()">Close</button>
          </footer>
        </section>
      </div>
    }
  `,
  styles: `
    :host { display: block; max-width: 1440px; margin: 0 auto; }

    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .head h1 { margin: 0; }
    .head .intro { margin: 5px 0 0; max-width: 68ch; }
    .eyebrow { margin: 0 0 5px; color: var(--accent); font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    .page-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .page-actions svg, .icon-btn svg, .order-chip svg, .search-box svg, .avatar.sys svg { fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; }
    .page-actions svg, .icon-btn svg, .avatar.sys svg { width: 17px; height: 17px; }
    .page-actions svg.spin { animation: spin 0.9s linear infinite; }

    .kpis { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin: 18px 0; }
    .kpi { padding: 12px 14px; min-height: 83px; }
    .kpi strong { font-family: Fraunces, Georgia, serif; font-size: 22px; }
    .label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 4px; }
    .tiny { font-size: 11px; margin: 2px 0 0; }

    /* ------------------------------------------------------------- filters */
    .filters { padding: 16px 18px 14px; margin-bottom: 18px; }
    .filters-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px 14px; }
    .filter { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .filter > span { font-size: 11px; font-weight: 700; color: var(--ink-soft); text-transform: uppercase; letter-spacing: .06em; }
    .filter.wide { grid-column: span 2; }
    .filter input, .filter select { width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; background: var(--card); color: var(--ink); }
    .filter input:focus, .filter select:focus, .search-box input:focus { outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent); outline-offset: 1px; border-color: var(--accent); }
    .search-box { position: relative; display: flex; align-items: center; }
    .search-box svg { position: absolute; left: 12px; width: 16px; height: 16px; color: var(--ink-soft); pointer-events: none; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; }
    .search-box input { width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px 10px 36px; background: var(--card); color: var(--ink); }

    .filter-foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
    .chip { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; background: var(--paper-2); color: var(--ink-soft); font-size: 12px; font-weight: 650; }
    .chip.on { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); }
    .facets-error { color: var(--danger); }
    .small-btn { padding: 8px 12px; font-size: 12px; }

    .log-card { overflow: hidden; }
    .log-head { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; padding: 16px 18px; border-bottom: 1px solid var(--line); }
    .log-head h2 { margin: 0; font-size: 19px; }
    .log-head p { margin: 3px 0 0; }
    .order-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border: 1px solid var(--line); border-radius: 999px; color: var(--ink-soft); font-size: 11px; font-weight: 750; letter-spacing: .04em; text-transform: uppercase; }
    .order-chip svg { width: 13px; height: 13px; stroke-width: 2; }

    .table-scroll { max-height: calc(${VISIBLE_ROWS} * ${ROW_HEIGHT_PX}px + ${HEADER_HEIGHT_PX}px); overflow-y: auto; overscroll-behavior: contain; }
    table { width: 100%; min-width: 860px; border-collapse: separate; border-spacing: 0; font-size: 14px; }
    thead th { position: sticky; top: 0; z-index: 2; background: var(--card); text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft); padding: 13px 16px; border-bottom: 1px solid var(--line); }
    tbody td { padding: 10px 16px; border-bottom: 1px solid color-mix(in srgb, var(--line) 60%, transparent); vertical-align: middle; }
    tbody tr { cursor: pointer; }
    tbody tr:hover { background: var(--paper-2); }
    tbody tr:focus-visible, tbody tr.selected { outline: 2px solid var(--accent); outline-offset: -2px; }
    tbody td p { margin: 1px 0 0; }
    .small { font-size: 12px; }

    .actor { display: flex; align-items: center; gap: 10px; }
    .actor-copy { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
    .avatar { display: grid; place-items: center; flex: none; width: 34px; height: 34px; border-radius: 999px; background: var(--ink); color: #fff; font-size: 12px; font-weight: 750; letter-spacing: .02em; }
    .avatar.sys { background: var(--paper-2); color: var(--ink-soft); }
    .avatar.sys svg { stroke-width: 1.7; }

    .pill.act, .ip, .diff pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .pill.act { font-size: 11.5px; padding: 5px 10px; white-space: nowrap; }
    .pill.act.created { background: color-mix(in srgb, var(--ok) 15%, transparent); color: var(--ok); }
    .pill.act.updated { background: color-mix(in srgb, var(--gold) 20%, transparent); color: color-mix(in srgb, var(--gold) 85%, var(--ink)); }
    .pill.act.deleted { background: color-mix(in srgb, var(--danger) 14%, transparent); color: var(--danger); }
    .pill.act.settings { background: color-mix(in srgb, var(--accent-2) 15%, transparent); color: var(--accent-2); }
    .pill.act.backup { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); }

    .ip { border: 0; padding: 0 0 1px; background: transparent; cursor: pointer; font-size: 12.5px; font-weight: 650; color: var(--ink); border-bottom: 1px dashed var(--line); }
    .ip:hover { color: var(--accent); border-bottom-color: var(--accent); }

    .state-row td { padding: 14px 16px; text-align: center; color: var(--ink-soft); font-size: 13px; border-bottom: 0; }
    .state-row.end td { font-weight: 650; }
    .spinner { display: inline-block; width: 14px; height: 14px; margin-right: 8px; vertical-align: -2px; border: 2px solid var(--line); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .log-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 18px; border-top: 1px solid var(--line); }

    .skeleton-load { padding: 18px; }
    .empty { padding: 46px 20px; text-align: center; color: var(--ink-soft); }
    .empty .btn { margin-top: 10px; }
    .err { color: var(--danger); font-size: 13px; margin: 8px 0; }

    @media (max-width: 980px) {
      .filters-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .filter.wide { grid-column: span 2; }
    }
    @media (max-width: 700px) {
      .filters-grid { grid-template-columns: 1fr; }
      .filter.wide { grid-column: auto; }
      .head { align-items: flex-start; }
      .page-actions { width: 100%; }
      .page-actions .btn { flex: 1; }
      .table-scroll { max-height: 60vh; }
    }
  `,
})
export class AdminAuditComponent {
  private api = inject(ApiService);

  rows = signal<AuditLogEntry[]>([]);
  stats = signal<AuditLogStats | null>(null);
  facets = signal<AuditLogFacets | null>(null);
  loading = signal(true);
  loadingMore = signal(false);
  error = signal('');
  facetsError = signal(false);
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  detail = signal<AuditLogEntry | null>(null);
  lastUpdated = signal<Date | null>(null);
  copiedIp = signal('');

  readonly skeletons = Array.from({ length: 8 }, (_, i) => i);

  filters: AuditFilterState = {
    q: '',
    action: '',
    subject_type: '',
    actor_id: '',
    ip: '',
    tenant_id: '',
    from: '',
    to: '',
  };

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  hasMore = computed(() => this.page() < this.lastPage());

  constructor() {
    this.reload(true);
    this.loadFacets();
  }

  // ------------------------------------------------------------------ data

  reload(reset: boolean) {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
    this.error.set('');
    if (reset) {
      this.page.set(1);
      this.rows.set([]);
      this.loading.set(true);
    }

    this.api.adminAuditLogs(this.params()).subscribe({
      next: (res) => {
        const fresh = res.data ?? [];
        this.page.set(res.meta?.page ?? 1);
        this.lastPage.set(res.meta?.last_page ?? 1);
        this.total.set(res.meta?.total ?? fresh.length);
        this.stats.set(res.stats ?? null);
        this.rows.update((current) => {
          if (reset) {
            return fresh;
          }
          const seen = new Set(current.map((r) => r.id));
          return [...current, ...fresh.filter((r) => !seen.has(r.id))];
        });
        this.loading.set(false);
        this.loadingMore.set(false);
        this.lastUpdated.set(new Date());
        if (reset) {
          this.scrollTop();
        }
      },
      error: () => {
        this.error.set('Could not load the audit log. Check your connection and try again.');
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  refresh() {
    this.reload(true);
  }

  loadMore() {
    if (!this.hasMore() || this.loadingMore() || this.loading()) {
      return;
    }
    const next = this.page() + 1;
    this.page.set(next);
    this.loadingMore.set(true);
    this.api.adminAuditLogs(this.params(next)).subscribe({
      next: (res) => {
        const fresh = res.data ?? [];
        this.lastPage.set(res.meta?.last_page ?? 1);
        this.total.set(res.meta?.total ?? fresh.length);
        this.rows.update((current) => {
          const seen = new Set(current.map((r) => r.id));
          return [...current, ...fresh.filter((r) => !seen.has(r.id))];
        });
        this.loadingMore.set(false);
        this.lastUpdated.set(new Date());
      },
      error: () => {
        this.page.set(next - 1);
        this.loadingMore.set(false);
        this.error.set('Could not load older events.');
      },
    });
  }

  private loadFacets() {
    this.api.adminAuditLogFacets().subscribe({
      next: (res) => this.facets.set(res.data ?? null),
      error: () => this.facetsError.set(true),
    });
  }

  private params(page = this.page()): Record<string, string | number> {
    const params: Record<string, string | number> = { page, per_page: PER_PAGE };
    const f = this.filters;
    if (f.q.trim()) params['q'] = f.q.trim();
    if (f.action) params['action'] = f.action;
    if (f.subject_type) params['subject_type'] = f.subject_type;
    if (f.actor_id) params['actor_id'] = f.actor_id;
    if (f.ip) params['ip'] = f.ip;
    if (f.tenant_id) params['tenant_id'] = f.tenant_id;
    if (f.from) params['from'] = f.from;
    if (f.to) params['to'] = f.to;
    return params;
  }

  // --------------------------------------------------------------- filters

  activeFilterCount(): number {
    const f = this.filters;
    return [
      f.q.trim(),
      f.action,
      f.subject_type,
      f.actor_id,
      f.ip,
      f.tenant_id,
      f.from,
      f.to,
    ].filter(Boolean).length;
  }

  apply() {
    this.reload(true);
  }

  queueSearch() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      this.applySearch();
    }, SEARCH_DEBOUNCE_MS);
  }

  applySearch() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
    this.apply();
  }

  clearFilters() {
    this.filters = { q: '', action: '', subject_type: '', actor_id: '', ip: '', tenant_id: '', from: '', to: '' };
    this.apply();
  }

  filterByIp(ip: string) {
    this.closeDetail();
    this.filters.ip = ip;
    this.apply();
  }

  filterByActor(entry: AuditLogEntry) {
    this.closeDetail();
    this.filters.actor_id = entry.actor ? String(entry.actor.id) : '';
    this.apply();
  }

  // ------------------------------------------------------- infinite scroll

  onScroll(event: Event) {
    const el = event.target as HTMLElement;
    if (!this.hasMore() || this.loadingMore() || this.loading()) {
      return;
    }
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 140) {
      this.loadMore();
    }
  }

  private scrollTop() {
    setTimeout(() => this.scroller()?.nativeElement.scrollTo({ top: 0 }));
  }

  // ---------------------------------------------------------------- detail

  openDetail(row: AuditLogEntry) {
    this.detail.set(row);
  }

  closeDetail() {
    this.detail.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeDetail();
  }

  async copyIp(ip: string) {
    try {
      await navigator.clipboard.writeText(ip);
      this.copiedIp.set(ip);
      setTimeout(() => {
        if (this.copiedIp() === ip) {
          this.copiedIp.set('');
        }
      }, 1600);
    } catch {
      // Clipboard unavailable (insecure context) — ignore silently.
    }
  }

  // ------------------------------------------------------------- formatting

  relTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diff) || diff < 60_000) {
      return 'just now';
    }
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    if (days < 30) {
      return `${days}d ago`;
    }
    return `${Math.floor(days / 30)}mo ago`;
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
  }

  avatarColor(userId: number): string {
    const palette = ['#1f4b3a', '#c45c26', '#1d4f7c', '#6b3fa0', '#8a6d1f', '#8c3a52', '#2f6b4f'];
    return palette[userId % palette.length];
  }

  actionClass(action: string): string {
    if (action === 'created') return 'created';
    if (action === 'updated') return 'updated';
    if (action === 'deleted') return 'deleted';
    if (action.startsWith('settings.')) return 'settings';
    if (action.startsWith('backup.')) return 'backup';
    return '';
  }

  subjectLabel(type: string | null): string {
    if (!type) return '—';
    const base = type.split('\\').pop() ?? type;
    return base.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  changedKeys(entry: AuditLogEntry): string[] {
    const before = entry.diff?.before ?? {};
    const after = entry.diff?.after ?? {};
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  }

  pretty(value: Record<string, unknown> | null | undefined): string {
    if (value === null || value === undefined) {
      return '— no data —';
    }
    return JSON.stringify(value, null, 2);
  }

  // ----------------------------------------------------------------- export

  exportCsv() {
    const rows = this.rows();
    if (!rows.length) {
      return;
    }
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['id', 'date', 'time', 'action', 'subject_type', 'subject_id', 'user', 'email', 'tenant', 'ip'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.created_at.slice(0, 10),
          r.created_at.slice(11, 19),
          r.action,
          this.subjectLabel(r.subject_type),
          r.subject_id ?? '',
          r.actor?.name ?? 'System',
          r.actor?.email ?? '',
          r.tenant?.name ?? (r.tenant_id ? `deleted-#${r.tenant_id}` : 'Platform'),
          r.ip ?? '',
        ]
          .map(esc)
          .join(','),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `markethub-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
