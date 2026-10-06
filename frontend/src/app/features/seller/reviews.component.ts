import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Review, TenantReviewSummary } from '../../core/models';
import { StarRatingComponent } from '../../shared/star-rating.component';

@Component({
  selector: 'app-seller-reviews',
  imports: [FormsModule, DatePipe, StarRatingComponent],
  template: `
    <div class="wrap cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">Trust &amp; reputation</p>
          <h1>Customer reviews</h1>
          <p class="intro">
            Every verified review for your stores. Reply publicly to turn a complaint into a win, and flag anything
            abusive for the marketplace team.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
        </div>
      </header>

      <section class="cx-stats">
        <div class="cx-stat"><span>Average rating</span><strong>{{ (summary()?.average ?? 0).toFixed(1) }}</strong><small>Across {{ summary()?.total ?? 0 }} reviews</small></div>
        <div class="cx-stat good"><span>Promoters</span><strong>{{ summary()?.promoters ?? 0 }}</strong><small>4★ and above</small></div>
        <div class="cx-stat bad"><span>Detractors</span><strong>{{ summary()?.detractors ?? 0 }}</strong><small>2★ and below</small></div>
        <div class="cx-stat warn"><span>Awaiting reply</span><strong>{{ summary()?.needs_response ?? 0 }}</strong><small>Unanswered reviews</small></div>
      </section>

      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }

      <div class="cx-toolbar">
        <input type="search" [(ngModel)]="query" name="q" placeholder="Search reviewer, product or text" (keyup.enter)="apply()" />
        <select [(ngModel)]="status" name="status" (ngModelChange)="apply()">
          <option value="">All statuses</option>
          <option value="approved">Published</option>
          <option value="pending">Pending moderation</option>
          <option value="flagged">Flagged</option>
          <option value="rejected">Rejected</option>
        </select>
        <select [(ngModel)]="rating" name="rating" (ngModelChange)="apply()">
          <option value="">Any rating</option>
          @for (value of [5, 4, 3, 2, 1]; track value) { <option [value]="value">{{ value }} star{{ value === 1 ? '' : 's' }}</option> }
        </select>
        <label class="check spacer">
          <input type="checkbox" [(ngModel)]="unansweredOnly" name="unanswered" (ngModelChange)="apply()" />
          Needs a reply
        </label>
      </div>

      <section class="cx-panel">
        <header>
          <div><h2>Review inbox</h2><p>{{ rows().length }} review{{ rows().length === 1 ? '' : 's' }} on this page.</p></div>
        </header>

        @if (loading()) {
          <div class="cx-skeleton"><span></span><span></span><span></span><span></span></div>
        } @else if (!rows().length) {
          <div class="cx-empty">
            <strong>No reviews match this view</strong>
            <p>Once customers rate a delivered order their feedback lands here.</p>
          </div>
        } @else {
          <div class="cx-panel-body cx-list">
            @for (review of rows(); track review.id) {
              <article class="cx-item">
                <div class="top">
                  <app-stars [value]="review.rating" [showValue]="true" />
                  <span class="chip" [class]="'chip ' + review.status">{{ pretty(review.status) }}</span>
                  @if (review.is_verified_purchase) { <span class="chip ok plain">Verified buyer</span> }
                  @if (review.report_count) { <span class="chip bad">{{ review.report_count }} report(s)</span> }
                  <span class="when">{{ review.created_at ? (review.created_at | date: 'MMM d, y') : '' }}</span>
                </div>
                <strong>{{ review.title || 'Rated ' + review.rating + ' out of 5' }}</strong>
                @if (review.body) { <p>{{ review.body }}</p> }
                <div class="top meta">
                  <span class="muted">{{ review.customer?.name || 'Customer' }}</span>
                  <span class="muted">·</span>
                  <span class="muted">{{ review.product?.name || review.store?.name || 'Store review' }}</span>
                  <span class="muted">·</span>
                  <span class="muted">{{ review.helpful_count }} found this helpful</span>
                </div>

                @if (review.response_body) {
                  <div class="reply">
                    <strong>Your reply · {{ review.responded_at ? (review.responded_at | date: 'MMM d, y') : '' }}</strong>
                    <p>{{ review.response_body }}</p>
                    <button class="mini" type="button" (click)="startReply(review)">Edit reply</button>
                  </div>
                } @else {
                  <div class="top">
                    <button class="mini go" type="button" (click)="startReply(review)">Reply publicly</button>
                    <button class="mini danger" type="button" (click)="flag(review)">Report to MarketHub</button>
                  </div>
                }

                @if (replyingTo() === review.id) {
                  <div class="cx-form reply-form">
                    <label>
                      Public response
                      <textarea [(ngModel)]="replyBody" [name]="'reply-' + review.id" placeholder="Thanks for the feedback — here is what we are doing about it…"></textarea>
                    </label>
                    <div class="actions">
                      <button class="btn" type="button" (click)="sendReply(review)" [disabled]="busy() || !replyBody.trim()">Publish reply</button>
                      <button class="btn ghost" type="button" (click)="replyingTo.set(null)">Cancel</button>
                    </div>
                  </div>
                }
              </article>
            }
          </div>
          <footer>
            <span>Page {{ page() }} of {{ lastPage() }}</span>
            <span class="cx-pager">
              <button type="button" [disabled]="page() <= 1" (click)="go(page() - 1)">Previous</button>
              <button type="button" [disabled]="page() >= lastPage()" (click)="go(page() + 1)">Next</button>
            </span>
          </footer>
        }
      </section>
    </div>
  `,
  styles: [
    `
      .meta { gap: 6px; font-size: 11.5px; }
      .reply { padding: 10px 12px; border-left: 3px solid var(--accent); background: var(--paper-2); border-radius: 0 10px 10px 0; }
      .reply strong { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-soft); }
      .reply p { margin: 4px 0 8px; font-size: 12.5px; }
      .reply-form { margin-top: 6px; }
      .check { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 650; color: var(--ink-soft); }
      .check input { width: 15px; height: 15px; }
    `,
  ],
})
export class SellerReviewsComponent {
  private api = inject(ApiService);

