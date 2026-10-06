import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import {
  CatalogCategoriesPayload,
  CatalogProductSummary,
  ModeratedProduct,
  PlatformCategory,
  ProductReportRow,
  TenantCategoryRow,
} from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type Tab = 'categories' | 'mapping' | 'products' | 'reports';

interface CategoryForm {
  parent_id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image_url: string;
  position: string;
  is_active: boolean;
  is_featured: boolean;
  seo_title: string;
  seo_description: string;
}

const BLANK_CATEGORY: CategoryForm = {
  parent_id: '',
  name: '',
  slug: '',
  description: '',
  icon: '',
  image_url: '',
  position: '0',
  is_active: true,
  is_featured: false,
  seo_title: '',
  seo_description: '',
};

@Component({
  selector: 'app-admin-catalog',
  imports: [FormsModule, DatePipe, MoneyPipe],
  template: `
    <main class="page cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">Marketplace catalogue</p>
          <h1>Categories &amp; moderation</h1>
          <p class="intro">
            Curate the global category tree every storefront browses, map seller categories onto it, and approve or
            reject listings before they reach shoppers.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
          <button class="btn" type="button" (click)="newCategory()">New category</button>
        </div>
      </header>

      <section class="cx-stats">
        <div class="cx-stat"><span>Platform categories</span><strong>{{ categorySummary()?.total ?? 0 }}</strong><small>{{ categorySummary()?.active ?? 0 }} active</small></div>
        <div class="cx-stat warn"><span>Unmapped seller categories</span><strong>{{ categorySummary()?.unmapped_tenant_categories ?? 0 }}</strong><small>Need a global parent</small></div>
        <div class="cx-stat warn"><span>Listings pending</span><strong>{{ productSummary()?.pending ?? 0 }}</strong><small>Awaiting a decision</small></div>
        <div class="cx-stat bad"><span>Reported listings</span><strong>{{ productSummary()?.open_reports ?? 0 }}</strong><small>Open reports</small></div>
      </section>

      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }

      <div class="cx-tabs">
        <button type="button" [class.on]="tab() === 'categories'" (click)="tab.set('categories')">Category tree <b>{{ flat().length }}</b></button>
        <button type="button" [class.on]="tab() === 'mapping'" (click)="switchTo('mapping')">Seller mapping <b>{{ categorySummary()?.unmapped_tenant_categories ?? 0 }}</b></button>
        <button type="button" [class.on]="tab() === 'products'" (click)="switchTo('products')">Product moderation <b>{{ productSummary()?.pending ?? 0 }}</b></button>
        <button type="button" [class.on]="tab() === 'reports'" (click)="switchTo('reports')">Reports <b>{{ productSummary()?.open_reports ?? 0 }}</b></button>
      </div>

      @switch (tab()) {
        @case ('categories') {
          <div class="cx-split">
            <section class="cx-panel">
              <header><div><h2>Global category tree</h2><p>Shoppers browse this taxonomy, not individual seller categories.</p></div></header>
              @if (loading()) {
                <div class="cx-skeleton"><span></span><span></span><span></span></div>
              } @else if (!tree().length) {
                <div class="cx-empty">
                  <strong>No categories yet</strong>
                  <p>Build the marketplace taxonomy so sellers can map their own categories onto it.</p>
                  <button class="btn" type="button" (click)="newCategory()">Create the first category</button>
                </div>
              } @else {
                <div class="cx-panel-body tree">
                  @for (parent of tree(); track parent.id) {
                    <div class="node" [class.on]="editing()?.id === parent.id" [class.off]="!parent.is_active" (click)="editCategory(parent)">
                      <strong>{{ parent.name }}</strong>
                      @if (parent.is_featured) { <span class="chip ok plain">Featured</span> }
                      @if (!parent.is_active) { <span class="chip bad plain">Hidden</span> }
                      <span class="count">{{ parent.products_count }} product(s) · {{ parent.tenant_categories_count }} mapped</span>
                    </div>
                    @for (child of parent.children || []; track child.id) {
                      <div class="node child" [class.on]="editing()?.id === child.id" [class.off]="!child.is_active" (click)="editCategory(child)">
                        {{ child.name }}
                        @if (!child.is_active) { <span class="chip bad plain">Hidden</span> }
                        <span class="count">{{ child.products_count }} product(s)</span>
                      </div>
                    }
                  }
                </div>
              }
            </section>

            <aside class="cx-panel">
              <header><div><h2>{{ editing() ? 'Edit category' : 'New category' }}</h2><p>{{ editing()?.slug || 'Top-level or nested, your call.' }}</p></div></header>
              <div class="cx-panel-body cx-form">
                <div class="row">
                  <label>Name<input [(ngModel)]="cf.name" name="cname" placeholder="Electronics" /></label>
                  <label>Slug<input [(ngModel)]="cf.slug" name="cslug" placeholder="electronics" /></label>
                </div>
                <div class="row">
                  <label>
                    Parent
                    <select [(ngModel)]="cf.parent_id" name="cparent">
                      <option value="">Top level</option>
                      @for (option of topLevel(); track option.id) { <option [value]="option.id">{{ option.name }}</option> }
                    </select>
                  </label>
                  <label>Position<input type="number" [(ngModel)]="cf.position" name="cposition" /></label>
                </div>
                <label>Description<textarea [(ngModel)]="cf.description" name="cdescription"></textarea></label>
                <div class="row">
                  <label>Icon<input [(ngModel)]="cf.icon" name="cicon" placeholder="laptop" /></label>
                  <label>Image URL<input [(ngModel)]="cf.image_url" name="cimage" /></label>
                </div>
                <label>SEO title<input [(ngModel)]="cf.seo_title" name="cseotitle" /></label>
                <label>SEO description<textarea [(ngModel)]="cf.seo_description" name="cseodesc"></textarea></label>
                <label class="check"><input type="checkbox" [(ngModel)]="cf.is_active" name="cactive" /> Visible on the storefront</label>
                <label class="check"><input type="checkbox" [(ngModel)]="cf.is_featured" name="cfeatured" /> Feature on the home page</label>
                <div class="actions">
                  <button class="btn" type="button" (click)="saveCategory()" [disabled]="busy() || !cf.name.trim()">
                    {{ busy() ? 'Saving…' : editing() ? 'Save category' : 'Create category' }}
                  </button>
                  @if (editing()) {
                    <button class="btn ghost" type="button" (click)="newCategory()">New</button>
                    <button class="btn ghost" type="button" (click)="deleteCategory()">Delete</button>
                  }
                </div>
              </div>
            </aside>
          </div>
        }

        @case ('mapping') {
          <div class="cx-toolbar">
            <input type="search" [(ngModel)]="mappingQuery" name="mq" placeholder="Search seller category" (keyup.enter)="loadTenantCategories()" />
            <label class="inline-check"><input type="checkbox" [(ngModel)]="unmappedOnly" name="unmapped" (ngModelChange)="loadTenantCategories()" /> Unmapped only</label>
            <select class="spacer" [(ngModel)]="mapTo" name="mapto">
              <option value="">Map selected to…</option>
              @for (option of flat(); track option.id) { <option [value]="option.id">{{ option.name }}</option> }
            </select>
            <button class="mini go" type="button" [disabled]="!mapSelection().length || !mapTo" (click)="applyMapping()">
              Map {{ mapSelection().length }} category(ies)
            </button>
          </div>

          <section class="cx-panel">
            <header><div><h2>Seller categories</h2><p>Mapping cascades to every product inside the category.</p></div></header>
            @if (!tenantCategories().length) {
              <div class="cx-empty"><strong>Nothing to map</strong><p>Every seller category already points at a global category.</p></div>
            } @else {
              <div class="cx-table-scroll">
                <table class="cx-table">
                  <thead><tr><th class="act"></th><th>Seller category</th><th>Tenant</th><th>Mapped to</th><th class="num">Products</th></tr></thead>
                  <tbody>
                    @for (row of tenantCategories(); track row.id) {
                      <tr>
                        <td class="act"><input type="checkbox" [checked]="mapSelection().includes(row.id)" (change)="toggleMap(row.id)" [attr.aria-label]="'Select ' + row.name" /></td>
                        <td><strong>{{ row.name }}</strong><span class="sub">/{{ row.slug }}</span></td>
                        <td>{{ row.tenant || 'Tenant #' + row.tenant_id }}</td>
                        <td>
                          @if (row.platform_category) { <span class="chip ok plain">{{ row.platform_category }}</span> }
                          @else { <span class="chip warn">Unmapped</span> }
                        </td>
                        <td class="num">{{ row.products_count }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        }

        @case ('products') {
          <div class="cx-toolbar">
            <input type="search" [(ngModel)]="productQuery" name="pq" placeholder="Search product, seller or SKU" (keyup.enter)="loadProducts()" />
            <select [(ngModel)]="moderationStatus" name="pstatus" (ngModelChange)="loadProducts()">
              <option value="">Every status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="flagged">Flagged</option>
              <option value="rejected">Rejected</option>
            </select>
            @if (productSelection().length) {
              <button class="mini go spacer" type="button" (click)="bulkModerate('approved')">Approve {{ productSelection().length }}</button>
              <button class="mini danger" type="button" (click)="bulkModerate('rejected')">Reject {{ productSelection().length }}</button>
            }
          </div>

          <section class="cx-panel">
            <header>
              <div><h2>Listing moderation</h2><p>{{ products().length }} listing(s) on this page.</p></div>
              <label class="inline-check"><input type="checkbox" [checked]="allProductsSelected()" (change)="toggleAllProducts()" /> Select all</label>
            </header>
            @if (!products().length) {
              <div class="cx-empty"><strong>Nothing to moderate</strong><p>No listings match this filter.</p></div>
            } @else {
              <div class="cx-table-scroll">
                <table class="cx-table">
                  <thead><tr><th class="act"></th><th>Product</th><th>Seller</th><th>Category</th><th class="num">Price</th><th>Moderation</th><th class="act"></th></tr></thead>
                  <tbody>
                    @for (product of products(); track product.id) {
                      <tr>
                        <td class="act"><input type="checkbox" [checked]="productSelection().includes(product.id)" (change)="toggleProduct(product.id)" [attr.aria-label]="'Select ' + product.name" /></td>
                        <td>
                          <div class="cx-media">
                            <img class="cx-thumb" [src]="product.image || placeholder" [alt]="product.name" />
                            <div>
                              <strong>{{ product.name }}</strong>
                              <span class="sub">{{ product.store?.name }} · {{ product.created_at ? (product.created_at | date: 'MMM d, y') : '' }}</span>
                              @if (product.report_count) { <span class="chip bad">{{ product.report_count }} report(s)</span> }
                            </div>
                          </div>
                        </td>
                        <td>{{ product.tenant || '—' }}</td>
                        <td>
                          {{ product.category || '—' }}
                          <span class="sub">{{ product.platform_category || 'Unmapped' }}</span>
                        </td>
                        <td class="num">{{ product.price | money }}</td>
                        <td>
                          <span class="chip" [class]="'chip ' + product.moderation_status">{{ pretty(product.moderation_status) }}</span>
                          @if (product.moderation_note) { <span class="sub">{{ product.moderation_note }}</span> }
                        </td>
                        <td class="act">
                          <button class="mini go" type="button" (click)="moderate(product, 'approved')">Approve</button>
                          <button class="mini" type="button" (click)="moderate(product, 'flagged')">Flag</button>
                          <button class="mini danger" type="button" (click)="moderate(product, 'rejected')">Reject</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <footer>
                <span>Page {{ page() }} of {{ lastPage() }}</span>
                <span class="cx-pager">
                  <button type="button" [disabled]="page() <= 1" (click)="goProducts(page() - 1)">Previous</button>
                  <button type="button" [disabled]="page() >= lastPage()" (click)="goProducts(page() + 1)">Next</button>
                </span>
              </footer>
            }
          </section>
        }

        @case ('reports') {
          <section class="cx-panel">
            <header><div><h2>Reported listings</h2><p>Flagged by shoppers for counterfeit, prohibited or misleading content.</p></div></header>
            @if (!reports().length) {
              <div class="cx-empty"><strong>No open reports</strong><p>Nothing has been reported against a listing.</p></div>
            } @else {
              <div class="cx-table-scroll">
                <table class="cx-table">
                  <thead><tr><th>Product</th><th>Reason</th><th>Reported by</th><th>When</th><th class="act"></th></tr></thead>
                  <tbody>
                    @for (report of reports(); track report.id) {
                      <tr>
                        <td><strong>{{ report.product?.name }}</strong><span class="sub">{{ report.product?.store }}</span></td>
                        <td>{{ pretty(report.reason) }}@if (report.note) { <span class="sub">{{ report.note }}</span> }</td>
                        <td>{{ report.reporter || 'Anonymous' }}</td>
                        <td>{{ report.created_at ? (report.created_at | date: 'MMM d, y') : '—' }}</td>
                        <td class="act">
                          <button class="mini danger" type="button" (click)="resolveReport(report, 'actioned')">Take down</button>
                          <button class="mini" type="button" (click)="resolveReport(report, 'dismissed')">Dismiss</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        }
      }
    </main>
  `,
  styles: [
    `
      .page { width: min(1240px, calc(100% - 40px)); margin: 0 auto; }
      .inline-check { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 650; color: var(--ink-soft); }
      .inline-check input { width: 15px; height: 15px; }
    `,
  ],
})
export class AdminCatalogComponent {
  private api = inject(ApiService);

