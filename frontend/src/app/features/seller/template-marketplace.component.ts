import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { PageTemplate, PaymentMethod, Storefront, TemplateCategory, TemplatePurchase } from '../../core/models';

@Component({
  selector: 'app-template-marketplace',
  imports: [FormsModule, DatePipe],
  template: `
    <main class="marketplace">
      <header class="hero-head">
        <div>
          <p class="eyebrow">Store design · made simple</p>
          <h1>Template marketplace</h1>
          <p class="lede">Find a storefront design, preview it on every screen, then make it yours. Your customizations never change the original template.</p>
        </div>
        <div class="head-mark"><span>✳</span><b>DESIGN<br />YOUR STORE</b></div>
      </header>

      @if (notice()) { <div class="notice" [class.bad]="noticeKind() === 'error'">{{ notice() }}</div> }

      <div class="switcher" role="tablist" aria-label="Template pages">
        <button type="button" [class.active]="view() === 'browse'" (click)="view.set('browse')">Explore templates</button>
        <button type="button" [class.active]="view() === 'library'" (click)="view.set('library'); loadLibrary()">My library <span>{{ library().length }}</span></button>
      </div>

      @if (loading()) {
        <div class="loading"><i></i><span>Loading templates…</span></div>
      } @else if (view() === 'browse') {
        <section class="catalog-layout">
          <aside class="filters">
            <div class="filter-head"><h2>Categories</h2><button type="button" (click)="setCategory('')">Reset</button></div>
            <button type="button" class="category" [class.selected]="!category()" (click)="setCategory('')">All storefronts <span>{{ total() }}</span></button>
            @for (item of categories(); track item.id) {
              <button type="button" class="category" [class.selected]="category() === item.slug" (click)="setCategory(item.slug)">
                <span>{{ item.icon || '✦' }} {{ item.name }}</span><span>›</span>
              </button>
            }
            <div class="filter-note"><b>One-time licence</b><p>Buy once, install on your store, then customize freely.</p></div>
          </aside>

          <div class="results">
            <div class="results-head">
              <div><span class="muted">{{ total() }} designs</span><h2>{{ selectedCategory()?.name || 'All storefront templates' }}</h2></div>
              <label class="search"><span>⌕</span><input [(ngModel)]="query" (keyup.enter)="loadCatalog()" placeholder="Search templates" /><button type="button" (click)="loadCatalog()">Search</button></label>
              @if (paymentMethods().length > 1) { <label class="checkout-select">Pay with<select [ngModel]="selectedPaymentMethod()" (ngModelChange)="selectedPaymentMethod.set($event)">@for (method of paymentMethods(); track method.key) { <option [value]="method.key">{{ method.label }}</option> }</select></label> }
            </div>
            @if (templates().length) {
              <div class="template-grid">
                @for (template of templates(); track template.id) {
                  <article class="template-card">
                    <button type="button" class="artwork" [class]="'artwork tone-' + (template.id % 5)" (click)="openPreview(template)" [attr.aria-label]="'Preview ' + template.name">
                      @if (template.thumbnail) { <img [src]="template.thumbnail" [alt]="template.name + ' preview'" /> }
                      @else {
                        <div class="mini-site" [style.--mini-primary]="template.definition.theme.primary_color || '#244d43'" [style.--mini-accent]="template.definition.theme.accent_color || '#d78052'">
                          <div class="mini-top"><i></i><i></i><i></i><b>{{ template.name }}</b></div>
                          <div class="mini-hero"><small>{{ template.definition.pages.home[0]?.badge || 'A STORE THAT FEELS LIKE YOU' }}</small><strong>{{ template.definition.pages.home[0]?.title || template.name }}</strong><span>{{ template.definition.pages.home[0]?.subtitle || 'Thoughtfully designed for your next chapter.' }}</span><em>Explore collection&nbsp; →</em></div>
                          <div class="mini-products"><i></i><i></i><i></i></div>
                        </div>
                      }
                      <span class="preview-hint">Preview design <b>↗</b></span>
                      @if (template.is_featured) { <span class="featured-tag">✦ Featured</span> }
                    </button>
                    <div class="card-copy">
                      <div class="card-title"><div><p>{{ template.category?.name || 'Storefront' }}</p><h3>{{ template.name }}</h3></div><span class="rating">★ {{ template.rating_avg || '5.0' }}</span></div>
                      <p class="description">{{ template.description || 'A complete storefront design ready to customize.' }}</p>
                      <div class="card-footer"><strong class="price">{{ price(template) }}</strong><div class="actions">
                        <button type="button" class="preview-btn" (click)="openPreview(template)">Preview</button>
                        @if (template.is_owned) {
                          <button type="button" class="buy-btn owned" (click)="chooseStore(template)">Use template <span>→</span></button>
                        } @else {
                          <button type="button" class="buy-btn" (click)="buy(template)" [disabled]="busyId() === template.id">{{ busyId() === template.id ? 'Working…' : (Number(template.price) === 0 ? 'Get free' : 'Buy template') }}</button>
                        }
                      </div></div>
                    </div>
                  </article>
                }
              </div>
            } @else {
              <div class="empty"><span>⌕</span><h3>No templates found</h3><p>Try another category or search term.</p><button type="button" (click)="query = ''; setCategory('')">Clear filters</button></div>
            }
          </div>
        </section>
      } @else {
        <section class="library-view">
          <div class="library-head"><div><p class="eyebrow">Your designs</p><h2>My template library</h2><p>Purchased licences stay with your workspace. Install a design on any store you manage.</p></div><button class="outline" (click)="view.set('browse')">Browse marketplace</button></div>
          @if (libraryLoading()) { <div class="loading"><i></i><span>Loading your library…</span></div> }
          @else if (library().length) {
            <div class="library-list">
              @for (purchase of library(); track purchase.id) {
                <article class="library-row">
                  <div class="library-thumb" [style.--mini-primary]="purchase.template.definition.theme.primary_color || '#244d43'">
                    @if (purchase.template.thumbnail) { <img [src]="purchase.template.thumbnail" [alt]="purchase.template.name" /> }
                    @else { <span>{{ purchase.template.name.slice(0, 1) }}</span> }
                  </div>
                  <div class="library-info"><p>{{ purchase.template.category?.name || 'Storefront' }} · v{{ purchase.template.version }}</p><h3>{{ purchase.template.name }}</h3><small>{{ purchase.payment_status === 'paid' ? 'Licensed to your workspace' : 'Payment pending' }}</small>@if (purchase.purchased_at) { <small>Purchased {{ purchase.purchased_at | date:'mediumDate' }}</small> }</div>
                  <div class="installed-list">
                    @for (installation of (purchase.installations || []); track installation.id) {
                      <span>Installed · {{ installation.store?.name || 'Store' }}</span>
                    }
                  </div>
                  <div class="row-actions"><button type="button" class="preview-btn" (click)="openPreview(purchase.template)">Preview</button><button type="button" class="buy-btn" [disabled]="purchase.payment_status !== 'paid'" (click)="chooseStore(purchase.template)">Use template →</button></div>
                </article>
              }
            </div>
          } @else {
            <div class="empty"><span>✳</span><h3>Your library is ready for its first design</h3><p>Free and purchased templates will appear here.</p><button type="button" (click)="view.set('browse')">Explore templates</button></div>
          }
        </section>
      }
    </main>

    @if (preview(); as template) {
      <div class="modal-backdrop" (click)="closePreview()">
        <section class="preview-modal" role="dialog" aria-modal="true" [attr.aria-label]="template.name + ' preview'" (click)="$event.stopPropagation()">
          <header><div><p class="eyebrow">{{ template.category?.name || 'Storefront template' }}</p><h2>{{ template.name }}</h2></div><button type="button" class="close" (click)="closePreview()">×</button></header>
          <div class="preview-tools"><p>{{ template.description || 'A flexible, responsive design for your storefront.' }}</p><div><button type="button" [class.active]="previewDevice() === 'desktop'" (click)="previewDevice.set('desktop')">▣ Desktop</button><button type="button" [class.active]="previewDevice() === 'mobile'" (click)="previewDevice.set('mobile')">▯ Mobile</button></div></div>
          <div class="preview-stage">
            <div class="preview-canvas" [class.mobile]="previewDevice() === 'mobile'" [style.--mini-primary]="template.definition.theme.primary_color || '#244d43'" [style.--mini-accent]="template.definition.theme.accent_color || '#d78052'">
              <div class="canvas-nav"><b>{{ template.name }}</b><span>Home　 Shop　 Our story　 Contact</span><i>Bag</i></div>
              @for (section of template.definition.pages.home; track section.id) {
                @if (section.enabled) {
                  @if (section.type === 'hero') {
                    <section class="canvas-hero" [class.centered]="section.layout === 'centered'" [class.image-hero]="section.layout === 'full_banner'" [style.background-image]="section.layout === 'full_banner' && section.image_url ? 'linear-gradient(90deg,rgba(0,0,0,.5),rgba(0,0,0,.1)),url(' + section.image_url + ')' : ''">
                      <div><small>{{ section.badge || 'WELCOME' }}</small><h1>{{ section.title || template.name }}</h1><p>{{ section.subtitle || 'Considered pieces, made to last.' }}</p><button>{{ section.button_text || 'Shop collection' }} →</button></div>
                      @if (section.layout !== 'centered' && section.layout !== 'full_banner') { <div class="canvas-image" [style.background-image]="section.image_url ? 'url(' + section.image_url + ')' : ''"></div> }
                    </section>
                  } @else if (section.type === 'featured_products' || section.type === 'product_grid') {
                    <section class="canvas-products"><small>{{ section.badge || 'THE COLLECTION' }}</small><h2>{{ section.title || 'Made for everyday' }}</h2><div><i></i><i></i><i></i><i></i></div></section>
                  } @else if (section.type === 'banner') {
                    <section class="canvas-banner" [style.background-image]="section.image_url ? 'linear-gradient(90deg,rgba(0,0,0,.5),rgba(0,0,0,.2)),url(' + section.image_url + ')' : ''"><small>{{ section.badge || 'A LITTLE SOMETHING SPECIAL' }}</small><h2>{{ section.title }}</h2><p>{{ section.subtitle }}</p></section>
                  } @else if (section.type === 'trust_bar') {
                    <div class="canvas-trust"><span>✓ Secure checkout</span><span>✦ Independent design</span><span>↗ Reliable delivery</span></div>
                  } @else if (section.type === 'rich_text') {
                    <section class="canvas-story"><small>{{ section.badge || 'OUR STORY' }}</small><h2>{{ section.title }}</h2><p>{{ section.subtitle || section.content }}</p></section>
                  } @else {
                    <section class="canvas-extra"><small>{{ section.badge || section.type.replace('_', ' ').toUpperCase() }}</small><h2>{{ section.title || 'Thoughtfully made' }}</h2><p>{{ section.subtitle || section.content || 'A considered section for your storefront.' }}</p></section>
                  }
                }
              }
            </div>
          </div>
          <footer><div><strong>{{ price(template) }}</strong><small>One-time licence · customise after installing</small></div>@if (template.is_owned) { <button class="buy-btn" (click)="chooseStore(template); closePreview()">Use this template →</button> } @else { <button class="buy-btn" (click)="buy(template); closePreview()">{{ Number(template.price) === 0 ? 'Get free template' : 'Buy template' }} →</button> }</footer>
        </section>
      </div>
    }

    @if (installTarget(); as template) {
      <div class="modal-backdrop" (click)="installTarget.set(null)">
        <section class="install-modal" role="dialog" aria-modal="true" aria-label="Choose a store" (click)="$event.stopPropagation()">
          <button type="button" class="close" (click)="installTarget.set(null)">×</button>
          <span class="modal-icon">✦</span><p class="eyebrow">Ready when you are</p><h2>Choose a storefront</h2><p>Install <b>{{ template.name }}</b> as a separate, editable copy. Your existing theme and sections will be saved as a revision.</p>
          @if (stores().length) {
            <label class="store-select">Install on<select [(ngModel)]="selectedStoreId"><option [ngValue]="null" disabled>Select a storefront</option>@for (store of stores(); track store.id) { <option [ngValue]="store.id">{{ store.name }} · /stores/{{ store.slug }}</option> }</select></label>
            <button type="button" class="buy-btn full" [disabled]="!selectedStoreId || installing()" (click)="install(template)">{{ installing() ? 'Installing…' : 'Install and open builder →' }}</button>
          } @else {
            <div class="no-stores">Create a storefront before installing a template.</div><button type="button" class="buy-btn full" (click)="router.navigate(['/tenant/stores'])">Create storefront</button>
          }
        </section>
      </div>
    }
  `,
  styles: [],
})
export class TemplateMarketplaceComponent implements OnInit {
  readonly Number = Number;
  readonly router = inject(Router);
  private readonly api = inject(ApiService);

