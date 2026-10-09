import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AdminReport, AnalyticsKpi } from '../../core/models';
import { CsvCell, toCsv } from '../../shared/csv.util';
import { MoneyPipe } from '../../shared/money.pipe';

type MetricKey = 'gmv' | 'commission' | 'orders';

const LABELS: Record<string, string> = {
  awaiting_fulfillment: 'Awaiting fulfillment',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  draft: 'Draft',
  pending_approval: 'Pending approval',
  paid: 'Paid',
  failed: 'Failed',
  active: 'Active',
  pending: 'Pending review',
  suspended: 'Suspended',
  rejected: 'Rejected',
};

const TONES: Record<string, string> = {
  awaiting_fulfillment: '#c98a2e',
  processing: '#385c8c',
  shipped: '#6b3f73',
  delivered: '#2f6b4f',
  completed: '#2f6b4f',
  cancelled: '#9b2c2c',
  refunded: '#9b2c2c',
  draft: '#8a8070',
  pending_approval: '#c98a2e',
  paid: '#2f6b4f',
  failed: '#9b2c2c',
  active: '#2f6b4f',
  pending: '#c98a2e',
  suspended: '#9b2c2c',
  rejected: '#8a8070',
};

@Component({
  selector: 'app-admin-reports',
  imports: [FormsModule, MoneyPipe, DecimalPipe, DatePipe, RouterLink],
  template: `
    <div class="reports-shell">
      <header class="page-head">
        <div>
          <div class="breadcrumbs"><a routerLink="/admin">Console</a><span>/</span><span>Reports</span></div>
          <p class="eyebrow">Platform reporting</p>
          <h1>Platform report</h1>
          <p class="intro">
            Marketplace-wide sales, seller performance, storefront funnel, subscriptions and payouts for the
            selected period. Narrow it to one tenant to audit a single seller.
          </p>
        </div>
        <div class="head-actions">
          <select class="toolbar-select" [(ngModel)]="tenantFilter" (change)="load()" aria-label="Filter by tenant">
            <option value="">All tenants</option>
            @for (t of report()?.tenant_options || []; track t.id) { <option [value]="t.id">{{ t.name }}</option> }
          </select>
          <select class="toolbar-select" [(ngModel)]="days" (change)="load()" aria-label="Reporting window">
            <option [ngValue]="7">Last 7 days</option>
            <option [ngValue]="30">Last 30 days</option>
            <option [ngValue]="90">Last 90 days</option>
            <option [ngValue]="365">Last 12 months</option>
          </select>
          <button class="btn ghost" type="button" (click)="exportCsv()" [disabled]="!report() || loading() || refreshing()" aria-label="Export platform report as CSV">⇩ Export CSV</button>
          <button class="btn primary" type="button" (click)="exportPdf()" [disabled]="!report() || loading() || refreshing()" title="Opens the print dialog. Choose Save as PDF to download a PDF report.">
            <span aria-hidden="true">⇩</span> Export PDF
          </button>
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading() || refreshing()">
            <span class="spin-icon" [class.spinning]="refreshing()">⟳</span> Refresh
          </button>
        </div>
      </header>

      @if (error()) {
        <div class="error-banner" role="alert"><span>!</span><p>{{ error() }}</p><button type="button" (click)="error.set('')">Dismiss</button></div>
      }

      @if (loading()) {
        <div class="skeletons">@for (i of [1, 2, 3, 4, 5, 6]; track i) { <div class="skeleton-row"></div> }</div>
      } @else if (report(); as r) {
        <section class="report-facts" aria-label="Report details">
          <div class="report-fact">
            <span>Prepared for</span>
            <strong>{{ auth.user()?.name || 'Super admin' }}</strong>
            <small>Platform console · all tenants unless scoped</small>
          </div>
          <div class="report-fact">
            <span>Reporting period</span>
            <strong>{{ r.range.start | date: 'mediumDate' }} – {{ r.range.end | date: 'mediumDate' }}</strong>
            <small>Compared with {{ r.range.previous_start | date: 'mediumDate' }} – {{ r.range.previous_end | date: 'mediumDate' }}</small>
          </div>
          <div class="report-fact">
            <span>Scope &amp; generated</span>
            <strong>{{ scopeName() }}</strong>
            <small>{{ generatedAt() | date: 'medium' }}</small>
          </div>
        </section>

        <section class="kpi-grid">
          <article class="metric-card value">
            <div class="metric-top"><span class="metric-icon gold">◈</span><span class="trend" [class.up]="r.kpis.gmv.direction === 'up'" [class.down]="r.kpis.gmv.direction === 'down'">{{ deltaChip(r.kpis.gmv) }}</span></div>
            <p>Gross merchandise value</p><h2>{{ r.kpis.gmv.value | money: '' : 'symbol' : '1.0-0' }}</h2>
            <small>Previous {{ r.kpis.gmv.previous | money: '' : 'symbol' : '1.0-0' }}</small>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon plum">%</span><span class="trend" [class.up]="r.kpis.commission.direction === 'up'" [class.down]="r.kpis.commission.direction === 'down'">{{ deltaChip(r.kpis.commission) }}</span></div>
            <p>Platform commission</p><h2>{{ r.kpis.commission.value | money }}</h2>
            <small>{{ takeRate() }}% take rate · {{ r.kpis.net.value | money }} to sellers</small>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon blue">▦</span><span class="trend" [class.up]="r.kpis.orders.direction === 'up'" [class.down]="r.kpis.orders.direction === 'down'">{{ deltaChip(r.kpis.orders) }}</span></div>
            <p>Seller orders</p><h2>{{ r.kpis.orders.value | number }}</h2>
            <small>AOV {{ r.kpis.aov.value | money }} · {{ r.kpis.units.value | number }} units</small>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon slate">⌂</span><span class="trend" [class.up]="r.kpis.active_tenants.direction === 'up'" [class.down]="r.kpis.active_tenants.direction === 'down'">{{ deltaChip(r.kpis.active_tenants) }}</span></div>
            <p>Active sellers</p><h2>{{ r.kpis.active_tenants.value | number }}</h2>
            <small>{{ r.kpis.new_tenants.value | number }} new seller(s) in this period</small>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon green">👥</span><span class="trend" [class.up]="r.kpis.buyers.direction === 'up'" [class.down]="r.kpis.buyers.direction === 'down'">{{ deltaChip(r.kpis.buyers) }}</span></div>
            <p>Buyers</p><h2>{{ r.kpis.buyers.value | number }}</h2>
            <small>{{ r.customers.repeat_rate | number: '1.0-1' }}% bought more than once</small>
          </article>
        </section>

        @if (r.highlights.length) {
          <section class="highlights">
            @for (h of r.highlights; track h.title) {
              <article [class]="'highlight ' + h.tone">
                <strong>{{ h.title }}</strong>
                <p>{{ h.detail }}</p>
              </article>
            }
          </section>
        }

        <section class="panel chart-panel">
          <div class="panel-head">
            <div><p class="overline">Trend</p><h3>{{ metricLabel() }} over time</h3></div>
            <div class="metric-switch" role="group" aria-label="Chart metric">
              @for (m of metricOptions; track m.key) {
                <button type="button" [class.on]="metric() === m.key" [attr.aria-pressed]="metric() === m.key" (click)="metric.set(m.key)">{{ m.label }}</button>
              }
            </div>
          </div>
          @if (!hasSeries()) {
            <div class="empty-state small">
              <span class="empty-glyph">📈</span>
              <h3>Nothing to plot yet</h3>
              <p>Once sellers start taking orders, this chart fills with the daily trend.</p>
            </div>
          } @else {
            <div class="chart">
              <svg viewBox="0 0 320 130" preserveAspectRatio="none" role="img" [attr.aria-label]="metricLabel() + ' trend'">
                <polygon [attr.points]="areaPoints()" fill="url(#adminReportsFade)" />
                <polyline [attr.points]="linePoints()" fill="none" stroke="var(--accent-2)" stroke-width="2.4" stroke-linejoin="round" />
                <defs>
                  <linearGradient id="adminReportsFade" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent-2)" stop-opacity="0.26" />
                    <stop offset="100%" stop-color="var(--accent-2)" stop-opacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              <div class="axis">
                <span>{{ r.series[0].day | date: 'MMM d' }}</span>
                <span>Peak {{ peakLabel() }}</span>
                <span>{{ r.series[r.series.length - 1].day | date: 'MMM d' }}</span>
              </div>
            </div>
          }
        </section>

        <div class="split">
          <section class="panel">
            <div class="panel-head"><div><p class="overline">Journey</p><h3>Storefront funnel</h3></div></div>
            <p class="scope-note">Product views and orders across the marketplace. Each seller order counts once.</p>
            <div class="funnel">
              @for (step of r.funnel.steps; track step.key) {
                <div class="funnel-step">
                  <div class="funnel-label"><span>{{ step.label }}</span><b>{{ step.value | number }}</b></div>
                  <div class="funnel-bar"><i [style.width.%]="step.rate"></i></div>
                  <small>{{ step.rate | number: '1.0-1' }}% of views</small>
                </div>
              }
              <p class="funnel-note">Cart abandonment <b>{{ r.funnel.cart_abandonment | number: '1.0-1' }}%</b></p>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head"><div><p class="overline">Fulfillment</p><h3>Seller order status</h3></div></div>
            @if (!r.status_mix.length) {
              <p class="muted pad">No seller orders in this window.</p>
            } @else {
              <div class="mix">
                @for (s of r.status_mix; track s.status) {
                  <div class="mix-row">
                    <span class="dot" [style.background]="statusTone(s.status)"></span>
                    <span class="mix-label">{{ statusLabel(s.status) }}</span>
                    <div class="mix-bar"><i [style.width.%]="sharePercent(s.count)" [style.background]="statusTone(s.status)"></i></div>
                    <b>{{ s.count | number }}</b>
                    <span class="muted">{{ s.gmv | money: '' : 'symbol' : '1.0-0' }}</span>
                  </div>
                }
              </div>
            }
          </section>
        </div>

        <section class="panel leaderboard">
          <div class="panel-head">
            <div><p class="overline">Sellers</p><h3>Tenant leaderboard</h3></div>
            <a routerLink="/admin/tenants">Manage tenants →</a>
          </div>
          @if (!r.tenants.length) {
            <p class="muted pad">No seller revenue in this window.</p>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Tenant</th><th class="right">Stores</th><th class="right">Orders</th>
                    <th>GMV &amp; share</th><th class="right">Commission</th><th class="right">Take rate</th><th class="right">Net to sellers</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of r.tenants; track t.id; let i = $index) {
                    <tr>
                      <td class="muted">{{ i + 1 }}</td>
                      <td>
                        <strong>{{ t.name }}</strong>
                        <span class="status-chip" [style.color]="statusTone(t.status)">{{ statusLabel(t.status) }}</span>
                      </td>
                      <td class="right">{{ t.stores | number }}</td>
                      <td class="right">{{ t.orders | number }}</td>
                      <td>
                        <div class="share-cell">
                          <strong>{{ t.gmv | money }}</strong>
                          <div class="mix-bar"><i [style.width.%]="t.share"></i></div>
                          <small class="muted">{{ t.share | number: '1.0-1' }}% of platform GMV</small>
                        </div>
                      </td>
                      <td class="right">{{ t.commission | money }}</td>
                      <td class="right">{{ t.take_rate | number: '1.0-2' }}%</td>
                      <td class="right"><strong>{{ t.net | money }}</strong></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <div class="split">
          <section class="panel">
            <div class="panel-head"><div><p class="overline">Catalog</p><h3>Best sellers across stores</h3></div><a routerLink="/admin/catalog">Open catalog →</a></div>
            @if (!r.top_products.length) {
              <p class="muted pad">No products sold in this window yet.</p>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Product</th><th>Seller</th><th class="right">Units</th><th class="right">Revenue</th></tr></thead>
                  <tbody>
                    @for (p of r.top_products; track p.tenant + p.name + p.sku) {
                      <tr>
                        <td><strong>{{ p.name }}</strong>@if (p.sku) { <small class="mono">{{ p.sku }}</small> }</td>
                        <td>{{ p.tenant }}</td>
                        <td class="right">{{ p.units | number }}</td>
                        <td class="right"><strong>{{ p.revenue | money }}</strong></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <section class="panel">
            <div class="panel-head"><div><p class="overline">Platform health</p><h3>Efficiency</h3></div></div>
            <div class="stat-grid">
              <div><p>Average order value</p><strong>{{ r.kpis.aov.value | money }}</strong></div>
              <div><p>Conversion</p><strong>{{ r.kpis.conversion.value | number: '1.0-2' }}%</strong></div>
              <div><p>Product views</p><strong>{{ r.kpis.views.value | number }}</strong></div>
              <div><p>Units sold</p><strong>{{ r.kpis.units.value | number }}</strong></div>
              <div><p>Net to sellers</p><strong>{{ r.kpis.net.value | money }}</strong></div>
              <div><p>New sellers</p><strong>{{ r.kpis.new_tenants.value | number }}</strong></div>
            </div>
          </section>
        </div>

        <div class="split">
          <section class="panel">
            <div class="panel-head"><div><p class="overline">Loyalty</p><h3>Customers</h3></div></div>
            <div class="stat-grid">
              <div><p>Buyers</p><strong>{{ r.customers.buyers | number }}</strong></div>
              <div><p>Repeat buyers</p><strong>{{ r.customers.repeat_buyers | number }}</strong></div>
              <div><p>Repeat rate</p><strong>{{ r.customers.repeat_rate | number: '1.0-1' }}%</strong></div>
              <div><p>Revenue per buyer</p><strong>{{ r.customers.revenue_per_buyer | money }}</strong></div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <div><p class="overline">Paid media</p><h3>Advertising</h3></div>
              <a routerLink="/admin/ads">Open ads →</a>
            </div>
            <div class="stat-grid">
              <div><p>Impressions</p><strong>{{ r.ads.impressions | number }}</strong></div>
              <div><p>Clicks</p><strong>{{ r.ads.clicks | number }}</strong></div>
              <div><p>CTR</p><strong>{{ r.ads.ctr | number: '1.0-2' }}%</strong></div>
              <div><p>Spend</p><strong>{{ r.ads.spend | money }}</strong></div>
              <div><p>Avg CPC</p><strong>{{ r.ads.avg_cpc | money: '' : 'symbol' : '1.2-4' }}</strong></div>
              <div><p>Spend ÷ GMV</p><strong>{{ adShare() }}%</strong></div>
            </div>
          </section>
        </div>

        <div class="split">
          <section class="panel">
            <div class="panel-head"><div><p class="overline">Recurring</p><h3>Subscriptions</h3></div><a routerLink="/admin/subscriptions">Plans & billing →</a></div>
            <div class="stat-grid">
              <div><p>MRR</p><strong>{{ r.billing.mrr | money }}</strong></div>
              <div><p>Active subscriptions</p><strong>{{ r.billing.active_subscriptions | number }}</strong></div>
              <div><p>Open invoices</p><strong>{{ r.billing.open_invoices | number }}</strong></div>
              <div><p>Open invoice value</p><strong>{{ r.billing.open_amount | money }}</strong></div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head"><div><p class="overline">Money out</p><h3>Payout pipeline</h3></div><a routerLink="/admin/payouts">Open payouts →</a></div>
            <div class="stat-grid">
              <div><p>Settlements on hold</p><strong>{{ r.payouts.on_hold.count | number }}</strong></div>
              <div><p>Held net amount</p><strong>{{ r.payouts.on_hold.net | money }}</strong></div>
            </div>
            @if (!r.payouts.by_status.length) {
              <p class="muted pad">No payout batches created in this window.</p>
            } @else {
              <div class="mix">
                @for (p of r.payouts.by_status; track p.status) {
                  <div class="mix-row">
                    <span class="dot" [style.background]="statusTone(p.status)"></span>
                    <span class="mix-label">{{ statusLabel(p.status) }}</span>
                    <span></span>
                    <b>{{ p.count | number }}</b>
                    <span class="muted">{{ p.net | money }}</span>
                  </div>
                }
              </div>
            }
          </section>
        </div>

        <section class="panel tenant-status">
          <div class="panel-head"><div><p class="overline">Directory</p><h3>Tenant status</h3></div><a routerLink="/admin/tenants">Review applications →</a></div>
          <div class="status-row">
            @for (s of r.tenant_status; track s.status) {
              <div class="status-tile">
                <span class="dot" [style.background]="statusTone(s.status)"></span>
                <span>{{ statusLabel(s.status) }}</span>
                <strong>{{ s.count | number }}</strong>
              </div>
            }
          </div>
        </section>

        <footer class="report-footer">
          <span>MarketHub platform report · Figures reflect the selected reporting window{{ r.scope.tenant_id ? ' and tenant scope' : ' across all tenants' }}.</span>
          <span>{{ scopeName() }} · {{ generatedAt() | date: 'mediumDate' }}</span>
        </footer>
      }
    </div>
  `,
})
export class AdminReportsComponent {
  private api = inject(ApiService);
  auth = inject(AuthService);