  readonly placeholder = '/assets/placeholder.svg';

  tab = signal<Tab>('categories');
  categories = signal<CatalogCategoriesPayload | null>(null);
  tenantCategories = signal<TenantCategoryRow[]>([]);
  products = signal<ModeratedProduct[]>([]);
  productSummary = signal<CatalogProductSummary | null>(null);
  reports = signal<ProductReportRow[]>([]);
  editing = signal<PlatformCategory | null>(null);
  mapSelection = signal<number[]>([]);
  productSelection = signal<number[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  message = signal('');
  page = signal(1);
  lastPage = signal(1);

  cf: CategoryForm = { ...BLANK_CATEGORY };
  mappingQuery = '';
  unmappedOnly = true;
  mapTo = '';
  productQuery = '';
  moderationStatus = 'pending';

  tree = computed<PlatformCategory[]>(() => this.categories()?.tree ?? []);
  flat = computed<PlatformCategory[]>(() => this.categories()?.flat ?? []);
  topLevel = computed<PlatformCategory[]>(() => this.tree());
  categorySummary = computed(() => this.categories()?.summary ?? null);

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.catalogCategories().subscribe({
      next: (res) => {
        this.categories.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load the category tree.');
      },
    });
    this.api.catalogProducts({ per_page: '1' }).subscribe({
      next: (res) => this.productSummary.set(res.summary),
      error: () => undefined,
    });
  }

