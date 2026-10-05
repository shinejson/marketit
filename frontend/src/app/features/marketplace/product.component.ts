import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ProductCard } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type Variant = ProductCard['variants'][number];

@Component({
  selector: 'app-product',
  imports: [RouterLink, MoneyPipe, TitleCasePipe, FormsModule],
  template: `
    <div class="wrap page">
      @if (error()) { <p class="err">{{ error() }}</p> }
      @if (product(); as p) {
        <nav class="crumbs muted">
          <a [routerLink]="['/products']">Catalogue</a><span>/</span>
          @if (p.category) { <a [routerLink]="['/products']" [queryParams]="{ category_id: p.category.id }">{{ p.category.name }}</a><span>/</span> }
          <b>{{ p.name }}</b>
        </nav>

        <div class="layout">
          <section class="gallery">
            <div class="card frame" [style.backgroundImage]="activeImage() ? 'url(' + activeImage() + ')' : 'linear-gradient(135deg,#1f4b3a,#c45c26)'">
              @if (p.on_sale) { <span class="sale-flag">−{{ p.discount_percent }}%</span> }
            </div>
            @if (p.images.length > 1) {
              <div class="thumbs">
                @for (img of p.images; track img.id) {
                  <button type="button" class="thumb" [class.on]="img.url === activeImage()" [style.backgroundImage]="'url(' + img.url + ')'" (click)="activeImage.set(img.url)" [attr.aria-label]="'View image ' + img.id"></button>
                }
              </div>
            }
          </section>

          <section class="buy">
            <a class="store muted" [routerLink]="['/stores', p.store?.slug]">{{ p.store?.name }}</a>
            <h1>{{ p.name }}</h1>
            @if (p.short_description) { <p class="lede">{{ p.short_description }}</p> }

            <div class="price-row">
              <p class="price">{{ +selectedPrice(p) | money:priceCurrency(p) }}</p>
              @if (p.on_sale) {
                <p class="was">{{ +p.compare_at_price! | money:priceCurrency(p) }}</p>
                <span class="save badge">Save {{ p.discount_percent }}%</span>
              }
            </div>
            @if (taxNote(p); as note) { <p class="tax muted">{{ note }}</p> }
            @if (unitPrice(p); as up) { <p class="unit muted">{{ up | money:priceCurrency(p) }} per {{ p.unit }}</p> }

            @if (p.variants.length > 1) {
              <div class="vars">
                <p class="lbl">Options</p>
                <div class="chips">
                  @for (v of p.variants; track v.id) {
                    <button type="button" class="chip" [class.on]="variant()?.id === v.id" [disabled]="v.status !== 'active'" (click)="variant.set(v)">
                      {{ variantLabel(v) }}<small>{{ +v.price | money:priceCurrency(p) }}</small>
                    </button>
                  }
                </div>
              </div>
            }

            @if (variant(); as v) {
              <p class="stock muted" [class.low]="v.available > 0 && v.available <= 5" [class.out]="v.available < 1">
                @if (v.available < 1) { Out of stock } @else if (v.available <= 5) { Only {{ v.available }} left in stock } @else { {{ v.available }} in stock }
                · SKU {{ v.sku }}
              </p>
              <div class="qty">
                <button type="button" (click)="step(-1)" [disabled]="qty <= minQty(p)">−</button>
                <input type="number" [(ngModel)]="qty" [min]="minQty(p)" [max]="v.available" />
                <button type="button" (click)="step(1)" [disabled]="qty >= v.available">+</button>
              </div>

              <div class="actions">
                <button class="btn accent" [disabled]="busy() || v.available < 1" (click)="add(v.id)">{{ busy() ? 'Adding…' : 'Add to cart' }}</button>
                <button class="btn ghost" type="button" [disabled]="v.available < 1" (click)="openQuote()">Request a quote</button>
              </div>
              @if (notice()) { <p class="notice">{{ notice() }}</p> }
            }

            @if (p.tags?.length) { <p class="tags muted">@for (tag of p.tags; track tag) { <span class="pill">{{ tag }}</span> }</p> }
            <dl class="meta">
              @if (p.brand) { <div><dt>Brand</dt><dd>{{ p.brand }}</dd></div> }
              @if (p.condition) { <div><dt>Condition</dt><dd>{{ p.condition | titlecase }}</dd></div> }
              @if (p.warranty_months) { <div><dt>Warranty</dt><dd>{{ p.warranty_months }} months</dd></div> }
              @if (p.store && p.store.delivery_fee !== undefined) { <div><dt>Delivery</dt><dd>{{ +(p.store.delivery_fee || 0) | money:priceCurrency(p) }} · calculated at checkout</dd></div> }
            </dl>
          </section>
        </div>

        @if (p.description) {
          <section class="card desc"><h2>About this product</h2><p>{{ p.description }}</p></section>
        }

        <!-- request-for-quote dialog -->
        @if (quoteOpen()) {
          <div class="backdrop" (click)="closeQuote()"></div>
          <div class="dialog card" role="dialog" aria-modal="true" aria-labelledby="quote-title">
            <h3 id="quote-title">Request a quote</h3>
            <p class="muted">Ask <b>{{ p.store?.name }}</b> for their best price — handy for bulk orders. They reply with an offer you can accept or decline.</p>
            <label class="field">Quantity
              <input type="number" [(ngModel)]="quoteQty" [min]="minQty(p)" />
            </label>
            <label class="field">Message <span class="muted">(optional)</span>
              <textarea rows="4" [(ngModel)]="quoteMessage" placeholder="Tell the merchant about your order — delivery city, timeline, customization…"></textarea>
            </label>
            @if (quoteError()) { <p class="err">{{ quoteError() }}</p> }
            <div class="dialog-actions">
              <button class="btn ghost" type="button" (click)="closeQuote()">Cancel</button>
              <button class="btn accent" type="button" [disabled]="quoteBusy()" (click)="sendQuote()">{{ quoteBusy() ? 'Sending…' : 'Send request' }}</button>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 0 64px; }
    .crumbs { display: flex; gap: 8px; align-items: center; font-size: 13px; margin-bottom: 18px; flex-wrap: wrap; }
    .crumbs a { color: inherit; } .crumbs b { color: var(--ink); font-weight: 600; }
    .layout { display: grid; grid-template-columns: 1.05fr 1fr; gap: 34px; align-items: start; }
    @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
    .frame { min-height: 460px; background-color: var(--paper-2); background-position: center; background-size: cover; position: relative; border-radius: 16px; }
    .sale-flag { position: absolute; top: 14px; left: 14px; background: var(--accent); color: #fff; font-weight: 800; padding: 7px 12px; border-radius: 999px; font-size: 14px; }
    .thumbs { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
    .thumb { width: 68px; height: 68px; border-radius: 12px; border: 2px solid var(--line); cursor: pointer; background: var(--paper-2) center/cover; padding: 0; }
    .thumb.on { border-color: var(--accent); }
    .store { font-size: 13px; letter-spacing: .02em; }
    h1 { margin: 6px 0 8px; font-size: clamp(26px, 3.4vw, 38px); line-height: 1.1; }
    .lede { color: var(--ink-soft); margin: 0 0 6px; }
    .price-row { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-top: 10px; }
    .price { font-size: 34px; font-weight: 800; margin: 0; }
    .was { margin: 0; font-size: 19px; color: var(--ink-soft); text-decoration: line-through; }
    .badge.save { background: rgba(196,92,38,.14); color: var(--accent); font-weight: 800; padding: 5px 10px; border-radius: 999px; font-size: 12px; }
    .tax, .unit { font-size: 13px; margin: 4px 0 0; }
    .vars { margin: 18px 0 4px; }
    .vars .lbl { font-size: 13px; font-weight: 700; color: var(--ink-soft); margin: 0 0 8px; }
    .chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip { display: grid; gap: 2px; border: 1px solid var(--line); background: var(--card); color: var(--ink); padding: 9px 14px; border-radius: 12px; cursor: pointer; font-weight: 600; }
    .chip small { color: var(--ink-soft); font-weight: 500; }
    .chip.on { border-color: var(--accent); background: rgba(196,92,38,.08); }
    .chip:disabled { opacity: .5; cursor: not-allowed; }
    .stock { font-size: 13px; margin: 12px 0 10px; }
    .stock.low { color: var(--accent); font-weight: 700; }
    .stock.out { color: var(--danger); font-weight: 700; }
    .qty { display: inline-flex; align-items: stretch; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--card); }
    .qty button { width: 40px; border: 0; background: var(--paper-2); font-size: 18px; cursor: pointer; color: var(--ink); }
    .qty button:disabled { opacity: .4; cursor: not-allowed; }
    .qty input { width: 62px; border: 0; text-align: center; padding: 9px 4px; background: var(--card); color: var(--ink); font-weight: 700; }
    .actions { display: flex; gap: 10px; margin: 16px 0 8px; flex-wrap: wrap; }
    .notice { color: var(--ok); font-weight: 600; font-size: 13px; }
    .tags { display: flex; gap: 6px; flex-wrap: wrap; margin: 14px 0 0; }
    .pill { border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; font-size: 12px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; margin: 18px 0 0; padding-top: 16px; border-top: 1px solid var(--line); }
    .meta div { display: grid; gap: 2px; }
    .meta dt { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-soft); }
    .meta dd { margin: 0; font-weight: 650; font-size: 14px; }
    .desc { margin-top: 30px; padding: 22px; }
    .desc h2 { margin: 0 0 10px; font-size: 19px; }
    .desc p { margin: 0; color: var(--ink-soft); white-space: pre-line; }
    .backdrop { position: fixed; inset: 0; background: rgba(15,12,8,.45); z-index: 40; }
    .dialog { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: min(460px, calc(100vw - 32px)); z-index: 50; padding: 22px; display: grid; gap: 4px; box-shadow: 0 24px 60px rgba(0,0,0,.25); }
    .dialog h3 { margin: 0; font-size: 20px; }
    .dialog .field { display: grid; gap: 6px; font-size: 13px; font-weight: 650; margin-top: 10px; }
    .dialog input, .dialog textarea { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; background: var(--card); color: var(--ink); font: inherit; font-weight: 500; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }
    .err { color: var(--danger); }
  `],
})
export class ProductComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  product = signal<ProductCard | null>(null);

  /** The currency this product's stored prices are denominated in. */
  priceCurrency(p: ProductCard): string | null {
    return p.currency || p.store?.currency || null;
  }

  variant = signal<Variant | null>(null);
  activeImage = signal<string | null>(null);
  qty = 1;
  error = signal('');
  notice = signal('');
  busy = signal(false);

  // quote dialog state
  quoteOpen = signal(false);
  quoteBusy = signal(false);
  quoteError = signal('');
  quoteQty = 1;
  quoteMessage = '';

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.api.marketProduct(slug).subscribe({
      next: (res) => {
        this.product.set(res.data);
        this.variant.set(res.data.variants.find((v) => v.status === 'active') ?? res.data.variants[0] ?? null);
        this.activeImage.set(res.data.images.find((i) => i.is_primary)?.url ?? res.data.images[0]?.url ?? null);
        const min = this.minQty(res.data);
        this.qty = min;
        this.quoteQty = min;
      },
      error: () => this.error.set('Product not found.'),
    });
  }

  minQty(p: ProductCard): number {
    return Math.max(1, p.min_order_qty ?? 1);
  }

  selectedPrice(p: ProductCard): number {
    const v = this.variant();
    return v ? +v.price : +p.price;
  }

  variantLabel(v: Variant): string {
    if (!v.options) return v.sku;
    return Object.values(v.options).join(' · ') || v.sku;
  }

  /** Short line under the price describing how tax applies to this item. */
  taxNote(p: ProductCard): string | null {
    const rate = p.tax_rate ? +p.tax_rate : 0;
    const cls = (p.tax_class || '').toLowerCase();
    if (['zero-rated', 'zero_rated', 'zero', 'exempt', 'out_of_scope'].includes(cls)) {
      return 'Zero-rated — no tax on this item.';
    }
    return rate > 0 ? `Excludes ${+rate}% tax — added at checkout.` : null;
  }

  /** Unit economics, e.g. "GH₵4.50 per kg", when sold by a measure. */
  unitPrice(p: ProductCard): number | null {
    const amount = p.unit_amount ? +p.unit_amount : 0;
    if (!p.unit || p.unit === 'piece' || amount <= 0) return null;
    return this.selectedPrice(p) / amount;
  }

  step(delta: number): void {
    const v = this.variant();
    const min = this.product() ? this.minQty(this.product()!) : 1;
    const next = Math.min(Math.max(this.qty + delta, min), v ? Math.max(v.available, min) : 999);
    this.qty = next;
  }

  add(variantId: number): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api.addToCart(variantId, this.qty).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => this.notice.set('Added to cart.'),
      error: (e) => this.error.set(e.error?.error?.message || 'Could not add to cart'),
    });
  }

  openQuote(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.quoteQty = Math.max(this.qty, this.product() ? this.minQty(this.product()!) : 1);
    this.quoteMessage = '';
    this.quoteError.set('');
    this.quoteOpen.set(true);
  }

  closeQuote(): void {
    this.quoteOpen.set(false);
  }

  sendQuote(): void {
    const p = this.product();
    if (!p?.store) return;
    this.quoteBusy.set(true);
    this.quoteError.set('');
    this.api.requestQuote({
      store_id: p.store.id,
      message: this.quoteMessage.trim() || undefined,
      items: [{ product_id: p.id, quantity: this.quoteQty }],
    }).pipe(finalize(() => this.quoteBusy.set(false))).subscribe({
      next: (res) => {
        this.quoteOpen.set(false);
        this.notice.set(`Quote request ${res.data.number} sent — track it under My quotes.`);
      },
      error: (e) => {
        const errors = e?.error?.errors;
        const first = errors ? Object.values(errors).flat()[0] : null;
        this.quoteError.set(String(first || e?.error?.message || 'Could not send the request.'));
      },
    });
  }
}
