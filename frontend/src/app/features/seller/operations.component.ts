import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { DeptDashboard, DeptKpi } from '../../core/models';
import { MhChartComponent } from '../../shared/mh-chart.component';

type OperationsPage = 'overview' | 'fulfillment' | 'inventory' | 'catalog';

@Component({
  selector: 'app-seller-operations',
  imports: [CurrencyPipe, DatePipe, NgTemplateOutlet, FormsModule, RouterLink, MhChartComponent],
  template: `
    <div class="workspace ops-workspace">
      <header class="workspace-head">
        <div>
          <div class="breadcrumbs"><a [routerLink]="tenantLink()">Workspace</a><span>/</span><span>Operations</span><span>/</span><b>{{ pageTitle() }}</b></div>
          <p class="eyebrow">Operations control room</p>
          <h1>{{ pageTitle() }}</h1>
          <p class="intro">{{ pageDescription() }}</p>
        </div>
        <div class="head-actions">
          @if (page() === 'overview' || page() === 'fulfillment') { <a class="btn primary" [routerLink]="operationsLink('operations/fulfillment')">Open fulfilment queue</a> }
          @if (page() === 'inventory') { <a class="btn primary" [routerLink]="tenantLink('products')">Manage products</a> }
          @if (page() === 'catalog') { <a class="btn primary" [routerLink]="tenantLink('products')">+ Add product</a> }
        </div>
      </header>

      <nav class="workspace-tabs" aria-label="Operations pages">
        @for (item of sections; track item.key) { <a [routerLink]="operationsLink(item.path)" [class.active]="page() === item.key">{{ item.label }}</a> }
      </nav>

      @if (toast()) { <div class="workspace-toast" role="status">✓ {{ toast() }}</div> }
      @if (error()) { <div class="workspace-error"><b>!</b><span>{{ error() }}</span><button (click)="error.set('')">Dismiss</button></div> }

      @if (loading()) {
        <div class="workspace-loading">@for (n of [1,2,3,4]; track n) { <div class="skeleton"></div> }</div>
      } @else {
        @switch (page()) {
          @case ('overview') {
            @if (dashboard(); as d) {
              <section class="metric-grid">
                @for (kpi of d.kpis; track kpi.key) {
                  <article class="metric"><span class="metric-mark">{{ metricIcon(kpi.key) }}</span><p>{{ kpi.label }}</p><h2>{{ format(kpi) }}</h2><small>{{ metricNote(kpi.key) }}</small></article>
                }
              </section>
              <section class="workspace-columns">
                <article class="panel wide"><div class="panel-title"><div><p class="overline">Live health</p><h3>Operational performance</h3></div><span class="status-chip good">On watch</span></div>
                  <div class="goals">@for (goal of d.progress; track goal.label) { <div class="goal"><div><b>{{ goal.label }}</b><span>{{ goal.current }} / {{ goal.target }}</span></div><div class="progress"><i [style.width.%]="goal.percent"></i></div><small>{{ goal.percent }}% of target</small></div> }</div>
                </article>
                <article class="panel quick"><p class="overline">Quick access</p><h3>Move work forward</h3>
                  <a [routerLink]="operationsLink('operations/fulfillment')"><span>→</span><div><b>Process orders</b><small>Pick, pack and ship</small></div></a>
                  <a [routerLink]="operationsLink('operations/inventory')"><span>!</span><div><b>Review inventory</b><small>Resolve low-stock alerts</small></div></a>
                  <a [routerLink]="operationsLink('operations/catalog')"><span>◇</span><div><b>Catalogue health</b><small>Review active products</small></div></a>
                </article>
              </section>
              <section class="chart-grid">@for (chart of d.charts; track chart.title) { <app-mh-chart [chart]="chart" /> }</section>
              @if (d.table; as table) { <section class="panel table-panel"><div class="panel-title"><div><p class="overline">Exceptions</p><h3>{{ table.title }}</h3></div><a [routerLink]="operationsLink('operations/inventory')">Review inventory →</a></div><ng-container [ngTemplateOutlet]="dataTable" [ngTemplateOutletContext]="{ table: table }" /></section> }
            }
          }
          @case ('fulfillment') {
            <section class="summary-strip">
              @for (status of fulfillmentStatuses; track status.key) { <button [class.active]="orderFilter === status.key" (click)="orderFilter = status.key"><span>{{ status.label }}</span><b>{{ orderCount(status.key) }}</b></button> }
            </section>
            <section class="panel list-panel">
              <div class="panel-title"><div><p class="overline">Order flow</p><h3>Fulfilment queue</h3></div><label class="search-box">⌕ <input [(ngModel)]="query" placeholder="Search order or item" /></label></div>
              @for (order of filteredOrders(); track order.id) {
                <article class="order-row">
                  <div class="order-id"><span>#{{ order.id }}</span><small>{{ order.created_at ? (order.created_at | date:'MMM d, h:mm a') : 'Ready for review' }}</small></div>
                  <div class="order-items"><b>{{ order.items?.[0]?.product_name || 'Order items' }}</b><small>{{ order.items?.length || 0 }} line item{{ order.items?.length === 1 ? '' : 's' }}</small></div>
                  <div><b>{{ +order.subtotal | currency }}</b><span [class]="'status-chip ' + statusTone(order.status)">{{ pretty(order.status) }}</span></div>
                  <div class="row-actions">
                    @if (order.status === 'awaiting_fulfillment') { <button class="btn small primary" (click)="move(order, 'processing')">Start picking</button> }
                    @if (order.status === 'processing') { <button class="btn small primary" (click)="move(order, 'shipped')">Mark shipped</button> }
                    @if (order.status === 'shipped') { <button class="btn small primary" (click)="move(order, 'delivered')">Mark delivered</button> }
                    @if (['delivered','completed'].includes(order.status)) { <span class="complete">✓ Complete</span> }
                  </div>
                </article>
              } @empty { <div class="empty-state"><b>Queue is clear</b><p>No orders match this view.</p></div> }
            </section>
          }
          @case ('inventory') {
            <section class="metric-grid compact">
              <article class="metric"><p>SKUs tracked</p><h2>{{ inventoryRows().length }}</h2><small>Across your product catalogue</small></article>
              <article class="metric warning"><p>Low stock</p><h2>{{ lowStockCount() }}</h2><small>At or below reorder threshold</small></article>
              <article class="metric"><p>Available units</p><h2>{{ availableUnits() }}</h2><small>On hand less reserved</small></article>
              <article class="metric"><p>In-stock rate</p><h2>{{ inStockRate() }}%</h2><small>SKUs above their threshold</small></article>
            </section>
            <section class="panel list-panel"><div class="panel-title"><div><p class="overline">Stock control</p><h3>Inventory register</h3></div><label class="search-box">⌕ <input [(ngModel)]="query" placeholder="Search product or SKU" /></label></div>
              <div class="data-table"><table><thead><tr><th>Product / SKU</th><th>On hand</th><th>Reserved</th><th>Available</th><th>Threshold</th><th>Status</th></tr></thead><tbody>
                @for (row of filteredInventory(); track row.id) { <tr><td><b>{{ row.product }}</b><small>{{ row.sku }}</small></td><td>{{ row.quantity }}</td><td>{{ row.reserved }}</td><td><b>{{ row.available }}</b></td><td>{{ row.threshold }}</td><td><span [class]="'status-chip ' + (row.low ? 'danger' : 'good')">{{ row.low ? 'Low stock' : 'Healthy' }}</span></td></tr> }
              </tbody></table></div>
              @if (!filteredInventory().length) { <div class="empty-state"><b>No inventory found</b><p>Add product variants to begin tracking stock.</p></div> }
            </section>
          }
          @case ('catalog') {
            <section class="summary-strip catalogue-summary"><button class="active"><span>All products</span><b>{{ products().length }}</b></button><button><span>Active</span><b>{{ productCount('active') }}</b></button><button><span>Draft</span><b>{{ productCount('draft') }}</b></button><button><span>Archived</span><b>{{ productCount('archived') }}</b></button></section>
            <section class="panel list-panel"><div class="panel-title"><div><p class="overline">Merchandising</p><h3>Catalogue health</h3></div><label class="search-box">⌕ <input [(ngModel)]="query" placeholder="Search catalogue" /></label></div>
              @for (product of filteredProducts(); track product.id) { <article class="product-row"><span class="product-avatar">{{ initials(product.name) }}</span><div><b>{{ product.name }}</b><small>{{ product.store?.name || 'No store' }} · {{ product.variants?.[0]?.sku || 'No SKU' }}</small></div><b>{{ +product.price | currency }}</b><span [class]="'status-chip ' + statusTone(product.status)">{{ pretty(product.status) }}</span><button class="btn small ghost" (click)="toggleProduct(product)">{{ product.status === 'active' ? 'Archive' : 'Activate' }}</button></article> } @empty { <div class="empty-state"><b>No products found</b><p>Adjust your search or add your first product.</p></div> }
            </section>
          }
        }
      }
    </div>

    <ng-template #dataTable let-table="table"><div class="data-table"><table><thead><tr>@for (column of table.columns; track column) { <th>{{ column }}</th> }</tr></thead><tbody>@for (row of table.rows; track $index) { <tr>@for (cell of row; track $index) { <td>{{ cell }}</td> }</tr> }</tbody></table></div>@if (!table.rows.length) { <div class="empty-state">No exceptions need attention.</div> }</ng-template>
  `,
})
export class SellerOperationsComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  page = signal<OperationsPage>('overview');
  dashboard = signal<DeptDashboard | null>(null);
  orders = signal<any[]>([]);
  products = signal<any[]>([]);
  loading = signal(true);
  error = signal('');
  toast = signal('');
  query = '';
  orderFilter = 'open';

  readonly sections = [
    { key: 'overview' as const, label: 'Overview', path: 'departments/operations' },
    { key: 'fulfillment' as const, label: 'Fulfilment', path: 'operations/fulfillment' },
    { key: 'inventory' as const, label: 'Inventory', path: 'operations/inventory' },
    { key: 'catalog' as const, label: 'Catalogue', path: 'operations/catalog' },
  ];
  readonly fulfillmentStatuses = [{ key: 'open', label: 'Open queue' }, { key: 'awaiting_fulfillment', label: 'Awaiting' }, { key: 'processing', label: 'Processing' }, { key: 'shipped', label: 'In transit' }, { key: 'completed', label: 'Completed' }];

  inventoryRows = computed(() => this.products().flatMap((product) => (product.variants || []).map((variant: any) => {
    const inventory = variant.inventory || {};
    const quantity = +(inventory.quantity || 0), reserved = +(inventory.reserved || 0), threshold = +(inventory.low_stock_threshold || 0), available = quantity - reserved;
    return { id: variant.id, product: product.name, sku: variant.sku || `VAR-${variant.id}`, quantity, reserved, available, threshold, low: available <= threshold };
  })));
  lowStockCount = computed(() => this.inventoryRows().filter((row) => row.low).length);
  availableUnits = computed(() => this.inventoryRows().reduce((sum, row) => sum + row.available, 0));
  inStockRate = computed(() => this.inventoryRows().length ? Math.round((1 - this.lowStockCount() / this.inventoryRows().length) * 100) : 100);

  constructor() {
    this.route.data.subscribe((data) => { this.page.set((data['page'] as OperationsPage) || 'overview'); this.query = ''; this.load(); });
  }

  pageTitle(): string { return ({ overview: 'Operations overview', fulfillment: 'Fulfilment queue', inventory: 'Inventory control', catalog: 'Catalogue health' } as Record<OperationsPage, string>)[this.page()]; }
  pageDescription(): string { return ({ overview: 'Monitor fulfilment, stock health and catalogue readiness from one control room.', fulfillment: 'Move every order from awaiting fulfilment to delivery with a clear, accountable workflow.', inventory: 'Track availability, reserved units and reorder risk across every SKU.', catalog: 'Keep active, draft and archived products organised and ready to sell.' } as Record<OperationsPage, string>)[this.page()]; }
  tenantLink(path = ''): string { const base = this.router.url.startsWith('/seller') ? '/seller' : '/tenant'; return path ? `${base}/${path}` : base; }
  operationsLink(path: string): string { return this.tenantLink(path); }

  private load(): void {
    this.loading.set(true); this.error.set('');
    const request: any = this.page() === 'overview' ? this.api.departmentDashboard('operations') : this.page() === 'fulfillment' ? this.api.sellerOrders({ per_page: 100 }) : this.api.sellerProducts({ per_page: 100 });
    request.subscribe({ next: (res: any) => { if (this.page() === 'overview') this.dashboard.set(res.data); else if (this.page() === 'fulfillment') this.orders.set(res.data); else this.products.set(res.data); this.loading.set(false); }, error: () => { this.error.set('We could not load operations data. Please try again.'); this.loading.set(false); } });
  }

  filteredOrders(): any[] { const q = this.query.toLowerCase(); return this.orders().filter((order) => (this.orderFilter === 'open' ? ['awaiting_fulfillment','processing','shipped'].includes(order.status) : this.orderFilter === 'completed' ? ['delivered','completed'].includes(order.status) : order.status === this.orderFilter) && (`${order.id} ${(order.items || []).map((i: any) => i.product_name).join(' ')}`).toLowerCase().includes(q)); }
  orderCount(status: string): number { return this.orders().filter((o) => status === 'open' ? ['awaiting_fulfillment','processing','shipped'].includes(o.status) : status === 'completed' ? ['delivered','completed'].includes(o.status) : o.status === status).length; }
  filteredInventory() { const q = this.query.toLowerCase(); return this.inventoryRows().filter((row) => `${row.product} ${row.sku}`.toLowerCase().includes(q)); }
  filteredProducts(): any[] { const q = this.query.toLowerCase(); return this.products().filter((p) => `${p.name} ${p.store?.name || ''} ${p.variants?.[0]?.sku || ''}`.toLowerCase().includes(q)); }
  productCount(status: string): number { return this.products().filter((p) => p.status === status).length; }

  move(order: any, status: string): void { this.api.updateSellerOrderStatus(order.id, status).subscribe({ next: () => { this.showToast(`Order #${order.id} moved to ${this.pretty(status)}`); this.load(); }, error: () => this.error.set('The order could not be updated.') }); }
  toggleProduct(product: any): void { const status = product.status === 'active' ? 'archived' : 'active'; this.api.updateProduct(product.id, { status }).subscribe({ next: () => { this.showToast(`${product.name} is now ${status}`); this.load(); }, error: () => this.error.set('The product could not be updated.') }); }
  showToast(message: string): void { this.toast.set(message); setTimeout(() => this.toast.set(''), 3000); }
  format(kpi: DeptKpi): string { if (kpi.format === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(+kpi.value); if (kpi.format === 'percent') return `${kpi.value}%`; return new Intl.NumberFormat().format(+kpi.value); }
  metricIcon(key: string): string { return key === 'low_stock' ? '!' : key === 'units' ? '▦' : key === 'shipped' ? '→' : '✓'; }
  metricNote(key: string): string { return key === 'low_stock' ? 'Requires replenishment' : key === 'units' ? 'Available inventory' : key === 'shipped' ? 'Orders moving to customers' : 'Orders waiting for action'; }
  statusTone(status: string): string { return ['active','delivered','completed'].includes(status) ? 'good' : ['archived','cancelled'].includes(status) ? 'danger' : status === 'draft' ? 'neutral' : 'warning'; }
  pretty(value: string): string { return (value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
  initials(name: string): string { return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase(); }
}