  rows = signal<Review[]>([]);
  summary = signal<TenantReviewSummary | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  message = signal('');
  page = signal(1);
  lastPage = signal(1);
  replyingTo = signal<number | null>(null);

  query = '';
  status = '';
  rating = '';
  unansweredOnly = false;
  replyBody = '';

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    const params: Record<string, string> = { page: String(this.page()), per_page: '15' };
    if (this.query.trim()) params['q'] = this.query.trim();
    if (this.status) params['status'] = this.status;
    if (this.rating) params['rating'] = this.rating;
    if (this.unansweredOnly) params['unanswered'] = '1';

    this.api.tenantReviews(params).subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.summary.set(res.summary);
        this.lastPage.set(res.meta?.last_page || 1);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load your reviews right now.');
      },
    });
  }

  apply() {
    this.page.set(1);
    this.load();
  }

  go(page: number) {
    this.page.set(Math.max(1, Math.min(page, this.lastPage())));
    this.load();
  }

  startReply(review: Review) {
    this.replyingTo.set(review.id);
    this.replyBody = review.response_body || '';
  }

  sendReply(review: Review) {
    const body = this.replyBody.trim();
    if (!body) return;
    this.busy.set(true);
    this.api.respondToReview(review.id, body).subscribe({
      next: () => {
        this.busy.set(false);
        this.replyingTo.set(null);
        this.replyBody = '';
        this.message.set('Your reply is now public on the review.');
        this.load();
      },
      error: () => {
        this.busy.set(false);
        this.error.set('That reply could not be published.');
      },
    });
  }

  flag(review: Review) {
    this.api.flagReview(review.id, 'abuse', 'Reported from the seller console').subscribe({
      next: () => this.message.set('Reported. The marketplace team will take a look.'),
      error: () => this.error.set('We could not report that review.'),
    });
  }

  pretty(value: string | null | undefined): string {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
