import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import {
  InventoryFilterOptions,
  InventoryRow,
  InventoryStats,
  StockMovementEntry,
  StockMovementType,
  StockState,
} from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type StateFilter = '' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'reserved' | 'expiring';
type SortValue = 'available_asc' | 'available_desc' | 'value_desc' | 'name_asc' | 'name_desc' | 'updated_desc' | 'expiry_asc';
type BulkAction = 'receive' | 'adjust' | 'restock_to' | 'set_threshold' | 'relocate';

const STATE_LABELS: Record<StockState, string> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
  backorder: 'Backorder',
  untracked: 'Not tracked',
};

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  receipt: 'Received',
  adjustment: 'Adjusted',
  count: 'Counted',
  damage: 'Damaged / written off',
  transfer: 'Transferred',
  return: 'Returned',
  sale: 'Sold',
};

/** Quick-action presets offered in the stock drawer. */
const MOVEMENT_ACTIONS: { type: StockMovementType; label: string; hint: string }[] = [
  { type: 'receipt', label: 'Receive', hint: 'Add units from a delivery or purchase order' },
  { type: 'count', label: 'Stock count', hint: 'Set the balance to a physically counted figure' },
  { type: 'adjustment', label: 'Adjust', hint: 'Correct the balance by a signed amount' },
  { type: 'damage', label: 'Write off', hint: 'Remove damaged, expired or lost units' },
  { type: 'return', label: 'Customer return', hint: 'Put returned units back on the shelf' },
  { type: 'transfer', label: 'Transfer', hint: 'Move units to another location' },
];

