import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Dispute, DisputeSummary, Refund, RefundSummary } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type Tab = 'refunds' | 'disputes';

const OUTCOMES = [
  { value: 'refund_full', label: 'Refund in full' },
  { value: 'refund_partial', label: 'Partial refund' },
  { value: 'replacement', label: 'Send a replacement' },
  { value: 'no_action', label: 'No action needed' },
  { value: 'customer_favour', label: 'Resolved for the customer' },
  { value: 'seller_favour', label: 'Resolved for the seller' },
];

@Component({
  selector: 'app-seller-returns',
  imports: [FormsModule, DatePipe, MoneyPipe],
  template: `
    <div class="wrap cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">After-sales</p>
          <h1>Refunds &amp; disputes</h1>
          <p class="intro">
            Approve or decline refund requests, and answer disputes before the 72-hour window closes — unanswered
            cases are escalated to the marketplace team automatically.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
        </div>
      </header>

      <section class="cx-stats">
        <div class="cx-stat warn"><span>Open refunds</span><strong>{{ refundSummary()?.open ?? 0 }}</strong><small>Waiting on you</small></div>
        <div class="cx-stat"><span>Refunded</span><strong>{{ refundSummary()?.refunded_value || '0' | money }}</strong><small>{{ refundSummary()?.completed ?? 0 }} completed</small></div>
        <div class="cx-stat warn"><span>Open disputes</span><strong>{{ disputeSummary()?.open ?? 0 }}</strong><small>Active cases</small></div>
        <div class="cx-stat bad"><span>Overdue</span><strong>{{ disputeSummary()?.overdue ?? 0 }}</strong><small>Past the 72h reply window</small></div>
      </section>

      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }

      <div class="cx-tabs">
        <button type="button" [class.on]="tab() === 'refunds'" (click)="tab.set('refunds')">Refunds <b>{{ refunds().length }}</b></button>
        <button type="button" [class.on]="tab() === 'disputes'" (click)="tab.set('disputes')">Disputes <b>{{ disputes().length }}</b></button>
      </div>

      @if (tab() === 'refunds') {
        <div class="cx-toolbar">
          <select [(ngModel)]="refundStatus" name="rstatus" (ngModelChange)="loadRefunds()">
            <option value="">Every status</option>
            <option value="requested">Awaiting decision</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Declined</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <section class="cx-panel">
          <header><div><h2>Refund requests</h2><p>Approving a refund reverses the matching platform commission.</p></div></header>
          @if (loading()) {
            <div class="cx-skeleton"><span></span><span></span><span></span></div>
          } @else if (!refunds().length) {
            <div class="cx-empty"><strong>No refund requests</strong><p>Happy customers. Nothing to action here.</p></div>
          } @else {
            <div class="cx-table-scroll">
              <table class="cx-table">
                <thead>
                  <tr><th>Reference</th><th>Customer</th><th>Reason</th><th class="num">Amount</th><th class="num">Commission back</th><th>Status</th><th class="act"></th></tr>
                </thead>
                <tbody>
                  @for (refund of refunds(); track refund.id) {
                    <tr>
                      <td><strong>{{ refund.reference }}</strong><span class="sub">Order #{{ refund.order_id }}</span></td>
                      <td>{{ refund.customer?.name || '—' }}<span class="sub">{{ refund.customer?.email }}</span></td>
                      <td>
                        {{ pretty(refund.reason) }}
                        @if (refund.customer_note) { <span class="sub">“{{ refund.customer_note }}”</span> }
                      </td>
                      <td class="num">{{ refund.amount | money: refund.currency }}</td>
                      <td class="num">{{ refund.commission_reversal | money: refund.currency }}<span class="sub">net −{{ refund.net_seller_impact | money: refund.currency }}</span></td>
                      <td><span class="chip" [class]="'chip ' + refund.status">{{ pretty(refund.status) }}</span></td>
                      <td class="act">
                        @if (refund.status === 'requested') {
                          <button class="mini go" type="button" [disabled]="busy()" (click)="approve(refund)">Approve</button>
                          <button class="mini danger" type="button" [disabled]="busy()" (click)="reject(refund)">Decline</button>
                        } @else {
                          <span class="muted">{{ refund.processed_at ? (refund.processed_at | date: 'MMM d') : '—' }}</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      } @else {
        <div class="cx-split">
          <section class="cx-panel">
            <header><div><h2>Dispute cases</h2><p>Reply quickly — the clock is visible to the buyer.</p></div></header>
            @if (!disputes().length) {
              <div class="cx-empty"><strong>No disputes</strong><p>Nothing has been escalated against your stores.</p></div>
            } @else {
              <div class="cx-table-scroll">
                <table class="cx-table">
                  <thead><tr><th>Case</th><th>Customer</th><th>Status</th><th class="num">Claimed</th><th>Due</th><th class="act"></th></tr></thead>
                  <tbody>
                    @for (dispute of disputes(); track dispute.id) {
                      <tr [class.on]="selected()?.id === dispute.id" (click)="open(dispute)">
                        <td><strong>{{ dispute.reference }}</strong><span class="sub">{{ dispute.subject }}</span></td>
                        <td>{{ dispute.customer?.name || '—' }}</td>
                        <td>
                          <span class="chip" [class]="'chip ' + dispute.status">{{ pretty(dispute.status) }}</span>
                          @if (dispute.is_overdue) { <span class="chip bad">Overdue</span> }
                        </td>
                        <td class="num">{{ dispute.amount_claimed | money: dispute.currency }}</td>
                        <td>{{ dispute.seller_due_at ? (dispute.seller_due_at | date: 'MMM d, HH:mm') : '—' }}</td>
                        <td class="act"><button class="mini" type="button">Open</button></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <aside class="cx-panel">
            @if (selected(); as dispute) {
              <header>
                <div><h2>{{ dispute.reference }}</h2><p>{{ dispute.subject }}</p></div>
                <span class="chip" [class]="'chip ' + dispute.status">{{ pretty(dispute.status) }}</span>
              </header>
              <div class="cx-panel-body">
                <dl class="cx-kv">
                  <div><dt>Type</dt><dd>{{ pretty(dispute.type) }}</dd></div>
                  <div><dt>Customer</dt><dd>{{ dispute.customer?.name }}</dd></div>
                  <div><dt>Claimed</dt><dd>{{ dispute.amount_claimed | money: dispute.currency }}</dd></div>
                  <div><dt>Reply due</dt><dd>{{ dispute.seller_due_at ? (dispute.seller_due_at | date: 'MMM d, HH:mm') : '—' }}</dd></div>
                  @if (dispute.seller_order) {
                    <div><dt>Refundable</dt><dd>{{ dispute.seller_order.refundable_total | money: dispute.seller_order.currency }}</dd></div>
                  }
                </dl>

                <div class="cx-chat">
                  @for (msg of dispute.messages || []; track msg.id) {
                    <div class="msg" [class.me]="msg.author_role === 'seller'" [class.internal]="msg.is_internal">
                      <header><strong>{{ msg.author_name }}</strong><span>{{ pretty(msg.author_role) }}</span><time>{{ msg.created_at ? (msg.created_at | date: 'MMM d, HH:mm') : '' }}</time></header>
                      <p>{{ msg.body }}</p>
                    </div>
                  }
                </div>

                @if (!['resolved', 'rejected', 'closed'].includes(dispute.status)) {
                  <div class="cx-form reply-form">
                    <label>Reply to the customer<textarea [(ngModel)]="reply" name="dreply" placeholder="Explain what happened and what you will do"></textarea></label>
                    <div class="actions">
                      <button class="btn" type="button" (click)="sendReply(dispute)" [disabled]="busy() || !reply.trim()">Send reply</button>
                    </div>

                    <h3 class="sub-head">Resolve this case</h3>
                    <div class="row">
                      <label>
                        Outcome
                        <select [(ngModel)]="outcome" name="doutcome">
                          @for (option of outcomes; track option.value) { <option [value]="option.value">{{ option.label }}</option> }
                        </select>
                      </label>
                      <label>
                        Refund amount
                        <input type="number" min="0" step="0.01" [(ngModel)]="refundAmount" name="damount" [disabled]="!needsAmount()" placeholder="0.00" />
                      </label>
                    </div>
                    <label>Resolution note<textarea [(ngModel)]="resolution" name="dresolution" placeholder="What you agreed with the customer"></textarea></label>
                    <div class="actions">
                      <button class="btn" type="button" (click)="resolve(dispute)" [disabled]="busy() || !resolution.trim()">Resolve case</button>
                      <button class="btn ghost" type="button" (click)="escalate(dispute)" [disabled]="busy()">Ask MarketHub to arbitrate</button>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="cx-empty"><strong>Select a case</strong><p>Open a dispute to read the thread and respond.</p></div>
            }
          </aside>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .reply-form { margin-top: 14px; }
      .sub-head { margin: 18px 0 2px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-soft); }
    `,
  ],
})
export class SellerReturnsComponent {
  private api = inject(ApiService);

