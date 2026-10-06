import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Dispute, DisputeSummary, Refund, RefundSummary } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type Tab = 'disputes' | 'refunds';

const OUTCOMES = [
  { value: 'customer_favour', label: 'Find for the customer' },
  { value: 'seller_favour', label: 'Find for the seller' },
  { value: 'refund_full', label: 'Full refund' },
  { value: 'refund_partial', label: 'Partial refund' },
  { value: 'replacement', label: 'Replacement agreed' },
  { value: 'no_action', label: 'No action' },
];

@Component({
  selector: 'app-admin-disputes',
  imports: [FormsModule, DatePipe, MoneyPipe],
  template: `
    <main class="page cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">Buyer protection</p>
          <h1>Disputes &amp; refunds</h1>
          <p class="intro">
            Arbitrate cases sellers could not resolve and keep the refund ledger clean. Commission is reversed
            automatically on every approved refund.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
          <button class="btn ghost" type="button" (click)="loadOverdue()">Show overdue</button>
        </div>
      </header>

      <section class="cx-stats">
        <div class="cx-stat warn"><span>Open cases</span><strong>{{ disputeSummary()?.open ?? 0 }}</strong><small>Active disputes</small></div>
        <div class="cx-stat bad"><span>Escalated</span><strong>{{ disputeSummary()?.escalated ?? 0 }}</strong><small>Need arbitration</small></div>
        <div class="cx-stat bad"><span>Overdue</span><strong>{{ disputeSummary()?.overdue ?? 0 }}</strong><small>Seller missed the 72h window</small></div>
        <div class="cx-stat"><span>Refunded</span><strong>{{ refundSummary()?.refunded_value || '0' | money }}</strong><small>Commission back {{ refundSummary()?.commission_reversed || '0' | money }}</small></div>
      </section>

      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }

      <div class="cx-tabs">
        <button type="button" [class.on]="tab() === 'disputes'" (click)="tab.set('disputes')">Disputes <b>{{ disputes().length }}</b></button>
        <button type="button" [class.on]="tab() === 'refunds'" (click)="switchToRefunds()">Refund ledger <b>{{ refunds().length }}</b></button>
      </div>

      @if (tab() === 'disputes') {
        <div class="cx-toolbar">
          <input type="search" [(ngModel)]="query" name="q" placeholder="Search case, customer or seller" (keyup.enter)="load()" />
          <select [(ngModel)]="status" name="status" (ngModelChange)="load()">
            <option value="">Every status</option>
            <option value="open">Open</option>
            <option value="awaiting_seller">Awaiting seller</option>
            <option value="awaiting_customer">Awaiting customer</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div class="cx-split">
          <section class="cx-panel">
            <header><div><h2>Dispute queue</h2><p>{{ disputes().length }} case(s) on this page.</p></div></header>
            @if (loading()) {
              <div class="cx-skeleton"><span></span><span></span><span></span></div>
            } @else if (!disputes().length) {
              <div class="cx-empty"><strong>No disputes</strong><p>Nothing needs arbitration right now.</p></div>
            } @else {
              <div class="cx-table-scroll">
                <table class="cx-table">
                  <thead><tr><th>Case</th><th>Seller</th><th>Customer</th><th>Status</th><th class="num">Claimed</th><th class="act"></th></tr></thead>
                  <tbody>
                    @for (dispute of disputes(); track dispute.id) {
                      <tr [class.on]="selected()?.id === dispute.id" (click)="open(dispute)">
                        <td><strong>{{ dispute.reference }}</strong><span class="sub">{{ pretty(dispute.type) }}</span></td>
                        <td>{{ dispute.tenant || '—' }}<span class="sub">{{ dispute.store?.name }}</span></td>
                        <td>{{ dispute.customer?.name || '—' }}</td>
                        <td>
                          <span class="chip" [class]="'chip ' + dispute.status">{{ pretty(dispute.status) }}</span>
                          @if (dispute.is_overdue) { <span class="chip bad">Overdue</span> }
                          @if (dispute.assigned_admin) { <span class="sub">{{ dispute.assigned_admin.name }}</span> }
                        </td>
                        <td class="num">{{ dispute.amount_claimed | money: dispute.currency }}</td>
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
                  <div><dt>Seller</dt><dd>{{ dispute.tenant }} · {{ dispute.store?.name }}</dd></div>
                  <div><dt>Customer</dt><dd>{{ dispute.customer?.name }}</dd></div>
                  <div><dt>Type</dt><dd>{{ pretty(dispute.type) }}</dd></div>
                  <div><dt>Claimed</dt><dd>{{ dispute.amount_claimed | money: dispute.currency }}</dd></div>
                  <div><dt>Seller reply due</dt><dd>{{ dispute.seller_due_at ? (dispute.seller_due_at | date: 'MMM d, HH:mm') : '—' }}</dd></div>
                  <div><dt>Assigned to</dt><dd>{{ dispute.assigned_admin?.name || 'Unassigned' }}</dd></div>
                  @if (dispute.seller_order) {
                    <div><dt>Order value</dt><dd>{{ dispute.seller_order.grand_total | money: dispute.seller_order.currency }}</dd></div>
                    <div><dt>Still refundable</dt><dd>{{ dispute.seller_order.refundable_total | money: dispute.seller_order.currency }}</dd></div>
                  }
                </dl>

                <div class="cx-chat">
                  @for (msg of dispute.messages || []; track msg.id) {
                    <div class="msg" [class.me]="msg.author_role === 'admin'" [class.internal]="msg.is_internal">
                      <header>
                        <strong>{{ msg.author_name }}</strong>
                        <span>{{ pretty(msg.author_role) }}@if (msg.is_internal) { <span> · internal</span> }</span>
                        <time>{{ msg.created_at ? (msg.created_at | date: 'MMM d, HH:mm') : '' }}</time>
                      </header>
                      <p>{{ msg.body }}</p>
                    </div>
                  }
                </div>

                <div class="cx-form reply-form">
                  <label>Message<textarea [(ngModel)]="reply" name="areply" placeholder="Explain the decision or ask for evidence"></textarea></label>
                  <label class="check"><input type="checkbox" [(ngModel)]="internal" name="ainternal" /> Internal note (not visible to buyer or seller)</label>
                  <div class="actions">
                    <button class="btn" type="button" (click)="sendReply(dispute)" [disabled]="busy() || !reply.trim()">Post message</button>
                    <button class="btn ghost" type="button" (click)="assign(dispute)" [disabled]="busy()">Assign to me</button>
                    @if (dispute.status !== 'escalated' && !['resolved', 'rejected', 'closed'].includes(dispute.status)) {
                      <button class="btn ghost" type="button" (click)="escalate(dispute)" [disabled]="busy()">Escalate</button>
                    }
                  </div>

                  @if (!['resolved', 'rejected', 'closed'].includes(dispute.status)) {
                    <h3 class="sub-head">Arbitrate</h3>
                    <div class="row">
                      <label>
                        Outcome
                        <select [(ngModel)]="outcome" name="aoutcome">
                          @for (option of outcomes; track option.value) { <option [value]="option.value">{{ option.label }}</option> }
                        </select>
                      </label>
                      <label>
                        Refund amount
                        <input type="number" min="0" step="0.01" [(ngModel)]="refundAmount" name="arefund" [disabled]="!needsAmount()" />
                      </label>
                    </div>
                    <label>Decision<textarea [(ngModel)]="resolution" name="aresolution" placeholder="Record the reasoning for the audit trail"></textarea></label>
                    <div class="actions">
                      <button class="btn" type="button" (click)="resolve(dispute)" [disabled]="busy() || !resolution.trim()">Close case</button>
                    </div>
                  }
                </div>
              </div>
            } @else {
              <div class="cx-empty"><strong>Select a case</strong><p>Open a dispute to read the thread and arbitrate.</p></div>
            }
          </aside>
        </div>
      } @else {
        <div class="cx-toolbar">
          <select [(ngModel)]="refundStatus" name="rstatus" (ngModelChange)="loadRefunds()">
            <option value="">Every status</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <section class="cx-panel">
          <header><div><h2>Refund ledger</h2><p>Every refund across the marketplace with its commission reversal.</p></div></header>
          @if (!refunds().length) {
            <div class="cx-empty"><strong>No refunds</strong><p>Nothing matches this filter.</p></div>
          } @else {
            <div class="cx-table-scroll">
              <table class="cx-table">
                <thead>
                  <tr><th>Reference</th><th>Seller</th><th>Customer</th><th class="num">Amount</th><th class="num">Commission back</th><th>Status</th><th class="act"></th></tr>
                </thead>
                <tbody>
                  @for (refund of refunds(); track refund.id) {
                    <tr>
                      <td><strong>{{ refund.reference }}</strong><span class="sub">Order #{{ refund.order_id }} · {{ pretty(refund.reason) }}</span></td>
                      <td>{{ refund.tenant || '—' }}<span class="sub">{{ refund.store?.name }}</span></td>
                      <td>{{ refund.customer?.name || '—' }}</td>
                      <td class="num">{{ refund.amount | money: refund.currency }}</td>
                      <td class="num">{{ refund.commission_reversal | money: refund.currency }}</td>
                      <td><span class="chip" [class]="'chip ' + refund.status">{{ pretty(refund.status) }}</span></td>
                      <td class="act">
                        @if (refund.status === 'requested') {
                          <button class="mini go" type="button" (click)="approveRefund(refund)">Approve</button>
                          <button class="mini danger" type="button" (click)="rejectRefund(refund)">Reject</button>
                        } @else if (refund.status === 'failed') {
                          <button class="mini" type="button" (click)="retry(refund)">Retry</button>
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
    </main>
  `,
  styles: [
    `
      .page { width: min(1240px, calc(100% - 40px)); margin: 0 auto; }
      .reply-form { margin-top: 14px; }
      .sub-head { margin: 18px 0 2px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-soft); }
    `,
  ],
})
export class AdminDisputesComponent {
  private api = inject(ApiService);

