import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuditLogEntry, AuditLogFacets, AuditLogStats } from '../../core/models';

interface ActivityFilters {
  q: string;
  action: string;
  subject_type: string;
  actor_id: string;
  from: string;
  to: string;
}

const PER_PAGE = 25;
const EMPTY_FILTERS: ActivityFilters = { q: '', action: '', subject_type: '', actor_id: '', from: '', to: '' };

/**
 * Workspace activity log — the tenant's own slice of the audit trail.
 * Same engine the platform admins use, scoped to this workspace so
 * owners can answer "who changed what, and when" for their team.
 */
@Component({
  selector: 'app-seller-activity',
  imports: [FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="page">
      <header class="head">
        <div>
          <p class="eyebrow">Workspace / Security</p>
          <h1>Activity log</h1>
          <p class="intro">Every create, update and delete your team performs — who did it, from which IP, and exactly what changed.</p>
        </div>
        <div class="head-actions">
          <button class="btn ghost" type="button" (click)="refresh()" [disabled]="loading()">Refresh</button>
          <button class="btn primary" type="button" (click)="exportCsv()" [disabled]="!rows().length">Export CSV</button>
        </div>
      </header>

      @if (stats(); as s) {
        <div class="kpis">
          <div class="card kpi"><p>Total events</p><strong>{{ s.total | number }}</strong><small>{{ filterCount() ? 'matching filters' : 'all time' }}</small></div>
          <div class="card kpi"><p>Today</p><strong>{{ s.today | number }}</strong><small>since midnight</small></div>
          <div class="card kpi"><p>Last 7 days</p><strong>{{ s.last_7_days | number }}</strong><small>recent activity</small></div>
          <div class="card kpi"><p>Team members</p><strong>{{ s.unique_actors | number }}</strong><small>with recorded actions</small></div>
          <div class="card kpi"><p>IP addresses</p><strong>{{ s.unique_ips | number }}</strong><small>seen across events</small></div>
        </div>
      }

      <section class="card filters">
        <label class="f wide"><span>Search</span><input type="text" [(ngModel)]="filters.q" (input)="queue()" placeholder="Subject, user or IP…" /></label>
        <label class="f"><span>Action</span>
          <select [(ngModel)]="filters.action" (change)="reload()">
            <option value="">All actions</option>
            @for (a of facets()?.actions ?? []; track a.value) { <option [value]="a.value">{{ a.value }} ({{ a.count | number }})</option> }
          </select>
        </label>
        <label class="f"><span>Subject</span>
          <select [(ngModel)]="filters.subject_type" (change)="reload()">
            <option value="">All subjects</option>
            @for (s of facets()?.subject_types ?? []; track s.value) { <option [value]="s.value">{{ subjectLabel(s.value) }} ({{ s.count | number }})</option> }
          </select>
        </label>
        <label class="f"><span>Team member</span>
          <select [(ngModel)]="filters.actor_id" (change)="reload()">
            <option value="">Everyone</option>
            @for (a of facets()?.actors ?? []; track a.id) { <option [value]="a.id">{{ a.name }} ({{ a.count | number }})</option> }
          </select>
        </label>
        <label class="f"><span>From</span><input type="date" [(ngModel)]="filters.from" (change)="reload()" /></label>
        <label class="f"><span>To</span><input type="date" [(ngModel)]="filters.to" (change)="reload()" /></label>
      </section>

      <div class="filters-foot">
        @if (filterCount()) {
          <span class="chip">{{ filterCount() }} filter{{ filterCount() === 1 ? '' : 's' }} active</span>
          <button class="link" type="button" (click)="clearFilters()">Clear all</button>
        } @else { <span class="muted">No filters — showing the full workspace timeline.</span> }
      </div>

      @if (error()) { <p class="notice error">{{ error() }}</p> }

      <div class="card log">
        @if (loading() && !rows().length) {
          <p class="pad muted">Loading activity…</p>
        } @else if (!rows().length) {
          <div class="pad empty"><b>No activity matches.</b><p class="muted">Actions your team takes — new products, orders, settings changes — appear here automatically.</p></div>
        } @else {
          <table>
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Subject</th><th>IP</th><th></th></tr></thead>
            <tbody>
              @for (row of rows(); track row.id) {
                <tr [class.sel]="expanded() === row.id" (click)="toggle(row.id)">
                  <td><b>{{ row.created_at | date:'MMM d, y' }}</b><small class="muted">{{ row.created_at | date:'HH:mm:ss' }} · {{ rel(row.created_at) }}</small></td>
                  <td>
                    @if (row.actor; as a) { <span class="avatar" [style.background]="color(a.id)">{{ initials(a.name) }}</span> <b>{{ a.name }}</b><small class="muted">{{ a.email }}</small> }
                    @else { <b>System</b><small class="muted">automated</small> }
                  </td>
                  <td><span class="action" [attr.data-a]="row.action">{{ row.action }}</span></td>
                  <td>{{ subjectLabel(row.subject_type) }} <small class="muted">#{{ row.subject_id }}</small></td>
                  <td class="mono">{{ row.ip || '—' }}</td>
                  <td class="chev">{{ expanded() === row.id ? '▾' : '▸' }}</td>
                </tr>
                @if (expanded() === row.id) {
                  <tr class="diff-row"><td colspan="6">
                    <div class="diff">
                      <div><h4>Before</h4><pre>{{ pretty(row.diff?.before) }}</pre></div>
                      <div><h4>After</h4><pre>{{ pretty(row.diff?.after) }}</pre></div>
                    </div>
                  </td></tr>
                }
              }
            </tbody>
          </table>
          <div class="log-foot">
            <span class="muted">Showing {{ rows().length | number }} of {{ total() | number }} events · newest first</span>
            @if (rows().length < total()) { <button class="btn ghost" type="button" (click)="more()" [disabled]="loading()">{{ loading() ? 'Loading…' : 'Load more' }}</button> }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host{display:block;max-width:1180px;margin:0 auto;padding-bottom:70px}
    .head{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;margin-bottom:18px;flex-wrap:wrap}
    .eyebrow{margin:0 0 6px;color:var(--accent);font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}
    h1{margin:0;font-size:clamp(28px,3vw,38px)}
    .intro{margin:6px 0 0;color:var(--ink-soft);font-size:14px;max-width:560px}
    .head-actions{display:flex;gap:10px}
    .btn{border:0;border-radius:10px;padding:10px 15px;font-weight:750;cursor:pointer}
    .btn.primary{background:var(--accent-2);color:#fff}
    .btn.ghost{border:1px solid var(--line);background:var(--card);color:var(--ink)}
    .btn:disabled{opacity:.55;cursor:not-allowed}
    .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:14px}
    .kpi{padding:14px 16px}
    .kpi p{margin:0 0 4px;color:var(--ink-soft);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
    .kpi strong{font-size:24px}
    .kpi small{display:block;color:var(--ink-soft);font-size:10.5px;margin-top:2px}
    .filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;padding:16px;align-items:end}
    .f{display:grid;gap:5px;font-size:11.5px;font-weight:750;color:var(--ink-soft)}
    .f.wide{grid-column:1/-1}
    .f input,.f select{border:1px solid var(--line);border-radius:9px;padding:9px 10px;background:var(--card);color:var(--ink);width:100%}
    .filters-foot{display:flex;align-items:center;gap:10px;margin:10px 2px 14px;font-size:12px}
    .chip{background:var(--ink);color:var(--card);padding:4px 10px;border-radius:999px;font-size:11px;font-weight:750}
    .link{background:none;border:0;color:var(--accent);font-weight:750;cursor:pointer;padding:0}
    .muted{color:var(--ink-soft);font-size:12px}
    .notice{padding:11px 14px;border-radius:11px;margin-bottom:14px;font-size:13px}
    .notice.error{background:rgba(155,44,44,.10);color:var(--danger)}
    .log{overflow:hidden}
    .log table{width:100%;border-collapse:collapse}
    .log th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft);padding:12px 14px;border-bottom:1px solid var(--line);background:var(--paper-2)}
    .log td{padding:12px 14px;border-bottom:1px solid var(--paper-2);vertical-align:top;font-size:13.5px}
    .log tbody tr{cursor:pointer}
    .log tbody tr:hover{background:color-mix(in srgb,var(--paper-2) 45%,transparent)}
    .log tr.sel{background:color-mix(in srgb,var(--accent) 6%,transparent)}
    .log td b{display:block}
    .log td small{display:block;font-size:11px}
    .avatar{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;color:#fff;font-size:10px;font-weight:800;vertical-align:middle;margin-right:4px}
    .action{font-weight:800;font-size:11px;letter-spacing:.05em;text-transform:uppercase;padding:4px 9px;border-radius:999px;background:var(--paper-2);color:var(--ink-soft);white-space:nowrap}
    .action[data-a='created']{background:rgba(31,75,58,.13);color:var(--ok)}
    .action[data-a='updated']{background:rgba(196,92,38,.13);color:var(--accent)}
    .action[data-a='deleted']{background:rgba(155,44,44,.11);color:var(--danger)}
    .mono{font-family:ui-monospace,monospace;font-size:12px}
    .chev{color:var(--ink-soft);text-align:right}
    .diff-row td{background:var(--paper);padding:0 14px 14px;cursor:default}
    .diff{display:grid;grid-template-columns:1fr 1fr;gap:12px;border:1px dashed var(--line);border-radius:10px;padding:14px;margin-top:4px}
    .diff h4{margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft)}
    .diff pre{margin:0;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px;font-size:11px;max-height:280px;overflow:auto;white-space:pre-wrap;word-break:break-word}
    .log-foot{display:flex;justify-content:space-between;align-items:center;padding:12px 14px}
    .pad{padding:26px;text-align:center}
    .empty b{display:block;margin-bottom:6px}
    @media(max-width:760px){.log th:nth-child(5),.log td:nth-child(5){display:none}}
    @media(max-width:640px){.log th:nth-child(4),.log td:nth-child(4){display:none}.diff{grid-template-columns:1fr}}
  `],
})
export class SellerActivityComponent {
  private api = inject(ApiService);

  rows = signal<AuditLogEntry[]>([]);
  stats = signal<AuditLogStats | null>(null);
  facets = signal<AuditLogFacets | null>(null);
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  error = signal('');
  expanded = signal<number | null>(null);
  filters: ActivityFilters = { ...EMPTY_FILTERS };
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.reload();
    this.api.tenantAuditFacets().subscribe({ next: (res) => this.facets.set(res.data), error: () => {} });
  }

  reload(): void {
    this.fetch(1, true);
  }

  more(): void {
    this.fetch(this.page() + 1, false);
  }

  refresh(): void {
    this.reload();
  }

  queue(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.reload(), 350);
  }

  clearFilters(): void {
    this.filters = { ...EMPTY_FILTERS };
    this.reload();
  }

  filterCount(): number {
    return Object.values(this.filters).filter(Boolean).length;
  }

  toggle(id: number): void {
    this.expanded.set(this.expanded() === id ? null : id);
  }

  subjectLabel(type: string | null): string {
    if (!type) return '—';
    const base = type.split('\\').pop() ?? type;
    return base.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  rel(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return 'just now';
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
  }

  color(id: number): string {
    const palette = ['#1f4b3a', '#c45c26', '#1d4f7c', '#6b3fa0', '#8a6d1f', '#8c3a52'];
    return palette[id % palette.length];
  }

  pretty(value: Record<string, unknown> | null | undefined): string {
    if (!value || !Object.keys(value).length) return '— no data —';
    return JSON.stringify(value, null, 2);
  }

  exportCsv(): void {
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['id', 'date', 'time', 'action', 'subject', 'subject_id', 'user', 'email', 'ip'];
    const lines = this.rows().map((r) => [
      r.id, r.created_at.slice(0, 10), r.created_at.slice(11, 19), r.action,
      this.subjectLabel(r.subject_type), r.subject_id ?? '', r.actor?.name ?? 'System', r.actor?.email ?? '', r.ip ?? '',
    ].map(esc).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private fetch(page: number, replace: boolean): void {
    this.loading.set(true);
    this.error.set('');
    const params: Record<string, string | number> = { page, per_page: PER_PAGE };
    for (const [key, value] of Object.entries(this.filters)) {
      if (value) params[key] = value;
    }
    this.api.tenantAuditLogs(params).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (res) => {
        this.page.set(res.meta.page);
        this.total.set(res.meta.total);
        this.stats.set(res.stats);
        this.rows.update((rows) => (replace ? res.data : [...rows, ...res.data]));
      },
      error: () => this.error.set('Could not load the activity log.'),
    });
  }
}
