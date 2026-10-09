import { Component, inject, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ProductCard, Review, ReviewSummary } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';
import { StarRatingComponent } from '../../shared/star-rating.component';

type Variant = ProductCard['variants'][number];

@Component({
  selector: 'app-product',
  imports: [RouterLink, MoneyPipe, TitleCasePipe, FormsModule, StarRatingComponent],
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
          <section class="gallery" aria-label="Product image gallery">
            <div class="card frame gallery-stage" [style.background]="activeImage() ? 'var(--paper-2)' : 'linear-gradient(135deg,#1f4b3a,#c45c26)'" (mouseenter)="pauseSlideshow()" (mouseleave)="startSlideshow()">
              @for (img of p.images; track img.id) {
                @if (img.url === activeImage()) {
                  <img class="gallery-image" [src]="img.url" [alt]="p.name + ' — image ' + (activeImageIndex(p) + 1)" />
                }
              }
              @if (p.on_sale) { <span class="sale-flag">−{{ p.discount_percent }}%</span> }
              @if (p.images.length > 1) {
                <div class="gallery-controls">
                  <button type="button" class="gallery-arrow previous" (click)="previousImage(p)" aria-label="Previous product image">‹</button>
                  <span class="gallery-counter" aria-live="polite">{{ activeImageIndex(p) + 1 }} / {{ p.images.length }}</span>
                  <button type="button" class="gallery-arrow next" (click)="nextImage(p)" aria-label="Next product image">›</button>
                </div>
              }
            </div>
            @if (p.images.length > 1) {
              <div class="thumbs" aria-label="Choose a product image">
                @for (img of p.images; track img.id; let index = $index) {
                  <button type="button" class="thumb" [class.on]="img.url === activeImage()" [style.backgroundImage]="'url(' + img.url + ')'" (click)="selectImage(img.url)" [attr.aria-label]="'View image ' + (index + 1) + ' of ' + p.images.length" [attr.aria-current]="img.url === activeImage() ? 'true' : null"></button>
                }
              </div>
            }
          </section>

          <section class="buy">
            <a class="store muted" [routerLink]="['/stores', p.store?.slug]">{{ p.store?.name }}</a>
            <h1>{{ p.name }}</h1>
            @if (summary(); as rated) {
              @if (rated.count) {
                <button type="button" class="rating-link" (click)="scrollToReviews()">
                  <app-stars [value]="rated.average" [showValue]="true" />
                  <span class="muted">{{ rated.count }} review{{ rated.count === 1 ? '' : 's' }}</span>
                </button>
              }
            }
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
                @if (auth.isLoggedIn()) {
                  <button class="btn ghost heart" type="button" [class.saved]="saved()" (click)="toggleWishlist(p)" [attr.aria-pressed]="saved()">
                    <span aria-hidden="true">{{ saved() ? '♥' : '♡' }}</span>
                    {{ saved() ? 'Saved' : 'Save for later' }}
                  </button>
                }
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

        <!-- §17 — verified customer reviews -->
        <section class="card reviews" id="reviews">
          <div class="reviews-head">
            <div>
              <h2>Customer reviews</h2>
              @if (summary(); as rated) {
                @if (rated.count) {
                  <p class="muted">{{ rated.verified_count }} of {{ rated.count }} from verified buyers.</p>
                } @else {
                  <p class="muted">No reviews yet — be the first once you have received this item.</p>
                }
              }
            </div>
            @if (auth.isLoggedIn()) { <a class="btn ghost" routerLink="/reviews">Write a review</a> }
          </div>

          @if (summary(); as rated) {
            @if (rated.count) {
              <div class="reviews-summary">
                <div class="score">
                  <strong>{{ rated.average.toFixed(1) }}</strong>
                  <app-stars [value]="rated.average" />
                  <small class="muted">{{ rated.count }} review{{ rated.count === 1 ? '' : 's' }}</small>
                </div>
                <div class="bars">
                  @for (bucket of rated.distribution; track bucket.rating) {
                    <div class="bar-row">
                      <span>{{ bucket.rating }}★</span>
                      <span class="bar"><i [style.width.%]="bucket.percent"></i></span>
                      <span>{{ bucket.count }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          }

          @if (reviews().length) {
            <ul class="review-list">
              @for (review of reviews(); track review.id) {
                <li>
                  <div class="review-top">
                    <app-stars [value]="review.rating" />
                    <strong>{{ review.title || 'Verified review' }}</strong>
                    @if (review.is_verified_purchase) { <span class="badge verified">Verified purchase</span> }
                    <span class="muted when">{{ review.author?.name || 'Customer' }}</span>
                  </div>
                  @if (review.body) { <p>{{ review.body }}</p> }
                  <div class="review-foot">
                    <button type="button" class="helpful" [disabled]="!auth.isLoggedIn()" (click)="markHelpful(review)">
                      Helpful ({{ review.helpful_count }})
                    </button>
                    @if (auth.isLoggedIn()) {
                      <button type="button" class="helpful" (click)="report(review)">Report</button>
                    }
                  </div>
                  @if (review.response_body) {
                    <div class="seller-reply">
                      <strong>{{ p.store?.name }} replied</strong>
                      <p>{{ review.response_body }}</p>
                    </div>
                  }
                </li>
              }
            </ul>
            @if (moreReviews()) {
              <button class="btn ghost" type="button" (click)="loadReviews(reviewPage() + 1)">Show more reviews</button>
            }
          }
          @if (reviewNotice()) { <p class="notice">{{ reviewNotice() }}</p> }
        </section>

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
    .frame { min-height: 460px; background-color: var(--paper-2); position: relative; overflow: hidden; border-radius: 16px; }
    .gallery-stage { isolation: isolate; }
    .gallery-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; animation: gallery-slide-in .34s ease-out both; }
    .sale-flag { position: absolute; z-index: 2; top: 14px; left: 14px; background: var(--accent); color: #fff; font-weight: 800; padding: 7px 12px; border-radius: 999px; font-size: 14px; }
    .gallery-controls { position: absolute; z-index: 2; right: 12px; bottom: 12px; display: flex; align-items: center; gap: 4px; padding: 4px; border: 1px solid rgba(255,255,255,.32); border-radius: 999px; background: rgba(18,17,14,.56); backdrop-filter: blur(8px); }
    .gallery-arrow { display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 50%; background: transparent; color: #fff; font-size: 25px; line-height: 1; cursor: pointer; }
    .gallery-arrow:hover, .gallery-arrow:focus-visible { background: rgba(255,255,255,.2); outline: none; }
    .gallery-counter { min-width: 34px; color: #fff; font-size: 11px; font-weight: 800; text-align: center; }
    .thumbs { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
    .thumb { width: 68px; height: 68px; border-radius: 12px; border: 2px solid var(--line); cursor: pointer; background: var(--paper-2) center/cover; padding: 0; }
    .thumb.on { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(196,92,38,.14); }
    .thumb:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    @keyframes gallery-slide-in { from { opacity: .2; transform: translateX(12px) scale(1.015); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .gallery-image { animation: none; } }
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
    .rating-link { display:inline-flex; align-items:center; gap:8px; margin:2px 0 6px; padding:0; border:0; background:none; color:inherit; font:inherit; font-size:12px; cursor:pointer; }
    .rating-link:hover { color:var(--accent); }
    .heart.saved { border-color:var(--accent); color:var(--accent); }
    .reviews { padding:22px; margin-top:18px; display:grid; gap:16px; }
    .reviews-head { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; }
    .reviews-head h2 { margin:0; }
    .reviews-head p { margin:3px 0 0; font-size:12.5px; }
    .reviews-summary { display:grid; grid-template-columns:auto minmax(0,1fr); gap:24px; align-items:center; padding:16px; border:1px solid var(--line); border-radius:14px; background:var(--paper-2); }
    .score { display:grid; justify-items:center; gap:4px; }
    .score strong { font-family:Fraunces, serif; font-size:40px; line-height:1; }
    .bars { display:grid; gap:6px; }
    .bar-row { display:grid; grid-template-columns:32px minmax(0,1fr) 40px; gap:9px; align-items:center; font-size:11.5px; color:var(--ink-soft); }
    .bar { height:7px; border-radius:999px; background:var(--card); overflow:hidden; }
    .bar i { display:block; height:100%; border-radius:999px; background:var(--gold); }
    .review-list { list-style:none; margin:0; padding:0; display:grid; gap:16px; }
    .review-list li { padding-bottom:16px; border-bottom:1px solid var(--line); }
    .review-list li:last-child { border-bottom:0; padding-bottom:0; }
    .review-top { display:flex; flex-wrap:wrap; align-items:center; gap:9px; }
    .review-top strong { font-size:13.5px; }
    .review-top .when { margin-left:auto; font-size:11.5px; }
    .badge.verified { padding:2px 8px; border-radius:999px; background:color-mix(in srgb,var(--ok) 15%,transparent); color:var(--ok); font-size:10.5px; font-weight:750; }
    .review-list p { margin:7px 0 0; font-size:13px; line-height:1.6; }
    .review-foot { display:flex; gap:12px; margin-top:8px; }
    .helpful { padding:0; border:0; background:none; color:var(--ink-soft); font:inherit; font-size:11.5px; font-weight:650; cursor:pointer; text-decoration:underline; }
    .helpful:hover:not(:disabled) { color:var(--accent); }
    .helpful:disabled { opacity:.5; cursor:not-allowed; text-decoration:none; }
    .seller-reply { margin-top:10px; padding:10px 13px; border-left:3px solid var(--accent); background:var(--paper-2); border-radius:0 10px 10px 0; }
    .seller-reply strong { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-soft); }
    .seller-reply p { margin:4px 0 0; font-size:12.5px; }
    @media (max-width:620px) { .reviews-summary { grid-template-columns:1fr; } }
  `],
})
export class ProductComponent implements OnDestroy {
  private api = inject(ApiService);
  auth = inject(AuthService);
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

  // §17 reviews + §9 wishlist state
  reviews = signal<Review[]>([]);
  summary = signal<ReviewSummary | null>(null);
  reviewPage = signal(1);
  moreReviews = signal(false);
  reviewNotice = signal('');
  saved = signal(false);

  // quote dialog state
  quoteOpen = signal(false);
  quoteBusy = signal(false);
  quoteError = signal('');
  quoteQty = 1;
  quoteMessage = '';

  private slideshowTimer?: ReturnType<typeof setInterval>;

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.api.marketProduct(slug).subscribe({
      next: (res) => {
        this.product.set(res.data);
        this.variant.set(res.data.variants.find((v) => v.status === 'active') ?? res.data.variants[0] ?? null);
        this.activeImage.set(res.data.images.find((i) => i.is_primary)?.url ?? res.data.images[0]?.url ?? null);
        this.startSlideshow();
        const min = this.minQty(res.data);
        this.qty = min;
        this.quoteQty = min;
      },
      error: () => this.error.set('Product not found.'),
    });

    this.loadReviews(1);

    if (this.auth.isLoggedIn()) {
      this.api.wishlistIds().subscribe({
        next: (res) => {
          const current = this.product();
          if (current) this.saved.set(res.data.product_ids.includes(current.id));
          else this.pendingWishlistIds = res.data.product_ids;
        },
        error: () => undefined,
      });
    }
  }

  private pendingWishlistIds: number[] = [];

  loadReviews(page: number) {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.api.productReviews(slug, { page: String(page), per_page: '5' }).subscribe({
      next: (res) => {
        this.reviews.set(page === 1 ? res.data : [...this.reviews(), ...res.data]);
        this.summary.set(res.summary);
        this.reviewPage.set(page);
        this.moreReviews.set(page < (res.meta?.last_page ?? 1));
        if (this.pendingWishlistIds.length) {
          const current = this.product();
          if (current) this.saved.set(this.pendingWishlistIds.includes(current.id));
        }
      },
      error: () => undefined,
    });
  }

  scrollToReviews() {
    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  markHelpful(review: Review) {
    this.api.voteReview(review.id, true).subscribe({
      next: (res) => {
        this.reviews.set(
          this.reviews().map((row) => (row.id === review.id ? { ...row, helpful_count: res.data.helpful_count } : row)),
        );
      },
      error: () => this.reviewNotice.set('We could not record that vote.'),
    });
  }

  report(review: Review) {
    this.api.reportReview(review.id, 'inappropriate').subscribe({
      next: () => this.reviewNotice.set('Thanks — the marketplace team will review this.'),
      error: () => this.reviewNotice.set('We could not submit that report.'),
    });
  }

  toggleWishlist(product: ProductCard) {
    if (this.saved()) {
      this.api.removeWishlistProduct(product.id).subscribe({
        next: () => {
          this.saved.set(false);
          this.notice.set('Removed from your wishlist.');
        },
        error: () => this.notice.set('We could not update your wishlist.'),
      });
      return;
    }
    this.api.addToWishlist({ product_id: product.id, variant_id: this.variant()?.id ?? null }).subscribe({
      next: () => {
        this.saved.set(true);
        this.notice.set('Saved to your wishlist.');
      },
      error: () => this.notice.set('We could not update your wishlist.'),
    });
  }

  ngOnDestroy(): void {
    this.pauseSlideshow();
  }

  activeImageIndex(product: ProductCard): number {
    const index = product.images.findIndex((image) => image.url === this.activeImage());
    return index >= 0 ? index : 0;
  }

  selectImage(url: string): void {
    this.activeImage.set(url);
    this.restartSlideshow();
  }

  previousImage(product: ProductCard): void {
    this.moveImage(product, -1);
  }

  nextImage(product: ProductCard): void {
    this.moveImage(product, 1);
  }

  /** Start a gentle, pauseable carousel for galleries with two or more images. */
  startSlideshow(): void {
    this.pauseSlideshow();
    const product = this.product();
    if (!product || product.images.length < 2 || this.prefersReducedMotion()) return;

    this.slideshowTimer = setInterval(() => {
      const current = this.product();
      if (current) this.moveImage(current, 1, false);
    }, 5000);
  }

  pauseSlideshow(): void {
    if (this.slideshowTimer) {
      clearInterval(this.slideshowTimer);
      this.slideshowTimer = undefined;
    }
  }

  private restartSlideshow(): void {
    this.startSlideshow();
  }

  private moveImage(product: ProductCard, direction: 1 | -1, restart = true): void {
    if (product.images.length < 2) return;
    const next = (this.activeImageIndex(product) + direction + product.images.length) % product.images.length;
    this.activeImage.set(product.images[next].url);
    if (restart) this.restartSlideshow();
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
