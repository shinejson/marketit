import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../core/api.service';
import {
  DashboardChatThread,
  DashboardMetric,
  DashboardTrendPoint,
  DepartmentSummary,
  TenantDashboard,
} from '../../core/models';

interface KpiTile {
  key: string;
  label: string;
  metric: DashboardMetric;
  tone: 'accent' | 'ok' | 'gold' | 'ink';
  link?: string;
  showDelta: boolean;
}

const DEPT_META: Record<string, { blurb: string; icon: string; color: string }> = {
  finance: { blurb: 'Revenue, settlements and margin health', icon: 'coins', color: '#1f4b3a' },
  sales: { blurb: 'Pipeline, conversion and customer growth', icon: 'trend', color: '#c45c26' },
  operations: { blurb: 'Fulfilment, stock and delivery SLAs', icon: 'box', color: '#3b6ea5' },
  marketing: { blurb: 'Campaigns, reach and acquisition spend', icon: 'megaphone', color: '#8a5cb8' },
};

@Component({
  selector: 'app-seller-dashboard',
  imports: [DecimalPipe, DatePipe, NgClass, RouterLink],
  template: `
    <section class="page">
      <!-- ───────────────────────────── header -->
      <header class="page-head">
        <div>
          <p class="eyebrow">Tenant console</p>
          <h1>{{ greeting() }}</h1>
          <p class="intro muted">
            A consolidated view of trading performance, departments, products and conversations
            @if (data(); as d) { · updated {{ d.generated_at | date: 'MMM d, h:mm a' }} }
          </p>
        </div>
        <div class="toolbar">
          <div class="range-picker" role="group" aria-label="Reporting range">
            @for (r of ranges; track r) {
              <button type="button" [class.active]="range() === r" (click)="setRange(r)">{{ r }}d</button>
            }
          </div>
          <button type="button" class="ghost-btn" (click)="load()" [disabled]="loading()">
            <svg viewBox="0 0 24 24" class="ic"><path d="M20 11a8 8 0 1 0-2.3 6.3M20 5v6h-6" /></svg>
            Refresh
          </button>
          <a class="solid-btn" routerLink="/tenant/reports">View tenant report</a>
        </div>
      </header>

      @if (loading()) { <div class="refresh-line"><span></span></div> }
      @if (error()) {
        <div class="banner error">
          <strong>Dashboard data unavailable.</strong>
          <span>{{ error() }}</span>
          <button type="button" class="ghost-btn sm" (click)="load()">Try again</button>
        </div>
      }

      <!-- ───────────────────────────── KPI strip -->
      <div class="kpi-grid">
        @if (loading() && !data()) {
          @for (s of skeletons; track s) { <div class="skeleton tile-skel"></div> }
        } @else {
          @for (t of tiles(); track t.key) {
            <article class="card kpi" [ngClass]="'tone-' + t.tone">
              <p class="kpi-label">{{ t.label }}</p>
              <p class="kpi-value">{{ renderMetric(t.metric) }}</p>
              <div class="kpi-foot">
                @if (t.showDelta) {
                  <span class="delta" [ngClass]="t.metric.direction">
                    <svg viewBox="0 0 24 24" class="ic xs">
                      @if (t.metric.direction === 'down') { <path d="M5 9l7 7 7-7" /> } @else { <path d="M5 15l7-7 7 7" /> }
                    </svg>
                    {{ absolute(t.metric.delta) | number: '1.0-1' }}%
                  </span>
                }
                <span class="muted cap">{{ t.metric.caption }}</span>
              </div>
            </article>
          }
        }
      </div>

      <!-- ───────────────────────────── trend + status mix -->
      <div class="split">
        <article class="card panel">
          <div class="panel-head">
            <div>
              <h2>Revenue trend</h2>
              <p class="muted sub">Daily net sales over the last {{ range() }} days</p>
            </div>
            <div class="totals">
              <span class="big">{{ money(periodTotal()) }}</span>
              <span class="muted sub">{{ periodOrders() | number }} orders</span>
            </div>
          </div>
          @if (trend().length > 1) {
            <svg class="area" viewBox="0 0 720 220" preserveAspectRatio="none" role="img" aria-label="Revenue trend">
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.32" />
                  <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
                </linearGradient>
              </defs>
              @for (g of gridLines; track g) {
                <line x1="0" [attr.y1]="g * 200 + 10" x2="720" [attr.y2]="g * 200 + 10" class="grid" />
              }
              <path [attr.d]="areaPath()" fill="url(#revFill)" />
              <path [attr.d]="linePath()" fill="none" stroke="var(--accent)" stroke-width="2.5"
                stroke-linejoin="round" stroke-linecap="round" />
              @for (p of markers(); track p.day) {
                <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3.2" class="dot" />
              }
            </svg>
            <div class="axis">
              <span>{{ trend()[0].label }}</span>
              <span>Peak {{ money(peak()) }}</span>
              <span>{{ trend()[trend().length - 1].label }}</span>
            </div>
          } @else {
            <p class="empty-sm">No sales recorded in this window yet.</p>
          }
        </article>

        <article class="card panel">
          <div class="panel-head">
            <div>
              <h2>Order status mix</h2>
              <p class="muted sub">Where this period's orders currently sit</p>
            </div>
          </div>
          @if (statusTotal() > 0) {
            <div class="donut-row">
              <svg viewBox="0 0 42 42" class="donut">
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--paper-2)" stroke-width="5.5" />
                @for (s of donut(); track s.label) {
                  <circle cx="21" cy="21" r="15.9" fill="none" [attr.stroke]="s.color" stroke-width="5.5"
                    [attr.stroke-dasharray]="s.dash" [attr.stroke-dashoffset]="s.offset" />
                }
              </svg>
              <ul class="legend">
                @for (s of donut(); track s.label) {
                  <li>
                    <i [style.background]="s.color"></i>
                    <span class="nm">{{ s.label }}</span>
                    <span class="vl">{{ s.count }}</span>
                    <span class="muted pc">{{ s.percent | number: '1.0-0' }}%</span>
                  </li>
                }
              </ul>
            </div>
          } @else {
            <p class="empty-sm">No orders in this window.</p>
          }
        </article>
      </div>

      <!-- ───────────────────────────── departments -->
      <section class="block">
        <div class="block-head">
          <h2>Department summary</h2>
          <p class="muted sub">Live KPIs and goal progress across every function</p>
        </div>
        <div class="dept-grid">
          @if (!departments().length) {
            @for (s of [1,2,3,4]; track s) { <div class="skeleton dept-skel"></div> }
          }
          @for (d of departments(); track d.key) {
            <a class="card dept" [routerLink]="'/tenant/departments/' + d.key">
              <div class="dept-top">
                <span class="dept-icon" [style.background]="meta(d.key).color">
                  <svg viewBox="0 0 24 24" class="ic">
                    @switch (meta(d.key).icon) {
                      @case ('coins') { <circle cx="9" cy="8" r="5" /><path d="M14.5 4.2a5 5 0 0 1 0 15.6M4 14v2c0 2.2 2.2 4 5 4s5-1.8 5-4v-2" /> }
                      @case ('trend') { <path d="M3 17l6-6 4 4 7-7M14 8h7v7" /> }
                      @case ('box') { <path d="M3 8l9-5 9 5v8l-9 5-9-5z M3 8l9 5 9-5M12 13v8" /> }
                      @default { <path d="M3 11v2a2 2 0 0 0 2 2h2l7 4V5L7 9H5a2 2 0 0 0-2 2zM18 8a5 5 0 0 1 0 8" /> }
                    }
                  </svg>
                </span>
                <div>
                  <strong>{{ d.title }}</strong>
                  <p class="muted sub">{{ meta(d.key).blurb }}</p>
                </div>
              </div>
              <div class="dept-kpis">
                @for (k of d.kpis.slice(0, 3); track k.key) {
                  <div>
                    <p class="muted lbl">{{ k.label }}</p>
                    <p class="val">{{ kpi(k) }}</p>
                  </div>
                }
              </div>
              @for (p of d.progress.slice(0, 1); track p.label) {
                <div class="goal">
                  <div class="goal-row"><span class="muted">{{ p.label }}</span><span>{{ p.percent }}%</span></div>
                  <div class="track"><div class="fill" [style.width.%]="clamp(p.percent)" [style.background]="meta(d.key).color"></div></div>
                </div>
              }
              <span class="dept-cta">Open department →</span>
            </a>
          }
        </div>
      </section>

      <!-- ───────────────────────────── products + chats -->
      <div class="split wide-left">
        <article class="card panel">
          <div class="panel-head">
            <div>
              <h2>Top performing products</h2>
              <p class="muted sub">Ranked by revenue over the last {{ range() }} days</p>
            </div>
            <a class="link" routerLink="/tenant/products">All products</a>
          </div>
          @if (data()?.top_products?.length) {
            <table class="tbl">
              <thead>
                <tr><th>Product</th><th class="r">Units</th><th class="r">Revenue</th><th class="r">Share</th><th class="r">Trend</th><th class="r">Stock</th></tr>
              </thead>
              <tbody>
                @for (p of data()!.top_products; track p.sku || p.name) {
                  <tr>
                    <td>
                      <span class="pname">{{ p.name }}</span>
                      @if (p.sku) { <span class="muted sku">{{ p.sku }}</span> }
                    </td>
                    <td class="r">{{ p.units | number }}</td>
                    <td class="r strong">{{ money(p.revenue) }}</td>
                    <td class="r">
                      <div class="share"><div class="share-fill" [style.width.%]="clamp(p.share)"></div></div>
                      <span class="muted xs">{{ p.share | number: '1.0-1' }}%</span>
                    </td>
                    <td class="r">
                      <span class="delta" [ngClass]="p.delta > 0 ? 'up' : p.delta < 0 ? 'down' : 'flat'">
                        {{ p.delta > 0 ? '+' : '' }}{{ p.delta | number: '1.0-1' }}%
                      </span>
                    </td>
                    <td class="r">
                      @if (p.stock === null) { <span class="muted">—</span> }
                      @else { <span class="pill" [ngClass]="p.stock! <= 5 ? 'warn' : ''">{{ p.stock }}</span> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="empty-sm">No product sales in this window yet.</p>
          }
        </article>

        <article class="card panel chats">
          <div class="panel-head">
            <div>
              <h2>Conversations</h2>
              <p class="muted sub">Latest support chat activity</p>
            </div>
            @if (unread() > 0) { <span class="badge">{{ unread() }} unread</span> }
          </div>
          @if (threads().length) {
            <div class="thread-list">
              @for (t of threads(); track t.id) {
                <div class="thread" [class.open]="expanded() === t.id">
                  <button type="button" class="thread-head" (click)="toggle(t.id)">
                    <span class="dotstat" [ngClass]="t.status"></span>
                    <span class="t-main">
                      <strong>{{ t.topic }}</strong>
                      <span class="muted xs">{{ t.agent || 'Unassigned' }} · {{ t.last_message_at | date: 'MMM d, h:mm a' }}</span>
                    </span>
                    @if (t.unread > 0) { <span class="badge sm">{{ t.unread }}</span> }
                    <svg viewBox="0 0 24 24" class="ic xs chev"><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                  @if (expanded() === t.id) {
                    <div class="bubbles">
                      @for (m of t.messages; track m.id) {
                        <div class="bubble" [ngClass]="m.role === 'visitor' ? 'mine' : 'theirs'">
                          <p class="who muted xs">{{ m.author }} · {{ m.at | date: 'h:mm a' }}</p>
                          <p class="body">{{ m.body }}</p>
                        </div>
                      }
                      <a class="link" routerLink="/tenant/support">Reply in service desk →</a>
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <p class="empty-sm">No conversations yet. <a class="link" routerLink="/tenant/support">Start a chat</a></p>
          }

          <div class="support-stats">
            <div><p class="muted lbl">Open tickets</p><p class="val">{{ data()?.support?.tickets?.open ?? 0 }}</p></div>
            <div><p class="muted lbl">Awaiting you</p><p class="val">{{ data()?.support?.tickets?.awaiting_you ?? 0 }}</p></div>
            <div><p class="muted lbl">Open tasks</p><p class="val">{{ data()?.support?.tasks?.open ?? 0 }}</p></div>
            <div><p class="muted lbl">Overdue</p><p class="val danger">{{ data()?.support?.tasks?.overdue ?? 0 }}</p></div>
          </div>
        </article>
      </div>

      <!-- ───────────────────────────── orders / stores / stock -->
      <div class="triple">
        <article class="card panel">
          <div class="panel-head">
            <div><h2>Recent orders</h2><p class="muted sub">Newest activity across stores</p></div>
            <a class="link" routerLink="/tenant/orders">All orders</a>
          </div>
          @if (data()?.recent_orders?.length) {
            <ul class="rows">
              @for (o of data()!.recent_orders; track o.id) {
                <li>
                  <span class="ref">{{ o.reference }}</span>
                  <span class="meta muted xs">{{ o.customer }}@if (o.store) { · {{ o.store }} }</span>
                  <span class="pill" [ngClass]="statusTone(o.status)">{{ pretty(o.status) }}</span>
                  <span class="amt">{{ money(+o.subtotal) }}</span>
                </li>
              }
            </ul>
          } @else { <p class="empty-sm">No orders yet.</p> }
        </article>

        <article class="card panel">
          <div class="panel-head">
            <div><h2>Store performance</h2><p class="muted sub">Revenue split by storefront</p></div>
            <a class="link" routerLink="/tenant/stores">Manage</a>
          </div>
          @if (data()?.stores?.length) {
            <ul class="rows bars">
              @for (s of data()!.stores; track s.id) {
                <li>
                  <div class="bar-head"><strong>{{ s.name }}</strong><span>{{ money(s.revenue) }}</span></div>
                  <div class="track"><div class="fill" [style.width.%]="clamp(s.share)"></div></div>
                  <span class="muted xs">{{ s.orders }} orders · {{ s.share | number: '1.0-1' }}% of revenue</span>
                </li>
              }
            </ul>
          } @else { <p class="empty-sm">No store revenue in this window.</p> }
        </article>

        <article class="card panel">
          <div class="panel-head">
            <div><h2>Inventory alerts</h2><p class="muted sub">Variants at or below threshold</p></div>
            <a class="link" routerLink="/tenant/inventory">Inventory</a>
          </div>
          @if (data()?.inventory_alerts?.length) {
            <ul class="rows alerts">
              @for (a of data()!.inventory_alerts; track a.variant_id) {
                <li>
                  <span class="dotstat" [ngClass]="a.severity === 'out' ? 'ended' : 'queued'"></span>
                  <span class="t-main">
                    <strong>{{ a.name }}</strong>
                    <span class="muted xs">{{ a.sku || 'No SKU' }} · threshold {{ a.threshold }}</span>
                  </span>
                  <span class="pill" [ngClass]="a.severity === 'out' ? 'danger' : 'warn'">
                    {{ a.severity === 'out' ? 'Out of stock' : a.available + ' left' }}
                  </span>
                </li>
              }
            </ul>
          } @else { <p class="empty-sm">Every variant is above its threshold.</p> }
        </article>
      </div>
    </section>
  `,
  styles: [`
    :host { display:block; max-width:1440px; margin:0 auto; }
    .page { padding-bottom: 36px; }

    .page-head { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; flex-wrap:wrap; margin-bottom:22px; }
    .eyebrow { margin:0 0 6px; color:var(--accent); font-size:10px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; }
    h1 { margin:0; font-size:clamp(26px,3vw,36px); line-height:1.08; }
    .intro { margin:7px 0 0; font-size:14px; max-width:62ch; }
    .toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .range-picker { display:flex; gap:3px; padding:4px; border:1px solid var(--line); border-radius:12px; background:var(--card); }
    .range-picker button { border:0; border-radius:8px; background:transparent; color:var(--ink-soft); padding:8px 11px; font-size:12px; font-weight:700; cursor:pointer; }
    .range-picker button.active { background:var(--ink); color:var(--card); }
    .ghost-btn, .solid-btn { display:inline-flex; align-items:center; gap:7px; border-radius:12px; padding:10px 14px; font-size:12px; font-weight:750; cursor:pointer; }
    .ghost-btn { border:1px solid var(--line); background:var(--card); color:var(--ink); }
    .ghost-btn:hover { border-color:var(--accent); }
    .ghost-btn.sm { padding:6px 10px; }
    .solid-btn { border:0; background:var(--ink); color:var(--card); }
    .ic { width:15px; height:15px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
    .ic.xs { width:12px; height:12px; }

    .refresh-line { position:relative; height:2px; overflow:hidden; margin:-8px 0 14px; border-radius:4px; background:var(--paper-2); }
    .refresh-line span { position:absolute; width:35%; height:100%; background:var(--accent); animation:dash-refresh 1s ease-in-out infinite; }
    @keyframes dash-refresh { 0%{left:-35%} 100%{left:100%} }
    .banner { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:11px 14px; border-radius:12px; font-size:13px; margin-bottom:14px; }
    .banner.error { border:1px solid color-mix(in srgb, var(--danger) 35%, transparent); color:var(--danger); background:color-mix(in srgb, var(--danger) 7%, transparent); }

    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:14px; margin-bottom:20px; }
    .tile-skel { height:112px; }
    .kpi { padding:16px 17px; position:relative; overflow:hidden; }
    .kpi::before { content:''; position:absolute; inset:0 auto 0 0; width:3px; background:var(--accent); }
    .kpi.tone-ok::before { background:var(--accent-2); }
    .kpi.tone-gold::before { background:var(--gold); }
    .kpi.tone-ink::before { background:var(--ink-soft); }
    .kpi-label { margin:0; font-size:11px; font-weight:750; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-soft); }
    .kpi-value { margin:8px 0 10px; font-family:Fraunces,Georgia,serif; font-weight:650; font-size:26px; letter-spacing:-.02em; }
    .kpi-foot { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .cap { font-size:11px; }
    .delta { display:inline-flex; align-items:center; gap:3px; font-size:11px; font-weight:800; padding:3px 7px; border-radius:999px; background:var(--paper-2); }
    .delta.up { color:var(--ok); background:color-mix(in srgb, var(--ok) 12%, transparent); }
    .delta.down { color:var(--danger); background:color-mix(in srgb, var(--danger) 12%, transparent); }

    .split { display:grid; grid-template-columns:1.6fr 1fr; gap:16px; margin-bottom:20px; }
    .split.wide-left { grid-template-columns:1.45fr 1fr; }
    .triple { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:16px; }
    @media (max-width: 1080px) { .split, .split.wide-left { grid-template-columns:1fr; } }

    .panel { padding:18px; }
    .panel-head { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; margin-bottom:14px; }
    .panel h2 { margin:0; font-size:17px; }
    .sub { margin:3px 0 0; font-size:12px; }
    .totals { text-align:right; }
    .big { display:block; font-family:Fraunces,serif; font-size:22px; font-weight:650; }
    .link { font-size:12px; font-weight:750; color:var(--accent); white-space:nowrap; }
    .empty-sm { padding:26px 4px; text-align:center; color:var(--ink-soft); font-size:13px; }

    .area { width:100%; height:220px; display:block; }
    .area .grid { stroke:var(--line); stroke-width:1; opacity:.45; }
    .area .dot { fill:var(--card); stroke:var(--accent); stroke-width:1.6; }
    .axis { display:flex; justify-content:space-between; font-size:11px; color:var(--ink-soft); margin-top:6px; }

    .donut-row { display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
    .donut { width:150px; height:150px; transform:rotate(-90deg); flex:0 0 auto; }
    .legend { list-style:none; margin:0; padding:0; flex:1; min-width:170px; display:grid; gap:9px; }
    .legend li { display:flex; align-items:center; gap:8px; font-size:12.5px; }
    .legend i { width:9px; height:9px; border-radius:3px; flex:0 0 auto; }
    .legend .nm { flex:1; }
    .legend .vl { font-weight:750; }
    .legend .pc { font-size:11px; width:34px; text-align:right; }

    .block { margin-bottom:20px; }
    .block-head { margin-bottom:12px; }
    .block-head h2 { margin:0; font-size:18px; }
    .dept-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(255px,1fr)); gap:14px; }
    .dept-skel { height:200px; }
    .dept { display:block; padding:16px; transition:transform .15s ease, box-shadow .15s ease; }
    .dept:hover { transform:translateY(-2px); box-shadow:0 16px 34px rgba(28,25,20,.12); }
    .dept-top { display:flex; gap:11px; align-items:flex-start; margin-bottom:13px; }
    .dept-icon { width:34px; height:34px; border-radius:10px; display:grid; place-items:center; color:#fff; flex:0 0 auto; }
    .dept-top strong { font-size:15px; }
    .dept-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(74px,1fr)); gap:10px; margin-bottom:12px; }
    .lbl { margin:0; font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
    .val { margin:3px 0 0; font-weight:750; font-size:15px; }
    .val.danger { color:var(--danger); }
    .goal-row { display:flex; justify-content:space-between; font-size:11.5px; font-weight:700; margin-bottom:5px; }
    .track { height:7px; border-radius:99px; background:var(--paper-2); overflow:hidden; }
    .fill { height:100%; background:var(--accent); border-radius:99px; }
    .dept-cta { display:inline-block; margin-top:12px; font-size:11.5px; font-weight:750; color:var(--accent); }

    .tbl { width:100%; border-collapse:collapse; font-size:13px; }
    .tbl th { text-align:left; font-size:10.5px; letter-spacing:.07em; text-transform:uppercase; color:var(--ink-soft); padding:0 8px 8px; border-bottom:1px solid var(--line); }
    .tbl td { padding:11px 8px; border-bottom:1px solid var(--line); vertical-align:middle; }
    .tbl tr:last-child td { border-bottom:0; }
    .tbl .r { text-align:right; }
    .tbl .strong { font-weight:750; }
    .pname { display:block; font-weight:650; }
    .sku { font-size:11px; }
    .share { width:62px; height:6px; border-radius:99px; background:var(--paper-2); margin-left:auto; overflow:hidden; }
    .share-fill { height:100%; background:var(--accent-2); }
    .xs { font-size:11px; }

    .chats { display:flex; flex-direction:column; }
    .badge { background:var(--accent); color:#fff; font-size:11px; font-weight:800; padding:4px 9px; border-radius:999px; }
    .badge.sm { padding:2px 7px; font-size:10px; }
    .thread-list { display:grid; gap:8px; flex:1; }
    .thread { border:1px solid var(--line); border-radius:13px; overflow:hidden; background:var(--card); }
    .thread.open { border-color:var(--accent); }
    .thread-head { width:100%; display:flex; align-items:center; gap:9px; padding:11px 12px; background:transparent; border:0; cursor:pointer; text-align:left; color:inherit; }
    .t-main { flex:1; display:flex; flex-direction:column; gap:2px; min-width:0; }
    .t-main strong { font-size:13px; }
    .t-main span, .t-main strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .chev { transition:transform .15s ease; }
    .thread.open .chev { transform:rotate(90deg); }
    .dotstat { width:8px; height:8px; border-radius:99px; background:var(--ink-soft); flex:0 0 auto; }
    .dotstat.active { background:var(--ok); }
    .dotstat.queued { background:var(--gold); }
    .dotstat.ended { background:var(--danger); }
    .bubbles { display:grid; gap:8px; padding:4px 12px 13px; }
    .bubble { padding:8px 11px; border-radius:12px; background:var(--paper-2); max-width:92%; }
    .bubble.mine { margin-left:auto; background:color-mix(in srgb, var(--accent) 12%, transparent); }
    .bubble .who { margin:0 0 3px; }
    .bubble .body { margin:0; font-size:12.5px; line-height:1.45; }
    .support-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:14px; padding-top:13px; border-top:1px solid var(--line); }

    .rows { list-style:none; margin:0; padding:0; display:grid; gap:2px; }
    .rows li { display:flex; align-items:center; gap:10px; padding:10px 2px; border-bottom:1px solid var(--line); font-size:13px; }
    .rows li:last-child { border-bottom:0; }
    .rows .ref { font-weight:700; }
    .rows .meta { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .rows .amt { font-weight:750; min-width:76px; text-align:right; }
    .rows.bars li, .rows.alerts li { display:block; }
    .rows.alerts li { display:flex; }
    .bar-head { display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px; }
    .rows.bars .track { margin-bottom:5px; }

    .pill.warn { background:color-mix(in srgb, var(--gold) 22%, transparent); color:var(--ink); }
    .pill.danger { background:color-mix(in srgb, var(--danger) 15%, transparent); color:var(--danger); }
    .pill.ok { background:color-mix(in srgb, var(--ok) 14%, transparent); color:var(--ok); }
    .pill.info { background:var(--paper-2); }
  `],
})
export class SellerDashboardComponent {
  private api = inject(ApiService);

