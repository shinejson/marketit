import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { MoneyPipe } from '../../shared/money.pipe';

export interface ReportItemMeta {
  key: string;
  label: string;
  favorite: boolean;
  /** Tenant permission the API required to include this report. */
  permission?: string;
  /** False while the report has no generator yet; the console locks those. */
  available?: boolean;
}

export interface ReportCategoryMeta {
  name: string;
  icon: string;
  open?: boolean;
  reports: ReportItemMeta[];
}

export interface ReportColumnMeta {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'money' | 'status';
  selected: boolean;
}

export interface ReportKpiMeta {
  label: string;
  value: number;
  format: 'money' | 'number' | 'percent';
  tone?: 'gold' | 'blue' | 'green' | 'danger' | 'slate';
}

@Component({
  selector: 'app-seller-analytics',
  imports: [FormsModule, MoneyPipe, DecimalPipe, DatePipe, RouterLink],
  template: `
    <div class="reports-hub-shell">
      <!-- Top header with breadcrumbs and fast action controls -->
      <header class="page-head no-print">
        <div>
          <div class="breadcrumbs"><a routerLink="/tenant">Workspace</a><span>/</span><span>Reports</span></div>
          <p class="eyebrow">Enterprise reporting</p>
          <h1>Tenant Report Center</h1>
          <p class="intro">
            Comprehensive operational, financial, inventory and sales reporting suite for your tenant workspace.
            Configure custom parameters, pick reporting columns, preview live metrics, and generate clean PDF or CSV reports.
          </p>
        </div>
        <div class="head-actions">
          @if (canExport()) {
            <button class="btn ghost" type="button" (click)="exportCsv()" [disabled]="loading() || !reportData()?.rows?.length" title="Download report as CSV spreadsheet">
              <span aria-hidden="true">⇩</span> Export CSV
            </button>
            <button class="btn primary" type="button" (click)="generatePdf()" [disabled]="loading() || !reportData()?.rows?.length" title="Generate printable PDF report">
              <span aria-hidden="true">🖨</span> Generate PDF
            </button>
          }
          <button class="btn ghost" type="button" (click)="loadReport()" [disabled]="loading()">
            <span class="spin-icon" [class.spinning]="loading()">⟳</span> Refresh
          </button>
        </div>
      </header>

      @if (error()) {
        <div class="error-banner no-print">
          <span>!</span>
          <p>{{ error() }}</p>
          <button type="button" (click)="error.set('')">Dismiss</button>
        </div>
      }

      <!-- Main Two-Column Layout (Matching Images) -->
      <div class="reports-layout">
        <!-- LEFT SIDEBAR: Search + Accordion Categories (Image 1 & 2) -->
        <aside class="reports-sidebar no-print">
          <div class="sidebar-search-box">
            <div class="search-input-wrap">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search report..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange()"
                aria-label="Search reports"
              />
            </div>
            <button
              type="button"
              class="star-filter-btn"
              [class.active]="showOnlyStarred()"
              (click)="toggleOnlyStarred()"
              title="Show only starred / favorite reports"
            >
              {{ showOnlyStarred() ? '★' : '☆' }}
            </button>
          </div>

          <div class="accordion-list">
            @if (catalogLoading()) {
              <div class="sidebar-empty"><p>Loading the reports your role can open…</p></div>
            } @else if (categories().length === 0) {
              <div class="sidebar-empty">
                <p>No reports are available to your role yet.</p>
                <p class="muted">Ask a workspace administrator to grant a reporting permission.</p>
              </div>
            } @else {
            @for (category of filteredCategories(); track category.name) {
              <div class="accordion-category" [class.open]="category.open">
                <button
                  type="button"
                  class="category-header"
                  (click)="toggleCategory(category)"
                  [attr.aria-expanded]="category.open"
                >
                  <span class="cat-title">{{ category.name }}</span>
                  <span class="cat-chevron" [class.rotated]="category.open">❯</span>
                </button>

                @if (category.open) {
                  <ul class="report-items">
                    @for (report of category.reports; track report.key) {
                      <li [class.active]="activeReportKey() === report.key">
                        <button
                          type="button"
                          class="report-item-btn"
                          [disabled]="report.available === false"
                          (click)="selectReport(report.key)"
                          [title]="report.available === false ? 'Not available in your workspace yet' : report.label"
                        >
                          <span class="item-bullet">•</span>
                          <span class="item-label">{{ report.label }}</span>
                          @if (report.available === false) {
                            <span class="item-lock" aria-hidden="true">🔒</span>
                          }
                        </button>
                        <button
                          type="button"
                          class="item-star-btn"
                          [class.starred]="isStarred(report.key)"
                          (click)="toggleStar(report.key, $event)"
                          [title]="isStarred(report.key) ? 'Remove from favorites' : 'Add to favorites'"
                        >
                          {{ isStarred(report.key) ? '★' : '☆' }}
                        </button>
                      </li>
                    }
                  </ul>
                }
              </div>
            } @empty {
              <div class="sidebar-empty">
                <p>No reports match "{{ searchQuery }}"</p>
                <button type="button" class="btn ghost btn-sm" (click)="resetSearch()">Clear filter</button>
              </div>
            }
            }
          </div>
        </aside>

        <!-- RIGHT MAIN CONTENT: Configuration Form, Help Guide & Generated Report (Image 2) -->
        <main class="reports-main">
          <!-- Active Tab Header with Blue Indicator Line -->
          <div class="active-tab-strip no-print">
            <div class="tab-item active">
              <span>{{ activeReportName() }}</span>
            </div>
          </div>

          <!-- Configuration & Filter Form (Image 2) -->
          <section class="filter-card panel no-print" aria-label="Report configuration parameters">
            <div class="filter-grid">
              <!-- Row 1: Date Range & Quick Presets -->
              <div class="filter-cell date-range-cell">
                <label>Date Range (From – To)</label>
                <div class="date-pickers-row">
                  <input type="date" [(ngModel)]="startDate" aria-label="Start date" />
                  <span class="to-separator">To</span>
                  <input type="date" [(ngModel)]="endDate" aria-label="End date" />
                </div>
                <div class="preset-chips">
                  <button type="button" [class.on]="preset() === 'today'" (click)="applyPreset('today')">Today</button>
                  <button type="button" [class.on]="preset() === '7d'" (click)="applyPreset('7d')">Last 7d</button>
                  <button type="button" [class.on]="preset() === '30d'" (click)="applyPreset('30d')">Last 30d</button>
                  <button type="button" [class.on]="preset() === 'month'" (click)="applyPreset('month')">This Month</button>
                  <button type="button" [class.on]="preset() === 'ytd'" (click)="applyPreset('ytd')">YTD</button>
                </div>
              </div>

              <!-- Row 2: Store Scope -->
              <div class="filter-cell">
                <label>Storefront</label>
                <select [(ngModel)]="storeFilter" aria-label="Store selection">
                  <option value="">-- All Stores --</option>
                  @for (s of storesList(); track s.id) {
                    <option [value]="s.id">{{ s.name }}</option>
                  }
                </select>
              </div>

              <!-- Row 3: Status Filter -->
              <div class="filter-cell">
                <label>Status</label>
                <select [(ngModel)]="statusFilter" aria-label="Status filter">
                  <option value="">-- All Statuses --</option>
                  <option value="completed">Completed / Settled</option>
                  <option value="delivered">Delivered</option>
                  <option value="shipped">Shipped</option>
                  <option value="processing">Processing</option>
                  <option value="awaiting_fulfillment">Awaiting fulfillment</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <!-- Row 4: Category / Department -->
              <div class="filter-cell">
                <label>Category / Segment</label>
                <select [(ngModel)]="categoryFilter" aria-label="Category filter">
                  <option value="">-- All Categories --</option>
                  @for (cat of categoriesList(); track cat.id) {
                    <option [value]="cat.id">{{ cat.name }}</option>
                  }
                </select>
              </div>

              <!-- Row 5: Amount Range -->
              <div class="filter-cell">
                <label>Value Range (From – To)</label>
                <div class="amount-range-row">
                  <input type="number" placeholder="Min $" [(ngModel)]="amountMin" min="0" step="10" />
                  <span>–</span>
                  <input type="number" placeholder="Max $" [(ngModel)]="amountMax" min="0" step="10" />
                </div>
              </div>

              <!-- Row 6: Flag Options -->
              <div class="filter-cell checkbox-cell">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="taxInclusive" />
                  <span>Tax Inclusive Rates / Figures</span>
                </label>
              </div>
            </div>

            <!-- Scrollable Options / Remarks Box (Image 2) -->
            <div class="options-box-row">
              <div class="options-box-col">
                <label class="section-sublabel">Report Inclusions &amp; Options</label>
                <div class="scrollable-checklist">
                  <label class="check-item select-all">
                    <input type="checkbox" [checked]="allOptionsChecked()" (change)="toggleAllOptions($event)" />
                    <b>Select All</b>
                  </label>
                  <label class="check-item">
                    <input type="checkbox" [(ngModel)]="options.discounts" />
                    <span>Include Discounts &amp; Coupons</span>
                  </label>
                  <label class="check-item">
                    <input type="checkbox" [(ngModel)]="options.shipping" />
                    <span>Include Delivery &amp; Shipping Fees</span>
                  </label>
                  <label class="check-item">
                    <input type="checkbox" [(ngModel)]="options.tax" />
                    <span>Include Sales Tax Details</span>
                  </label>
                  <label class="check-item">
                    <input type="checkbox" [(ngModel)]="options.cancelled" />
                    <span>Include Cancelled &amp; Refunded</span>
                  </label>
                  <label class="check-item">
                    <input type="checkbox" [(ngModel)]="options.drafts" />
                    <span>Include Draft Bills &amp; Invoices</span>
                  </label>
                  <label class="check-item">
                    <input type="checkbox" [(ngModel)]="options.storeBreakdown" />
                    <span>Include Storefront Channel Name</span>
                  </label>
                </div>
              </div>

              <!-- Select Columns (Image 2: "Select Column (Any 5)") -->
              <div class="options-box-col">
                <label class="section-sublabel">Select Columns to Display</label>
                <div class="columns-checkbox-wrap">
                  @for (col of activeColumns(); track col.key) {
                    <label class="column-pill" [class.checked]="col.selected">
                      <input
                        type="checkbox"
                        [checked]="col.selected"
                        (change)="toggleColumn(col.key)"
                      />
                      <span>{{ col.label }}</span>
                    </label>
                  }
                </div>
              </div>
            </div>

            <!-- Action Buttons (Bottom Right, matching Image 2) -->
            <div class="form-action-bar">
              <button class="btn dark-navy" type="button" (click)="exportCsv()" [disabled]="loading()">
                Export
              </button>
              <button class="btn primary-blue" type="button" (click)="loadReport()" [disabled]="loading()">
                @if (loading()) { <span class="spin-icon spinning">⟳</span> } @else { Report }
              </button>
              <button class="btn ghost-light" type="button" (click)="resetFilters()" [disabled]="loading()">
                Reset
              </button>
            </div>
          </section>

          <!-- Help Guide Section (Directly underneath form, Image 2) -->
          <section class="help-guide-panel panel no-print" aria-label="Report help guide and instructions">
            <h2 class="help-title">Help Guide</h2>
            <p class="help-summary">
              {{ reportHelp()?.summary }}
            </p>

            <h3 class="help-subtitle">{{ reportHelp()?.compare_heading || 'How can you compare the report data with other reports?' }}</h3>
            <ol class="help-points">
              @for (point of reportHelp()?.points || []; track point) {
                <li>{{ point }}</li>
              }
            </ol>
          </section>

          <!-- PRINT / PDF EXCLUSIVE HEADER (Rendered cleanly during PDF generation) -->
          <div class="pdf-print-header print-only">
            <div class="print-brand-row">
              <div class="brand-left">
                <span class="print-mark">MarketHub</span>
                <h2>{{ reportData()?.report_name || activeReportName() }}</h2>
                <p class="print-tenant">Tenant: <b>{{ tenantName() }}</b> (ID #{{ tenantId() || '1' }})</p>
              </div>
              <div class="brand-right">
                <span class="print-badge">Official Report</span>
                <p>Period: <b>{{ reportData()?.range?.start }}</b> to <b>{{ reportData()?.range?.end }}</b></p>
                <p>Scope: <b>{{ selectedStoreName() }}</b></p>
                <p>Generated: <b>{{ generatedAt() | date:'medium' }}</b></p>
              </div>
            </div>
          </div>

          <!-- GENERATED REPORT VIEW: Metrics Cards, Data Table & Pagination -->
          @if (reportData(); as r) {
            <!-- Executive Summary KPI Cards -->
            <section class="report-kpi-strip" aria-label="Key summary metrics">
              @for (kpi of r.kpis || []; track kpi.label) {
                <div class="report-kpi-card" [class]="'tone-' + (kpi.tone || 'blue')">
                  <span class="kpi-label">{{ kpi.label }}</span>
                  <strong class="kpi-value">
                    @if (kpi.format === 'money') {
                      {{ kpi.value | money:r.currency:'symbol':'1.0-2' }}
                    } @else if (kpi.format === 'percent') {
                      {{ kpi.value | number:'1.0-1' }}%
                    } @else {
                      {{ kpi.value | number }}
                    }
                  </strong>
                </div>
              }
            </section>

            <!-- Results Data Table -->
            <section class="report-results-panel panel">
              <div class="results-toolbar no-print">
                <div class="results-count">
                  <strong>{{ filteredRows().length }}</strong> records found
                  @if (searchTableText) {
                    <span class="filter-indicator">(filtered from {{ r.rows.length }})</span>
                  }
                </div>
                <div class="toolbar-right">
                  <div class="table-search">
                    <span>⌕</span>
                    <input
                      type="text"
                      placeholder="Filter results..."
                      [(ngModel)]="searchTableText"
                      (ngModelChange)="tablePage.set(1)"
                      aria-label="Filter results table"
                    />
                  </div>
                  <button type="button" class="btn ghost btn-sm" (click)="generatePdf()">
                    <span>🖨</span> Print / PDF
                  </button>
                </div>
              </div>

              <!-- Table Element -->
              <div class="table-scroll-wrap">
                <table class="report-data-table">
                  <thead>
                    <tr>
                      @for (col of visibleColumns(); track col.key) {
                        <th [class.right]="col.type === 'money' || col.type === 'number'">
                          {{ col.label }}
                        </th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of paginatedRows(); track (row.id || row.date || $index)) {
                      <tr>
                        @for (col of visibleColumns(); track col.key) {
                          <td [class.right]="col.type === 'money' || col.type === 'number'">
                            @if (col.type === 'money') {
                              <strong>{{ row[col.key] | money:r.currency }}</strong>
                            } @else if (col.type === 'number') {
                              {{ row[col.key] | number }}
                            } @else if (col.type === 'date') {
                              <span class="mono-date">{{ row[col.key] }}</span>
                            } @else if (col.type === 'status') {
                              <span [class]="'status-badge ' + (row[col.key] || 'default')">
                                {{ prettyStatus(row[col.key]) }}
                              </span>
                            } @else {
                              <span>{{ row[col.key] }}</span>
                            }
                          </td>
                        }
                      </tr>
                    } @empty {
                      <tr>
                        <td [attr.colspan]="visibleColumns().length">
                          <div class="empty-results-box">
                            <span class="empty-glyph">📊</span>
                            <h3>No records match the current parameters</h3>
                            <p>Try widening your date range, clearing filters, or choosing "All Statuses".</p>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>

                  <!-- Grand Totals Row -->
                  @if (r.totals && filteredRows().length > 0) {
                    <tfoot class="report-totals-foot">
                      <tr>
                        @for (col of visibleColumns(); track col.key; let first = $first) {
                          <td [class.right]="col.type === 'money' || col.type === 'number'">
                            @if (first) {
                              <strong>Grand Total</strong>
                            } @else if (r.totals[col.key] !== undefined) {
                              @if (col.type === 'money') {
                                <strong>{{ r.totals[col.key] | money:r.currency }}</strong>
                              } @else if (col.type === 'number') {
                                <strong>{{ r.totals[col.key] | number }}</strong>
                              } @else {
                                <span>{{ r.totals[col.key] }}</span>
                              }
                            } @else {
                              <span>—</span>
                            }
                          </td>
                        }
                      </tr>
                    </tfoot>
                  }
                </table>
              </div>

              <!-- Pagination Footer -->
              <div class="table-pagination-foot no-print">
                <span class="pagination-info">
                  Showing {{ paginationRange() }} of {{ filteredRows().length }} rows · Page {{ tablePage() }} of {{ totalTablePages() }}
                </span>
                <div class="pagination-nav">
                  <button
                    type="button"
                    [disabled]="tablePage() <= 1"
                    (click)="prevPage()"
                  >
                    ← Previous
                  </button>
                  <span class="page-num-indicator">{{ tablePage() }} / {{ totalTablePages() }}</span>
                  <button
                    type="button"
                    [disabled]="tablePage() >= totalTablePages()"
                    (click)="nextPage()"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </section>
          }

          <!-- PRINT / PDF FOOTER (Rendered cleanly on paper/PDF) -->
          <footer class="pdf-print-footer print-only">
            <span>MarketHub Enterprise Reporting System · Generated for {{ tenantName() }}</span>
            <span>Document ID: MH-{{ activeReportKey() }}-{{ startDate }}-{{ endDate }} · Page 1</span>
          </footer>
        </main>
      </div>
    </div>
  `,
})
export class SellerAnalyticsComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  tenantName = computed(() => this.auth.user()?.tenant_name?.trim() || this.auth.user()?.name || 'Tenant Workspace');
  tenantId = computed(() => this.auth.user()?.tenant_id ?? null);
  generatedAt = signal<Date>(new Date());

  // State signals
  loading = signal(false);
  error = signal('');
  catalogLoading = signal(true);
  /** `reports.export`: the permission that unlocks the CSV and PDF downloads. */
  canExport = signal(false);
  /** Empty until the API answers — never a client-side guess at the catalogue. */
  activeReportKey = signal<string>('');
  preset = signal<string>('30d');

  // Filter models
  startDate = this.formatDate(new Date(Date.now() - 29 * 86400000));
  endDate = this.formatDate(new Date());
  storeFilter = '';
  statusFilter = '';
  categoryFilter = '';
  amountMin: number | null = null;
  amountMax: number | null = null;
  taxInclusive = true;

  // Search & Starred filters
  searchQuery = '';
  showOnlyStarred = signal(false);
  starredKeys = signal<Set<string>>(new Set(['sales_summary', 'orders_master', 'inventory_stock', 'low_stock_alerts', 'invoices_breakdown', 'pnl_statement']));

  // Options checklist
  options = {
    discounts: true,
    shipping: true,
    tax: true,
    cancelled: false,
    drafts: false,
    storeBreakdown: false,
  };

  // Table pagination & search
  searchTableText = '';
  tablePage = signal(1);
  readonly tablePageSize = 15;

  // Stores & Categories dropdown lists
  storesList = signal<{ id: number; name: string }[]>([]);
  categoriesList = signal<{ id: number; name: string }[]>([]);

  /**
   * The report catalogue as the API filtered it for this user. Reports their
   * role does not carry are simply absent, so the sidebar can only ever offer
   * something the backend will actually serve.
   */
  categories = signal<ReportCategoryMeta[]>([]);

  // Current loaded report response data
  reportData = signal<any | null>(null);

  // Active columns configuration
  activeColumns = signal<ReportColumnMeta[]>([]);

  // Computed helper for report name
  activeReportName = computed(() => {
    for (const cat of this.categories()) {
      for (const rep of cat.reports) {
        if (rep.key === this.activeReportKey()) return rep.label;
      }
    }
    return this.activeReportKey() ? this.activeReportKey() : 'Select a report';
  });

  reportHelp = computed(() => this.reportData()?.help);

  visibleColumns = computed(() => this.activeColumns().filter((c) => c.selected));

  filteredCategories = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    const onlyStars = this.showOnlyStarred();
    const stars = this.starredKeys();

    return this.categories().map((cat) => {
      const reports = cat.reports.filter((r) => {
        const matchesQuery = !q || r.label.toLowerCase().includes(q) || r.key.toLowerCase().includes(q);
        const matchesStar = !onlyStars || stars.has(r.key);
        return matchesQuery && matchesStar;
      });
      return {
        ...cat,
        open: q ? true : cat.open,
        reports,
      };
    }).filter((cat) => cat.reports.length > 0);
  });

  filteredRows = computed(() => {
    const data = this.reportData()?.rows || [];
    const query = this.searchTableText.trim().toLowerCase();
    if (!query) return data;

    return data.filter((row: any) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(query))
    );
  });

  totalTablePages = computed(() =>
    Math.max(1, Math.ceil(this.filteredRows().length / this.tablePageSize))
  );

  paginatedRows = computed(() => {
    const start = (this.tablePage() - 1) * this.tablePageSize;
    return this.filteredRows().slice(start, start + this.tablePageSize);
  });

  paginationRange = computed(() => {
    const total = this.filteredRows().length;
    if (!total) return '0';
    const start = (this.tablePage() - 1) * this.tablePageSize + 1;
    const end = Math.min(this.tablePage() * this.tablePageSize, total);
    return `${start}–${end}`;
  });

  constructor() {
    this.restoreFavorites();
    this.loadStoresAndCategories();
    this.loadCatalog();
  }

  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------

  /**
   * Ask the API which reports this person may open, then open the first one.
   * The response is already permission-filtered, so nothing here re-decides
   * access — it only picks a sensible starting point.
   */
  loadCatalog(): void {
    this.catalogLoading.set(true);

    this.api.tenantReportCatalog().subscribe({
      next: (res) => {
        const categories = (res.data?.categories || []).map((cat, index) => ({ ...cat, open: index === 0 }));
        this.categories.set(categories);
        this.canExport.set(!!res.meta?.permissions?.can_export);
        this.catalogLoading.set(false);

        const first = this.firstAvailableKey();
        if (!first) return;
        this.activeReportKey.set(first);
        this.loadReport();
      },
      error: () => {
        this.catalogLoading.set(false);
        this.error.set('We could not load your report catalogue. Refresh to try again.');
      },
    });
  }

  /** First report the caller may open that the workspace can actually build. */
  private firstAvailableKey(): string | null {
    for (const cat of this.categories()) {
      for (const report of cat.reports) {
        if (report.available !== false) return report.key;
      }
    }
    return null;
  }

  loadReport(): void {
    if (!this.activeReportKey()) return;
    this.loading.set(true);
    this.error.set('');

    const params: Record<string, any> = {
      report: this.activeReportKey(),
      start_date: this.startDate,
      end_date: this.endDate,
    };

    if (this.storeFilter) params['store_id'] = this.storeFilter;
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.categoryFilter) params['category_id'] = this.categoryFilter;
    if (this.amountMin !== null && this.amountMin !== undefined) params['amount_min'] = this.amountMin;
    if (this.amountMax !== null && this.amountMax !== undefined) params['amount_max'] = this.amountMax;

    this.api.generateTenantReport(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.reportData.set(res.data);
          this.generatedAt.set(new Date());
          this.activeColumns.set((res.data.columns || []).map((col: any) => ({
            ...col,
            selected: col.selected !== false,
          })));
          this.tablePage.set(1);
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Unable to generate tenant report. Please try again.');
        },
      });
  }

  loadStoresAndCategories(): void {
    this.api.sellerStores().subscribe({
      next: (res: any) => {
        const list = (res.data || []).map((s: any) => ({ id: s.id, name: s.name }));
        this.storesList.set(list);
      },
    });

    this.api.sellerCategories().subscribe({
      next: (res: any) => {
        const list = (res.data || []).map((c: any) => ({ id: c.id, name: c.name }));
        this.categoriesList.set(list);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Interactions & State
  // ---------------------------------------------------------------------------

  selectReport(key: string): void {
    if (this.activeReportKey() === key) return;
    // Locked entries are disabled in the template; this keeps a programmatic
    // call from asking the API for a report it will refuse anyway.
    const requested = this.categories().flatMap((cat) => cat.reports).find((r) => r.key === key);
    if (!requested || requested.available === false) return;
    this.activeReportKey.set(key);
    this.searchTableText = '';
    this.tablePage.set(1);
    this.loadReport();
  }

  toggleCategory(category: ReportCategoryMeta): void {
    category.open = !category.open;
  }

  toggleStar(key: string, event: MouseEvent): void {
    event.stopPropagation();
    const set = new Set(this.starredKeys());
    if (set.has(key)) {
      set.delete(key);
    } else {
      set.add(key);
    }
    this.starredKeys.set(set);
    this.saveFavorites();
  }

  isStarred(key: string): boolean {
    return this.starredKeys().has(key);
  }

  toggleOnlyStarred(): void {
    this.showOnlyStarred.update((v) => !v);
  }

  onSearchChange(): void {
    // If searching, auto-expand categories that have results
    if (this.searchQuery.trim()) {
      for (const cat of this.categories()) {
        cat.open = true;
      }
    }
  }

  resetSearch(): void {
    this.searchQuery = '';
    this.showOnlyStarred.set(false);
  }

  applyPreset(type: string): void {
    this.preset.set(type);
    const now = new Date();
    const end = this.formatDate(now);

    if (type === 'today') {
      this.startDate = end;
      this.endDate = end;
    } else if (type === '7d') {
      this.startDate = this.formatDate(new Date(Date.now() - 6 * 86400000));
      this.endDate = end;
    } else if (type === '30d') {
      this.startDate = this.formatDate(new Date(Date.now() - 29 * 86400000));
      this.endDate = end;
    } else if (type === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      this.startDate = this.formatDate(firstDay);
      this.endDate = end;
    } else if (type === 'ytd') {
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
      this.startDate = this.formatDate(firstDayOfYear);
      this.endDate = end;
    }

    this.loadReport();
  }

  toggleColumn(key: string): void {
    this.activeColumns.update((cols) =>
      cols.map((col) => col.key === key ? { ...col, selected: !col.selected } : col)
    );
  }

  allOptionsChecked(): boolean {
    return Object.values(this.options).every(Boolean);
  }

  toggleAllOptions(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.options = {
      discounts: checked,
      shipping: checked,
      tax: checked,
      cancelled: checked,
      drafts: checked,
      storeBreakdown: checked,
    };
  }

  resetFilters(): void {
    this.startDate = this.formatDate(new Date(Date.now() - 29 * 86400000));
    this.endDate = this.formatDate(new Date());
    this.storeFilter = '';
    this.statusFilter = '';
    this.categoryFilter = '';
    this.amountMin = null;
    this.amountMax = null;
    this.taxInclusive = true;
    this.preset.set('30d');
    this.loadReport();
  }

  // ---------------------------------------------------------------------------
  // Export & PDF Generation
  // ---------------------------------------------------------------------------

  generatePdf(): void {
    if (!this.canExport()) return;
    const r = this.reportData();
    if (!r || typeof window === 'undefined') return;

    const safe = (val: string) => val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report';
    const tenantSlug = safe(this.tenantName());
    const reportSlug = safe(this.activeReportName());
    const prevTitle = document.title;

    document.title = `${tenantSlug}-${reportSlug}-${this.startDate}-to-${this.endDate}`;
    window.addEventListener('afterprint', () => { document.title = prevTitle; }, { once: true });

    try {
      window.print();
    } catch {
      document.title = prevTitle;
    }
  }

  exportCsv(): void {
    if (!this.canExport()) return;
    const r = this.reportData();
    if (!r || !r.rows || !r.rows.length) return;

    const cols = this.visibleColumns();
    const headers = cols.map((c) => c.label);

    const rowsData = this.filteredRows().map((row: any) => {
      return cols.map((col) => {
        let val = row[col.key];
        if (col.type === 'money') val = typeof val === 'number' ? val.toFixed(2) : val;
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = [headers.map((h) => `"${h}"`).join(','), ...rowsData].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.activeReportKey()}-${this.startDate}-to-${this.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  prevPage(): void {
    if (this.tablePage() > 1) this.tablePage.update((p) => p - 1);
  }

  nextPage(): void {
    if (this.tablePage() < this.totalTablePages()) this.tablePage.update((p) => p + 1);
  }

  // ---------------------------------------------------------------------------
  // Formatters & Storage Helpers
  // ---------------------------------------------------------------------------

  prettyStatus(status: string): string {
    if (!status) return 'Active';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  selectedStoreName(): string {
    if (!this.storeFilter) return 'All Stores';
    const store = this.storesList().find((s) => s.id === +this.storeFilter);
    return store?.name || 'Selected Store';
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private restoreFavorites(): void {
    try {
      const stored = localStorage.getItem('mh_tenant_starred_reports');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.starredKeys.set(new Set(parsed));
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }

  private saveFavorites(): void {
    try {
      localStorage.setItem('mh_tenant_starred_reports', JSON.stringify(Array.from(this.starredKeys())));
    } catch {
      // Ignore localStorage write errors
    }
  }
}