  templates = signal<PageTemplate[]>([]);
  categories = signal<TemplateCategory[]>([]);
  library = signal<TemplatePurchase[]>([]);
  stores = signal<Storefront[]>([]);
  paymentMethods = signal<PaymentMethod[]>([]);
  selectedPaymentMethod = signal('card');
  loading = signal(true);
  libraryLoading = signal(false);
  notice = signal('');
  noticeKind = signal<'success' | 'error'>('success');
  busyId = signal<number | null>(null);
  view = signal<'browse' | 'library'>('browse');
  category = signal('');
  query = '';
  total = signal(0);
  currency = signal('USD');
  preview = signal<PageTemplate | null>(null);
  previewDevice = signal<'desktop' | 'mobile'>('desktop');
  installTarget = signal<PageTemplate | null>(null);
  selectedStoreId: number | null = null;
  installing = signal(false);

  selectedCategory = computed(() => this.categories().find((item) => item.slug === this.category()) || null);

  ngOnInit() {
    this.loadCatalog();
    this.loadLibrary();
    this.api.sellerStores().subscribe({
      next: (res) => this.stores.set((res.data || []) as Storefront[]),
      error: () => undefined,
    });
    this.api.paymentMethods().subscribe({
      next: (res) => {
        const methods = (res.data.methods || []).filter((method) => method.online);
        this.paymentMethods.set(methods);
        if (!methods.some((method) => method.key === this.selectedPaymentMethod())) this.selectedPaymentMethod.set(methods[0]?.key || 'card');
      },
      error: () => undefined,
    });
  }

