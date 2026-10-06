import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import {
  AdminPayoutOverview,
  PayableTenant,
  PayoutAccount,
  PayoutAdjustment,
  PayoutBatch,
  SettlementRow,
} from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type Tab = 'queue' | 'batches' | 'settlements' | 'adjustments' | 'accounts';

@Component({
  selector: 'app-admin-payouts',
  imports: [FormsModule, DatePipe, MoneyPipe],
  template: `
    <main class="page cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">Money out</p>
          <h1>Seller payouts</h1>
          <p class="intro">
            Batch cleared settlements, release transfers and keep the ledger square. Settlements clear
            {{ summary()?.hold_days ?? 7 }} days after delivery and must reach
            {{ summary()?.minimum_payout || '0' | money }} before they are paid.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
          <button class="btn" type="button" (click)="runAll()" [disabled]="busy() || !payable().length">
            Run payout cycle
          </button>
        </div>
      </header>

      <section class="cx-stats">
        <div class="cx-stat warn"><span>Clearing</span><strong>{{ summary()?.pending || '0' | money }}</strong><small>Inside the hold window</small></div>
        <div class="cx-stat good"><span>Available</span><strong>{{ summary()?.available || '0' | money }}</strong><small>Ready to batch</small></div>
        <div class="cx-stat"><span>In flight</span><strong>{{ summary()?.processing || '0' | money }}</strong><small>{{ summary()?.batches?.processing ?? 0 }} batch(es)</small></div>
        <div class="cx-stat"><span>Commission earned</span><strong>{{ summary()?.commission_earned || '0' | money }}</strong><small>Platform revenue</small></div>
      </section>

      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }
      @if (summary()?.batches?.failed) {
        <div class="cx-note bad">{{ summary()?.batches?.failed }} payout batch(es) failed and need a retry.</div>
      }

      <div class="cx-tabs">
        <button type="button" [class.on]="tab() === 'queue'" (click)="tab.set('queue')">Payout queue <b>{{ payable().length }}</b></button>
        <button type="button" [class.on]="tab() === 'batches'" (click)="switchTo('batches')">Batches</button>
        <button type="button" [class.on]="tab() === 'settlements'" (click)="switchTo('settlements')">Settlements</button>
        <button type="button" [class.on]="tab() === 'adjustments'" (click)="switchTo('adjustments')">Adjustments</button>
        <button type="button" [class.on]="tab() === 'accounts'" (click)="switchTo('accounts')">Accounts</button>
      </div>

      @switch (tab()) {
        @case ('queue') {
          <section class="cx-panel">
            <header><div><h2>Sellers awaiting payout</h2><p>Cleared settlements grouped by seller.</p></div></header>
            @if (loading()) {
              <div class="cx-skeleton"><span></span><span></span><span></span></div>
            } @else if (!payable().length) {
              <div class="cx-empty"><strong>Nothing to pay out</strong><p>No seller has cleared settlements waiting for a batch.</p></div>
            } @else {
              <div class="cx-table-scroll">
                <table class="cx-table">
                  <thead><tr><th>Seller</th><th>Payout account</th><th class="num">Settlements</th><th class="num">Amount</th><th>Oldest cleared</th><th class="act"></th></tr></thead>
                  <tbody>
                    @for (row of payable(); track row.tenant_id) {
                      <tr>
                        <td><strong>{{ row.tenant_name }}</strong><span class="sub">Tenant #{{ row.tenant_id }}</span></td>
                        <td>
                          @if (row.account) {
                            {{ row.account.account_name }}
                            <span class="sub">{{ pretty(row.account.method || '') }} · {{ row.account.masked_account_number }}</span>
                          } @else { <span class="chip bad">No account</span> }
                        </td>
                        <td class="num">{{ row.settlements }}</td>
                        <td class="num">
                          <strong>{{ row.amount | money }}</strong>
                          @if (!row.meets_minimum) { <span class="sub">below minimum</span> }
                        </td>
                        <td>{{ row.oldest_available_at ? (row.oldest_available_at | date: 'MMM d, y') : '—' }}</td>
                        <td class="act">
                          <button class="mini go" type="button" [disabled]="busy() || !row.account" (click)="createBatch(row)">Create batch</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <footer>
                <span>{{ payable().length }} seller(s) in the queue</span>
                <button class="mini go" type="button" (click)="runAll()" [disabled]="busy()">Batch everyone over the minimum</button>
              </footer>
            }
          </section>
        }

        @case ('batches') {
          <div class="cx-toolbar">
            <select [(ngModel)]="batchStatus" name="bstatus" (ngModelChange)="loadBatches()">
              <option value="">Every status</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending approval</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div class="cx-split">
            <section class="cx-panel">
              <header><div><h2>Payout batches</h2><p>{{ batches().length }} on this page.</p></div></header>
              @if (!batches().length) {
                <div class="cx-empty"><strong>No batches</strong><p>Create one from the payout queue.</p></div>
              } @else {
                <div class="cx-table-scroll">
                  <table class="cx-table">
                    <thead><tr><th>Reference</th><th>Seller</th><th class="num">Net</th><th>Status</th><th>Created</th><th class="act"></th></tr></thead>
                    <tbody>
                      @for (batch of batches(); track batch.id) {
                        <tr [class.on]="selected()?.id === batch.id" (click)="openBatch(batch)">
                          <td><strong>{{ batch.reference }}</strong><span class="sub">{{ batch.settlement_count }} settlement(s)</span></td>
                          <td>{{ batch.tenant || 'Tenant #' + batch.tenant_id }}</td>
                          <td class="num">{{ batch.net | money: batch.currency }}</td>
                          <td><span class="chip" [class]="'chip ' + batch.status">{{ pretty(batch.status) }}</span></td>
                          <td>{{ batch.created_at ? (batch.created_at | date: 'MMM d, y') : '—' }}</td>
                          <td class="act"><button class="mini" type="button">Open</button></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </section>

            <aside class="cx-panel">
              @if (selected(); as batch) {
                <header>
                  <div><h2>{{ batch.reference }}</h2><p>{{ batch.tenant }} · {{ batch.settlement_count }} settlement(s)</p></div>
                  <span class="chip" [class]="'chip ' + batch.status">{{ pretty(batch.status) }}</span>
                </header>
                <div class="cx-panel-body">
                  <dl class="cx-kv">
                    <div><dt>Gross</dt><dd>{{ batch.gross | money: batch.currency }}</dd></div>
                    <div><dt>Commission</dt><dd>−{{ batch.commission | money: batch.currency }}</dd></div>
                    <div><dt>Refunds</dt><dd>−{{ batch.refunds | money: batch.currency }}</dd></div>
                    <div><dt>Adjustments</dt><dd>{{ batch.adjustments | money: batch.currency }}</dd></div>
                    <div><dt>Net payout</dt><dd><strong>{{ batch.net | money: batch.currency }}</strong></dd></div>
                    @if (batch.account) { <div><dt>Destination</dt><dd>{{ batch.account.account_name }} · {{ batch.account.masked_account_number }}</dd></div> }
                    @if (batch.external_ref) { <div><dt>Transfer ref</dt><dd>{{ batch.external_ref }}</dd></div> }
                    @if (batch.failure_reason) { <div><dt>Failure</dt><dd>{{ batch.failure_reason }}</dd></div> }
                  </dl>

                  <div class="cx-form">
                    <label>Transfer reference<input [(ngModel)]="externalRef" name="extref" placeholder="Bank transaction id" /></label>
                    <div class="actions">
                      @if (batch.status === 'draft' || batch.status === 'pending_approval') {
                        <button class="btn" type="button" (click)="release(batch)" [disabled]="busy()">Release funds</button>
                        <button class="btn ghost" type="button" (click)="recalculate(batch)" [disabled]="busy()">Recalculate</button>
                        <button class="btn ghost" type="button" (click)="cancel(batch)" [disabled]="busy()">Cancel</button>
                      }
                      @if (batch.status === 'processing') {
                        <button class="btn" type="button" (click)="markPaid(batch)" [disabled]="busy()">Mark paid</button>
                        <button class="btn ghost" type="button" (click)="markFailed(batch)" [disabled]="busy()">Mark failed</button>
                      }
                      @if (batch.status === 'failed') {
                        <button class="btn" type="button" (click)="release(batch)" [disabled]="busy()">Retry release</button>
                      }
                    </div>
                  </div>

                  @if (batch.items?.length) {
                    <h3 class="sub-head">Settlements in this batch</h3>
                    <div class="cx-table-scroll">
                      <table class="cx-table">
                        <thead><tr><th>Order</th><th class="num">Gross</th><th class="num">Commission</th><th class="num">Net</th></tr></thead>
                        <tbody>
                          @for (item of batch.items || []; track item.id) {
                            <tr>
                              <td>#{{ item.order_id || item.seller_order_id }}</td>
                              <td class="num">{{ item.gross | money: batch.currency }}</td>
                              <td class="num">{{ item.commission | money: batch.currency }}</td>
                              <td class="num"><strong>{{ item.amount | money: batch.currency }}</strong></td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>
              } @else {
                <div class="cx-empty"><strong>Pick a batch</strong><p>Open a batch to release, retry or inspect it.</p></div>
              }
            </aside>
          </div>
        }

        @case ('settlements') {
          <div class="cx-toolbar">
            <input type="search" [(ngModel)]="settlementQuery" name="sq" placeholder="Search seller or order" (keyup.enter)="loadSettlements()" />
            <select [(ngModel)]="settlementStatus" name="sstatus" (ngModelChange)="loadSettlements()">
              <option value="">Every status</option>
              <option value="pending">Clearing</option>
              <option value="available">Available</option>
              <option value="processing">In a batch</option>
              <option value="paid">Paid</option>
              <option value="on_hold">On hold</option>
              <option value="reversed">Reversed</option>
            </select>
          </div>

          <section class="cx-panel">
            <header><div><h2>Settlement ledger</h2><p>One row per seller order across the whole marketplace.</p></div></header>
            @if (!settlements().length) {
              <div class="cx-empty"><strong>No settlements</strong><p>Nothing matches this filter.</p></div>
            } @else {
              <div class="cx-table-scroll">
                <table class="cx-table">
                  <thead><tr><th>Seller</th><th>Order</th><th class="num">Gross</th><th class="num">Commission</th><th class="num">Net</th><th>Status</th><th class="act"></th></tr></thead>
                  <tbody>
                    @for (row of settlements(); track row.id) {
                      <tr>
                        <td>{{ row.tenant || '—' }}<span class="sub">{{ row.store }}</span></td>
                        <td>#{{ row.seller_order_id }}</td>
                        <td class="num">{{ row.gross | money: row.currency }}</td>
                        <td class="num">{{ row.commission | money: row.currency }}@if (row.commission_rate) { <span class="sub">{{ row.commission_rate }}%</span> }</td>
                        <td class="num"><strong>{{ row.net | money: row.currency }}</strong></td>
                        <td>
                          <span class="chip" [class]="'chip ' + row.status">{{ pretty(row.status) }}</span>
                          @if (row.hold_reason) { <span class="sub">{{ row.hold_reason }}</span> }
                        </td>
                        <td class="act">
                          @if (row.status === 'on_hold') {
                            <button class="mini go" type="button" (click)="releaseSettlement(row)">Release</button>
                          } @else if (row.status === 'available' || row.status === 'pending') {
                            <button class="mini danger" type="button" (click)="holdSettlement(row)">Hold</button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <footer>
                <span>Page {{ page() }} of {{ lastPage() }}</span>
                <span class="cx-pager">
                  <button type="button" [disabled]="page() <= 1" (click)="goSettlements(page() - 1)">Previous</button>
                  <button type="button" [disabled]="page() >= lastPage()" (click)="goSettlements(page() + 1)">Next</button>
                </span>
              </footer>
            }
          </section>
        }

        @case ('adjustments') {
          <div class="cx-split">
            <section class="cx-panel">
              <header><div><h2>Manual adjustments</h2><p>Credits and debits applied to the next payout.</p></div></header>
              @if (!adjustments().length) {
                <div class="cx-empty"><strong>No adjustments</strong><p>Add one to correct a payout without touching order data.</p></div>
              } @else {
                <div class="cx-table-scroll">
                  <table class="cx-table">
                    <thead><tr><th>Seller</th><th>Kind</th><th>Reason</th><th class="num">Amount</th><th>Status</th><th>Added</th></tr></thead>
                    <tbody>
                      @for (row of adjustments(); track row.id) {
                        <tr>
                          <td>{{ row.tenant || 'Tenant #' + row.tenant_id }}</td>
                          <td><span class="chip plain" [class.ok]="row.kind === 'credit'" [class.bad]="row.kind === 'debit'">{{ pretty(row.kind) }}</span></td>
                          <td>{{ row.reason }}</td>
                          <td class="num">{{ row.signed_amount || row.amount | money }}</td>
                          <td><span class="chip" [class]="'chip ' + row.status">{{ pretty(row.status) }}</span></td>
                          <td>{{ row.created_at ? (row.created_at | date: 'MMM d, y') : '—' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </section>

            <aside class="cx-panel">
              <header><div><h2>New adjustment</h2><p>Applied to the seller's next batch.</p></div></header>
              <div class="cx-panel-body cx-form">
                <label>
                  Seller
                  <select [(ngModel)]="adj.tenant_id" name="atenant">
                    <option value="">Select a seller…</option>
                    @for (row of payable(); track row.tenant_id) { <option [value]="row.tenant_id">{{ row.tenant_name }}</option> }
                  </select>
                </label>
                <div class="row">
                  <label>
                    Kind
                    <select [(ngModel)]="adj.kind" name="akind">
                      <option value="credit">Credit (pay more)</option>
                      <option value="debit">Debit (hold back)</option>
                    </select>
                  </label>
                  <label>Amount<input type="number" min="0" step="0.01" [(ngModel)]="adj.amount" name="aamount" /></label>
                </div>
                <label>Reason<textarea [(ngModel)]="adj.reason" name="areason" placeholder="Goodwill credit for the delayed March payout"></textarea></label>
                <div class="actions">
                  <button class="btn" type="button" (click)="addAdjustment()" [disabled]="busy() || !adj.tenant_id || !adj.reason.trim()">
                    Add adjustment
                  </button>
                </div>
              </div>
            </aside>
          </div>
        }

        @case ('accounts') {
          <section class="cx-panel">
            <header><div><h2>Payout accounts</h2><p>Verify seller bank details before the first release.</p></div></header>
            @if (!accounts().length) {
              <div class="cx-empty"><strong>No accounts</strong><p>Sellers have not added payout details yet.</p></div>
            } @else {
              <div class="cx-table-scroll">
                <table class="cx-table">
                  <thead><tr><th>Seller</th><th>Account</th><th>Method</th><th>Currency</th><th>Status</th><th class="act"></th></tr></thead>
                  <tbody>
                    @for (account of accounts(); track account.id) {
                      <tr>
                        <td>{{ account.tenant || 'Tenant #' + account.tenant_id }}</td>
                        <td><strong>{{ account.account_name }}</strong><span class="sub">{{ account.masked_account_number }}{{ account.bank_name ? ' · ' + account.bank_name : '' }}</span></td>
                        <td>{{ pretty(account.method) }}</td>
                        <td>{{ account.currency }}</td>
                        <td><span class="chip" [class]="'chip ' + account.status">{{ pretty(account.status) }}</span></td>
                        <td class="act">
                          @if (account.status !== 'verified') { <button class="mini go" type="button" (click)="verify(account, 'verified')">Verify</button> }
                          @if (account.status !== 'rejected') { <button class="mini danger" type="button" (click)="verify(account, 'rejected')">Reject</button> }
                        </td>
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
      .sub-head { margin: 18px 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-soft); }
    `,
  ],
})
export class AdminPayoutsComponent {
  private api = inject(ApiService);