  generatedAt = signal<Date | null>(null);
  report = signal<AdminReport | null>(null);
  loading = signal(true);
  refreshing = signal(false);
  error = signal('');
  metric = signal<MetricKey>('gmv');

  readonly metricOptions: { key: MetricKey; label: string }[] = [
    { key: 'gmv', label: 'GMV' },
    { key: 'commission', label: 'Commission' },
    { key: 'orders', label: 'Orders' },
  ];

  days = 30;
  tenantFilter = '';

  series = computed(() => this.report()?.series ?? []);
  hasSeries = computed(() => this.series().some((d) => d.gmv > 0 || d.orders > 0 || d.views > 0));

  constructor() {
    this.load();
  }

  load(): void {
    this.error.set('');
    if (this.report()) this.refreshing.set(true);
    const params: Record<string, string | number> = { days: this.days };
    if (this.tenantFilter) params['tenant_id'] = this.tenantFilter;

    this.api
      .adminReports(params)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),
      )
      .subscribe({
        next: (res) => {
          this.report.set(res.data);
          this.generatedAt.set(new Date());
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'We could not load the platform report. Please try again.');
        },
      });
  }

  // ----------------------------------------------------------------- chart

  private values(): number[] {
    const key = this.metric();
    return this.series().map((d) => (key === 'gmv' ? d.gmv : key === 'commission' ? d.commission : d.orders));
  }

  linePoints(): string {
    const values = this.values();
    if (!values.length) return '';
    const max = Math.max(...values, 1);
    const step = values.length > 1 ? 320 / (values.length - 1) : 320;
    return values.map((v, i) => `${(i * step).toFixed(1)},${(124 - (v / max) * 112).toFixed(1)}`).join(' ');
  }

  areaPoints(): string {
    const line = this.linePoints();
    return line ? `0,130 ${line} 320,130` : '';
  }

  metricLabel(): string {
    return this.metricOptions.find((m) => m.key === this.metric())?.label ?? 'GMV';
  }

  peakLabel(): string {
    const values = this.values();
    if (!values.length) return '—';
    return Math.round(Math.max(...values)).toLocaleString('en-US');
  }

  // --------------------------------------------------------------- helpers

  scopeName(): string {
    const r = this.report();
    if (!r) return 'All tenants';
    return r.scope.tenant_name ?? 'All tenants';
  }

  /** "+12.4%" style chip text; the tone class is applied in the template. */
  deltaChip(kpi: AnalyticsKpi): string {
    const sign = kpi.delta_percent > 0 ? '+' : '';
    return `${sign}${kpi.delta_percent}%`;
  }

  takeRate(): string {
    const r = this.report();
    if (!r || !r.kpis.gmv.value) return '0.0';
    return ((r.kpis.commission.value / r.kpis.gmv.value) * 100).toFixed(1);
  }

  /** Ad spend as a share of GMV: how much paid media costs per unit of marketplace revenue. */
  adShare(): string {
    const r = this.report();
    if (!r || !r.kpis.gmv.value) return '0.00';
    return ((r.ads.spend / r.kpis.gmv.value) * 100).toFixed(2);
  }

  sharePercent(count: number): number {
    const total = (this.report()?.status_mix ?? []).reduce((sum, s) => sum + s.count, 0);
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  statusLabel(status: string): string {
    return LABELS[status] ?? status.replace(/_/g, ' ');
  }

  statusTone(status: string): string {
    return TONES[status] ?? '#8a8070';
  }

  /** Opens the browser print dialog; choose "Save as PDF" for a clean report file. */
  exportPdf(): void {
    const r = this.report();
    if (!r || typeof window === 'undefined') return;

    const previousTitle = document.title;
    document.title = `marketplace-report-${slug(this.scopeName())}-${r.range.start}-to-${r.range.end}`;
    window.addEventListener('afterprint', () => { document.title = previousTitle; }, { once: true });
    try {
      window.print();
    } catch {
      document.title = previousTitle;
    }
  }

  exportCsv(): void {
    const r = this.report();
    if (!r) return;

    const rows: CsvCell[][] = [
      ['Platform report', 'MarketHub super admin'],
      ['Scope', this.scopeName()],
      ['Reporting period', r.range.start, r.range.end],
      ['Comparison period', r.range.previous_start, r.range.previous_end],
      ['Generated at', this.generatedAt()?.toISOString() ?? new Date().toISOString()],
      [],
      ['Summary metrics'],
      ['Metric', 'Current period', 'Previous period', 'Change (%)'],
      ...Object.entries(r.kpis).map(([key, value]) => [key, value.value, value.previous, value.delta_percent]),
      [],
      ['Daily performance'],
      ['Day', 'GMV', 'Commission', 'Seller orders', 'Product views'],
      ...r.series.map((d) => [d.day, d.gmv, d.commission, d.orders, d.views]),
      [],
      ['Storefront funnel'],
      ['Step', 'Events', 'Rate (%)'],
      ...r.funnel.steps.map((step) => [step.label, step.value, step.rate]),
      ['Cart abandonment', '', r.funnel.cart_abandonment],
      [],
      ['Seller order status'],
      ['Status', 'Seller orders', 'GMV'],
      ...r.status_mix.map((s) => [this.statusLabel(s.status), s.count, s.gmv]),
      [],
      ['Tenant leaderboard'],
      ['Tenant', 'Status', 'Stores', 'Orders', 'GMV', 'Commission', 'Take rate (%)', 'Net to sellers', 'Share of GMV (%)'],
      ...r.tenants.map((t) => [t.name, this.statusLabel(t.status), t.stores, t.orders, t.gmv, t.commission, t.take_rate, t.net, t.share]),
      [],
      ['Best sellers'],
      ['Seller', 'Product', 'SKU', 'Units', 'Orders', 'Revenue'],
      ...r.top_products.map((p) => [p.tenant, p.name, p.sku ?? '', p.units, p.orders, p.revenue]),
      [],
      ['Customers'],
      ['Buyers', 'Repeat buyers', 'Repeat rate (%)', 'Revenue per buyer'],
      [r.customers.buyers, r.customers.repeat_buyers, r.customers.repeat_rate, r.customers.revenue_per_buyer],
      [],
      ['Advertising'],
      ['Impressions', 'Clicks', 'CTR (%)', 'Spend', 'Average CPC'],
      [r.ads.impressions, r.ads.clicks, r.ads.ctr, r.ads.spend, r.ads.avg_cpc],
      [],
      ['Subscriptions'],
      ['MRR', 'Active subscriptions', 'Open invoices', 'Open invoice value'],
      [r.billing.mrr, r.billing.active_subscriptions, r.billing.open_invoices, r.billing.open_amount],
      [],
      ['Payout pipeline'],
      ['Status', 'Batches', 'Net'],
      ...r.payouts.by_status.map((p) => [this.statusLabel(p.status), p.count, p.net]),
      ['Settlements on hold', r.payouts.on_hold.count, r.payouts.on_hold.net],
      [],
      ['Tenant status'],
      ['Status', 'Tenants'],
      ...r.tenant_status.map((t) => [this.statusLabel(t.status), t.count]),
    ];

    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `platform-report-${slug(this.scopeName())}-${r.range.start}-to-${r.range.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'all';
}
