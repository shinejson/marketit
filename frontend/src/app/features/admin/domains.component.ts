import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

type DomainFilter = 'all' | 'active' | 'attention';

@Component({
  selector: 'app-admin-domains',
  imports: [FormsModule, DatePipe],
  template: `
    <main class="page">
      <header class="page-head">
        <div>
          <p class="eyebrow">Platform infrastructure</p>
          <div class="title-row">
            <div class="title-mark" aria-hidden="true"><span></span><span></span><span></span></div>
            <div>
              <h1>Custom domains</h1>
              <p class="intro">Monitor every seller domain, DNS verification and certificate status from one place.</p>
            </div>
          </div>
        </div>
        <div class="head-meta">
          <span class="live-dot"><i></i> Monitoring live</span>
          <button class="btn ghost" type="button" (click)="reload()" [disabled]="loading()">
            <svg viewBox="0 0 24 24" aria-hidden="true" [class.spin]="loading()"><path d="M20 12a8 8 0 1 1-2.5-5.8M20 3.5V7h-3.5" /></svg>
            Refresh
          </button>
        </div>
      </header>

      <section class="metric-grid" aria-label="Domain overview">
        <article class="metric card">
          <div class="metric-icon slate"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg></div>
          <div><span class="metric-label">Total domains</span><strong>{{ domains().length }}</strong><small>Across all tenants</small></div>
        </article>
        <article class="metric card">
          <div class="metric-icon green"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.2 4.2L19 6.5"/><circle cx="12" cy="12" r="9"/></svg></div>
          <div><span class="metric-label">Healthy</span><strong>{{ stats().healthy }}</strong><small>{{ stats().healthPercent }}% of domains</small></div>
        </article>
        <article class="metric card">
          <div class="metric-icon amber"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17.5v.5"/></svg></div>
          <div><span class="metric-label">Needs attention</span><strong>{{ stats().attention }}</strong><small>Verification or TLS issue</small></div>
        </article>
        <article class="metric card">
          <div class="metric-icon blue"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M9 15h.01M12 15h.01M15 15h.01"/></svg></div>
          <div><span class="metric-label">TLS protected</span><strong>{{ stats().tls }}</strong><small>Certificate active or issued</small></div>
        </article>
      </section>

      @if (message()) { <div class="notice success" role="status"><span class="notice-icon">✓</span>{{ message() }}</div> }
      @if (error()) { <div class="notice error" role="alert"><span class="notice-icon">!</span>{{ error() }}<button type="button" (click)="reload()">Try again</button></div> }

      <div class="workspace">
        <section class="list-card card">
          <div class="list-head">
            <div>
              <div class="section-kicker">Domain inventory</div>
              <h2>Connected domains</h2>
              <p class="muted">Review routing, ownership and security health for seller storefronts.</p>
            </div>
            <span class="result-count">{{ filteredDomains().length }} shown</span>
          </div>

          <div class="toolbar">
            <label class="search-box">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
              <input [(ngModel)]="query" type="search" placeholder="Search by domain or tenant" aria-label="Search domains" />
            </label>
            <div class="filters" role="tablist" aria-label="Domain status">
              <button type="button" [class.on]="filter() === 'all'" (click)="filter.set('all')">All <b>{{ domains().length }}</b></button>
              <button type="button" [class.on]="filter() === 'active'" (click)="filter.set('active')">Healthy <b>{{ stats().healthy }}</b></button>
              <button type="button" [class.on]="filter() === 'attention'" (click)="filter.set('attention')">Attention <b>{{ stats().attention }}</b></button>
            </div>
          </div>

          @if (loading()) {
            <div class="loading-list" aria-label="Loading domains">
              @for (row of [1, 2, 3, 4]; track row) { <div class="skeleton-row"><span></span><span></span><span></span><span></span></div> }
            </div>
          } @else if (!filteredDomains().length) {
            <div class="empty-state">
              <div class="empty-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17"/></svg></div>
              <h3>{{ query ? 'No domains found' : 'No domains in this view' }}</h3>
              <p class="muted">{{ query ? 'Try a different domain, tenant name or ID.' : 'Domains will appear here when sellers connect a storefront.' }}</p>
              @if (query) { <button class="btn ghost" type="button" (click)="query = ''">Clear search</button> }
            </div>
          } @else {
            <div class="table-scroll">
              <table>
                <thead><tr><th>Domain</th><th>Tenant</th><th>Status</th><th>SSL</th><th>Last checked</th><th><span class="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  @for (domain of filteredDomains(); track domain.id) {
                    <tr [class.selected]="selectedId() === domain.id" (click)="select(domain.id)">
                      <td>
                        <div class="domain-cell">
                          <span class="domain-favicon">{{ domain.domain?.charAt(0)?.toUpperCase() || 'D' }}</span>
                          <div><strong>{{ domain.domain }}</strong><small>{{ domain.id ? 'Domain #' + domain.id : 'Custom storefront' }}</small></div>
                        </div>
                      </td>
                      <td><span class="tenant-name">{{ domain.tenant?.business_name || domain.tenant?.name || 'Tenant #' + domain.tenant_id }}</span><small class="subline">Tenant ID {{ domain.tenant_id }}</small></td>
                      <td><span [class]="'status ' + statusClass(domain.status)"><i></i>{{ statusLabel(domain.status) }}</span></td>
                      <td><span class="ssl" [class.good]="isTlsHealthy(domain)"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>{{ certificateLabel(domain.cert_status) }}</span></td>
                      <td><span class="date">{{ domain.last_check_at ? (domain.last_check_at | date: 'MMM d, y') : 'Not checked' }}</span><small class="subline">{{ domain.last_check_at ? (domain.last_check_at | date: 'HH:mm') : '—' }}</small></td>
                      <td class="action-cell"><button class="icon-btn" type="button" [disabled]="busyId() === domain.id" (click)="$event.stopPropagation(); verify(domain.id)" [attr.aria-label]="'Verify ' + domain.domain" title="Force verify"><svg viewBox="0 0 24 24" aria-hidden="true" [class.spin]="busyId() === domain.id"><path d="M20 12a8 8 0 1 1-2.5-5.8M20 3.5V7h-3.5"/></svg></button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="table-foot"><span class="muted">Showing {{ filteredDomains().length }} of {{ domains().length }} domains</span><span class="legend"><i class="healthy-dot"></i>Healthy <i class="attention-dot"></i>Needs attention</span></div>
          }
        </section>

        <aside class="detail-column">
          @if (selectedDomain(); as selected) {
            <section class="detail-card card">
              <div class="detail-top"><div class="domain-favicon large">{{ selected.domain?.charAt(0)?.toUpperCase() || 'D' }}</div><div><span class="section-kicker">Selected domain</span><h2>{{ selected.domain }}</h2></div><button class="close-detail" type="button" (click)="selectedId.set(null)" aria-label="Close domain details">×</button></div>
              <div class="detail-status"><span [class]="'status ' + statusClass(selected.status)"><i></i>{{ statusLabel(selected.status) }}</span><span class="muted">Updated {{ selected.updated_at ? (selected.updated_at | date: 'MMM d, y') : 'recently' }}</span></div>
              <div class="health-score"><div class="score-ring" [class.warn]="!isHealthy(selected)"><strong>{{ isHealthy(selected) ? '100' : '62' }}<small>%</small></strong></div><div><strong>{{ isHealthy(selected) ? 'Domain is healthy' : 'Action recommended' }}</strong><p class="muted">{{ isHealthy(selected) ? 'DNS and certificate checks are passing.' : attentionCopy(selected) }}</p></div></div>
              <dl class="detail-list"><div><dt>Tenant</dt><dd>{{ selected.tenant?.business_name || selected.tenant?.name || 'Tenant #' + selected.tenant_id }}</dd></div><div><dt>DNS verification</dt><dd><span class="inline-state" [class.good]="selected.dns_verified_at"><i></i>{{ selected.dns_verified_at ? 'Verified ' + (selected.dns_verified_at | date: 'MMM d, y') : 'Pending verification' }}</span></dd></div><div><dt>Certificate</dt><dd>{{ certificateLabel(selected.cert_status) }}</dd></div><div><dt>Check attempts</dt><dd>{{ selected.check_attempts || 0 }} attempts</dd></div><div><dt>Last check</dt><dd>{{ selected.last_check_at ? (selected.last_check_at | date: 'MMM d, y, HH:mm') : 'Never checked' }}</dd></div></dl>
              <button class="btn verify-btn" type="button" (click)="verify(selected.id)" [disabled]="busyId() === selected.id"><svg viewBox="0 0 24 24" aria-hidden="true" [class.spin]="busyId() === selected.id"><path d="M20 12a8 8 0 1 1-2.5-5.8M20 3.5V7h-3.5"/></svg>{{ busyId() === selected.id ? 'Checking domain…' : 'Run verification check' }}</button>
            </section>
          } @else {
            <section class="detail-card card detail-empty"><div class="empty-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"/><path d="M4 19c0-1.1.9-2 2-2h14M8 7h8M8 11h8"/></svg></div><h3>Select a domain</h3><p class="muted">Choose a row to inspect DNS, TLS and verification details.</p></section>
          }
          <section class="tip-card"><div class="tip-icon">✦</div><div><strong>Keep storefronts secure</strong><p class="muted">A healthy domain needs verified DNS and an active TLS certificate. Run a check after any DNS change.</p><a href="/admin/settings">Review platform settings <span>→</span></a></div></section>
        </aside>
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .page { max-width: 1440px; margin: 0 auto; padding-bottom: 48px; }
    .page-head { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; flex-wrap:wrap; margin-bottom:22px; }
    .eyebrow, .section-kicker { margin:0 0 7px; color:var(--accent); font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
    .title-row { display:flex; align-items:center; gap:14px; }
    h1 { margin:0; font-size:clamp(30px,3vw,42px); line-height:1.05; }
    h2, h3, p { margin-top:0; }
    .intro { margin:8px 0 0; color:var(--ink-soft); font-size:14px; }
    .title-mark { display:grid; grid-template-columns:repeat(3,6px); align-items:end; gap:3px; width:38px; height:38px; padding:10px; border-radius:12px; background:var(--ink); }
    .title-mark span { display:block; border-radius:2px; background:var(--accent); }
    .title-mark span:nth-child(1) { height:9px; opacity:.65; }.title-mark span:nth-child(2) { height:15px; opacity:.82; }.title-mark span:nth-child(3) { height:20px; }
    .head-meta { display:flex; align-items:center; gap:12px; }
    .live-dot { display:flex; align-items:center; gap:7px; color:var(--ink-soft); font-size:12px; font-weight:650; }
    .live-dot i, .healthy-dot, .attention-dot { width:7px; height:7px; border-radius:50%; background:#4ca878; box-shadow:0 0 0 4px rgba(76,168,120,.13); }
    .live-dot i { display:inline-block; }
    .btn { padding:10px 15px; font-size:12px; }
    .btn svg { width:15px; height:15px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
    .metric-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px; }
    .metric { display:flex; align-items:center; gap:12px; padding:16px; min-height:98px; }
    .metric-icon { display:grid; place-items:center; width:38px; height:38px; flex:none; border-radius:12px; }.metric-icon svg { width:19px; height:19px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
    .metric-icon.slate { color:#536479; background:#e9eef4; }.metric-icon.green { color:#247451; background:#e3f1e9; }.metric-icon.amber { color:#a36a15; background:#fbefda; }.metric-icon.blue { color:#356f91; background:#e4eff6; }
    :root[data-theme="dark"] .metric-icon.slate { background:rgba(83,100,121,.2); }:root[data-theme="dark"] .metric-icon.green { background:rgba(36,116,81,.2); }:root[data-theme="dark"] .metric-icon.amber { background:rgba(163,106,21,.2); }:root[data-theme="dark"] .metric-icon.blue { background:rgba(53,111,145,.2); }
    .metric-label { display:block; color:var(--ink-soft); font-size:10px; font-weight:750; letter-spacing:.08em; text-transform:uppercase; }.metric strong { display:block; margin:3px 0 1px; font:650 24px Fraunces,Georgia,serif; }.metric small { display:block; color:var(--ink-soft); font-size:11px; }
    .notice { display:flex; align-items:center; gap:8px; margin:0 0 14px; padding:11px 13px; border-radius:12px; font-size:13px; font-weight:650; }.notice-icon { display:grid; place-items:center; width:20px; height:20px; border-radius:50%; color:#fff; font-size:12px; }.notice.success { background:rgba(31,75,58,.1); color:var(--ok); }.notice.success .notice-icon { background:var(--ok); }.notice.error { background:rgba(155,44,44,.1); color:var(--danger); }.notice.error .notice-icon { background:var(--danger); }.notice button { margin-left:auto; border:0; background:none; color:inherit; text-decoration:underline; font-weight:750; cursor:pointer; }
    .workspace { display:grid; grid-template-columns:minmax(0,1fr) 330px; gap:18px; align-items:start; }.list-card, .detail-card { overflow:hidden; }
    .list-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding:21px 22px 15px; }.list-head h2 { margin:0 0 4px; font-size:22px; }.list-head p { margin:0; font-size:12px; }.result-count { padding:5px 9px; border-radius:999px; background:var(--paper-2); color:var(--ink-soft); font-size:11px; font-weight:750; white-space:nowrap; }
    .toolbar { display:flex; align-items:center; gap:12px; padding:0 22px 15px; border-bottom:1px solid var(--line); flex-wrap:wrap; }.search-box { position:relative; display:flex; align-items:center; flex:1; min-width:220px; }.search-box svg { position:absolute; left:12px; width:16px; height:16px; fill:none; stroke:var(--ink-soft); stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; pointer-events:none; }.search-box input { width:100%; border:1px solid var(--line); border-radius:11px; padding:10px 12px 10px 36px; background:var(--paper); color:var(--ink); font-size:12.5px; }.search-box input:focus { outline:2px solid color-mix(in srgb,var(--accent) 45%,transparent); outline-offset:1px; }.filters { display:flex; gap:3px; padding:4px; border-radius:11px; background:var(--paper-2); }.filters button { border:0; border-radius:8px; padding:7px 9px; background:transparent; color:var(--ink-soft); font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap; }.filters button.on { background:var(--ink); color:var(--card); }.filters b { margin-left:3px; opacity:.7; font-size:10px; }
    .table-scroll { overflow-x:auto; } table { width:100%; min-width:700px; border-collapse:collapse; font-size:12.5px; } th { padding:11px 13px; color:var(--ink-soft); text-align:left; font-size:9.5px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; white-space:nowrap; } td { padding:13px; border-top:1px solid var(--line); vertical-align:middle; } tbody tr { cursor:pointer; transition:background .15s ease; } tbody tr:hover, tbody tr.selected { background:color-mix(in srgb,var(--accent) 5%,transparent); } tbody tr.selected { box-shadow:inset 3px 0 var(--accent); }
    .domain-cell { display:flex; align-items:center; gap:9px; min-width:185px; }.domain-cell strong { display:block; font-size:13px; }.domain-cell small, td small { display:block; margin-top:3px; color:var(--ink-soft); font-size:10px; }.domain-favicon { display:grid; place-items:center; width:30px; height:30px; flex:none; border-radius:9px; background:var(--ink); color:var(--card); font-size:12px; font-weight:800; }.domain-favicon.large { width:38px; height:38px; border-radius:11px; font-size:15px; }.tenant-name { display:block; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:650; }.subline { color:var(--ink-soft); }.status, .ssl, .inline-state { display:inline-flex; align-items:center; gap:6px; white-space:nowrap; font-size:11px; font-weight:700; }.status i, .inline-state i { width:6px; height:6px; border-radius:50%; background:currentColor; }.status.active, .status.verified { color:var(--ok); }.status.requested, .status.dns_pending, .status.tls_provisioning, .status.failed { color:#b06e16; }.status.removed { color:var(--ink-soft); }.ssl { color:var(--ink-soft); font-weight:600; }.ssl.good, .inline-state.good { color:var(--ok); }.ssl svg { width:14px; height:14px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }.date { white-space:nowrap; }.action-cell { width:48px; text-align:right; }.icon-btn, .close-detail { display:inline-grid; place-items:center; width:31px; height:31px; padding:0; border:1px solid var(--line); border-radius:9px; background:transparent; color:var(--ink-soft); cursor:pointer; }.icon-btn:hover, .close-detail:hover { border-color:var(--accent); color:var(--accent); }.icon-btn:disabled { opacity:.55; cursor:wait; }.icon-btn svg { width:14px; height:14px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }.table-foot { display:flex; justify-content:space-between; gap:12px; padding:12px 22px; border-top:1px solid var(--line); font-size:11px; }.legend { display:flex; align-items:center; gap:6px; color:var(--ink-soft); }.attention-dot { display:inline-block; margin-left:7px; background:#c78226; box-shadow:0 0 0 4px rgba(199,130,38,.12); }
    .loading-list { padding:10px 14px 14px; }.skeleton-row { display:grid; grid-template-columns:2fr 1.2fr 1fr 1fr 1fr 32px; gap:14px; align-items:center; padding:15px 0; border-bottom:1px solid var(--line); }.skeleton-row span { height:12px; border-radius:6px; background:linear-gradient(90deg,var(--paper-2),var(--card),var(--paper-2)); background-size:200% 100%; animation:shimmer 1.2s infinite; }.skeleton-row span:first-child { height:26px; }.empty-state { display:grid; justify-items:center; padding:62px 24px; text-align:center; }.empty-icon { display:grid; place-items:center; width:48px; height:48px; margin-bottom:13px; border-radius:15px; background:var(--paper-2); color:var(--ink-soft); }.empty-icon svg { width:23px; height:23px; fill:none; stroke:currentColor; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; }.empty-state h3, .detail-empty h3 { margin:0 0 5px; font-size:19px; }.empty-state p, .detail-empty p { margin:0 0 16px; font-size:13px; }
    .detail-column { display:grid; gap:14px; }.detail-card { padding:20px; }.detail-top { display:flex; align-items:center; gap:10px; }.detail-top h2 { margin:2px 0 0; font-size:18px; max-width:210px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.detail-top .section-kicker { margin-bottom:0; }.close-detail { margin-left:auto; border:0; font-size:22px; line-height:1; }.detail-status { display:flex; justify-content:space-between; align-items:center; gap:8px; margin:18px 0 16px; padding-top:14px; border-top:1px solid var(--line); font-size:10px; }.health-score { display:flex; align-items:center; gap:11px; padding:12px; border-radius:13px; background:var(--paper-2); }.score-ring { display:grid; place-items:center; width:52px; height:52px; flex:none; border-radius:50%; background:conic-gradient(var(--ok) 0 100%, transparent 0); position:relative; }.score-ring::after { content:''; position:absolute; inset:5px; border-radius:50%; background:var(--paper-2); }.score-ring strong { position:relative; z-index:1; font-size:13px; }.score-ring small { font-size:9px; }.score-ring.warn { background:conic-gradient(var(--accent) 0 62%, var(--line) 62% 100%); }.health-score > div:last-child { min-width:0; }.health-score > div:last-child > strong { font-size:12.5px; }.health-score p { margin:3px 0 0; font-size:11px; line-height:1.4; }.detail-list { margin:16px 0 0; }.detail-list div { display:flex; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid var(--line); }.detail-list div:last-child { border-bottom:0; }.detail-list dt { color:var(--ink-soft); font-size:11px; }.detail-list dd { margin:0; text-align:right; font-size:11px; font-weight:650; }.verify-btn { width:100%; margin-top:10px; border-radius:11px; padding:10px 13px; font-size:12px; }.verify-btn svg { width:15px; height:15px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }.detail-empty { display:grid; justify-items:center; min-height:250px; text-align:center; }.tip-card { display:flex; gap:11px; padding:16px; border:1px solid color-mix(in srgb,var(--gold) 35%,var(--line)); border-radius:var(--radius); background:linear-gradient(125deg,color-mix(in srgb,var(--gold) 10%,var(--card)),var(--card)); }.tip-icon { display:grid; place-items:center; width:28px; height:28px; flex:none; border-radius:9px; background:var(--ink); color:var(--gold); }.tip-card strong { font-size:13px; }.tip-card p { margin:4px 0 10px; font-size:11.5px; line-height:1.45; }.tip-card a { color:var(--accent); font-size:11.5px; font-weight:750; }.tip-card a span { margin-left:4px; }.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
    .spin { animation:spin 1s linear infinite; transform-origin:center; }.close-detail:focus-visible, .icon-btn:focus-visible, button:focus-visible, input:focus-visible { outline:2px solid var(--accent); outline-offset:2px; } @keyframes spin { to { transform:rotate(360deg); } } @keyframes shimmer { to { background-position:-200% 0; } }
    @media (max-width:1120px) { .workspace { grid-template-columns:1fr; }.detail-column { grid-template-columns:minmax(0,1fr) minmax(250px,330px); align-items:start; }.detail-empty { min-height:0; } }
    @media (max-width:780px) { .metric-grid { grid-template-columns:repeat(2,1fr); }.detail-column { grid-template-columns:1fr; }.toolbar { align-items:stretch; }.search-box { flex-basis:100%; }.filters { overflow-x:auto; }.page-head { align-items:flex-start; }.head-meta { width:100%; justify-content:space-between; } }
    @media (max-width:520px) { .metric-grid { grid-template-columns:1fr; }.metric { min-height:82px; }.list-head, .toolbar { padding-left:14px; padding-right:14px; }.table-foot { padding-left:14px; padding-right:14px; }.table-foot .legend { display:none; }.title-row { align-items:flex-start; }.title-mark { margin-top:2px; } }
  `],
})
export class AdminDomainsComponent {
  private api = inject(ApiService);

