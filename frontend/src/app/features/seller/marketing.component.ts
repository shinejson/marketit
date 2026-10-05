import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { DeptDashboard, DeptKpi } from '../../core/models';
import { MhChartComponent } from '../../shared/mh-chart.component';
import { MoneyPipe } from '../../shared/money.pipe';

type MarketingPage = 'overview' | 'campaigns' | 'performance';

@Component({
  selector: 'app-seller-marketing',
  imports: [MoneyPipe, NgTemplateOutlet, FormsModule, RouterLink, MhChartComponent],
  template: `
    <div class="workspace marketing-workspace">
      <header class="workspace-head">
        <div>
          <div class="breadcrumbs"><a [routerLink]="tenantLink()">Workspace</a><span>/</span><span>Marketing</span><span>/</span><b>{{ pageTitle() }}</b></div>
          <p class="eyebrow">Marketing studio</p><h1>{{ pageTitle() }}</h1><p class="intro">{{ pageDescription() }}</p>
        </div>
        <div class="head-actions">
          @if (page() !== 'performance') { <button class="btn primary" type="button" (click)="openCampaign()">+ New campaign</button> }
          @if (page() === 'performance') { <a class="btn primary" [routerLink]="marketingLink('marketing/campaigns')">Manage campaigns</a> }
        </div>
      </header>

      <nav class="workspace-tabs" aria-label="Marketing pages">@for (item of sections; track item.key) { <a [routerLink]="marketingLink(item.path)" [class.active]="page() === item.key">{{ item.label }}</a> }</nav>
      @if (toast()) { <div class="workspace-toast" role="status">✓ {{ toast() }}</div> }
      @if (error()) { <div class="workspace-error"><b>!</b><span>{{ error() }}</span><button (click)="error.set('')">Dismiss</button></div> }

      @if (loading()) { <div class="workspace-loading">@for (n of [1,2,3,4]; track n) { <div class="skeleton"></div> }</div> }
      @else {
        @switch (page()) {
          @case ('overview') {
            @if (dashboard(); as d) {
              <section class="metric-grid">@for (kpi of d.kpis; track kpi.key) { <article class="metric"><span class="metric-mark">{{ metricIcon(kpi.key) }}</span><p>{{ kpi.label }}</p><h2>{{ format(kpi) }}</h2><small>{{ metricNote(kpi.key) }}</small></article> }</section>
              <section class="workspace-columns">
                <article class="panel wide"><div class="panel-title"><div><p class="overline">Growth goals</p><h3>Marketing performance</h3></div><span class="status-chip good">Live</span></div><div class="goals">@for (goal of d.progress; track goal.label) { <div class="goal"><div><b>{{ goal.label }}</b><span>{{ goal.current }} / {{ goal.target }}</span></div><div class="progress purple"><i [style.width.%]="goal.percent"></i></div><small>{{ goal.percent }}% of target</small></div> }</div></article>
                <article class="panel wallet-card"><div><p class="overline">Advertising wallet</p><h3>{{ +balance() | money }}</h3><small>Available campaign credit</small></div><form (ngSubmit)="fund()"><label>Add credit</label><div><input type="number" min="1" [(ngModel)]="fundAmount" name="fundAmount" /><button class="btn small primary" type="submit">Fund</button></div></form></article>
              </section>
              <section class="chart-grid">@for (chart of d.charts; track chart.title) { <app-mh-chart [chart]="chart" /> }</section>
              <section class="panel list-panel"><div class="panel-title"><div><p class="overline">Campaign pulse</p><h3>Current campaigns</h3></div><a [routerLink]="marketingLink('marketing/campaigns')">View all →</a></div><ng-container [ngTemplateOutlet]="campaignList" /></section>
            }
          }
          @case ('campaigns') {
            <section class="metric-grid compact"><article class="metric"><p>Advertising wallet</p><h2>{{ +balance() | money }}</h2><small>Available credit</small></article><article class="metric"><p>Active campaigns</p><h2>{{ campaignCount('active') }}</h2><small>Currently delivering</small></article><article class="metric"><p>Total budget</p><h2>{{ totalBudget() | money }}</h2><small>Across all campaigns</small></article><article class="metric"><p>Spend to date</p><h2>{{ totalSpend() | money }}</h2><small>{{ spendRate() }}% of budget used</small></article></section>
            <section class="panel wallet-bar"><div><p class="overline">Campaign funds</p><h3>{{ +balance() | money }} available</h3></div><form (ngSubmit)="fund()"><input type="number" min="1" [(ngModel)]="fundAmount" name="campaignFund" /><button class="btn primary" type="submit">Add funds</button></form></section>
            <section class="panel list-panel"><div class="panel-title"><div><p class="overline">Paid acquisition</p><h3>Campaign manager</h3></div><label class="search-box">⌕ <input [(ngModel)]="query" placeholder="Search campaigns" /></label></div><ng-container [ngTemplateOutlet]="campaignList" /></section>
          }
          @case ('performance') {
            @if (dashboard(); as d) {
              <section class="metric-grid">@for (kpi of d.kpis; track kpi.key) { <article class="metric"><p>{{ kpi.label }}</p><h2>{{ format(kpi) }}</h2><small>{{ metricNote(kpi.key) }}</small></article> }</section>
              <section class="chart-grid performance-charts">@for (chart of d.charts; track chart.title) { <app-mh-chart [chart]="chart" /> }</section>
              <section class="panel table-panel"><div class="panel-title"><div><p class="overline">Channel detail</p><h3>Campaign performance</h3></div><span class="status-chip neutral">All time</span></div><div class="data-table"><table><thead><tr><th>Campaign</th><th>Status</th><th>Budget</th><th>Spend</th><th>Remaining</th><th>Utilisation</th></tr></thead><tbody>@for (campaign of campaigns(); track campaign.id) { <tr><td><b>{{ campaign.name }}</b><small>{{ campaign.store?.name || 'Sponsored placement' }}</small></td><td><span [class]="'status-chip ' + statusTone(campaign.status)">{{ pretty(campaign.status) }}</span></td><td>{{ +campaign.total_budget | money }}</td><td>{{ +campaign.spent_total | money }}</td><td>{{ remaining(campaign) | money }}</td><td><div class="mini-progress"><i [style.width.%]="campaignRate(campaign)"></i></div><small>{{ campaignRate(campaign) }}%</small></td></tr> }</tbody></table></div>@if (!campaigns().length) { <div class="empty-state"><b>No campaign data yet</b><p>Create a campaign to start measuring performance.</p></div> }</section>
            }
          }
        }
      }
    </div>

    <ng-template #campaignList>
      @for (campaign of filteredCampaigns(); track campaign.id) { <article class="campaign-row"><span [class]="'campaign-icon ' + statusTone(campaign.status)">◎</span><div><b>{{ campaign.name }}</b><small>{{ campaign.store?.name || 'Sponsored ad' }} · {{ +campaign.bid_cpc | money }} CPC</small></div><div class="budget-cell"><span><b>{{ +campaign.spent_total | money }}</b> spent of {{ +campaign.total_budget | money }}</span><div class="mini-progress"><i [style.width.%]="campaignRate(campaign)"></i></div></div><span [class]="'status-chip ' + statusTone(campaign.status)">{{ pretty(campaign.status) }}</span><button class="btn small ghost" (click)="toggle(campaign)">{{ campaign.status === 'active' ? 'Pause' : 'Activate' }}</button></article> } @empty { <div class="empty-state"><b>No campaigns found</b><p>Create a campaign to put your products in front of more shoppers.</p><button class="btn primary" (click)="openCampaign()">Create campaign</button></div> }
    </ng-template>

    @if (drawerOpen()) {
      <div class="drawer-backdrop" (click)="closeDrawer()"></div><aside class="workspace-drawer" role="dialog" aria-modal="true" aria-labelledby="campaign-title"><header><div><p class="overline">Paid acquisition</p><h2 id="campaign-title">Create campaign</h2></div><button class="close" type="button" (click)="closeDrawer()" aria-label="Close">×</button></header>
        <form (ngSubmit)="createCampaign()"><div class="drawer-body"><div class="field"><label>Campaign name</label><input [(ngModel)]="form.name" name="name" required placeholder="Spring product launch" /></div><div class="field"><label>Store</label><select [(ngModel)]="form.store_id" name="store" required><option value="" disabled>Select store</option>@for (store of stores(); track store.id) { <option [value]="store.id">{{ store.name }}</option> }</select></div><div class="field"><label>Promoted product</label><select [(ngModel)]="form.product_id" name="product" required><option value="" disabled>Select product</option>@for (product of products(); track product.id) { <option [value]="product.id">{{ product.name }}</option> }</select></div><div class="form-grid"><div class="field"><label>Daily budget</label><input type="number" min="1" step=".01" [(ngModel)]="form.daily_budget" name="daily" /></div><div class="field"><label>Total budget</label><input type="number" min="1" step=".01" [(ngModel)]="form.total_budget" name="total" /></div></div><div class="field"><label>Maximum cost per click</label><input type="number" min=".05" step=".01" [(ngModel)]="form.bid_cpc" name="bid" /></div><div class="drawer-note"><b>Campaign starts as a draft.</b><span>Review the budget, then activate it from Campaign manager.</span></div></div><footer><button class="btn ghost" type="button" (click)="closeDrawer()">Cancel</button><button class="btn primary" type="submit" [disabled]="saving()">{{ saving() ? 'Creating…' : 'Create draft' }}</button></footer></form>
      </aside>
    }
  `,
})
export class SellerMarketingComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  page = signal<MarketingPage>('overview');
  dashboard = signal<DeptDashboard | null>(null);
  campaigns = signal<any[]>([]);
  balance = signal('0.00');
  stores = signal<any[]>([]);
  products = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  drawerOpen = signal(false);
  error = signal('');
  toast = signal('');
  query = '';
  fundAmount = 50;
  form = this.freshForm();
  readonly sections = [{ key: 'overview' as const, label: 'Overview', path: 'departments/marketing' }, { key: 'campaigns' as const, label: 'Campaigns', path: 'marketing/campaigns' }, { key: 'performance' as const, label: 'Performance', path: 'marketing/performance' }];

  totalBudget = computed(() => this.campaigns().reduce((sum, campaign) => sum + +campaign.total_budget, 0));
  totalSpend = computed(() => this.campaigns().reduce((sum, campaign) => sum + +campaign.spent_total, 0));
  spendRate = computed(() => this.totalBudget() ? Math.round(this.totalSpend() / this.totalBudget() * 100) : 0);

  constructor() { this.route.data.subscribe((data) => { this.page.set((data['page'] as MarketingPage) || 'overview'); this.query = ''; this.load(); }); }

  pageTitle(): string { return ({ overview: 'Marketing overview', campaigns: 'Campaign manager', performance: 'Performance analytics' } as Record<MarketingPage, string>)[this.page()]; }
  pageDescription(): string { return ({ overview: 'See reach, spend and campaign momentum in one focused growth workspace.', campaigns: 'Plan budgets, launch sponsored placements and control every active campaign.', performance: 'Understand impressions, clicks and spend efficiency across your campaigns.' } as Record<MarketingPage, string>)[this.page()]; }
  tenantLink(path = ''): string { const base = this.router.url.startsWith('/seller') ? '/seller' : '/tenant'; return path ? `${base}/${path}` : base; }
  marketingLink(path: string): string { return this.tenantLink(path); }

  private load(): void {
    this.loading.set(true); this.error.set('');
    forkJoin({ dashboard: this.api.departmentDashboard('marketing'), ads: this.api.sellerAds() }).subscribe({ next: ({ dashboard, ads }) => { this.dashboard.set(dashboard.data); this.campaigns.set(ads.data.campaigns); this.balance.set(ads.data.balance); this.loading.set(false); }, error: () => { this.error.set('We could not load marketing data. Please try again.'); this.loading.set(false); } });
  }
  openCampaign(): void { this.drawerOpen.set(true); this.error.set(''); if (!this.stores().length) { forkJoin({ stores: this.api.sellerStores(), products: this.api.sellerProducts({ per_page: 100 }) }).subscribe(({ stores, products }) => { this.stores.set(stores.data); this.products.set(products.data); this.form.store_id = stores.data[0]?.id || ''; this.form.product_id = products.data[0]?.id || ''; }); } }
  closeDrawer(): void { if (!this.saving()) this.drawerOpen.set(false); }
  createCampaign(): void { this.saving.set(true); this.api.createAd({ store_id: this.form.store_id, name: this.form.name, daily_budget: this.form.daily_budget, total_budget: this.form.total_budget, bid_cpc: this.form.bid_cpc, product_ids: [this.form.product_id] }).subscribe({ next: () => { this.saving.set(false); this.drawerOpen.set(false); this.form = this.freshForm(); this.showToast('Campaign draft created'); this.load(); }, error: (err) => { this.saving.set(false); this.error.set(err?.error?.message || 'The campaign could not be created.'); } }); }
  toggle(campaign: any): void { const status = campaign.status === 'active' ? 'paused' : 'active'; this.api.updateAd(campaign.id, { status }).subscribe({ next: () => { this.showToast(`${campaign.name} ${status === 'active' ? 'activated' : 'paused'}`); this.load(); }, error: () => this.error.set('The campaign status could not be updated.') }); }
  fund(): void { if (this.fundAmount <= 0) return; this.api.fundAds(this.fundAmount).subscribe({ next: () => { this.showToast(`${this.fundAmount} added to the advertising wallet`); this.load(); }, error: () => this.error.set('Funds could not be added.') }); }

  filteredCampaigns(): any[] { const q = this.query.toLowerCase(); return this.campaigns().filter((campaign) => `${campaign.name} ${campaign.store?.name || ''} ${campaign.status}`.toLowerCase().includes(q)); }
  campaignCount(status: string): number { return this.campaigns().filter((campaign) => campaign.status === status).length; }
  campaignRate(campaign: any): number { return +campaign.total_budget ? Math.min(100, Math.round(+campaign.spent_total / +campaign.total_budget * 100)) : 0; }
  remaining(campaign: any): number { return Math.max(0, +campaign.total_budget - +campaign.spent_total); }
  statusTone(status: string): string { return status === 'active' ? 'good' : status === 'paused' ? 'warning' : status === 'completed' ? 'neutral' : 'neutral'; }
  format(kpi: DeptKpi): string { if (kpi.format === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(+kpi.value); if (kpi.format === 'percent') return `${kpi.value}%`; return new Intl.NumberFormat().format(+kpi.value); }
  metricIcon(key: string): string { return key === 'campaigns' ? '◎' : key === 'spend' ? '$' : key === 'impressions' ? '◉' : '↗'; }
  metricNote(key: string): string { return key === 'campaigns' ? 'Currently delivering' : key === 'spend' ? 'Invested across campaigns' : key === 'impressions' ? 'Times your ads were seen' : 'Clicks per 100 impressions'; }
  pretty(value: string): string { return (value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
  showToast(message: string): void { this.toast.set(message); setTimeout(() => this.toast.set(''), 3000); }
  private freshForm(): any { return { store_id: '', product_id: '', name: '', daily_budget: 10, total_budget: 100, bid_cpc: .25 }; }
}
