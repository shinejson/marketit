import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { WishlistItem, WishlistPayload, WishlistStoreEntry } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';
import { StarRatingComponent } from '../../shared/star-rating.component';

type Tab = 'items' | 'stores';

@Component({
  selector: 'app-wishlist',
  imports: [FormsModule, RouterLink, DatePipe, MoneyPipe, StarRatingComponent],
  template: `
    <div class="wrap cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">Saved for later</p>
          <h1>Wishlist</h1>
          <p class="intro">
            Keep an eye on products you are not ready to buy yet. We flag price drops and let you know when a sold-out
            item is back.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
          <a class="btn" routerLink="/catalog">Browse catalogue</a>
        </div>
      </header>

      <section class="cx-stats">
        <div class="cx-stat"><span>Saved items</span><strong>{{ payload()?.counts?.items ?? 0 }}</strong><small>Across every store</small></div>
        <div class="cx-stat good"><span>Price drops</span><strong>{{ priceDrops().length }}</strong><small>Cheaper than when you saved</small></div>
        <div class="cx-stat warn"><span>Out of stock</span><strong>{{ outOfStock().length }}</strong><small>We will ping you on restock</small></div>
        <div class="cx-stat"><span>Followed stores</span><strong>{{ payload()?.counts?.stores ?? 0 }}</strong><small>Sellers you follow</small></div>
      </section>

      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }

      <div class="cx-tabs">
        <button type="button" [class.on]="tab() === 'items'" (click)="tab.set('items')">Products <b>{{ items().length }}</b></button>
        <button type="button" [class.on]="tab() === 'stores'" (click)="tab.set('stores')">Stores <b>{{ stores().length }}</b></button>
      </div>

      @if (loading()) {
        <div class="cx-panel"><div class="cx-skeleton"><span></span><span></span><span></span><span></span></div></div>
      } @else if (tab() === 'items') {
        @if (!items().length) {
          <div class="cx-panel">
            <div class="cx-empty">
              <strong>Nothing saved yet</strong>
              <p>Tap the heart on any product to keep it here while you decide.</p>
              <a class="btn" routerLink="/catalog">Find something you love</a>
            </div>
          </div>
        } @else {
          <section class="cx-panel">
            <header>
              <div><h2>Saved products</h2><p>{{ items().length }} item{{ items().length === 1 ? '' : 's' }} waiting for you.</p></div>
            </header>
            <div class="cx-table-scroll">
              <table class="cx-table">
                <thead>
                  <tr><th>Product</th><th>Store</th><th>Rating</th><th class="num">Price</th><th>Saved</th><th class="act"></th></tr>
                </thead>
                <tbody>
                  @for (item of items(); track item.id) {
                    <tr>
                      <td>
                        <div class="cx-media">
                          <img class="cx-thumb" [src]="item.product?.image || placeholder" [alt]="item.product?.name || 'Product'" />
                          <div>
                            <strong>
                              <a [routerLink]="['/products', item.product?.slug]">{{ item.product?.name }}</a>
                            </strong>
                            @if (item.variant) { <span class="sub">{{ optionText(item.variant.options) }}</span> }
                            @if (item.product && !item.product.in_stock) { <span class="chip bad">Out of stock</span> }
                            @if (item.price_dropped) { <span class="chip ok">Price drop</span> }
                          </div>
                        </div>
                      </td>
                      <td>
                        @if (item.product?.store; as store) {
                          <a [routerLink]="['/stores', store.slug]">{{ store.name }}</a>
                        } @else { <span class="muted">—</span> }
                      </td>
                      <td><app-stars [value]="item.product?.rating_avg || 0" [count]="item.product?.rating_count ?? 0" /></td>
                      <td class="num">
                        <strong>{{ item.current_price | money: item.product?.store?.currency }}</strong>
                        @if (item.price_dropped && item.price_at_save) {
                          <span class="sub"><s>{{ item.price_at_save | money: item.product?.store?.currency }}</s></span>
                        }
                      </td>
                      <td>{{ item.created_at ? (item.created_at | date: 'MMM d, y') : '—' }}</td>
                      <td class="act">
                        <button class="mini go" type="button" [disabled]="busy() === item.id || !item.product?.in_stock" (click)="moveToCart(item)">
                          Add to cart
                        </button>
                        <button class="mini danger" type="button" [disabled]="busy() === item.id" (click)="remove(item)">Remove</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      } @else {
        @if (!stores().length) {
          <div class="cx-panel">
            <div class="cx-empty">
              <strong>You are not following any stores</strong>
              <p>Follow a seller to get their new arrivals and promotions in your notification centre.</p>
              <a class="btn" routerLink="/stores">Discover stores</a>
            </div>
          </div>
        } @else {
          <section class="cx-panel">
            <header><div><h2>Stores you follow</h2><p>New drops from these sellers reach your notification centre.</p></div></header>
            <div class="cx-panel-body cx-list">
              @for (entry of stores(); track entry.id) {
                <article class="cx-item">
                  <div class="top">
                    <strong><a [routerLink]="['/stores', entry.store?.slug]">{{ entry.store?.name }}</a></strong>
                    <app-stars [value]="entry.store?.rating_avg || 0" [count]="entry.store?.rating_count ?? 0" />
                    <button class="mini danger when" type="button" (click)="unfollow(entry)">Unfollow</button>
                  </div>
                </article>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [
    `
      a { color: inherit; text-decoration: none; }
      a:hover { color: var(--accent); }
      s { color: var(--ink-soft); }
    `,
  ],
})
export class WishlistComponent {
  private api = inject(ApiService);

  readonly placeholder = '/assets/placeholder.svg';

  payload = signal<WishlistPayload | null>(null);
  loading = signal(true);
  error = signal('');
  message = signal('');
  busy = signal<number | null>(null);
  tab = signal<Tab>('items');

  items = computed<WishlistItem[]>(() => this.payload()?.items ?? []);
  stores = computed<WishlistStoreEntry[]>(() => this.payload()?.stores ?? []);
  priceDrops = computed(() => this.items().filter((item) => item.price_dropped));
  outOfStock = computed(() => this.items().filter((item) => item.product && !item.product.in_stock));

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.wishlist().subscribe({
      next: (res) => {
        this.payload.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load your wishlist right now.');
      },
    });
  }

  remove(item: WishlistItem) {
    this.busy.set(item.id);
    this.api.removeWishlistItem(item.id).subscribe({
      next: () => {
        this.busy.set(null);
        this.message.set('Removed from your wishlist.');
        this.load();
      },
      error: () => {
        this.busy.set(null);
        this.error.set('That item could not be removed.');
      },
    });
  }

  moveToCart(item: WishlistItem) {
    this.busy.set(item.id);
    this.api.wishlistToCart(item.id, 1).subscribe({
      next: () => {
        this.busy.set(null);
        this.message.set(`${item.product?.name ?? 'Item'} moved to your cart.`);
        this.load();
      },
      error: (err) => {
        this.busy.set(null);
        this.error.set(err?.error?.message || 'We could not move that item to your cart.');
      },
    });
  }

  unfollow(entry: WishlistStoreEntry) {
    if (!entry.store) return;
    this.api.toggleFavouriteStore(entry.store.id).subscribe({
      next: () => {
        this.message.set('Store unfollowed.');
        this.load();
      },
      error: () => this.error.set('We could not update that store.'),
    });
  }

  optionText(options: Record<string, unknown> | null | undefined): string {
    if (!options) return '';
    return Object.entries(options)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' · ');
  }
}