  domains = signal<any[]>([]);
  loading = signal(true);
  error = signal('');
  message = signal('');
  query = '';
  filter = signal<DomainFilter>('all');
  selectedId = signal<number | null>(null);
  busyId = signal<number | null>(null);

  filteredDomains = computed(() => {
    const term = this.query.trim().toLowerCase();
    const filter = this.filter();
    return this.domains().filter((domain) => {
      const haystack = [domain.domain, domain.tenant?.name, domain.tenant?.business_name, domain.tenant_id].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      const matchesFilter = filter === 'all' || (filter === 'active' ? this.isHealthy(domain) : this.needsAttention(domain));
      return matchesSearch && matchesFilter;
    });
  });

  selectedDomain = computed(() => {
    const selected = this.domains().find((domain) => domain.id === this.selectedId());
    return selected || this.filteredDomains()[0] || null;
  });

  stats = computed(() => {
    const rows = this.domains();
    const healthy = rows.filter((domain) => this.isHealthy(domain)).length;
    const tls = rows.filter((domain) => this.isTlsHealthy(domain)).length;
    return {
      healthy,
      attention: rows.filter((domain) => this.needsAttention(domain)).length,
      tls,
      healthPercent: rows.length ? Math.round((healthy / rows.length) * 100) : 0,
    };
  });