  switchTo(tab: Tab) {
    this.tab.set(tab);
    if (tab === 'mapping') this.loadTenantCategories();
    if (tab === 'products') this.loadProducts();
    if (tab === 'reports') this.loadReports();
  }

  // ---- categories ----------------------------------------------------------

  newCategory() {
    this.editing.set(null);
    this.cf = { ...BLANK_CATEGORY };
    this.tab.set('categories');
  }

  editCategory(category: PlatformCategory) {
    this.editing.set(category);
    this.cf = {
      parent_id: category.parent_id ? String(category.parent_id) : '',
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || '',
      image_url: category.image_url || '',
      position: String(category.position ?? 0),
      is_active: category.is_active,
      is_featured: category.is_featured,
      seo_title: category.seo_title || '',
      seo_description: category.seo_description || '',
    };
  }

  saveCategory() {
    const payload: Record<string, unknown> = {
      parent_id: this.cf.parent_id ? Number(this.cf.parent_id) : null,
      name: this.cf.name.trim(),
      slug: this.cf.slug.trim() || null,
      description: this.cf.description || null,
      icon: this.cf.icon || null,
      image_url: this.cf.image_url || null,
      position: Number(this.cf.position || 0),
      is_active: this.cf.is_active,
      is_featured: this.cf.is_featured,
      seo_title: this.cf.seo_title || null,
      seo_description: this.cf.seo_description || null,
    };

    this.busy.set(true);
    const existing = this.editing();
    const call = existing ? this.api.updatePlatformCategory(existing.id, payload) : this.api.createPlatformCategory(payload);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.message.set(existing ? 'Category updated.' : 'Category created.');
        this.newCategory();
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'That category could not be saved.');
      },
    });
  }

  deleteCategory() {
    const existing = this.editing();
    if (!existing) return;
    this.api.deletePlatformCategory(existing.id).subscribe({
      next: () => {
        this.message.set(`${existing.name} deleted.`);
        this.newCategory();
        this.load();
      },
      error: (err) => this.error.set(err?.error?.message || 'That category could not be deleted.'),
    });
  }

  // ---- mapping -------------------------------------------------------------

  loadTenantCategories() {
    const params: Record<string, string> = { per_page: '100' };
    if (this.mappingQuery.trim()) params['q'] = this.mappingQuery.trim();
    if (this.unmappedOnly) params['unmapped'] = '1';
    this.api.catalogTenantCategories(params).subscribe({
      next: (res) => {
        this.tenantCategories.set(res.data || []);
        this.mapSelection.set([]);
      },
      error: () => this.error.set('We could not load seller categories.'),
    });
  }

  toggleMap(id: number) {
    const current = this.mapSelection();
    this.mapSelection.set(current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  applyMapping() {
    this.busy.set(true);
    this.api.mapTenantCategories(this.mapSelection(), Number(this.mapTo), true).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.message.set(`${res.data.categories} category(ies) and ${res.data.products} product(s) mapped.`);
        this.loadTenantCategories();
        this.load();
      },
      error: () => {
        this.busy.set(false);
        this.error.set('That mapping could not be applied.');
      },
    });
  }

  // ---- products ------------------------------------------------------------

  loadProducts() {
    const params: Record<string, string> = { page: String(this.page()), per_page: '20' };
    if (this.productQuery.trim()) params['q'] = this.productQuery.trim();
    if (this.moderationStatus) params['moderation_status'] = this.moderationStatus;
    this.api.catalogProducts(params).subscribe({
      next: (res) => {
        this.products.set(res.data || []);
        this.productSummary.set(res.summary);
        this.lastPage.set(res.meta?.last_page || 1);
        this.productSelection.set([]);
      },
      error: () => this.error.set('We could not load listings.'),
    });
  }

  goProducts(page: number) {
    this.page.set(Math.max(1, Math.min(page, this.lastPage())));
    this.loadProducts();
  }

  toggleProduct(id: number) {
    const current = this.productSelection();
    this.productSelection.set(current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  allProductsSelected(): boolean {
    return this.products().length > 0 && this.productSelection().length === this.products().length;
  }

  toggleAllProducts() {
    this.productSelection.set(this.allProductsSelected() ? [] : this.products().map((product) => product.id));
  }

  moderate(product: ModeratedProduct, status: string) {
    this.api.moderateProduct(product.id, { moderation_status: status }).subscribe({
      next: () => {
        this.message.set(`${product.name} ${status}.`);
        this.loadProducts();
      },
      error: () => this.error.set('That decision could not be saved.'),
    });
  }

  bulkModerate(status: string) {
    const ids = this.productSelection();
    if (!ids.length) return;
    this.api.bulkModerateProducts(ids, status).subscribe({
      next: (res) => {
        this.message.set(`${res.data.updated} listing(s) ${status}.`);
        this.loadProducts();
      },
      error: () => this.error.set('The bulk action failed.'),
    });
  }

  // ---- reports -------------------------------------------------------------

  loadReports() {
    this.api.catalogReports({ status: 'open', per_page: '40' }).subscribe({
      next: (res) => this.reports.set(res.data || []),
      error: () => this.error.set('We could not load listing reports.'),
    });
  }

  resolveReport(report: ProductReportRow, status: string) {
    this.api.resolveCatalogReport(report.id, status).subscribe({
      next: () => {
        this.reports.set(this.reports().filter((row) => row.id !== report.id));
        this.message.set(status === 'actioned' ? 'Listing taken down.' : 'Report dismissed.');
      },
      error: () => this.error.set('That report could not be resolved.'),
    });
  }

  pretty(value: string | null | undefined): string {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
