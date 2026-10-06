import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { PendingReview, Review } from '../../core/models';
import { StarPickerComponent, StarRatingComponent } from '../../shared/star-rating.component';

@Component({
  selector: 'app-my-reviews',
  imports: [FormsModule, RouterLink, DatePipe, StarRatingComponent, StarPickerComponent],
  template: `
    <div class="wrap cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">Your voice</p>
          <h1>Reviews &amp; ratings</h1>
          <p class="intro">
            Rate what you have bought, edit anything you have already published, and see how sellers replied.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
          <a class="btn" routerLink="/orders">My orders</a>
        </div>
      </header>

      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }

      <div class="cx-split">
        <div class="stack">
          <section class="cx-panel">
            <header>
              <div><h2>Waiting for your review</h2><p>Only delivered items can be reviewed — that is what makes a review verified.</p></div>
              <span class="chip plain">{{ pending().length }} item{{ pending().length === 1 ? '' : 's' }}</span>
            </header>
            @if (loading()) {
              <div class="cx-skeleton"><span></span><span></span><span></span></div>
            } @else if (!pending().length) {
              <div class="cx-empty"><strong>Nothing pending</strong><p>You have reviewed everything you received. Thank you.</p></div>
            } @else {
              <div class="cx-panel-body cx-list">
                @for (item of pending(); track item.product_id + '-' + item.seller_order_id) {
                  <article class="cx-item">
                    <div class="top">
                      <img class="cx-thumb" [src]="item.image || placeholder" [alt]="item.product_name" />
                      <div>
                        <strong>{{ item.product_name }}</strong>
                        <span class="sub muted">{{ item.store_name }} · order #{{ item.order_id }}</span>
                      </div>
                      <button class="mini go when" type="button" (click)="startFor(item)">Write a review</button>
                    </div>
                  </article>
                }
              </div>
            }
          </section>

          <section class="cx-panel">
            <header>
              <div><h2>Published reviews</h2><p>{{ reviews().length }} review{{ reviews().length === 1 ? '' : 's' }} on your account.</p></div>
            </header>
            @if (!reviews().length && !loading()) {
              <div class="cx-empty"><strong>No reviews yet</strong><p>Your first review will show up here once you publish it.</p></div>
            } @else {
              <div class="cx-panel-body cx-list">
                @for (review of reviews(); track review.id) {
                  <article class="cx-item">
                    <div class="top">
                      <app-stars [value]="review.rating" [showValue]="true" />
                      <span class="chip" [class]="'chip ' + review.status">{{ review.status }}</span>
                      @if (review.is_verified_purchase) { <span class="chip ok plain">Verified purchase</span> }
                      <span class="when">{{ review.created_at ? (review.created_at | date: 'MMM d, y') : '' }}</span>
                    </div>
                    <strong>{{ review.title || (review.product?.name ?? review.store?.name) }}</strong>
                    @if (review.body) { <p>{{ review.body }}</p> }
                    <div class="top">
                      <span class="muted sub">
                        @if (review.product) { <a [routerLink]="['/products', review.product.slug]">{{ review.product.name }}</a> }
                        @else if (review.store) { <a [routerLink]="['/stores', review.store.slug]">{{ review.store.name }}</a> }
                      </span>
                      <span class="muted sub">{{ review.helpful_count }} found this helpful</span>
                      <button class="mini when" type="button" (click)="edit(review)">Edit</button>
                      <button class="mini danger" type="button" (click)="remove(review)">Delete</button>
                    </div>
                    @if (review.response_body) {
                      <div class="reply">
                        <strong>Seller replied</strong>
                        <p>{{ review.response_body }}</p>
                      </div>
                    }
                  </article>
                }
              </div>
            }
          </section>
        </div>

        <aside class="cx-panel">
          <header>
            <div>
              <h2>{{ editing() ? 'Edit your review' : 'Write a review' }}</h2>
              <p>{{ target()?.name || 'Pick a product from the list to get started.' }}</p>
            </div>
          </header>
          <div class="cx-panel-body cx-form">
            @if (!target()) {
              <p class="muted">Choose an item above and we will prefill everything for you.</p>
            } @else {
              <label>
                Your rating
                <app-star-picker [value]="form.rating" (valueChange)="form.rating = $event" ariaLabel="Product rating" />
              </label>
              <label>
                Headline
                <input [(ngModel)]="form.title" name="title" maxlength="120" placeholder="Sums up your experience" />
              </label>
              <label>
                Your review
                <textarea [(ngModel)]="form.body" name="body" maxlength="4000" placeholder="What stood out? Was it as described? How was delivery?"></textarea>
              </label>
              <div class="actions">
                <button class="btn" type="button" (click)="submit()" [disabled]="saving() || !form.rating">
                  {{ saving() ? 'Saving…' : editing() ? 'Update review' : 'Publish review' }}
                </button>
                <button class="btn ghost" type="button" (click)="cancel()">Cancel</button>
              </div>
              <p class="muted hint">
                Reviews may be held for moderation. Keep it about the product and the seller — we remove abuse and spam.
              </p>
            }
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [
    `
      .stack { display: grid; gap: 16px; }
      a { color: var(--accent); text-decoration: none; }
      .reply { margin-top: 4px; padding: 10px 12px; border-left: 3px solid var(--accent); background: var(--paper-2); border-radius: 0 10px 10px 0; }
      .reply strong { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink-soft); }
      .reply p { margin: 4px 0 0; font-size: 12.5px; }
      .hint { font-size: 11.5px; line-height: 1.5; }
    `,
  ],
})
export class MyReviewsComponent {
  private api = inject(ApiService);

  readonly placeholder = '/assets/placeholder.svg';

  reviews = signal<Review[]>([]);
  pending = signal<PendingReview[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  message = signal('');
  editing = signal<Review | null>(null);
  target = signal<{ name: string; product_id?: number; store_id: number } | null>(null);

  form: { rating: number; title: string; body: string } = { rating: 5, title: '', body: '' };

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.myReviews({ per_page: '50' }).subscribe({
      next: (res) => {
        this.reviews.set(res.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load your reviews.');
      },
    });
    this.api.reviewableProducts().subscribe({
      next: (res) => this.pending.set(res.data || []),
      error: () => undefined,
    });
  }

  startFor(item: PendingReview) {
    this.editing.set(null);
    this.target.set({ name: item.product_name, product_id: item.product_id, store_id: item.store_id });
    this.form = { rating: 5, title: '', body: '' };
  }

  edit(review: Review) {
    this.editing.set(review);
    this.target.set({
      name: review.product?.name || review.store?.name || 'Your review',
      product_id: review.product?.id,
      store_id: review.store?.id || 0,
    });
    this.form = { rating: review.rating, title: review.title || '', body: review.body || '' };
  }

  cancel() {
    this.editing.set(null);
    this.target.set(null);
  }

  submit() {
    const target = this.target();
    if (!target) return;
    this.saving.set(true);
    this.error.set('');

    const existing = this.editing();
    const call = existing
      ? this.api.updateReview(existing.id, { rating: this.form.rating, title: this.form.title, body: this.form.body })
      : this.api.submitReview({
          store_id: target.store_id,
          product_id: target.product_id ?? null,
          rating: this.form.rating,
          title: this.form.title,
          body: this.form.body,
        });

    call.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.cancel();
        this.message.set(
          res.data.status === 'pending'
            ? 'Thanks! Your review is queued for moderation and will appear shortly.'
            : 'Your review is live. Thanks for helping other shoppers.',
        );
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'We could not save that review.');
      },
    });
  }

  remove(review: Review) {
    this.api.deleteReview(review.id).subscribe({
      next: () => {
        this.message.set('Review deleted.');
        this.load();
      },
      error: () => this.error.set('We could not delete that review.'),
    });
  }
}
