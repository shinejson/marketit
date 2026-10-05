import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import {
  AccountingAccount,
  AccountingBankAccount,
  AccountingBankTransaction,
  AccountingContact,
  AccountingDashboard,
  AccountingExpense,
  AccountingInvoice,
  AccountingJournalEntry,
  AccountingPayment,
  AccountingReport,
  DEFAULT_RECEIPT,
  PurchaseOrder,
  TenantReceipt,
} from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type AccountingPage = 'overview' | 'invoices' | 'payments' | 'expenses' | 'procurement' | 'vendors' | 'accounts' | 'journals' | 'reports' | 'reconciliation';
type Drawer = 'invoice' | 'payment' | 'expense' | 'payExpense' | 'purchaseOrder' | 'contact' | 'account' | 'journal' | 'bankTransaction' | 'reconcile' | null;

@Component({
  selector: 'app-seller-accounting',
  imports: [FormsModule, MoneyPipe, DatePipe, UpperCasePipe, RouterLink],
  template: `
    <div class="accounting-shell">
      <header class="page-head">
        <div>
          <div class="breadcrumbs"><a routerLink="/tenant">Workspace</a><span>/</span><span>Accounting</span><span>/</span><b>{{ pageTitle() }}</b></div>
          <p class="eyebrow">Accounting & procurement</p>
          <h1>{{ pageTitle() }}</h1>
          <p class="intro">{{ pageDescription() }}</p>
        </div>
        <div class="head-actions">
          @if (page() === 'overview') {
            <button class="btn ghost small" type="button" (click)="open('expense')">+ Log expense</button>
            <button class="btn primary" type="button" (click)="open('invoice')">+ New invoice</button>
          }
          @if (page() === 'invoices') { <button class="btn primary" type="button" (click)="open('invoice')">+ New invoice</button> }
          @if (page() === 'expenses') { <button class="btn primary" type="button" (click)="open('expense')">+ Log expense</button> }
          @if (page() === 'procurement') { <button class="btn primary" type="button" (click)="open('purchaseOrder')">+ Purchase order</button> }
          @if (page() === 'vendors') { <button class="btn primary" type="button" (click)="open('contact')">+ Add contact</button> }
          @if (page() === 'accounts') { <button class="btn primary" type="button" (click)="open('account')">+ Add account</button> }
          @if (page() === 'journals') { <button class="btn primary" type="button" (click)="open('journal')">+ Manual journal</button> }
          @if (page() === 'reconciliation') { <button class="btn primary" type="button" (click)="open('bankTransaction')">+ Add bank transaction</button> }
        </div>
      </header>

      <nav class="mobile-tabs" aria-label="Accounting pages">
        @for (item of sections; track item.key) {
          <a [routerLink]="accountingLink(item.path)" [class.active]="page() === item.key">{{ item.label }}</a>
        }
      </nav>

      @if (toast()) { <div class="toast" role="status"><span>✓</span>{{ toast() }}</div> }
      @if (error()) { <div class="error-banner"><span>!</span><p>{{ error() }}</p><button type="button" (click)="error.set('')">Dismiss</button></div> }

      @if (loading()) {
        <div class="loading-grid">
          @for (n of [1,2,3,4]; track n) { <div class="skeleton loading-card"></div> }
        </div>
      } @else {
        @switch (page()) {
          @case ('overview') {
            @if (dashboard(); as d) {
              <section class="kpi-grid">
                <article class="metric-card cash">
                  <div class="metric-top"><span class="metric-icon">↗</span><span class="trend positive">Live</span></div>
                  <p>Net cash position</p><h2>{{ d.kpis.cash_balance | money:d.currency:'symbol':'1.0-0' }}</h2>
                  <small>{{ d.kpis.cash_in | money:d.currency:'symbol':'1.0-0' }} in · {{ d.kpis.cash_out | money:d.currency:'symbol':'1.0-0' }} out</small>
                </article>
                <article class="metric-card">
                  <div class="metric-top"><span class="metric-icon green">◎</span><span class="trend" [class.warning]="d.kpis.overdue_invoices">{{ d.kpis.overdue_invoices }} overdue</span></div>
                  <p>Accounts receivable</p><h2>{{ d.kpis.receivables | money:d.currency:'symbol':'1.0-0' }}</h2>
                  <small>Outstanding customer invoices</small>
                </article>
                <article class="metric-card">
                  <div class="metric-top"><span class="metric-icon amber">↓</span><span class="trend">{{ d.kpis.open_bills }} open</span></div>
                  <p>Accounts payable</p><h2>{{ d.kpis.payables | money:d.currency:'symbol':'1.0-0' }}</h2>
                  <small>Approved and outstanding bills</small>
                </article>
                <article class="metric-card">
                  <div class="metric-top"><span class="metric-icon plum">▣</span><span class="trend">Committed</span></div>
                  <p>Procurement pipeline</p><h2>{{ d.kpis.committed_spend | money:d.currency:'symbol':'1.0-0' }}</h2>
                  <small>Open purchase order value</small>
                </article>
              </section>

              <section class="overview-grid">
                <article class="panel cashflow-panel">
                  <div class="panel-head"><div><p class="overline">Cash movement</p><h3>Cash flow</h3></div><span class="legend"><i></i>Money in <i></i>Money out</span></div>
                  <div class="cash-chart" aria-label="Six month cash flow chart">
                    @for (point of d.cash_flow; track point.month) {
                      <div class="chart-column">
                        <div class="bars">
                          <span class="bar incoming" [style.height.%]="barHeight(point.incoming, d)"><b>{{ point.incoming | money:d.currency:'symbol':'1.0-0' }}</b></span>
                          <span class="bar outgoing" [style.height.%]="barHeight(point.outgoing, d)"><b>{{ point.outgoing | money:d.currency:'symbol':'1.0-0' }}</b></span>
                        </div>
                        <small>{{ point.label }}</small>
                      </div>
                    }
                  </div>
                </article>

                <article class="panel aging-panel">
                  <div class="panel-head"><div><p class="overline">Credit control</p><h3>Receivables aging</h3></div><a [routerLink]="accountingLink('invoices')">View invoices →</a></div>
                  @for (bucket of agingRows(d); track bucket.label) {
                    <div class="aging-row">
                      <div><span>{{ bucket.label }}</span><strong>{{ bucket.value | money:d.currency:'symbol':'1.0-0' }}</strong></div>
                      <div class="progress"><span [style.width.%]="bucket.percent"></span></div>
                    </div>
                  }
                </article>
              </section>

              <section class="lower-grid">
                <article class="panel activity-panel">
                  <div class="panel-head"><div><p class="overline">Audit trail</p><h3>Recent activity</h3></div><span class="live-dot">Live</span></div>
                  @if (!d.recent_activity.length) { <div class="empty-state">Activity will appear here as your team works.</div> }
                  @for (item of d.recent_activity; track item.type + item.title + item.at) {
                    <div class="activity-row">
                      <span class="activity-icon" [class]="'activity-icon ' + item.type">{{ item.type === 'invoice' ? '↗' : item.type === 'expense' ? '↓' : '▣' }}</span>
                      <div><strong>{{ item.title }}</strong><small>{{ item.type.replace('_', ' ') }} · {{ item.at | date:'MMM d, h:mm a' }}</small></div>
                      <div class="activity-value"><strong>{{ item.amount | money:d.currency:'symbol':'1.0-0' }}</strong><span [class]="'status ' + item.status">{{ pretty(item.status) }}</span></div>
                    </div>
                  }
                </article>

                <aside class="side-stack">
                  <article class="panel quick-panel">
                    <p class="overline">Quick create</p><h3>Keep the books moving</h3>
                    <button type="button" (click)="open('invoice')"><span>↗</span><div><b>Create invoice</b><small>Bill a customer</small></div><i>→</i></button>
                    <button type="button" (click)="open('expense')"><span>↓</span><div><b>Log an expense</b><small>Capture a bill or cost</small></div><i>→</i></button>
                    <button type="button" (click)="open('purchaseOrder')"><span>▣</span><div><b>Purchase order</b><small>Request and approve spend</small></div><i>→</i></button>
                  </article>
                  <article class="settlement-card">
                    <p>Marketplace settlements</p><h3>{{ d.kpis.pending_settlements | money:d.currency:'symbol':'1.0-0' }}</h3><small>Pending release from completed marketplace orders</small>
                    <a routerLink="/tenant/departments/finance">Review finance health <span>→</span></a>
                  </article>
                </aside>
              </section>
            }
          }

          @case ('invoices') {
            <section class="table-panel panel">
              <div class="table-toolbar">
                <div class="search-box"><span>⌕</span><input placeholder="Search number, customer or email" [(ngModel)]="search" (keyup.enter)="loadCurrent()" /></div>
                <select [(ngModel)]="statusFilter" (change)="loadCurrent()"><option value="">All statuses</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="partial">Part paid</option><option value="overdue">Overdue</option><option value="paid">Paid</option><option value="void">Void</option></select>
                <button class="filter-go" type="button" (click)="loadCurrent()">Filter</button>
              </div>
              <div class="table-wrap"><table>
                <thead><tr><th>Invoice</th><th>Customer</th><th>Issued</th><th>Due</th><th>Status</th><th class="right">Total</th><th class="right">Balance</th><th></th></tr></thead>
                <tbody>
                  @for (invoice of invoices(); track invoice.id) {
                    <tr>
                      <td><strong class="mono">{{ invoice.number }}</strong></td>
                      <td><strong>{{ invoice.customer_name }}</strong><small>{{ invoice.customer_email || 'No email' }}</small></td>
                      <td>{{ invoice.issue_date | date:'MMM d, y' }}</td><td>{{ invoice.due_date | date:'MMM d, y' }}</td>
                      <td><span [class]="'status ' + invoice.status">{{ invoice.status === 'partial' ? 'Part paid' : pretty(invoice.status) }}</span></td>
                      <td class="right"><strong>{{ invoice.total | money:invoice.currency }}</strong></td><td class="right">{{ invoice.balance_due | money:invoice.currency }}</td>
                      <td class="actions">
                        <button type="button" (click)="openViewInvoice(invoice)">View</button>
                        @if (invoice.status === 'draft') { <button type="button" (click)="sendInvoice(invoice)">Send</button> }
                        @if (invoice.status === 'draft') { <button type="button" class="danger-action" (click)="deleteInvoice(invoice)">Delete</button> }
                        @if (!['draft','paid','void'].includes(invoice.status)) { <button type="button" (click)="openPayment(invoice)">Record payment</button> }
                        @if (invoice.status === 'paid') { <span class="paid-check">✓</span> }
                      </td>
                    </tr>
                  } @empty { <tr><td colspan="8"><div class="empty-state"><b>No invoices found</b><span>Create an invoice or change your filters.</span></div></td></tr> }
                </tbody>
              </table></div>
              <div class="table-foot"><span>Showing {{ invoices().length }} of {{ total() }} invoices</span><span>Payments update balances automatically</span></div>
            </section>
          }

          @case ('payments') {
            <section class="summary-strip">
              <div><span class="summary-icon in">↙</span><p>Money received</p><strong>{{ paymentSum('incoming') | money:currency() }}</strong></div>
              <div><span class="summary-icon out">↗</span><p>Money paid</p><strong>{{ paymentSum('outgoing') | money:currency() }}</strong></div>
              <div><span class="summary-icon net">≈</span><p>Net movement</p><strong>{{ paymentSum('incoming') - paymentSum('outgoing') | money:currency() }}</strong></div>
            </section>
            <section class="table-panel panel">
              <div class="table-toolbar"><div class="search-box"><span>⌕</span><input placeholder="Search reference or method" [(ngModel)]="search" (keyup.enter)="loadCurrent()" /></div><select [(ngModel)]="statusFilter" (change)="loadCurrent()"><option value="">All movements</option><option value="incoming">Money in</option><option value="outgoing">Money out</option></select><button class="filter-go" (click)="loadCurrent()">Filter</button></div>
              <div class="table-wrap"><table><thead><tr><th>Date</th><th>Reference</th><th>Related record</th><th>Method</th><th>Direction</th><th class="right">Amount</th></tr></thead><tbody>
                @for (payment of payments(); track payment.id) {
                  <tr><td>{{ payment.paid_on | date:'MMM d, y' }}</td><td><strong class="mono">{{ payment.reference }}</strong></td><td><strong>{{ relatedPayment(payment) }}</strong><small>{{ payment.invoice ? payment.invoice.customer_name : payment.expense?.vendor_name || '' }}</small></td><td>{{ pretty(payment.method) }}</td><td><span [class]="'movement ' + payment.direction">{{ payment.direction === 'incoming' ? '↙ Money in' : '↗ Money out' }}</span></td><td class="right movement-amount" [class.outgoing]="payment.direction === 'outgoing'">{{ payment.direction === 'outgoing' ? '−' : '+' }}{{ payment.amount | money:payment.currency }}</td></tr>
                } @empty { <tr><td colspan="6"><div class="empty-state">No payment activity found.</div></td></tr> }
              </tbody></table></div>
            </section>
          }

          @case ('expenses') {
            <section class="table-panel panel">
              <div class="table-toolbar"><div class="search-box"><span>⌕</span><input placeholder="Search bill, vendor or category" [(ngModel)]="search" (keyup.enter)="loadCurrent()" /></div><select [(ngModel)]="statusFilter" (change)="loadCurrent()"><option value="">All statuses</option><option value="pending">Pending</option><option value="overdue">Overdue</option><option value="paid">Paid</option><option value="draft">Draft</option></select><button class="filter-go" (click)="loadCurrent()">Filter</button></div>
              <div class="table-wrap"><table><thead><tr><th>Bill</th><th>Vendor / description</th><th>Category</th><th>Date</th><th>Due</th><th>Status</th><th class="right">Total</th><th></th></tr></thead><tbody>
                @for (expense of expenses(); track expense.id) {
                  <tr><td><strong class="mono">{{ expense.number }}</strong></td><td><strong>{{ expense.vendor_name || 'Unassigned vendor' }}</strong><small>{{ expense.description }}</small></td><td><span class="category-chip">{{ expense.category }}</span></td><td>{{ expense.expense_date | date:'MMM d, y' }}</td><td>{{ expense.due_date ? (expense.due_date | date:'MMM d, y') : '—' }}</td><td><span [class]="'status ' + expense.status">{{ pretty(expense.status) }}</span></td><td class="right"><strong>{{ expense.total | money:expense.currency }}</strong></td><td class="actions">@if (!['paid','void'].includes(expense.status)) { <button type="button" (click)="openExpensePayment(expense)">Mark paid</button> } @else if (expense.status === 'paid') { <span class="paid-check">✓</span> }</td></tr>
                } @empty { <tr><td colspan="8"><div class="empty-state">No expenses found.</div></td></tr> }
              </tbody></table></div>
              <div class="table-foot"><span>{{ expenses().length }} bills and expenses</span><span>Tax is tracked separately from base cost</span></div>
            </section>
          }

          @case ('procurement') {
            <section class="process-rail">
              <div><span>1</span><b>Draft request</b><small>Define items & vendor</small></div><i>→</i><div><span>2</span><b>Approval</b><small>Control committed spend</small></div><i>→</i><div><span>3</span><b>Order</b><small>Send to supplier</small></div><i>→</i><div><span>4</span><b>Receive</b><small>Close the order</small></div>
            </section>
            <section class="table-panel panel">
              <div class="table-toolbar"><div class="search-box"><span>⌕</span><input placeholder="Search PO or vendor" [(ngModel)]="search" (keyup.enter)="loadCurrent()" /></div><select [(ngModel)]="statusFilter" (change)="loadCurrent()"><option value="">All stages</option><option value="draft">Draft</option><option value="pending_approval">Pending approval</option><option value="approved">Approved</option><option value="ordered">Ordered</option><option value="received">Received</option><option value="cancelled">Cancelled</option></select><button class="filter-go" (click)="loadCurrent()">Filter</button></div>
              <div class="table-wrap"><table><thead><tr><th>Purchase order</th><th>Vendor</th><th>Order date</th><th>Expected</th><th>Items</th><th>Status</th><th class="right">Total</th><th></th></tr></thead><tbody>
                @for (order of purchaseOrders(); track order.id) {
                  <tr><td><strong class="mono">{{ order.number }}</strong></td><td><strong>{{ order.vendor_name }}</strong><small>{{ order.vendor?.email || 'Supplier' }}</small></td><td>{{ order.order_date | date:'MMM d, y' }}</td><td>{{ order.expected_date ? (order.expected_date | date:'MMM d, y') : '—' }}</td><td>{{ order.items.length }} line{{ order.items.length === 1 ? '' : 's' }}</td><td><span [class]="'status ' + order.status">{{ pretty(order.status) }}</span></td><td class="right"><strong>{{ order.total | money:order.currency }}</strong></td><td class="actions">@if (nextPoAction(order); as action) { <button type="button" (click)="advancePo(order, action.status)">{{ action.label }}</button> }</td></tr>
                } @empty { <tr><td colspan="8"><div class="empty-state">No purchase orders found.</div></td></tr> }
              </tbody></table></div>
            </section>
          }

          @case ('vendors') {
            <section class="contact-grid">
              @for (contact of contacts(); track contact.id) {
                <article class="contact-card panel"><div class="contact-head"><span>{{ initials(contact.name) }}</span><div><h3>{{ contact.name }}</h3><p>{{ pretty(contact.type) }}</p></div><i [class.inactive]="!contact.is_active"></i></div><dl><div><dt>Email</dt><dd>{{ contact.email || '—' }}</dd></div><div><dt>Phone</dt><dd>{{ contact.phone || '—' }}</dd></div><div><dt>Terms</dt><dd>{{ contact.payment_terms }} days</dd></div><div><dt>Currency</dt><dd>{{ contact.currency }}</dd></div></dl><footer><span>{{ contact.purchase_orders_count || 0 }} purchase orders</span><span>{{ contact.invoices_count || 0 }} invoices</span></footer></article>
              } @empty { <div class="panel empty-state"><b>No contacts yet</b><span>Add customers and suppliers to start transacting.</span></div> }
            </section>
          }

          @case ('accounts') {
            <section class="account-type-strip">
              @for (type of accountTypes; track type.key) {
                <button type="button" [class.active]="accountTypeFilter === type.key" (click)="filterAccounts(type.key)"><span [class]="'type-icon ' + type.key">{{ type.icon }}</span><div><b>{{ type.label }}</b><small>{{ accountTypeTotal(type.key) | money:currency() }}</small></div><em>{{ accountTypeCount(type.key) }}</em></button>
              }
            </section>
            <section class="table-panel panel">
              <div class="table-toolbar"><div class="search-box"><span>⌕</span><input placeholder="Search account code or name" [(ngModel)]="search" (keyup.enter)="loadCurrent()" /></div><select [(ngModel)]="accountTypeFilter" (change)="loadCurrent()"><option value="">All account types</option>@for (type of accountTypes; track type.key) { <option [value]="type.key">{{ type.label }}</option> }</select><button class="filter-go" (click)="loadCurrent()">Filter</button></div>
              <div class="table-wrap"><table><thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Description</th><th class="right">Debits</th><th class="right">Credits</th><th class="right">Balance</th></tr></thead><tbody>
                @for (account of accounts(); track account.id) { <tr><td><strong class="account-code">{{ account.code }}</strong></td><td><strong>{{ account.name }}</strong><small>{{ account.is_system ? 'System account' : 'Custom account' }}</small></td><td><span [class]="'account-type ' + account.type">{{ pretty(account.type) }}</span></td><td class="description-cell">{{ account.description || '—' }}</td><td class="right">{{ account.debit_total || 0 | money:currency() }}</td><td class="right">{{ account.credit_total || 0 | money:currency() }}</td><td class="right"><strong>{{ account.balance || 0 | money:currency() }}</strong></td></tr> }
              </tbody></table></div>
              <div class="table-foot"><span>{{ accounts().length }} ledger accounts</span><span>Balances include posted journals only</span></div>
            </section>
          }

          @case ('journals') {
            <section class="ledger-health"><div><span>✓</span><p><b>Double-entry controls active</b><small>Every posted entry must balance before it reaches your reports.</small></p></div><strong>{{ postedJournalTotal() | money:currency() }}<small>Total posted debits</small></strong></section>
            <section class="table-panel panel">
              <div class="table-toolbar"><div class="search-box"><span>⌕</span><input placeholder="Search journal, reference or memo" [(ngModel)]="search" (keyup.enter)="loadCurrent()" /></div><select [(ngModel)]="statusFilter" (change)="loadCurrent()"><option value="">All entries</option><option value="posted">Posted</option><option value="draft">Draft</option></select><button class="filter-go" (click)="loadCurrent()">Filter</button></div>
              <div class="table-wrap"><table><thead><tr><th>Date</th><th>Journal</th><th>Reference / memo</th><th>Source</th><th>Status</th><th class="right">Debit</th><th class="right">Credit</th><th></th></tr></thead><tbody>
                @for (journal of journals(); track journal.id) { <tr><td>{{ journal.entry_date | date:'MMM d, y' }}</td><td><strong class="mono">{{ journal.number }}</strong></td><td><strong>{{ journal.reference || 'Manual entry' }}</strong><small>{{ journal.memo }}</small></td><td>{{ journal.source_type ? pretty(journal.source_type) : 'Manual' }}</td><td><span [class]="'status ' + journal.status">{{ pretty(journal.status) }}</span></td><td class="right">{{ journal.total_debit | money:currency() }}</td><td class="right">{{ journal.total_credit | money:currency() }}</td><td class="actions">@if (journal.status === 'draft') { <button type="button" (click)="postJournal(journal)">Post</button> } @else { <span class="paid-check">✓</span> }</td></tr> }
              </tbody></table></div>
            </section>
          }

          @case ('reports') {
            <section class="report-controls panel"><div class="report-tabs"><button [class.active]="reportType === 'profit_loss'" (click)="setReport('profit_loss')">Profit & loss</button><button [class.active]="reportType === 'balance_sheet'" (click)="setReport('balance_sheet')">Balance sheet</button><button [class.active]="reportType === 'trial_balance'" (click)="setReport('trial_balance')">Trial balance</button></div><div class="report-dates"><label>From<input type="date" [(ngModel)]="reportFrom" /></label><label>To<input type="date" [(ngModel)]="reportTo" /></label><button type="button" (click)="loadReport()">Run report</button></div></section>
            @if (report(); as r) {
              <section class="report-paper panel">
                <header><div><p>MarketHub tenant accounting</p><h2>{{ pretty(r.report) }}</h2><small>{{ r.from | date:'mediumDate' }} — {{ r.to | date:'mediumDate' }}</small></div><span>Currency<br><b>{{ r.currency }}</b></span></header>
                @if (r.report === 'profit_loss') {
                  <div class="report-summary"><article><span>Total income</span><strong>{{ r.total_income | money:r.currency }}</strong></article><article><span>Operating expenses</span><strong>{{ r.total_expenses | money:r.currency }}</strong></article><article class="net"><span>Net income</span><strong>{{ r.net_income | money:r.currency }}</strong></article></div>
                  <div class="statement-section"><h3>Income</h3>@for (row of r.income || []; track row.id) { <div><span><b>{{ row.code }}</b>{{ row.name }}</span><strong>{{ row.balance | money:r.currency }}</strong></div> }<footer><span>Total income</span><strong>{{ r.total_income | money:r.currency }}</strong></footer></div>
                  <div class="statement-section"><h3>Expenses</h3>@for (row of r.expenses || []; track row.id) { <div><span><b>{{ row.code }}</b>{{ row.name }}</span><strong>{{ row.balance | money:r.currency }}</strong></div> }<footer><span>Total expenses</span><strong>{{ r.total_expenses | money:r.currency }}</strong></footer></div>
                  <div class="statement-total"><span>Net income</span><strong>{{ r.net_income | money:r.currency }}</strong></div>
                }
                @if (r.report === 'balance_sheet') {
                  <div class="balance-columns"><div><div class="statement-section"><h3>Assets</h3>@for (row of r.assets || []; track row.id) { <div><span><b>{{ row.code }}</b>{{ row.name }}</span><strong>{{ row.balance | money:r.currency }}</strong></div> }<footer><span>Total assets</span><strong>{{ r.total_assets | money:r.currency }}</strong></footer></div></div><div><div class="statement-section"><h3>Liabilities</h3>@for (row of r.liabilities || []; track row.id) { <div><span><b>{{ row.code }}</b>{{ row.name }}</span><strong>{{ row.balance | money:r.currency }}</strong></div> }<footer><span>Total liabilities</span><strong>{{ r.total_liabilities | money:r.currency }}</strong></footer></div><div class="statement-section"><h3>Equity</h3>@for (row of r.equity || []; track row.id) { <div><span><b>{{ row.code }}</b>{{ row.name }}</span><strong>{{ row.balance | money:r.currency }}</strong></div> }<footer><span>Total equity</span><strong>{{ r.total_equity | money:r.currency }}</strong></footer></div></div></div>
                  <div class="balance-check" [class.unbalanced]="(r.difference || 0) !== 0"><span>{{ (r.difference || 0) === 0 ? '✓ Books are balanced' : 'Balance difference' }}</span><strong>{{ r.difference | money:r.currency }}</strong></div>
                }
                @if (r.report === 'trial_balance') {
                  <div class="trial-table"><div class="trial-head"><span>Account</span><span>Debit</span><span>Credit</span></div>@for (row of r.accounts || []; track row.id) { <div><span><b>{{ row.code }}</b>{{ row.name }}</span><span>{{ row.debit | money:r.currency }}</span><span>{{ row.credit | money:r.currency }}</span></div> }<footer><span>Total</span><strong>{{ r.total_debit | money:r.currency }}</strong><strong>{{ r.total_credit | money:r.currency }}</strong></footer></div>
                }
              </section>
            }
          }

          @case ('reconciliation') {
            <section class="bank-grid">@for (bank of bankAccounts(); track bank.id) { <article class="bank-card panel"><header><span>▰</span><div><p>{{ bank.bank_name || 'Bank account' }}</p><h3>{{ bank.name }}</h3></div><i>•••• {{ bank.account_number_last4 || '0000' }}</i></header><div><small>Statement balance</small><strong>{{ bank.statement_balance || 0 | money:bank.currency }}</strong><p><span>Book {{ bank.ledger_balance || 0 | money:bank.currency }}</span><b [class.warning]="bank.difference">Difference {{ bank.difference || 0 | money:bank.currency }}</b></p></div><footer><span [class.warning]="bank.unmatched_count">{{ bank.unmatched_count || 0 }} unmatched</span><span>{{ bank.transactions_count || 0 }} imported</span></footer></article> }</section>
            <section class="reconcile-progress panel"><div><p>Reconciliation progress</p><strong>{{ reconciliationPercent() }}%</strong></div><span><i [style.width.%]="reconciliationPercent()"></i></span><small>{{ matchedTransactions() }} of {{ bankTransactions().length }} statement lines reviewed</small></section>
            <section class="table-panel panel"><div class="table-toolbar"><div class="search-box"><span>⌕</span><input disabled placeholder="Imported statement activity" /></div><select [(ngModel)]="statusFilter" (change)="loadCurrent()"><option value="">All status</option><option value="unmatched">Unmatched</option><option value="matched">Matched</option><option value="excluded">Excluded</option></select></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Statement description</th><th>Reference</th><th>Bank</th><th>Status</th><th class="right">Amount</th><th></th></tr></thead><tbody>@for (transaction of bankTransactions(); track transaction.id) { <tr><td>{{ transaction.transaction_date | date:'MMM d, y' }}</td><td><strong>{{ transaction.description }}</strong><small>{{ transaction.payment ? 'Matched to ' + transaction.payment.reference : 'No ledger match' }}</small></td><td class="mono">{{ transaction.reference || '—' }}</td><td>{{ transaction.bank_account?.name }}</td><td><span [class]="'status ' + transaction.status">{{ pretty(transaction.status) }}</span></td><td class="right movement-amount" [class.outgoing]="+transaction.amount < 0">{{ transaction.amount | money:transaction.bank_account?.currency }}</td><td class="actions">@if (transaction.status === 'unmatched') { <button (click)="openReconcile(transaction)">Match</button><button (click)="excludeTransaction(transaction)">Exclude</button> } @else { <button (click)="undoReconcile(transaction)">Undo</button> }</td></tr> }</tbody></table></div></section>
          }
        }
      }
    </div>

    @if (drawer()) {
      <div class="drawer-backdrop" (click)="closeDrawer()"></div>
      <aside class="drawer" role="dialog" aria-modal="true">
        <header><div><p class="eyebrow">{{ drawerEyebrow() }}</p><h2>{{ drawerTitle() }}</h2></div><button type="button" (click)="closeDrawer()" aria-label="Close">×</button></header>
        <div class="drawer-body">
          @if (drawer() === 'invoice') {
            <form id="accounting-form" (ngSubmit)="createInvoice()">
              <div class="form-grid two"><label>Customer name<input required [(ngModel)]="invoiceForm.customer_name" name="customer_name" placeholder="e.g. Atlas Retail Group" /></label><label>Customer email<input type="email" [(ngModel)]="invoiceForm.customer_email" name="customer_email" placeholder="billing@customer.com" /></label></div>
              <div class="form-grid two"><label>Issue date<input type="date" required [(ngModel)]="invoiceForm.issue_date" name="issue_date" /></label><label>Due date<input type="date" required [(ngModel)]="invoiceForm.due_date" name="due_date" /></label></div>
              <div class="line-head"><div><h3>Line items</h3><p>Add products, services or fees</p></div><button type="button" (click)="addInvoiceLine()">+ Add line</button></div>
              <div class="line-table"><div class="line-labels"><span>Description</span><span>Qty</span><span>Rate</span><span>Tax %</span><span></span></div>
                @for (line of invoiceForm.items; track $index; let i = $index) { <div class="line-inputs"><input required [(ngModel)]="line.description" [name]="'inv_desc_'+i" placeholder="Item or service" /><input required type="number" min="0.01" step="0.01" [(ngModel)]="line.quantity" [name]="'inv_qty_'+i" /><input required type="number" min="0" step="0.01" [(ngModel)]="line.unit_price" [name]="'inv_rate_'+i" /><input type="number" min="0" max="100" step="0.01" [(ngModel)]="line.tax_rate" [name]="'inv_tax_'+i" /><button type="button" (click)="removeInvoiceLine(i)" [disabled]="invoiceForm.items.length === 1">×</button></div> }
              </div>
              <div class="totals"><div><span>Subtotal</span><b>{{ invoiceSubtotal() | money:invoiceForm.currency }}</b></div><div><span>Tax</span><b>{{ invoiceTax() | money:invoiceForm.currency }}</b></div><div class="grand"><span>Total</span><b>{{ invoiceSubtotal() + invoiceTax() | money:invoiceForm.currency }}</b></div></div>
              <label class="textarea-label">Notes<textarea [(ngModel)]="invoiceForm.notes" name="notes" rows="3" placeholder="Payment instructions or a thank-you note"></textarea></label>
              <label class="check"><input type="checkbox" [(ngModel)]="invoiceForm.send_now" name="send_now" /><span><b>Mark ready to send</b><small>Moves this invoice out of draft</small></span></label>
            </form>
          }

          @if (drawer() === 'payment') {
            <div class="payment-context"><span>Invoice</span><strong>{{ selectedInvoice()?.number }}</strong><p>{{ selectedInvoice()?.customer_name }}</p><div><small>Balance due</small><b>{{ selectedInvoice()?.balance_due | money:selectedInvoice()?.currency }}</b></div></div>
            <form id="accounting-form" (ngSubmit)="recordPayment()"><label>Amount received<input type="number" required min="0.01" [max]="selectedInvoice()?.balance_due ?? null" step="0.01" [(ngModel)]="paymentForm.amount" name="amount" /></label><div class="form-grid two"><label>Payment date<input type="date" required [(ngModel)]="paymentForm.paid_on" name="paid_on" /></label><label>Method<select [(ngModel)]="paymentForm.method" name="method"><option value="bank_transfer">Bank transfer</option><option value="card">Card</option><option value="mobile_money">Mobile money</option><option value="cash">Cash</option><option value="cheque">Cheque</option></select></label></div><label>Reference<input [(ngModel)]="paymentForm.reference" name="reference" placeholder="Optional bank or receipt reference" /></label><label>Notes<textarea rows="3" [(ngModel)]="paymentForm.notes" name="notes"></textarea></label></form>
          }

          @if (drawer() === 'expense') {
            <form id="accounting-form" (ngSubmit)="createExpense()"><div class="form-grid two"><label>Vendor<select [(ngModel)]="expenseForm.vendor_id" name="vendor_id" (ngModelChange)="chooseExpenseVendor($event)"><option value="">No saved vendor</option>@for (vendor of vendors(); track vendor.id) { <option [value]="vendor.id">{{ vendor.name }}</option> }</select></label><label>Vendor name<input [(ngModel)]="expenseForm.vendor_name" name="vendor_name" placeholder="Supplier or payee" /></label></div><label>Description<input required [(ngModel)]="expenseForm.description" name="description" placeholder="What was this expense for?" /></label><div class="form-grid two"><label>Category<select required [(ngModel)]="expenseForm.category" name="category">@for (category of expenseCategories; track category) { <option [value]="category">{{ category }}</option> }</select></label><label>Receipt reference<input [(ngModel)]="expenseForm.receipt_reference" name="receipt_reference" /></label></div><div class="form-grid two"><label>Expense date<input required type="date" [(ngModel)]="expenseForm.expense_date" name="expense_date" /></label><label>Due date<input type="date" [(ngModel)]="expenseForm.due_date" name="due_date" /></label></div><div class="form-grid two"><label>Amount before tax<input required type="number" min="0.01" step="0.01" [(ngModel)]="expenseForm.amount" name="amount" /></label><label>Tax amount<input type="number" min="0" step="0.01" [(ngModel)]="expenseForm.tax_amount" name="tax_amount" /></label></div><div class="form-total"><span>Total bill</span><strong>{{ (+expenseForm.amount + +expenseForm.tax_amount) | money:expenseForm.currency }}</strong></div><label>Notes<textarea rows="3" [(ngModel)]="expenseForm.notes" name="notes"></textarea></label></form>
          }

          @if (drawer() === 'payExpense') {
            <div class="payment-context expense"><span>Bill</span><strong>{{ selectedExpense()?.number }}</strong><p>{{ selectedExpense()?.description }}</p><div><small>Amount to pay</small><b>{{ selectedExpense()?.total | money:selectedExpense()?.currency }}</b></div></div><form id="accounting-form" (ngSubmit)="payExpense()"><div class="form-grid two"><label>Payment date<input required type="date" [(ngModel)]="paymentForm.paid_on" name="paid_on" /></label><label>Method<select [(ngModel)]="paymentForm.method" name="method"><option value="bank_transfer">Bank transfer</option><option value="card">Card</option><option value="mobile_money">Mobile money</option><option value="cash">Cash</option><option value="cheque">Cheque</option></select></label></div><label>Reference<input [(ngModel)]="paymentForm.reference" name="reference" placeholder="Optional transaction reference" /></label></form>
          }

          @if (drawer() === 'purchaseOrder') {
            <form id="accounting-form" (ngSubmit)="createPurchaseOrder()"><div class="form-grid two"><label>Vendor<select required [(ngModel)]="poForm.vendor_id" name="vendor_id" (ngModelChange)="choosePoVendor($event)"><option value="">Select vendor</option>@for (vendor of vendors(); track vendor.id) { <option [value]="vendor.id">{{ vendor.name }}</option> }</select></label><label>Expected delivery<input type="date" [(ngModel)]="poForm.expected_date" name="expected_date" /></label></div><div class="line-head"><div><h3>Order items</h3><p>Quantities and agreed supplier cost</p></div><button type="button" (click)="addPoLine()">+ Add line</button></div><div class="line-table po"><div class="line-labels"><span>Description</span><span>Qty</span><span>Unit cost</span><span>Tax %</span><span></span></div>@for (line of poForm.items; track $index; let i = $index) { <div class="line-inputs"><input required [(ngModel)]="line.description" [name]="'po_desc_'+i" placeholder="Product or supply" /><input required type="number" min="0.01" step="0.01" [(ngModel)]="line.quantity" [name]="'po_qty_'+i" /><input required type="number" min="0" step="0.01" [(ngModel)]="line.unit_cost" [name]="'po_cost_'+i" /><input type="number" min="0" max="100" [(ngModel)]="line.tax_rate" [name]="'po_tax_'+i" /><button type="button" (click)="removePoLine(i)" [disabled]="poForm.items.length === 1">×</button></div> }</div><div class="totals"><div><span>Subtotal</span><b>{{ poSubtotal() | money:poForm.currency }}</b></div><div><span>Tax</span><b>{{ poTax() | money:poForm.currency }}</b></div><div class="grand"><span>Order total</span><b>{{ poSubtotal() + poTax() | money:poForm.currency }}</b></div></div><label class="textarea-label">Procurement notes<textarea rows="3" [(ngModel)]="poForm.notes" name="notes"></textarea></label><label class="check"><input type="checkbox" [(ngModel)]="poForm.submit_for_approval" name="submit_for_approval" /><span><b>Submit for approval</b><small>Start the controlled purchasing workflow</small></span></label></form>
          }

          @if (drawer() === 'contact') {
            <form id="accounting-form" (ngSubmit)="createContact()"><div class="form-grid two"><label>Contact type<select required [(ngModel)]="contactForm.type" name="type"><option value="vendor">Vendor</option><option value="customer">Customer</option><option value="both">Customer & vendor</option></select></label><label>Business name<input required [(ngModel)]="contactForm.name" name="name" /></label></div><div class="form-grid two"><label>Email<input type="email" [(ngModel)]="contactForm.email" name="email" /></label><label>Phone<input [(ngModel)]="contactForm.phone" name="phone" /></label></div><div class="form-grid two"><label>Tax ID<input [(ngModel)]="contactForm.tax_id" name="tax_id" /></label><label>Payment terms<select [(ngModel)]="contactForm.payment_terms" name="payment_terms"><option [value]="0">Due now</option><option [value]="7">7 days</option><option [value]="14">14 days</option><option [value]="30">30 days</option><option [value]="60">60 days</option></select></label></div><label>Address<textarea rows="4" [(ngModel)]="contactForm.address" name="address"></textarea></label></form>
          }

          @if (drawer() === 'account') {
            <form id="accounting-form" (ngSubmit)="createAccount()"><div class="form-grid two"><label>Account code<input required [(ngModel)]="accountForm.code" name="code" placeholder="e.g. 6950" /></label><label>Account type<select required [(ngModel)]="accountForm.type" name="type">@for (type of accountTypes; track type.key) { <option [value]="type.key">{{ type.label }}</option> }</select></label></div><label>Account name<input required [(ngModel)]="accountForm.name" name="name" placeholder="e.g. Bank charges" /></label><label>Description<textarea rows="4" [(ngModel)]="accountForm.description" name="description" placeholder="How this account should be used"></textarea></label><div class="control-note"><span>i</span><p><b>Permanent ledger account</b>Accounts with posted activity cannot be removed. Choose the type carefully.</p></div></form>
          }

          @if (drawer() === 'journal') {
            <form id="accounting-form" (ngSubmit)="createJournal()"><div class="form-grid two"><label>Journal date<input type="date" required [(ngModel)]="journalForm.entry_date" name="entry_date" /></label><label>Reference<input [(ngModel)]="journalForm.reference" name="reference" placeholder="Optional source reference" /></label></div><label>Memo<input required [(ngModel)]="journalForm.memo" name="memo" placeholder="Why is this adjustment needed?" /></label><div class="line-head"><div><h3>Double-entry lines</h3><p>Debits and credits must balance</p></div><button type="button" (click)="addJournalLine()">+ Add line</button></div><div class="journal-lines"><div class="journal-labels"><span>Account</span><span>Description</span><span>Debit</span><span>Credit</span><span></span></div>@for (line of journalForm.lines; track $index; let i = $index) { <div class="journal-inputs"><select required [(ngModel)]="line.account_id" [name]="'j_account_'+i"><option value="">Select account</option>@for (account of allAccounts(); track account.id) { <option [value]="account.id">{{ account.code }} · {{ account.name }}</option> }</select><input [(ngModel)]="line.description" [name]="'j_desc_'+i" placeholder="Line memo" /><input type="number" min="0" step="0.01" [(ngModel)]="line.debit" [name]="'j_debit_'+i" (ngModelChange)="clearJournalOpposite(line, 'debit')" /><input type="number" min="0" step="0.01" [(ngModel)]="line.credit" [name]="'j_credit_'+i" (ngModelChange)="clearJournalOpposite(line, 'credit')" /><button type="button" (click)="removeJournalLine(i)" [disabled]="journalForm.lines.length <= 2">×</button></div> }</div><div class="journal-balance" [class.unbalanced]="journalDifference() !== 0"><div><span>Total debits</span><b>{{ journalDebit() | money:currency() }}</b></div><div><span>Total credits</span><b>{{ journalCredit() | money:currency() }}</b></div><div><span>Difference</span><b>{{ journalDifference() | money:currency() }}</b></div></div><label class="check"><input type="checkbox" [(ngModel)]="journalForm.post_now" name="post_now" /><span><b>Post immediately</b><small>Posted journals affect reports and cannot be edited</small></span></label></form>
          }

          @if (drawer() === 'bankTransaction') {
            <form id="accounting-form" (ngSubmit)="createBankTransaction()"><label>Bank account<select required [(ngModel)]="bankTransactionForm.bank_account_id" name="bank_account_id">@for (bank of bankAccounts(); track bank.id) { <option [value]="bank.id">{{ bank.name }} · {{ bank.currency }}</option> }</select></label><div class="form-grid two"><label>Transaction date<input required type="date" [(ngModel)]="bankTransactionForm.transaction_date" name="transaction_date" /></label><label>Amount<input required type="number" step="0.01" [(ngModel)]="bankTransactionForm.amount" name="amount" /><small>Use a negative amount for money out</small></label></div><label>Description<input required [(ngModel)]="bankTransactionForm.description" name="description" /></label><label>Statement reference<input [(ngModel)]="bankTransactionForm.reference" name="reference" /></label></form>
          }

          @if (drawer() === 'reconcile') {
            <div class="payment-context"><span>Bank transaction</span><strong>{{ selectedBankTransaction()?.reference || 'No reference' }}</strong><p>{{ selectedBankTransaction()?.description }}</p><div><small>Statement amount</small><b>{{ selectedBankTransaction()?.amount | money:selectedBankTransaction()?.bank_account?.currency }}</b></div></div><form id="accounting-form" (ngSubmit)="reconcileTransaction()"><label>Match to payment<select required [(ngModel)]="reconcileForm.payment_id" name="payment_id"><option value="">Select equal payment</option>@for (payment of matchingPayments(); track payment.id) { <option [value]="payment.id">{{ payment.reference }} · {{ payment.direction === 'incoming' ? '+' : '−' }}{{ payment.amount | money:payment.currency }}</option> }</select></label><div class="control-note"><span>✓</span><p><b>Amount control</b>Only payments with the same signed amount are available for matching.</p></div></form>
          }
        </div>
        <footer><button type="button" class="btn ghost" (click)="closeDrawer()">Cancel</button><button type="submit" form="accounting-form" class="btn primary" [disabled]="saving()">{{ saving() ? 'Saving…' : drawerSubmitLabel() }}</button></footer>
      </aside>
    }

    <!-- printable invoice view (separate from the form drawer) -->
    @if (viewInvoice(); as inv) {
      <div class="drawer-backdrop" (click)="closeViewInvoice()"></div>
      <aside class="drawer print-drawer" role="dialog" aria-modal="true" [class.narrow]="receipt().paper_size === '80mm'">
        <header><div><p class="eyebrow">Invoice · {{ receipt().paper_size === '80mm' ? 'till slip' : 'printable' }}</p><h2>{{ inv.number }}</h2></div><button type="button" (click)="closeViewInvoice()" aria-label="Close">×</button></header>
        <div class="drawer-body">
          <div class="invoice-print" [style.--rcpt-accent]="receipt().accent_color || '#1f4b3a'">
            <div class="doc-head">
              @if (receipt().show_logo) { <span class="logo">{{ (business().business_name || business().name || '?')[0] }}</span> }
              <div>
                <h2>{{ business().business_name || business().name }}</h2>
                @if (receipt().header_line) { <p>{{ receipt().header_line }}</p> }
                @if (receipt().address_line) { <p>{{ receipt().address_line }}</p> }
                @if (business().support_phone) { <p>Tel {{ business().support_phone }}</p> }
                @if (business().tax_id) { <p>Tax ID {{ business().tax_id }}</p> }
              </div>
              <div class="doc-meta">
                <span class="doc-status" [attr.data-s]="inv.status">{{ inv.status | uppercase }}</span>
                <p>Issued {{ inv.issue_date | date:'mediumDate' }}<br />Due {{ inv.due_date | date:'mediumDate' }}</p>
              </div>
            </div>
            <div class="bill-to"><span>Bill to</span><b>{{ inv.customer_name }}</b>@if (inv.customer_email) { <small>{{ inv.customer_email }}</small> }</div>
            <table class="doc-lines">
              <thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Rate</th>@if (receipt().show_tax_breakdown) { <th class="r">{{ receipt().tax_label || 'Tax' }} %</th> }<th class="r">Amount</th></tr></thead>
              <tbody>
                @for (line of inv.items; track $index) {
                  <tr>
                    <td>{{ line.description }}</td>
                    <td class="r">{{ +line.quantity }}</td>
                    <td class="r">{{ +(line.unit_price || 0) | money:inv.currency }}</td>
                    @if (receipt().show_tax_breakdown) { <td class="r">{{ +line.tax_rate || 0 }}%</td> }
                    <td class="r">{{ +(line.line_subtotal ?? (+line.quantity * +(line.unit_price || 0))) | money:inv.currency }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <dl class="doc-sums">
              <div><dt>Subtotal</dt><dd>{{ +inv.subtotal | money:inv.currency }}</dd></div>
              @if (receipt().show_discounts && +inv.discount_total > 0) { <div><dt>Discount</dt><dd>−{{ +inv.discount_total | money:inv.currency }}</dd></div> }
              @if (receipt().show_tax_breakdown) { <div><dt>{{ receipt().tax_label || 'Tax' }}</dt><dd>{{ +inv.tax_total | money:inv.currency }}</dd></div> }
              <div class="grand"><dt>Total</dt><dd>{{ +inv.total | money:inv.currency }}</dd></div>
              @if (+inv.amount_paid > 0) { <div><dt>Paid</dt><dd>{{ +inv.amount_paid | money:inv.currency }}</dd></div><div class="balance"><dt>Balance due</dt><dd>{{ +inv.balance_due | money:inv.currency }}</dd></div> }
            </dl>
            @if (inv.notes) { <p class="doc-notes">{{ inv.notes }}</p> }
            @if (receipt().footer_note) { <p class="doc-footer">{{ receipt().footer_note }}</p> }
          </div>
        </div>
        <footer><button type="button" class="btn ghost" (click)="closeViewInvoice()">Close</button><button type="button" class="btn primary" (click)="printInvoice()">Print / save PDF</button></footer>
      </aside>
    }
  `,

})
export class SellerAccountingComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  readonly sections: { key: AccountingPage; label: string; path: string }[] = [
    { key: 'overview', label: 'Overview', path: 'departments/finance' },
    { key: 'invoices', label: 'Invoices', path: 'accounting/invoices' },
    { key: 'payments', label: 'Payments', path: 'accounting/payments' },
    { key: 'expenses', label: 'Expenses', path: 'accounting/expenses' },
    { key: 'procurement', label: 'Procurement', path: 'accounting/procurement' },
    { key: 'vendors', label: 'Contacts', path: 'accounting/vendors' },
    { key: 'reconciliation', label: 'Reconcile', path: 'accounting/reconciliation' },
    { key: 'accounts', label: 'Accounts', path: 'accounting/chart-of-accounts' },
    { key: 'journals', label: 'Journal', path: 'accounting/journals' },
    { key: 'reports', label: 'Reports', path: 'accounting/reports' },
  ];
  readonly accountTypes = [
    { key: 'asset', label: 'Assets', icon: 'A' }, { key: 'liability', label: 'Liabilities', icon: 'L' },
    { key: 'equity', label: 'Equity', icon: 'E' }, { key: 'income', label: 'Income', icon: '↗' },
    { key: 'expense', label: 'Expenses', icon: '↓' },
  ];
  readonly expenseCategories = ['Inventory', 'Shipping', 'Marketing', 'Software', 'Rent', 'Payroll', 'Utilities', 'Professional services', 'Tax', 'Other'];

  page = signal<AccountingPage>('overview');
  drawer = signal<Drawer>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  toast = signal('');
  total = signal(0);
  dashboard = signal<AccountingDashboard | null>(null);
  invoices = signal<AccountingInvoice[]>([]);
  payments = signal<AccountingPayment[]>([]);
  expenses = signal<AccountingExpense[]>([]);
  contacts = signal<AccountingContact[]>([]);
  purchaseOrders = signal<PurchaseOrder[]>([]);
  accounts = signal<AccountingAccount[]>([]);
  allAccounts = signal<AccountingAccount[]>([]);
  journals = signal<AccountingJournalEntry[]>([]);
  report = signal<AccountingReport | null>(null);
  bankAccounts = signal<AccountingBankAccount[]>([]);
  bankTransactions = signal<AccountingBankTransaction[]>([]);
  selectedInvoice = signal<AccountingInvoice | null>(null);
  viewInvoice = signal<AccountingInvoice | null>(null);
  receipt = signal<TenantReceipt>({ ...DEFAULT_RECEIPT });
  business = signal<{ name: string; business_name?: string | null; support_phone?: string | null; tax_id?: string | null }>({ name: 'Your business' });
  private receiptLoaded = false;
  selectedExpense = signal<AccountingExpense | null>(null);
  selectedBankTransaction = signal<AccountingBankTransaction | null>(null);
  search = '';
  statusFilter = '';
  accountTypeFilter = '';
  reportType: 'profit_loss' | 'balance_sheet' | 'trial_balance' = 'profit_loss';
  reportFrom = this.yearStart();
  reportTo = this.date();
  currency = signal('USD');

  invoiceForm = this.freshInvoice();
  expenseForm = this.freshExpense();
  poForm = this.freshPo();
  contactForm = this.freshContact();
  paymentForm = this.freshPayment();
  accountForm = this.freshAccount();
  journalForm = this.freshJournal();
  bankTransactionForm = this.freshBankTransaction();
  reconcileForm = { payment_id: '' };

  constructor() {
    this.route.data.subscribe((data) => {
      this.page.set((data['page'] as AccountingPage) || 'overview');
      this.search = '';
      this.statusFilter = '';
      this.loadCurrent();
    });
    this.loadContacts();
  }

  pageTitle(): string {
    return ({ overview: 'Finance overview', invoices: 'Sales invoices', payments: 'Payments ledger', expenses: 'Bills & expenses', procurement: 'Procurement', vendors: 'Customers & vendors', accounts: 'Chart of accounts', journals: 'General journal', reports: 'Financial reports', reconciliation: 'Bank reconciliation' } as Record<AccountingPage, string>)[this.page()];
  }

  pageDescription(): string {
    return ({
      overview: 'A live view of cash, receivables, payables and purchasing commitments.',
      invoices: 'Create professional invoices, follow balances and record customer payments.',
      payments: 'A single, traceable ledger of every incoming and outgoing payment.',
      expenses: 'Capture supplier bills, operating costs, tax and payment status.',
      procurement: 'Control purchasing from request and approval through ordering and receipt.',
      vendors: 'Manage reusable billing and procurement contacts, terms and tax details.',
      accounts: 'Organise assets, liabilities, equity, income and expenses in a tenant-scoped ledger.',
      journals: 'Review automatic postings and create balanced manual double-entry adjustments.',
      reports: 'Run live profit and loss, balance sheet and trial balance statements.',
      reconciliation: 'Match imported bank statement lines to recorded customer and supplier payments.',
    } as Record<AccountingPage, string>)[this.page()];
  }

  accountingLink(path: string): string { return `/tenant/${path}`; }

  loadCurrent(): void {
    this.loading.set(true); this.error.set('');
    const params: Record<string, string | number> = { per_page: 100 };
    if (this.search.trim()) params['search'] = this.search.trim();
    if (this.statusFilter) params['status'] = this.statusFilter;
    const current = this.page();
    if (current === 'overview') {
      this.api.accountingDashboard().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.dashboard.set(res.data); this.currency.set(res.data.currency); }, error: (err) => this.fail(err) });
    } else if (current === 'invoices') {
      this.api.accountingInvoices(params).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.invoices.set(res.data); this.total.set(res.meta.total); if (res.data[0]) this.currency.set(res.data[0].currency); }, error: (err) => this.fail(err) });
    } else if (current === 'payments') {
      this.api.accountingPayments(params).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.payments.set(res.data); this.total.set(res.meta.total); if (res.data[0]) this.currency.set(res.data[0].currency); }, error: (err) => this.fail(err) });
    } else if (current === 'expenses') {
      this.api.accountingExpenses(params).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.expenses.set(res.data); this.total.set(res.meta.total); if (res.data[0]) this.currency.set(res.data[0].currency); }, error: (err) => this.fail(err) });
    } else if (current === 'procurement') {
      this.api.purchaseOrders(params).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.purchaseOrders.set(res.data); this.total.set(res.meta.total); if (res.data[0]) this.currency.set(res.data[0].currency); }, error: (err) => this.fail(err) });
    } else if (current === 'vendors') {
      this.api.accountingContacts({ ...params }).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.contacts.set(res.data); this.total.set(res.meta.total); }, error: (err) => this.fail(err) });
    } else if (current === 'accounts') {
      const accountParams: Record<string, string | number> = {};
      if (this.search.trim()) accountParams['search'] = this.search.trim();
      if (this.accountTypeFilter) accountParams['type'] = this.accountTypeFilter;
      this.api.accountingAccounts(accountParams).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.accounts.set(res.data); if (!this.accountTypeFilter && !this.search) this.allAccounts.set(res.data); }, error: (err) => this.fail(err) });
    } else if (current === 'journals') {
      this.api.accountingJournals(params).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.journals.set(res.data); this.total.set(res.meta.total); this.loadAccountLookup(); }, error: (err) => this.fail(err) });
    } else if (current === 'reports') {
      this.loadReport();
    } else {
      forkJoin({ banks: this.api.accountingBankAccounts(), transactions: this.api.accountingBankTransactions(params), payments: this.api.accountingPayments({ per_page: 100 }) })
        .pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.bankAccounts.set(res.banks.data); this.bankTransactions.set(res.transactions.data); this.payments.set(res.payments.data); if (res.banks.data[0]) this.currency.set(res.banks.data[0].currency); }, error: (err) => this.fail(err) });
    }
  }

  open(kind: Exclude<Drawer, null>): void {
    if (kind === 'invoice') this.invoiceForm = this.freshInvoice();
    if (kind === 'expense') this.expenseForm = this.freshExpense();
    if (kind === 'purchaseOrder') this.poForm = this.freshPo();
    if (kind === 'contact') this.contactForm = this.freshContact();
    if (kind === 'account') this.accountForm = this.freshAccount();
    if (kind === 'journal') { this.journalForm = this.freshJournal(); this.loadAccountLookup(); }
    if (kind === 'bankTransaction') {
      this.bankTransactionForm = this.freshBankTransaction();
      if (this.bankAccounts()[0]) this.bankTransactionForm.bank_account_id = this.bankAccounts()[0].id;
    }
    this.error.set(''); this.drawer.set(kind);
  }

  closeDrawer(): void { if (!this.saving()) this.drawer.set(null); }
  drawerTitle(): string { return ({ invoice: 'Create invoice', payment: 'Record payment', expense: 'Log bill or expense', payExpense: 'Pay supplier bill', purchaseOrder: 'New purchase order', contact: 'Add accounting contact', account: 'Add ledger account', journal: 'Create manual journal', bankTransaction: 'Add statement transaction', reconcile: 'Match bank transaction' } as Record<string, string>)[this.drawer() || ''] || ''; }
  drawerEyebrow(): string { return ['purchaseOrder', 'contact'].includes(this.drawer() || '') ? 'Procurement setup' : ['account', 'journal'].includes(this.drawer() || '') ? 'General ledger' : this.drawer() === 'reconcile' ? 'Bank reconciliation' : 'Accounting entry'; }
  drawerSubmitLabel(): string { return ({ invoice: 'Create invoice', payment: 'Record payment', expense: 'Save expense', payExpense: 'Mark as paid', purchaseOrder: 'Create purchase order', contact: 'Add contact', account: 'Create account', journal: 'Save journal', bankTransaction: 'Add transaction', reconcile: 'Confirm match' } as Record<string, string>)[this.drawer() || ''] || 'Save'; }

  createInvoice(): void {
    this.save(this.api.createAccountingInvoice(this.invoiceForm), 'Invoice created', () => { this.invoiceForm = this.freshInvoice(); });
  }
  sendInvoice(invoice: AccountingInvoice): void { this.saving.set(true); this.api.updateAccountingInvoice(invoice.id, 'sent').pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.showToast('Invoice marked as sent'); this.loadCurrent(); }, error: (err) => this.fail(err) }); }
  openPayment(invoice: AccountingInvoice): void { this.selectedInvoice.set(invoice); this.paymentForm = { ...this.freshPayment(), amount: +invoice.balance_due }; this.drawer.set('payment'); }
  recordPayment(): void { const invoice = this.selectedInvoice(); if (!invoice) return; this.save(this.api.recordAccountingPayment(invoice.id, this.paymentForm), 'Payment recorded'); }

  openViewInvoice(invoice: AccountingInvoice): void {
    this.viewInvoice.set(invoice);
    // Refresh the copy (items + payments) and the receipt template once.
    this.api.accountingInvoice(invoice.id).subscribe({ next: (res) => this.viewInvoice.set(res.data) });
    if (!this.receiptLoaded) {
      this.receiptLoaded = true;
      this.api.tenantSettings().subscribe({
        next: (res) => {
          const d = res.data;
          this.business.set({ name: d.tenant?.name || 'Your business', business_name: d.tenant?.business_name, support_phone: d.settings?.support_phone, tax_id: d.settings?.tax_id });
          this.receipt.set({ ...DEFAULT_RECEIPT, ...(d.settings?.receipt || {}) });
        },
      });
    }
  }
  closeViewInvoice(): void { this.viewInvoice.set(null); }
  printInvoice(): void { window.print(); }
  deleteInvoice(invoice: AccountingInvoice): void {
    if (!window.confirm(`Delete draft invoice ${invoice.number}? This cannot be undone.`)) return;
    this.saving.set(true); this.error.set('');
    this.api.deleteAccountingInvoice(invoice.id).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.showToast(`Invoice ${invoice.number} deleted`); this.loadCurrent(); },
      error: (err) => this.fail(err),
    });
  }

  createExpense(): void { this.save(this.api.createAccountingExpense(this.expenseForm), 'Expense saved', () => { this.expenseForm = this.freshExpense(); }); }
  openExpensePayment(expense: AccountingExpense): void { this.selectedExpense.set(expense); this.paymentForm = this.freshPayment(); this.drawer.set('payExpense'); }
  payExpense(): void { const expense = this.selectedExpense(); if (!expense) return; this.save(this.api.payAccountingExpense(expense.id, this.paymentForm), 'Bill marked as paid'); }
  createPurchaseOrder(): void { this.save(this.api.createPurchaseOrder(this.poForm), 'Purchase order created', () => { this.poForm = this.freshPo(); }); }
  createContact(): void { this.save(this.api.createAccountingContact(this.contactForm), 'Contact added', () => { this.contactForm = this.freshContact(); this.loadContacts(); }); }
  createAccount(): void { this.save(this.api.createAccountingAccount(this.accountForm), 'Ledger account created', () => { this.accountForm = this.freshAccount(); this.loadAccountLookup(); }); }
  createJournal(): void { this.save(this.api.createAccountingJournal(this.journalForm), this.journalForm.post_now ? 'Journal posted' : 'Draft journal saved', () => { this.journalForm = this.freshJournal(); }); }
  postJournal(journal: AccountingJournalEntry): void { this.save(this.api.postAccountingJournal(journal.id), 'Journal posted'); }
  createBankTransaction(): void { this.save(this.api.createAccountingBankTransaction(this.bankTransactionForm), 'Bank transaction added', () => { this.bankTransactionForm = this.freshBankTransaction(); }); }

  filterAccounts(type: string): void { this.accountTypeFilter = this.accountTypeFilter === type ? '' : type; this.loadCurrent(); }
  accountTypeCount(type: string): number { return this.allAccounts().filter((account) => account.type === type).length; }
  accountTypeTotal(type: string): number { return this.allAccounts().filter((account) => account.type === type).reduce((sum, account) => sum + +(account.balance || 0), 0); }
  postedJournalTotal(): number { return this.journals().filter((journal) => journal.status === 'posted').reduce((sum, journal) => sum + +journal.total_debit, 0); }
  addJournalLine(): void { this.journalForm.lines.push({ account_id: '', description: '', debit: 0, credit: 0 }); }
  removeJournalLine(index: number): void { if (this.journalForm.lines.length > 2) this.journalForm.lines.splice(index, 1); }
  clearJournalOpposite(line: any, side: 'debit' | 'credit'): void { if (+line[side] > 0) line[side === 'debit' ? 'credit' : 'debit'] = 0; }
  journalDebit(): number { return this.journalForm.lines.reduce((sum: number, line: any) => sum + (+line.debit || 0), 0); }
  journalCredit(): number { return this.journalForm.lines.reduce((sum: number, line: any) => sum + (+line.credit || 0), 0); }
  journalDifference(): number { return Math.round(Math.abs(this.journalDebit() - this.journalCredit()) * 100) / 100; }

  setReport(type: 'profit_loss' | 'balance_sheet' | 'trial_balance'): void { this.reportType = type; this.loadReport(); }
  loadReport(): void {
    this.loading.set(true); this.error.set('');
    this.api.accountingReport({ report: this.reportType, from: this.reportFrom, to: this.reportTo }).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.report.set(res.data); this.currency.set(res.data.currency); }, error: (err) => this.fail(err) });
  }

  openReconcile(transaction: AccountingBankTransaction): void { this.selectedBankTransaction.set(transaction); this.reconcileForm = { payment_id: '' }; this.drawer.set('reconcile'); }
  matchingPayments(): AccountingPayment[] {
    const transaction = this.selectedBankTransaction(); if (!transaction) return [];
    const matchedIds = new Set(this.bankTransactions().filter((row) => row.status === 'matched' && row.payment_id).map((row) => row.payment_id));
    return this.payments().filter((payment) => !matchedIds.has(payment.id) && Math.abs((payment.direction === 'incoming' ? +payment.amount : -+payment.amount) - +transaction.amount) < 0.01);
  }
  reconcileTransaction(): void { const transaction = this.selectedBankTransaction(); if (!transaction) return; this.save(this.api.reconcileAccountingBankTransaction(transaction.id, { status: 'matched', payment_id: +this.reconcileForm.payment_id }), 'Transaction matched'); }
  excludeTransaction(transaction: AccountingBankTransaction): void { this.save(this.api.reconcileAccountingBankTransaction(transaction.id, { status: 'excluded' }), 'Transaction excluded'); }
  undoReconcile(transaction: AccountingBankTransaction): void { this.save(this.api.reconcileAccountingBankTransaction(transaction.id, { status: 'unmatched' }), 'Reconciliation undone'); }
  matchedTransactions(): number { return this.bankTransactions().filter((transaction) => transaction.status !== 'unmatched').length; }
  reconciliationPercent(): number { return this.bankTransactions().length ? Math.round((this.matchedTransactions() / this.bankTransactions().length) * 100) : 0; }

  advancePo(order: PurchaseOrder, status: string): void {
    this.saving.set(true); this.api.updatePurchaseOrder(order.id, status).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.showToast(`Purchase order moved to ${this.pretty(status)}`); this.loadCurrent(); }, error: (err) => this.fail(err) });
  }
  nextPoAction(order: PurchaseOrder): { status: string; label: string } | null {
    if (order.status === 'draft') return { status: 'pending_approval', label: 'Submit' };
    if (order.status === 'pending_approval') return { status: 'approved', label: 'Approve' };
    if (order.status === 'approved') return { status: 'ordered', label: 'Mark ordered' };
    if (['ordered', 'partially_received'].includes(order.status)) return { status: 'received', label: 'Receive' };
    return null;
  }

  addInvoiceLine(): void { this.invoiceForm.items.push({ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }); }
  removeInvoiceLine(index: number): void { if (this.invoiceForm.items.length > 1) this.invoiceForm.items.splice(index, 1); }
  invoiceSubtotal(): number { return this.invoiceForm.items.reduce((sum: number, line: any) => sum + (+line.quantity || 0) * (+line.unit_price || 0), 0); }
  invoiceTax(): number { return this.invoiceForm.items.reduce((sum: number, line: any) => sum + (+line.quantity || 0) * (+line.unit_price || 0) * ((+line.tax_rate || 0) / 100), 0); }
  addPoLine(): void { this.poForm.items.push({ description: '', sku: '', quantity: 1, unit_cost: 0, tax_rate: 0 }); }
  removePoLine(index: number): void { if (this.poForm.items.length > 1) this.poForm.items.splice(index, 1); }
  poSubtotal(): number { return this.poForm.items.reduce((sum: number, line: any) => sum + (+line.quantity || 0) * (+line.unit_cost || 0), 0); }
  poTax(): number { return this.poForm.items.reduce((sum: number, line: any) => sum + (+line.quantity || 0) * (+line.unit_cost || 0) * ((+line.tax_rate || 0) / 100), 0); }

  vendors(): AccountingContact[] { return this.contacts().filter((contact) => ['vendor', 'both'].includes(contact.type)); }
  chooseExpenseVendor(id: string | number): void { const vendor = this.contacts().find((contact) => contact.id === +id); if (vendor) this.expenseForm.vendor_name = vendor.name; }
  choosePoVendor(id: string | number): void { const vendor = this.contacts().find((contact) => contact.id === +id); if (vendor) this.poForm.vendor_name = vendor.name; }
  relatedPayment(payment: AccountingPayment): string { return payment.invoice?.number || payment.expense?.number || 'Manual entry'; }
  paymentSum(direction: 'incoming' | 'outgoing'): number { return this.payments().filter((p) => p.direction === direction).reduce((sum, p) => sum + +p.amount, 0); }
  initials(name: string): string { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
  pretty(value: string): string { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }

  barHeight(value: number, dashboard: AccountingDashboard): number { const max = Math.max(1, ...dashboard.cash_flow.flatMap((point) => [point.incoming, point.outgoing])); return Math.max(value ? 4 : 0, Math.round((value / max) * 100)); }
  agingRows(dashboard: AccountingDashboard): { label: string; value: number; percent: number }[] {
    const total = Math.max(1, Object.values(dashboard.aging).reduce((sum, value) => sum + value, 0));
    return [
      ['Current', dashboard.aging.current], ['1–30 days', dashboard.aging['1_30']], ['31–60 days', dashboard.aging['31_60']], ['61–90 days', dashboard.aging['61_90']], ['90+ days', dashboard.aging.over_90],
    ].map(([label, value]) => ({ label: String(label), value: +value, percent: Math.round((+value / total) * 100) }));
  }

  private loadContacts(): void { this.api.accountingContacts({ per_page: 100 }).subscribe({ next: (res) => this.contacts.set(res.data) }); }
  private loadAccountLookup(): void { this.api.accountingAccounts().subscribe({ next: (res) => this.allAccounts.set(res.data) }); }
  private save(request: any, message: string, after?: () => void): void {
    this.saving.set(true); this.error.set('');
    request.pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.drawer.set(null); if (after) after(); this.showToast(message); this.loadCurrent(); }, error: (err: any) => this.fail(err) });
  }
  private fail(err: any): void { const errors = err?.error?.errors; const first = errors ? Object.values(errors).flat()[0] : null; this.error.set(String(first || err?.error?.message || 'Something went wrong. Please try again.')); }
  private showToast(message: string): void { this.toast.set(message); setTimeout(() => this.toast.set(''), 3000); }
  private date(offsetDays = 0): string { const date = new Date(); date.setDate(date.getDate() + offsetDays); return date.toISOString().slice(0, 10); }
  private yearStart(): string { const date = new Date(); date.setMonth(0, 1); return date.toISOString().slice(0, 10); }
  private freshInvoice(): any { return { customer_name: '', customer_email: '', issue_date: this.date(), due_date: this.date(30), currency: this.currency(), notes: '', send_now: true, items: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] }; }
  private freshExpense(): any { return { vendor_id: '', vendor_name: '', category: 'Inventory', description: '', expense_date: this.date(), due_date: this.date(14), amount: 0, tax_amount: 0, currency: this.currency(), status: 'pending', receipt_reference: '', notes: '' }; }
  private freshPo(): any { return { vendor_id: '', vendor_name: '', order_date: this.date(), expected_date: this.date(14), currency: this.currency(), notes: '', submit_for_approval: true, items: [{ description: '', sku: '', quantity: 1, unit_cost: 0, tax_rate: 0 }] }; }
  private freshContact(): any { return { type: 'vendor', name: '', email: '', phone: '', tax_id: '', address: '', currency: this.currency(), payment_terms: 30, opening_balance: 0 }; }
  private freshPayment(): any { return { amount: 0, paid_on: this.date(), method: 'bank_transfer', reference: '', notes: '' }; }
  private freshAccount(): any { return { code: '', name: '', type: 'expense', subtype: '', description: '' }; }
  private freshJournal(): any { return { entry_date: this.date(), reference: '', memo: '', post_now: true, lines: [{ account_id: '', description: '', debit: 0, credit: 0 }, { account_id: '', description: '', debit: 0, credit: 0 }] }; }
  private freshBankTransaction(): any { return { bank_account_id: this.bankAccounts()[0]?.id || '', transaction_date: this.date(), description: '', reference: '', amount: 0 }; }
}
