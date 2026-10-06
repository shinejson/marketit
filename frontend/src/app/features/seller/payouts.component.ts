import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { PayoutAccount, PayoutBatch, PayoutOverview, SettlementRow } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type Tab = 'overview' | 'settlements' | 'batches' | 'accounts';

interface AccountForm {
  label: string;
  method: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  branch: string;
  swift_code: string;
  mobile_network: string;
  currency: string;
  country: string;
  is_default: boolean;
}

const BLANK_ACCOUNT: AccountForm = {
  label: '',
  method: 'bank',
  account_name: '',
  account_number: '',
  bank_name: '',
  branch: '',
  swift_code: '',
  mobile_network: '',
  currency: 'USD',
  country: '',
  is_default: true,
};

@Component({
  selector: 'app-seller-payouts',
  imports: [FormsModule, DatePipe, MoneyPipe],
  template: `
    <div class="wrap cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">Money out</p>
          <h1>Payouts</h1>
          <p class="intro">
            Earnings clear {{ balance()?.hold_days ?? 7 }} days after delivery, then roll into a payout batch. Track
            every settlement from pending to paid.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
          <button class="btn" type="button" (click)="requestPayout()" [disabled]="busy() || !canRequest()">
            Request payout
          </button>
        </div>
      </header>

      <section class="cx-stats">
        <div class="cx-stat warn"><span>Clearing</span><strong>{{ balance()?.pending || '0' | money: currency() }}</strong><small>{{ balance()?.pending_count ?? 0 }} settlement(s) on hold</small></div>
        <div class="cx-stat good"><span>Available</span><strong>{{ balance()?.available || '0' | money: currency() }}</strong><small>{{ balance()?.available_count ?? 0 }} ready to pay out</small></div>
        <div class="cx-stat"><span>In a batch</span><strong>{{ balance()?.processing || '0' | money: currency() }}</strong><small>Being transferred</small></div>
        <div class="cx-stat"><span>Paid to date</span><strong>{{ balance()?.paid || '0' | money: currency() }}</strong><small>{{ balance()?.paid_count ?? 0 }} settlement(s)</small></div>
      </section>

      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }
      @if (!defaultAccount() && !loading()) {
        <div class="cx-note warn">
          Add a payout account so we know where to send your money.
          <button type="button" (click)="tab.set('accounts')">Add account</button>
        </div>
      }

      <div class="cx-tabs">
        <button type="button" [class.on]="tab() === 'overview'" (click)="tab.set('overview')">Overview</button>
        <button type="button" [class.on]="tab() === 'settlements'" (click)="switchTo('settlements')">Settlements</button>
        <button type="button" [class.on]="tab() === 'batches'" (click)="switchTo('batches')">Payout batches</button>
        <button type="button" [class.on]="tab() === 'accounts'" (click)="switchTo('accounts')">Accounts <b>{{ accounts().length }}</b></button>
      </div>

      @switch (tab()) {
        @case ('overview') {
          <div class="cx-split">
            <section class="cx-panel">
              <header><div><h2>Recent payout batches</h2><p>Your last transfers and their status.</p></div></header>
              @if (loading()) {
                <div class="cx-skeleton"><span></span><span></span><span></span></div>
              } @else if (!recentBatches().length) {
                <div class="cx-empty"><strong>No payouts yet</strong><p>Once settlements clear they will be batched and paid out here.</p></div>
              } @else {
                <div class="cx-table-scroll">
                  <table class="cx-table">
                    <thead><tr><th>Reference</th><th>Period</th><th class="num">Net</th><th>Status</th><th>Paid</th></tr></thead>
                    <tbody>
                      @for (batch of recentBatches(); track batch.id) {
                        <tr>
                          <td><strong>{{ batch.reference }}</strong><span class="sub">{{ batch.settlement_count }} settlement(s)</span></td>
                          <td>{{ batch.period_start ? (batch.period_start | date: 'MMM d') : '—' }} – {{ batch.period_end ? (batch.period_end | date: 'MMM d, y') : '—' }}</td>
                          <td class="num"><strong>{{ batch.net | money: batch.currency }}</strong><span class="sub">gross {{ batch.gross | money: batch.currency }}</span></td>
                          <td><span class="chip" [class]="'chip ' + batch.status">{{ pretty(batch.status) }}</span></td>
                          <td>{{ batch.paid_at ? (batch.paid_at | date: 'MMM d, y') : '—' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </section>

            <aside class="cx-panel">
              <header><div><h2>Payout schedule</h2><p>How your money moves.</p></div></header>
              <div class="cx-panel-body">
                <dl class="cx-kv">
                  <div><dt>Hold period</dt><dd>{{ balance()?.hold_days ?? 7 }} days after delivery</dd></div>
                  <div><dt>Minimum payout</dt><dd>{{ balance()?.minimum_payout || '0' | money: currency() }}</dd></div>
                  <div><dt>Next release</dt><dd>{{ overview()?.next_release ? (overview()?.next_release | date: 'MMM d, y') : 'When settlements clear' }}</dd></div>
                  <div><dt>On hold</dt><dd>{{ balance()?.on_hold || '0' | money: currency() }}</dd></div>
                  <div><dt>Adjustments</dt><dd>{{ balance()?.adjustments || '0' | money: currency() }}</dd></div>
                  <div><dt>Payable now</dt><dd><strong>{{ balance()?.payable || '0' | money: currency() }}</strong></dd></div>
                </dl>
                @if (defaultAccount(); as account) {
                  <div class="account-chip">
                    <strong>{{ account.account_name }}</strong>
                    <span class="muted">{{ pretty(account.method) }} · {{ account.masked_account_number }}</span>
                    <span class="chip" [class]="'chip ' + account.status">{{ pretty(account.status) }}</span>
                  </div>
                }
                <p class="muted note">
                  Refunds and chargebacks are netted off your next payout. Platform commission is deducted at order
                  level, so the figures above are what reaches your bank.
                </p>
              </div>
            </aside>
          </div>
        }

        @case ('settlements') {
          <div class="cx-toolbar">
            <select [(ngModel)]="settlementStatus" name="sstatus" (ngModelChange)="loadSettlements()">
              <option value="">Every status</option>
              <option value="pending">Clearing</option>
              <option value="available">Available</option>
              <option value="processing">In a batch</option>
              <option value="paid">Paid</option>
              <option value="on_hold">On hold</option>
            </select>
          </div>
          <section class="cx-panel">
            <header><div><h2>Settlements</h2><p>One row per seller order.</p></div></header>
            @if (!settlements().length) {
              <div class="cx-empty"><strong>No settlements yet</strong><p>Each paid order creates a settlement line here.</p></div>
            } @else {
              <div class="cx-table-scroll">
                <table class="cx-table">
                  <thead><tr><th>Order</th><th class="num">Gross</th><th class="num">Commission</th><th class="num">Net</th><th>Status</th><th>Available</th></tr></thead>
                  <tbody>
                    @for (row of settlements(); track row.id) {
                      <tr>
                        <td><strong>#{{ row.seller_order_id }}</strong><span class="sub">{{ row.store }}</span></td>
                        <td class="num">{{ row.gross | money: row.currency }}</td>
                        <td class="num">
                          {{ row.commission | money: row.currency }}
                          @if (row.commission_rate) { <span class="sub">{{ row.commission_rate }}%</span> }
                        </td>
                        <td class="num"><strong>{{ row.net | money: row.currency }}</strong></td>
                        <td>
                          <span class="chip" [class]="'chip ' + row.status">{{ pretty(row.status) }}</span>
                          @if (row.hold_reason) { <span class="sub">{{ row.hold_reason }}</span> }
                        </td>
                        <td>{{ row.available_at ? (row.available_at | date: 'MMM d, y') : '—' }}</td>
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

        @case ('batches') {
          <div class="cx-split">
            <section class="cx-panel">
              <header><div><h2>Payout batches</h2><p>Every transfer we have prepared for you.</p></div></header>
              @if (!batches().length) {
                <div class="cx-empty"><strong>No batches yet</strong><p>Request a payout once you have cleared earnings.</p></div>
              } @else {
                <div class="cx-table-scroll">
                  <table class="cx-table">
                    <thead><tr><th>Reference</th><th class="num">Net</th><th>Status</th><th>Created</th><th class="act"></th></tr></thead>
                    <tbody>
                      @for (batch of batches(); track batch.id) {
                        <tr [class.on]="selectedBatch()?.id === batch.id" (click)="openBatch(batch)">
                          <td><strong>{{ batch.reference }}</strong><span class="sub">{{ batch.settlement_count }} settlement(s)</span></td>
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
              @if (selectedBatch(); as batch) {
                <header>
                  <div><h2>{{ batch.reference }}</h2><p>{{ batch.settlement_count }} settlement(s)</p></div>
                  <span class="chip" [class]="'chip ' + batch.status">{{ pretty(batch.status) }}</span>
                </header>
                <div class="cx-panel-body">
                  <dl class="cx-kv">
                    <div><dt>Gross sales</dt><dd>{{ batch.gross | money: batch.currency }}</dd></div>
                    <div><dt>Commission</dt><dd>−{{ batch.commission | money: batch.currency }}</dd></div>
                    <div><dt>Refunds</dt><dd>−{{ batch.refunds | money: batch.currency }}</dd></div>
                    <div><dt>Adjustments</dt><dd>{{ batch.adjustments | money: batch.currency }}</dd></div>
                    <div><dt>Net payout</dt><dd><strong>{{ batch.net | money: batch.currency }}</strong></dd></div>
                    @if (batch.external_ref) { <div><dt>Transfer ref</dt><dd>{{ batch.external_ref }}</dd></div> }
                    @if (batch.failure_reason) { <div><dt>Failure</dt><dd>{{ batch.failure_reason }}</dd></div> }
                  </dl>
                  @if (batch.items?.length) {
                    <h3 class="sub-head">Included settlements</h3>
                    <div class="cx-table-scroll">
                      <table class="cx-table">
                        <thead><tr><th>Order</th><th class="num">Gross</th><th class="num">Net</th></tr></thead>
                        <tbody>
                          @for (item of batch.items || []; track item.id) {
                            <tr><td>#{{ item.order_id || item.seller_order_id }}</td><td class="num">{{ item.gross | money: batch.currency }}</td><td class="num">{{ item.amount | money: batch.currency }}</td></tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>
              } @else {
                <div class="cx-empty"><strong>Pick a batch</strong><p>Select a payout to see exactly which orders it covers.</p></div>
              }
            </aside>
          </div>
        }

        @case ('accounts') {
          <div class="cx-split">
            <section class="cx-panel">
              <header>
                <div><h2>Payout accounts</h2><p>Where your money lands. Accounts are verified before first payout.</p></div>
                <button class="mini go" type="button" (click)="newAccount()">Add account</button>
              </header>
              @if (!accounts().length) {
                <div class="cx-empty">
                  <strong>No payout account</strong>
                  <p>Add a bank or mobile money account so payouts can be released.</p>
                  <button class="btn" type="button" (click)="newAccount()">Add account</button>
                </div>
              } @else {
                <div class="cx-panel-body cx-list">
                  @for (account of accounts(); track account.id) {
                    <article class="cx-item">
                      <div class="top">
                        <strong>{{ account.label || account.account_name }}</strong>
                        <span class="chip plain">{{ pretty(account.method) }}</span>
                        <span class="chip" [class]="'chip ' + account.status">{{ pretty(account.status) }}</span>
                        @if (account.is_default) { <span class="chip ok plain">Default</span> }
                      </div>
                      <p>{{ account.account_name }} · {{ account.masked_account_number }} · {{ account.currency }}</p>
                      @if (account.bank_name) { <p class="muted">{{ account.bank_name }}{{ account.branch ? ' · ' + account.branch : '' }}</p> }
                      <div class="top">
                        <button class="mini" type="button" (click)="editAccount(account)">Edit</button>
                        @if (!account.is_default) {
                          <button class="mini" type="button" (click)="makeDefault(account)">Make default</button>
                          <button class="mini danger" type="button" (click)="deleteAccount(account)">Remove</button>
                        }
                      </div>
                    </article>
                  }
                </div>
              }
            </section>

            <aside class="cx-panel">
              @if (accountForm()) {
                <header><div><h2>{{ editingAccount() ? 'Edit account' : 'New payout account' }}</h2><p>Make sure the name matches your registered business.</p></div></header>
                <div class="cx-panel-body cx-form">
                  <div class="row">
                    <label>Label<input [(ngModel)]="af.label" name="alabel" placeholder="Main business account" /></label>
                    <label>
                      Method
                      <select [(ngModel)]="af.method" name="amethod">
                        @for (option of accountMethods(); track option) { <option [value]="option">{{ pretty(option) }}</option> }
                      </select>
                    </label>
                  </div>
                  <label>Account holder<input [(ngModel)]="af.account_name" name="aname" /></label>
                  <label>Account number<input [(ngModel)]="af.account_number" name="anumber" /></label>
                  @if (af.method === 'bank') {
                    <div class="row">
                      <label>Bank<input [(ngModel)]="af.bank_name" name="abank" /></label>
                      <label>Branch<input [(ngModel)]="af.branch" name="abranch" /></label>
                    </div>
                    <label>SWIFT / BIC<input [(ngModel)]="af.swift_code" name="aswift" /></label>
                  }
                  @if (af.method === 'mobile_money') {
                    <label>Mobile network<input [(ngModel)]="af.mobile_network" name="anetwork" placeholder="MTN, Airtel…" /></label>
                  }
                  <div class="row">
                    <label>Currency<input [(ngModel)]="af.currency" name="acurrency" maxlength="3" /></label>
                    <label>Country<input [(ngModel)]="af.country" name="acountry" maxlength="2" placeholder="US" /></label>
                  </div>
                  <label class="check"><input type="checkbox" [(ngModel)]="af.is_default" name="adefault" /> Use as my default payout account</label>
                  <div class="actions">
                    <button class="btn" type="button" (click)="saveAccount()" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Save account' }}</button>
                    <button class="btn ghost" type="button" (click)="accountForm.set(false)">Cancel</button>
                  </div>
                </div>
              } @else {
                <header><div><h2>Verification</h2><p>What to expect.</p></div></header>
                <div class="cx-panel-body">
                  <ol class="howto">
                    <li>Add the account that matches your registered seller name.</li>
                    <li>The marketplace team verifies it before the first release.</li>
                    <li>Verified accounts can receive batches immediately after the hold period.</li>
                  </ol>
                  <button class="btn" type="button" (click)="newAccount()">Add an account</button>
                </div>
              }
            </aside>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .account-chip { display: grid; gap: 4px; margin-top: 14px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--paper-2); font-size: 12.5px; }
      .note { margin: 14px 0 0; font-size: 11.5px; line-height: 1.55; }
      .howto { margin: 0 0 16px; padding-left: 18px; display: grid; gap: 9px; font-size: 12.5px; line-height: 1.55; color: var(--ink-soft); }
      .sub-head { margin: 18px 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-soft); }
    `,
  ],
})
export class SellerPayoutsComponent {
  private api = inject(ApiService);

