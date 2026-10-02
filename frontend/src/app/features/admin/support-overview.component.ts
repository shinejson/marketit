import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { SupportOverview } from '../../core/models';
import {
  avatarColor,
  categoryLabel,
  channelLabel,
  durationLabel,
  initials,
  priorityLabel,
  relativeTime,
  statusLabel,
} from '../support/support-shared';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#9b2c2c',
  high: '#c45c26',
  normal: '#c9a227',
  low: '#5f6b63',
};

@Component({
  selector: 'app-admin-support-overview',
  imports: [DecimalPipe, RouterLink],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Service desk</p>
        <h1>Customer &amp; tenant support</h1>
        <p class="intro muted">
          One console for every conversation: ticket queues with SLA timers, live chat, service tasks and the tenant help centre.
        </p>
      </div>
      <div class="toolbar">
        <div class="range-picker" role="group" aria-label="Reporting range">
          @for (r of ranges; track r) {
            <button type="button" [class.active]="days() === r" (click)="setRange(r)">{{ r }}d</button>
          }
        </div>
        <a class="btn accent" routerLink="/admin/support/tickets">Open inbox</a>
      </div>
    </header>

    @if (error()) {
      <div class="warning">
        <span>!</span>
        <p>{{ error() }}</p>
        <button type="button" (click)="load()">Retry</button>
      </div>
    }

    @if (loading() && !data()) {
      <div class="grid kpis">
        @for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton" style="height:112px"></div> }
      </div>
      <div class="grid two" style="margin-top:18px">
        <div class="skeleton" style="height:320px"></div>
        <div class="skeleton" style="height:320px"></div>
      </div>
    } @else if (data(); as d) {
      <!-- ---------------------------------------------------------- KPIs -->
      <section class="grid kpis">
        <article class="card kpi urgent">
          <p class="k-label">Open tickets</p>
          <p class="k-value">{{ d.kpis.open_tickets | number }}</p>
          <p class="k-foot">
            <span class="chip danger">{{ d.kpis.urgent }} urgent</span>
            <span class="chip">{{ d.kpis.unassigned }} unassigned</span>
          </p>
        </article>

        <article class="card kpi">
          <p class="k-label">SLA breaches</p>
          <p class="k-value">{{ d.kpis.breached | number }}</p>
          <p class="k-foot muted">First-reply targets missed on open work</p>
        </article>

        <article class="card kpi">
          <p class="k-label">Avg. first response</p>
          <p class="k-value">{{ responseLabel() }}</p>
          <p class="k-foot muted">Resolution {{ d.kpis.avg_resolution_hours }}h on average</p>
        </article>

        <article class="card kpi">
          <p class="k-label">Satisfaction</p>
          <p class="k-value">{{ d.kpis.csat ? d.kpis.csat : '—' }}<small>/5</small></p>
          <p class="k-foot stars">
            @for (s of [1,2,3,4,5]; track s) {
              <span [class.on]="(d.kpis.csat ?? 0) >= s - 0.4">★</span>
            }
          </p>
        </article>

        <article class="card kpi live">
          <p class="k-label">Live chat</p>
          <p class="k-value">{{ d.kpis.active_chats }}<small> active</small></p>
          <p class="k-foot">
            @if (d.kpis.queued_chats) {
              <span class="chip warn pulse">{{ d.kpis.queued_chats }} waiting</span>
            } @else {
              <span class="chip ok">Queue clear</span>
            }
          </p>
        </article>

        <article class="card kpi">
          <p class="k-label">Service tasks</p>
          <p class="k-value">{{ d.kpis.open_tasks }}</p>
          <p class="k-foot">
            @if (d.kpis.overdue_tasks) {
              <span class="chip danger">{{ d.kpis.overdue_tasks }} overdue</span>
            } @else {
              <span class="chip ok">On track</span>
            }
          </p>
        </article>
      </section>

      <!-- -------------------------------------------------- volume + mix -->
      <section class="grid two">
        <article class="card pad chart-card">
          <div class="block-head">
            <div>
              <h2>Ticket volume</h2>
              <p class="muted small">Created vs resolved over the last {{ d.range_days }} days</p>
            </div>
            <div class="legend">
              <span><i style="background:#c45c26"></i>Created</span>
              <span><i style="background:#1f4b3a"></i>Resolved</span>
            </div>
          </div>

          <svg class="area" viewBox="0 0 720 220" preserveAspectRatio="none" role="img" aria-label="Ticket volume trend">
            <defs>
              <linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#c45c26" stop-opacity="0.34" />
                <stop offset="100%" stop-color="#c45c26" stop-opacity="0" />
              </linearGradient>
            </defs>
            @for (g of gridLines; track g) {
              <line x1="0" [attr.y1]="g * 200 + 10" x2="720" [attr.y2]="g * 200 + 10" class="grid-line" />
            }
            <path [attr.d]="areaPath()" fill="url(#createdFill)" />
            <polyline [attr.points]="linePoints('created')" fill="none" stroke="#c45c26" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" />
            <polyline [attr.points]="linePoints('resolved')" fill="none" stroke="#1f4b3a" stroke-width="2.2" stroke-dasharray="5 4" stroke-linejoin="round" stroke-linecap="round" />
          </svg>
          <div class="axis">
            <span>{{ d.volume[0]?.label }}</span>
            <span>{{ d.volume[d.volume.length - 1]?.label }}</span>
          </div>
          <div class="trend-foot">
            <span><strong>{{ d.kpis.created_in_range | number }}</strong> created</span>
            <span><strong>{{ d.kpis.resolved_in_range | number }}</strong> resolved</span>
            <span class="muted">{{ netLabel() }}</span>
          </div>
        </article>

        <article class="card pad">
          <div class="block-head">
            <div>
              <h2>Open by priority</h2>
              <p class="muted small">Where the queue pressure sits right now</p>
            </div>
          </div>

          <div class="donut-row">
            <svg viewBox="0 0 42 42" class="donut" role="img" aria-label="Open tickets by priority">
              <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="var(--paper-2)" stroke-width="5" />
              @for (seg of prioritySegments(); track seg.label) {
                <circle
                  cx="21" cy="21" r="15.9" fill="transparent"
                  [attr.stroke]="seg.color" stroke-width="5"
                  [attr.stroke-dasharray]="seg.dash" [attr.stroke-dashoffset]="seg.offset"
                />
              }
              <text x="21" y="20.5" class="donut-value">{{ d.kpis.open_tickets }}</text>
              <text x="21" y="24.6" class="donut-caption">open</text>
            </svg>
            <ul class="legend-list">
              @for (p of d.by_priority; track p.priority) {
                <li>
                  <i [style.background]="priorityColor(p.priority)"></i>
                  <span>{{ priorityLabel(p.priority) }}</span>
                  <strong>{{ p.count }}</strong>
                </li>
              }
            </ul>
          </div>

          <div class="split">
            <div>
              <h3>By channel</h3>
              @for (c of d.by_channel; track c.channel) {
                <div class="bar-row">
                  <span class="bar-label">{{ channelLabel(c.channel) }}</span>
                  <span class="bar-track"><i [style.width.%]="pct(c.count, maxChannel())"></i></span>
                  <span class="bar-value">{{ c.count }}</span>
                </div>
              }
            </div>
            <div>
              <h3>Top topics</h3>
              @for (c of d.by_category.slice(0, 5); track c.category) {
                <div class="bar-row">
                  <span class="bar-label">{{ categoryLabel(c.category) }}</span>
                  <span class="bar-track"><i class="alt" [style.width.%]="pct(c.count, maxCategory())"></i></span>
                  <span class="bar-value">{{ c.count }}</span>
                </div>
              }
            </div>
          </div>
        </article>
      </section>

      <!-- ------------------------------------------------ agents + queue -->
      <section class="grid two">
        <article class="card pad">
          <div class="block-head">
            <div>
              <h2>Agent workload</h2>
              <p class="muted small">Live assignment across tickets, chats and tasks</p>
            </div>
          </div>
          <table class="table">
            <thead>
              <tr><th>Agent</th><th>Tickets</th><th>Chats</th><th>Tasks</th><th>CSAT</th></tr>
            </thead>
            <tbody>
              @for (a of d.agents; track a.id) {
                <tr>
                  <td>
                    <div class="person">
                      <span class="avatar" [style.background]="avatarColor(a.name)">{{ initials(a.name) }}</span>
                      <span>
                        <strong>{{ a.name }}</strong>
                        <small class="muted">{{ a.email }}</small>
                      </span>
                      <span class="presence" [class]="a.status"></span>
                    </div>
                  </td>
                  <td><span class="load" [class.hot]="a.open_tickets >= 4">{{ a.open_tickets }}</span></td>
                  <td>{{ a.active_chats }}</td>
                  <td>{{ a.open_tasks }}</td>
                  <td>{{ a.csat ? a.csat : '—' }}</td>
                </tr>
              }
            </tbody>
          </table>

          @if (d.top_tenants.length) {
            <h3 class="sub">Busiest tenants</h3>
            <ul class="tenant-list">
              @for (t of d.top_tenants.slice(0, 4); track t.id) {
                <li>
                  <span class="avatar sq" [style.background]="avatarColor(t.name)">{{ initials(t.name) }}</span>
                  <span class="t-name">{{ t.name }}</span>
                  <span class="muted small">{{ t.open }} open</span>
                  <span class="pill">{{ t.tickets }} total</span>
                </li>
              }
            </ul>
          }
        </article>

        <article class="card pad">
          <div class="block-head">
            <div>
              <h2>Latest requests</h2>
              <p class="muted small">Newest tickets across every channel</p>
            </div>
            <a class="link" routerLink="/admin/support/tickets">View all →</a>
          </div>

          <ul class="feed">
            @for (t of d.recent_tickets; track t.id) {
              <li>
                <span class="avatar" [style.background]="avatarColor(t.requester.name)">{{ initials(t.requester.name) }}</span>
                <div class="feed-body">
                  <div class="feed-top">
                    <a [routerLink]="['/admin/support/tickets']" [queryParams]="{ ticket: t.id }" class="f-subject">{{ t.subject }}</a>
                    <span class="pri" [class]="t.priority">{{ priorityLabel(t.priority) }}</span>
                  </div>
                  <p class="muted small f-meta">
                    {{ t.reference }} · {{ t.requester.name }}
                    @if (t.tenant) { · {{ t.tenant.name }} }
                    · {{ channelLabel(t.channel) }} · {{ relativeTime(t.created_at) }}
                  </p>
                  <div class="f-tags">
                    <span class="status-pill" [attr.data-status]="t.status">{{ statusLabel(t.status) }}</span>
                    @if (t.sla_breached) { <span class="status-pill breach">SLA breached</span> }
                  </div>
                </div>
              </li>
            }
          </ul>
        </article>
      </section>

      <!-- ----------------------------------------------- help centre peek -->
      <section class="card pad guides-block">
        <div class="block-head">
          <div>
            <h2>Help centre</h2>
            <p class="muted small">
              {{ d.kpis.published_guides }} published guides · {{ d.kpis.guide_views | number }} reads
            </p>
          </div>
          <a class="link" routerLink="/admin/support/guides">Manage guides →</a>
        </div>
        <div class="guide-grid">
          @for (g of d.top_guides; track g.id) {
            <a class="guide-card" [routerLink]="['/admin/support/guides']" [queryParams]="{ guide: g.id }">
              <span class="g-cat">{{ g.category?.name || 'Uncategorised' }}</span>
              <strong>{{ g.title }}</strong>
              <p class="muted small">{{ g.excerpt }}</p>
              <span class="g-foot muted">
                {{ g.views | number }} reads
                @if (g.helpful_score !== null) { · {{ g.helpful_score }}% helpful }
                · {{ g.read_minutes }} min
              </span>
            </a>
          }
        </div>
      </section>
    }
  `,
  styles: [`
    :host { display:block; max-width:1440px; margin:0 auto; }

    .page-head { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; flex-wrap:wrap; margin-bottom:20px; }
    .eyebrow { margin:0 0 6px; color:var(--accent); font-size:10px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; }
    h1 { margin:0; font-size:clamp(26px,3vw,36px); line-height:1.08; }
    .intro { margin:7px 0 0; font-size:14px; max-width:66ch; }
    .toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .range-picker { display:flex; gap:3px; padding:4px; border:1px solid var(--line); border-radius:12px; background:var(--card); }
    .range-picker button { border:0; border-radius:8px; background:transparent; color:var(--ink-soft); padding:8px 12px; font-size:12px; font-weight:700; cursor:pointer; }
    .range-picker button.active { background:var(--ink); color:var(--card); }
    .btn { padding:11px 18px; font-size:13px; }

    .warning { display:flex; align-items:center; gap:10px; padding:11px 14px; margin-bottom:14px; border:1px solid color-mix(in srgb,var(--danger) 30%,transparent); border-radius:12px; color:var(--danger); font-size:13px; }
    .warning > span { display:grid; place-items:center; width:20px; height:20px; border-radius:50%; background:var(--danger); color:#fff; font-weight:800; flex:none; }
    .warning p { margin:0; flex:1; }
    .warning button { border:0; background:transparent; color:inherit; font-weight:800; cursor:pointer; text-decoration:underline; }

    .grid { display:grid; gap:16px; }
    .kpis { grid-template-columns:repeat(6,minmax(0,1fr)); }
    .two { grid-template-columns:minmax(0,1.35fr) minmax(0,1fr); margin-top:16px; }

    .kpi { padding:16px 18px; position:relative; overflow:hidden; }
    .kpi::after { content:''; position:absolute; inset:0 auto 0 0; width:3px; background:var(--line); }
    .kpi.urgent::after { background:var(--accent); }
    .kpi.live::after { background:var(--accent-2); }
    .k-label { margin:0; font-size:10.5px; font-weight:800; letter-spacing:.11em; text-transform:uppercase; color:var(--ink-soft); }
    .k-value { margin:8px 0 6px; font-family:Fraunces,Georgia,serif; font-size:30px; font-weight:650; line-height:1; letter-spacing:-.02em; }
    .k-value small { font-size:13px; font-weight:600; color:var(--ink-soft); font-family:inherit; }
    .k-foot { margin:0; font-size:11.5px; display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
    .chip { display:inline-flex; padding:3px 8px; border-radius:999px; background:var(--paper-2); font-size:10.5px; font-weight:750; }
    .chip.danger { background:color-mix(in srgb,var(--danger) 15%,transparent); color:var(--danger); }
    .chip.warn { background:color-mix(in srgb,var(--accent) 16%,transparent); color:var(--accent); }
    .chip.ok { background:color-mix(in srgb,var(--ok) 15%,transparent); color:var(--ok); }
    .chip.pulse { animation:sd-pulse 1.8s ease-in-out infinite; }
    @keyframes sd-pulse { 0%,100% { opacity:1; } 50% { opacity:.45; } }
    .stars span { color:var(--line); font-size:14px; }
    .stars span.on { color:var(--gold); }

    .pad { padding:18px 20px; }
    .block-head { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; margin-bottom:14px; flex-wrap:wrap; }
    .block-head h2 { margin:0; font-size:17px; }
    .block-head p { margin:3px 0 0; }
    .small { font-size:12px; }
    .link { color:var(--accent); font-size:12.5px; font-weight:750; white-space:nowrap; }

    .legend { display:flex; gap:12px; font-size:11.5px; color:var(--ink-soft); }
    .legend i { display:inline-block; width:9px; height:9px; border-radius:3px; margin-right:5px; }

    .area { width:100%; height:200px; display:block; }
    .grid-line { stroke:var(--line); stroke-width:1; stroke-dasharray:3 5; opacity:.6; }
    .axis { display:flex; justify-content:space-between; font-size:11px; color:var(--ink-soft); margin-top:4px; }
    .trend-foot { display:flex; gap:16px; margin-top:12px; padding-top:12px; border-top:1px solid var(--line); font-size:12.5px; }
    .trend-foot strong { font-family:Fraunces,Georgia,serif; font-size:15px; }

    .donut-row { display:flex; align-items:center; gap:18px; }
    .donut { width:124px; height:124px; flex:none; transform:rotate(-90deg); }
    .donut-value { font-size:7px; font-weight:700; text-anchor:middle; fill:var(--ink); transform:rotate(90deg); transform-origin:21px 21px; font-family:Fraunces,serif; }
    .donut-caption { font-size:2.6px; text-anchor:middle; fill:var(--ink-soft); letter-spacing:.12em; text-transform:uppercase; transform:rotate(90deg); transform-origin:21px 21px; }
    .legend-list { list-style:none; margin:0; padding:0; flex:1; display:grid; gap:7px; }
    .legend-list li { display:flex; align-items:center; gap:9px; font-size:13px; }
    .legend-list i { width:9px; height:9px; border-radius:3px; flex:none; }
    .legend-list span { flex:1; }
    .legend-list strong { font-family:Fraunces,serif; }

    .split { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:18px; padding-top:16px; border-top:1px solid var(--line); }
    .split h3 { margin:0 0 9px; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-soft); font-family:inherit; font-weight:800; }
    .bar-row { display:grid; grid-template-columns:70px 1fr 24px; gap:8px; align-items:center; margin-bottom:6px; font-size:11.5px; }
    .bar-label { color:var(--ink-soft); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .bar-track { height:7px; border-radius:99px; background:var(--paper-2); overflow:hidden; }
    .bar-track i { display:block; height:100%; border-radius:99px; background:var(--accent); min-width:3px; }
    .bar-track i.alt { background:var(--accent-2); }
    .bar-value { text-align:right; font-weight:700; }

    .table { width:100%; border-collapse:collapse; font-size:13px; }
    .table th { text-align:left; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-soft); padding:0 8px 8px 0; font-weight:800; }
    .table td { padding:9px 8px 9px 0; border-top:1px solid var(--line); }
    .table th:not(:first-child), .table td:not(:first-child) { text-align:center; width:60px; }
    .person { display:flex; align-items:center; gap:9px; position:relative; }
    .person strong { display:block; font-size:13px; }
    .person small { display:block; font-size:11px; }
    .avatar { display:grid; place-items:center; width:32px; height:32px; border-radius:999px; color:#fff; font-size:11.5px; font-weight:800; flex:none; }
    .avatar.sq { border-radius:9px; width:28px; height:28px; font-size:10.5px; }
    .presence { width:8px; height:8px; border-radius:50%; background:var(--line); }
    .presence.online { background:#45a675; box-shadow:0 0 0 3px rgba(69,166,117,.18); }
    .presence.away { background:var(--gold); }
    .load { display:inline-grid; place-items:center; min-width:26px; height:24px; padding:0 7px; border-radius:8px; background:var(--paper-2); font-weight:750; }
    .load.hot { background:color-mix(in srgb,var(--accent) 18%,transparent); color:var(--accent); }

    .sub { margin:18px 0 9px; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-soft); font-family:inherit; font-weight:800; }
    .tenant-list { list-style:none; margin:0; padding:0; display:grid; gap:7px; }
    .tenant-list li { display:flex; align-items:center; gap:10px; font-size:13px; }
    .t-name { flex:1; font-weight:650; }

    .feed { list-style:none; margin:0; padding:0; display:grid; gap:2px; }
    .feed li { display:flex; gap:11px; padding:11px 10px; border-radius:12px; }
    .feed li:hover { background:var(--paper-2); }
    .feed-body { flex:1; min-width:0; }
    .feed-top { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
    .f-subject { font-weight:700; font-size:13.5px; line-height:1.3; }
    .f-subject:hover { color:var(--accent); }
    .f-meta { margin:3px 0 0; font-size:11.5px; }
    .f-tags { display:flex; gap:5px; margin-top:6px; }
    .pri { font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; padding:3px 7px; border-radius:6px; white-space:nowrap; background:var(--paper-2); color:var(--ink-soft); }
    .pri.urgent { background:color-mix(in srgb,var(--danger) 16%,transparent); color:var(--danger); }
    .pri.high { background:color-mix(in srgb,var(--accent) 17%,transparent); color:var(--accent); }
    .status-pill { font-size:10px; font-weight:750; padding:3px 8px; border-radius:999px; background:var(--paper-2); color:var(--ink-soft); }
    .status-pill[data-status="new"] { background:color-mix(in srgb,#5a4fcf 15%,transparent); color:#5a4fcf; }
    .status-pill[data-status="open"] { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); }
    .status-pill[data-status="resolved"], .status-pill[data-status="closed"] { background:color-mix(in srgb,var(--ok) 15%,transparent); color:var(--ok); }
    .status-pill.breach { background:var(--danger); color:#fff; }

    .guides-block { margin-top:16px; }
    .guide-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:12px; }
    .guide-card { display:block; padding:14px 15px; border:1px solid var(--line); border-radius:14px; background:var(--paper-2); transition:border-color .15s ease, transform .15s ease; }
    .guide-card:hover { border-color:var(--accent); transform:translateY(-2px); }
    .g-cat { display:inline-block; font-size:9.5px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--accent); margin-bottom:6px; }
    .guide-card strong { display:block; font-size:13.5px; line-height:1.32; margin-bottom:5px; }
    .guide-card p { margin:0 0 8px; display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; font-size:11.5px; line-height:1.45; }
    .g-foot { font-size:10.5px; }

    .skeleton { background:linear-gradient(90deg,var(--paper-2),var(--card),var(--paper-2)); background-size:200% 100%; animation:sd-shimmer 1.2s infinite; border-radius:16px; }
    @keyframes sd-shimmer { to { background-position:-200% 0; } }

    @media (max-width:1180px) { .kpis { grid-template-columns:repeat(3,1fr); } .two { grid-template-columns:1fr; } }
    @media (max-width:640px) { .kpis { grid-template-columns:repeat(2,1fr); } .split { grid-template-columns:1fr; } }
  `],
})
export class AdminSupportOverviewComponent {
  private api = inject(ApiService);

  readonly ranges = [7, 30, 90];
  readonly gridLines = [0, 0.25, 0.5, 0.75, 1];

  days = signal(30);
  loading = signal(true);
  error = signal('');
  data = signal<SupportOverview | null>(null);

  // Template helpers
  readonly initials = initials;
  readonly avatarColor = avatarColor;
  readonly relativeTime = relativeTime;
  readonly statusLabel = statusLabel;
  readonly priorityLabel = priorityLabel;
  readonly channelLabel = channelLabel;
  readonly categoryLabel = categoryLabel;

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.supportOverview(this.days()).subscribe({
      next: (res) => {
        this.data.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not reach the support API. Start the Laravel app (or tools/mock-api.mjs) and retry.');
        this.loading.set(false);
      },
    });
  }

  setRange(days: number) {
    if (this.days() === days) return;
    this.days.set(days);
    this.load();
  }

  responseLabel = computed(() => durationLabel(this.data()?.kpis.avg_first_response_minutes ?? null));

  netLabel = computed(() => {
    const d = this.data();
    if (!d) return '';
    const net = d.kpis.resolved_in_range - d.kpis.created_in_range;
    if (net === 0) return 'Queue holding steady';
    return net > 0 ? `Backlog down ${net}` : `Backlog up ${Math.abs(net)}`;
  });

  priorityColor(priority: string): string {
    return PRIORITY_COLORS[priority] ?? 'var(--line)';
  }

  pct(value: number, max: number): number {
    return max > 0 ? Math.max(4, (value / max) * 100) : 0;
  }

  maxChannel = computed(() => Math.max(1, ...(this.data()?.by_channel ?? []).map((c) => c.count)));
  maxCategory = computed(() => Math.max(1, ...(this.data()?.by_category ?? []).map((c) => c.count)));

  private points(key: 'created' | 'resolved'): { x: number; y: number }[] {
    const vol = this.data()?.volume ?? [];
    if (!vol.length) return [];
    const max = Math.max(1, ...vol.flatMap((v) => [v.created, v.resolved]));
    return vol.map((v, i) => ({
      x: vol.length === 1 ? 360 : (i / (vol.length - 1)) * 712 + 4,
      y: 210 - (v[key] / max) * 190,
    }));
  }

  linePoints(key: 'created' | 'resolved'): string {
    return this.points(key).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  areaPath(): string {
    const pts = this.points('created');
    if (!pts.length) return '';
    const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');
    return `M ${pts[0].x.toFixed(1)},210 L ${line} L ${pts[pts.length - 1].x.toFixed(1)},210 Z`;
  }

  prioritySegments() {
    const rows = this.data()?.by_priority ?? [];
    const total = rows.reduce((s, r) => s + r.count, 0) || 1;
    const circ = 2 * Math.PI * 15.9;
    let cursor = 0;
    return rows
      .filter((r) => r.count > 0)
      .map((r) => {
        const len = (r.count / total) * circ;
        const offset = circ - cursor;
        cursor += len;
        return { label: r.priority, color: this.priorityColor(r.priority), dash: `${len} ${circ - len}`, offset };
      });
  }
}
