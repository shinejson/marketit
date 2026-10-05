import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { SalesQuote } from '../../core/models';

/**
 * "My quotes" — the customer side of the request-for-quote channel.
 * Requests are drafts until the merchant prices and sends them; a sent
 * quote can be accepted or declined right here.
 */
@Component({
  selector: 'app-customer-quotes',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <div class="wrap page">
      <header class="head">
        <div>
          <p class="eyebrow">My account</p>
          <h1>My quotes</h1>
          <p class="muted">Every price request you've sent merchants, and their offers. Accept an offer to lock the deal.</p>
        </div>
        <a class="btn ghost" [routerLink]="['/products']">Browse products</a>
      </header>

      @if (error()) { <p class="err">{{ error() }}</p> }

      @if (loading() && !quotes().length) {
        <p class="muted">Loading your quotes…</p>
      } @else if (!quotes().length) {
        <div class="card empty">
          <h3>No quote requests yet</h3>
          <p class="muted">Open any product and tap <b>Request a quote</b> to ask a merchant for their best bulk price.</p>
          <a class="btn accent" [routerLink]="['/products']">Find products</a>
        </div>
      } @else {
        <div class="list">
          @for (q of quotes(); track q.id) {
            <article class="card row" [class.open]="expanded() === q.id">
              <button type="button" class="summary" (click)="toggle(q.id)">
                <span class="num">{{ q.number }}</span>
                <span class="who">{{ q.tenant?.name || 'Merchant' }}</span>
                <span class="items">{{ q.items.length }} item{{ q.items.length === 1 ? '' : 's' }}</span>
                <span class="total">{{ +q.total | currency:q.currency }}</span>
                <span class="status" [attr.data-s]="q.status">{{ label(q) }}</span>
                <span class="date muted">{{ q.issue_date | date:'mediumDate' }}</span>
              </button>

              @if (expanded() === q.id) {
                <div class="detail">
                  @if (q.request_message) { <p class="msg"><b>Your message:</b> {{ q.request_message }}</p> }
                  <table>
                    <thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Tax</th><th class="r">Line total</th></tr></thead>
                    <tbody>
                      @for (it of q.items; track $index) {
                        <tr>
                          <td>{{ it.description }}</td>
                          <td>{{ +it.quantity }}</td>
                          <td>{{ +it.unit_price | currency:q.currency }}</td>
                          <td>{{ it.tax_rate ? +it.tax_rate : 0 }}%</td>
                          <td class="r">{{ +(it.line_total || 0) | currency:q.currency }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  <div class="totals">
                    <span>Subtotal <b>{{ +q.subtotal | currency:q.currency }}</b></span>
                    <span>Tax <b>{{ +q.tax_total | currency:q.currency }}</b></span>
                    @if (+q.discount_total > 0) { <span>Discount <b>−{{ +q.discount_total | currency:q.currency }}</b></span> }
                    <span class="grand">Total <b>{{ +q.total | currency:q.currency }}</b></span>
                  </div>
                  @if (q.notes && q.status !== 'draft') { <p class="msg"><b>Merchant note:</b> {{ q.notes }}</p> }
                  <p class="muted valid">Offer valid until {{ q.expiry_date | date:'mediumDate' }}</p>

                  @if (q.status === 'sent') {
                    <div class="answer">
                      <button class="btn ok" type="button" [disabled]="busy()" (click)="answer(q, 'accept')">{{ busy() ? 'Working…' : 'Accept quote' }}</button>
                      <button class="btn ghost danger" type="button" [disabled]="busy()" (click)="answer(q, 'decline')">Decline</button>
                    </div>
                  }
                  @if (q.status === 'draft') { <p class="muted">The merchant is reviewing your request — you'll be able to answer once they send the official quote.</p> }
                </div>
              }
            </article>
          }
        </div>

        @if (page() < lastPage()) {
          <button class="btn ghost more" type="button" [disabled]="loading()" (click)="loadMore()">{{ loading() ? 'Loading…' : 'Load more' }}</button>
        }
      }
    </div>
  `,
  styles: [`
    .page { padding: 28px 0 64px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 18px; margin-bottom: 22px; flex-wrap: wrap; }
    .eyebrow { margin: 0 0 6px; color: var(--accent); font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(26px, 3.2vw, 36px); }
    .head .muted { margin: 6px 0 0; max-width: 560px; }
    .list { display: grid; gap: 12px; }
    .row { padding: 0; overflow: hidden; }
    .summary { display: grid; grid-template-columns: 150px 1.2fr .6fr .7fr auto auto; align-items: center; gap: 14px; width: 100%; padding: 15px 18px; background: none; border: 0; cursor: pointer; text-align: left; color: var(--ink); font: inherit; }
    .summary:hover { background: var(--paper-2); }
    .num { font-weight: 800; }
    .who { color: var(--ink-soft); }
    .items { color: var(--ink-soft); font-size: 13px; }
    .total { font-weight: 700; }
    .date { font-size: 12px; text-align: right; }
    .status { font-size: 11px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; padding: 5px 10px; border-radius: 999px; background: var(--paper-2); color: var(--ink-soft); white-space: nowrap; }
    .status[data-s='sent'] { background: rgba(196,92,38,.15); color: var(--accent); }
    .status[data-s='accepted'] { background: rgba(31,75,58,.14); color: var(--ok); }
    .status[data-s='declined'], .status[data-s='expired'], .status[data-s='void'] { background: rgba(155,44,44,.10); color: var(--danger); }
    .detail { border-top: 1px solid var(--line); padding: 18px; display: grid; gap: 12px; }
    .detail table { width: 100%; border-collapse: collapse; }
    .detail th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-soft); padding: 6px 8px; border-bottom: 1px solid var(--line); }
    .detail td { padding: 9px 8px; border-bottom: 1px solid var(--paper-2); font-size: 14px; }
    .detail .r, .detail th.r { text-align: right; }
    .totals { display: flex; gap: 18px; justify-content: flex-end; font-size: 14px; color: var(--ink-soft); flex-wrap: wrap; }
    .totals .grand { color: var(--ink); font-weight: 700; font-size: 16px; }
    .msg { margin: 0; background: var(--paper-2); border-radius: 10px; padding: 10px 13px; font-size: 13px; }
    .valid { font-size: 12px; margin: 0; }
    .answer { display: flex; gap: 10px; }
    .btn.danger { color: var(--danger); border-color: var(--danger); }
    .empty { padding: 34px; text-align: center; display: grid; gap: 8px; justify-items: center; }
    .empty h3 { margin: 0; }
    .empty .muted { margin: 0 0 8px; max-width: 430px; }
    .more { display: block; margin: 18px auto 0; }
    .err { color: var(--danger); }
    @media (max-width: 720px) {
      .summary { grid-template-columns: 1fr auto; grid-template-areas: 'num status' 'who status' 'items total' 'date date'; row-gap: 4px; }
      .num { grid-area: num; } .who { grid-area: who; } .items { grid-area: items; }
      .total { grid-area: total; text-align: right; } .status { grid-area: status; } .date { grid-area: date; text-align: left; }
    }
  `],
})
export class CustomerQuotesComponent {
  private api = inject(ApiService);

  quotes = signal<SalesQuote[]>([]);
  loading = signal(false);
  busy = signal(false);
  error = signal('');
  expanded = signal<number | null>(null);
  page = signal(1);
  lastPage = signal(1);

  constructor() {
    this.fetch(1);
  }

  label(q: SalesQuote): string {
    if (q.status === 'draft') return 'Requested';
    if (q.status === 'sent') return 'Offer ready';
    return q.status.charAt(0).toUpperCase() + q.status.slice(1);
  }

  toggle(id: number): void {
    this.expanded.set(this.expanded() === id ? null : id);
  }

  loadMore(): void {
    this.fetch(this.page() + 1);
  }

  answer(q: SalesQuote, action: 'accept' | 'decline'): void {
    this.busy.set(true);
    this.error.set('');
    this.api.respondQuote(q.id, action).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (res) => this.quotes.update((list) => list.map((row) => (row.id === q.id ? res.data : row))),
      error: (e) => this.error.set(e?.error?.message || 'Could not send your answer.'),
    });
  }

  private fetch(page: number): void {
    this.loading.set(true);
    this.api.myQuotes({ page, per_page: 10 }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (res) => {
        this.page.set(res.meta.page);
        this.lastPage.set(res.meta.last_page);
        this.quotes.update((list) => (page === 1 ? res.data : [...list, ...res.data]));
      },
      error: () => this.error.set('Could not load your quotes.'),
    });
  }
}