  tab = signal<Tab>('overview');
  overview = signal<PayoutOverview | null>(null);
  settlements = signal<SettlementRow[]>([]);
  batches = signal<PayoutBatch[]>([]);
  selectedBatch = signal<PayoutBatch | null>(null);
  accounts = signal<PayoutAccount[]>([]);
  accountMethods = signal<string[]>(['bank', 'mobile_money', 'paypal', 'wallet']);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  message = signal('');
  page = signal(1);
  lastPage = signal(1);

  accountForm = signal(false);
  editingAccount = signal<PayoutAccount | null>(null);
  af: AccountForm = { ...BLANK_ACCOUNT };

  settlementStatus = '';

  balance = computed(() => this.overview()?.balance ?? null);
  currency = computed(() => this.balance()?.currency || 'USD');
  recentBatches = computed(() => this.overview()?.recent_batches ?? []);
  defaultAccount = computed(() => this.overview()?.account ?? this.accounts().find((a) => a.is_default) ?? null);
  canRequest = computed(() => Number(this.balance()?.payable ?? 0) > 0 && !!this.defaultAccount());

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.tenantPayouts().subscribe({
      next: (res) => {
        this.overview.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load your payout summary.');
      },
    });
    this.api.payoutAccounts().subscribe({
      next: (res) => {
        this.accounts.set(res.data.accounts || []);
        if (res.data.methods?.length) this.accountMethods.set(res.data.methods);
      },
      error: () => undefined,
    });
  }

  switchTo(tab: Tab) {
    this.tab.set(tab);
    this.page.set(1);
    if (tab === 'settlements') this.loadSettlements();
    if (tab === 'batches') this.loadBatches();
  }

  loadSettlements() {
    const params: Record<string, string> = { page: String(this.page()), per_page: '20' };
    if (this.settlementStatus) params['status'] = this.settlementStatus;
    this.api.tenantSettlements(params).subscribe({
      next: (res) => {
        this.settlements.set(res.data || []);
        this.lastPage.set(res.meta?.last_page || 1);
      },
      error: () => this.error.set('We could not load your settlements.'),
    });
  }

  goSettlements(page: number) {
    this.page.set(Math.max(1, Math.min(page, this.lastPage())));
    this.loadSettlements();
  }

  loadBatches() {
    this.api.tenantPayoutBatches({ per_page: '25' }).subscribe({
      next: (res) => this.batches.set(res.data || []),
      error: () => this.error.set('We could not load your payout batches.'),
    });
  }

  openBatch(batch: PayoutBatch) {
    this.api.tenantPayoutBatch(batch.id).subscribe({
      next: (res) => this.selectedBatch.set(res.data),
      error: () => this.error.set('We could not open that batch.'),
    });
  }

  requestPayout() {
    this.busy.set(true);
    this.error.set('');
    this.api.requestPayout({ payout_account_id: this.defaultAccount()?.id ?? null }).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.message.set(`Payout ${res.data.reference} requested. We will transfer ${res.data.net} ${res.data.currency}.`);
        this.load();
        this.loadBatches();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'We could not create a payout right now.');
      },
    });
  }

  newAccount() {
    this.editingAccount.set(null);
    this.af = { ...BLANK_ACCOUNT, currency: this.currency(), is_default: !this.accounts().length };
    this.accountForm.set(true);
  }

  editAccount(account: PayoutAccount) {
    this.editingAccount.set(account);
    this.af = {
      label: account.label || '',
      method: account.method,
      account_name: account.account_name,
      account_number: '',
      bank_name: account.bank_name || '',
      branch: account.branch || '',
      swift_code: account.swift_code || '',
      mobile_network: account.mobile_network || '',
      currency: account.currency,
      country: account.country || '',
      is_default: account.is_default,
    };
    this.accountForm.set(true);
  }

  saveAccount() {
    const payload: Record<string, unknown> = {
      label: this.af.label || null,
      method: this.af.method,
      account_name: this.af.account_name.trim(),
      bank_name: this.af.bank_name || null,
      branch: this.af.branch || null,
      swift_code: this.af.swift_code || null,
      mobile_network: this.af.mobile_network || null,
      currency: (this.af.currency || 'USD').toUpperCase(),
      country: this.af.country ? this.af.country.toUpperCase() : null,
      is_default: this.af.is_default,
    };
    if (this.af.account_number.trim()) payload['account_number'] = this.af.account_number.trim();

    this.busy.set(true);
    const existing = this.editingAccount();
    const call = existing ? this.api.updatePayoutAccount(existing.id, payload) : this.api.createPayoutAccount(payload);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.accountForm.set(false);
        this.message.set(existing ? 'Payout account updated.' : 'Payout account added — we will verify it shortly.');
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'That account could not be saved.');
      },
    });
  }

  makeDefault(account: PayoutAccount) {
    this.api.updatePayoutAccount(account.id, { is_default: true }).subscribe({
      next: () => {
        this.message.set('Default payout account updated.');
        this.load();
      },
      error: () => this.error.set('We could not update your default account.'),
    });
  }

  deleteAccount(account: PayoutAccount) {
    this.api.deletePayoutAccount(account.id).subscribe({
      next: () => {
        this.message.set('Account removed.');
        this.load();
      },
      error: (err) => this.error.set(err?.error?.message || 'That account could not be removed.'),
    });
  }

  pretty(value: string | null | undefined): string {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
