import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AdminAnalytics, AdminInsight, AdminOverview, Kpi, SeriesPoint } from '../../core/models';
import { LineChartComponent } from '../../shared/charts.component';
import { MoneyPipe } from '../../shared/money.pipe';

type TrendMetric = 'revenue' | 'orders';
type FunnelKey = keyof AdminAnalytics['funnel'];

@Component({
  selector: 'app-admin-analytics',
  imports: [MoneyPipe, DatePipe, DecimalPipe, PercentPipe, RouterLink, LineChartComponent],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Intelligence center</p>
        <h1>Analytics & trends</h1>
        <p class="muted intro">Monitor marketplace performance, customer conversion, and the signals shaping growth.</p>
      </div>
      <div class="toolbar">
        <div class="range-picker" aria-label="Analytics date range">
          @for (range of ranges; track range.days) {
            <button type="button" [class.active]="days() === range.days" (click)="setRange(range.days)" [disabled]="refreshing()">
              {{ range.label }}
            </button>
          }
        </div>
        <button type="button" class="export-btn" (click)="exportCsv()" [disabled]="!overview()">
          <span aria-hidden="true">⇩</span> Export report
        </button>
      </div>
    </header>

    @if (refreshing()) {
      <div class="refresh-line" aria-label="Refreshing analytics"><span></span></div>
    }

    @if (error() && overview()) {
      <div class="warning"><span>!</span>{{ error() }} <button type="button" (click)="load()">Try again</button></div>
    }

    @if (loading()) {
      <div class="grid loading-kpis">
        @for (item of [1, 2, 3, 4]; track item) { <div class="skeleton" style="height: 148px"></div> }
      </div>
      <div class="grid loading-main">
        <div class="skeleton" style="height: 390px"></div>
        <div class="skeleton" style="height: 390px"></div>
      </div>
    } @else if (error() && !overview()) {
      <section class="card error-state">
        <span class="error-icon">!</span>
        <h2>Analytics are temporarily unavailable</h2>
        <p class="muted">We couldn't retrieve the latest platform data. Your data is safe—please try again.</p>
        <button type="button" class="retry" (click)="load()">Retry loading</button>
      </section>
    } @else if (overview(); as o) {
      @if (analytics(); as a) {
        <section class="insight-card" aria-label="Automated performance insight">
          <div class="insight-icon" aria-hidden="true">✦</div>
          <div class="insight-copy">
            <div class="insight-meta"><span>Performance brief</span><i></i><small>{{ periodLabel() }}</small></div>
            <p>{{ insightText() }}</p>
          </div>
          <div class="signal"><span></span> Data-backed insight</div>
        </section>

        <section class="grid kpi-grid" aria-label="Key performance indicators">
          @for (card of kpiCards(); track card.key) {
            <article class="card kpi-card" [style.--metric-color]="card.color">
              <div class="kpi-top">
                <span class="metric-icon" aria-hidden="true">{{ card.icon }}</span>
                <span class="delta" [class.up]="card.kpi.direction === 'up'" [class.down]="card.kpi.direction === 'down'">
                  {{ card.kpi.direction === 'up' ? '↗' : card.kpi.direction === 'down' ? '↘' : '→' }}
                  {{ abs(card.kpi.change) | number: '1.0-1' }}%
                </span>
              </div>
              <p class="metric-label">{{ card.label }}</p>
              @if (card.kpi.format === 'currency') {
                <h2>{{ card.kpi.value | money:'': 'symbol': '1.0-0' }}</h2>
              } @else {
                <h2>{{ card.kpi.value | number }}</h2>
              }
              <div class="kpi-foot">
                <span class="muted">vs previous {{ o.range.days }} days</span>
                @if (card.series.length) {
                  <svg viewBox="0 0 76 26" preserveAspectRatio="none" role="img" [attr.aria-label]="card.label + ' trend'">
                    <polyline [attr.points]="sparkline(card.series)" fill="none" stroke="var(--metric-color)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                }
              </div>
            </article>
          }
        </section>

        <section class="grid performance-grid">
          <article class="card panel trend-panel">
            <div class="panel-head">
              <div>
                <p class="section-kicker">Performance over time</p>
                <h2>Marketplace trajectory</h2>
              </div>
              <div class="metric-switch" aria-label="Chart metric">
                <button type="button" [class.active]="trendMetric() === 'revenue'" (click)="trendMetric.set('revenue')">Revenue</button>
                <button type="button" [class.active]="trendMetric() === 'orders'" (click)="trendMetric.set('orders')">Orders</button>
              </div>
            </div>
            <app-line-chart
              [points]="trendPoints()"
              [title]="trendTitle()"
              [subtitle]="trendSubtitle()"
              [prefix]="trendMetric() === 'revenue' ? '$' : ''"
              [color]="trendMetric() === 'revenue' ? '#c45c26' : '#1f4b3a'"
            />
            <div class="trend-facts">
              <div><span>Daily average</span><strong>{{ trendMetric() === 'revenue' ? (trendAverage() | money:'': 'symbol': '1.0-0') : (trendAverage() | number: '1.0-1') }}</strong></div>
              <div><span>Best day</span><strong>{{ trendBest()?.date | date: 'MMM d' }}</strong></div>
              <div><span>Peak value</span><strong>{{ trendMetric() === 'revenue' ? (trendBest()?.value | money:'': 'symbol': '1.0-0') : (trendBest()?.value | number) }}</strong></div>
            </div>
          </article>

          <aside class="snapshot-panel">
            <div>
              <p class="section-kicker light">Period snapshot</p>
              <h2>Commercial health</h2>
              <p class="snapshot-summary">{{ momentumText() }}</p>
            </div>
            <dl>
              <div>
                <dt>Average order value</dt>
                <dd>{{ averageOrderValue() | money:'': 'symbol': '1.0-2' }}</dd>
              </div>
              <div>
                <dt>Commission earned</dt>
                <dd>{{ kpiValue('commission') | money:'': 'symbol': '1.0-0' }}</dd>
              </div>
              <div>
                <dt>Platform take rate</dt>
                <dd>{{ takeRate() | percent: '1.1-1' }}</dd>
              </div>
              <div>
                <dt>View-to-paid conversion</dt>
                <dd>{{ paidConversion() | percent: '1.1-1' }}</dd>
              </div>
            </dl>
            <div class="snapshot-foot"><span></span>{{ a.orders | number }} seller orders analyzed</div>
          </aside>
        </section>

        <section class="card panel funnel-panel">
          <div class="panel-head">
            <div>
              <p class="section-kicker">Customer journey</p>
              <h2>Conversion funnel</h2>
              <p class="muted panel-subtitle">Tracked customer events across the selected period.</p>
            </div>
            <div class="conversion-total">
              <strong>{{ paidConversion() | percent: '1.1-1' }}</strong>
              <span>overall conversion</span>
            </div>
          </div>
          <div class="funnel-grid">
            @for (step of funnelSteps(); track step.key; let i = $index) {
              <div class="funnel-stage">
                <div class="stage-head">
                  <span><i>{{ i + 1 }}</i>{{ step.label }}</span>
                  <strong>{{ step.value | number }}</strong>
                </div>
                <div class="stage-track"><span [style.width.%]="step.width"></span></div>
                <div class="stage-foot">
                  <span>{{ i === 0 ? 'Journey entries' : (step.rate | percent: '1.1-1') + ' stage rate' }}</span>
                  @if (i > 0) { <span>{{ step.drop | percent: '1.1-1' }} drop-off</span> }
                </div>
              </div>
            }
          </div>
        </section>

        <section class="grid growth-grid">
          <article class="card panel">
            <div class="panel-head compact">
              <div><p class="section-kicker">Supply growth</p><h2>Tenant acquisition</h2></div>
              <span class="period-total">+{{ kpiValue('new_tenants') | number }} sellers</span>
            </div>
            <app-line-chart [points]="o.series.tenants" title="New tenant applications" [subtitle]="'Daily additions · ' + periodLabel()" color="#c9a227" />
          </article>
          <article class="card panel">
            <div class="panel-head compact">
              <div><p class="section-kicker">Audience growth</p><h2>User acquisition</h2></div>
              <span class="period-total green">+{{ kpiValue('new_users') | number }} users</span>
            </div>
            <app-line-chart [points]="o.series.users" title="New customer accounts" [subtitle]="'Daily additions · ' + periodLabel()" color="#2b6b8a" />
          </article>
        </section>

        <section class="grid bottom-grid">
          <article class="card panel tenant-panel">
            <div class="panel-head">
              <div>
                <p class="section-kicker">Seller performance</p>
                <h2>Top revenue contributors</h2>
              </div>
              <a routerLink="/admin/tenants">View all tenants <span>→</span></a>
            </div>
            @if (o.top_tenants.length) {
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Rank</th><th>Tenant</th><th>Orders</th><th>Revenue contribution</th><th>Commission</th></tr></thead>
                  <tbody>
                    @for (tenant of o.top_tenants; track tenant.tenant_id; let rank = $index) {
                      <tr>
                        <td><span class="rank">{{ rank + 1 }}</span></td>
                        <td><strong>{{ tenant.name }}</strong><small>Tenant #{{ tenant.tenant_id }}</small></td>
                        <td>{{ tenant.orders | number }}</td>
                        <td>
                          <div class="revenue-cell"><strong>{{ tenant.revenue | money:'': 'symbol': '1.0-0' }}</strong><span>{{ tenantShare(tenant.revenue) | percent: '1.0-1' }}</span></div>
                          <div class="revenue-track"><i [style.width.%]="tenantBar(tenant.revenue)"></i></div>
                        </td>
                        <td>{{ tenant.commission | money:'': 'symbol': '1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-table"><span>↗</span><p>No seller revenue was recorded in this period.</p></div>
            }
          </article>

          <aside class="card panel ad-panel">
            <div class="panel-head compact">
              <div><p class="section-kicker">Paid discovery</p><h2>Advertising efficiency</h2></div>
              <span class="status-dot">Live</span>
            </div>
            <div class="ad-hero">
              <div class="ad-ring" [style.--progress]="adCtrDegrees() + 'deg'">
                <div><strong>{{ a.ads.ctr | percent: '1.1-1' }}</strong><span>CTR</span></div>
              </div>
              <p><strong>{{ a.ads.clicks | number }}</strong> clicks from <strong>{{ a.ads.impressions | number }}</strong> impressions</p>
            </div>
            <div class="ad-stats">
              <div><span>Ad spend</span><strong>{{ +a.ads.spend | money:'': 'symbol': '1.0-2' }}</strong></div>
              <div><span>Cost per click</span><strong>{{ costPerClick() | money:'': 'symbol': '1.0-2' }}</strong></div>
              <div><span>Cost per 1k views</span><strong>{{ costPerMille() | money:'': 'symbol': '1.0-2' }}</strong></div>
            </div>
            <p class="ad-note"><span>i</span> Efficiency metrics use recorded campaign clicks and impressions for this period.</p>
          </aside>
        </section>

        <footer class="data-note">
          <span><i></i> Data refreshed {{ refreshedAt() | date: 'MMM d, y · HH:mm' }}</span>
          <span>Reporting window: {{ o.range.start | date: 'MMM d, y' }} – {{ o.range.end | date: 'MMM d, y' }}</span>
        </footer>
      }
    }
  `,
  styles: [`
    .section-kicker { margin:0 0 6px; color:var(--accent); font-size:10px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; }
    .snapshot-foot span,.data-note i { width:7px; height:7px; border-radius:50%; background:#45a675; box-shadow:0 0 0 4px rgba(69,166,117,.12); }
    .kpi-grid { grid-template-columns:repeat(4,minmax(0,1fr)); margin:18px 0; }.kpi-card { position:relative; overflow:hidden; padding:18px 19px 15px; box-shadow:0 8px 26px rgba(28,25,20,.055); }.kpi-card:before { content:''; position:absolute; inset:0 auto 0 0; width:3px; background:var(--metric-color); }.kpi-top,.kpi-foot { display:flex; align-items:center; justify-content:space-between; gap:12px; }.metric-icon { display:grid; place-items:center; width:32px; height:32px; border-radius:9px; background:color-mix(in srgb,var(--metric-color) 12%,transparent); color:var(--metric-color); font-size:15px; font-weight:800; }.delta { color:var(--ink-soft); font-size:11px; font-weight:800; }.delta.up { color:var(--ok); }.delta.down { color:var(--danger); }.metric-label { margin:14px 0 2px; color:var(--ink-soft); font-size:11px; font-weight:750; letter-spacing:.07em; text-transform:uppercase; }.kpi-card h2 { margin:0; font-size:26px; }.kpi-foot { min-height:28px; margin-top:8px; font-size:10px; }.kpi-foot svg { width:76px; height:26px; overflow:visible; }
    .performance-grid { grid-template-columns:minmax(0,1.9fr) minmax(280px,.75fr); margin-bottom:18px; }.panel { padding:21px; box-shadow:0 8px 28px rgba(28,25,20,.05); }.panel-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:16px; }.panel-head.compact { margin-bottom:8px; }.panel-head h2,.snapshot-panel h2 { margin:0; font-size:19px; }.panel-subtitle { margin:4px 0 0; font-size:12px; }.metric-switch { display:flex; gap:3px; padding:3px; border-radius:9px; background:var(--paper-2); }.metric-switch button { padding:6px 10px; }.trend-facts { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; padding-top:14px; margin-top:8px; border-top:1px solid var(--line); }.trend-facts div { display:flex; flex-direction:column; gap:3px; }.trend-facts span { color:var(--ink-soft); font-size:10px; text-transform:uppercase; letter-spacing:.08em; }.trend-facts strong { font-size:13px; }
    .snapshot-panel { display:flex; flex-direction:column; justify-content:space-between; padding:24px; border-radius:var(--radius); background:#203f35; color:#f7f2e8; box-shadow:0 12px 30px rgba(24,55,45,.2); }.section-kicker.light { color:#a8d1c2; }.snapshot-summary { min-height:48px; margin:10px 0 18px; color:#c9ddd5; font-size:13px; line-height:1.5; }.snapshot-panel dl { margin:0; }.snapshot-panel dl div { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:13px 0; border-top:1px solid rgba(255,255,255,.13); }.snapshot-panel dt { color:#b7ccc4; font-size:11px; }.snapshot-panel dd { margin:0; font-family:Fraunces,Georgia,serif; font-size:17px; font-weight:700; }.snapshot-foot { display:flex; align-items:center; gap:8px; margin-top:18px; color:#b7ccc4; font-size:10px; }.snapshot-foot span { background:#78d2a9; box-shadow:0 0 0 4px rgba(120,210,169,.13); }
    .funnel-panel { margin-bottom:18px; }.conversion-total { display:flex; flex-direction:column; align-items:flex-end; }.conversion-total strong { color:var(--accent); font:700 25px Fraunces,Georgia,serif; }.conversion-total span { color:var(--ink-soft); font-size:10px; text-transform:uppercase; letter-spacing:.08em; }.funnel-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }.funnel-stage { min-width:0; }.stage-head,.stage-foot { display:flex; align-items:center; justify-content:space-between; gap:8px; }.stage-head span { display:flex; align-items:center; gap:7px; font-size:12px; font-weight:700; }.stage-head i { display:grid; place-items:center; width:19px; height:19px; border-radius:6px; background:var(--paper-2); color:var(--ink-soft); font-size:9px; font-style:normal; }.stage-head strong { font:700 17px Fraunces,Georgia,serif; }.stage-track { height:9px; margin:11px 0 7px; overflow:hidden; border-radius:999px; background:var(--paper-2); }.stage-track span { display:block; height:100%; min-width:3px; border-radius:inherit; background:linear-gradient(90deg,var(--accent),#df8a58); }.funnel-stage:nth-child(2) .stage-track span { background:linear-gradient(90deg,#c99929,#e1bd61); }.funnel-stage:nth-child(3) .stage-track span { background:linear-gradient(90deg,#2b6b8a,#62a3c1); }.funnel-stage:nth-child(4) .stage-track span { background:linear-gradient(90deg,#1f6b51,#4cae87); }.stage-foot { color:var(--ink-soft); font-size:9px; }
    .growth-grid { grid-template-columns:repeat(2,minmax(0,1fr)); margin-bottom:18px; }.period-total { padding:6px 9px; border-radius:99px; background:color-mix(in srgb,var(--gold) 14%,transparent); color:#8a6a09; font-size:10px; font-weight:800; }.period-total.green { background:color-mix(in srgb,#2b6b8a 13%,transparent); color:#2b6b8a; }
    .bottom-grid { grid-template-columns:minmax(0,1.75fr) minmax(280px,.75fr); }.tenant-panel .panel-head a { color:var(--accent); font-size:11px; font-weight:750; }.tenant-panel .panel-head a span { margin-left:4px; }.table-wrap { overflow:auto; } table { width:100%; border-collapse:collapse; font-size:12px; } th { padding:0 12px 10px; color:var(--ink-soft); font-size:9px; letter-spacing:.08em; text-align:left; text-transform:uppercase; white-space:nowrap; } td { padding:12px; border-top:1px solid var(--line); vertical-align:middle; } th:first-child,td:first-child { padding-left:0; } td>small { display:block; margin-top:2px; color:var(--ink-soft); font-size:9px; }.rank { display:grid; place-items:center; width:23px; height:23px; border-radius:7px; background:var(--paper-2); font-size:10px; font-weight:800; }.revenue-cell { display:flex; justify-content:space-between; gap:8px; min-width:130px; }.revenue-cell span { color:var(--ink-soft); font-size:9px; }.revenue-track { height:3px; margin-top:5px; border-radius:99px; background:var(--paper-2); }.revenue-track i { display:block; height:100%; border-radius:inherit; background:var(--accent); }.empty-table { display:grid; place-items:center; padding:40px 20px; color:var(--ink-soft); text-align:center; }.empty-table>span { font-size:28px; }.empty-table p { margin:8px 0 0; }
    .status-dot { display:flex; align-items:center; gap:5px; color:var(--ok); font-size:10px; font-weight:800; }.status-dot:before { content:''; width:6px; height:6px; border-radius:50%; background:var(--ok); }.ad-hero { display:flex; align-items:center; gap:15px; padding:12px 0 20px; }.ad-ring { display:grid; place-items:center; flex:none; width:88px; height:88px; border-radius:50%; background:conic-gradient(var(--accent) min(var(--progress),360deg),var(--paper-2) 0); position:relative; }.ad-ring:before { content:''; position:absolute; inset:7px; border-radius:50%; background:var(--card); }.ad-ring div { z-index:1; text-align:center; }.ad-ring strong,.ad-ring span { display:block; }.ad-ring strong { font:700 16px Fraunces,Georgia,serif; }.ad-ring span { color:var(--ink-soft); font-size:8px; letter-spacing:.1em; }.ad-hero p { margin:0; color:var(--ink-soft); font-size:11px; line-height:1.55; }.ad-hero p strong { color:var(--ink); }.ad-stats { border-top:1px solid var(--line); }.ad-stats div { display:flex; justify-content:space-between; gap:12px; padding:11px 0; border-bottom:1px solid var(--line); font-size:11px; }.ad-stats span { color:var(--ink-soft); }
    .data-note { display:flex; justify-content:space-between; gap:12px; margin-top:14px; color:var(--ink-soft); font-size:9px; }.data-note span { display:flex; align-items:center; gap:7px; }
    @media (max-width:1150px) { .kpi-grid { grid-template-columns:repeat(2,1fr); }.performance-grid,.bottom-grid { grid-template-columns:1fr; }.snapshot-panel { min-height:360px; }.funnel-grid { grid-template-columns:repeat(2,1fr); row-gap:25px; }.loading-kpis { grid-template-columns:repeat(2,1fr); }.loading-main { grid-template-columns:1fr; } }
    @media (max-width:760px) { .page-head { align-items:flex-start; }.toolbar { width:100%; }.range-picker { flex:1; overflow:auto; }.range-picker button { flex:1; white-space:nowrap; }.export-btn { width:100%; justify-content:center; }.signal { display:none; }.insight-card { align-items:flex-start; }.kpi-grid,.growth-grid { grid-template-columns:1fr; }.funnel-grid { grid-template-columns:1fr; }.panel { padding:17px; }.panel-head { align-items:flex-start; flex-wrap:wrap; }.trend-facts { grid-template-columns:repeat(3,1fr); }.data-note { flex-direction:column; }.loading-kpis { grid-template-columns:1fr; } }
  `],
})
export class AdminAnalyticsComponent {
  private readonly api = inject(ApiService);
  private requestVersion = 0;

  readonly ranges = [
    { days: 7, label: '7D' },
    { days: 30, label: '30D' },
    { days: 90, label: '90D' },
    { days: 365, label: '1Y' },
  ];

  overview = signal<AdminOverview | null>(null);
  analytics = signal<AdminAnalytics | null>(null);
  insight = signal<AdminInsight | null>(null);
  days = signal(30);
  trendMetric = signal<TrendMetric>('revenue');
  loading = signal(true);
  refreshing = signal(false);
  error = signal('');
  refreshedAt = signal(new Date());

  periodLabel = computed(() => `Last ${this.days()} days`);

  kpiCards = computed(() => {
    const overview = this.overview();
    if (!overview) return [];
    const cards: { key: string; label: string; icon: string; color: string; kpi: Kpi; series: SeriesPoint[] }[] = [
      { key: 'gmv', label: 'Gross merchandise value', icon: '$', color: '#c45c26', kpi: overview.kpis['gmv'], series: overview.series.revenue },
      { key: 'orders', label: 'Orders processed', icon: '▤', color: '#1f4b3a', kpi: overview.kpis['orders'], series: overview.series.orders },
      { key: 'mrr', label: 'Monthly recurring revenue', icon: '↻', color: '#6b4f8a', kpi: overview.kpis['mrr'], series: [] },
      { key: 'new_tenants', label: 'New tenant applications', icon: '+', color: '#c9a227', kpi: overview.kpis['new_tenants'], series: overview.series.tenants },
    ];
    return cards.filter((card) => !!card.kpi);
  });

  trendPoints = computed(() => {
    const overview = this.overview();
    if (!overview) return [];
    return this.trendMetric() === 'revenue' ? overview.series.revenue : overview.series.orders;
  });

  trendTitle = computed(() => this.trendMetric() === 'revenue' ? 'Gross merchandise value' : 'Order volume');

  trendSubtitle = computed(() => {
    const range = this.overview()?.range;
    if (!range) return this.periodLabel();
    return `Daily performance · ${range.start} to ${range.end}`;
  });

  trendAverage = computed(() => {
    const points = this.trendPoints();
    return points.length ? points.reduce((sum, point) => sum + Number(point.value || 0), 0) / points.length : 0;
  });

  trendBest = computed(() => {
    const points = this.trendPoints();
    return points.length ? points.reduce((best, point) => Number(point.value) > Number(best.value) ? point : best) : null;
  });

  funnelSteps = computed(() => {
    const funnel = this.analytics()?.funnel;
    if (!funnel) return [];
    const definitions: { key: FunnelKey; label: string }[] = [
      { key: 'views', label: 'Product views' },
      { key: 'carts', label: 'Added to cart' },
      { key: 'checkouts', label: 'Checkout started' },
      { key: 'paid', label: 'Paid orders' },
    ];
    const max = Math.max(1, ...definitions.map((item) => Number(funnel[item.key] || 0)));
    return definitions.map((item, index) => {
      const value = Number(funnel[item.key] || 0);
      const previous = index ? Number(funnel[definitions[index - 1].key] || 0) : value;
      const rate = index === 0 ? 1 : (previous ? value / previous : 0);
      return {
        ...item,
        value,
        width: Math.max(value ? 2 : 0, Math.min(100, (value / max) * 100)),
        rate,
        drop: Math.max(0, 1 - rate),
      };
    });
  });

  insightText = computed(() => {
    const insight = this.insight();
    const supplied = insight?.payload?.narrative || insight?.narrative || insight?.summary;
    if (supplied) return supplied;

    const gmv = this.overview()?.kpis['gmv'];
    const orders = this.overview()?.kpis['orders'];
    if (!gmv || !orders) return 'Performance signals will appear as marketplace activity is recorded.';
    const direction = gmv.direction === 'up' ? 'grew' : gmv.direction === 'down' ? 'declined' : 'held steady';
    return `Marketplace GMV ${direction} ${Math.abs(gmv.change).toFixed(1)}% versus the prior period, with ${orders.value.toLocaleString()} orders processed. ${this.momentumRecommendation()}`;
  });

  averageOrderValue = computed(() => {
    const gmv = this.kpiValue('gmv');
    const orders = this.kpiValue('orders');
    return orders ? gmv / orders : 0;
  });

  takeRate = computed(() => Number(this.analytics()?.take_rate || 0) / 100);
  paidConversion = computed(() => this.rate(this.analytics()?.funnel.paid, this.analytics()?.funnel.views));
  costPerClick = computed(() => this.rate(Number(this.analytics()?.ads.spend || 0), this.analytics()?.ads.clicks));
  costPerMille = computed(() => this.rate(Number(this.analytics()?.ads.spend || 0) * 1000, this.analytics()?.ads.impressions));

  momentumText = computed(() => {
    const gmv = this.overview()?.kpis['gmv'];
    if (!gmv) return 'No commercial trend is available yet.';
    if (gmv.direction === 'up') return `GMV is gaining momentum, up ${Math.abs(gmv.change).toFixed(1)}% against the previous window.`;
    if (gmv.direction === 'down') return `GMV is ${Math.abs(gmv.change).toFixed(1)}% below the previous window; review funnel drop-off and seller mix.`;
    return 'GMV is stable against the previous window. Acquisition and conversion are holding pace.';
  });

  constructor() {
    this.load();
  }

  setRange(days: number) {
    if (days === this.days()) return;
    this.days.set(days);
    this.load();
  }

  load() {
    const version = ++this.requestVersion;
    const hasData = !!this.overview();
    this.loading.set(!hasData);
    this.refreshing.set(hasData);
    this.error.set('');

    forkJoin({
      overview: this.api.adminOverview(this.days()),
      analytics: this.api.adminAnalytics(this.days()),
    }).subscribe({
      next: ({ overview, analytics }) => {
        if (version !== this.requestVersion) return;
        this.overview.set(overview.data);
        this.analytics.set(analytics.data);
        this.refreshedAt.set(new Date());
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: () => {
        if (version !== this.requestVersion) return;
        this.error.set('The latest analytics could not be loaded.');
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });

    this.api.adminInsights(this.days()).subscribe({
      next: (response) => {
        if (version === this.requestVersion) this.insight.set(response.data);
      },
      error: () => {
        if (version === this.requestVersion) this.insight.set(null);
      },
    });
  }

  kpiValue(key: string): number {
    return Number(this.overview()?.kpis[key]?.value || 0);
  }

  abs(value: number): number {
    return Math.abs(Number(value || 0));
  }

  sparkline(points: SeriesPoint[]): string {
    if (!points.length) return '';
    const values = points.map((point) => Number(point.value || 0));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min || 1;
    return values.map((value, index) => {
      const x = points.length === 1 ? 38 : (index / (points.length - 1)) * 74 + 1;
      const y = 24 - ((value - min) / spread) * 20;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  tenantBar(revenue: number): number {
    const max = Math.max(1, ...(this.overview()?.top_tenants ?? []).map((tenant) => Number(tenant.revenue)));
    return Math.max(2, (Number(revenue) / max) * 100);
  }

  tenantShare(revenue: number): number {
    return this.rate(Number(revenue), this.kpiValue('gmv'));
  }

  adCtrDegrees(): number {
    return Math.max(0, Math.min(360, Number(this.analytics()?.ads.ctr || 0) * 360));
  }

  exportCsv() {
    const overview = this.overview();
    if (!overview) return;

    const rows: (string | number)[][] = [
      ['MarketHub analytics report', this.periodLabel()],
      ['Reporting window', `${overview.range.start} to ${overview.range.end}`],
      [],
      ['Metric', 'Current', 'Previous', 'Change %'],
      ...['gmv', 'orders', 'mrr', 'commission', 'new_tenants', 'new_users'].map((key) => {
        const kpi = overview.kpis[key];
        return [key, kpi?.value ?? 0, kpi?.previous ?? 0, kpi?.change ?? 0];
      }),
      [],
      ['Date', 'GMV', 'Orders', 'New tenants', 'New users'],
      ...overview.series.revenue.map((point, index) => [
        point.date,
        point.value,
        overview.series.orders[index]?.value ?? 0,
        overview.series.tenants[index]?.value ?? 0,
        overview.series.users[index]?.value ?? 0,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `markethub-analytics-${this.days()}d-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private rate(numerator: number | undefined, denominator: number | undefined): number {
    const top = Number(numerator || 0);
    const bottom = Number(denominator || 0);
    return bottom ? top / bottom : 0;
  }

  private momentumRecommendation(): string {
    const conversion = this.paidConversion();
    if (conversion === 0) return 'Track more funnel events to unlock conversion analysis.';
    if (conversion < 0.02) return 'The largest opportunity is improving progression from product views to paid orders.';
    return 'Conversion is producing paid demand; continue monitoring cart and checkout progression.';
  }
}