  readonly outcomes = OUTCOMES;

  tab = signal<Tab>('disputes');
  disputes = signal<Dispute[]>([]);
  disputeSummary = signal<DisputeSummary | null>(null);
  refunds = signal<Refund[]>([]);
  refundSummary = signal<RefundSummary | null>(null);
  selected = signal<Dispute | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  message = signal('');

  query = '';
  status = '';
  refundStatus = '';
  reply = '';
  internal = false;
  outcome = 'customer_favour';
  refundAmount = '';
  resolution = '';

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    const params: Record<string, string> = { per_page: '30' };
    if (this.query.trim()) params['q'] = this.query.trim();
    if (this.status) params['status'] = this.status;

    this.api.adminDisputes(params).subscribe({
      next: (res) => {
        this.disputes.set(res.data || []);
        this.disputeSummary.set(res.summary);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load the dispute queue.');
      },
    });
    if (!this.refunds().length) this.loadRefunds();
  }

  loadOverdue() {
    this.tab.set('disputes');
    this.api.overdueDisputes().subscribe({
      next: (res) => {
        this.disputes.set(res.data || []);
        this.message.set(`${res.data.length} overdue case(s).`);
      },
      error: () => this.error.set('We could not load overdue cases.'),
    });
  }

  switchToRefunds() {
    this.tab.set('refunds');
    this.loadRefunds();
  }

  loadRefunds() {
    const params: Record<string, string> = { per_page: '30' };
    if (this.refundStatus) params['status'] = this.refundStatus;
    this.api.adminRefunds(params).subscribe({
      next: (res) => {
        this.refunds.set(res.data || []);
        this.refundSummary.set(res.summary);
      },
      error: () => this.error.set('We could not load the refund ledger.'),
    });
  }

  open(dispute: Dispute) {
    this.api.adminDispute(dispute.id).subscribe({
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
    this.api.replyToAdminDispute(dispute.id, body, this.internal).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.reply = '';
        this.selected.set(res.data);
        this.message.set('Message posted.');
      },
      error: () => {
        this.busy.set(false);
        this.error.set('That message was not posted.');
      },
    });
  }

  assign(dispute: Dispute) {
    this.busy.set(true);
    this.api.assignDispute(dispute.id).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.selected.set(res.data);
        this.message.set('Case assigned to you.');
        this.load();
      },
      error: () => {
        this.busy.set(false);
        this.error.set('That case could not be assigned.');
      },
    });
  }

  escalate(dispute: Dispute) {
    this.busy.set(true);
    this.api.escalateAdminDispute(dispute.id, 'Escalated by the marketplace team').subscribe({
      next: (res) => {
        this.busy.set(false);
        this.selected.set(res.data);
        this.load();
      },
      error: () => {
        this.busy.set(false);
        this.error.set('That case could not be escalated.');
      },
    });
  }

  needsAmount(): boolean {
    return ['refund_full', 'refund_partial', 'customer_favour'].includes(this.outcome);
  }

  resolve(dispute: Dispute) {
    this.busy.set(true);
    this.api
      .resolveAdminDispute(dispute.id, {
        outcome: this.outcome,
        resolution: this.resolution.trim(),
        refund_amount: this.needsAmount() && this.refundAmount ? Number(this.refundAmount) : null,
      })
      .subscribe({
        next: (res) => {
          this.busy.set(false);
          this.selected.set(res.data);
          this.message.set('Case closed.');
          this.load();
          this.loadRefunds();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.message || 'That case could not be closed.');
        },
      });
  }

  approveRefund(refund: Refund) {
    this.api.adminApproveRefund(refund.id, 'Approved by the marketplace team').subscribe({
      next: () => {
        this.message.set(`${refund.reference} approved.`);
        this.loadRefunds();
      },
      error: (err) => this.error.set(err?.error?.message || 'That refund could not be approved.'),
    });
  }

  rejectRefund(refund: Refund) {
    this.api.adminRejectRefund(refund.id, 'Rejected after review').subscribe({
      next: () => {
        this.message.set(`${refund.reference} rejected.`);
        this.loadRefunds();
      },
      error: () => this.error.set('That refund could not be rejected.'),
    });
  }

  retry(refund: Refund) {
    this.api.retryRefund(refund.id).subscribe({
      next: () => {
        this.message.set(`${refund.reference} retried.`);
        this.loadRefunds();
      },
      error: () => this.error.set('That refund could not be retried.'),
    });
  }

  pretty(value: string | null | undefined): string {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