  constructor() {
    this.reload();
  }

  reload() {
    this.loading.set(true);
    this.error.set('');
    this.api.adminDomains().subscribe({
      next: (res) => {
        this.domains.set(res.data || []);
        if (!this.selectedId() && res.data?.length) this.selectedId.set(res.data[0].id);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load domain health right now.');
      },
    });
  }

  select(id: number) {
    this.selectedId.set(id);
  }

  verify(id: number) {
    this.busyId.set(id);
    this.message.set('');
    this.error.set('');
    this.api.adminVerifyDomain(id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.message.set('Verification check completed. Domain health has been refreshed.');
        this.reload();
      },
      error: () => {
        this.busyId.set(null);
        this.error.set('The verification check could not be completed. Please try again.');
      },
    });
  }

  isHealthy(domain: any): boolean {
    return ['active', 'verified'].includes(domain.status) && !['failed', 'none', 'pending'].includes(domain.cert_status);
  }

  needsAttention(domain: any): boolean {
    return !this.isHealthy(domain) && domain.status !== 'removed';
  }

  isTlsHealthy(domain: any): boolean {
    return ['active', 'issued', 'ready', 'valid'].includes(String(domain.cert_status || '').toLowerCase());
  }

  statusLabel(status: string): string {
    return String(status || 'unknown').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  statusClass(status: string): string {
    return String(status || 'unknown').toLowerCase().replaceAll(' ', '_');
  }

  certificateLabel(status: string): string {
    const value = String(status || 'none').toLowerCase();
    if (['active', 'issued', 'ready', 'valid'].includes(value)) return 'Protected';
    if (['provisioning', 'pending'].includes(value)) return 'Provisioning';
    if (value === 'failed') return 'Failed';
    return 'Not issued';
  }

  attentionCopy(domain: any): string {
    if (domain.status === 'dns_pending' || domain.status === 'requested') return 'DNS records still need to be verified.';
    if (domain.cert_status === 'failed') return 'Certificate provisioning needs a retry.';
    return 'Run a verification check to diagnose this domain.';
  }
}