  readonly outcomes = OUTCOMES;

  tab = signal<Tab>('refunds');
  refunds = signal<Refund[]>([]);
  refundSummary = signal<RefundSummary | null>(null);
  disputes = signal<Dispute[]>([]);
  disputeSummary = signal<DisputeSummary | null>(null);
  selected = signal<Dispute | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  message = signal('');

  refundStatus = '';
  reply = '';
  outcome = 'refund_partial';
  refundAmount = '';
  resolution = '';

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.loadRefunds();
    this.api.tenantDisputes({ per_page: '40' }).subscribe({
      next: (res) => {
        this.disputes.set(res.data || []);
        this.disputeSummary.set(res.summary);
      },
      error: () => undefined,
    });
  }

  loadRefunds() {
    const params: Record<string, string> = { per_page: '40' };
    if (this.refundStatus) params['status'] = this.refundStatus;
    this.api.tenantRefunds(params).subscribe({
      next: (res) => {
        this.refunds.set(res.data || []);
        this.refundSummary.set(res.summary);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load refund requests.');
      },
    });
  }

  approve(refund: Refund) {
    this.busy.set(true);
    this.api.approveRefund(refund.id, 'Approved by the seller').subscribe({
      next: () => {
        this.busy.set(false);
        this.message.set(`${refund.reference} approved — the customer has been refunded.`);
        this.loadRefunds();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'That refund could not be approved.');
      },
    });
  }

  reject(refund: Refund) {
    this.busy.set(true);
    this.api.rejectRefund(refund.id, 'Declined by the seller after review').subscribe({
      next: () => {
        this.busy.set(false);
        this.message.set(`${refund.reference} declined. The buyer can still escalate a dispute.`);
        this.loadRefunds();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'That refund could not be declined.');
      },
    });
  }

  open(dispute: Dispute) {
    this.api.tenantDispute(dispute.id).subscribe({
      next: (res) => {
        this.selected.set(res.data);
        this.refundAmount = res.data.amount_claimed || '';
        this.resolution = '';
      },
      error: () => this.error.set('We could not open that case.'),
    });
  }

  sendReply(dispute: Dispute) {
    const body = this.reply.trim();
    if (!body) return;
    this.busy.set(true);
    this.api.replyToTenantDispute(dispute.id, body).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.reply = '';
        this.selected.set(res.data);
        this.message.set('Reply sent to the customer.');
      },
      error: () => {
        this.busy.set(false);
        this.error.set('Your reply was not sent.');
      },
    });
  }

  needsAmount(): boolean {
    return this.outcome === 'refund_full' || this.outcome === 'refund_partial';
  }

  resolve(dispute: Dispute) {
    this.busy.set(true);
    this.api
      .resolveTenantDispute(dispute.id, {
        outcome: this.outcome,
        resolution: this.resolution.trim(),
        refund_amount: this.needsAmount() && this.refundAmount ? Number(this.refundAmount) : null,
      })
      .subscribe({
        next: (res) => {
          this.busy.set(false);
          this.selected.set(res.data);
          this.message.set('Case resolved.');
          this.load();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.message || 'That case could not be resolved.');
        },
      });
  }

  escalate(dispute: Dispute) {
    this.busy.set(true);
    this.api.escalateTenantDispute(dispute.id, 'Seller requested marketplace arbitration').subscribe({
      next: (res) => {
        this.busy.set(false);
        this.selected.set(res.data);
        this.message.set('The marketplace team will arbitrate this case.');
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'That case could not be escalated.');
      },
    });
  }

  pretty(value: string | null | undefined): string {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