  tab = signal<Tab>('queue');
  overview = signal<AdminPayoutOverview | null>(null);
  batches = signal<PayoutBatch[]>([]);
  selected = signal<PayoutBatch | null>(null);
  settlements = signal<SettlementRow[]>([]);
  adjustments = signal<PayoutAdjustment[]>([]);
  accounts = signal<PayoutAccount[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  message = signal('');
  page = signal(1);
  lastPage = signal(1);

  batchStatus = '';
  settlementStatus = 'available';
  settlementQuery = '';
  externalRef = '';
  adj = { tenant_id: '', kind: 'credit', amount: '0', reason: '' };

  summary = computed(() => this.overview()?.summary ?? null);
  payable = computed<PayableTenant[]>(() => this.overview()?.payable ?? []);

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.adminPayouts().subscribe({
      next: (res) => {
        this.overview.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load the payout overview.');
      },
    });
  }

  switchTo(tab: Tab) {
    this.tab.set(tab);
    this.page.set(1);
    if (tab === 'batches') this.loadBatches();
    if (tab === 'settlements') this.loadSettlements();
    if (tab === 'adjustments') this.loadAdjustments();
    if (tab === 'accounts') this.loadAccounts();
  }

  loadBatches() {
    const params: Record<string, string> = { per_page: '25' };
    if (this.batchStatus) params['status'] = this.batchStatus;
    this.api.adminPayoutBatches(params).subscribe({
      next: (res) => this.batches.set(res.data || []),
      error: () => this.error.set('We could not load payout batches.'),
    });
  }