  readonly ranges = [7, 30, 90];
  readonly skeletons = [1, 2, 3, 4, 5, 6, 7, 8];
  readonly gridLines = [0, 0.25, 0.5, 0.75, 1];

  data = signal<TenantDashboard | null>(null);
  departments = signal<DepartmentSummary[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  range = signal(30);
  expanded = signal<number | null>(null);

  trend = computed(() => this.data()?.sales_chart ?? []);
  periodTotal = computed(() => this.trend().reduce((s, p) => s + p.total, 0));
  periodOrders = computed(() => this.trend().reduce((s, p) => s + p.orders, 0));
  peak = computed(() => Math.max(0, ...this.trend().map((p) => p.total)));
  threads = computed<DashboardChatThread[]>(() => this.data()?.support?.threads ?? []);
  unread = computed(() => this.threads().reduce((s, t) => s + t.unread, 0));
  statusTotal = computed(() => (this.data()?.status_breakdown ?? []).reduce((s, x) => s + x.count, 0));

  tiles = computed<KpiTile[]>(() => {
    const k = this.data()?.kpis;
    if (!k) return [];
    const spec: [string, string, KpiTile['tone'], boolean][] = [
      ['revenue_today', 'Revenue today', 'accent', true],
      ['revenue_period', `Revenue (${this.range()}d)`, 'accent', true],
      ['orders_period', 'Orders', 'ok', true],
      ['avg_order_value', 'Avg order value', 'ok', true],
      ['units_sold', 'Units sold', 'gold', true],
      ['net_settlement', 'Net settlement', 'gold', true],
      ['open_orders', 'Open orders', 'ink', false],
      ['low_stock', 'Low stock', 'ink', false],
    ];
    return spec
      .filter(([key]) => !!k[key])
      .map(([key, label, tone, showDelta]) => ({ key, label, metric: k[key], tone, showDelta }));
  });

  constructor() {
    this.load();
  }

  setRange(days: number): void {
    if (this.range() === days) return;
    this.range.set(days);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      summary: this.api.sellerDashboard(this.range()).pipe(catchError(() => of(null))),
      departments: this.api.departmentOverview().pipe(catchError(() => of(null))),
    }).subscribe(({ summary, departments }) => {
      if (summary) this.data.set(summary.data);
      else this.error.set('Could not reach the tenant API. Showing the last known values.');
      if (departments) this.departments.set(departments.data.departments ?? []);
      this.loading.set(false);
    });
  }

  toggle(id: number): void {
    this.expanded.set(this.expanded() === id ? null : id);
  }

  // ----------------------------------------------------------- formatting

  greeting(): string {
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    return `${part} — here's your business`;
  }

  money(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: value >= 1000 ? 0 : 2,
    }).format(value || 0);
  }

  renderMetric(m: DashboardMetric): string {
    if (m.format === 'currency') return this.money(m.value);
    if (m.format === 'percent') return `${m.value}%`;
    return new Intl.NumberFormat('en-US').format(m.value);
  }

  kpi(k: { value: string; format: string }): string {
    if (k.format === 'currency') return this.money(Number(k.value));
    if (k.format === 'percent') return `${k.value}%`;
    return k.value;
  }

  absolute(n: number): number { return Math.abs(n); }
  clamp(n: number): number { return Math.max(0, Math.min(100, n || 0)); }
  pretty(s: string): string { return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }

  meta(key: string) {
    return DEPT_META[key] ?? { blurb: 'Department performance', icon: 'trend', color: 'var(--accent)' };
  }

  statusTone(status: string): string {
    if (['completed', 'delivered'].includes(status)) return 'ok';
    if (['cancelled', 'refunded'].includes(status)) return 'danger';
    if (['awaiting_fulfillment', 'processing'].includes(status)) return 'warn';
    return 'info';
  }

  // --------------------------------------------------------------- charts

  private points(): { x: number; y: number; day: string }[] {
    const pts = this.trend();
    const max = Math.max(...pts.map((p) => p.total), 1);
    return pts.map((p: DashboardTrendPoint, i: number) => ({
      day: p.day,
      x: pts.length === 1 ? 360 : (i / (pts.length - 1)) * 712 + 4,
      y: 210 - (p.total / max) * 196,
    }));
  }

  markers() {
    const pts = this.points();
    const step = Math.ceil(pts.length / 14) || 1;
    return pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
  }

  linePath(): string {
    const pts = this.points();
    if (!pts.length) return '';
    return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  areaPath(): string {
    const pts = this.points();
    if (!pts.length) return '';
    return `${this.linePath()} L${pts[pts.length - 1].x.toFixed(1)},214 L${pts[0].x.toFixed(1)},214 Z`;
  }

  donut() {
    const slices = this.data()?.status_breakdown ?? [];
    const palette = ['#c45c26', '#1f4b3a', '#3b6ea5', '#c9a227', '#8a5cb8', '#9b2c2c', '#4a453c'];
    const total = slices.reduce((s, x) => s + x.count, 0) || 1;
    const circ = 2 * Math.PI * 15.9;
    let cursor = 0;
    return slices.map((s, i) => {
      const len = (s.count / total) * circ;
      const offset = circ - cursor;
      cursor += len;
      return {
        label: s.label,
        count: s.count,
        percent: (s.count / total) * 100,
        color: palette[i % palette.length],
        dash: `${len.toFixed(3)} ${(circ - len).toFixed(3)}`,
        offset: offset.toFixed(3),
      };
    });
  }
}
