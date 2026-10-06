import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AdminReviewSummary, Review, ReviewReport } from '../../core/models';
import { StarRatingComponent } from '../../shared/star-rating.component';

type Tab = 'queue' | 'reports' | 'stores';

interface StoreRating {
  id: number;
  name: string;
  slug: string;
  tenant?: string;
  rating_avg: number;
  rating_count: number;
}

@Component({
  selector: 'app-admin-reviews',
  imports: [FormsModule, DatePipe, StarRatingComponent],
  template: `
    <main class="page cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">Trust &amp; safety</p>
          <h1>Reviews</h1>
          <p class="intro">
            Moderate what shoppers publish, action abuse reports, and keep an eye on which sellers are earning (or
            losing) trust.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
          @if (selection().length) {
            <button class="btn" type="button" (click)="bulk('approved')">Approve {{ selection().length }}</button>
            <button class="btn ghost" type="button" (click)="bulk('rejected')">Reject {{ selection().length }}</button>
          }
        </div>
      </header>

      <section class="cx-stats">
        <div class="cx-stat"><span>Reviews</span><strong>{{ summary()?.total ?? 0 }}</strong><small>Across the marketplace</small></div>
        <div class="cx-stat warn"><span>Pending</span><strong>{{ summary()?.pending ?? 0 }}</strong><small>Waiting for moderation</small></div>
        <div class="cx-stat bad"><span>Open reports</span><strong>{{ summary()?.open_reports ?? 0 }}</strong><small>Flagged by users</small></div>
        <div class="cx-stat"><span>Average rating</span><strong>{{ (summary()?.average ?? 0).toFixed(2) }}</strong><small>Published reviews only</small></div>
      </section>

      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }

      <div class="cx-tabs">
        <button type="button" [class.on]="tab() === 'queue'" (click)="tab.set('queue')">Moderation queue <b>{{ summary()?.pending ?? 0 }}</b></button>
        <button type="button" [class.on]="tab() === 'reports'" (click)="switchTo('reports')">Reports <b>{{ summary()?.open_reports ?? 0 }}</b></button>
        <button type="button" [class.on]="tab() === 'stores'" (click)="switchTo('stores')">Store ratings</button>
      </div>

      @switch (tab()) {
        @case ('queue') {
          <div class="cx-toolbar">
            <input type="search" [(ngModel)]="query" name="q" placeholder="Search text, reviewer, product or store" (keyup.enter)="apply()" />
            <select [(ngModel)]="status" name="status" (ngModelChange)="apply()">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Published</option>
              <option value="flagged">Flagged</option>
              <option value="rejected">Rejected</option>
            </select>
            <select [(ngModel)]="rating" name="rating" (ngModelChange)="apply()">
              <option value="">Any rating</option>
              @for (value of [5, 4, 3, 2, 1]; track value) { <option [value]="value">{{ value }} star{{ value === 1 ? '' : 's' }}</option> }
            </select>
            <label class="inline-check spacer">
              <input type="checkbox" [(ngModel)]="reportedOnly" name="reported" (ngModelChange)="apply()" /> Reported only
            </label>
          </div>

          <section class="cx-panel">
            <header>
              <div><h2>Moderation queue</h2><p>{{ rows().length }} review(s) on this page.</p></div>
              <label class="inline-check"><input type="checkbox" [checked]="allSelected()" (change)="toggleAll()" /> Select all</label>
            </header>

            @if (loading()) {
              <div class="cx-skeleton"><span></span><span></span><span></span><span></span></div>
            } @else if (!rows().length) {
              <div class="cx-empty"><strong>Queue is clear</strong><p>No reviews match this filter.</p></div>
            } @else {
              <div class="cx-panel-body cx-list">
                @for (review of rows(); track review.id) {
                  <article class="cx-item">
                    <div class="top">
                      <input type="checkbox" [checked]="selection().includes(review.id)" (change)="toggle(review.id)" [attr.aria-label]="'Select review ' + review.id" />
                      <app-stars [value]="review.rating" [showValue]="true" />
                      <span class="chip" [class]="'chip ' + review.status">{{ pretty(review.status) }}</span>
                      @if (review.is_verified_purchase) { <span class="chip ok plain">Verified</span> }
                      @if (review.report_count) { <span class="chip bad">{{ review.report_count }} report(s)</span> }
                      <span class="when">{{ review.created_at ? (review.created_at | date: 'MMM d, y') : '' }}</span>
                    </div>
                    <strong>{{ review.title || 'Untitled review' }}</strong>
                    @if (review.body) { <p>{{ review.body }}</p> }
                    <div class="top meta">
                      <span class="muted">{{ review.customer?.name || 'Customer' }}</span>
                      <span class="muted">· {{ review.tenant || '—' }}</span>
                      <span class="muted">· {{ review.product?.name || review.store?.name || 'Store review' }}</span>
                    </div>
                    <div class="top">
                      <button class="mini go" type="button" (click)="moderate(review, 'approved')">Publish</button>
                      <button class="mini" type="button" (click)="moderate(review, 'flagged')">Flag</button>
                      <button class="mini danger" type="button" (click)="moderate(review, 'rejected')">Reject</button>
                      <button class="mini danger" type="button" (click)="remove(review)">Delete</button>
                    </div>
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
        }

        @case ('reports') {
          <section class="cx-panel">
            <header><div><h2>Abuse reports</h2><p>Reports raised by shoppers and sellers.</p></div></header>
            @if (!reports().length) {
              <div class="cx-empty"><strong>Nothing reported</strong><p>No open reports against published reviews.</p></div>
            } @else {
              <div class="cx-table-scroll">
                <table class="cx-table">
                  <thead><tr><th>Review</th><th>Reason</th><th>Reported by</th><th>Status</th><th>When</th><th class="act"></th></tr></thead>
                  <tbody>
                    @for (report of reports(); track report.id) {
                      <tr>
                        <td>
                          <strong>{{ report.review?.title || 'Review #' + report.review_id }}</strong>
                          <span class="sub">{{ report.review?.product || report.review?.store }}</span>
                        </td>
                        <td>{{ pretty(report.reason) }}@if (report.note) { <span class="sub">{{ report.note }}</span> }</td>
                        <td>{{ reporterName(report) }}</td>
                        <td><span class="chip" [class]="'chip ' + report.status">{{ pretty(report.status) }}</span></td>
                        <td>{{ report.created_at ? (report.created_at | date: 'MMM d, y') : '—' }}</td>
                        <td class="act">
                          @if (report.status === 'open') {
                            <button class="mini danger" type="button" (click)="resolveReport(report, 'actioned')">Take down</button>
                            <button class="mini" type="button" (click)="resolveReport(report, 'dismissed')">Dismiss</button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        }

        @case ('stores') {
          <section class="cx-panel">
            <header><div><h2>Store ratings</h2><p>Top-rated sellers by customer score.</p></div></header>
            @if (!storeRatings().length) {
              <div class="cx-empty"><strong>No rated stores yet</strong><p>Ratings appear once customers review their orders.</p></div>
            } @else {
              <div class="cx-table-scroll">
                <table class="cx-table">
                  <thead><tr><th>Store</th><th>Tenant</th><th>Rating</th><th class="num">Reviews</th></tr></thead>
                  <tbody>
                    @for (store of storeRatings(); track store.id) {
                      <tr>
                        <td><strong>{{ store.name }}</strong><span class="sub">/{{ store.slug }}</span></td>
                        <td>{{ store.tenant || '—' }}</td>
                        <td><app-stars [value]="store.rating_avg" [showValue]="true" /></td>
                        <td class="num">{{ store.rating_count }}</td>
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
      .meta { gap: 6px; font-size: 11.5px; }
      .inline-check { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 650; color: var(--ink-soft); }
      .inline-check input { width: 15px; height: 15px; }
    `,
  ],
})
export class AdminReviewsComponent {
  private api = inject(ApiService);