  loadCatalog() {
    this.loading.set(true);
    const params: Record<string, string | number> = { per_page: 60 };
    if (this.category()) params['category'] = this.category();
    if (this.query.trim()) params['q'] = this.query.trim();
    this.api.templateCatalog(params).subscribe({
      next: (res) => {
        this.templates.set(res.data || []);
        this.categories.set(res.categories || []);
        this.total.set(res.meta?.total ?? res.data?.length ?? 0);
        this.currency.set(res.currency || 'USD');
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.setNotice(this.errorMessage(error, 'Could not load the template marketplace.'), 'error');
      },
    });
  }

  loadLibrary() {
    this.libraryLoading.set(true);
    this.api.templateLibrary().subscribe({
      next: (res) => { this.library.set(res.data || []); this.libraryLoading.set(false); },
      error: () => this.libraryLoading.set(false),
    });
  }

  setCategory(slug: string) { this.category.set(slug); this.loadCatalog(); }

  price(template: PageTemplate): string {
    return Number(template.price) === 0 ? 'Free' : `${template.currency || this.currency()} ${Number(template.price).toFixed(2)}`;
  }

  buy(template: PageTemplate) {
    if (this.busyId()) return;
    this.notice.set('');
    this.busyId.set(template.id);
    const method = Number(template.price) > 0 ? this.selectedPaymentMethod() : undefined;
    this.api.purchaseTemplate(template.id, method).subscribe({
      next: (res) => {
        const checkout = res.data.checkout;
        if (checkout?.type === 'mock') {
          this.api.mockPay(checkout.url).subscribe({
            next: () => this.purchaseComplete(template),
            error: (error) => { this.busyId.set(null); this.setNotice(this.errorMessage(error, 'Mock checkout could not complete.'), 'error'); },
          });
        } else if (checkout?.url) {
          window.location.assign(checkout.url);
        } else {
          this.purchaseComplete(template);
        }
      },
      error: (error) => {
        this.busyId.set(null);
        this.setNotice(this.errorMessage(error, 'Could not start template checkout.'), 'error');
      },
    });
  }