@Component({
  selector: 'app-seller-inventory',
  imports: [FormsModule, MoneyPipe, DatePipe, RouterLink],
  template: `
    <div class="inventory-shell">
      <header class="page-head">
        <div>
          <div class="breadcrumbs"><a routerLink="/tenant">Tenant</a><span>/</span><span>Operations</span></div>
          <p class="eyebrow">Stock control</p>
          <h1>Inventory</h1>
          <p class="intro">
            Every stock line across your stores — receive deliveries, correct counts, write off damage and
            keep perishables moving before they expire.
          </p>
        </div>
        <div class="head-actions">
          <button class="btn ghost" type="button" (click)="exportCsv()" [disabled]="!rows().length">⤓ Export CSV</button>
          <button class="btn ghost" type="button" (click)="toggleLedger()">
            {{ showLedger() ? 'Hide' : 'Show' }} stock ledger
          </button>
          <button class="btn primary" type="button" (click)="refresh()" [disabled]="loading()">
            <span class="spin-icon" [class.spinning]="refreshing()">⟳</span> Refresh
          </button>
        </div>
      </header>

      @if (toast()) { <div class="toast" role="status"><span>✓</span>{{ toast() }}</div> }
      @if (error()) {
        <div class="error-banner"><span>!</span><p>{{ error() }}</p><button type="button" (click)="error.set('')">Dismiss</button></div>
      }

      <section class="kpi-grid">
        <article class="metric-card">
          <div class="metric-top"><span class="metric-icon slate">▦</span></div>
          <p>Stock lines</p><h2>{{ stats()?.sku_count ?? 0 }}</h2>
          <small>{{ stats()?.healthy_count ?? 0 }} healthy</small>
        </article>
        <article class="metric-card">
          <div class="metric-top"><span class="metric-icon blue">∑</span></div>
          <p>Units on hand</p><h2>{{ stats()?.units_on_hand ?? 0 }}</h2>
          <small>{{ stats()?.units_reserved ?? 0 }} reserved · {{ stats()?.units_available ?? 0 }} sellable</small>
        </article>
        <article class="metric-card" [class.urgent]="(stats()?.low_stock_count ?? 0) > 0">
          <div class="metric-top">
            <span class="metric-icon amber">⚠</span>
            @if ((stats()?.low_stock_count ?? 0) > 0) { <span class="trend warn">Reorder</span> }
          </div>
          <p>Low stock</p><h2>{{ stats()?.low_stock_count ?? 0 }}</h2>
          <small>At or below reorder point</small>
        </article>
        <article class="metric-card">
          <div class="metric-top"><span class="metric-icon rose">∅</span></div>
          <p>Out of stock</p><h2>{{ stats()?.out_of_stock_count ?? 0 }}</h2>
          <small>Not sellable right now</small>
        </article>
        <article class="metric-card value">
          <div class="metric-top"><span class="metric-icon gold">◈</span></div>
          <p>Stock value</p><h2>{{ stats()?.retail_value ?? 0 | money:'':'symbol':'1.0-0' }}</h2>
          <small>Cost {{ stats()?.cost_value ?? 0 | money:'':'symbol':'1.0-0' }}</small>
        </article>
      </section>

      <nav class="status-tabs" aria-label="Stock filters">
        @for (tab of stateTabs(); track tab.key) {
          <button type="button" [class.active]="stateFilter() === tab.key" (click)="setState(tab.key)">
            {{ tab.label }}
            @if (tab.count !== null) { <span class="tab-count">{{ tab.count }}</span> }
          </button>
        }
        <span class="tab-divider"></span>
        <button type="button" class="chip" [class.active]="stateFilter() === 'expiring'" (click)="setState('expiring')">
          ⏳ Expiring soon <span class="tab-count">{{ stats()?.expiring_count ?? 0 }}</span>
        </button>
      </nav>

      <section class="table-panel panel">
        <div class="table-toolbar">
          <div class="search-box">
            <span>⌕</span>
            <input type="search" placeholder="Search product, SKU, barcode, batch or bin" [(ngModel)]="searchTerm" (ngModelChange)="onSearch($event)" />
            @if (searchTerm) { <button type="button" class="clear-btn" (click)="clearSearch()" aria-label="Clear search">×</button> }
          </div>
          <select [(ngModel)]="storeFilter" (change)="onFilterChange()" aria-label="Filter by store">
            <option value="">All stores</option>
            @for (store of filters()?.stores || []; track store.id) { <option [value]="store.id">{{ store.name }}</option> }
          </select>
          <select [(ngModel)]="locationFilter" (change)="onFilterChange()" aria-label="Filter by location">
            <option value="">All locations</option>
            @for (loc of filters()?.locations || []; track loc) { <option [value]="loc">{{ loc }}</option> }
          </select>
          <select [(ngModel)]="sortValue" (change)="onFilterChange()" aria-label="Sort stock">
            <option value="available_asc">Lowest stock first</option>
            <option value="available_desc">Highest stock first</option>
            <option value="value_desc">Highest value</option>
            <option value="expiry_asc">Expiring soonest</option>
            <option value="name_asc">Product A–Z</option>
            <option value="name_desc">Product Z–A</option>
            <option value="updated_desc">Recently changed</option>
          </select>
          @if (hasFilters()) { <button type="button" class="link-btn" (click)="resetFilters()">Clear filters</button> }
        </div>

        @if (selectedIds().length) {
          <div class="bulk-bar">
            <strong>{{ selectedIds().length }} selected</strong>
            <select [(ngModel)]="bulkAction" aria-label="Bulk action">
              <option value="receive">Receive units</option>
              <option value="adjust">Adjust by</option>
              <option value="restock_to">Restock to level</option>
              <option value="set_threshold">Set reorder point</option>
              <option value="relocate">Move to location</option>
            </select>
            @if (bulkAction === 'relocate') {
              <input type="text" placeholder="Bin / warehouse" [(ngModel)]="bulkLocation" aria-label="Location" />
            } @else {
              <input type="number" [(ngModel)]="bulkQuantity" aria-label="Quantity" />
            }
            <button type="button" class="apply" (click)="applyBulk()" [disabled]="bulkBusy()">Apply</button>
            <button type="button" class="link" (click)="clearSelection()">Clear</button>
          </div>
        }

        @if (loading()) {
          <div class="skeletons">@for (i of [1,2,3,4,5]; track i) { <div class="skeleton-row"></div> }</div>
        } @else if (!rows().length) {
          <div class="empty-state">
            <span class="empty-glyph">▦</span>
            <h3>{{ hasFilters() ? 'No stock lines match those filters' : 'No stock to manage yet' }}</h3>
            <p>
              {{ hasFilters()
                ? 'Try widening the search, or clear the filters to see every stock line.'
                : 'Stock lines appear as soon as you add a product with variants to a store.' }}
            </p>
            @if (hasFilters()) {
              <button class="btn ghost" type="button" (click)="resetFilters()">Clear filters</button>
            } @else {
              <a class="btn primary" routerLink="/tenant/products">Go to catalog</a>
            }
          </div>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th class="pick"><input type="checkbox" [checked]="allSelected()" (change)="toggleAll()" aria-label="Select all" /></th>
                  <th>Product / variant</th>
                  <th>Location</th>
                  <th class="right">On hand</th>
                  <th class="right">Reserved</th>
                  <th>Availability</th>
                  <th class="right">Value</th>
                  <th>Status</th>
                  <th class="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.id) {
                  <tr class="stock-row" (click)="openDrawer(row)">
                    <td class="pick" (click)="$event.stopPropagation()">
                      <input type="checkbox" [checked]="isSelected(row.id)" (change)="toggleOne(row.id)" [attr.aria-label]="'Select ' + (row.product?.name || row.variant?.sku)" />
                    </td>
                    <td>
                      <div class="product-cell">
                        <span class="thumb">
                          @if (row.product?.image) { <img [src]="row.product.image" [alt]="row.product.name" /> } @else { 📦 }
                        </span>
                        <div>
                          <strong>{{ row.product?.name || 'Unnamed product' }}</strong>
                          <small class="mono">{{ row.variant?.sku }}{{ row.variant?.name ? ' · ' + row.variant.name : '' }}</small>
                          <div class="chips">
                            @if (row.store) { <span class="chip-tag">{{ row.store.name }}</span> }
                            @if (row.product?.is_perishable) { <span class="chip-tag cool">Perishable</span> }
                            @if (!row.product?.track_inventory) { <span class="chip-tag">Untracked</span> }
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{{ row.location || '—' }}</strong>
                      <small>
                        {{ row.batch_reference ? 'Batch ' + row.batch_reference : 'No batch' }}
                        @if (row.expires_at) { · exp {{ row.expires_at | date:'mediumDate' }} }
                      </small>
                      @if (row.days_to_expiry !== null && row.days_to_expiry <= 30) {
                        <small [class.expiry-warn]="row.days_to_expiry <= 7">{{ expiryLabel(row) }}</small>
                      }
                    </td>
                    <td class="right"><strong>{{ row.quantity }}</strong><small>{{ row.product?.unit || 'piece' }}</small></td>
                    <td class="right">{{ row.reserved }}</td>
                    <td>
                      <div class="stock-cell">
                        <b>{{ row.available }} sellable</b>
                        <div class="level-bar" [attr.title]="'Reorder point ' + row.low_stock_threshold">
                          <i [class]="row.state" [style.width.%]="fillPercent(row)"></i>
                        </div>
                        <small>Reorder at {{ row.low_stock_threshold }}</small>
                      </div>
                    </td>
                    <td class="right financial-cell">
                      <strong>{{ row.retail_value | money:'':'symbol':'1.0-0' }}</strong>
                      <small>cost {{ row.cost_value | money:'':'symbol':'1.0-0' }}</small>
                    </td>
                    <td><span class="stock-pill" [class]="row.state">{{ stateLabel(row.state) }}</span></td>
                    <td class="right" (click)="$event.stopPropagation()">
                      <button class="row-btn" type="button" (click)="openDrawer(row, 'receipt')">Receive</button>
                      <button class="row-btn ghost" type="button" (click)="openDrawer(row, 'count')">Count</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="table-foot">
            <span>
              Showing {{ rows().length }} of {{ total() }} stock lines
              @if (lastPage() > 1) { · page {{ page() }} of {{ lastPage() }} }
            </span>
            @if (lastPage() > 1) {
              <div class="pager">
                <button type="button" (click)="goToPage(page() - 1)" [disabled]="page() === 1">‹ Prev</button>
                <button type="button" (click)="goToPage(page() + 1)" [disabled]="page() === lastPage()">Next ›</button>
              </div>
            }
          </div>
        }
      </section>

      @if (showLedger()) {
        <section class="panel ledger-panel">
          <div class="panel-head">
            <div><p class="overline">Audit trail</p><h3>Recent stock movements</h3></div>
            <button class="btn ghost small" type="button" (click)="loadMovements()">Reload</button>
          </div>
          @if (!movements().length) {
            <p class="muted pad">No stock movements recorded yet.</p>
          } @else {
            <ul class="movement-list">
              @for (m of movements(); track m.id) {
                <li>
                  <span class="move-badge" [class]="m.quantity >= 0 ? 'in' : 'out'">{{ m.quantity >= 0 ? '+' : '' }}{{ m.quantity }}</span>
                  <div>
                    <strong>{{ movementLabel(m.type) }} · {{ m.product_name || 'Variant ' + m.variant_id }}</strong>
                    <small>
                      {{ m.sku }} · {{ m.quantity_before }} → {{ m.quantity_after }}
                      @if (m.note) { · {{ m.note }} }
                      @if (m.actor) { · by {{ m.actor }} }
                    </small>
                  </div>
                  <time>{{ m.created_at | date:'MMM d, HH:mm' }}</time>
                </li>
              }
            </ul>
          }
        </section>
      }
    </div>

    @if (drawerRow(); as row) {
      <div class="drawer-backdrop" (click)="closeDrawer()"></div>
      <aside class="drawer" role="dialog" aria-label="Stock line">
        <header class="drawer-head">
          <div>
            <p class="overline">{{ row.store?.name || 'Stock line' }}</p>
            <h2>{{ row.product?.name || 'Unnamed product' }}</h2>
            <p class="mono muted">{{ row.variant?.sku }}{{ row.variant?.name ? ' · ' + row.variant.name : '' }}</p>
          </div>
          <button class="icon-btn" type="button" (click)="closeDrawer()" aria-label="Close">×</button>
        </header>

        <div class="drawer-stats">
          <div><p>On hand</p><strong>{{ row.quantity }}</strong></div>
          <div><p>Reserved</p><strong>{{ row.reserved }}</strong></div>
          <div><p>Sellable</p><strong>{{ row.available }}</strong></div>
          <div><p>Reorder at</p><strong>{{ row.low_stock_threshold }}</strong></div>
        </div>

        <div class="drawer-body">
          <h4>Record a movement</h4>
          <div class="action-tabs">
            @for (action of movementActions; track action.type) {
              <button type="button" [class.on]="form.type === action.type" (click)="selectAction(action.type)">{{ action.label }}</button>
            }
          </div>
          <p class="hint">{{ actionHint() }}</p>

          <form (ngSubmit)="submitMovement(row)">
            <div class="field-row">
              <label>
                <span>{{ form.type === 'count' ? 'Counted quantity' : 'Quantity' }}</span>
                <input type="number" [(ngModel)]="form.quantity" name="quantity" required />
              </label>
              <label>
                <span>Reference</span>
                <input type="text" [(ngModel)]="form.reference" name="reference" placeholder="PO-1042" />
              </label>
            </div>
            <div class="field-row">
              <label>
                <span>Location</span>
                <input type="text" [(ngModel)]="form.location" name="location" placeholder="Main warehouse" />
              </label>
              <label>
                <span>Reorder point</span>
                <input type="number" min="0" [(ngModel)]="form.low_stock_threshold" name="low_stock_threshold" />
              </label>
            </div>
            @if (row.product?.is_perishable || form.type === 'receipt') {
              <div class="field-row">
                <label><span>Batch</span><input type="text" [(ngModel)]="form.batch_reference" name="batch_reference" /></label>
                <label><span>Expires</span><input type="date" [(ngModel)]="form.expires_at" name="expires_at" /></label>
              </div>
            }
            <label class="full"><span>Note</span><input type="text" [(ngModel)]="form.note" name="note" placeholder="Why is this changing?" /></label>

            <p class="preview">
              New balance: <strong>{{ previewBalance(row) }}</strong>
              <span class="muted">(from {{ row.quantity }})</span>
            </p>
            <div class="drawer-actions">
              <button class="btn ghost" type="button" (click)="closeDrawer()">Cancel</button>
              <button class="btn primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Apply movement' }}</button>
            </div>
          </form>

          <h4>History</h4>
          @if (!rowMovements().length) {
            <p class="muted">No movements recorded for this stock line yet.</p>
          } @else {
            <ul class="movement-list compact">
              @for (m of rowMovements(); track m.id) {
                <li>
                  <span class="move-badge" [class]="m.quantity >= 0 ? 'in' : 'out'">{{ m.quantity >= 0 ? '+' : '' }}{{ m.quantity }}</span>
                  <div>
                    <strong>{{ movementLabel(m.type) }}</strong>
                    <small>{{ m.quantity_before }} → {{ m.quantity_after }}@if (m.note) { · {{ m.note }} }</small>
                  </div>
                  <time>{{ m.created_at | date:'MMM d' }}</time>
                </li>
              }
            </ul>
          }
        </div>
      </aside>
    }
  `,
})
export class SellerInventoryComponent {
  private api = inject(ApiService);