  tab = signal<Tab>('queue');
  rows = signal<Review[]>([]);
  summary = signal<AdminReviewSummary | null>(null);
  reports = signal<ReviewReport[]>([]);
  storeRatings = signal<StoreRating[]>([]);
  selection = signal<number[]>([]);
  loading = signal(true);
  error = signal('');
  message = signal('');
  page = signal(1);
  lastPage = signal(1);

  query = '';
  status = 'pending';
  rating = '';
  reportedOnly = false;

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
    if (this.reportedOnly) params['reported'] = '1';

    this.api.adminReviews(params).subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.summary.set(res.summary);
        this.lastPage.set(res.meta?.last_page || 1);
        this.selection.set([]);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load the moderation queue.');
      },
    });
  }

  switchTo(tab: Tab) {
    this.tab.set(tab);
    if (tab === 'reports' && !this.reports().length) {
      this.api.adminReviewReports({ status: 'open', per_page: '40' }).subscribe({
        next: (res) => this.reports.set(res.data || []),
        error: () => this.error.set('We could not load review reports.'),
      });
    }
    if (tab === 'stores' && !this.storeRatings().length) {
      this.api.adminStoreRatings(30).subscribe({
        next: (res) => this.storeRatings.set(res.data || []),
        error: () => this.error.set('We could not load store ratings.'),
      });
    }
  }

  apply() {
    this.page.set(1);
    this.load();
  }

  go(page: number) {
    this.page.set(Math.max(1, Math.min(page, this.lastPage())));
    this.load();
  }

  toggle(id: number) {
    const current = this.selection();
    this.selection.set(current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  allSelected(): boolean {
    return this.rows().length > 0 && this.selection().length === this.rows().length;
  }

  toggleAll() {
    this.selection.set(this.allSelected() ? [] : this.rows().map((review) => review.id));
  }

  moderate(review: Review, status: string) {
    this.api.moderateReview(review.id, status).subscribe({
      next: () => {
        this.message.set(`Review #${review.id} ${status}.`);
        this.load();
      },
      error: () => this.error.set('That decision could not be saved.'),
    });
  }

  bulk(status: string) {
    const ids = this.selection();
    if (!ids.length) return;
    this.api.bulkModerateReviews(ids, status).subscribe({
      next: (res) => {
        this.message.set(`${res.data.updated} review(s) ${status}.`);
        this.load();
      },
      error: () => this.error.set('The bulk action failed.'),
    });
  }

  remove(review: Review) {
    this.api.deleteAdminReview(review.id).subscribe({
      next: () => {
        this.message.set('Review deleted.');
        this.load();
      },
      error: () => this.error.set('That review could not be deleted.'),
    });
  }

  resolveReport(report: ReviewReport, status: string) {
    this.api.resolveReviewReport(report.id, status).subscribe({
      next: () => {
        this.reports.set(this.reports().filter((row) => row.id !== report.id));
        this.message.set(status === 'actioned' ? 'Review taken down.' : 'Report dismissed.');
        this.load();
      },
      error: () => this.error.set('That report could not be resolved.'),
    });
  }

  reporterName(report: ReviewReport): string {
    const reporter = report.reporter;
    if (!reporter) return 'Anonymous';
    return typeof reporter === 'string' ? reporter : reporter.name;
  }

  pretty(value: string | null | undefined): string {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