  loadSettlements() {
    const params: Record<string, string> = { page: String(this.page()), per_page: '25' };
    if (this.settlementStatus) params['status'] = this.settlementStatus;
    if (this.settlementQuery.trim()) params['q'] = this.settlementQuery.trim();
    this.api.adminSettlements(params).subscribe({
      next: (res) => {
        this.settlements.set(res.data || []);
        this.lastPage.set(res.meta?.last_page || 1);
      },
      error: () => this.error.set('We could not load settlements.'),
    });
  }

  goSettlements(page: number) {
    this.page.set(Math.max(1, Math.min(page, this.lastPage())));
    this.loadSettlements();
  }

  loadAdjustments() {
    this.api.payoutAdjustments({ per_page: '40' }).subscribe({
      next: (res) => this.adjustments.set(res.data || []),
      error: () => this.error.set('We could not load adjustments.'),
    });
  }

  loadAccounts() {
    this.api.adminPayoutAccounts({ per_page: '50' }).subscribe({
      next: (res) => this.accounts.set(res.data || []),
      error: () => this.error.set('We could not load payout accounts.'),
    });
  }

  createBatch(row: PayableTenant) {
    this.busy.set(true);
    this.api.createPayoutBatch({ tenant_id: row.tenant_id }).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.message.set(`Batch ${res.data.reference} created for ${row.tenant_name}.`);
        this.load();
        this.loadBatches();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'That batch could not be created.');
      },
    });
  }

  runAll() {
    this.busy.set(true);
    this.api.runAllPayouts(true).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.message.set(`${res.data.created} payout batch(es) created.`);
        this.load();
        this.loadBatches();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'The payout cycle could not be run.');
      },
    });
  }

  openBatch(batch: PayoutBatch) {
    this.api.adminPayoutBatch(batch.id).subscribe({
      next: (res) => {
        this.selected.set(res.data);
        this.externalRef = res.data.external_ref || '';
      },
      error: () => this.error.set('We could not open that batch.'),
    });
  }

  release(batch: PayoutBatch) {
    this.busy.set(true);
    this.api.releasePayoutBatch(batch.id, this.externalRef || undefined).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.selected.set(res.data);
        this.message.set(`${res.data.reference} released.`);
        this.refreshBatchViews();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'That batch could not be released.');
      },
    });
  }

  markPaid(batch: PayoutBatch) {
    this.busy.set(true);
    this.api.markPayoutBatchPaid(batch.id, this.externalRef || undefined).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.selected.set(res.data);
        this.message.set(`${res.data.reference} marked as paid.`);
        this.refreshBatchViews();
      },
      error: () => {
        this.busy.set(false);
        this.error.set('That batch could not be marked paid.');
      },
    });
  }

  markFailed(batch: PayoutBatch) {
    this.busy.set(true);
    this.api.markPayoutBatchFailed(batch.id, 'Bank transfer rejected').subscribe({
      next: (res) => {
        this.busy.set(false);
        this.selected.set(res.data);
        this.message.set(`${res.data.reference} marked as failed — settlements returned to available.`);
        this.refreshBatchViews();
      },
      error: () => {
        this.busy.set(false);
        this.error.set('That batch could not be marked failed.');
      },
    });
  }

  recalculate(batch: PayoutBatch) {
    this.api.recalculatePayoutBatch(batch.id).subscribe({
      next: (res) => {
        this.selected.set(res.data);
        this.message.set('Batch totals recalculated.');
        this.refreshBatchViews();
      },
      error: () => this.error.set('We could not recalculate that batch.'),
    });
  }

  cancel(batch: PayoutBatch) {
    this.api.cancelPayoutBatch(batch.id).subscribe({
      next: (res) => {
        this.selected.set(res.data);
        this.message.set('Batch cancelled — settlements are available again.');
        this.refreshBatchViews();
      },
      error: () => this.error.set('That batch could not be cancelled.'),
    });
  }

  holdSettlement(row: SettlementRow) {
    this.api.holdSettlement(row.id, 'Held by the marketplace team for review').subscribe({
      next: () => {
        this.message.set(`Settlement #${row.id} held.`);
        this.loadSettlements();
        this.load();
      },
      error: () => this.error.set('That settlement could not be held.'),
    });
  }

  releaseSettlement(row: SettlementRow) {
    this.api.releaseSettlement(row.id).subscribe({
      next: () => {
        this.message.set(`Settlement #${row.id} released.`);
        this.loadSettlements();
        this.load();
      },
      error: () => this.error.set('That settlement could not be released.'),
    });
  }

  addAdjustment() {
    this.busy.set(true);
    this.api
      .createPayoutAdjustment({
        tenant_id: Number(this.adj.tenant_id),
        kind: this.adj.kind,
        amount: Number(this.adj.amount || 0),
        reason: this.adj.reason.trim(),
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.adj = { tenant_id: '', kind: 'credit', amount: '0', reason: '' };
          this.message.set('Adjustment queued for the next payout.');
          this.loadAdjustments();
          this.load();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.message || 'That adjustment could not be added.');
        },
      });
  }

  verify(account: PayoutAccount, status: string) {
    this.api.verifyPayoutAccount(account.id, status).subscribe({
      next: () => {
        this.message.set(`Account ${status}.`);
        this.loadAccounts();
      },
      error: () => this.error.set('We could not update that account.'),
    });
  }

  private refreshBatchViews() {
    this.load();
    this.loadBatches();
  }

  pretty(value: string | null | undefined): string {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
