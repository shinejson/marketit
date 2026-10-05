import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import {
  SalesCustomer,
  SalesDashboard,
  SalesLead,
  SalesOpportunity,
  SalesQuote,
} from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type SalesPage = 'overview' | 'leads' | 'pipeline' | 'quotes' | 'customers';
type Drawer = 'lead' | 'convert' | 'opportunity' | 'loseOpportunity' | 'quote' | 'customer' | null;

@Component({
  selector: 'app-seller-sales',
  imports: [FormsModule, MoneyPipe, DatePipe, RouterLink],
  template: `
    <div class="sales-shell">
      <header class="page-head">
        <div>
          <div class="breadcrumbs"><a routerLink="/tenant">Workspace</a><span>/</span><span>Sales</span><span>/</span><b>{{ pageTitle() }}</b></div>
          <p class="eyebrow">Sales &amp; pipeline</p>
          <h1>{{ pageTitle() }}</h1>
          <p class="intro">{{ pageDescription() }}</p>
        </div>
        <div class="head-actions">
          @if (page() === 'overview') {
            <button class="btn ghost small" type="button" (click)="open('lead')">+ Capture lead</button>
            <button class="btn primary" type="button" (click)="open('quote')">+ New quote</button>
          }
          @if (page() === 'leads') { <button class="btn primary" type="button" (click)="open('lead')">+ Capture lead</button> }
          @if (page() === 'pipeline') { <button class="btn primary" type="button" (click)="open('opportunity')">+ New opportunity</button> }
          @if (page() === 'quotes') { <button class="btn primary" type="button" (click)="open('quote')">+ New quote</button> }
          @if (page() === 'customers') { <button class="btn primary" type="button" (click)="open('customer')">+ Add customer</button> }
        </div>
      </header>

      <nav class="mobile-tabs" aria-label="Sales pages">
        @for (item of sections; track item.key) {
          <a [routerLink]="salesLink(item.path)" [class.active]="page() === item.key">{{ item.label }}</a>
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
                <article class="metric-card pipeline">
                  <div class="metric-top"><span class="metric-icon">◈</span><span class="trend">{{ d.kpis.open_opportunities }} open deals</span></div>
                  <p>Open pipeline</p><h2>{{ d.kpis.pipeline_value | money:d.currency:'symbol':'1.0-0' }}</h2>
                  <small>Weighted forecast {{ d.kpis.weighted_forecast | money:d.currency:'symbol':'1.0-0' }}</small>
                </article>
                <article class="metric-card">
                  <div class="metric-top"><span class="metric-icon blue">◎</span><span class="trend">+{{ d.kpis.new_leads_30d }} in 30d</span></div>
                  <p>Active leads</p><h2>{{ d.kpis.active_leads }}</h2>
                  <small>New, contacted and qualified leads</small>
                </article>
                <article class="metric-card">
                  <div class="metric-top"><span class="metric-icon amber">↗</span><span class="trend">{{ d.kpis.open_quotes }} awaiting</span></div>
                  <p>Open quotes</p><h2>{{ d.kpis.open_quotes_value | money:d.currency:'symbol':'1.0-0' }}</h2>
                  <small>Sent and pending a decision</small>
                </article>
                <article class="metric-card">
                  <div class="metric-top"><span class="metric-icon plum">◍</span><span class="trend" [class.warning]="d.kpis.win_rate < 40">{{ d.kpis.won_revenue_30d | money:d.currency:'symbol':'1.0-0' }} won 30d</span></div>
                  <p>Win rate</p><h2>{{ d.kpis.win_rate }}%</h2>
                  <small>Won vs lost opportunities, all time</small>
                </article>
              </section>

              <section class="overview-grid">
                <article class="panel forecast-panel">
                  <div class="panel-head"><div><p class="overline">Pipeline movement</p><h3>New pipeline vs won</h3></div><span class="legend"><i></i>Opened <i></i>Won</span></div>
                  <div class="trend-chart" aria-label="Six month pipeline and closed-won chart">
                    @for (point of d.trend; track point.month) {
                      <div class="chart-column">
                        <div class="bars">
                          <span class="bar opened" [style.height.%]="barHeight(point.opened, d)"><b>{{ point.opened | money:d.currency:'symbol':'1.0-0' }}</b></span>
                          <span class="bar booked" [style.height.%]="barHeight(point.won, d)"><b>{{ point.won | money:d.currency:'symbol':'1.0-0' }}</b></span>
                        </div>
                        <small>{{ point.label }}</small>
                      </div>
                    }
                  </div>
                </article>

                <article class="panel funnel-panel">
                  <div class="panel-head"><div><p class="overline">Funnel coverage</p><h3>Pipeline by stage</h3></div><a [routerLink]="salesLink('sales/pipeline')">Open pipeline →</a></div>
                  @for (stage of openStages(d); track stage.stage) {
                    <div class="funnel-row">
                      <div><span>{{ stage.label }}</span><strong>{{ stage.value | money:d.currency:'symbol':'1.0-0' }}</strong></div>
                      <div class="progress"><span [style.width.%]="stageWidth(stage.value, d)"></span></div>
                      <small>{{ stage.count }} deal{{ stage.count === 1 ? '' : 's' }} · {{ stage.probability }}% weighted</small>
                    </div>
                  }
                  <div class="funnel-foot">
                    <span class="won-chip">✓ {{ stageOf(d, 'won').count }} won</span>
                    <span>{{ stageOf(d, 'won').value | money:d.currency:'symbol':'1.0-0' }} closed-won</span>
                  </div>
                </article>
              </section>

              <section class="lower-grid">
                <article class="panel activity-panel">
                  <div class="panel-head"><div><p class="overline">Team stream</p><h3>Recent activity</h3></div><span class="live-dot">Live</span></div>
                  @if (!d.recent_activity.length) { <div class="empty-state">Activity appears here as the sales team works.</div> }
                  @for (item of d.recent_activity; track item.type + item.title + item.at) {
                    <div class="activity-row">
                      <span [class]="'activity-icon ' + item.type">{{ item.type === 'lead' ? '◎' : item.type === 'opportunity' ? '◈' : '↗' }}</span>
                      <div><strong>{{ item.title }}</strong><small>{{ item.type.replace('_', ' ') }} · {{ item.at | date:'MMM d, h:mm a' }}</small></div>
                      <div class="activity-value"><strong>{{ item.amount | money:d.currency:'symbol':'1.0-0' }}</strong><span [class]="'status ' + item.status">{{ pretty(item.status) }}</span></div>
                    </div>
                  }
                </article>

                <aside class="side-stack">
                  <article class="panel quick-panel">
                    <p class="overline">Quick create</p><h3>Keep deals moving</h3>
                    <button type="button" (click)="open('lead')"><span>◎</span><div><b>Capture lead</b><small>Log inbound interest</small></div><i>→</i></button>
                    <button type="button" (click)="open('opportunity')"><span>◈</span><div><b>New opportunity</b><small>Add a deal to the pipeline</small></div><i>→</i></button>
                    <button type="button" (click)="open('quote')"><span>↗</span><div><b>Send a quote</b><small>Price a deal for a customer</small></div><i>→</i></button>
                  </article>
                  <article class="sources-card panel">
                    <div class="panel-head"><div><p class="overline">Acquisition</p><h3>Lead sources</h3></div></div>
                    @for (row of sourceRows(d); track row.source) {
                      <div class="source-row"><span [class]="'source-dot ' + row.source"></span><b>{{ pretty(row.source) }}</b><span>{{ row.count }}</span></div>
                    } @empty { <div class="empty-state">Capture leads to see channel mix.</div> }
                  </article>
                </aside>
              </section>

              @if (d.top_customers.length) {
                <section class="panel accounts-panel">
                  <div class="panel-head"><div><p class="overline">Book of business</p><h3>Top accounts</h3></div><a [routerLink]="salesLink('sales/customers')">All customers →</a></div>
                  <div class="accounts-grid">
                    @for (account of d.top_customers; track account.id) {
                      <div class="account-chip">
                        <span class="avatar">{{ initials(account.name) }}</span>
                        <div><strong>{{ account.company || account.name }}</strong><small>{{ account.open_deals_count }} open deal{{ account.open_deals_count === 1 ? '' : 's' }}</small></div>
                        <b>{{ account.won_total | money:d.currency:'symbol':'1.0-0' }} <small>won</small></b>
                      </div>
                    }
                  </div>
                </section>
              }
            }
          }

          @case ('leads') {
            <section class="summary-strip">
              <div><span class="summary-icon new">◎</span><p>New this view</p><strong>{{ countByStatus('new') }}</strong></div>
              <div><span class="summary-icon qualified">◍</span><p>Qualified</p><strong>{{ countByStatus('qualified') }}</strong></div>
              <div><span class="summary-icon conv">✓</span><p>Converted</p><strong>{{ countByStatus('converted') }}</strong></div>
              <div><span class="summary-icon value">≈</span><p>Leads pipeline</p><strong>{{ leadEstValue() | money:currency() }}</strong></div>
            </section>
            <section class="process-rail">
              <div><span>1</span><b>New</b><small>Fresh inbound interest</small></div><i>→</i>
              <div><span>2</span><b>Contacted</b><small>First touch logged</small></div><i>→</i>
              <div><span>3</span><b>Qualified</b><small>Budget &amp; fit confirmed</small></div><i>→</i>
              <div><span>4</span><b>Converted</b><small>Customer + deal created</small></div>
            </section>
            <section class="table-panel panel">
              <div class="table-toolbar">
                <div class="search-box"><span>⌕</span><input placeholder="Search name, company or contact" [(ngModel)]="search" (keyup.enter)="loadCurrent()" /></div>
                <select [(ngModel)]="statusFilter" (change)="loadCurrent()"><option value="">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="disqualified">Disqualified</option><option value="converted">Converted</option></select>
                <button class="filter-go" type="button" (click)="loadCurrent()">Filter</button>
              </div>
              <div class="table-wrap"><table>
                <thead><tr><th>Lead</th><th>Contact</th><th>Source</th><th>Owner</th><th>Status</th><th class="right">Est. value</th><th></th></tr></thead>
                <tbody>
                  @for (lead of leads(); track lead.id) {
                    <tr>
                      <td><strong>{{ lead.name }}</strong><small>{{ lead.company || 'Independent' }}</small></td>
                      <td><strong>{{ lead.email || '—' }}</strong><small>{{ lead.phone || 'No phone' }}</small></td>
                      <td><span class="category-chip">{{ pretty(lead.source) }}</span></td>
                      <td>{{ lead.owner?.name || 'Unassigned' }}</td>
                      <td><span [class]="'status ' + lead.status">{{ pretty(lead.status) }}</span></td>
                      <td class="right"><strong>{{ lead.estimated_value | money:lead.currency }}</strong></td>
                      <td class="actions">
                        @if (lead.status === 'new') { <button type="button" (click)="advanceLead(lead, 'contacted')">Log contact</button><button type="button" (click)="advanceLead(lead, 'qualified')">Qualify</button> }
                        @if (lead.status === 'contacted') { <button type="button" (click)="advanceLead(lead, 'qualified')">Qualify</button> }
                        @if (lead.status === 'qualified') { <button type="button" class="primary-action" (click)="openConvert(lead)">Convert</button><button type="button" (click)="advanceLead(lead, 'disqualified')">Disqualify</button> }
                        @if (lead.status === 'disqualified') { <button type="button" (click)="advanceLead(lead, 'new')">Reopen</button> }
                        @if (lead.status === 'converted') { <span class="paid-check">✓</span> }
                      </td>
                    </tr>
                  } @empty { <tr><td colspan="7"><div class="empty-state"><b>No leads found</b><span>Capture a lead or loosen your filters.</span></div></td></tr> }
                </tbody>
              </table></div>
              <div class="table-foot"><span>Showing {{ leads().length }} of {{ total() }} leads</span><span>Converting creates the customer and opportunity for you</span></div>
            </section>
          }

          @case ('pipeline') {
            <section class="stage-rail">
              @for (stage of stages; track stage.key) {
                <button type="button" [class.active]="statusFilter === stage.key" (click)="filterStage(stage.key)">
                  <span [class]="'stage-dot ' + stage.key"></span>
                  <div><b>{{ stage.label }}</b><small>{{ stageCount(stage.key) }} deals · {{ stageValue(stage.key) | money:currency() }}</small></div>
                </button>
              }
            </section>
            <section class="summary-strip">
              <div><span class="summary-icon new">◈</span><p>Open pipeline</p><strong>{{ openPipelineSummary().value | money:currency() }}</strong></div>
              <div><span class="summary-icon value">≈</span><p>Weighted forecast</p><strong>{{ openPipelineSummary().weighted | money:currency() }}</strong></div>
              <div><span class="summary-icon conv">✓</span><p>Average open deal</p><strong>{{ openPipelineSummary().average | money:currency() }}</strong></div>
            </section>
            <section class="table-panel panel">
              <div class="table-toolbar">
                <div class="search-box"><span>⌕</span><input placeholder="Search deal number or title" [(ngModel)]="search" (keyup.enter)="loadCurrent()" /></div>
                <select [(ngModel)]="statusFilter" (change)="loadCurrent()"><option value="">Open stages</option><option value="prospecting">Prospecting</option><option value="qualified">Qualified</option><option value="proposal">Proposal</option><option value="negotiation">Negotiation</option><option value="won">Won</option><option value="lost">Lost</option></select>
                <button class="filter-go" type="button" (click)="loadCurrent()">Filter</button>
              </div>
              <div class="table-wrap"><table>
                <thead><tr><th>Opportunity</th><th>Customer</th><th>Owner</th><th>Close date</th><th>Stage</th><th class="right">Value</th><th class="right">Prob.</th><th></th></tr></thead>
                <tbody>
                  @for (deal of opportunities(); track deal.id) {
                    <tr>
                      <td><strong class="mono">{{ deal.number }}</strong><small>{{ deal.title }}</small></td>
                      <td><strong>{{ deal.customer?.company || deal.customer?.name || 'No account' }}</strong><small>{{ deal.lead ? 'From lead · ' + deal.lead.name : 'Direct' }}</small></td>
                      <td>{{ deal.owner?.name || 'Unassigned' }}</td>
                      <td>{{ deal.expected_close_date ? (deal.expected_close_date | date:'MMM d, y') : '—' }}</td>
                      <td><span [class]="'status ' + deal.stage">{{ pretty(deal.stage) }}</span>@if (deal.lost_reason) { <small class="lost-reason">{{ deal.lost_reason }}</small> }</td>
                      <td class="right"><strong>{{ deal.expected_value | money:deal.currency }}</strong></td>
                      <td class="right">{{ deal.probability }}%</td>
                      <td class="actions">
                        @if (nextStage(deal); as next) { <button type="button" (click)="advanceDeal(deal, next.key)">{{ next.label }}</button> }
                        @if (!['won','lost'].includes(deal.stage) && deal.stage === 'negotiation') { <button type="button" (click)="advanceDeal(deal, 'won')">Won</button> }
                        @if (!['won','lost'].includes(deal.stage)) { <button type="button" (click)="openLose(deal)">Lost</button> }
                        @if (deal.stage === 'won') { <span class="paid-check">✓</span> }
                        @if (deal.stage === 'lost') { <button type="button" (click)="advanceDeal(deal, 'prospecting')">Reopen</button> }
                      </td>
                    </tr>
                  } @empty { <tr><td colspan="8"><div class="empty-state"><b>No opportunities found</b><span>Create a deal or convert a qualified lead.</span></div></td></tr> }
                </tbody>
              </table></div>
              <div class="table-foot"><span>Showing {{ opportunities().length }} of {{ total() }} opportunities</span><span>Probability follows the stage unless you set a close-date plan</span></div>
            </section>
          }

          @case ('quotes') {
            <section class="summary-strip">
              <div><span class="summary-icon new">◌</span><p>Draft value</p><strong>{{ quoteSum('draft') | money:currency() }}</strong></div>
              <div><span class="summary-icon qualified">↗</span><p>Awaiting decision</p><strong>{{ quoteSum('sent') | money:currency() }}</strong></div>
              <div><span class="summary-icon conv">✓</span><p>Accepted</p><strong>{{ quoteSum('accepted') | money:currency() }}</strong></div>
              <div><span class="summary-icon out">×</span><p>Lost quotes</p><strong>{{ quoteSum('declined') + quoteSum('expired') | money:currency() }}</strong></div>
            </section>
            <section class="table-panel panel">
              <div class="table-toolbar">
                <div class="search-box"><span>⌕</span><input placeholder="Search number, customer or email" [(ngModel)]="search" (keyup.enter)="loadCurrent()" /></div>
                <select [(ngModel)]="statusFilter" (change)="loadCurrent()"><option value="">All statuses</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="declined">Declined</option><option value="expired">Expired</option><option value="void">Void</option></select>
                <select [(ngModel)]="sourceFilter" (change)="loadCurrent()"><option value="">Every origin</option><option value="customer_request">Customer requests</option><option value="staff">Staff created</option></select>
                <button class="filter-go" type="button" (click)="loadCurrent()">Filter</button>
              </div>
              <div class="table-wrap"><table>
                <thead><tr><th>Quote</th><th>Customer</th><th>Issued</th><th>Expires</th><th>Linked deal</th><th>Status</th><th class="right">Total</th><th></th></tr></thead>
                <tbody>
                  @for (quote of quotes(); track quote.id) {
                    <tr [class.request-row]="quote.source === 'customer_request'">
                      <td>
                        <strong class="mono">{{ quote.number }}</strong>
                        @if (quote.source === 'customer_request') { <small><span class="rfq-badge" [attr.title]="quote.request_message || 'Requested from the storefront'">⇄ Customer request</span></small> }
                      </td>
                      <td><strong>{{ quote.customer_name }}</strong><small>{{ quote.customer_email || 'No email' }}</small></td>
                      <td>{{ quote.issue_date | date:'MMM d, y' }}</td><td>{{ quote.expiry_date | date:'MMM d, y' }}</td>
                      <td>@if (quote.opportunity) { <strong>{{ quote.opportunity.number }}</strong><small>{{ quote.opportunity.title }}</small> } @else { <span class="muted-cell">Not linked</span> }</td>
                      <td><span [class]="'status ' + quote.status">{{ quote.status === 'draft' && quote.source === 'customer_request' ? 'Awaiting pricing' : pretty(quote.status) }}</span></td>
                      <td class="right"><strong>{{ quote.total | money:quote.currency }}</strong></td>
                      <td class="actions">
                        @if (quote.status === 'draft') { <button type="button" [class.primary-action]="quote.source === 'customer_request'" (click)="openEditQuote(quote)">{{ quote.source === 'customer_request' ? 'Review & price' : 'Edit' }}</button> }
                        @if (quote.status === 'draft') { <button type="button" (click)="transitionQuote(quote, 'sent')">Send</button> }
                        @if (quote.status === 'sent') { <button type="button" class="primary-action" (click)="transitionQuote(quote, 'accepted')">Accept</button><button type="button" (click)="transitionQuote(quote, 'declined')">Decline</button> }
                        @if (quote.status === 'expired') { <button type="button" (click)="transitionQuote(quote, 'sent')">Resend</button> }
                        @if (['declined'].includes(quote.status)) { <button type="button" (click)="transitionQuote(quote, 'draft')">Reopen</button> }
                        @if (['draft','sent'].includes(quote.status)) { <button type="button" (click)="transitionQuote(quote, 'void')">Void</button> }
                        @if (quote.status === 'accepted') { <span class="paid-check">✓</span> }
                      </td>
                    </tr>
                  } @empty { <tr><td colspan="8"><div class="empty-state"><b>No quotes found</b><span>Create a quote or change your filters.</span></div></td></tr> }
                </tbody>
              </table></div>
              <div class="table-foot"><span>Showing {{ quotes().length }} of {{ total() }} quotes</span><span>Accepting a quote wins the linked opportunity</span></div>
            </section>
          }

          @case ('customers') {
            <section class="contact-grid">
              @for (customer of customers(); track customer.id) {
                <article class="contact-card panel">
                  <div class="contact-head"><span>{{ initials(customer.name) }}</span><div><h3>{{ customer.name }}</h3><p>{{ customer.company || 'Independent account' }}</p></div><i [class.inactive]="customer.status !== 'active'"></i></div>
                  <dl>
                    <div><dt>Email</dt><dd>{{ customer.email || '—' }}</dd></div>
                    <div><dt>Phone</dt><dd>{{ customer.phone || '—' }}</dd></div>
                    <div><dt>Segment</dt><dd>{{ pretty(customer.segment) }}</dd></div>
                    <div><dt>Currency</dt><dd>{{ customer.currency }}</dd></div>
                  </dl>
                  <footer>
                    <span>{{ customer.open_deals_count || 0 }} open deals</span>
                    <span>{{ customer.won_total || 0 | money:customer.currency }} won</span>
                  </footer>
                </article>
              } @empty { <div class="panel empty-state"><b>No customers yet</b><span>Convert a qualified lead or add a customer directly.</span></div> }
            </section>
          }
        }
      }
    </div>

    @if (drawer()) {
      <div class="drawer-backdrop" (click)="closeDrawer()"></div>
      <aside class="drawer" role="dialog" aria-modal="true">
        <header><div><p class="eyebrow">{{ drawerEyebrow() }}</p><h2>{{ drawerTitle() }}</h2></div><button type="button" (click)="closeDrawer()" aria-label="Close">×</button></header>
        <div class="drawer-body">
          @if (drawer() === 'lead') {
            <form id="sales-form" (ngSubmit)="createLead()">
              <div class="form-grid two"><label>Full name<input required [(ngModel)]="leadForm.name" name="name" placeholder="e.g. Nana Kufuor" /></label><label>Company<input [(ngModel)]="leadForm.company" name="company" placeholder="Business or store" /></label></div>
              <div class="form-grid two"><label>Email<input type="email" [(ngModel)]="leadForm.email" name="email" placeholder="buyer@company.com" /></label><label>Phone<input [(ngModel)]="leadForm.phone" name="phone" placeholder="+233 ..." /></label></div>
              <div class="form-grid two"><label>Source<select required [(ngModel)]="leadForm.source" name="source">@for (source of leadSources; track source) { <option [value]="source">{{ pretty(source) }}</option> }</select></label><label>Estimated value<input type="number" min="0" step="0.01" [(ngModel)]="leadForm.estimated_value" name="estimated_value" /></label></div>
              <label class="textarea-label">Notes<textarea rows="3" [(ngModel)]="leadForm.notes" name="notes" placeholder="What are they asking for? Budget signals, timing…"></textarea></label>
            </form>
          }

          @if (drawer() === 'convert') {
            <div class="payment-context"><span>Converting</span><strong>{{ selectedLead()?.name }}</strong><p>{{ selectedLead()?.company || 'Independent' }}</p><div><small>Estimated value</small><b>{{ selectedLead()?.estimated_value | money:selectedLead()?.currency }}</b></div></div>
            <form id="sales-form" (ngSubmit)="convertLead()">
              <div class="form-grid two"><label>Customer name<input required [(ngModel)]="convertForm.customer_name" name="c_name" /></label><label>Company<input [(ngModel)]="convertForm.customer_company" name="c_company" /></label></div>
              <div class="form-grid two"><label>Email<input type="email" [(ngModel)]="convertForm.customer_email" name="c_email" /></label><label>Phone<input [(ngModel)]="convertForm.customer_phone" name="c_phone" /></label></div>
              <label>Segment<select [(ngModel)]="convertForm.segment" name="c_segment">@for (segment of segments; track segment) { <option [value]="segment">{{ pretty(segment) }}</option> }</select></label>
              <div class="line-head"><div><h3>Opening opportunity</h3><p>Created and linked to the customer</p></div></div>
              <label>Opportunity title<input required [(ngModel)]="convertForm.opportunity_title" name="c_title" /></label>
              <div class="form-grid two"><label>Expected value<input type="number" min="0" step="0.01" [(ngModel)]="convertForm.expected_value" name="c_value" /></label><label>Expected close<input type="date" [(ngModel)]="convertForm.expected_close_date" name="c_close" /></label></div>
              <div class="control-note"><span>✓</span><p><b>One-step handoff</b>Converting marks the lead converted, opens the customer account and places the deal at the qualified stage.</p></div>
            </form>
          }

          @if (drawer() === 'opportunity') {
            <form id="sales-form" (ngSubmit)="createOpportunity()">
              <label>Opportunity title<input required [(ngModel)]="opportunityForm.title" name="o_title" placeholder="e.g. Quarterly restock contract" /></label>
              <div class="form-grid two"><label>Customer<select [(ngModel)]="opportunityForm.customer_id" name="o_customer"><option value="">No account yet</option>@for (customer of customers(); track customer.id) { <option [value]="customer.id">{{ customer.company || customer.name }}</option> }</select></label><label>Stage<select required [(ngModel)]="opportunityForm.stage" name="o_stage" (ngModelChange)="applyStageProbability($event)"><option value="prospecting">Prospecting</option><option value="qualified">Qualified</option><option value="proposal">Proposal</option><option value="negotiation">Negotiation</option></select></label></div>
              <div class="form-grid two"><label>Expected value<input required type="number" min="0" step="0.01" [(ngModel)]="opportunityForm.expected_value" name="o_value" /></label><label>Close probability %<input type="number" min="0" max="100" [(ngModel)]="opportunityForm.probability" name="o_probability" /></label></div>
              <div class="form-grid two"><label>Expected close<input type="date" [(ngModel)]="opportunityForm.expected_close_date" name="o_close" /></label><label>Currency<input [(ngModel)]="opportunityForm.currency" name="o_currency" maxlength="3" /></label></div>
              <label class="textarea-label">Notes<textarea rows="3" [(ngModel)]="opportunityForm.notes" name="o_notes" placeholder="Decision makers, next step, competition…"></textarea></label>
            </form>
          }

          @if (drawer() === 'loseOpportunity') {
            <div class="payment-context lost"><span>Marking lost</span><strong>{{ selectedOpportunity()?.number }}</strong><p>{{ selectedOpportunity()?.title }}</p><div><small>Pipeline value removed</small><b>{{ selectedOpportunity()?.expected_value | money:selectedOpportunity()?.currency }}</b></div></div>
            <form id="sales-form" (ngSubmit)="loseOpportunity()">
              <label>Reason lost<input required [(ngModel)]="loseForm.lost_reason" name="lost_reason" placeholder="e.g. Chosen a competitor on price" /></label>
              <div class="control-note"><span>i</span><p><b>Win/loss hygiene</b>Honest loss reasons power better forecasting and coaching.</p></div>
            </form>
          }

          @if (drawer() === 'quote') {
            <form id="sales-form" (ngSubmit)="createQuote()">
              <div class="form-grid two"><label>Customer account<select [(ngModel)]="quoteForm.customer_id" name="q_customer" (ngModelChange)="chooseQuoteCustomer($event)"><option value="">One-off customer</option>@for (customer of customers(); track customer.id) { <option [value]="customer.id">{{ customer.company || customer.name }}</option> }</select></label><label>Customer name<input required [(ngModel)]="quoteForm.customer_name" name="q_name" /></label></div>
              <div class="form-grid two"><label>Customer email<input type="email" [(ngModel)]="quoteForm.customer_email" name="q_email" /></label><label>Linked opportunity<select [(ngModel)]="quoteForm.opportunity_id" name="q_opportunity"><option value="">None</option>@for (deal of openOpportunities(); track deal.id) { <option [value]="deal.id">{{ deal.number }} · {{ deal.title }}</option> }</select></label></div>
              <div class="form-grid two"><label>Issue date<input type="date" required [(ngModel)]="quoteForm.issue_date" name="q_issue" /></label><label>Expiry date<input type="date" required [(ngModel)]="quoteForm.expiry_date" name="q_expiry" /></label></div>
              <div class="line-head"><div><h3>Quote lines</h3><p>Products, services or packages</p></div><button type="button" (click)="addQuoteLine()">+ Add line</button></div>
              <div class="line-table">
                <div class="line-labels"><span>Description</span><span>Qty</span><span>Rate</span><span>Tax %</span><span></span></div>
                @for (line of quoteForm.items; track $index; let i = $index) {
                  <div class="line-inputs">
                    <input required [(ngModel)]="line.description" [name]="'q_desc_'+i" placeholder="Item or service" />
                    <input required type="number" min="0.01" step="0.01" [(ngModel)]="line.quantity" [name]="'q_qty_'+i" />
                    <input required type="number" min="0" step="0.01" [(ngModel)]="line.unit_price" [name]="'q_rate_'+i" />
                    <input type="number" min="0" max="100" step="0.01" [(ngModel)]="line.tax_rate" [name]="'q_tax_'+i" />
                    <button type="button" (click)="removeQuoteLine(i)" [disabled]="quoteForm.items.length === 1">×</button>
                  </div>
                }
              </div>
              <div class="totals"><div><span>Subtotal</span><b>{{ quoteSubtotal() | money:quoteForm.currency }}</b></div><div><span>Tax</span><b>{{ quoteTax() | money:quoteForm.currency }}</b></div><div class="grand"><span>Total</span><b>{{ quoteSubtotal() + quoteTax() | money:quoteForm.currency }}</b></div></div>
              <label class="textarea-label">Notes<textarea [(ngModel)]="quoteForm.notes" name="q_notes" rows="3" placeholder="Validity terms, scope, delivery promise…"></textarea></label>
              <label class="check"><input type="checkbox" [(ngModel)]="quoteForm.send_now" name="q_send" /><span><b>Mark ready to send</b><small>Moves this quote out of draft so it can be accepted</small></span></label>
            </form>
          }

          @if (drawer() === 'customer') {
            <form id="sales-form" (ngSubmit)="createCustomer()">
              <div class="form-grid two"><label>Contact name<input required [(ngModel)]="customerForm.name" name="cu_name" /></label><label>Company<input [(ngModel)]="customerForm.company" name="cu_company" /></label></div>
              <div class="form-grid two"><label>Email<input type="email" [(ngModel)]="customerForm.email" name="cu_email" /></label><label>Phone<input [(ngModel)]="customerForm.phone" name="cu_phone" /></label></div>
              <div class="form-grid two"><label>Segment<select [(ngModel)]="customerForm.segment" name="cu_segment">@for (segment of segments; track segment) { <option [value]="segment">{{ pretty(segment) }}</option> }</select></label><label>Currency<input [(ngModel)]="customerForm.currency" name="cu_currency" maxlength="3" /></label></div>
              <label class="textarea-label">Account notes<textarea rows="4" [(ngModel)]="customerForm.notes" name="cu_notes" placeholder="Buying patterns, terms, key dates…"></textarea></label>
            </form>
          }
        </div>
        <footer><button type="button" class="btn ghost" (click)="closeDrawer()">Cancel</button><button type="submit" form="sales-form" class="btn primary" [disabled]="saving()">{{ saving() ? 'Saving…' : drawerSubmitLabel() }}</button></footer>
      </aside>
    }
  `,
})
export class SellerSalesComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  readonly sections: { key: SalesPage; label: string; path: string }[] = [
    { key: 'overview', label: 'Overview', path: 'departments/sales' },
    { key: 'leads', label: 'Leads', path: 'sales/leads' },
    { key: 'pipeline', label: 'Pipeline', path: 'sales/pipeline' },
    { key: 'quotes', label: 'Quotes', path: 'sales/quotes' },
    { key: 'customers', label: 'Customers', path: 'sales/customers' },
  ];
  readonly leadSources = ['web', 'referral', 'campaign', 'walk_in', 'partner', 'other'];
  readonly segments = ['standard', 'wholesale', 'retail', 'enterprise', 'vip'];
  readonly stages = [
    { key: 'prospecting', label: 'Prospecting' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'proposal', label: 'Proposal' },
    { key: 'negotiation', label: 'Negotiation' },
  ];
  readonly stageProbability: Record<string, number> = { prospecting: 20, qualified: 40, proposal: 60, negotiation: 80 };

  page = signal<SalesPage>('overview');
  drawer = signal<Drawer>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  toast = signal('');
  total = signal(0);
  dashboard = signal<SalesDashboard | null>(null);
  leads = signal<SalesLead[]>([]);
  opportunities = signal<SalesOpportunity[]>([]);
  quotes = signal<SalesQuote[]>([]);
  customers = signal<SalesCustomer[]>([]);
  selectedLead = signal<SalesLead | null>(null);
  selectedOpportunity = signal<SalesOpportunity | null>(null);
  search = '';
  statusFilter = '';
  sourceFilter = '';
  currency = signal('USD');

  leadForm = this.freshLead();
  convertForm = this.freshConvert();
  opportunityForm = this.freshOpportunity();
  quoteForm = this.freshQuote();
  editingQuoteId = signal<number | null>(null);
  customerForm = this.freshCustomer();
  loseForm = { lost_reason: '' };

  constructor() {
    this.route.data.subscribe((data) => {
      this.page.set((data['page'] as SalesPage) || 'overview');
      this.search = '';
      this.statusFilter = '';
      this.loadCurrent();
    });
    this.loadCustomers();
  }

  pageTitle(): string {
    return ({ overview: 'Sales overview', leads: 'Leads', pipeline: 'Sales pipeline', quotes: 'Quotes', customers: 'Customers' } as Record<SalesPage, string>)[this.page()];
  }

  pageDescription(): string {
    return ({
      overview: 'A live view of your funnel: inbound leads, open pipeline, quotes and closed-won revenue.',
      leads: 'Capture inbound interest, qualify fit and convert the best leads into active deals.',
      pipeline: 'Move every opportunity from first contact to a clear won or lost decision.',
      quotes: 'Price deals professionally, track decisions and turn accepted quotes into won revenue.',
      customers: 'Your book of business — accounts, segments and lifetime deal value.',
    } as Record<SalesPage, string>)[this.page()];
  }

  salesLink(path: string): string { return `/tenant/${path}`; }

  loadCurrent(): void {
    this.loading.set(true); this.error.set('');
    const params: Record<string, string | number> = { per_page: 100 };
    if (this.search.trim()) params['search'] = this.search.trim();
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.sourceFilter) params['source'] = this.sourceFilter;
    const current = this.page();
    if (current === 'overview') {
      this.api.salesDashboard().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.dashboard.set(res.data); this.currency.set(res.data.currency); }, error: (err) => this.fail(err) });
    } else if (current === 'leads') {
      this.api.salesLeads(params).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.leads.set(res.data); this.total.set(res.meta.total); if (res.data[0]) this.currency.set(res.data[0].currency); }, error: (err) => this.fail(err) });
    } else if (current === 'pipeline') {
      this.api.salesOpportunities(params).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.opportunities.set(res.data); this.total.set(res.meta.total); if (res.data[0]) this.currency.set(res.data[0].currency); }, error: (err) => this.fail(err) });
      this.api.salesDashboard().subscribe({ next: (res) => this.dashboard.set(res.data) });
    } else if (current === 'quotes') {
      this.api.salesQuotes(params).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.quotes.set(res.data); this.total.set(res.meta.total); if (res.data[0]) this.currency.set(res.data[0].currency); }, error: (err) => this.fail(err) });
    } else {
      this.api.salesCustomers(params).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (res) => { this.customers.set(res.data); this.total.set(res.meta.total); }, error: (err) => this.fail(err) });
    }
  }

  open(kind: Exclude<Drawer, null>): void {
    this.editingQuoteId.set(null);
    if (kind === 'lead') this.leadForm = this.freshLead();
    if (kind === 'opportunity') { this.opportunityForm = this.freshOpportunity(); this.loadCustomers(); }
    if (kind === 'quote') { this.quoteForm = this.freshQuote(); this.loadCustomers(); this.loadOpenOpportunities(); }
    if (kind === 'customer') this.customerForm = this.freshCustomer();
    this.error.set(''); this.drawer.set(kind);
  }

  /** Reopen a draft quote (incl. customer requests) for a pricing review. */
  openEditQuote(quote: SalesQuote): void {
    this.editingQuoteId.set(quote.id);
    this.quoteForm = {
      customer_id: quote.customer_id ?? '',
      customer_name: quote.customer_name,
      customer_email: quote.customer_email || '',
      opportunity_id: quote.opportunity_id ?? '',
      issue_date: quote.issue_date,
      expiry_date: quote.expiry_date,
      currency: quote.currency,
      discount_total: +quote.discount_total || 0,
      notes: quote.notes || '',
      send_now: false,
      items: (quote.items || []).map((line) => ({
        description: line.description,
        quantity: +line.quantity,
        unit_price: +line.unit_price,
        tax_rate: +line.tax_rate || 0,
      })),
    };
    if (!this.quoteForm.items.length) this.quoteForm.items.push({ description: '', quantity: 1, unit_price: 0, tax_rate: 0 });
    this.loadCustomers(); this.loadOpenOpportunities();
    this.error.set(''); this.drawer.set('quote');
  }

  closeDrawer(): void { if (!this.saving()) { this.drawer.set(null); this.editingQuoteId.set(null); } }
  drawerTitle(): string {
    if (this.drawer() === 'quote' && this.editingQuoteId()) return 'Review & price quote';
    return ({ lead: 'Capture lead', convert: 'Convert lead', opportunity: 'New opportunity', loseOpportunity: 'Mark opportunity lost', quote: 'Create quote', customer: 'Add customer' } as Record<string, string>)[this.drawer() || ''] || '';
  }
  drawerEyebrow(): string { return this.drawer() === 'convert' ? 'Lead qualification' : this.drawer() === 'loseOpportunity' ? 'Pipeline review' : this.drawer() === 'quote' && this.editingQuoteId() ? 'Customer request' : 'Sales entry'; }
  drawerSubmitLabel(): string {
    if (this.drawer() === 'quote' && this.editingQuoteId()) return this.quoteForm.send_now ? 'Save & send quote' : 'Save changes';
    return ({ lead: 'Save lead', convert: 'Convert to customer & deal', opportunity: 'Create opportunity', loseOpportunity: 'Mark as lost', quote: 'Create quote', customer: 'Add customer' } as Record<string, string>)[this.drawer() || ''] || 'Save';
  }

  createLead(): void { this.save(this.api.createSalesLead(this.leadForm), 'Lead captured', () => { this.leadForm = this.freshLead(); }); }
  createOpportunity(): void { this.save(this.api.createSalesOpportunity(this.opportunityForm), 'Opportunity created', () => { this.opportunityForm = this.freshOpportunity(); }); }
  createQuote(): void {
    const editingId = this.editingQuoteId();
    if (editingId) {
      const { send_now, ...payload } = this.quoteForm;
      this.save(this.api.updateSalesQuoteFull(editingId, send_now ? { ...payload, status: 'sent' } : payload), send_now ? 'Quote sent to the customer' : 'Quote updated', () => { this.quoteForm = this.freshQuote(); });
      return;
    }
    this.save(this.api.createSalesQuote(this.quoteForm), 'Quote created', () => { this.quoteForm = this.freshQuote(); });
  }
  createCustomer(): void { this.save(this.api.createSalesCustomer(this.customerForm), 'Customer added', () => { this.customerForm = this.freshCustomer(); this.loadCustomers(); }); }

  advanceLead(lead: SalesLead, status: string): void {
    this.saving.set(true);
    this.api.updateSalesLead(lead.id, status).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.showToast(`Lead marked ${this.pretty(status)}`); this.loadCurrent(); }, error: (err) => this.fail(err) });
  }

  openConvert(lead: SalesLead): void {
    this.selectedLead.set(lead);
    this.convertForm = {
      ...this.freshConvert(),
      customer_name: lead.name,
      customer_company: lead.company || '',
      customer_email: lead.email || '',
      customer_phone: lead.phone || '',
      opportunity_title: `${lead.company || lead.name} — new opportunity`,
      expected_value: +lead.estimated_value,
    };
    this.drawer.set('convert');
  }

  convertLead(): void {
    const lead = this.selectedLead();
    if (!lead) return;
    this.save(this.api.convertSalesLead(lead.id, this.convertForm), 'Lead converted — customer and deal created');
  }

  nextStage(deal: SalesOpportunity): { key: SalesOpportunity['stage']; label: string } | null {
    if (deal.stage === 'prospecting') return { key: 'qualified', label: 'Qualify' };
    if (deal.stage === 'qualified') return { key: 'proposal', label: 'Proposal' };
    if (deal.stage === 'proposal') return { key: 'negotiation', label: 'Negotiate' };
    return null;
  }

  advanceDeal(deal: SalesOpportunity, stage: SalesOpportunity['stage'], lostReason: string | null = null): void {
    this.saving.set(true);
    this.api.updateSalesOpportunity(deal.id, { stage, lost_reason: lostReason }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.showToast(stage === 'won' ? 'Deal won — nice work' : stage === 'lost' ? 'Deal marked lost' : `Moved to ${this.pretty(stage)}`); this.drawer.set(null); this.loadCurrent(); },
      error: (err) => this.fail(err),
    });
  }

  openLose(deal: SalesOpportunity): void { this.selectedOpportunity.set(deal); this.loseForm = { lost_reason: '' }; this.drawer.set('loseOpportunity'); }
  loseOpportunity(): void {
    const deal = this.selectedOpportunity();
    if (!deal) return;
    this.advanceDeal(deal, 'lost', this.loseForm.lost_reason);
  }

  transitionQuote(quote: SalesQuote, status: string): void {
    this.saving.set(true);
    this.api.updateSalesQuote(quote.id, status).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.showToast(status === 'accepted' ? 'Quote accepted — linked deal moved to won' : `Quote ${this.pretty(status).toLowerCase()}`); this.loadCurrent(); },
      error: (err) => this.fail(err),
    });
  }

  filterStage(stage: string): void { this.statusFilter = this.statusFilter === stage ? '' : stage; this.loadCurrent(); }
  stageCount(stage: string): number { return this.dashboard()?.stages.find((row) => row.stage === stage)?.count ?? 0; }
  stageValue(stage: string): number { return +(this.dashboard()?.stages.find((row) => row.stage === stage)?.value ?? 0); }

  countByStatus(status: string): number { return this.leads().filter((lead) => lead.status === status).length; }
  leadEstValue(): number { return this.leads().filter((lead) => ['new', 'contacted', 'qualified'].includes(lead.status)).reduce((sum, lead) => sum + +lead.estimated_value, 0); }
  openPipelineSummary(): { value: number; weighted: number; average: number } {
    const open = this.opportunities().filter((deal) => !['won', 'lost'].includes(deal.stage));
    const value = open.reduce((sum, deal) => sum + +deal.expected_value, 0);
    const weighted = open.reduce((sum, deal) => sum + +deal.expected_value * (deal.probability / 100), 0);
    return { value, weighted, average: open.length ? value / open.length : 0 };
  }
  quoteSum(status: string): number { return this.quotes().filter((quote) => quote.status === status).reduce((sum, quote) => sum + +quote.total, 0); }

  openStages(dashboard: SalesDashboard) { return dashboard.stages.filter((stage) => !['won', 'lost'].includes(stage.stage)); }
  stageOf(dashboard: SalesDashboard, stage: string) { return dashboard.stages.find((row) => row.stage === stage) || { stage, label: stage, count: 0, value: 0, probability: 0 }; }
  stageWidth(value: number, dashboard: SalesDashboard): number {
    const max = Math.max(1, ...this.openStages(dashboard).map((stage) => stage.value));
    return Math.max(value ? 4 : 0, Math.round((value / max) * 100));
  }
  barHeight(value: number, dashboard: SalesDashboard): number {
    const max = Math.max(1, ...dashboard.trend.flatMap((point) => [point.opened, point.won]));
    return Math.max(value ? 4 : 0, Math.round((value / max) * 100));
  }
  sourceRows(dashboard: SalesDashboard) { return [...dashboard.lead_sources].sort((a, b) => b.count - a.count); }

  addQuoteLine(): void { this.quoteForm.items.push({ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }); }
  removeQuoteLine(index: number): void { if (this.quoteForm.items.length > 1) this.quoteForm.items.splice(index, 1); }
  quoteSubtotal(): number { return this.quoteForm.items.reduce((sum: number, line: any) => sum + (+line.quantity || 0) * (+line.unit_price || 0), 0); }
  quoteTax(): number { return this.quoteForm.items.reduce((sum: number, line: any) => sum + (+line.quantity || 0) * (+line.unit_price || 0) * ((+line.tax_rate || 0) / 100), 0); }

  chooseQuoteCustomer(id: string | number): void {
    const customer = this.customers().find((row) => row.id === +id);
    if (customer) {
      this.quoteForm.customer_name = customer.name;
      this.quoteForm.customer_email = customer.email || '';
    }
  }
  applyStageProbability(stage: string): void { this.opportunityForm.probability = this.stageProbability[stage] ?? 20; }
  openOpportunities(): SalesOpportunity[] { return this.opportunityLookup(); }

  initials(name: string): string { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
  pretty(value: string): string { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }

  private loadCustomers(): void { this.api.salesCustomers({ per_page: 100 }).subscribe({ next: (res) => this.customers.set(res.data) }); }
  private loadOpenOpportunities(): void {
    this.api.salesOpportunities({ per_page: 100 }).subscribe({ next: (res) => this.opportunityLookup.set(res.data.filter((deal) => !['won', 'lost'].includes(deal.stage))) });
  }
  private save(request: any, message: string, after?: () => void): void {
    this.saving.set(true); this.error.set('');
    request.pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.drawer.set(null); if (after) after(); this.showToast(message); this.loadCurrent(); }, error: (err: any) => this.fail(err) });
  }
  private fail(err: any): void { const errors = err?.error?.errors; const first = errors ? Object.values(errors).flat()[0] : null; this.error.set(String(first || err?.error?.message || 'Something went wrong. Please try again.')); }
  private showToast(message: string): void { this.toast.set(message); setTimeout(() => this.toast.set(''), 3000); }
  private date(offsetDays = 0): string { const date = new Date(); date.setDate(date.getDate() + offsetDays); return date.toISOString().slice(0, 10); }
  private freshLead(): any { return { name: '', company: '', email: '', phone: '', source: 'web', estimated_value: 0, currency: this.currency(), notes: '' }; }
  private freshConvert(): any { return { customer_name: '', customer_company: '', customer_email: '', customer_phone: '', segment: 'standard', opportunity_title: '', expected_value: 0, expected_close_date: this.date(30), notes: '' }; }
  private freshOpportunity(): any { return { title: '', customer_id: '', stage: 'prospecting', expected_value: 0, probability: 20, expected_close_date: this.date(30), currency: this.currency(), notes: '' }; }
  private freshQuote(): any { return { customer_id: '', opportunity_id: '', customer_name: '', customer_email: '', issue_date: this.date(), expiry_date: this.date(14), currency: this.currency(), notes: '', send_now: true, items: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] }; }
  private freshCustomer(): any { return { name: '', company: '', email: '', phone: '', segment: 'standard', currency: this.currency(), notes: '' }; }

  private opportunityLookup = signal<SalesOpportunity[]>([]);
}