  readonly movementActions = MOVEMENT_ACTIONS;

  rows = signal<InventoryRow[]>([]);
  stats = signal<InventoryStats | null>(null);
  filters = signal<InventoryFilterOptions | null>(null);
  movements = signal<StockMovementEntry[]>([]);
  rowMovements = signal<StockMovementEntry[]>([]);

  loading = signal(true);
  refreshing = signal(false);
  saving = signal(false);
  bulkBusy = signal(false);
  error = signal('');
  toast = signal('');

  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  stateFilter = signal<StateFilter>('');
  selectedIds = signal<number[]>([]);
  drawerRow = signal<InventoryRow | null>(null);
  showLedger = signal(false);

  searchTerm = '';
  storeFilter = '';
  locationFilter = '';
  sortValue: SortValue = 'available_asc';

  bulkAction: BulkAction = 'receive';
  bulkQuantity = 10;
  bulkLocation = '';

  form = {
    type: 'receipt' as StockMovementType,
    quantity: 1,
    reference: '',
    location: '',
    note: '',
    low_stock_threshold: null as number | null,
    batch_reference: '',
    expires_at: '',
  };

  private search$ = new Subject<string>();

  allSelected = computed(() => this.rows().length > 0 && this.selectedIds().length === this.rows().length);

  stateTabs = computed(() => {
    const s = this.stats();
    return [
      { key: '' as StateFilter, label: 'All stock', count: s?.sku_count ?? 0 },
      { key: 'in_stock' as StateFilter, label: 'Healthy', count: s?.healthy_count ?? 0 },
      { key: 'low_stock' as StateFilter, label: 'Low stock', count: s?.low_stock_count ?? 0 },
      { key: 'out_of_stock' as StateFilter, label: 'Out of stock', count: s?.out_of_stock_count ?? 0 },
      { key: 'reserved' as StateFilter, label: 'Reserved', count: null as number | null },
    ];
  });

