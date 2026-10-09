import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, map, of, switchMap, tap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AnalyticsKpi, TenantAnalyticsReport } from '../../core/models';
import { toCsv } from '../../shared/csv.util';
import { MoneyPipe } from '../../shared/money.pipe';

type MetricKey = 'gmv' | 'orders' | 'views';

type LoadResult = { report: TenantAnalyticsReport; store: string; days: number } | { message: string };

const STATUS_LABELS: Record<string, string> = {
  awaiting_fulfillment: 'Awaiting fulfillment',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const STATUS_TONES: Record<string, string> = {
  awaiting_fulfillment: '#c98a2e',
  processing: '#385c8c',
  shipped: '#6b3f73',
  delivered: '#2f6b4f',
  completed: '#2f6b4f',
  cancelled: '#9b2c2c',
  refunded: '#9b2c2c',
};

@Component({
  selector: 'app-seller-analytics',
  imports: [FormsModule, MoneyPipe, DecimalPipe, DatePipe, RouterLink],
  template: `
    <div class="analytics-shell">
      <header class="page-head">
        <div>
          <div class="breadcrumbs"><a routerLink="/tenant">Workspace</a><span>/</span><span>Reports</span></div>
          <p class="eyebrow">Tenant reporting</p>
          <h1>Full tenant report</h1>
          <p class="intro">
            A complete view of sales, customers, products, stores, fulfilment and advertising,
            based on this tenant's live marketplace data for the selected period.
          </p>
        </div>
        @if (canView()) {
        <div class="head-actions">
          <select class="toolbar-select" [(ngModel)]="storeFilter" (change)="load()" aria-label="Filter by store">
            <option value="">All stores</option>
            @for (s of storeOptions(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
          </select>
          <select class="toolbar-select" [(ngModel)]="days" (change)="load()" aria-label="Reporting window">
            <option [ngValue]="7">Last 7 days</option>
            <option [ngValue]="30">Last 30 days</option>
            <option [ngValue]="90">Last 90 days</option>
            <option [ngValue]="365">Last 12 months</option>
          </select>
          <button class="btn ghost" type="button" (click)="exportCsv()" [disabled]="!report() || loading() || refreshing()" aria-label="Export report data as CSV">⇩ Export CSV</button>
          <button class="btn primary" type="button" (click)="exportPdf()" [disabled]="!report() || loading() || refreshing()" title="Opens the print dialog. Choose Save as PDF to download a PDF report.">
            <span aria-hidden="true">⇩</span> Export PDF
          </button>
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading() || refreshing()">
            <span class="spin-icon" [class.spinning]="refreshing()">⟳</span> Refresh
          </button>
        </div>
        }
      </header>

      @if (error()) {
        <div class="error-banner"><span>!</span><p>{{ error() }}</p><button type="button" (click)="error.set('')">Dismiss</button></div>
      }

      @if (!canView()) {
        <section class="panel">
          <div class="empty-state small">
            <span class="empty-glyph">🔒</span>
            <h3>Reports are not available to your account</h3>
            <p>Ask a workspace owner to grant the View analytics permission under Users &amp; permissions.</p>
          </div>
        </section>
      } @else if (loading()) {
        <div class="skeletons">@for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton-row"></div> }</div>
      } @else if (report(); as r) {
        <section class="report-facts" aria-label="Report details">
          <div class="report-fact">
            <span>Prepared for</span>
            <strong>{{ tenantName() }}</strong>
            <small>@if (tenantId()) { Tenant ID #{{ tenantId() }} } @else { Tenant workspace }</small>
          </div>
          <div class="report-fact">
            <span>Reporting period</span>
            <strong>{{ r.range.start | date:'mediumDate' }} – {{ r.range.end | date:'mediumDate' }}</strong>
            <small>Compared with {{ r.range.previous_start | date:'mediumDate' }} – {{ r.range.previous_end | date:'mediumDate' }}</small>
          </div>
          <div class="report-fact">
            <span>Scope &amp; generated</span>
            <strong>{{ selectedStoreName() }}</strong>
            <small>{{ generatedAt() | date:'medium' }}</small>
          </div>
        </section>

        <section class="kpi-grid">
          <article class="metric-card value">
            <div class="metric-top"><span class="metric-icon gold">◈</span><span class="trend" [class.up]="r.kpis.gmv.direction === 'up'" [class.down]="r.kpis.gmv.direction === 'down'">{{ deltaChip(r.kpis.gmv) }}</span></div>
            <p>Revenue</p><h2>{{ r.kpis.gmv.value | money:currencyCode():'symbol':'1.0-0' }}</h2>
            <small>Previous {{ r.kpis.gmv.previous | money:currencyCode():'symbol':'1.0-0' }}</small>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon blue">▦</span><span class="trend" [class.up]="r.kpis.orders.direction === 'up'" [class.down]="r.kpis.orders.direction === 'down'">{{ deltaChip(r.kpis.orders) }}</span></div>
            <p>Orders</p><h2>{{ r.kpis.orders.value | number }}</h2>
            <small>{{ r.kpis.units.value | number }} units sold</small>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon slate">⌀</span><span class="trend" [class.up]="r.kpis.aov.direction === 'up'" [class.down]="r.kpis.aov.direction === 'down'">{{ deltaChip(r.kpis.aov) }}</span></div>
            <p>Average order value</p><h2>{{ r.kpis.aov.value | money:currencyCode() }}</h2>
            <small>Previous {{ r.kpis.aov.previous | money:currencyCode() }}</small>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon plum">👥</span><span class="trend" [class.up]="r.kpis.customers.direction === 'up'" [class.down]="r.kpis.customers.direction === 'down'">{{ deltaChip(r.kpis.customers) }}</span></div>
            <p>Buyers</p><h2>{{ r.kpis.customers.value | number }}</h2>
            <small>{{ r.customers.repeat_rate | number:'1.0-1' }}% bought more than once</small>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon green">↗</span><span class="trend" [class.up]="r.kpis.conversion.direction === 'up'" [class.down]="r.kpis.conversion.direction === 'down'">{{ deltaChip(r.kpis.conversion) }}</span></div>
            <p>Conversion</p><h2>{{ r.kpis.conversion.value | number:'1.0-2' }}%</h2>
            <small>{{ r.kpis.views.value | number }} product views</small>
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
              <p>Once orders and storefront visits come in, this chart fills with your daily trend.</p>
            </div>
          } @else {
            <div class="chart">
              <svg viewBox="0 0 320 130" preserveAspectRatio="none" role="img" [attr.aria-label]="metricLabel() + ' trend'">
                <polygon [attr.points]="areaPoints()" fill="url(#analyticsFade)" />
                <polyline [attr.points]="linePoints()" fill="none" stroke="var(--accent-2)" stroke-width="2.4" stroke-linejoin="round" />
                <defs>
                  <linearGradient id="analyticsFade" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent-2)" stop-opacity="0.26" />
                    <stop offset="100%" stop-color="var(--accent-2)" stop-opacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              <div class="axis">
                <span>{{ r.series[0].day | date:'MMM d' }}</span>
                <span>Peak {{ peakLabel() }}</span>
                <span>{{ r.series[r.series.length - 1].day | date:'MMM d' }}</span>
              </div>
            </div>
          }
        </section>

        <div class="split">
          <section class="panel">
            <div class="panel-head"><div><p class="overline">Journey</p><h3>Conversion funnel</h3></div></div>
            @if (isTenantWide('funnel')) {
              <p class="scope-note">Funnel events are not recorded per store, so these figures cover all stores.</p>
            }
            <div class="funnel">
              @for (step of r.funnel.steps; track step.key) {
                <div class="funnel-step">
                  <div class="funnel-label"><span>{{ step.label }}</span><b>{{ step.value | number }}</b></div>
                  <div class="funnel-bar"><i [style.width.%]="step.rate"></i></div>
                  <small>{{ step.rate | number:'1.0-1' }}% of views</small>
                </div>
              }
              <p class="funnel-note">Cart abandonment <b>{{ r.funnel.cart_abandonment | number:'1.0-1' }}%</b></p>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head"><div><p class="overline">Fulfillment</p><h3>Order status mix</h3></div></div>
            @if (!r.status_mix.length) {
              <p class="muted pad">No orders in this window.</p>
            } @else {
              <div class="mix">
                @for (s of r.status_mix; track s.status) {
                  <div class="mix-row">
                    <span class="dot" [style.background]="statusTone(s.status)"></span>
                    <span class="mix-label">{{ statusLabel(s.status) }}</span>
                    <div class="mix-bar"><i [style.width.%]="sharePercent(s.count)" [style.background]="statusTone(s.status)"></i></div>
                    <b>{{ s.count }}</b>
                    <span class="muted">{{ s.gmv | money:currencyCode():'symbol':'1.0-0' }}</span>
                  </div>
                }
              </div>
            }
          </section>
        </div>

        <div class="split">
          <section class="panel">
            <div class="panel-head">
              <div><p class="overline">Catalog</p><h3>Best sellers</h3></div>
              <a routerLink="/tenant/products">Open catalog →</a>
            </div>
            @if (!r.top_products.length) {
              <p class="muted pad">No products sold in this window yet.</p>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Product</th><th class="right">Units</th><th class="right">Orders</th><th class="right">Revenue</th></tr></thead>
                  <tbody>
                    @for (p of r.top_products; track p.name + p.sku) {
                      <tr>
                        <td><strong>{{ p.name }}</strong>@if (p.sku) { <small class="mono">{{ p.sku }}</small> }</td>
                        <td class="right">{{ p.units | number }}</td>
                        <td class="right">{{ p.orders | number }}</td>
                        <td class="right"><strong>{{ p.revenue | money:currencyCode() }}</strong></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <section class="panel">
            <div class="panel-head"><div><p class="overline">Channels</p><h3>Store performance</h3></div></div>
            @if (appliedStore) {
              <p class="scope-note">This table is not filtered. It lists every store with sales in the window.</p>
            }
            @if (!r.stores.length) {
              <p class="muted pad">No store revenue in this window.</p>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Store</th><th class="right">Orders</th><th class="right">Revenue</th><th class="right">Net payout</th></tr></thead>
                  <tbody>
                    @for (s of r.stores; track s.id) {
                      <tr>
                        <td><strong>{{ s.name }}</strong></td>
                        <td class="right">{{ s.orders | number }}</td>
                        <td class="right">{{ s.gmv | money:currencyCode() }}</td>
                        <td class="right"><strong>{{ s.net | money:currencyCode() }}</strong></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        </div>

        <div class="split">
          <section class="panel">
            <div class="panel-head">
              <div><p class="overline">Paid media</p><h3>Advertising</h3></div>
              <a routerLink="/tenant/ads">Manage ads →</a>
            </div>
            @if (isTenantWide('ads')) {
              <p class="scope-note">Campaigns are not tied to a store, so ad figures cover all stores.</p>
            }
            <div class="stat-grid">
              <div><p>Impressions</p><strong>{{ r.ads.impressions | number }}</strong></div>
              <div><p>Clicks</p><strong>{{ r.ads.clicks | number }}</strong></div>
              <div><p>CTR</p><strong>{{ r.ads.ctr | number:'1.0-2' }}%</strong></div>
              <div><p>Spend</p><strong>{{ r.ads.spend | money:currencyCode() }}</strong></div>
              <div><p>Avg CPC</p><strong>{{ r.ads.avg_cpc | money:currencyCode():'symbol':'1.2-4' }}</strong></div>
              <div [attr.title]="isTenantWide('ads') ? 'Ad spend covers every store, so it is not divided by one store\u2019s revenue.' : null"><p>Ad spend ÷ revenue</p><strong>{{ adShareLabel() }}</strong></div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head"><div><p class="overline">Loyalty</p><h3>Customers</h3></div></div>
            <div class="stat-grid">
              <div><p>Buyers</p><strong>{{ r.customers.buyers | number }}</strong></div>
              <div><p>Repeat buyers</p><strong>{{ r.customers.repeat_buyers | number }}</strong></div>
              <div><p>Repeat rate</p><strong>{{ r.customers.repeat_rate | number:'1.0-1' }}%</strong></div>
              <div><p>Revenue per buyer</p><strong>{{ r.customers.revenue_per_buyer | money:currencyCode() }}</strong></div>
              <div><p>Commission</p><strong>{{ r.kpis.commission.value | money:currencyCode() }}</strong></div>
              <div><p>Net settlement</p><strong>{{ r.kpis.net.value | money:currencyCode() }}</strong></div>
            </div>
          </section>
        </div>

        @if (report()?.lifetime; as lifetime) {
          <p class="lifetime-note">
            All time: <b>{{ +lifetime.gmv | money:currencyCode() }}</b> revenue across {{ lifetime.orders }} orders ·
            commission {{ +lifetime.commission | money:currencyCode() }} ({{ lifetime.take_rate }}% take rate).
          </p>
        }

        <footer class="report-footer">
          <span>MarketHub tenant report · Figures reflect the selected reporting window and store scope.</span>
          <span>{{ tenantName() }} · {{ generatedAt() | date:'mediumDate' }}</span>
        </footer>
      }
    </div>
  `,
})
export class SellerAnalyticsComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  tenantName = computed(() => this.auth.user()?.tenant_name?.trim() || this.auth.user()?.name || 'Tenant workspace');
  tenantId = computed(() => this.auth.user()?.tenant_id ?? null);
  generatedAt = signal<Date | null>(null);

  /** Owners always see the report; staff need analytics.view. The API enforces the same rule. */
  canView = computed(() => {
    const user = this.auth.user();
    return user?.role === 'tenant_owner' || (user?.permissions ?? []).includes('analytics.view');
  });

  /** Denomination of every money figure on the page. Empty until a report loads (the pipe then uses the display currency). */
  currencyCode(): string {
    return this.report()?.currency ?? '';
  }

  readonly metricOptions: { key: MetricKey; label: string }[] = [
    { key: 'gmv', label: 'Revenue' },
    { key: 'orders', label: 'Orders' },
    { key: 'views', label: 'Views' },
  ];

  report = signal<TenantAnalyticsReport | null>(null);
  loading = signal(true);
  refreshing = signal(false);
  error = signal('');
  metric = signal<MetricKey>('gmv');

  days = 30;
  storeFilter = '';

  /** Store and window the visible report was built from; the selects revert to these on failure. */
  private appliedStore = '';
  private appliedDays = 30;
  private reload$ = new Subject<void>();

  /** Every store of the tenant, or null when the list could not be loaded. */
  private storeList = signal<{ id: number; name: string }[] | null>(null);
  storeOptions = computed(
    () => this.storeList() ?? (this.report()?.stores ?? []).map((s) => ({ id: s.id, name: s.name })),
  );

  series = computed(() => this.report()?.series ?? []);
  hasSeries = computed(() => this.series().some((d) => d.gmv > 0 || d.orders > 0 || d.views > 0));

  constructor() {
    // Each request supersedes the one before it, so a slow response for an
    // older store or window can never overwrite the current selection.
    this.reload$
      .pipe(
        tap(() => {
          this.error.set('');
          if (this.report()) this.refreshing.set(true);
        }),
        switchMap(() => {
          const store = this.storeFilter;
          const days = this.days;
          const params: Record<string, string | number> = { days };
          if (store) params['store_id'] = store;
          return this.api.sellerAnalytics(params).pipe(
            map((res): LoadResult => ({ report: res.data, store, days })),
            catchError((err) =>
              of<LoadResult>({
                message: err?.error?.message || 'We could not load your tenant report. Please try again.',
              }),
            ),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.loading.set(false);
        this.refreshing.set(false);
        if ('report' in result) {
          this.report.set(result.report);
          this.generatedAt.set(new Date());
          this.appliedStore = result.store;
          this.appliedDays = result.days;
          return;
        }
        // Put the selects back to what the visible data was built from.
        this.error.set(result.message);
        this.storeFilter = this.appliedStore;
        this.days = this.appliedDays;
      });

    if (this.canView()) this.api
      .sellerStores()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (res) => this.storeList.set((res.data ?? []).map((s) => ({ id: Number(s.id), name: String(s.name ?? `Store #${s.id}`) }))),
        // Keep the fallback: the stores that appear in the report.
        error: () => this.storeList.set(null),
      });

    this.load();
  }

  load(): void {
    if (!this.canView()) return;
    this.reload$.next();
  }

  // ----------------------------------------------------------------- chart

  private values(): number[] {
    const key = this.metric();
    return this.series().map((d) => (key === 'gmv' ? d.gmv : key === 'orders' ? d.orders : d.views));
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
    if (!line) return '';
    return `0,130 ${line} 320,130`;
  }

  metricLabel(): string {
    return this.metricOptions.find((m) => m.key === this.metric())?.label ?? 'Revenue';
  }

  /** Name of the store the visible figures belong to (not the dropdown, which may be mid-change). */
  selectedStoreName(): string {
    if (!this.appliedStore) return 'All stores';
    return this.storeOptions().find((store) => store.id === Number(this.appliedStore))?.name ?? 'Selected store';
  }

  peakLabel(): string {
    const values = this.values();
    if (!values.length) return '—';
    const peak = Math.max(...values);
    return this.metric() === 'gmv' ? peak.toFixed(0) : String(peak);
  }

  // --------------------------------------------------------------- helpers

  /** "+12.4%" style chip text; the tone class is applied by `deltaClass`. */
  deltaChip(kpi: AnalyticsKpi): string {
    const sign = kpi.delta_percent > 0 ? '+' : '';
    return `${sign}${kpi.delta_percent}%`;
  }

  sharePercent(count: number): number {
    const total = (this.report()?.status_mix ?? []).reduce((sum, s) => sum + s.count, 0);
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  /** True when a section ignores the store filter (see `scope` in the API payload). */
  isTenantWide(section: 'funnel' | 'ads'): boolean {
    return this.report()?.scope?.tenant_wide_sections?.includes(section) ?? false;
  }

  /**
   * Ad spend as a share of revenue. Campaign spend covers every store, so the
   * ratio is only meaningful when revenue covers every store too.
   */
  adShareLabel(): string {
    const r = this.report();
    if (!r || this.isTenantWide('ads')) return '—';
    if (!r.kpis.gmv.value) return '0.00%';
    return `${((r.ads.spend / r.kpis.gmv.value) * 100).toFixed(2)}%`;
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
  }

  statusTone(status: string): string {
    return STATUS_TONES[status] ?? '#8a8070';
  }

  /** Opens the browser print dialog; choose "Save as PDF" for a clean report file. */
  exportPdf(): void {
    const r = this.report();
    if (!r || typeof window === 'undefined') return;

    const safeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tenant';
    const tenantSlug = safeName(this.tenantName());
    const scopeSlug = safeName(this.selectedStoreName());
    const previousTitle = document.title;
    document.title = `${tenantSlug}-report-${scopeSlug}-${r.range.start}-to-${r.range.end}`;
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
    const rows: (string | number)[][] = [
      ['Tenant report', this.tenantName()],
      ['Tenant ID', this.tenantId() ?? ''],
      ['Currency', r.currency],
      ['Reporting period', r.range.start, r.range.end],
      ['Comparison period', r.range.previous_start, r.range.previous_end],
      ['Store scope', this.selectedStoreName()],
      ['Generated at', this.generatedAt()?.toISOString() ?? new Date().toISOString()],
      [],
      ['Summary metrics'],
      ['Metric', 'Current period', 'Previous period', 'Change (%)'],
      ...Object.entries(r.kpis).map(([key, value]) => [key, value.value, value.previous, value.delta_percent]),
      [],
      ['Daily performance'],
      ['Day', 'Revenue', 'Orders', 'Product views'],
      ...r.series.map((d) => [d.day, d.gmv, d.orders, d.views]),
      [],
      ['Conversion funnel'],
      ['Step', 'Events', 'Rate (%)'],
      ...r.funnel.steps.map((step) => [step.label, step.value, step.rate]),
      ['Cart abandonment', '', r.funnel.cart_abandonment],
      [],
      ['Order status mix'],
      ['Status', 'Orders', 'Revenue'],
      ...r.status_mix.map((status) => [status.status, status.count, status.gmv]),
      [],
      ['Best sellers'],
      ['Product', 'SKU', 'Units', 'Orders', 'Revenue'],
      ...r.top_products.map((p) => [p.name, p.sku || '', p.units, p.orders, p.revenue]),
      [],
      ['Stores'],
      ['Store', 'Orders', 'Revenue', 'Net payout'],
      ...r.stores.map((store) => [store.name, store.orders, store.gmv, store.net]),
      [],
      ['Customers'],
      ['Buyers', 'Repeat buyers', 'Repeat rate (%)', 'Revenue per buyer'],
      [r.customers.buyers, r.customers.repeat_buyers, r.customers.repeat_rate, r.customers.revenue_per_buyer],
      [],
      ['Advertising'],
      ['Impressions', 'Clicks', 'CTR (%)', 'Spend', 'Average CPC'],
      [r.ads.impressions, r.ads.clicks, r.ads.ctr, r.ads.spend, r.ads.avg_cpc],
    ];
    if (r.lifetime) {
      rows.push([], ['Lifetime'], ['Revenue', 'Orders', 'Commission', 'Take rate (%)']);
      rows.push([r.lifetime.gmv, r.lifetime.orders, r.lifetime.commission, r.lifetime.take_rate]);
    }
    const csv = toCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    const scopeSlug = this.selectedStoreName().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'all-stores';
    link.download = `tenant-report-${scopeSlug}-${r.range.start}-to-${r.range.end}.csv`;
    // Attach the link and keep the URL alive briefly: some browsers (Safari)
    // drop the download if the object URL is revoked synchronously.
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
