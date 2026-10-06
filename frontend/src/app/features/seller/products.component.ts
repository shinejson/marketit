import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import {
  ProductBulkAction,
  ProductCatalogMeta,
  ProductCatalogStats,
  ProductPreset,
  ProductSpecField,
  ProductStatus,
  ProductStockState,
  TenantProduct,
  TenantProductImage,
} from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type ViewMode = 'table' | 'grid';
type EditorTab = 'overview' | 'pricing' | 'inventory' | 'specs' | 'logistics' | 'media' | 'seo';
type StatusFilter = ProductStatus | '';

/** One row of the variant matrix while the editor is open. */
interface VariantDraft {
  id?: number;
  sku: string;
  label: string;
  options: Record<string, string>;
  price_override: number | null;
  cost_price: number | null;
  barcode: string;
  quantity: number;
  low_stock_threshold: number | null;
  batch_reference: string;
  expires_at: string;
  status: 'active' | 'inactive';
}

interface OptionDraft {
  name: string;
  values: string[];
  input: string;
}

interface SpecRow {
  key: string;
  value: string;
}

const STOCK_LABELS: Record<ProductStockState, string> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
  backorder: 'On backorder',
  untracked: 'Not tracked',
};

const PRESET_GLYPHS: Record<string, string> = {
  fashion: '👗',
  grocery: '🍋',
  electronics: '🎧',
  beauty: '✨',
  home: '🏺',
  digital: '⤓',
  service: '🛠',
  general: '📦',
};