  constructor() {
    this.search$
      .pipe(debounceTime(320), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
    this.load();
  }

  // ---------------------------------------------------------------- loading

  private load(): void {
    this.loading.set(true);
    this.api
      .tenantInventory(this.params())
      .pipe(finalize(() => {
        this.loading.set(false);
        this.refreshing.set(false);
      }))
      .subscribe({
        next: (res) => {
          this.rows.set(res.data);
          this.stats.set(res.stats);
          this.filters.set(res.filters);
          this.lastPage.set(res.meta.last_page);
          this.total.set(res.meta.total);
          this.selectedIds.set([]);
        },
        error: (err) => this.fail(err),
      });
  }

  private params(): Record<string, string | number> {
    const params: Record<string, string | number> = {
      page: this.page(),
      per_page: 20,
      sort: this.sortValue,
    };
    if (this.searchTerm.trim()) params['q'] = this.searchTerm.trim();
    if (this.stateFilter()) params['state'] = this.stateFilter();
    if (this.storeFilter) params['store_id'] = this.storeFilter;
    if (this.locationFilter) params['location'] = this.locationFilter;
    return params;
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load();
    if (this.showLedger()) this.loadMovements();
  }

  loadMovements(): void {
    this.api.inventoryMovements({ limit: 40 }).subscribe({
      next: (res) => this.movements.set(res.data),
      error: () => undefined,
    });
  }

  toggleLedger(): void {
    this.showLedger.update((v) => !v);
    if (this.showLedger() && !this.movements().length) this.loadMovements();
  }

  // ---------------------------------------------------------------- filters

  onSearch(value: string): void {
    this.search$.next(value);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.page.set(1);
    this.load();
  }

  setState(key: StateFilter): void {
    this.stateFilter.set(this.stateFilter() === key && key === 'expiring' ? '' : key);
    this.page.set(1);
    this.load();
  }

  onFilterChange(): void {
    this.page.set(1);
    this.load();
  }

  hasFilters(): boolean {
    return !!(this.searchTerm.trim() || this.stateFilter() || this.storeFilter || this.locationFilter);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.storeFilter = '';
    this.locationFilter = '';
    this.stateFilter.set('');
    this.sortValue = 'available_asc';
    this.page.set(1);
    this.load();
  }

  goToPage(target: number): void {
    if (target < 1 || target > this.lastPage()) return;
    this.page.set(target);
    this.load();
  }

  // -------------------------------------------------------------- selection

  isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  toggleOne(id: number): void {
    this.selectedIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  toggleAll(): void {
    this.selectedIds.set(this.allSelected() ? [] : this.rows().map((r) => r.id));
  }

  clearSelection(): void {
    this.selectedIds.set([]);
  }

  applyBulk(): void {
    const ids = this.selectedIds();
    if (!ids.length) return;
    this.bulkBusy.set(true);
    this.api
      .bulkInventory({
        ids,
        action: this.bulkAction,
        quantity: this.bulkAction === 'relocate' ? undefined : Number(this.bulkQuantity),
        location: this.bulkAction === 'relocate' ? this.bulkLocation : undefined,
        note: 'Bulk action from the inventory workspace',
      })
      .pipe(finalize(() => this.bulkBusy.set(false)))
      .subscribe({
        next: (res) => {
          this.showToast(`${res.data.affected} stock line${res.data.affected === 1 ? '' : 's'} updated`);
          this.load();
          if (this.showLedger()) this.loadMovements();
        },
        error: (err) => this.fail(err),
      });
  }

  // ----------------------------------------------------------------- drawer

  openDrawer(row: InventoryRow, type: StockMovementType = 'receipt'): void {
    this.drawerRow.set(row);
    this.rowMovements.set([]);
    this.form = {
      type,
      quantity: type === 'count' ? row.quantity : Math.max(1, row.reorder_suggestion || 10),
      reference: '',
      location: row.location || '',
      note: '',
      low_stock_threshold: row.low_stock_threshold,
      batch_reference: row.batch_reference || '',
      expires_at: row.expires_at || '',
    };
    this.api.inventoryMovements({ variant_id: row.variant_id, limit: 12 }).subscribe({
      next: (res) => this.rowMovements.set(res.data),
      error: () => undefined,
    });
  }

  closeDrawer(): void {
    this.drawerRow.set(null);
  }

  selectAction(type: StockMovementType): void {
    const row = this.drawerRow();
    this.form.type = type;
    if (row) this.form.quantity = type === 'count' ? row.quantity : Math.max(1, row.reorder_suggestion || 10);
  }

  actionHint(): string {
    return MOVEMENT_ACTIONS.find((a) => a.type === this.form.type)?.hint ?? '';
  }

  /** What the on-hand balance becomes if the drawer form is submitted. */
  previewBalance(row: InventoryRow): number {
    const qty = Number(this.form.quantity) || 0;
    if (this.form.type === 'count') return Math.max(0, qty);
    if (this.form.type === 'damage') return Math.max(0, row.quantity - Math.abs(qty));
    if (this.form.type === 'receipt' || this.form.type === 'return') return row.quantity + Math.abs(qty);
    return Math.max(0, row.quantity + qty);
  }

  submitMovement(row: InventoryRow): void {
    this.saving.set(true);
    this.api
      .adjustInventory(row.id, {
        type: this.form.type,
        quantity: Number(this.form.quantity) || 0,
        reference: this.form.reference || null,
        note: this.form.note || null,
        location: this.form.location || null,
        low_stock_threshold: this.form.low_stock_threshold,
        batch_reference: this.form.batch_reference || null,
        expires_at: this.form.expires_at || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (res) => {
          this.showToast(`${MOVEMENT_LABELS[this.form.type]} — ${row.product?.name || 'stock line'} now at ${res.data.quantity}`);
          this.drawerRow.set(res.data);
          this.rows.update((rows) => rows.map((r) => (r.id === res.data.id ? res.data : r)));
          this.openDrawer(res.data, this.form.type);
          this.load();
          if (this.showLedger()) this.loadMovements();
        },
        error: (err) => this.fail(err),
      });
  }

  // ---------------------------------------------------------------- helpers

  stateLabel(state: StockState): string {
    return STATE_LABELS[state] ?? state;
  }

  movementLabel(type: StockMovementType): string {
    return MOVEMENT_LABELS[type] ?? type;
  }

  /** Stock level as a share of three times the reorder point (a full shelf). */
  fillPercent(row: InventoryRow): number {
    const target = Math.max(row.low_stock_threshold * 3, row.available, 1);
    return Math.min(100, Math.round((row.available / target) * 100));
  }

  expiryLabel(row: InventoryRow): string {
    const days = row.days_to_expiry;
    if (days === null) return '';
    if (days < 0) return `Expired ${Math.abs(days)}d ago`;
    if (days === 0) return 'Expires today';
    return `Expires in ${days}d`;
  }

  exportCsv(): void {
    const rows: (string | number)[][] = [
      ['SKU', 'Product', 'Variant', 'Store', 'Location', 'Batch', 'Expires', 'On hand', 'Reserved', 'Available', 'Reorder point', 'Unit cost', 'Unit price', 'Stock value', 'Status'],
      ...this.rows().map((r) => [
        r.variant?.sku || '',
        r.product?.name || '',
        r.variant?.name || '',
        r.store?.name || '',
        r.location || '',
        r.batch_reference || '',
        r.expires_at || '',
        r.quantity,
        r.reserved,
        r.available,
        r.low_stock_threshold,
        r.unit_cost,
        r.unit_price,
        r.retail_value,
        this.stateLabel(r.state),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
