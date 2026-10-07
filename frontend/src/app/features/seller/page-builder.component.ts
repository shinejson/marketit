import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { PageRevision, StorePageSection, StoreThemeConfig, Storefront, TenantPage, TenantProduct } from '../../core/models';

type BuilderDevice = 'desktop' | 'tablet' | 'mobile';
type SectionType = 'hero' | 'featured_products' | 'product_grid' | 'category_grid' | 'banner' | 'rich_text' | 'image' | 'production' | 'gallery' | 'trust_bar' | 'reviews' | 'newsletter' | 'contact_card' | 'faq' | 'spacer' | 'testimonials';
type ResponsiveKey = 'columns' | 'padding' | 'font_size';

@Component({
  selector: 'app-page-builder',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    @if (loading()) {
      <div class="opening"><i></i><p>Opening your visual builder…</p></div>
    } @else if (store(); as s) {
      <header class="builder-head">
        <div class="builder-brand">
          <a routerLink="/tenant/stores" class="back">← Stores</a>
          <span class="divider">/</span>
          <div><p>STOREFRONT STUDIO</p><h1>{{ s.name }} <span>Page Builder</span></h1></div>
        </div>
        <div class="head-actions">
          <a class="link-btn" routerLink="/tenant/templates">✦ Templates</a>
          @if (currentPage(); as page) { <button class="link-btn" type="button" (click)="togglePageStatus()" [disabled]="saving()">{{ page.status === 'published' ? 'Unpublish page' : 'Publish page' }}</button> }
          <button class="link-btn" type="button" (click)="openPreview()">↗ Preview</button>
          <button class="save-btn" type="button" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : saved() ? '✓ Saved' : 'Save changes' }}</button>
        </div>
      </header>

      @if (error()) { <div class="toast error">{{ error() }}</div> }
      @if (success()) { <div class="toast">{{ success() }}</div> }

      <div class="builder-toolbar">
        <div class="page-switch">
          <span>Editing</span>
          <button type="button" [class.active]="activePage() === 'home'" (click)="selectPage('home')">⌂ Home</button>
          @for (page of pages(); track page.id) {
            <button type="button" [class.active]="activePage() === String(page.id)" (click)="selectPage(page.id.toString())">{{ page.name }} <i [class.published]="page.status === 'published'">{{ page.status === 'published' ? 'Live' : 'Draft' }}</i></button>
          }
          <button type="button" class="add-page" (click)="pageDialog.set(true)">＋ New page</button>
        </div>
        <div class="device-switch" aria-label="Preview device">
          <button type="button" [class.active]="device() === 'desktop'" (click)="device.set('desktop')" aria-label="Desktop preview">▰</button>
          <button type="button" [class.active]="device() === 'tablet'" (click)="device.set('tablet')" aria-label="Tablet preview">▭</button>
          <button type="button" [class.active]="device() === 'mobile'" (click)="device.set('mobile')" aria-label="Mobile preview">▯</button>
          <span>{{ device() === 'desktop' ? 'Desktop' : device() === 'tablet' ? 'Tablet' : 'Mobile' }}</span>
        </div>
      </div>

      <main class="builder-layout">
        <aside class="elements-panel">
          <div class="panel-heading"><div><p class="overline">Build your page</p><h2>Elements</h2></div><span class="count">{{ sections().length }}</span></div>
          <div class="element-groups">
            <section><h3>Commerce</h3><div class="element-grid">
              <button type="button" (click)="addSection('product_grid')"><b>▦</b><span>Product grid</span></button>
              <button type="button" (click)="addSection('featured_products')"><b>✦</b><span>Featured products</span></button>
              <button type="button" (click)="addSection('category_grid')"><b>⌘</b><span>Categories</span></button>
            </div></section>
            <section><h3>Content</h3><div class="element-grid">
              <button type="button" (click)="addSection('hero')"><b>▧</b><span>Hero</span></button>
              <button type="button" (click)="addSection('rich_text')"><b>¶</b><span>Text</span></button>
              <button type="button" (click)="addSection('image')"><b>▤</b><span>Image</span></button>
              <button type="button" (click)="addSection('banner')"><b>▰</b><span>Banner</span></button>
              <button type="button" (click)="addSection('gallery')"><b>▦</b><span>Gallery</span></button>
              <button type="button" (click)="addSection('spacer')"><b>↕</b><span>Spacer</span></button>
            </div></section>
            <section><h3>Marketing & trust</h3><div class="element-grid">
              <button type="button" (click)="addSection('testimonials')"><b>❝</b><span>Testimonials</span></button>
              <button type="button" (click)="addSection('faq')"><b>?</b><span>FAQ</span></button>
              <button type="button" (click)="addSection('reviews')"><b>★</b><span>Reviews</span></button>
              <button type="button" (click)="addSection('trust_bar')"><b>✓</b><span>Trust bar</span></button>
              <button type="button" (click)="addSection('newsletter')"><b>✉</b><span>Newsletter</span></button>
              <button type="button" (click)="addSection('contact_card')"><b>◎</b><span>Contact</span></button>
            </div></section>
          </div>
          <div class="sections-heading"><div><p class="overline">Page structure</p><h2>Sections</h2></div><button type="button" title="Add section" (click)="addSection('rich_text')">＋</button></div>
          <div class="section-list">
            @for (section of sections(); track section.id; let i = $index) {
              <div class="section-row" [class.chosen]="selectedSectionId() === section.id" [class.disabled]="!section.enabled" draggable="true" (dragstart)="dragStart($event, section.id)" (dragover)="dragOver($event)" (drop)="dropSection($event, section.id)">
                <span class="drag">⠿</span><span class="element-icon">{{ icon(section.type) }}</span>
                <button type="button" class="section-select" (click)="selectSection(section.id)"><b>{{ label(section.type) }}</b><small>{{ section.title || 'Add a heading' }}</small></button>
                <div class="order-actions"><button type="button" [disabled]="i === 0" (click)="moveSection(i, -1)" aria-label="Move section up">↑</button><button type="button" [disabled]="i === sections().length - 1" (click)="moveSection(i, 1)" aria-label="Move section down">↓</button></div>
              </div>
            } @empty { <p class="empty-small">Add an element above to get started.</p> }
          </div>
          <details class="history">
            <summary>Revision history <span>{{ revisions().length }}</span></summary>
            @if (revisionsLoading()) { <p class="empty-small">Loading history…</p> }
            @else if (revisions().length) {
              @for (revision of revisions(); track revision.id) {
                <div class="revision-row"><div><b>Version {{ revision.version }}</b><small>{{ revision.created_at | date:'short' }}</small></div><button type="button" (click)="restore(revision)">Restore</button></div>
              }
            } @else { <p class="empty-small">Your saved revisions will appear here.</p> }
          </details>
        </aside>

        <section class="canvas-area">
          <div class="canvas-toolbar"><div><span class="green-dot"></span><b>{{ currentPageName() }}</b><span class="muted">{{ deviceWidth() }} px preview</span></div><span class="canvas-hint">Select a section to edit · Drag ⠿ to reorder</span></div>
          <div class="stage" [class.stage-tablet]="device() === 'tablet'" [class.stage-mobile]="device() === 'mobile'">
            <div class="store-canvas" [class.mobile-canvas]="device() === 'mobile'" [style.max-width.px]="deviceWidth()" [style.--brand]="theme().primary_color || '#244d43'" [style.--accent]="theme().accent_color || '#c16b45'" [class.editorial]="theme().font === 'editorial' || theme().font === 'classic'" [class.friendly]="theme().font === 'friendly'">
              <div class="preview-nav"><b>{{ s.name }}</b><nav><span>Home</span><span>Shop</span>@for (page of pages(); track page.id) { @if (page.status === 'published') { <span>{{ page.name }}</span> } }</nav><i>Bag</i></div>
              @for (section of sections(); track section.id) {
                @if (section.enabled) {
                  <article class="preview-section" [class.selected]="selectedSectionId() === section.id" [class.is-hero]="section.type === 'hero'" [class.is-products]="section.type === 'product_grid' || section.type === 'featured_products'" [class.is-spacer]="section.type === 'spacer'" [style.padding-top.px]="sectionPadding(section)" [style.padding-bottom.px]="sectionPadding(section)" (click)="selectSection(section.id)">
                    @if (section.type === 'hero') {
                      <div class="hero-copy" [class.hero-centered]="section.layout === 'centered'" [class.hero-cover]="section.layout === 'full_banner'" [style.background-image]="section.layout === 'full_banner' && section.image_url ? 'linear-gradient(90deg,rgba(13,25,20,.55),rgba(13,25,20,.12)),url(' + section.image_url + ')' : ''" [style.padding-top.px]="sectionPadding(section)" [style.padding-bottom.px]="sectionPadding(section)">
                        <div><small>{{ section.badge || 'WELCOME TO ' + s.name }}</small><h2 [style.font-size.px]="sectionFontSize(section, 42)">{{ section.title || s.name }}</h2><p>{{ section.subtitle || s.description || 'Thoughtfully selected products, crafted for everyday living.' }}</p><button>{{ section.button_text || 'Shop the collection' }} →</button></div>
                        @if (section.layout !== 'centered' && section.layout !== 'full_banner') { <div class="hero-photo" [style.background-image]="section.image_url ? 'url(' + section.image_url + ')' : ''"><span>Store photography</span></div> }
                      </div>
                    } @else if (section.type === 'product_grid' || section.type === 'featured_products') {
                      <div class="preview-heading"><small>{{ section.badge || (section.type === 'featured_products' ? 'CURATED FOR YOU' : 'THE COLLECTION') }}</small><h2>{{ section.title || (section.type === 'featured_products' ? 'Featured collection' : 'Shop the collection') }}</h2><p>{{ section.subtitle || 'Discover pieces selected for your store.' }}</p></div>
                      <div class="product-preview-grid" [style.--preview-columns]="previewColumns(section)">
                        @for (product of sampleProducts(section); track product.id) {
                          <div class="preview-product"><div class="product-photo">@if (product.primary_image_url) { <img [src]="product.primary_image_url" [alt]="product.name" /> } @else { <span>Image</span> }</div><b>{{ product.name }}</b><small>{{ s.currency || 'USD' }} {{ product.price }}</small></div>
                        } @empty { <div class="sample-empty">Your store products will appear here</div> }
                      </div>
                    } @else if (section.type === 'category_grid') {
                      <div class="preview-heading"><small>{{ section.badge || 'SHOP BY CATEGORY' }}</small><h2>{{ section.title || 'Find your next favourite' }}</h2><p>{{ section.subtitle || 'Browse collections from your catalogue.' }}</p></div>
                      <div class="category-preview-grid">@for (category of productCategories(); track category.id) { <div><span>✦</span><b>{{ category.name }}</b><small>Browse collection →</small></div> } @empty { <div class="sample-empty">Add categories to your products to display them here</div> }</div>
                    } @else if (section.type === 'banner') {
                      <div class="banner-preview" [style.background-image]="section.image_url ? 'linear-gradient(90deg,rgba(0,0,0,.5),rgba(0,0,0,.15)),url(' + section.image_url + ')' : ''"><small>{{ section.badge || 'A LITTLE SOMETHING SPECIAL' }}</small><h2>{{ section.title || 'A season worth celebrating' }}</h2><p>{{ section.subtitle || 'Share a new collection or announcement.' }}</p><button>{{ section.button_text || 'Explore now' }} →</button></div>
                    } @else if (section.type === 'rich_text') {
                      <div class="text-preview"><small>{{ section.badge || 'OUR STORY' }}</small><h2>{{ section.title || 'A story worth sharing' }}</h2><p>{{ section.content || section.subtitle || 'Use this space to tell customers what makes your store special.' }}</p></div>
                    } @else if (section.type === 'image') {
                      <div class="image-preview">@if (section.image_url) { <img [src]="section.image_url" [alt]="section.title || 'Store image'" /> } @else { <span>Image widget · add an image URL in settings</span> }<small>{{ section.title }}</small></div>
                    } @else if (section.type === 'gallery') {
                      <div class="preview-heading"><small>{{ section.badge || 'GALLERY' }}</small><h2>{{ section.title || 'A closer look' }}</h2><p>{{ section.subtitle }}</p></div><div class="simple-gallery">@for (item of (section.items || []); track $index) { <div>@if (item.image) { <img [src]="item.image" [alt]="item.title" /> }<b>{{ item.title }}</b></div> } @empty { <div class="sample-empty">Add images in section settings</div> }</div>
                    } @else if (section.type === 'trust_bar') {
                      <div class="trust-preview"><span>✓ Secure checkout</span><span>✦ Carefully curated</span><span>↗ Reliable delivery</span></div>
                    } @else if (section.type === 'faq') {
                      <div class="text-preview"><small>ANSWERS & DETAILS</small><h2>{{ section.title || 'Frequently asked questions' }}</h2>@for (item of (section.items || []); track $index) { <p><b>{{ item.title }}</b><br />{{ item.desc }}</p> } @empty { <p>Add questions and answers in section settings.</p> }</div>
                    } @else if (section.type === 'testimonials' || section.type === 'reviews') {
                      <div class="text-preview"><small>LOVED BY CUSTOMERS</small><h2>{{ section.title || 'Kind words from our community' }}</h2><div class="quote-preview">“{{ section.subtitle || 'Beautifully considered, thoughtfully delivered.' }}”</div>@for (item of (section.items || []); track $index) { <p>★ ★ ★ ★ ★ &nbsp; “{{ item.desc || item.title }}”</p> }</div>
                    } @else if (section.type === 'newsletter') {
                      <div class="newsletter-preview"><div><small>KEEP IN TOUCH</small><h2>{{ section.title || 'Stay in the loop' }}</h2><p>{{ section.subtitle || 'News, new releases, and store updates.' }}</p></div><div class="fake-input">Email address <button>{{ section.button_text || 'Subscribe' }}</button></div></div>
                    } @else if (section.type === 'contact_card') {
                      <div class="text-preview"><small>WE'D LOVE TO HEAR FROM YOU</small><h2>{{ section.title || 'Connect with our team' }}</h2><p>{{ section.subtitle || s.contact_email || 'Questions, ideas, or just saying hello.' }}</p><button class="soft-button">Contact us →</button></div>
                    } @else if (section.type === 'production') {
                      <div class="text-preview"><small>{{ section.badge || 'HOW IT IS MADE' }}</small><h2>{{ section.title || 'Crafted with intention' }}</h2><p>{{ section.subtitle || 'Meet the process behind every piece.' }}</p></div>
                    } @else if (section.type === 'spacer') {
                      <div class="spacer-label">Spacer · {{ section.responsive?.[device()]?.padding || 48 }} px</div>
                    }
                    <span class="selection-tag">{{ label(section.type) }}</span>
                  </article>
                }
              } @empty {
                <div class="canvas-empty"><span>＋</span><h2>Build your first section</h2><p>Choose a block from Elements to start composing your storefront.</p></div>
              }
              <footer class="preview-footer">{{ s.name }} · Independent storefront on MarketHub</footer>
            </div>
          </div>
        </section>

        <aside class="settings-panel">
          @if (selectedSection(); as activeSection) {
            <div class="settings-top"><div><p class="overline">Section settings</p><h2>{{ label(activeSection.type) }}</h2></div><button type="button" class="delete-btn" (click)="deleteSection(activeSection.id)" aria-label="Delete section">⌫</button></div>
            <div class="settings-content">
              @if (currentPage(); as page) {
                <details class="page-meta" open><summary>Page settings & SEO <span>⌄</span></summary>
                  <label class="field">Page name<input [(ngModel)]="page.name" (ngModelChange)="markDirty()" maxlength="120" /></label>
                  <label class="field">URL slug<input [(ngModel)]="page.slug" (ngModelChange)="markDirty()" maxlength="120" /></label>
                  <label class="field">Search title<input [(ngModel)]="page.seo_title" (ngModelChange)="markDirty()" maxlength="70" placeholder="Up to 70 characters" /></label>
                  <label class="field">Meta description<textarea rows="3" [(ngModel)]="page.seo_description" (ngModelChange)="markDirty()" maxlength="170" placeholder="A concise search listing description"></textarea></label>
                </details>
              }
              <label class="toggle-row"><span><b>Display on storefront</b><small>Hide this block without deleting it.</small></span><input type="checkbox" [(ngModel)]="activeSection.enabled" (ngModelChange)="markDirty()" /></label>
              <label class="field">Section title<input [(ngModel)]="activeSection.title" (ngModelChange)="markDirty()" placeholder="Give this section a heading" /></label>
              <label class="field">Supporting text<textarea rows="3" [(ngModel)]="activeSection.subtitle" (ngModelChange)="markDirty()" placeholder="Add a short introduction"></textarea></label>
              <label class="field">Eyebrow / badge<input [(ngModel)]="activeSection.badge" (ngModelChange)="markDirty()" placeholder="OPTIONAL LABEL" /></label>
              @if (activeSection.type === 'hero' || activeSection.type === 'banner') {
                <label class="field">Image URL<input [(ngModel)]="activeSection.image_url" (ngModelChange)="markDirty()" placeholder="https://…" /></label>
                <div class="two-fields"><label class="field">Button label<input [(ngModel)]="activeSection.button_text" (ngModelChange)="markDirty()" placeholder="Shop now" /></label><label class="field">Button link<input [(ngModel)]="activeSection.button_link" (ngModelChange)="markDirty()" placeholder="#catalogue" /></label></div>
              }
              @if (activeSection.type === 'image') { <label class="field">Image URL<input [(ngModel)]="activeSection.image_url" (ngModelChange)="markDirty()" placeholder="https://…" /></label> }
              @if (activeSection.type === 'rich_text') { <label class="field">Text content<textarea rows="6" [(ngModel)]="activeSection.content" (ngModelChange)="markDirty()" placeholder="Write your story…"></textarea></label> }
              @if (activeSection.type === 'hero') { <label class="field">Hero layout<select [(ngModel)]="activeSection.layout" (ngModelChange)="markDirty()"><option value="split">Split image</option><option value="centered">Centered</option><option value="full_banner">Full-bleed image</option></select></label> }
              @if (activeSection.type === 'product_grid' || activeSection.type === 'featured_products') {
                <label class="field">Product source<select [(ngModel)]="activeSection.product_source" (ngModelChange)="markDirty()"><option value="latest">Latest products</option><option value="featured">Featured products</option><option value="bestsellers">Best sellers</option><option value="category">A category</option><option value="manual">Choose products</option></select></label>
                @if (activeSection.product_source === 'category') { <label class="field">Category<select [ngModel]="activeSection.category_id || null" (ngModelChange)="activeSection.category_id = $event ? +$event : null; markDirty()"><option [ngValue]="null">Choose a category</option>@for (category of productCategories(); track category.id) { <option [ngValue]="category.id">{{ category.name }}</option> }</select></label> }
                @if (activeSection.product_source === 'manual') { <div class="manual-products"><p>Choose products</p>@for (product of products(); track product.id) { <label><input type="checkbox" [checked]="activeSection.product_ids?.includes(product.id) || false" (change)="toggleProduct(activeSection, product.id, $event)" /><span>{{ product.name }}</span></label> } @empty { <small>Add products to this storefront first.</small> }</div> }
                <div class="two-fields"><label class="field">Columns<select [ngModel]="activeSection.columns || 4" (ngModelChange)="activeSection.columns = +$event; markDirty()"><option [ngValue]="2">2</option><option [ngValue]="3">3</option><option [ngValue]="4">4</option><option [ngValue]="5">5</option><option [ngValue]="6">6</option></select></label><label class="field">Max products<input type="number" min="1" max="24" [ngModel]="activeSection.limit || 8" (ngModelChange)="activeSection.limit = +$event; markDirty()" /></label></div>
              }
              @if (activeSection.type === 'gallery' || activeSection.type === 'faq' || activeSection.type === 'testimonials') {
                <label class="field">Items (one per line)<textarea rows="5" [ngModel]="itemsText(activeSection)" (ngModelChange)="setItems(activeSection, $event)" placeholder="Item heading | supporting detail"></textarea><small class="field-help">Enter each item on a new line. For FAQs, use question | answer.</small></label>
              }

              <details class="responsive-settings" open><summary>Responsive style <span>{{ device() }}</span></summary>
                <div class="device-choice">@for (view of responsiveDevices; track view) { <button type="button" [class.active]="device() === view" (click)="device.set(view)">{{ view }}</button> }</div>
                @if (activeSection.type === 'product_grid' || activeSection.type === 'featured_products') { <label class="field">Columns on {{ device() }}<select [ngModel]="responsiveValue(activeSection, 'columns')" (ngModelChange)="setResponsive(activeSection, 'columns', $event)"><option [ngValue]="1">1</option><option [ngValue]="2">2</option><option [ngValue]="3">3</option><option [ngValue]="4">4</option><option [ngValue]="5">5</option><option [ngValue]="6">6</option></select></label> }
                <label class="field">Vertical spacing<input type="range" min="0" max="120" step="4" [ngModel]="responsiveValue(activeSection, 'padding')" (ngModelChange)="setResponsive(activeSection, 'padding', $event)" /><small>{{ responsiveValue(activeSection, 'padding') }} px · only changes the {{ device() }} layout</small></label>
                <label class="field">Heading size<input type="range" min="16" max="64" step="1" [ngModel]="responsiveValue(activeSection, 'font_size')" (ngModelChange)="setResponsive(activeSection, 'font_size', $event)" /><small>{{ responsiveValue(activeSection, 'font_size') }} px</small></label>
              </details>
            </div>
          } @else {
            <div class="settings-top"><div><p class="overline">Site-wide design</p><h2>Global styles</h2></div><span class="brand-chip">✦</span></div>
            <div class="settings-content">
              <p class="setting-intro">These brand tokens flow through your storefront and every page.</p>
              <label class="field">Primary color<span class="color-input"><input type="color" [ngModel]="theme().primary_color || '#244d43'" (ngModelChange)="setTheme('primary_color', $event)" /><input [ngModel]="theme().primary_color || '#244d43'" (ngModelChange)="setTheme('primary_color', $event)" /></span></label>
              <label class="field">Accent color<span class="color-input"><input type="color" [ngModel]="theme().accent_color || '#c16b45'" (ngModelChange)="setTheme('accent_color', $event)" /><input [ngModel]="theme().accent_color || '#c16b45'" (ngModelChange)="setTheme('accent_color', $event)" /></span></label>
              <label class="field">Page background<span class="color-input"><input type="color" [ngModel]="theme().surface_color || '#ffffff'" (ngModelChange)="setTheme('surface_color', $event)" /><input [ngModel]="theme().surface_color || '#ffffff'" (ngModelChange)="setTheme('surface_color', $event)" /></span></label>
              <label class="field">Typography<select [ngModel]="theme().font || 'modern'" (ngModelChange)="setTheme('font', $event)"><option value="modern">Modern sans</option><option value="editorial">Editorial serif</option><option value="friendly">Friendly rounded</option></select></label>
              <div class="global-note"><b>Want to start from a new design?</b><p>Browse a template, preview it on mobile, and install a personalized copy.</p><a routerLink="/tenant/templates">Explore templates →</a></div>
              @if (currentPage()) { <button type="button" class="delete-page" (click)="deleteCurrentPage()">Delete this custom page</button> }
            </div>
          }
        </aside>
      </main>
    } @else {
      <div class="opening"><p>{{ error() || 'Storefront not found.' }}</p><a routerLink="/tenant/stores">Back to storefronts</a></div>
    }

    @if (pageDialog()) {
      <div class="dialog-backdrop" (click)="pageDialog.set(false)"><section class="page-dialog" role="dialog" aria-modal="true" (click)="$event.stopPropagation()"><button type="button" class="dialog-close" (click)="pageDialog.set(false)">×</button><p class="overline">Add content</p><h2>Create a page</h2><p>Build a landing page, campaign page, or any custom content for this store.</p><label class="field">Page name<input [(ngModel)]="newPageName" maxlength="120" placeholder="Our collections" /></label><label class="field">URL slug<input [(ngModel)]="newPageSlug" maxlength="120" placeholder="our-collections" /></label><div class="dialog-actions"><button type="button" class="link-btn" (click)="pageDialog.set(false)">Cancel</button><button type="button" class="save-btn" [disabled]="!newPageName.trim() || creatingPage()" (click)="createPage()">{{ creatingPage() ? 'Creating…' : 'Create page' }}</button></div></section></div>
    }
  `,
  styles: [],
})
export class PageBuilderComponent implements OnInit {
  readonly String = String;
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  store = signal<Storefront | null>(null);
  pages = signal<TenantPage[]>([]);
  products = signal<TenantProduct[]>([]);
  sections = signal<StorePageSection[]>([]);
  selectedSectionId = signal<string | null>(null);
  selectedPage = signal('home');
  device = signal<BuilderDevice>('desktop');
  revisions = signal<PageRevision[]>([]);
  loading = signal(true);
  saving = signal(false);
  saved = signal(false);
  success = signal('');
  error = signal('');
  revisionsLoading = signal(false);
  pageDialog = signal(false);
  creatingPage = signal(false);
  newPageName = '';
  newPageSlug = '';
  private storeId = 0;
  private draggedSectionId: string | null = null;
  responsiveDevices: BuilderDevice[] = ['desktop', 'tablet', 'mobile'];
  private themeValue = signal<StoreThemeConfig>({
    primary_color: '#244d43', accent_color: '#c16b45', surface_color: '#ffffff', font: 'modern', hero_style: 'split',
  });

  theme = computed(() => this.themeValue());
  activePage = computed(() => this.selectedPage());
  currentPage = computed(() => this.pages().find((page) => String(page.id) === this.selectedPage()) || null);
  selectedSection = computed(() => this.sections().find((section) => section.id === this.selectedSectionId()) || null);
  currentPageName = computed(() => this.selectedPage() === 'home' ? 'Home page' : this.currentPage()?.name || 'Custom page');
  deviceWidth = computed(() => this.device() === 'desktop' ? 1200 : this.device() === 'tablet' ? 768 : 390);

  ngOnInit() {
    this.storeId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.storeId) {
      this.error.set('A valid storefront ID is required.');
      this.loading.set(false);
      return;
    }
    this.api.sellerStore(this.storeId).subscribe({
      next: (res) => {
        const store = res.data as Storefront;
        this.store.set(store);
        this.themeValue.set({
          primary_color: '#244d43', accent_color: '#c16b45', surface_color: '#ffffff', font: 'modern', hero_style: 'split',
          ...(store.theme_config || {}),
        });
        const initial = store.page_sections?.length ? store.page_sections : this.defaultSections(store);
        this.sections.set(initial);
        this.selectedSectionId.set(initial[0]?.id || null);
        this.loading.set(false);
        this.loadPages();
        this.api.sellerProducts({ store_id: this.storeId, per_page: 100 }).subscribe({
          next: (products) => this.products.set((products.data || []).filter((product) => product.status === 'active')),
          error: () => undefined,
        });
        this.loadRevisions();
      },
      error: (error) => {
        this.error.set(error?.error?.message || 'Could not open this storefront.');
        this.loading.set(false);
      },
    });
  }

  defaultSections(store: Storefront): StorePageSection[] {
    return [
      { id: 'hero', type: 'hero', title: store.name, subtitle: store.description || 'Thoughtfully selected products, made for everyday living.', badge: 'WELCOME TO ' + store.name, layout: 'split', enabled: true },
      { id: 'featured', type: 'featured_products', title: 'Featured collection', subtitle: 'A few favourites, selected for you.', product_source: 'featured', columns: 4, limit: 8, enabled: true },
      { id: 'story', type: 'rich_text', title: 'A story worth sharing', subtitle: store.description || 'Tell customers a little about your store.', enabled: true },
    ];
  }

  loadPages() {
    this.api.tenantPages(this.storeId).subscribe({
      next: (res) => this.pages.set(res.data || []),
      error: () => undefined,
    });
  }

  selectPage(page: string) {
    this.selectedPage.set(page);
    this.selectedSectionId.set(null);
    if (page === 'home') {
      const current = this.store();
      this.sections.set(current?.page_sections?.length ? current.page_sections : (current ? this.defaultSections(current) : []));
    } else {
      const custom = this.pages().find((item) => String(item.id) === page);
      this.sections.set(custom?.content?.sections || []);
    }
    this.loadRevisions();
    this.saved.set(false);
  }

  loadRevisions() {
    if (!this.storeId) return;
    this.revisionsLoading.set(true);
    const request = this.selectedPage() === 'home'
      ? this.api.tenantHomeRevisions(this.storeId)
      : this.currentPage()
        ? this.api.tenantPageRevisions(this.storeId, this.currentPage()!.id)
        : null;
    if (!request) { this.revisions.set([]); this.revisionsLoading.set(false); return; }
    request.subscribe({
      next: (res) => { this.revisions.set(res.data || []); this.revisionsLoading.set(false); },
      error: () => this.revisionsLoading.set(false),
    });
  }

  addSection(type: SectionType) {
    const id = `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const defaults: Partial<Record<SectionType, Partial<StorePageSection>>> = {
      hero: { title: this.store()?.name || 'Your next chapter', subtitle: 'A thoughtful introduction to your store.', layout: 'split', button_text: 'Shop now' },
      featured_products: { title: 'Featured collection', product_source: 'featured', columns: 4, limit: 8 },
      product_grid: { title: 'Shop the collection', product_source: 'latest', columns: 4, limit: 8 },
      category_grid: { title: 'Shop by category', columns: 3 },
      banner: { title: 'A season worth celebrating', subtitle: 'Share a collection, launch, or announcement.', button_text: 'Explore now' },
      rich_text: { title: 'A story worth sharing', content: 'Tell customers what makes your store special.' },
      image: { title: 'Store photography' },
      gallery: { title: 'A closer look', items: [] },
      faq: { title: 'Frequently asked questions', items: [] },
      testimonials: { title: 'Kind words from our community', items: [] },
      reviews: { title: 'Customer reviews', items: [] },
      newsletter: { title: 'Stay in the loop', subtitle: 'Get new releases and store updates.', button_text: 'Subscribe' },
      contact_card: { title: 'Connect with our team', subtitle: 'Questions, ideas, or just saying hello.' },
      trust_bar: { title: 'Shop with confidence' },
      production: { title: 'Crafted with intention' },
      spacer: { title: 'Spacer', responsive: { desktop: { padding: 48 }, tablet: { padding: 36 }, mobile: { padding: 28 } } },
    };
    const section: StorePageSection = { id, type, enabled: true, ...defaults[type] };
    this.sections.update((current) => [...current, section]);
    this.selectedSectionId.set(id);
    this.markDirty();
  }

  selectSection(id: string) { this.selectedSectionId.set(id); }

  updateSection(id: string, changes: Partial<StorePageSection>) {
    this.sections.update((current) => current.map((section) => section.id === id ? { ...section, ...changes } : section));
    this.markDirty();
  }

  moveSection(index: number, direction: -1 | 1) {
    const next = [...this.sections()];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    this.sections.set(next);
    this.markDirty();
  }

  deleteSection(id: string) {
    this.sections.update((current) => current.filter((section) => section.id !== id));
    this.selectedSectionId.set(this.sections()[0]?.id || null);
    this.markDirty();
  }

  dragStart(event: DragEvent, id: string) {
    this.draggedSectionId = id;
    if (event.dataTransfer) event.dataTransfer.setData('text/plain', id);
  }

  dragOver(event: DragEvent) { event.preventDefault(); }

  dropSection(event: DragEvent, targetId: string) {
    event.preventDefault();
    const sourceId = this.draggedSectionId || event.dataTransfer?.getData('text/plain');
    this.draggedSectionId = null;
    if (!sourceId || sourceId === targetId) return;
    const next = [...this.sections()];
    const from = next.findIndex((section) => section.id === sourceId);
    const to = next.findIndex((section) => section.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    this.sections.set(next);
    this.markDirty();
  }

  markDirty() { this.saved.set(false); this.success.set(''); this.error.set(''); }

  setTheme(key: 'primary_color' | 'accent_color' | 'surface_color' | 'font', value: string) {
    this.themeValue.update((current) => ({ ...current, [key]: value }));
    this.markDirty();
  }

  setResponsive(section: StorePageSection, key: ResponsiveKey, value: number | string) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    const breakpoint = this.device();
    this.updateSection(section.id, {
      responsive: {
        ...(section.responsive || {}),
        [breakpoint]: { ...(section.responsive?.[breakpoint] || {}), [key]: numeric },
      },
    });
  }

  responsiveValue(section: StorePageSection, key: ResponsiveKey): number {
    const custom = section.responsive?.[this.device()]?.[key];
    if (typeof custom === 'number') return custom;
    if (key === 'columns') return this.device() === 'mobile' ? 2 : this.device() === 'tablet' ? 3 : section.columns || 4;
    if (key === 'padding') return this.device() === 'mobile' ? 28 : this.device() === 'tablet' ? 36 : 48;
    return 32;
  }

  sectionPadding(section: StorePageSection): number {
    if (section.type === 'hero') return this.responsiveValue(section, 'padding');
    if (section.type === 'spacer') return Math.max(14, this.responsiveValue(section, 'padding') / 2);
    return Math.min(80, this.responsiveValue(section, 'padding'));
  }

  sectionFontSize(section: StorePageSection, fallback: number): number {
    return section.responsive?.[this.device()]?.font_size || fallback;
  }

  previewColumns(section: StorePageSection): number {
    return section.responsive?.[this.device()]?.columns || section.columns || this.responsiveValue(section, 'columns');
  }

  sampleProducts(section: StorePageSection): TenantProduct[] {
    let rows = [...this.products()];
    switch (section.product_source) {
      case 'featured': rows = rows.filter((product) => product.is_featured); break;
      case 'bestsellers': rows.sort((a, b) => Number(b.is_featured) - Number(a.is_featured)); break;
      case 'category': if (section.category_id) rows = rows.filter((product) => product.category_id === section.category_id); break;
      case 'manual': rows = (section.product_ids || []).map((id) => this.products().find((product) => product.id === id)).filter((product): product is TenantProduct => !!product); break;
    }
    return rows.slice(0, Math.max(1, Math.min(24, section.limit || 8)));
  }

  productCategories(): { id: number; name: string }[] {
    const seen = new Map<number, string>();
    for (const product of this.products()) if (product.category_id && product.category?.name) seen.set(product.category_id, product.category.name);
    return [...seen].map(([id, name]) => ({ id, name }));
  }

  toggleProduct(section: StorePageSection, id: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const ids = new Set(section.product_ids || []);
    checked ? ids.add(id) : ids.delete(id);
    this.updateSection(section.id, { product_ids: [...ids] });
  }

  itemsText(section: StorePageSection): string {
    return (section.items || []).map((item) => `${item.title || ''}${item.desc ? ' | ' + item.desc : ''}`).join('\n');
  }

  setItems(section: StorePageSection, value: string) {
    const items = value.split('\n').filter((line) => line.trim()).map((line) => {
      const [title, ...detail] = line.split('|');
      return { title: title.trim(), desc: detail.join('|').trim() || undefined };
    });
    this.updateSection(section.id, { items });
  }

  createPage() {
    const name = this.newPageName.trim();
    if (!name) return;
    this.creatingPage.set(true);
    const slug = this.newPageSlug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const seed: StorePageSection[] = [{ id: `hero-${Date.now()}`, type: 'hero', title: name, subtitle: 'Add a short introduction for your visitors.', layout: 'centered', enabled: true }];
    this.api.createTenantPage(this.storeId, { name, slug, status: 'draft', content: { schema_version: 1, sections: seed } }).subscribe({
      next: (res) => {
        this.pages.update((current) => [...current, res.data]);
        this.newPageName = '';
        this.newPageSlug = '';
        this.pageDialog.set(false);
        this.creatingPage.set(false);
        this.selectPage(String(res.data.id));
        this.flashSuccess('Your new custom page is ready to edit.');
      },
      error: (error) => { this.creatingPage.set(false); this.error.set(error?.error?.message || 'Could not create this page.'); },
    });
  }

  save() {
    const store = this.store();
    if (!store || this.saving()) return;
    this.saving.set(true);
    this.saved.set(false);
    this.error.set('');
    const theme_config = this.theme();
    this.api.updateStore(store.id, this.selectedPage() === 'home'
      ? { theme_config, page_sections: this.sections() }
      : { theme_config }).subscribe({
      next: (res) => {
        this.store.set(res.data);
        if (this.selectedPage() === 'home') {
          this.sections.set(res.data.page_sections || this.sections());
          this.finishSave('Homepage saved. A revision was added to your history.');
          return;
        }
        const page = this.currentPage();
        if (!page) { this.finishSave('Global styles saved.'); return; }
        this.api.updateTenantPage(store.id, page.id, {
          name: page.name,
          slug: page.slug,
          seo_title: page.seo_title,
          seo_description: page.seo_description,
          content: { schema_version: 1, sections: this.sections() },
        }).subscribe({
          next: (pageRes) => {
            this.pages.update((items) => items.map((item) => item.id === pageRes.data.id ? pageRes.data : item));
            this.sections.set(pageRes.data.content.sections);
            this.finishSave('Page saved. A revision was added to your history.');
          },
          error: (error) => { this.saving.set(false); this.error.set(error?.error?.message || 'Global styles saved, but the page content could not be saved.'); },
        });
      },
      error: (error) => { this.saving.set(false); this.error.set(error?.error?.message || 'Could not save storefront changes.'); },
    });
  }

  finishSave(message: string) {
    this.saving.set(false);
    this.saved.set(true);
    this.flashSuccess(message);
    this.loadRevisions();
  }

  restore(revision: PageRevision) {
    if (!window.confirm(`Restore version ${revision.version}? Your current content will be saved as a new revision.`)) return;
    if (this.selectedPage() === 'home') {
      this.api.restoreTenantHomeRevision(this.storeId, revision.id).subscribe({
        next: (res) => {
          this.store.set(res.data);
          this.sections.set(res.data.page_sections || []);
          this.selectedSectionId.set(this.sections()[0]?.id || null);
          this.flashSuccess(`Restored homepage version ${res.restored_version}.`);
          this.loadRevisions();
        },
        error: (error) => this.error.set(error?.error?.message || 'Could not restore that homepage revision.'),
      });
    } else if (this.currentPage()) {
      const pageId = this.currentPage()!.id;
      this.api.restoreTenantPageRevision(this.storeId, pageId, revision.id).subscribe({
        next: (res) => {
          this.pages.update((items) => items.map((item) => item.id === pageId ? res.data : item));
          this.sections.set(res.data.content.sections);
          this.selectedSectionId.set(this.sections()[0]?.id || null);
          this.flashSuccess(`Restored page version ${res.restored_version}.`);
          this.loadRevisions();
        },
        error: (error) => this.error.set(error?.error?.message || 'Could not restore that page revision.'),
      });
    }
  }

  togglePageStatus() {
    const page = this.currentPage();
    const store = this.store();
    if (!page || !store || this.saving()) return;
    const status = page.status === 'published' ? 'draft' : 'published';
    this.saving.set(true);
    this.api.updateStore(store.id, { theme_config: this.theme() }).subscribe({
      next: (storeRes) => {
        this.store.set(storeRes.data);
        this.api.updateTenantPage(this.storeId, page.id, {
          name: page.name,
          slug: page.slug,
          seo_title: page.seo_title,
          seo_description: page.seo_description,
          status,
          content: { schema_version: 1, sections: this.sections() },
        }).subscribe({
          next: (res) => {
            this.pages.update((items) => items.map((item) => item.id === page.id ? res.data : item));
            this.sections.set(res.data.content.sections);
            this.saving.set(false);
            this.flashSuccess(status === 'published' ? 'Custom page saved and published.' : 'Custom page saved and moved to draft.');
            this.loadRevisions();
          },
          error: (error) => { this.saving.set(false); this.error.set(error?.error?.message || 'Could not update page status.'); },
        });
      },
      error: (error) => { this.saving.set(false); this.error.set(error?.error?.message || 'Could not save global styles.'); },
    });
  }

  deleteCurrentPage() {
    const page = this.currentPage();
    if (!page || !window.confirm(`Delete “${page.name}”? This cannot be undone.`)) return;
    this.api.deleteTenantPage(this.storeId, page.id).subscribe({
      next: () => {
        this.pages.update((items) => items.filter((item) => item.id !== page.id));
        this.selectPage('home');
        this.flashSuccess('Custom page deleted.');
      },
      error: (error) => this.error.set(error?.error?.message || 'Could not delete this page.'),
    });
  }

  openPreview() {
    const store = this.store();
    if (!store) return;
    const page = this.currentPage();
    const url = `/stores/${store.slug}${page ? `?page=${encodeURIComponent(page.slug)}` : ''}`;
    window.open(url, '_blank', 'noopener');
  }

  icon(type: string): string {
    const icons: Record<string, string> = { hero: '▧', product_grid: '▦', featured_products: '✦', category_grid: '⌘', banner: '▰', rich_text: '¶', image: '▤', gallery: '▦', trust_bar: '✓', reviews: '★', testimonials: '❝', faq: '?', newsletter: '✉', contact_card: '◎', production: '⚒', spacer: '↕' };
    return icons[type] || '◈';
  }

  label(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  flashSuccess(message: string) {
    this.success.set(message);
    this.error.set('');
    window.setTimeout(() => { if (this.success() === message) this.success.set(''); }, 4500);
  }
}