  purchaseComplete(template: PageTemplate) {
    this.busyId.set(null);
    this.setNotice(`${template.name} is now in your library. Choose a store to install your editable copy.`);
    this.library.update((items) => {
      if (items.some((item) => item.template_id === template.id)) return items;
      return [{
        id: -template.id,
        tenant_id: 0,
        template_id: template.id,
        amount: template.price,
        currency: template.currency,
        payment_status: 'paid',
        template,
      }, ...items];
    });
    this.templates.update((items) => items.map((item) => item.id === template.id ? { ...item, is_owned: true } : item));
    this.view.set('library');
    this.loadLibrary();
    this.chooseStore({ ...template, is_owned: true });
  }

  chooseStore(template: PageTemplate) {
    this.selectedStoreId = this.stores()[0]?.id ?? null;
    this.installTarget.set(template);
  }

  install(template: PageTemplate) {
    if (!this.selectedStoreId) return;
    this.installing.set(true);
    this.api.installTemplate(template.id, this.selectedStoreId).subscribe({
      next: () => {
        const storeId = this.selectedStoreId;
        this.installing.set(false);
        this.installTarget.set(null);
        this.setNotice(`${template.name} was installed. Opening the page builder…`);
        if (storeId) this.router.navigate(['/tenant/stores', storeId, 'builder']);
      },
      error: (error) => {
        this.installing.set(false);
        this.setNotice(this.errorMessage(error, 'Could not install this template.'), 'error');
      },
    });
  }

  openPreview(template: PageTemplate) { this.previewDevice.set('desktop'); this.preview.set(template); }
  closePreview() { this.preview.set(null); }

  setNotice(message: string, kind: 'success' | 'error' = 'success') {
    this.notice.set(message);
    this.noticeKind.set(kind);
    if (message) window.setTimeout(() => { if (this.notice() === message) this.notice.set(''); }, 6500);
  }

  errorMessage(error: any, fallback: string): string {
    return error?.error?.error?.message || error?.error?.message || fallback;
  }
}
