import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { SellerOrder, SellerOrderItem, SellerOrderStats, SellerOrderStatus } from '../../core/models';

type StatusFilter = SellerOrderStatus | '';
type DateQuickRange = 'all' | 'today' | '7d' | '30d';
type SortValue = 'created_at:desc' | 'created_at:asc' | 'net_settlement:desc' | 'net_settlement:asc' | 'subtotal:desc' | 'subtotal:asc' | 'id:desc' | 'id:asc';

interface StatusTab {
  key: StatusFilter;
  label: string;
  count: number;
}

const TIMELINE_STEPS: { key: SellerOrderStatus; label: string }[] = [
  { key: 'awaiting_fulfillment', label: 'Placed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'completed', label: 'Completed' },
];

const NEXT_ACTION: Partial<Record<SellerOrderStatus, { next: SellerOrderStatus; label: string }>> = {
  awaiting_fulfillment: { next: 'processing', label: 'Start Processing' },
  processing: { next: 'shipped', label: 'Mark as Shipped' },
  shipped: { next: 'delivered', label: 'Mark Delivered' },
  delivered: { next: 'completed', label: 'Complete Order' },
};

const STATUS_LABELS: Record<string, string> = {
  awaiting_fulfillment: 'Awaiting Fulfillment',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

@Component({
  selector: 'app-seller-orders',
  imports: [FormsModule, CurrencyPipe, DatePipe, RouterLink],
  template: `
    <div class="orders-shell">
      <header class="page-head">
        <div>
          <div class="breadcrumbs"><a routerLink="/tenant">Tenant</a><span>/</span><span>Operations</span></div>
          <p class="eyebrow">Fulfillment</p>
          <h1>Orders &amp; Fulfillment</h1>
          <p class="intro">Track every sale from payment to doorstep — process, ship and settle orders across all your stores.</p>
        </div>
        <div class="head-actions">
          <button class="btn ghost" type="button" (click)="exportCsv()" [disabled]="!orders().length">⤓ Export CSV</button>
          <button class="btn primary" type="button" (click)="refresh()" [disabled]="loading()">
            <span class="spin-icon" [class.spinning]="refreshing()">⟳</span> Refresh
          </button>
        </div>
      </header>

      @if (toast()) { <div class="toast" role="status"><span>✓</span>{{ toast() }}</div> }
      @if (error()) { <div class="error-banner"><span>!</span><p>{{ error() }}</p><button type="button" (click)="error.set('')">Dismiss</button></div> }

      <section class="kpi-grid">
        <article class="metric-card urgent">
          <div class="metric-top"><span class="metric-icon amber">⏱</span>@if ((stats()?.awaiting_fulfillment_count ?? 0) > 0) { <span class="trend warn">Needs action</span> }</div>
          <p>Awaiting fulfillment</p><h2>{{ stats()?.awaiting_fulfillment_count ?? 0 }}</h2>
          <small>Orders waiting to be processed</small>
        </article>
        <article class="metric-card">
          <div class="metric-top"><span class="metric-icon blue">⚙</span></div>
          <p>In processing</p><h2>{{ stats()?.processing_count ?? 0 }}</h2>
          <small>Being packed right now</small>
        </article>
        <article class="metric-card">
          <div class="metric-top"><span class="metric-icon plum">⇢</span></div>
          <p>Shipped / in transit</p><h2>{{ stats()?.shipped_count ?? 0 }}</h2>
          <small>On the way to customers</small>
        </article>
        <article class="metric-card">
          <div class="metric-top"><span class="metric-icon green">✓</span></div>
          <p>Completed</p><h2>{{ (stats()?.completed_count ?? 0) + (stats()?.delivered_count ?? 0) }}</h2>
          <small>Delivered &amp; fully settled</small>
        </article>
        <article class="metric-card settlement">
          <div class="metric-top"><span class="metric-icon gold">₵</span></div>
          <p>Net settlements</p><h2>{{ stats()?.total_net_payout ?? 0 | currency:'USD':'symbol':'1.0-2' }}</h2>
          <small>Payout owed across active orders</small>
        </article>
      </section>

      <nav class="status-tabs" aria-label="Order status filters">
        @for (tab of statusTabs(); track tab.key) {
          <button type="button" [class.active]="statusFilter() === tab.key" (click)="setStatusFilter(tab.key)">
            {{ tab.label }} <span class="tab-count">{{ tab.count }}</span>
          </button>
        }
      </nav>

      <section class="table-panel panel">
        <div class="table-toolbar">
          <div class="search-box">
            <span>⌕</span>
            <input type="search" placeholder="Search order #, customer, product or SKU" [(ngModel)]="searchTerm" (ngModelChange)="onSearchInput($event)" />
            @if (searchTerm) { <button type="button" class="clear-btn" (click)="clearSearch()" aria-label="Clear search">×</button> }
          </div>
          <select [(ngModel)]="storeFilter" (change)="onFilterChange()" aria-label="Filter by store">
            <option value="">All stores</option>
            @for (store of stores(); track store.id) { <option [value]="store.id">{{ store.name }}</option> }
          </select>
          <select [(ngModel)]="dateRange" (change)="onFilterChange()" aria-label="Filter by date">
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <select [(ngModel)]="sortValue" (change)="onSortChange()" aria-label="Sort orders">
            <option value="created_at:desc">Newest first</option>
            <option value="created_at:asc">Oldest first</option>
            <option value="net_settlement:desc">Highest payout</option>
            <option value="net_settlement:asc">Lowest payout</option>
            <option value="subtotal:desc">Highest subtotal</option>
          </select>
          <select [(ngModel)]="perPage" (change)="onFilterChange()" aria-label="Rows per page">
            <option [ngValue]="10">10 / page</option>
            <option [ngValue]="25">25 / page</option>
            <option [ngValue]="50">50 / page</option>
          </select>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer &amp; destination</th>
                <th>Items</th>
                <th class="right">Financials</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                @for (n of skeletonRows; track n) {
                  <tr class="skeleton-row"><td colspan="6"><div class="skeleton skel-line"></div></td></tr>
                }
              } @else {
                @for (order of orders(); track order.id) {
                  <tr class="order-row" (click)="openDrawer(order)">
                    <td>
                      <strong>#ORD-{{ order.id }}</strong>
                      <small>{{ relativeTime(order.created_at) }}</small>
                      <small class="muted-cell">Master #{{ order.order_id }}</small>
                    </td>
                    <td>
                      <div class="customer-cell">
                        <span class="avatar">{{ initials(order.order?.user?.name) }}</span>
                        <div>
                          <strong>{{ order.order?.user?.name || 'Guest customer' }}</strong>
                          <small>{{ order.order?.user?.email || '—' }}</small>
                          @if (order.order?.shipping_address; as addr) { <span class="geo-chip">{{ addr.city }}, {{ addr.country }}</span> }
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="items-cell">
                        <span class="item-count-pill">{{ itemCount(order) }} item{{ itemCount(order) === 1 ? '' : 's' }}</span>
                        <small>{{ itemSummary(order) }}</small>
                      </div>
                    </td>
                    <td class="right financial-cell">
                      <div><span>Subtotal</span><b>{{ +order.subtotal | currency:currencyOf(order):'symbol':'1.2-2' }}</b></div>
                      <div><span>Delivery</span><b>{{ +order.delivery_fee | currency:currencyOf(order):'symbol':'1.2-2' }}</b></div>
                      <div><span>Commission</span><b>-{{ +order.commission | currency:currencyOf(order):'symbol':'1.2-2' }}</b></div>
                      <div class="net"><span>Net payout</span><b>{{ +order.net_settlement | currency:currencyOf(order):'symbol':'1.2-2' }}</b></div>
                    </td>
                    <td><span [class]="'status ' + order.status">{{ statusLabel(order.status) }}</span></td>
                    <td class="actions" (click)="$event.stopPropagation()">
                      @if (nextAction(order.status); as action) {
                        <button type="button" class="primary-action" [disabled]="savingId() === order.id" (click)="transition(order, action.next)">
                          {{ savingId() === order.id ? 'Saving…' : action.label }}
                        </button>
                      }
                      <div class="menu-wrap">
                        <button type="button" class="icon-btn" (click)="toggleMenu(order.id, $event)" aria-label="More actions">⋯</button>
                        @if (openMenu() === order.id) {
                          <div class="dropdown-menu">
                            <button type="button" (click)="openDrawer(order)">View details</button>
                            <button type="button" (click)="printPackingSlip(order)">Print packing slip</button>
                            @if (canCancel(order.status)) { <button type="button" class="danger" (click)="transition(order, 'cancelled')">Cancel order</button> }
                          </div>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr class="empty-row">
                    <td colspan="6">
                      <div class="empty-state">
                        <span class="empty-icon">📦</span>
                        <b>No orders match these filters</b>
                        <span>Try a different status, search term, or widen your date range.</span>
                        @if (hasActiveFilters()) { <button type="button" class="btn ghost small" (click)="resetFilters()">Clear filters</button> }
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        <div class="table-foot">
          <span>Showing {{ orders().length }} of {{ total() }} order{{ total() === 1 ? '' : 's' }}</span>
          <div class="pagination">
            <button type="button" [disabled]="page() <= 1" (click)="goToPage(page() - 1)">‹ Prev</button>
            <span>Page {{ page() }} of {{ lastPage() }}</span>
            <button type="button" [disabled]="page() >= lastPage()" (click)="goToPage(page() + 1)">Next ›</button>
          </div>
        </div>
      </section>
    </div>

    @if (drawerOrder(); as order) {
      <div class="drawer-backdrop" (click)="closeDrawer()"></div>
      <aside class="drawer" role="dialog" aria-modal="true" data-order-drawer>
        <header>
          <div>
            <p class="eyebrow">Order inspection</p>
            <h2>#ORD-{{ order.id }} <span [class]="'status ' + order.status">{{ statusLabel(order.status) }}</span></h2>
            <small>Placed {{ (order.order?.placed_at || order.created_at) | date:'MMM d, y, h:mm a' }}</small>
          </div>
          <button type="button" class="icon-btn" (click)="closeDrawer()" aria-label="Close">×</button>
        </header>
        <div class="drawer-body">
          <section class="stepper" aria-label="Fulfillment timeline">
            @for (step of timelineSteps; track step.key) {
              <div class="step" [class.done]="stepState(order, step.key) === 'done'" [class.current]="stepState(order, step.key) === 'current'">
                <span class="dot"></span><b>{{ step.label }}</b>
              </div>
            }
            @if (order.status === 'cancelled' || order.status === 'refunded') {
              <div class="step cancelled current"><span class="dot"></span><b>{{ statusLabel(order.status) }}</b></div>
            }
          </section>

          <section class="info-card">
            <div class="info-head"><h3>Customer &amp; shipping</h3><button type="button" class="link" (click)="copyAddress(order)">{{ copied() ? 'Copied ✓' : 'Copy address' }}</button></div>
            <dl>
              <div><dt>Recipient</dt><dd>{{ order.order?.shipping_address?.full_name || order.order?.user?.name || '—' }}</dd></div>
              <div><dt>Phone</dt><dd>{{ order.order?.shipping_address?.phone || '—' }}</dd></div>
              <div><dt>Address</dt><dd>{{ formattedAddress(order) || '—' }}</dd></div>
            </dl>
          </section>

          <section class="line-items">
            <h3>Line items</h3>
            <div class="table-wrap">
              <table>
                <thead><tr><th></th><th>Product</th><th>SKU</th><th>Options</th><th class="right">Qty</th><th class="right">Unit price</th><th class="right">Line total</th></tr></thead>
                <tbody>
                  @for (item of order.items; track item.id) {
                    <tr>
                      <td><span class="thumb" aria-hidden="true">▫</span></td>
                      <td>{{ item.product_name }}</td>
                      <td class="mono">{{ item.sku || '—' }}</td>
                      <td>{{ optionsSummary(item) }}</td>
                      <td class="right">{{ item.qty }}</td>
                      <td class="right">{{ +item.unit_price | currency:currencyOf(order):'symbol':'1.2-2' }}</td>
                      <td class="right">{{ (+item.unit_price * item.qty) | currency:currencyOf(order):'symbol':'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <section class="financial-card">
            <h3>Financial breakdown</h3>
            <div><span>Subtotal</span><b>{{ +order.subtotal | currency:currencyOf(order):'symbol':'1.2-2' }}</b></div>
            <div><span>Delivery fee</span><b>{{ +order.delivery_fee | currency:currencyOf(order):'symbol':'1.2-2' }}</b></div>
            <div><span>Platform commission</span><b>-{{ +order.commission | currency:currencyOf(order):'symbol':'1.2-2' }}</b></div>
            <div class="grand"><span>Net payout</span><b>{{ +order.net_settlement | currency:currencyOf(order):'symbol':'1.2-2' }}</b></div>
          </section>

          <section class="packing-slip">
            <h2>Packing slip</h2>
            <p class="slip-meta">#ORD-{{ order.id }} · Master order #{{ order.order_id }} · {{ order.store?.name }}</p>
            <hr />
            <p class="slip-ship"><b>Ship to</b><br />{{ order.order?.shipping_address?.full_name || order.order?.user?.name }}<br />{{ formattedAddress(order) }}<br />{{ order.order?.shipping_address?.phone }}</p>
            <table>
              <thead><tr><th>Item</th><th>SKU</th><th>Qty</th></tr></thead>
              <tbody>
                @for (item of order.items; track item.id) { <tr><td>{{ item.product_name }}</td><td>{{ item.sku || '—' }}</td><td>{{ item.qty }}</td></tr> }
              </tbody>
            </table>
          </section>
        </div>
        <footer>
          @if (canCancel(order.status)) { <button type="button" class="btn ghost danger" [disabled]="savingId() === order.id" (click)="transition(order, 'cancelled')">Cancel order</button> }
          <button type="button" class="btn ghost" (click)="printPackingSlip(order)">Print packing slip</button>
          @if (nextAction(order.status); as action) {
            <button type="button" class="btn primary" [disabled]="savingId() === order.id" (click)="transition(order, action.next)">
              {{ savingId() === order.id ? 'Saving…' : action.label }}
            </button>
          }
        </footer>
      </aside>
    }
  `,
  styles: [`
    /* Bulk of the visual system lives in orders.workspace.scss (global,
       keyed off the shared --ink/--paper/--card/--line/--accent tokens) so
       this component stays well inside Angular's per-component style
       budget. This block only anchors dark-mode color-scheme hints. */
    :host { display: block; }
    :host-context([data-theme="dark"]) { color-scheme: dark; }
  `],
})
export class SellerOrdersComponent {
  private api = inject(ApiService);

  readonly timelineSteps = TIMELINE_STEPS;
  readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  loading = signal(true);
  refreshing = signal(false);
  error = signal('');
  toast = signal('');
  copied = signal(false);

  orders = signal<SellerOrder[]>([]);
  stats = signal<SellerOrderStats | null>(null);
  stores = signal<{ id: number; name: string }[]>([]);

  total = signal(0);
  page = signal(1);
  lastPage = signal(1);

  statusFilter = signal<StatusFilter>('');
  openMenu = signal<number | null>(null);
  savingId = signal<number | null>(null);
  drawerOrder = signal<SellerOrder | null>(null);

  searchTerm = '';
  storeFilter: string | number = '';
  dateRange: DateQuickRange = 'all';
  sortValue: SortValue = 'created_at:desc';
  perPage: number = 10;

  statusTabs = computed<StatusTab[]>(() => {
    const s = this.stats();
    return [
      { key: '', label: 'All', count: s?.total_count ?? 0 },
      { key: 'awaiting_fulfillment', label: 'Awaiting Fulfillment', count: s?.awaiting_fulfillment_count ?? 0 },
      { key: 'processing', label: 'Processing', count: s?.processing_count ?? 0 },
      { key: 'shipped', label: 'Shipped', count: s?.shipped_count ?? 0 },
      { key: 'delivered', label: 'Delivered', count: s?.delivered_count ?? 0 },
      { key: 'completed', label: 'Completed', count: s?.completed_count ?? 0 },
      { key: 'cancelled', label: 'Cancelled', count: s?.cancelled_count ?? 0 },
    ];
  });

  private searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.page.set(1);
        this.loadOrders();
      });
    this.loadStores();
    this.loadOrders();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenu.set(null);
  }

  // ------------------------------------------------------------- loading

  loadOrders(): void {
    this.loading.set(true);
    this.error.set('');
    const params: Record<string, string | number> = {
      page: this.page(),
      per_page: this.perPage,
    };
    const [sortBy, sortDir] = this.sortValue.split(':');
    params['sort_by'] = sortBy;
    params['sort_dir'] = sortDir;
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.searchTerm.trim()) params['q'] = this.searchTerm.trim();
    if (this.storeFilter) params['store_id'] = this.storeFilter;
    const range = this.dateRangeValues();
    if (range.from) params['date_from'] = range.from;
    if (range.to) params['date_to'] = range.to;

    this.api
      .sellerOrders(params)
      .pipe(finalize(() => { this.loading.set(false); this.refreshing.set(false); }))
      .subscribe({
        next: (res) => {
          this.orders.set(res.data);
          this.total.set(res.meta.total);
          this.lastPage.set(Math.max(1, res.meta.last_page));
          this.stats.set(res.stats);
        },
        error: (err) => this.fail(err),
      });
  }

  private loadStores(): void {
    this.api.sellerStores().subscribe({
      next: (res) => this.stores.set((res.data || []).map((store: any) => ({ id: store.id, name: store.name }))),
      error: () => undefined,
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.loadOrders();
  }

  // ------------------------------------------------------------- filters

  onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.page.set(1);
    this.loadOrders();
  }

  setStatusFilter(key: StatusFilter): void {
    this.statusFilter.set(key);
    this.page.set(1);
    this.loadOrders();
  }

  onFilterChange(): void {
    this.page.set(1);
    this.loadOrders();
  }

  onSortChange(): void {
    this.loadOrders();
  }

  hasActiveFilters(): boolean {
    return !!(this.statusFilter() || this.searchTerm.trim() || this.storeFilter || this.dateRange !== 'all');
  }

  resetFilters(): void {
    this.statusFilter.set('');
    this.searchTerm = '';
    this.storeFilter = '';
    this.dateRange = 'all';
    this.page.set(1);
    this.loadOrders();
  }

  goToPage(target: number): void {
    if (target < 1 || target > this.lastPage()) return;
    this.page.set(target);
    this.loadOrders();
  }

  private dateRangeValues(): { from?: string; to?: string } {
    const toIso = (d: Date) => d.toISOString().slice(0, 10);
    const now = new Date();
    if (this.dateRange === 'today') return { from: toIso(now), to: toIso(now) };
    if (this.dateRange === '7d') {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from: toIso(from), to: toIso(now) };
    }
    if (this.dateRange === '30d') {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { from: toIso(from), to: toIso(now) };
    }
    return {};
  }

  // ------------------------------------------------------------- actions

  nextAction(status: SellerOrderStatus): { next: SellerOrderStatus; label: string } | null {
    return NEXT_ACTION[status] ?? null;
  }

  canCancel(status: SellerOrderStatus): boolean {
    return status === 'awaiting_fulfillment' || status === 'processing';
  }

  transition(order: SellerOrder, status: SellerOrderStatus): void {
    if (status === 'cancelled' && !window.confirm(`Cancel order #ORD-${order.id}? This can't be undone.`)) {
      return;
    }
    this.savingId.set(order.id);
    this.openMenu.set(null);
    this.api
      .updateSellerOrderStatus(order.id, status)
      .pipe(finalize(() => this.savingId.set(null)))
      .subscribe({
        next: (res) => {
          this.showToast(`Order #ORD-${order.id} marked ${this.statusLabel(status).toLowerCase()}`);
          if (this.drawerOrder()?.id === order.id) {
            this.drawerOrder.set({ ...this.drawerOrder()!, ...res.data });
          }
          this.loadOrders();
        },
        error: (err) => this.fail(err),
      });
  }

  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.openMenu.set(this.openMenu() === id ? null : id);
  }

  // ------------------------------------------------------------- drawer

  openDrawer(order: SellerOrder): void {
    this.openMenu.set(null);
    this.drawerOrder.set(order);
    this.api.sellerOrder(order.id).subscribe({
      next: (res) => {
        if (this.drawerOrder()?.id === order.id) this.drawerOrder.set(res.data);
      },
      error: () => undefined,
    });
  }

  closeDrawer(): void {
    this.drawerOrder.set(null);
  }

  printPackingSlip(order: SellerOrder): void {
    this.openMenu.set(null);
    this.openDrawer(order);
    setTimeout(() => window.print(), 150);
  }

  copyAddress(order: SellerOrder): void {
    const text = this.formattedAddress(order, true);
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    });
  }

  stepState(order: SellerOrder, step: SellerOrderStatus): 'done' | 'current' | '' {
    const idx = TIMELINE_STEPS.findIndex((s) => s.key === step);
    const currentIdx = TIMELINE_STEPS.findIndex((s) => s.key === order.status);
    if (currentIdx === -1) return '';
    if (idx < currentIdx) return 'done';
    if (idx === currentIdx) return 'current';
    return '';
  }

  // ------------------------------------------------------------- export

  exportCsv(): void {
    const rows: (string | number)[][] = [
      ['Order ID', 'Master Order', 'Store', 'Customer', 'Email', 'City', 'Country', 'Items', 'Subtotal', 'Delivery Fee', 'Commission', 'Net Settlement', 'Status', 'Placed At'],
      ...this.orders().map((order) => [
        `ORD-${order.id}`,
        order.order_id,
        order.store?.name || '',
        order.order?.user?.name || 'Guest',
        order.order?.user?.email || '',
        order.order?.shipping_address?.city || '',
        order.order?.shipping_address?.country || '',
        this.itemSummary(order),
        +order.subtotal,
        +order.delivery_fee,
        +order.commission,
        +order.net_settlement,
        this.statusLabel(order.status),
        order.created_at,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ------------------------------------------------------------- helpers

  statusLabel(status: string): string {
    return STATUS_LABELS[status] || status.replace(/_/g, ' ');
  }

  currencyOf(order: SellerOrder): string {
    return order.order?.currency || 'USD';
  }

  itemCount(order: SellerOrder): number {
    return (order.items || []).reduce((sum, item) => sum + (+item.qty || 0), 0);
  }

  itemSummary(order: SellerOrder): string {
    const items = order.items || [];
    if (!items.length) return 'No items';
    const text = items.map((item) => `${item.qty}× ${item.product_name}`).join(', ');
    return text.length > 72 ? text.slice(0, 69) + '…' : text;
  }

  optionsSummary(item: SellerOrderItem): string {
    if (!item.options || !Object.keys(item.options).length) return '—';
    return Object.entries(item.options).map(([key, value]) => `${key}: ${value}`).join(', ');
  }

  formattedAddress(order: SellerOrder, multiline = false): string {
    const addr = order.order?.shipping_address;
    if (!addr) return '';
    const parts = [addr.line1, addr.line2, [addr.city, addr.state].filter(Boolean).join(', '), addr.postal_code, addr.country].filter(Boolean);
    return parts.join(multiline ? '\n' : ', ');
  }

  initials(name?: string | null): string {
    const value = (name || 'G C').trim();
    return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'GC';
  }

  relativeTime(dateString: string): string {
    const date = new Date(dateString).getTime();
    if (Number.isNaN(date)) return '—';
    const diffMs = Date.now() - date;
    const diffSec = Math.round(diffMs / 1000);
    const units: [number, string][] = [
      [60, 'second'],
      [60, 'minute'],
      [24, 'hour'],
      [7, 'day'],
      [4.345, 'week'],
      [12, 'month'],
      [Number.POSITIVE_INFINITY, 'year'],
    ];
    let value = diffSec;
    let unitLabel = 'second';
    for (const [amount, label] of units) {
      if (Math.abs(value) < amount) {
        unitLabel = label;
        break;
      }
      value = Math.round(value / amount);
      unitLabel = label;
    }
    if (value <= 0) return 'just now';
    return `${value} ${unitLabel}${value === 1 ? '' : 's'} ago`;
  }

  private showToast(message: string): void {
    this.toast.set(message);
    setTimeout(() => this.toast.set(''), 3000);
  }

  private fail(err: any): void {
    const errors = err?.error?.errors;
    const first = errors ? Object.values(errors).flat()[0] : null;
    this.error.set(String(first || err?.error?.message || 'Something went wrong. Please try again.'));
  }
}