@Component({
  selector: 'app-seller-products',
  imports: [FormsModule, MoneyPipe, RouterLink],
  template: `
    <div class="catalog-shell">
      <header class="page-head">
        <div>
          <div class="breadcrumbs"><a routerLink="/tenant">Tenant</a><span>/</span><span>Catalog</span></div>
          <p class="eyebrow">Catalog</p>
          <h1>Products</h1>
          <p class="intro">
            Every listing across your storefronts — clothing with size and colour runs, fresh produce sold by weight,
            gadgets with warranties, downloads and bookable services.
          </p>
        </div>
        <div class="head-actions">
          <button class="btn ghost" type="button" (click)="exportCsv()" [disabled]="!products().length">⤓ Export CSV</button>
          <button class="btn ghost" type="button" (click)="refresh()" [disabled]="loading()">
            <span class="spin-icon" [class.spinning]="refreshing()">⟳</span> Refresh
          </button>
          <button class="btn primary" type="button" (click)="openCreate()" [disabled]="!stores().length">＋ New product</button>
        </div>
      </header>

      @if (toast()) { <div class="toast" role="status"><span>✓</span>{{ toast() }}</div> }
      @if (error()) {
        <div class="error-banner"><span>!</span><p>{{ error() }}</p><button type="button" (click)="error.set('')">Dismiss</button></div>
      }

      @if (!stores().length && !loading()) {
        <section class="setup-card">
          <span class="setup-glyph">◇</span>
          <div>
            <h2>Create a storefront first</h2>
            <p>Products always belong to a store — that is what gives them a public URL, a currency and a delivery policy.</p>
          </div>
          <a class="btn primary" routerLink="/tenant/stores">Create store</a>
        </section>
      }

      <section class="kpi-grid">
        <article class="metric-card">
          <div class="metric-top"><span class="metric-icon slate">▦</span></div>
          <p>Listings</p><h2>{{ stats()?.total_count ?? 0 }}</h2>
          <small>{{ stats()?.active_count ?? 0 }} live · {{ stats()?.draft_count ?? 0 }} draft</small>
        </article>
        <article class="metric-card" [class.urgent]="(stats()?.low_stock_count ?? 0) > 0">
          <div class="metric-top"><span class="metric-icon amber">⚠</span>
            @if ((stats()?.low_stock_count ?? 0) > 0) { <span class="trend warn">Reorder</span> }
          </div>
          <p>Low stock</p><h2>{{ stats()?.low_stock_count ?? 0 }}</h2>
          <small>At or below their threshold</small>
        </article>
        <article class="metric-card">
          <div class="metric-top"><span class="metric-icon rose">∅</span></div>
          <p>Out of stock</p><h2>{{ stats()?.out_of_stock_count ?? 0 }}</h2>
          <small>Not sellable right now</small>
        </article>
        <article class="metric-card">
          <div class="metric-top"><span class="metric-icon blue">∑</span></div>
          <p>Units on hand</p><h2>{{ stats()?.total_units ?? 0 }}</h2>
          <small>Across every variant</small>
        </article>
        <article class="metric-card value">
          <div class="metric-top"><span class="metric-icon gold">◈</span></div>
          <p>Retail stock value</p><h2>{{ stats()?.retail_value ?? 0 | money:currency():'symbol':'1.0-0' }}</h2>
          <small>Cost {{ stats()?.inventory_cost ?? 0 | money:currency():'symbol':'1.0-0' }}</small>
        </article>
      </section>

      <nav class="status-tabs" aria-label="Catalog filters">
        @for (tab of statusTabs(); track tab.key) {
          <button type="button" [class.active]="statusFilter() === tab.key" (click)="setStatus(tab.key)">
            {{ tab.label }} <span class="tab-count">{{ tab.count }}</span>
          </button>
        }
        <span class="tab-divider"></span>
        <button type="button" class="chip" [class.active]="stockFilter() === 'low_stock'" (click)="toggleStock('low_stock')">⚠ Low stock</button>
        <button type="button" class="chip" [class.active]="stockFilter() === 'out_of_stock'" (click)="toggleStock('out_of_stock')">∅ Out of stock</button>
        <button type="button" class="chip" [class.active]="featuredOnly()" (click)="toggleFeatured()">★ Featured</button>
      </nav>

      <section class="table-panel panel">
        <div class="table-toolbar">
          <div class="search-box">
            <span>⌕</span>
            <input type="search" placeholder="Search name, brand, SKU or barcode" [(ngModel)]="searchTerm" (ngModelChange)="onSearch($event)" />
            @if (searchTerm) { <button type="button" class="clear-btn" (click)="clearSearch()" aria-label="Clear search">×</button> }
          </div>
          <select [(ngModel)]="storeFilter" (change)="onFilterChange()" aria-label="Filter by store">
            <option value="">All stores</option>
            @for (store of stores(); track store.id) { <option [value]="store.id">{{ store.name }}</option> }
          </select>
          <select [(ngModel)]="presetFilter" (change)="onFilterChange()" aria-label="Filter by category type">
            <option value="">All categories</option>
            @for (preset of presets(); track preset.key) { <option [value]="preset.key">{{ preset.label }}</option> }
          </select>
          <select [(ngModel)]="categoryFilter" (change)="onFilterChange()" aria-label="Filter by collection">
            <option value="">All collections</option>
            @for (cat of categories(); track cat.id) { <option [value]="cat.id">{{ cat.name }}</option> }
          </select>
          <select [(ngModel)]="typeFilter" (change)="onFilterChange()" aria-label="Filter by product type">
            <option value="">Any type</option>
            <option value="physical">Physical</option>
            <option value="digital">Digital</option>
            <option value="service">Service</option>
          </select>
          <select [(ngModel)]="sortValue" (change)="onSortChange()" aria-label="Sort products">
            <option value="created_at:desc">Newest first</option>
            <option value="created_at:asc">Oldest first</option>
            <option value="name:asc">Name A–Z</option>
            <option value="name:desc">Name Z–A</option>
            <option value="price:desc">Price high → low</option>
            <option value="price:asc">Price low → high</option>
            <option value="updated_at:desc">Recently updated</option>
          </select>
          <div class="view-toggle" role="group" aria-label="View mode">
            <button type="button" [class.on]="view() === 'table'" (click)="view.set('table')" aria-label="Table view">☰</button>
            <button type="button" [class.on]="view() === 'grid'" (click)="view.set('grid')" aria-label="Grid view">▦</button>
          </div>
        </div>

        @if (selectedIds().length) {
          <div class="bulk-bar">
            <strong>{{ selectedIds().length }} selected</strong>
            <button type="button" (click)="bulk('activate')">Publish</button>
            <button type="button" (click)="bulk('draft')">Unpublish</button>
            <button type="button" (click)="bulk('feature')">★ Feature</button>
            <button type="button" (click)="bulk('archive')">Archive</button>
            <div class="bulk-price">
              <input type="number" [(ngModel)]="bulkPercent" step="1" aria-label="Price change percent" />
              <span>%</span>
              <button type="button" (click)="bulk('price_adjust')">Adjust price</button>
            </div>
            <button type="button" class="danger" (click)="bulk('delete')">Delete</button>
            <button type="button" class="link" (click)="clearSelection()">Clear</button>
          </div>
        }

        @if (view() === 'table') {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th class="pick"><input type="checkbox" [checked]="allSelected()" (change)="toggleAll($event)" aria-label="Select all" /></th>
                  <th>Product</th>
                  <th>Store &amp; collection</th>
                  <th>Sold as</th>
                  <th class="right">Pricing</th>
                  <th>Inventory</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @if (loading()) {
                  @for (n of skeletonRows; track n) { <tr class="skeleton-row"><td colspan="8"><div class="skeleton skel-line"></div></td></tr> }
                } @else {
                  @for (product of products(); track product.id) {
                    <tr class="product-row" (click)="openEdit(product)">
                      <td class="pick" (click)="$event.stopPropagation()">
                        <input type="checkbox" [checked]="isSelected(product.id)" (change)="toggleSelect(product.id)" [attr.aria-label]="'Select ' + product.name" />
                      </td>
                      <td>
                        <div class="product-cell">
                          <span class="thumb" [class.empty]="!product.primary_image_url">
                            @if (product.primary_image_url) { <img [src]="product.primary_image_url" [alt]="product.name" loading="lazy" /> }
                            @else { {{ glyph(product.catalog_preset) }} }
                          </span>
                          <div>
                            <strong>{{ product.name }}</strong>
                            <small class="mono">{{ skuOf(product) }}</small>
                            <div class="chips">
                              <span class="chip-tag">{{ presetLabel(product.catalog_preset) }}</span>
                              @if (product.is_featured) { <span class="chip-tag gold">★ Featured</span> }
                              @if (product.has_variants) { <span class="chip-tag">{{ product.variants.length }} variants</span> }
                              @if (product.is_perishable) { <span class="chip-tag cool">Perishable</span> }
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{{ product.store?.name || '—' }}</strong>
                        <small>{{ product.category?.name || 'Uncategorised' }}</small>
                        @if (product.brand) { <small>{{ product.brand }}</small> }
                      </td>
                      <td>
                        <strong>{{ unitLabel(product.unit) }}</strong>
                        <small>{{ typeLabel(product.product_type) }}</small>
                        @if (product.min_order_qty > 1) { <small>Min {{ product.min_order_qty }}</small> }
                      </td>
                      <td class="right financial-cell">
                        <div><span>Price</span><b>{{ +product.price | money:currencyOf(product):'symbol':'1.2-2' }}</b></div>
                        @if (+(product.compare_at_price || 0) > +product.price) {
                          <div><span>Was</span><b class="strike">{{ +(product.compare_at_price || 0) | money:currencyOf(product):'symbol':'1.2-2' }}</b></div>
                        }
                        @if (product.margin_percent !== null && product.margin_percent !== undefined) {
                          <div class="net"><span>Margin</span><b>{{ product.margin_percent }}%</b></div>
                        }
                      </td>
                      <td>
                        <div class="stock-cell">
                          <span [class]="'stock-pill ' + product.stock_state">{{ stockLabel(product.stock_state) }}</span>
                          @if (product.track_inventory) {
                            <b>{{ product.available_stock }} {{ unitShort(product.unit) }}</b>
                            <div class="meter"><span [style.width.%]="stockPercent(product)" [class]="product.stock_state"></span></div>
                          } @else { <small>Unlimited</small> }
                        </div>
                      </td>
                      <td><span [class]="'status ' + product.status">{{ product.status }}</span></td>
                      <td class="actions" (click)="$event.stopPropagation()">
                        <button type="button" class="primary-action" (click)="togglePublish(product)" [disabled]="savingId() === product.id">
                          {{ savingId() === product.id ? '…' : (product.status === 'active' ? 'Unpublish' : 'Publish') }}
                        </button>
                        <div class="menu-wrap">
                          <button type="button" class="icon-btn" (click)="toggleMenu(product.id, $event)" aria-label="More actions">⋯</button>
                          @if (openMenu() === product.id) {
                            <div class="dropdown-menu">
                              <button type="button" (click)="openEdit(product)">Edit product</button>
                              <button type="button" (click)="duplicate(product)">Duplicate</button>
                              <button type="button" (click)="toggleFeature(product)">{{ product.is_featured ? 'Remove feature' : 'Mark featured' }}</button>
                              <a [routerLink]="['/products', product.slug]" target="_blank" rel="noopener">View in storefront ↗</a>
                              <button type="button" class="danger" (click)="confirmDelete(product)">Delete</button>
                            </div>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr class="empty-row"><td colspan="8">
                      <div class="empty-state">
                        <span class="empty-icon">📦</span>
                        <b>No products match these filters</b>
                        <span>Change the store, category or search term — or add your first listing.</span>
                        <div class="empty-actions">
                          @if (hasActiveFilters()) { <button type="button" class="btn ghost small" (click)="resetFilters()">Clear filters</button> }
                          <button type="button" class="btn primary small" (click)="openCreate()" [disabled]="!stores().length">＋ New product</button>
                        </div>
                      </div>
                    </td></tr>
                  }
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="grid-wrap">
            @if (loading()) {
              @for (n of skeletonRows; track n) { <div class="skeleton skel-card"></div> }
            } @else {
              @for (product of products(); track product.id) {
                <article class="product-card" (click)="openEdit(product)">
                  <div class="card-media" [class.empty]="!product.primary_image_url">
                    @if (product.primary_image_url) { <img [src]="product.primary_image_url" [alt]="product.name" loading="lazy" /> }
                    @else { <span class="card-glyph">{{ glyph(product.catalog_preset) }}</span> }
                    <span [class]="'status ' + product.status">{{ product.status }}</span>
                    @if (product.is_featured) { <span class="feature-flag">★</span> }
                  </div>
                  <div class="card-body">
                    <p class="card-store">{{ product.store?.name }} · {{ presetLabel(product.catalog_preset) }}</p>
                    <h3>{{ product.name }}</h3>
                    <p class="card-sub">{{ product.short_description || product.category?.name || unitLabel(product.unit) }}</p>
                    <div class="card-price">
                      <b>{{ +product.price | money:currencyOf(product):'symbol':'1.2-2' }}</b>
                      <span class="per">/ {{ unitShort(product.unit) }}</span>
                      @if (+(product.compare_at_price || 0) > +product.price) {
                        <span class="strike">{{ +(product.compare_at_price || 0) | money:currencyOf(product):'symbol':'1.0-0' }}</span>
                      }
                    </div>
                    <div class="card-foot">
                      <span [class]="'stock-pill ' + product.stock_state">{{ stockLabel(product.stock_state) }}</span>
                      @if (product.track_inventory) { <small>{{ product.available_stock }} {{ unitShort(product.unit) }}</small> }
                      @if (product.has_variants) { <small>{{ product.variants.length }} variants</small> }
                    </div>
                  </div>
                </article>
              } @empty {
                <div class="empty-state wide">
                  <span class="empty-icon">📦</span>
                  <b>Nothing here yet</b>
                  <span>Add your first listing to this catalog.</span>
                  <button type="button" class="btn primary small" (click)="openCreate()" [disabled]="!stores().length">＋ New product</button>
                </div>
              }
            }
          </div>
        }

        <div class="table-foot">
          <span>Showing {{ products().length }} of {{ total() }} product{{ total() === 1 ? '' : 's' }}</span>
          <div class="pagination">
            <select [(ngModel)]="perPage" (change)="onFilterChange()" aria-label="Rows per page">
              <option [ngValue]="12">12 / page</option>
              <option [ngValue]="24">24 / page</option>
              <option [ngValue]="48">48 / page</option>
            </select>
            <button type="button" [disabled]="page() <= 1" (click)="goToPage(page() - 1)">‹ Prev</button>
            <span>Page {{ page() }} of {{ lastPage() }}</span>
            <button type="button" [disabled]="page() >= lastPage()" (click)="goToPage(page() + 1)">Next ›</button>
          </div>
        </div>
      </section>
    </div>

    @if (editorOpen()) {
      <div class="drawer-backdrop" (click)="closeEditor()"></div>
      <aside class="drawer" role="dialog" aria-modal="true" aria-label="Product editor">
        <header>
          <div>
            <p class="eyebrow">{{ draft.id ? 'Edit listing' : 'New listing' }}</p>
            <h2>{{ draft.name || 'Untitled product' }}</h2>
            <small>{{ presetLabel(draft.catalog_preset) }} · {{ storeName(draft.store_id) }}</small>
          </div>
          <button type="button" class="icon-btn" (click)="closeEditor()" aria-label="Close">×</button>
        </header>

        <nav class="editor-tabs">
          @for (tab of editorTabs; track tab.key) {
            <button type="button" [class.active]="editorTab() === tab.key" (click)="editorTab.set(tab.key)">{{ tab.label }}</button>
          }
        </nav>

        <div class="drawer-body">
          @if (formError()) { <div class="error-banner inline"><span>!</span><p>{{ formError() }}</p></div> }

          @switch (editorTab()) {
            @case ('overview') {
              <section class="field-block">
                <h3>What are you selling?</h3>
                <p class="hint">Pick the closest category — it sets the right selling unit, stock rules and spec sheet. You can change anything afterwards.</p>
                <div class="preset-grid">
                  @for (preset of presets(); track preset.key) {
                    <button type="button" class="preset-card" [class.on]="draft.catalog_preset === preset.key" (click)="applyPreset(preset)">
                      <span class="preset-glyph">{{ glyph(preset.key) }}</span>
                      <b>{{ preset.label }}</b>
                      <small>{{ preset.example }}</small>
                    </button>
                  }
                </div>
              </section>

              <section class="field-block">
                <div class="field-grid">
                  <label class="field full"><span>Product name</span>
                    <input [(ngModel)]="draft.name" name="name" placeholder="e.g. Adinkra Wrap Dress" required />
                  </label>
                  <label class="field"><span>Store</span>
                    <select [(ngModel)]="draft.store_id" name="store_id">
                      @for (store of stores(); track store.id) { <option [ngValue]="store.id">{{ store.name }}</option> }
                    </select>
                  </label>
                  <label class="field"><span>Collection</span>
                    <select [(ngModel)]="draft.category_id" name="category_id">
                      <option [ngValue]="null">No collection</option>
                      @for (cat of categories(); track cat.id) { <option [ngValue]="cat.id">{{ cat.name }}</option> }
                    </select>
                  </label>
                  <label class="field"><span>Brand / producer</span>
                    <input [(ngModel)]="draft.brand" name="brand" placeholder="e.g. Volta Farms" />
                  </label>
                  <label class="field"><span>Status</span>
                    <select [(ngModel)]="draft.status" name="status">
                      <option value="draft">Draft — hidden</option>
                      <option value="active">Active — live in storefront</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <label class="field full"><span>Short description</span>
                    <input [(ngModel)]="draft.short_description" name="short_description" maxlength="320" placeholder="One line shoppers see in listings" />
                  </label>
                  <label class="field full"><span>Full description</span>
                    <textarea rows="5" [(ngModel)]="draft.description" name="description" placeholder="Tell the story: materials, origin, what's included…"></textarea>
                  </label>
                </div>

                <div class="tag-editor">
                  <span class="field-label">Tags</span>
                  <div class="tag-list">
                    @for (tag of draft.tags; track tag) {
                      <span class="tag">{{ tag }}<button type="button" (click)="removeTag(tag)" aria-label="Remove tag">×</button></span>
                    }
                    <input [(ngModel)]="tagInput" name="tagInput" placeholder="Add tag + Enter" (keydown.enter)="addTag($event)" />
                  </div>
                  @if (suggestedTags().length) {
                    <div class="tag-suggest">
                      <small>Suggested:</small>
                      @for (tag of suggestedTags(); track tag) { <button type="button" (click)="addTagValue(tag)">+ {{ tag }}</button> }
                    </div>
                  }
                </div>

                <label class="switch">
                  <input type="checkbox" [(ngModel)]="draft.is_featured" name="is_featured" />
                  <span></span>
                  <div><b>Feature this product</b><small>Pinned to the top of your storefront and marketplace cards.</small></div>
                </label>
              </section>
            }

            @case ('pricing') {
              <section class="field-block">
                <h3>Price &amp; selling unit</h3>
                <div class="field-grid">
                  <label class="field"><span>Price ({{ currency() }})</span>
                    <input type="number" min="0" step="0.01" [(ngModel)]="draft.price" name="price" />
                  </label>
                  <label class="field"><span>Compare-at price</span>
                    <input type="number" min="0" step="0.01" [(ngModel)]="draft.compare_at_price" name="compare_at_price" placeholder="Shown struck through" />
                  </label>
                  <label class="field"><span>Unit cost</span>
                    <input type="number" min="0" step="0.01" [(ngModel)]="draft.cost_price" name="cost_price" placeholder="What you pay" />
                  </label>
                  <label class="field"><span>Tax class</span>
                    <input [(ngModel)]="draft.tax_class" name="tax_class" placeholder="standard / zero-rated" />
                  </label>
                  <label class="field"><span>Tax rate override <small>% — blank uses the workspace default</small></span>
                    <input type="number" min="0" max="100" step="0.01" [(ngModel)]="draft.tax_rate" name="tax_rate" placeholder="e.g. 15" />
                  </label>
                  <label class="field"><span>Sold by</span>
                    <select [(ngModel)]="draft.unit" name="unit">
                      @for (unit of units(); track unit.value) { <option [value]="unit.value">{{ unit.label }}</option> }
                    </select>
                  </label>
                  <label class="field"><span>Amount per unit</span>
                    <input type="number" min="0" step="0.001" [(ngModel)]="draft.unit_amount" name="unit_amount" placeholder="e.g. 1.5 for a 1.5 kg pack" />
                  </label>
                  <label class="field"><span>Minimum order</span>
                    <input type="number" min="1" [(ngModel)]="draft.min_order_qty" name="min_order_qty" />
                  </label>
                  <label class="field"><span>Maximum per order</span>
                    <input type="number" min="1" [(ngModel)]="draft.max_order_qty" name="max_order_qty" placeholder="No limit" />
                  </label>
                </div>

                <div class="margin-card">
                  <div><span>Unit price</span><b>{{ +(draft.price || 0) | money:currency():'symbol':'1.2-2' }}</b></div>
                  <div><span>Unit cost</span><b>{{ +(draft.cost_price || 0) | money:currency():'symbol':'1.2-2' }}</b></div>
                  <div><span>Profit / unit</span><b>{{ unitProfit() | money:currency():'symbol':'1.2-2' }}</b></div>
                  <div class="grand"><span>Margin</span><b>{{ marginPreview() === null ? '—' : marginPreview() + '%' }}</b></div>
                </div>
                @if (discountPreview() > 0) {
                  <p class="hint ok">Shoppers see a {{ discountPreview() }}% saving against the compare-at price.</p>
                }
              </section>
            }

            @case ('inventory') {
              <section class="field-block">
                <h3>Stock control</h3>
                <label class="switch">
                  <input type="checkbox" [(ngModel)]="draft.track_inventory" name="track_inventory" />
                  <span></span>
                  <div><b>Track inventory</b><small>Turn off for made-to-order items, services and digital files.</small></div>
                </label>
                <label class="switch">
                  <input type="checkbox" [(ngModel)]="draft.allow_backorder" name="allow_backorder" [disabled]="!draft.track_inventory" />
                  <span></span>
                  <div><b>Allow backorders</b><small>Keep selling when stock hits zero and fulfil later.</small></div>
                </label>
                @if (draft.track_inventory) {
                  <label class="field narrow"><span>Low-stock alert at</span>
                    <input type="number" min="0" [(ngModel)]="draft.low_stock_threshold" name="low_stock_threshold" />
                  </label>
                }
              </section>

              <section class="field-block">
                <div class="block-head">
                  <div><h3>Variants</h3><p class="hint">Sizes, colours, pack sizes, storage capacity — each gets its own SKU and stock.</p></div>
                  <button type="button" class="btn ghost small" (click)="addOption()">＋ Add option</button>
                </div>

                @for (option of optionDefs; track $index) {
                  <div class="option-row">
                    <input class="option-name" [(ngModel)]="option.name" [name]="'optname' + $index" placeholder="Option name (Size)" />
                    <div class="value-chips">
                      @for (value of option.values; track value) {
                        <span class="tag">{{ value }}<button type="button" (click)="removeOptionValue(option, value)" aria-label="Remove value">×</button></span>
                      }
                      <input [(ngModel)]="option.input" [name]="'optval' + $index" placeholder="Add value + Enter" (keydown.enter)="addOptionValue(option, $event)" />
                    </div>
                    <button type="button" class="icon-btn danger" (click)="removeOption($index)" aria-label="Remove option">🗑</button>
                  </div>
                }
                @if (optionDefs.length) {
                  <div class="matrix-actions">
                    <button type="button" class="btn ghost small" (click)="buildMatrix()">⟳ Rebuild variant matrix</button>
                    <small>{{ matrixSize() }} combination{{ matrixSize() === 1 ? '' : 's' }}</small>
                  </div>
                }
                @if (presetOptions().length && !optionDefs.length) {
                  <div class="tag-suggest">
                    <small>Common for {{ presetLabel(draft.catalog_preset) }}:</small>
                    @for (option of presetOptions(); track option.name) {
                      <button type="button" (click)="addSuggestedOption(option)">+ {{ option.name }}</button>
                    }
                  </div>
                }

                <div class="variant-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Variant</th><th>SKU</th><th class="right">Price</th><th class="right">Stock</th>
                        @if (draft.is_perishable) { <th>Batch</th><th>Best before</th> }
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (variant of variants; track $index) {
                        <tr [class.inactive]="variant.status === 'inactive'">
                          <td>
                            <strong>{{ variant.label || 'Default' }}</strong>
                            @if (variant.id) { <small>#{{ variant.id }}</small> }
                          </td>
                          <td><input class="mono" [(ngModel)]="variant.sku" [name]="'vsku' + $index" placeholder="Auto" /></td>
                          <td class="right"><input type="number" min="0" step="0.01" [(ngModel)]="variant.price_override" [name]="'vprice' + $index" [placeholder]="draft.price || 0" /></td>
                          <td class="right"><input type="number" min="0" [(ngModel)]="variant.quantity" [name]="'vqty' + $index" [disabled]="!draft.track_inventory" /></td>
                          @if (draft.is_perishable) {
                            <td><input [(ngModel)]="variant.batch_reference" [name]="'vbatch' + $index" placeholder="Lot" /></td>
                            <td><input type="date" [(ngModel)]="variant.expires_at" [name]="'vexp' + $index" /></td>
                          }
                          <td class="right">
                            <button type="button" class="icon-btn" (click)="toggleVariantStatus(variant)" [attr.aria-label]="'Toggle ' + variant.label">
                              {{ variant.status === 'active' ? '◉' : '○' }}
                            </button>
                            @if (variants.length > 1) {
                              <button type="button" class="icon-btn danger" (click)="removeVariant($index)" aria-label="Remove variant">🗑</button>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  <button type="button" class="btn ghost small add-variant" (click)="addVariant()">＋ Add variant manually</button>
                </div>
              </section>
            }

            @case ('specs') {
              <section class="field-block">
                <h3>{{ presetLabel(draft.catalog_preset) }} details</h3>
                <p class="hint">These appear on the product page as a spec sheet, and power marketplace filters.</p>
                <div class="field-grid">
                  @for (field of specFields(); track field.key) {
                    <label class="field" [class.full]="field.type === 'text' && !field.options">
                      <span>{{ field.label }}</span>
                      @switch (field.type) {
                        @case ('select') {
                          <select [(ngModel)]="draft.specs[field.key]" [name]="'spec' + field.key">
                            <option [ngValue]="''">—</option>
                            @for (option of field.options || []; track option) { <option [ngValue]="option">{{ option }}</option> }
                          </select>
                        }
                        @case ('boolean') {
                          <select [(ngModel)]="draft.specs[field.key]" [name]="'spec' + field.key">
                            <option [ngValue]="''">—</option><option [ngValue]="true">Yes</option><option [ngValue]="false">No</option>
                          </select>
                        }
                        @case ('number') { <input type="number" [(ngModel)]="draft.specs[field.key]" [name]="'spec' + field.key" /> }
                        @case ('date') { <input type="date" [(ngModel)]="draft.specs[field.key]" [name]="'spec' + field.key" /> }
                        @default { <input [(ngModel)]="draft.specs[field.key]" [name]="'spec' + field.key" [placeholder]="field.placeholder || ''" /> }
                      }
                    </label>
                  }
                </div>

                <div class="block-head">
                  <div><h3>Custom attributes</h3><p class="hint">Anything else buyers ask about.</p></div>
                  <button type="button" class="btn ghost small" (click)="addCustomSpec()">＋ Add attribute</button>
                </div>
                @for (row of customSpecs; track $index) {
                  <div class="spec-row">
                    <input [(ngModel)]="row.key" [name]="'ckey' + $index" placeholder="Attribute (e.g. Thread count)" />
                    <input [(ngModel)]="row.value" [name]="'cval' + $index" placeholder="Value" />
                    <button type="button" class="icon-btn danger" (click)="customSpecs.splice($index, 1)" aria-label="Remove attribute">🗑</button>
                  </div>
                }
              </section>
            }

            @case ('logistics') {
              <section class="field-block">
                <h3>Fulfilment</h3>
                <label class="switch">
                  <input type="checkbox" [(ngModel)]="draft.requires_shipping" name="requires_shipping" />
                  <span></span>
                  <div><b>Requires shipping</b><small>Off for downloads, vouchers and on-site services.</small></div>
                </label>
                @if (draft.requires_shipping) {
                  <div class="field-grid">
                    <label class="field"><span>Weight</span>
                      <input type="number" min="0" step="0.001" [(ngModel)]="draft.weight" name="weight" />
                    </label>
                    <label class="field"><span>Weight unit</span>
                      <select [(ngModel)]="draft.weight_unit" name="weight_unit"><option value="kg">kg</option><option value="g">g</option><option value="lb">lb</option></select>
                    </label>
                    <label class="field"><span>Length</span><input type="number" min="0" step="0.1" [(ngModel)]="draft.length" name="length" /></label>
                    <label class="field"><span>Width</span><input type="number" min="0" step="0.1" [(ngModel)]="draft.width" name="width" /></label>
                    <label class="field"><span>Height</span><input type="number" min="0" step="0.1" [(ngModel)]="draft.height" name="height" /></label>
                    <label class="field"><span>Dimension unit</span>
                      <select [(ngModel)]="draft.dimension_unit" name="dimension_unit"><option value="cm">cm</option><option value="mm">mm</option><option value="in">in</option></select>
                    </label>
                  </div>
                }
              </section>

              <section class="field-block">
                <h3>Condition &amp; handling</h3>
                <div class="field-grid">
                  <label class="field"><span>Condition</span>
                    <select [(ngModel)]="draft.condition" name="condition">
                      <option [ngValue]="null">Not applicable</option>
                      @for (condition of conditions(); track condition) { <option [ngValue]="condition">{{ condition }}</option> }
                    </select>
                  </label>
                  <label class="field"><span>Warranty (months)</span>
                    <input type="number" min="0" [(ngModel)]="draft.warranty_months" name="warranty_months" />
                  </label>
                  <label class="field"><span>Country of origin</span>
                    <input [(ngModel)]="draft.country_of_origin" name="country_of_origin" placeholder="Ghana" />
                  </label>
                  <label class="field"><span>Barcode (EAN/UPC)</span>
                    <input class="mono" [(ngModel)]="draft.barcode" name="barcode" />
                  </label>
                </div>
                <label class="switch">
                  <input type="checkbox" [(ngModel)]="draft.is_perishable" name="is_perishable" />
                  <span></span>
                  <div><b>Perishable</b><small>Adds batch and best-before tracking to every variant.</small></div>
                </label>
                @if (draft.is_perishable) {
                  <div class="field-grid">
                    <label class="field"><span>Shelf life (days)</span>
                      <input type="number" min="0" [(ngModel)]="draft.shelf_life_days" name="shelf_life_days" />
                    </label>
                    <label class="field"><span>Storage</span>
                      <select [(ngModel)]="draft.storage_requirement" name="storage_requirement">
                        <option [ngValue]="null">—</option>
                        @for (requirement of storageOptions(); track requirement) { <option [ngValue]="requirement">{{ requirement }}</option> }
                      </select>
                    </label>
                  </div>
                }
              </section>
            }

            @case ('media') {
              <section class="field-block">
                <div class="block-head">
                  <div>
                    <h3>Photography <span class="media-count">{{ imageCount() }} / {{ maxProductImages }} photos</span></h3>
                    <p class="hint">Add one to four photos. Shoppers can browse them as a slideshow; the first image is the cover shown in cards and search results.</p>
                  </div>
                  @if (imageSlotsRemaining() > 0) { <span class="slots-left">{{ imageSlotsRemaining() }} slot{{ imageSlotsRemaining() === 1 ? '' : 's' }} left</span> }
                </div>
                <div class="media-grid">
                  @for (image of draftImages(); track image.id) {
                    <div class="media-tile" [class.primary]="image.is_primary">
                      <img [src]="image.url" [alt]="draft.name" />
                      @if (image.is_primary) { <span class="badge">Cover</span> }
                      <button type="button" class="remove" (click)="removeImage(image)" aria-label="Remove image">×</button>
                    </div>
                  }
                  @for (pending of pendingImages; track pending.preview) {
                    <div class="media-tile pending">
                      <img [src]="pending.preview" alt="Pending upload" />
                      <span class="badge">Uploads on save</span>
                      <button type="button" class="remove" (click)="removePendingImage(pending)" aria-label="Remove pending image">×</button>
                    </div>
                  }
                  <label class="media-drop" [class.disabled]="imageSlotsRemaining() === 0">
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple [disabled]="imageSlotsRemaining() === 0" (change)="onFilesPicked($event)" />
                    <span>＋</span>
                    <b>{{ imageSlotsRemaining() ? 'Add photos' : 'Gallery full' }}</b>
                    <small>{{ imageSlotsRemaining() ? 'JPG, PNG or WebP · up to 5 MB each' : 'Remove a photo to add another' }}</small>
                  </label>
                </div>
              </section>
            }

            @case ('seo') {
              <section class="field-block">
                <h3>Search &amp; sharing</h3>
                <div class="field-grid">
                  <label class="field full"><span>SEO title</span>
                    <input [(ngModel)]="draft.seo_title" name="seo_title" [placeholder]="draft.name" maxlength="255" />
                  </label>
                  <label class="field full"><span>Meta description</span>
                    <textarea rows="3" [(ngModel)]="draft.seo_description" name="seo_description" maxlength="320" [placeholder]="draft.short_description || ''"></textarea>
                  </label>
                </div>
                <div class="serp-preview">
                  <small>Search preview</small>
                  <b>{{ draft.seo_title || draft.name || 'Product title' }}</b>
                  <span class="serp-url">{{ origin }}/products/{{ slugPreview() }}</span>
                  <p>{{ draft.seo_description || draft.short_description || 'Add a short description to control how this listing appears in search.' }}</p>
                </div>
              </section>
            }
          }
        </div>

        <footer>
          @if (draft.id) {
            <button type="button" class="btn ghost danger" (click)="confirmDelete(editing()!)">Delete</button>
            <button type="button" class="btn ghost" (click)="duplicate(editing()!)">Duplicate</button>
          }
          <span class="spacer"></span>
          <button type="button" class="btn ghost" (click)="closeEditor()">Cancel</button>
          <button type="button" class="btn primary" (click)="save()" [disabled]="saving() || !draft.name || !draft.store_id">
            {{ saving() ? 'Saving…' : (draft.id ? 'Save changes' : 'Create product') }}
          </button>
        </footer>
      </aside>
    }

    @if (deleteTarget(); as target) {
      <div class="drawer-backdrop" (click)="deleteTarget.set(null)"></div>
      <div class="confirm-card" role="alertdialog" aria-modal="true">
        <h3>Delete “{{ target.name }}”?</h3>
        <p>Listings with order history are archived instead, so your reporting stays intact.</p>
        <div class="confirm-actions">
          <button type="button" class="btn ghost" (click)="deleteTarget.set(null)">Keep it</button>
          <button type="button" class="btn danger-solid" (click)="remove(target)" [disabled]="saving()">{{ saving() ? 'Working…' : 'Delete product' }}</button>
        </div>
      </div>
    }
  `,
  styles: [`
    /* The visual system lives in products.workspace.scss (global, keyed off
       the shared design tokens) so this component stays inside Angular's
       per-component style budget. */
    :host { display: block; }
  `],
})
export class SellerProductsComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  // ----------------------------------------------------------------- state
  products = signal<TenantProduct[]>([]);
  stats = signal<ProductCatalogStats | null>(null);
  meta = signal<ProductCatalogMeta | null>(null);
  loading = signal(true);
  refreshing = signal(false);
  saving = signal(false);
  savingId = signal<number | null>(null);
  error = signal('');
  formError = signal('');
  toast = signal('');
  openMenu = signal<number | null>(null);
  view = signal<ViewMode>('table');

  statusFilter = signal<StatusFilter>('');
  stockFilter = signal<ProductStockState | ''>('');
  featuredOnly = signal(false);
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);

  searchTerm = '';
  storeFilter = '';
  categoryFilter = '';
  presetFilter = '';
  typeFilter = '';
  sortValue = 'created_at:desc';
  perPage = 12;
  bulkPercent = 10;

  selection = signal<Set<number>>(new Set());
  skeletonRows = [1, 2, 3, 4, 5];
  origin = typeof location !== 'undefined' ? location.origin : '';

  // ---------------------------------------------------------------- editor
  editorOpen = signal(false);
  editorTab = signal<EditorTab>('overview');
  editing = signal<TenantProduct | null>(null);
  deleteTarget = signal<TenantProduct | null>(null);

  editorTabs: { key: EditorTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'pricing', label: 'Pricing' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'specs', label: 'Details' },
    { key: 'logistics', label: 'Shipping' },
    { key: 'media', label: 'Media' },
    { key: 'seo', label: 'SEO' },
  ];

  draft = this.blankDraft();
  variants: VariantDraft[] = [];
  optionDefs: OptionDraft[] = [];
  customSpecs: SpecRow[] = [];
  /** Product galleries are intentionally compact so the public carousel stays focused. */
  readonly maxProductImages = 4;
  pendingImages: { file: File; preview: string }[] = [];
  tagInput = '';

  private search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => { this.page.set(1); this.load(); });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.storeFilter = params.get('store_id') || this.storeFilter;
      if (params.get('stock')) this.stockFilter.set(params.get('stock') as ProductStockState);
      this.load();
    });

    this.api.productCatalogMeta().subscribe({
      next: (res) => this.meta.set(res.data),
      error: () => this.error.set('Could not load catalog settings. Some editor options may be missing.'),
    });
  }

  // ----------------------------------------------------------- derived data
  stores = computed(() => this.meta()?.stores ?? []);
  categories = computed(() => this.meta()?.categories ?? []);
  presets = computed(() => this.meta()?.presets ?? []);
  units = computed(() => this.meta()?.units ?? []);
  conditions = computed(() => this.meta()?.conditions ?? []);
  storageOptions = computed(() => this.meta()?.storage_requirements ?? []);

  currency = computed(() => this.stores()[0]?.currency || 'USD');

  selectedIds = computed(() => [...this.selection()]);

  statusTabs = computed(() => {
    const s = this.stats();
    return [
      { key: '' as StatusFilter, label: 'All', count: s?.total_count ?? 0 },
      { key: 'active' as StatusFilter, label: 'Live', count: s?.active_count ?? 0 },
      { key: 'draft' as StatusFilter, label: 'Drafts', count: s?.draft_count ?? 0 },
      { key: 'archived' as StatusFilter, label: 'Archived', count: s?.archived_count ?? 0 },
    ];
  });

  currentPreset = computed<ProductPreset | null>(
    () => this.presets().find((p) => p.key === this.draft.catalog_preset) ?? null,
  );

  specFields = computed<ProductSpecField[]>(() => this.currentPreset()?.specs ?? []);
  presetOptions = computed(() => this.currentPreset()?.options ?? []);
  suggestedTags = computed(() => (this.currentPreset()?.tags ?? []).filter((t) => !this.draft.tags.includes(t)));
  draftImages = computed<TenantProductImage[]>(() => this.editing()?.images ?? []);

  matrixSize = computed(() =>
    this.optionDefs.filter((o) => o.values.length).reduce((acc, o) => acc * o.values.length, 1),
  );

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.storeFilter || this.categoryFilter || this.presetFilter
      || this.typeFilter || this.statusFilter() || this.stockFilter() || this.featuredOnly());
  }

  // --------------------------------------------------------------- loading
  load(): void {
    const params: Record<string, string | number> = {
      page: this.page(),
      per_page: this.perPage,
    };
    const [sortBy, sortDir] = this.sortValue.split(':');
    params['sort_by'] = sortBy;
    params['sort_dir'] = sortDir;
    if (this.searchTerm.trim()) params['q'] = this.searchTerm.trim();
    if (this.storeFilter) params['store_id'] = this.storeFilter;
    if (this.categoryFilter) params['category_id'] = this.categoryFilter;
    if (this.presetFilter) params['catalog_preset'] = this.presetFilter;
    if (this.typeFilter) params['product_type'] = this.typeFilter;
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.stockFilter()) params['stock'] = this.stockFilter();
    if (this.featuredOnly()) params['featured'] = 1;

    this.loading.set(true);
    this.api.sellerProducts(params)
      .pipe(finalize(() => { this.loading.set(false); this.refreshing.set(false); }))
      .subscribe({
        next: (res) => {
          this.products.set(res.data ?? []);
          this.stats.set(res.stats ?? null);
          this.total.set(res.meta?.total ?? res.data.length);
          this.lastPage.set(res.meta?.last_page ?? 1);
          this.page.set(res.meta?.page ?? 1);
          // Drop selections that scrolled out of the result set.
          const visible = new Set(res.data.map((p) => p.id));
          this.selection.set(new Set(this.selectedIds().filter((id) => visible.has(id))));
        },
        error: (e) => this.error.set(this.messageOf(e, 'Could not load your products.')),
      });
  }

  refresh(): void { this.refreshing.set(true); this.load(); }
  onSearch(value: string): void { this.search$.next(value); }
  clearSearch(): void { this.searchTerm = ''; this.page.set(1); this.load(); }
  onFilterChange(): void { this.page.set(1); this.load(); }
  onSortChange(): void { this.page.set(1); this.load(); }

  setStatus(status: StatusFilter): void { this.statusFilter.set(status); this.page.set(1); this.load(); }

  toggleStock(state: ProductStockState): void {
    this.stockFilter.set(this.stockFilter() === state ? '' : state);
    this.page.set(1);
    this.load();
  }

  toggleFeatured(): void { this.featuredOnly.set(!this.featuredOnly()); this.page.set(1); this.load(); }

  resetFilters(): void {
    this.searchTerm = '';
    this.storeFilter = '';
    this.categoryFilter = '';
    this.presetFilter = '';
    this.typeFilter = '';
    this.statusFilter.set('');
    this.stockFilter.set('');
    this.featuredOnly.set(false);
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage()) return;
    this.page.set(page);
    this.load();
  }

  // ------------------------------------------------------------- selection
  isSelected(id: number): boolean { return this.selection().has(id); }

  toggleSelect(id: number): void {
    const next = new Set(this.selection());
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    this.selection.set(next);
  }

  allSelected(): boolean {
    const list = this.products();
    return list.length > 0 && list.every((p) => this.selection().has(p.id));
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selection.set(checked ? new Set(this.products().map((p) => p.id)) : new Set());
  }

  clearSelection(): void { this.selection.set(new Set()); }

  bulk(action: ProductBulkAction): void {
    const ids = this.selectedIds();
    if (!ids.length) return;
    if (action === 'delete' && !confirm(`Delete ${ids.length} product(s)? Items with orders are archived instead.`)) return;

    this.saving.set(true);
    this.api.bulkProducts({ ids, action, percent: this.bulkPercent })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (res) => {
          this.clearSelection();
          this.flash(`${res.data.affected} product${res.data.affected === 1 ? '' : 's'} updated`
            + (res.data.archived_instead ? ` · ${res.data.archived_instead} archived (order history)` : ''));
          this.load();
        },
        error: (e) => this.error.set(this.messageOf(e, 'Bulk action failed.')),
      });
  }

  // -------------------------------------------------------- row quick acts
  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.openMenu.set(this.openMenu() === id ? null : id);
  }

  togglePublish(product: TenantProduct): void {
    const status: ProductStatus = product.status === 'active' ? 'draft' : 'active';
    this.savingId.set(product.id);
    this.api.updateProduct(product.id, { status })
      .pipe(finalize(() => this.savingId.set(null)))
      .subscribe({
        next: () => { this.flash(status === 'active' ? 'Product published' : 'Product unpublished'); this.load(); },
        error: (e) => this.error.set(this.messageOf(e, 'Could not change the product status.')),
      });
  }

  toggleFeature(product: TenantProduct): void {
    this.openMenu.set(null);
    this.api.updateProduct(product.id, { is_featured: !product.is_featured }).subscribe({
      next: () => { this.flash(product.is_featured ? 'Removed from featured' : 'Marked as featured'); this.load(); },
      error: (e) => this.error.set(this.messageOf(e, 'Could not update the product.')),
    });
  }

  duplicate(product: TenantProduct): void {
    this.openMenu.set(null);
    this.api.duplicateProduct(product.id).subscribe({
      next: (res) => {
        this.flash('Duplicated as a draft');
        this.closeEditor();
        this.load();
        this.openEdit(res.data);
      },
      error: (e) => this.error.set(this.messageOf(e, 'Could not duplicate this product.')),
    });
  }

  confirmDelete(product: TenantProduct): void {
    this.openMenu.set(null);
    this.deleteTarget.set(product);
  }

  remove(product: TenantProduct): void {
    this.saving.set(true);
    this.api.deleteProduct(product.id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (res) => {
          this.deleteTarget.set(null);
          this.closeEditor();
          this.flash(res.data.archived ? 'Archived — this product has order history' : 'Product deleted');
          this.load();
        },
        error: (e) => this.error.set(this.messageOf(e, 'Could not delete this product.')),
      });
  }

  // ---------------------------------------------------------------- editor
  openCreate(): void {
    this.editing.set(null);
    this.draft = this.blankDraft();
    this.draft.store_id = this.stores()[0]?.id ?? null;
    const preset = this.presets().find((p) => p.key === (this.presetFilter || 'general'));
    if (preset) this.applyPreset(preset, true);
    this.variants = [this.blankVariant({})];
    this.optionDefs = [];
    this.customSpecs = [];
    this.pendingImages = [];
    this.editorTab.set('overview');
    this.formError.set('');
    this.editorOpen.set(true);
  }

  openEdit(product: TenantProduct): void {
    this.openMenu.set(null);
    this.editing.set(product);
    this.editorTab.set('overview');
    this.formError.set('');
    this.pendingImages = [];

    const presetSpecKeys = new Set(
      (this.presets().find((p) => p.key === product.catalog_preset)?.specs ?? []).map((f) => f.key),
    );
    const specs: Record<string, any> = {};
    this.customSpecs = [];
    for (const [key, value] of Object.entries(product.specs ?? {})) {
      if (presetSpecKeys.has(key)) specs[key] = value;
      else this.customSpecs.push({ key, value: String(value ?? '') });
    }

    this.draft = {
      id: product.id,
      store_id: product.store_id,
      category_id: product.category_id ?? null,
      name: product.name,
      short_description: product.short_description ?? '',
      description: product.description ?? '',
      status: product.status,
      catalog_preset: product.catalog_preset || 'general',
      product_type: product.product_type,
      brand: product.brand ?? '',
      price: +product.price,
      compare_at_price: product.compare_at_price ? +product.compare_at_price : null,
      cost_price: product.cost_price ? +product.cost_price : null,
      tax_class: product.tax_class ?? '',
      tax_rate: product.tax_rate !== null && product.tax_rate !== undefined ? +product.tax_rate : null,
      unit: product.unit || 'piece',
      unit_amount: product.unit_amount ? +product.unit_amount : null,
      min_order_qty: product.min_order_qty ?? 1,
      max_order_qty: product.max_order_qty ?? null,
      track_inventory: !!product.track_inventory,
      allow_backorder: !!product.allow_backorder,
      low_stock_threshold: product.low_stock_threshold ?? 5,
      requires_shipping: !!product.requires_shipping,
      weight: product.weight ? +product.weight : null,
      weight_unit: product.weight_unit || 'kg',
      length: product.length ? +product.length : null,
      width: product.width ? +product.width : null,
      height: product.height ? +product.height : null,
      dimension_unit: product.dimension_unit || 'cm',
      condition: product.condition ?? null,
      warranty_months: product.warranty_months ?? null,
      is_perishable: !!product.is_perishable,
      shelf_life_days: product.shelf_life_days ?? null,
      storage_requirement: product.storage_requirement ?? null,
      country_of_origin: product.country_of_origin ?? '',
      barcode: product.barcode ?? '',
      tags: [...(product.tags ?? [])],
      specs,
      is_featured: !!product.is_featured,
      seo_title: product.seo_title ?? '',
      seo_description: product.seo_description ?? '',
      slug: product.slug,
    };

    this.variants = (product.variants ?? []).map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      label: variant.name || this.labelFromOptions(variant.options ?? {}),
      options: this.cleanOptions(variant.options ?? {}),
      price_override: variant.price_override ? +variant.price_override : null,
      cost_price: variant.cost_price ? +variant.cost_price : null,
      barcode: variant.barcode ?? '',
      quantity: variant.inventory?.quantity ?? 0,
      low_stock_threshold: variant.inventory?.low_stock_threshold ?? null,
      batch_reference: variant.inventory?.batch_reference ?? '',
      expires_at: (variant.inventory?.expires_at ?? '').slice(0, 10),
      status: variant.status,
    }));
    if (!this.variants.length) this.variants = [this.blankVariant({})];

    this.optionDefs = (product.option_schema ?? []).map((option) => ({
      name: option.name,
      values: [...(option.values ?? [])],
      input: '',
    }));
    if (!this.optionDefs.length) this.optionDefs = this.deriveOptionsFromVariants();

    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editing.set(null);
    this.pendingImages.forEach((p) => URL.revokeObjectURL(p.preview));
    this.pendingImages = [];
  }

  /** Apply a vertical's defaults without clobbering what the user typed. */
  applyPreset(preset: ProductPreset, initial = false): void {
    this.draft.catalog_preset = preset.key;
    const defaults = preset.defaults as Record<string, any>;
    const overridable: (keyof typeof this.draft)[] = [
      'product_type', 'unit', 'requires_shipping', 'track_inventory', 'is_perishable',
      'shelf_life_days', 'storage_requirement', 'condition', 'warranty_months', 'weight_unit',
    ];
    for (const key of overridable) {
      if (defaults[key as string] !== undefined && (initial || !this.editing())) {
        (this.draft as Record<string, any>)[key as string] = defaults[key as string];
      }
    }
    if (!initial && this.editing()) {
      // Editing an existing product: only fill in the blanks.
      for (const key of overridable) {
        const current = (this.draft as Record<string, any>)[key as string];
        if ((current === null || current === undefined || current === '') && defaults[key as string] !== undefined) {
          (this.draft as Record<string, any>)[key as string] = defaults[key as string];
        }
      }
    }
  }

  // -------------------------------------------------------------- variants
  addOption(): void { this.optionDefs.push({ name: '', values: [], input: '' }); }

  addSuggestedOption(option: { name: string; values: string[] }): void {
    this.optionDefs.push({ name: option.name, values: [...option.values], input: '' });
  }

  removeOption(index: number): void { this.optionDefs.splice(index, 1); }

  addOptionValue(option: OptionDraft, event: Event): void {
    event.preventDefault();
    const value = option.input.trim();
    if (value && !option.values.includes(value)) option.values.push(value);
    option.input = '';
  }

  removeOptionValue(option: OptionDraft, value: string): void {
    option.values = option.values.filter((v) => v !== value);
  }

  /**
   * Cartesian product of every option. Existing rows are matched by their
   * option signature so SKUs and stock survive a rebuild.
   */
  buildMatrix(): void {
    const active = this.optionDefs.filter((o) => o.name.trim() && o.values.length);
    if (!active.length) return;

    let combos: Record<string, string>[] = [{}];
    for (const option of active) {
      const next: Record<string, string>[] = [];
      for (const combo of combos) {
        for (const value of option.values) next.push({ ...combo, [option.name.trim()]: value });
      }
      combos = next;
    }

    const bySignature = new Map(this.variants.map((v) => [this.signature(v.options), v]));
    this.variants = combos.map((options) => {
      const existing = bySignature.get(this.signature(options));
      return existing
        ? { ...existing, options, label: this.labelFromOptions(options) }
        : this.blankVariant(options);
    });
  }

  addVariant(): void { this.variants.push(this.blankVariant({})); }
  removeVariant(index: number): void { this.variants.splice(index, 1); }

  toggleVariantStatus(variant: VariantDraft): void {
    variant.status = variant.status === 'active' ? 'inactive' : 'active';
  }

  // ----------------------------------------------------------------- specs
  addCustomSpec(): void { this.customSpecs.push({ key: '', value: '' }); }

  addTag(event: Event): void {
    event.preventDefault();
    this.addTagValue(this.tagInput);
    this.tagInput = '';
  }

  addTagValue(value: string): void {
    const tag = value.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !this.draft.tags.includes(tag)) this.draft.tags.push(tag);
  }

  removeTag(tag: string): void { this.draft.tags = this.draft.tags.filter((t) => t !== tag); }

  // ----------------------------------------------------------------- media
  imageCount(): number {
    return this.draftImages().length + this.pendingImages.length;
  }

  imageSlotsRemaining(): number {
    return Math.max(0, this.maxProductImages - this.imageCount());
  }

  onFilesPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    const available = this.imageSlotsRemaining();
    const eligible = selected.filter((file) => file.type.startsWith('image/')).slice(0, available);

    for (const file of eligible) {
      this.pendingImages.push({ file, preview: URL.createObjectURL(file) });
    }

    if (selected.length > eligible.length) {
      this.formError.set(`A product can have up to ${this.maxProductImages} photos. Only the available gallery slots were added.`);
    }
    input.value = '';
  }

  removePendingImage(pending: { file: File; preview: string }): void {
    URL.revokeObjectURL(pending.preview);
    this.pendingImages = this.pendingImages.filter((image) => image.preview !== pending.preview);
  }

  removeImage(image: TenantProductImage): void {
    const product = this.editing();
    if (!product) return;
    this.api.deleteProductImage(product.id, image.id).subscribe({
      next: () => {
        this.editing.set({ ...product, images: product.images.filter((i) => i.id !== image.id) });
        this.load();
      },
      error: (e) => this.formError.set(this.messageOf(e, 'Could not remove that image.')),
    });
  }

  // ------------------------------------------------------------------ save
  save(): void {
    this.formError.set('');
    const payload = this.buildPayload();
    this.saving.set(true);

    const request = this.draft.id
      ? this.api.updateProduct(this.draft.id, payload)
      : this.api.createProduct(payload);

    request.subscribe({
      next: (res) => {
        const saved = res.data;
        if (this.pendingImages.length) {
          this.uploadPending(saved.id);
        } else {
          this.saving.set(false);
          this.flash(this.draft.id ? 'Product saved' : 'Product created');
          this.closeEditor();
          this.load();
        }
      },
      error: (e) => {
        this.saving.set(false);
        this.formError.set(this.messageOf(e, 'Could not save this product. Check the highlighted tabs.'));
      },
    });
  }

  private uploadPending(productId: number): void {
    const queue = [...this.pendingImages];
    let done = 0;
    const finishOne = () => {
      done++;
      if (done < queue.length) return;
      this.saving.set(false);
      this.flash('Product saved with new photos');
      this.closeEditor();
      this.load();
    };
    queue.forEach((pending, index) => {
      this.api.uploadProductImage(productId, pending.file, index === 0 && !this.draftImages().length).subscribe({
        next: finishOne,
        error: () => { this.formError.set('Product saved, but one image failed to upload.'); finishOne(); },
      });
    });
  }

  private buildPayload(): Record<string, unknown> {
    const specs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this.draft.specs)) {
      if (value !== '' && value !== null && value !== undefined) specs[key] = value;
    }
    for (const row of this.customSpecs) {
      const key = row.key.trim();
      if (key) specs[key] = row.value;
    }

    const optionSchema = this.optionDefs
      .filter((o) => o.name.trim() && o.values.length)
      .map((o) => ({ name: o.name.trim(), values: o.values }));

    return {
      store_id: this.draft.store_id,
      category_id: this.draft.category_id,
      name: this.draft.name,
      short_description: this.draft.short_description || null,
      description: this.draft.description || null,
      status: this.draft.status,
      catalog_preset: this.draft.catalog_preset,
      product_type: this.draft.product_type,
      brand: this.draft.brand || null,

      price: Number(this.draft.price) || 0,
      compare_at_price: this.nullableNumber(this.draft.compare_at_price),
      cost_price: this.nullableNumber(this.draft.cost_price),
      tax_class: this.draft.tax_class || null,
      tax_rate: this.nullableNumber(this.draft.tax_rate),

      unit: this.draft.unit,
      unit_amount: this.nullableNumber(this.draft.unit_amount),
      min_order_qty: Number(this.draft.min_order_qty) || 1,
      max_order_qty: this.nullableNumber(this.draft.max_order_qty),

      track_inventory: !!this.draft.track_inventory,
      allow_backorder: !!this.draft.allow_backorder,
      low_stock_threshold: Number(this.draft.low_stock_threshold) || 0,

      requires_shipping: !!this.draft.requires_shipping,
      weight: this.nullableNumber(this.draft.weight),
      weight_unit: this.draft.weight_unit,
      length: this.nullableNumber(this.draft.length),
      width: this.nullableNumber(this.draft.width),
      height: this.nullableNumber(this.draft.height),
      dimension_unit: this.draft.dimension_unit,

      condition: this.draft.condition || null,
      warranty_months: this.nullableNumber(this.draft.warranty_months),
      is_perishable: !!this.draft.is_perishable,
      shelf_life_days: this.nullableNumber(this.draft.shelf_life_days),
      storage_requirement: this.draft.storage_requirement || null,
      country_of_origin: this.draft.country_of_origin || null,
      barcode: this.draft.barcode || null,

      tags: this.draft.tags,
      specs,
      option_schema: optionSchema,

      is_featured: !!this.draft.is_featured,
      seo_title: this.draft.seo_title || null,
      seo_description: this.draft.seo_description || null,

      variants: this.variants.map((variant, index) => ({
        id: variant.id,
        sku: variant.sku || null,
        name: variant.label || null,
        options: variant.options,
        price_override: this.nullableNumber(variant.price_override),
        cost_price: this.nullableNumber(variant.cost_price),
        barcode: variant.barcode || null,
        quantity: this.draft.track_inventory ? Number(variant.quantity) || 0 : 0,
        low_stock_threshold: variant.low_stock_threshold ?? this.draft.low_stock_threshold,
        batch_reference: variant.batch_reference || null,
        expires_at: variant.expires_at || null,
        status: variant.status,
        position: index,
      })),
    };
  }

  // ----------------------------------------------------------------- views
  exportCsv(): void {
    const header = ['id', 'name', 'sku', 'store', 'category', 'type', 'unit', 'price', 'cost', 'stock', 'stock_state', 'status'];
    const rows = this.products().map((p) => [
      p.id, p.name, this.skuOf(p), p.store?.name ?? '', p.category?.name ?? '',
      p.product_type, p.unit, p.price, p.cost_price ?? '', p.available_stock, p.stock_state, p.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // --------------------------------------------------------------- display
  glyph(preset: string): string { return PRESET_GLYPHS[preset] ?? PRESET_GLYPHS['general']; }

  presetLabel(key: string): string {
    return this.presets().find((p) => p.key === key)?.label ?? 'General merchandise';
  }

  unitLabel(unit: string): string {
    return this.units().find((u) => u.value === unit)?.label ?? unit;
  }

  unitShort(unit: string): string {
    return ({ piece: 'pcs', pair: 'pairs', pack: 'packs', box: 'boxes', dozen: 'dz', bunch: 'bunches', crate: 'crates' } as Record<string, string>)[unit] ?? unit;
  }

  typeLabel(type: string): string {
    return ({ physical: 'Physical goods', digital: 'Digital delivery', service: 'Service / booking' } as Record<string, string>)[type] ?? type;
  }

  stockLabel(state: ProductStockState): string { return STOCK_LABELS[state] ?? state; }

  stockPercent(product: TenantProduct): number {
    const threshold = Math.max(1, product.low_stock_threshold || 5);
    return Math.max(4, Math.min(100, Math.round((product.available_stock / (threshold * 4)) * 100)));
  }

  skuOf(product: TenantProduct): string {
    const skus = (product.variants ?? []).map((v) => v.sku).filter(Boolean);
    if (!skus.length) return '—';
    return skus.length === 1 ? skus[0] : `${skus[0]} +${skus.length - 1}`;
  }

  currencyOf(product: TenantProduct): string { return product.store?.currency || this.currency(); }

  storeName(id: number | null): string {
    return this.stores().find((s) => s.id === id)?.name ?? 'No store selected';
  }

  slugPreview(): string {
    return (this.draft.slug || this.draft.name || 'product')
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  unitProfit(): number {
    return Math.max(0, (Number(this.draft.price) || 0) - (Number(this.draft.cost_price) || 0));
  }

  marginPreview(): number | null {
    const price = Number(this.draft.price) || 0;
    const cost = Number(this.draft.cost_price) || 0;
    if (!price || !cost) return null;
    return Math.round(((price - cost) / price) * 1000) / 10;
  }

  discountPreview(): number {
    const price = Number(this.draft.price) || 0;
    const compare = Number(this.draft.compare_at_price) || 0;
    if (compare <= price) return 0;
    return Math.round(((compare - price) / compare) * 100);
  }

  // --------------------------------------------------------------- helpers
  private blankDraft() {
    return {
      id: null as number | null,
      store_id: null as number | null,
      category_id: null as number | null,
      name: '',
      short_description: '',
      description: '',
      status: 'draft' as ProductStatus,
      catalog_preset: 'general',
      product_type: 'physical' as TenantProduct['product_type'],
      brand: '',
      price: 0 as number,
      compare_at_price: null as number | null,
      cost_price: null as number | null,
      tax_class: '',
      tax_rate: null as number | null,
      unit: 'piece',
      unit_amount: null as number | null,
      min_order_qty: 1,
      max_order_qty: null as number | null,
      track_inventory: true,
      allow_backorder: false,
      low_stock_threshold: 5,
      requires_shipping: true,
      weight: null as number | null,
      weight_unit: 'kg',
      length: null as number | null,
      width: null as number | null,
      height: null as number | null,
      dimension_unit: 'cm',
      condition: null as string | null,
      warranty_months: null as number | null,
      is_perishable: false,
      shelf_life_days: null as number | null,
      storage_requirement: null as string | null,
      country_of_origin: '',
      barcode: '',
      tags: [] as string[],
      specs: {} as Record<string, any>,
      is_featured: false,
      seo_title: '',
      seo_description: '',
      slug: '',
    };
  }

  private blankVariant(options: Record<string, string>): VariantDraft {
    return {
      sku: '',
      label: this.labelFromOptions(options),
      options,
      price_override: null,
      cost_price: null,
      barcode: '',
      quantity: 0,
      low_stock_threshold: null,
      batch_reference: '',
      expires_at: '',
      status: 'active',
    };
  }

  private deriveOptionsFromVariants(): OptionDraft[] {
    const map = new Map<string, Set<string>>();
    for (const variant of this.variants) {
      for (const [name, value] of Object.entries(variant.options)) {
        if (!map.has(name)) map.set(name, new Set());
        map.get(name)!.add(value);
      }
    }
    return [...map.entries()].map(([name, values]) => ({ name, values: [...values], input: '' }));
  }

  private cleanOptions(options: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(options ?? {})) {
      if (key === 'default' || value === null || value === undefined) continue;
      out[key] = String(value);
    }
    return out;
  }

  private labelFromOptions(options: Record<string, unknown>): string {
    const parts = Object.entries(this.cleanOptions(options)).map(([, value]) => value);
    return parts.length ? parts.join(' / ') : 'Default';
  }

  private signature(options: Record<string, string>): string {
    return Object.keys(options).sort().map((key) => `${key}:${options[key]}`).join('|');
  }

  private nullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private messageOf(error: any, fallback: string): string {
    return error?.error?.error?.message
      || error?.error?.message
      || (error?.error?.errors ? Object.values(error.error.errors).flat()[0] as string : '')
      || fallback;
  }

  private flash(message: string): void {
    this.toast.set(message);
    setTimeout(() => this.toast.set(''), 2600);
  }
}
