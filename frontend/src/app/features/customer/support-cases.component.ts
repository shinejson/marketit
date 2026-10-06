import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Dispute, Refund, Shipment } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type Tab = 'refunds' | 'disputes' | 'tracking';

const DISPUTE_TYPES = [
  { value: 'item_not_received', label: 'Item never arrived' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'damaged', label: 'Arrived damaged' },
  { value: 'wrong_item', label: 'Wrong item sent' },
  { value: 'late_delivery', label: 'Delivered far too late' },
  { value: 'unauthorised', label: 'I did not authorise this' },
  { value: 'other', label: 'Something else' },
];

const REFUND_REASONS = [
  { value: 'not_received', label: 'Never arrived' },
  { value: 'damaged', label: 'Damaged on arrival' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'wrong_item', label: 'Wrong item' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'other', label: 'Other' },
];

@Component({
  selector: 'app-support-cases',
  imports: [FormsModule, RouterLink, DatePipe, MoneyPipe],
  template: `
    <div class="wrap cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">Buyer protection</p>
          <h1>Refunds, disputes &amp; tracking</h1>
          <p class="intro">
            Track a parcel, ask a seller for a refund, or escalate to the marketplace team when a seller does not
            respond within 72 hours.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
          <a class="btn" routerLink="/orders">My orders</a>
        </div>
      </header>

      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }

      <div class="cx-tabs">
        <button type="button" [class.on]="tab() === 'refunds'" (click)="tab.set('refunds')">Refunds <b>{{ refunds().length }}</b></button>
        <button type="button" [class.on]="tab() === 'disputes'" (click)="tab.set('disputes')">Disputes <b>{{ disputes().length }}</b></button>
        <button type="button" [class.on]="tab() === 'tracking'" (click)="tab.set('tracking')">Track a parcel</button>
      </div>

      @switch (tab()) {
        @case ('refunds') {
          <section class="cx-panel">
            <header>
              <div><h2>Refund requests</h2><p>Sellers have the first call; the marketplace steps in if a request stalls.</p></div>
            </header>
            @if (loading()) {
              <div class="cx-skeleton"><span></span><span></span><span></span></div>
            } @else if (!refunds().length) {
              <div class="cx-empty">
                <strong>No refund requests</strong>
                <p>Open an order and choose “Request a refund” if something went wrong.</p>
              </div>
            } @else {
              <div class="cx-table-scroll">
                <table class="cx-table">
                  <thead>
                    <tr><th>Reference</th><th>Store</th><th>Reason</th><th class="num">Amount</th><th>Status</th><th>Requested</th><th class="act"></th></tr>
                  </thead>
                  <tbody>
                    @for (refund of refunds(); track refund.id) {
                      <tr>
                        <td><strong>{{ refund.reference }}</strong><span class="sub">Order #{{ refund.order_id }}</span></td>
                        <td>{{ refund.store?.name || '—' }}</td>
                        <td>{{ pretty(refund.reason) }}<span class="sub">{{ pretty(refund.type) }}</span></td>
                        <td class="num">{{ refund.amount | money: refund.currency }}</td>
                        <td><span class="chip" [class]="'chip ' + refund.status">{{ pretty(refund.status) }}</span></td>
                        <td>{{ refund.requested_at ? (refund.requested_at | date: 'MMM d, y') : '—' }}</td>
                        <td class="act">
                          @if (refund.status === 'requested') {
                            <button class="mini danger" type="button" (click)="cancelRefund(refund)">Cancel</button>
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

        @case ('disputes') {
          <div class="cx-split">
            <section class="cx-panel">
              <header><div><h2>Your disputes</h2><p>A seller has 72 hours to respond before you can escalate.</p></div></header>
              @if (!disputes().length && !loading()) {
                <div class="cx-empty"><strong>No open disputes</strong><p>Good news — nothing needs arbitration right now.</p></div>
              } @else {
                <div class="cx-table-scroll">
                  <table class="cx-table">
                    <thead><tr><th>Case</th><th>Store</th><th>Status</th><th class="num">Claimed</th><th class="act"></th></tr></thead>
                    <tbody>
                      @for (dispute of disputes(); track dispute.id) {
                        <tr [class.on]="selected()?.id === dispute.id" (click)="openDispute(dispute)">
                          <td><strong>{{ dispute.reference }}</strong><span class="sub">{{ dispute.subject }}</span></td>
                          <td>{{ dispute.store?.name || '—' }}</td>
                          <td>
                            <span class="chip" [class]="'chip ' + dispute.status">{{ pretty(dispute.status) }}</span>
                            @if (dispute.is_overdue) { <span class="chip bad">Overdue</span> }
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
                    <div><dt>Type</dt><dd>{{ pretty(dispute.type) }}</dd></div>
                    <div><dt>Amount claimed</dt><dd>{{ dispute.amount_claimed | money: dispute.currency }}</dd></div>
                    <div><dt>Seller response due</dt><dd>{{ dispute.seller_due_at ? (dispute.seller_due_at | date: 'MMM d, HH:mm') : '—' }}</dd></div>
                    @if (dispute.outcome) { <div><dt>Outcome</dt><dd>{{ pretty(dispute.outcome) }}</dd></div> }
                  </dl>

                  <div class="cx-chat">
                    @for (msg of dispute.messages || []; track msg.id) {
                      <div class="msg" [class.me]="msg.author_role === 'customer'">
                        <header><strong>{{ msg.author_name }}</strong><span>{{ pretty(msg.author_role) }}</span><time>{{ msg.created_at ? (msg.created_at | date: 'MMM d, HH:mm') : '' }}</time></header>
                        <p>{{ msg.body }}</p>
                      </div>
                    }
                  </div>

                  @if (!['resolved', 'rejected', 'closed'].includes(dispute.status)) {
                    <div class="cx-form reply-form">
                      <label>
                        Add a message
                        <textarea [(ngModel)]="reply" name="reply" placeholder="Share more detail, photos or receipts"></textarea>
                      </label>
                      <div class="actions">
                        <button class="btn" type="button" (click)="sendReply(dispute)" [disabled]="busy() || !reply.trim()">Send</button>
                        @if (dispute.status !== 'escalated') {
                          <button class="btn ghost" type="button" (click)="escalate(dispute)" [disabled]="busy()">Escalate to MarketHub</button>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="cx-empty"><strong>Select a case</strong><p>Pick a dispute to read the conversation and reply.</p></div>
              }
            </aside>
          </div>
        }

        @case ('tracking') {
          <section class="cx-panel">
            <header><div><h2>Track a shipment</h2><p>Enter the tracking reference from your order or delivery email.</p></div></header>
            <div class="cx-panel-body cx-form">
              <div class="row">
                <label>
                  Tracking reference
                  <input [(ngModel)]="trackingRef" name="trackingRef" placeholder="e.g. SHP-2026-0001" (keyup.enter)="track()" />
                </label>
                <label>
                  &nbsp;
                  <button class="btn" type="button" (click)="track()" [disabled]="busy() || !trackingRef.trim()">Track parcel</button>
                </label>
              </div>

              @if (shipment(); as parcel) {
                <div class="parcel">
                  <div class="top">
                    <div>
                      <strong>{{ parcel.reference }}</strong>
                      <span class="muted sub">{{ parcel.carrier || pretty(parcel.type) }} · {{ parcel.store?.name }}</span>
                    </div>
                    <span class="chip" [class]="'chip ' + parcel.status">{{ parcel.status_label }}</span>
                  </div>
                  <dl class="cx-kv">
                    @if (parcel.tracking_number) { <div><dt>Carrier tracking</dt><dd>{{ parcel.tracking_number }}</dd></div> }
                    <div><dt>Destination</dt><dd>{{ parcel.destination || '—' }}</dd></div>
                    <div><dt>Expected</dt><dd>{{ window(parcel) }}</dd></div>
                    @if (parcel.delivered_at) { <div><dt>Delivered</dt><dd>{{ parcel.delivered_at | date: 'MMM d, y HH:mm' }}</dd></div> }
                  </dl>
                  <ol class="timeline">
                    @for (event of parcel.events || []; track event.id) {
                      <li>
                        <span class="dot"></span>
                        <div>
                          <strong>{{ pretty(event.status) }}</strong>
                          <p>{{ event.description }}@if (event.location) { <span class="muted"> · {{ event.location }}</span> }</p>
                          <small class="muted">{{ event.happened_at ? (event.happened_at | date: 'MMM d, y HH:mm') : '' }}</small>
                        </div>
                      </li>
                    }
                  </ol>
                  @if (parcel.tracking_url) {
                    <a class="btn ghost" [href]="parcel.tracking_url" target="_blank" rel="noopener">Open carrier tracking</a>
                  }
                </div>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [
    `
      .reply-form { margin-top: 14px; }
      .parcel { margin-top: 10px; padding: 16px; border: 1px solid var(--line); border-radius: 14px; background: var(--paper-2); }
      .parcel .top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
      .timeline { list-style: none; margin: 14px 0 0; padding: 0 0 0 4px; display: grid; gap: 14px; }
      .timeline li { display: flex; gap: 12px; position: relative; }
      .timeline li:not(:last-child)::before { content: ''; position: absolute; left: 4px; top: 16px; bottom: -16px; width: 1px; background: var(--line); }
      .dot { width: 9px; height: 9px; margin-top: 5px; flex: none; border-radius: 50%; background: var(--accent); }
      .timeline p { margin: 2px 0; font-size: 12.5px; }
      .timeline strong { font-size: 12.5px; }
    `,
  ],
})
export class SupportCasesComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  readonly disputeTypes = DISPUTE_TYPES;
  readonly refundReasons = REFUND_REASONS;

  tab = signal<Tab>('refunds');
  refunds = signal<Refund[]>([]);
  disputes = signal<Dispute[]>([]);
  selected = signal<Dispute | null>(null);
  shipment = signal<Shipment | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  message = signal('');

  reply = '';
  trackingRef = '';

  openCount = computed(() => this.disputes().filter((d) => !['resolved', 'rejected', 'closed'].includes(d.status)).length);

  constructor() {
    const initial = this.route.snapshot.queryParamMap.get('tab');
    if (initial === 'disputes' || initial === 'tracking') this.tab.set(initial);
    const ref = this.route.snapshot.queryParamMap.get('track');
    if (ref) {
      this.trackingRef = ref;
      this.tab.set('tracking');
      this.track();
    }
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.myRefunds({ per_page: '50' }).subscribe({
      next: (res) => {
        this.refunds.set(res.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load your refund requests.');
      },
    });
    this.api.myDisputes({ per_page: '50' }).subscribe({
      next: (res) => this.disputes.set(res.data || []),
      error: () => undefined,
    });
  }

  openDispute(dispute: Dispute) {
    this.api.dispute(dispute.id).subscribe({
      next: (res) => this.selected.set(res.data),
      error: () => this.error.set('We could not open that case.'),
    });
  }

  sendReply(dispute: Dispute) {
    const body = this.reply.trim();
    if (!body) return;
    this.busy.set(true);
    this.api.replyToDispute(dispute.id, body).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.reply = '';
        this.selected.set(res.data);
        this.message.set('Message sent.');
      },
      error: () => {
        this.busy.set(false);
        this.error.set('Your message was not delivered.');
      },
    });
  }

  escalate(dispute: Dispute) {
    this.busy.set(true);
    this.api.escalateDispute(dispute.id, 'Escalated by the buyer').subscribe({
      next: (res) => {
        this.busy.set(false);
        this.selected.set(res.data);
        this.message.set('The MarketHub team is now reviewing this case.');
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'This case could not be escalated yet.');
      },
    });
  }

  cancelRefund(refund: Refund) {
    this.api.cancelRefund(refund.id).subscribe({
      next: () => {
        this.message.set('Refund request withdrawn.');
        this.load();
      },
      error: () => this.error.set('That request could not be cancelled.'),
    });
  }

  track() {
    const reference = this.trackingRef.trim();
    if (!reference) return;
    this.busy.set(true);
    this.error.set('');
    this.shipment.set(null);
    this.api.trackShipment(reference).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.shipment.set(res.data);
      },
      error: () => {
        this.busy.set(false);
        this.error.set('We could not find a shipment with that reference.');
      },
    });
  }

  window(parcel: Shipment): string {
    if (!parcel.estimated_delivery_from && !parcel.estimated_delivery_to) return 'Being scheduled';
    const from = parcel.estimated_delivery_from ? new Date(parcel.estimated_delivery_from).toLocaleDateString() : '';
    const to = parcel.estimated_delivery_to ? new Date(parcel.estimated_delivery_to).toLocaleDateString() : '';
    return from && to && from !== to ? `${from} – ${to}` : from || to;
  }

  pretty(value: string | null | undefined): string {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
