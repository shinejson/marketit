import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AdCampaignRow, AdCampaignStatus, AdWorkspace, AdWorkspaceMeta, AdWorkspaceSummary } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type StatusFilter = '' | AdCampaignStatus;

const OBJECTIVE_LABELS: Record<string, string> = {
  product_visits: 'Product visits',
  store_traffic: 'Store traffic',
  conversions: 'Conversions',
  awareness: 'Awareness',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  exhausted: 'Budget spent',
};

interface CampaignForm {
  id: number | null;
  store_id: string;
  name: string;
  objective: string;
  daily_budget: number;
  total_budget: number;
  bid_cpc: number;
  start_date: string;
  end_date: string;
  product_ids: number[];
}

@Component({
  selector: 'app-seller-ads',
  imports: [FormsModule, MoneyPipe, DecimalPipe, DatePipe, RouterLink],
  template: `
    <div class="ads-shell">
      <header class="page-head">
        <div>
          <div class="breadcrumbs"><a routerLink="/tenant">Tenant</a><span>/</span><span>Marketing</span></div>
          <p class="eyebrow">Sponsored ads</p>
          <h1>Ad campaigns</h1>
          <p class="intro">
            Promote products across the marketplace. You only pay when a shopper clicks, and every campaign
            draws from the same prepaid wallet.
          </p>
        </div>
        <div class="head-actions">
          <select class="toolbar-select" [(ngModel)]="windowDays" (change)="reload()" aria-label="Reporting window">
            <option [ngValue]="7">Last 7 days</option>
            <option [ngValue]="30">Last 30 days</option>
            <option [ngValue]="90">Last 90 days</option>
          </select>
          <button class="btn ghost" type="button" (click)="reload()" [disabled]="loading()">
            <span class="spin-icon" [class.spinning]="refreshing()">⟳</span> Refresh
          </button>
          <button class="btn primary" type="button" (click)="openComposer()" [disabled]="!meta()?.stores?.length">＋ New campaign</button>
        </div>
      </header>

      @if (toast()) { <div class="toast" role="status"><span>✓</span>{{ toast() }}</div> }
      @if (error()) {
        <div class="error-banner"><span>!</span><p>{{ error() }}</p><button type="button" (click)="error.set('')">Dismiss</button></div>
      }

      @if (lowWallet()) {
        <div class="notice">
          <span>◉</span>
          <div>
            <strong>Your ad wallet is running low</strong>
            <p>
              {{ summary()?.wallet_balance ?? 0 | money }} left
              @if (summary()?.runway_days !== null) { · about {{ summary()?.runway_days }} day(s) at the current daily budget }
            </p>
          </div>
          <button class="btn primary" type="button" (click)="focusWallet()">Top up</button>
        </div>
      }

      <section class="kpi-grid">
        <article class="metric-card value">
          <div class="metric-top"><span class="metric-icon gold">◈</span></div>
          <p>Ad wallet</p><h2>{{ summary()?.wallet_balance ?? 0 | money }}</h2>
          <small>
            @if (summary()?.runway_days !== null && summary()?.runway_days !== undefined) {
              ≈ {{ summary()?.runway_days }} days of runway
            } @else { No active daily budget }
          </small>
        </article>
        <article class="metric-card">
          <div class="metric-top"><span class="metric-icon blue">◎</span></div>
          <p>Active campaigns</p><h2>{{ summary()?.active_count ?? 0 }}</h2>
          <small>{{ summary()?.paused_count ?? 0 }} paused · {{ summary()?.draft_count ?? 0 }} draft</small>
        </article>
        <article class="metric-card">
          <div class="metric-top"><span class="metric-icon slate">👁</span></div>
          <p>Impressions</p><h2>{{ summary()?.impressions ?? 0 | number }}</h2>
          <small>Last {{ windowDays }} days</small>
        </article>
        <article class="metric-card">
          <div class="metric-top"><span class="metric-icon green">↗</span></div>
          <p>Clicks</p><h2>{{ summary()?.clicks ?? 0 | number }}</h2>
          <small>CTR {{ summary()?.ctr ?? 0 | number:'1.0-2' }}%</small>
        </article>
        <article class="metric-card">
          <div class="metric-top"><span class="metric-icon amber">₵</span></div>
          <p>Spend</p><h2>{{ summary()?.spend ?? 0 | money }}</h2>
          <small>Avg CPC {{ summary()?.avg_cpc ?? 0 | money:'':'symbol':'1.2-4' }}</small>
        </article>
      </section>

      <div class="split">
        <section class="panel chart-panel">
          <div class="panel-head">
            <div><p class="overline">Delivery</p><h3>Clicks &amp; impressions</h3></div>
            <span class="legend"><i class="imp"></i>Impressions <i class="clk"></i>Clicks</span>
          </div>
          @if (!hasDelivery()) {
            <div class="empty-state small">
              <span class="empty-glyph">📈</span>
              <h3>No delivery yet</h3>
              <p>Activate a campaign with wallet credit and impressions will start showing here.</p>
            </div>
          } @else {
            <div class="chart">
              <svg viewBox="0 0 320 120" preserveAspectRatio="none" role="img" aria-label="Delivery trend">
                <polyline [attr.points]="impressionPoints()" fill="none" stroke="#9aa7bd" stroke-width="2" />
                <polyline [attr.points]="clickPoints()" fill="none" stroke="#2f6b4f" stroke-width="2.4" />
              </svg>
              <div class="axis"><span>{{ firstDay() | date:'MMM d' }}</span><span>{{ lastDay() | date:'MMM d' }}</span></div>
            </div>
          }
        </section>

        <section class="panel wallet-panel" id="wallet">
          <div class="panel-head"><div><p class="overline">Billing</p><h3>Wallet</h3></div></div>
          <div class="wallet-body">
            <p class="balance">{{ summary()?.wallet_balance ?? 0 | money }}</p>
            <p class="muted">Committed {{ summary()?.daily_committed ?? 0 | money }} per day across active campaigns.</p>
            <form class="fund-form" (ngSubmit)="fund()">
              <div class="presets">
                @for (amount of fundPresets; track amount) {
                  <button type="button" [class.on]="fundAmount === amount" (click)="fundAmount = amount">{{ amount | money:'':'symbol':'1.0-0' }}</button>
                }
              </div>
              <div class="fund-row">
                <input type="number" min="1" step="1" [(ngModel)]="fundAmount" name="amount" aria-label="Amount to add" />
                <button class="btn primary" type="submit" [disabled]="funding()">{{ funding() ? 'Adding…' : 'Add funds' }}</button>
              </div>
            </form>
            @if (ledger().length) {
              <h4>Recent charges</h4>
              <ul class="ledger">
                @for (entry of ledger(); track entry.id) {
                  <li>
                    <span>{{ entry.kind }}</span>
                    <b>{{ entry.amount | money:'':'symbol':'1.2-4' }}</b>
                    <time>{{ entry.created_at | date:'MMM d' }}</time>
                  </li>
                }
              </ul>
            }
          </div>
        </section>
      </div>

      <nav class="status-tabs" aria-label="Campaign filters">
        @for (tab of statusTabs(); track tab.key) {
          <button type="button" [class.active]="statusFilter() === tab.key" (click)="statusFilter.set(tab.key)">
            {{ tab.label }} <span class="tab-count">{{ tab.count }}</span>
          </button>
        }
        <span class="tab-divider"></span>
        <div class="search-box inline">
          <span>⌕</span>
          <input type="search" placeholder="Search campaigns" [(ngModel)]="searchTerm" />
        </div>
      </nav>

      <section class="table-panel panel">
        @if (loading()) {
          <div class="skeletons">@for (i of [1,2,3,4]; track i) { <div class="skeleton-row"></div> }</div>
        } @else if (!visibleCampaigns().length) {
          <div class="empty-state">
            <span class="empty-glyph">◎</span>
            <h3>{{ campaigns().length ? 'No campaigns match those filters' : 'No campaigns yet' }}</h3>
            <p>
              {{ campaigns().length
                ? 'Try another status tab or clear the search.'
                : 'Create a campaign, choose the products to promote and set a cost-per-click bid.' }}
            </p>
            @if (!campaigns().length) {
              @if (meta()?.stores?.length) {
                <button class="btn primary" type="button" (click)="openComposer()">Create campaign</button>
              } @else {
                <a class="btn primary" routerLink="/tenant/stores">Create a store first</a>
              }
            }
          </div>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Budget pacing</th>
                  <th class="right">Bid</th>
                  <th class="right">Impressions</th>
                  <th class="right">Clicks</th>
                  <th class="right">CTR</th>
                  <th class="right">Spend</th>
                  <th class="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (c of visibleCampaigns(); track c.id) {
                  <tr>
                    <td>
                      <strong>{{ c.name }}</strong>
                      <small>{{ c.store?.name || 'Store removed' }} · {{ objectiveLabel(c.objective) }}</small>
                      <div class="chips">
                        @for (p of c.products.slice(0, 2); track p.id) { <span class="chip-tag">{{ p.name }}</span> }
                        @if (c.products.length > 2) { <span class="chip-tag">+{{ c.products.length - 2 }} more</span> }
                      </div>
                    </td>
                    <td><span class="status-pill" [class]="c.status">{{ statusLabel(c.status) }}</span></td>
                    <td>
                      <div class="pace-cell">
                        <div class="level-bar" [attr.title]="c.budget_used_percent + '% of total budget'">
                          <i [class.hot]="c.budget_used_percent >= 85" [style.width.%]="clamp(c.budget_used_percent)"></i>
                        </div>
                        <small>
                          {{ c.spent_total | money:'':'symbol':'1.0-2' }} of {{ c.total_budget | money:'':'symbol':'1.0-0' }}
                          · today {{ c.spent_today | money:'':'symbol':'1.0-2' }} / {{ c.daily_budget | money:'':'symbol':'1.0-0' }}
                        </small>
                      </div>
                    </td>
                    <td class="right">{{ c.bid_cpc | money:'':'symbol':'1.2-4' }}</td>
                    <td class="right">{{ c.metrics.impressions | number }}</td>
                    <td class="right">{{ c.metrics.clicks | number }}</td>
                    <td class="right">{{ c.metrics.ctr | number:'1.0-2' }}%</td>
                    <td class="right">
                      <strong>{{ c.metrics.spend | money }}</strong>
                      <small>CPC {{ c.metrics.avg_cpc | money:'':'symbol':'1.2-4' }}</small>
                    </td>
                    <td class="right actions-cell">
                      <button class="row-btn" type="button" (click)="toggleStatus(c)" [disabled]="savingId() === c.id">
                        {{ c.status === 'active' ? 'Pause' : 'Activate' }}
                      </button>
                      <button class="row-btn ghost" type="button" (click)="openComposer(c)">Edit</button>
                      <button class="row-btn ghost danger" type="button" (click)="remove(c)">Delete</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      @if (topProducts().length) {
        <section class="panel">
          <div class="panel-head"><div><p class="overline">Attribution</p><h3>Best performing products</h3></div></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Product</th><th class="right">Impressions</th><th class="right">Clicks</th><th class="right">CTR</th><th class="right">Spend</th></tr></thead>
              <tbody>
                @for (p of topProducts(); track p.product_id) {
                  <tr>
                    <td><strong>{{ p.name }}</strong></td>
                    <td class="right">{{ p.impressions | number }}</td>
                    <td class="right">{{ p.clicks | number }}</td>
                    <td class="right">{{ p.impressions ? (p.clicks / p.impressions * 100 | number:'1.0-2') : 0 }}%</td>
                    <td class="right">{{ p.spend | money }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>

    @if (composerOpen()) {
      <div class="drawer-backdrop" (click)="closeComposer()"></div>
      <aside class="drawer composer" role="dialog" aria-label="Campaign composer">
        <header class="drawer-head">
          <div>
            <p class="overline">{{ form.id ? 'Edit campaign' : 'New campaign' }}</p>
            <h2>{{ form.id ? form.name : 'Promote your products' }}</h2>
          </div>
          <button class="icon-btn" type="button" (click)="closeComposer()" aria-label="Close">×</button>
        </header>
        <div class="drawer-body">
          <form (ngSubmit)="save()">
            <label class="full"><span>Campaign name</span><input type="text" [(ngModel)]="form.name" name="name" required maxlength="120" /></label>
            <div class="field-row">
              <label>
                <span>Store</span>
                <select [(ngModel)]="form.store_id" name="store_id" (change)="onStoreChange()" required>
                  @for (s of meta()?.stores || []; track s.id) { <option [value]="s.id">{{ s.name }}</option> }
                </select>
              </label>
              <label>
                <span>Objective</span>
                <select [(ngModel)]="form.objective" name="objective">
                  @for (o of meta()?.objectives || []; track o) { <option [value]="o">{{ objectiveLabel(o) }}</option> }
                </select>
              </label>
            </div>
            <div class="field-row">
              <label><span>Daily budget</span><input type="number" min="1" step="1" [(ngModel)]="form.daily_budget" name="daily_budget" required /></label>
              <label><span>Total budget</span><input type="number" min="1" step="1" [(ngModel)]="form.total_budget" name="total_budget" required /></label>
            </div>
            <div class="field-row">
              <label><span>Max cost per click</span><input type="number" min="0.05" step="0.05" [(ngModel)]="form.bid_cpc" name="bid_cpc" required /></label>
              <label><span>Starts</span><input type="date" [(ngModel)]="form.start_date" name="start_date" /></label>
            </div>
            <label class="full"><span>Ends (optional)</span><input type="date" [(ngModel)]="form.end_date" name="end_date" /></label>

            <h4>Promoted products</h4>
            @if (!storeProducts().length) {
              <p class="muted">This store has no published products yet.</p>
            } @else {
              <div class="product-picker">
                @for (p of storeProducts(); track p.id) {
                  <label class="pick-row">
                    <input type="checkbox" [checked]="form.product_ids.includes(p.id)" (change)="toggleProduct(p.id)" />
                    <span>{{ p.name }}</span>
                    <b>{{ p.price | money }}</b>
                  </label>
                }
              </div>
            }

            <p class="preview">
              Estimated reach: <strong>{{ estimatedClicks() }}</strong> clicks per day
              <span class="muted">at {{ form.bid_cpc | money:'':'symbol':'1.2-4' }} CPC on a {{ form.daily_budget | money:'':'symbol':'1.0-0' }} daily budget.</span>
            </p>

            <div class="drawer-actions">
              <button class="btn ghost" type="button" (click)="closeComposer()">Cancel</button>
              <button class="btn primary" type="submit" [disabled]="saving() || !form.product_ids.length">
                {{ saving() ? 'Saving…' : form.id ? 'Save changes' : 'Create draft' }}
              </button>
            </div>
          </form>
        </div>
      </aside>
    }
  `,
})
export class SellerAdsComponent {
  private api = inject(ApiService);

  readonly fundPresets = [25, 50, 100, 250];

  workspace = signal<AdWorkspace | null>(null);
  meta = signal<AdWorkspaceMeta | null>(null);
  loading = signal(true);
  refreshing = signal(false);
  saving = signal(false);
  funding = signal(false);
  savingId = signal<number | null>(null);
  error = signal('');
  toast = signal('');
  statusFilter = signal<StatusFilter>('');
  composerOpen = signal(false);

  windowDays = 30;
  searchTerm = '';
  fundAmount = 50;

  form: CampaignForm = this.blankForm();

  campaigns = computed<AdCampaignRow[]>(() => this.workspace()?.campaigns ?? []);
  summary = computed<AdWorkspaceSummary | null>(() => this.workspace()?.summary ?? null);
  ledger = computed(() => this.workspace()?.ledger ?? []);
  topProducts = computed(() => this.workspace()?.top_products ?? []);
  series = computed(() => this.workspace()?.series ?? []);

  lowWallet = computed(() => {
    const s = this.summary();
    if (!s) return false;
    return s.active_count > 0 && s.runway_days !== null && s.runway_days <= 3;
  });

  statusTabs = computed(() => {
    const all = this.campaigns();
    const count = (status: AdCampaignStatus) => all.filter((c) => c.status === status).length;
    return [
      { key: '' as StatusFilter, label: 'All', count: all.length },
      { key: 'active' as StatusFilter, label: 'Active', count: count('active') },
      { key: 'paused' as StatusFilter, label: 'Paused', count: count('paused') },
      { key: 'draft' as StatusFilter, label: 'Draft', count: count('draft') },
      { key: 'exhausted' as StatusFilter, label: 'Budget spent', count: count('exhausted') },
    ];
  });

  visibleCampaigns = computed(() => {
    const term = this.searchTerm.trim().toLowerCase();
    return this.campaigns().filter((c) => {
      if (this.statusFilter() && c.status !== this.statusFilter()) return false;
      if (!term) return true;
      return c.name.toLowerCase().includes(term) || (c.store?.name || '').toLowerCase().includes(term);
    });
  });

  storeProducts = computed(() => {
    const storeId = Number(this.form.store_id);
    return (this.meta()?.products ?? []).filter((p) => !storeId || p.store_id === storeId);
  });

  hasDelivery = computed(() => this.series().some((d) => d.impressions > 0 || d.clicks > 0));

  constructor() {
    this.loading.set(true);
    forkJoin({ ads: this.api.sellerAds({ days: this.windowDays }), meta: this.api.adsMeta() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ ads, meta }) => {
          this.workspace.set(ads.data);
          this.meta.set(meta.data);
        },
        error: (err) => this.fail(err),
      });
  }

  // ---------------------------------------------------------------- loading

  reload(): void {
    this.refreshing.set(true);
    this.api
      .sellerAds({ days: this.windowDays })
      .pipe(finalize(() => {
        this.refreshing.set(false);
        this.loading.set(false);
      }))
      .subscribe({
        next: (res) => this.workspace.set(res.data),
        error: (err) => this.fail(err),
      });
  }

  // ----------------------------------------------------------------- wallet

  focusWallet(): void {
    document.getElementById('wallet')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  fund(): void {
    const amount = Number(this.fundAmount);
    if (!amount || amount < 1) return;
    this.funding.set(true);
    this.api
      .fundAds(amount)
      .pipe(finalize(() => this.funding.set(false)))
      .subscribe({
        next: () => {
          this.showToast(`Added ${amount.toFixed(2)} to your ad wallet`);
          this.reload();
        },
        error: (err) => this.fail(err),
      });
  }

  // -------------------------------------------------------------- composer

  openComposer(campaign?: AdCampaignRow): void {
    const stores = this.meta()?.stores ?? [];
    this.form = campaign
      ? {
          id: campaign.id,
          store_id: String(campaign.store?.id ?? stores[0]?.id ?? ''),
          name: campaign.name,
          objective: campaign.objective || 'product_visits',
          daily_budget: campaign.daily_budget,
          total_budget: campaign.total_budget,
          bid_cpc: campaign.bid_cpc,
          start_date: campaign.start_date || '',
          end_date: campaign.end_date || '',
          product_ids: campaign.products.map((p) => p.id),
        }
      : { ...this.blankForm(), store_id: String(stores[0]?.id ?? '') };
    this.composerOpen.set(true);
  }

  closeComposer(): void {
    this.composerOpen.set(false);
  }

  onStoreChange(): void {
    const allowed = new Set(this.storeProducts().map((p) => p.id));
    this.form.product_ids = this.form.product_ids.filter((id) => allowed.has(id));
  }

  toggleProduct(id: number): void {
    this.form.product_ids = this.form.product_ids.includes(id)
      ? this.form.product_ids.filter((x) => x !== id)
      : [...this.form.product_ids, id];
  }

  estimatedClicks(): number {
    const bid = Number(this.form.bid_cpc) || 0;
    const daily = Number(this.form.daily_budget) || 0;
    return bid > 0 ? Math.floor(daily / bid) : 0;
  }

  save(): void {
    const payload = {
      store_id: this.form.store_id,
      name: this.form.name,
      objective: this.form.objective,
      daily_budget: Number(this.form.daily_budget),
      total_budget: Number(this.form.total_budget),
      bid_cpc: Number(this.form.bid_cpc),
      start_date: this.form.start_date || null,
      end_date: this.form.end_date || null,
      product_ids: this.form.product_ids,
    };
    this.saving.set(true);
    const request = this.form.id ? this.api.updateAd(this.form.id, payload) : this.api.createAd(payload);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.showToast(this.form.id ? 'Campaign updated' : 'Draft campaign created');
        this.composerOpen.set(false);
        this.reload();
      },
      error: (err) => this.fail(err),
    });
  }

  // --------------------------------------------------------------- actions

  toggleStatus(campaign: AdCampaignRow): void {
    const status: AdCampaignStatus = campaign.status === 'active' ? 'paused' : 'active';
    this.savingId.set(campaign.id);
    this.api
      .updateAd(campaign.id, { status })
      .pipe(finalize(() => this.savingId.set(null)))
      .subscribe({
        next: () => {
          this.showToast(`${campaign.name} ${status === 'active' ? 'is now delivering' : 'paused'}`);
          this.reload();
        },
        error: (err) => this.fail(err),
      });
  }

  remove(campaign: AdCampaignRow): void {
    if (!window.confirm(`Delete “${campaign.name}”? Reporting history for this campaign is removed too.`)) return;
    this.api.deleteAd(campaign.id).subscribe({
      next: () => {
        this.showToast('Campaign deleted');
        this.reload();
      },
      error: (err) => this.fail(err),
    });
  }

  // ---------------------------------------------------------------- charts

  impressionPoints(): string {
    return this.points(this.series().map((d) => d.impressions));
  }

  clickPoints(): string {
    return this.points(this.series().map((d) => d.clicks));
  }

  private points(values: number[]): string {
    if (!values.length) return '';
    const max = Math.max(...values, 1);
    const step = values.length > 1 ? 320 / (values.length - 1) : 320;
    return values.map((v, i) => `${(i * step).toFixed(1)},${(115 - (v / max) * 105).toFixed(1)}`).join(' ');
  }

  firstDay(): string | null {
    return this.series()[0]?.day ?? null;
  }

  lastDay(): string | null {
    return this.series()[this.series().length - 1]?.day ?? null;
  }

  // --------------------------------------------------------------- helpers

  clamp(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  objectiveLabel(key: string): string {
    return OBJECTIVE_LABELS[key] ?? key.replace(/_/g, ' ');
  }

  statusLabel(key: string): string {
    return STATUS_LABELS[key] ?? key;
  }

  private blankForm(): CampaignForm {
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: null,
      store_id: '',
      name: 'Sponsored launch',
      objective: 'product_visits',
      daily_budget: 10,
      total_budget: 100,
      bid_cpc: 0.25,
      start_date: today,
      end_date: '',
      product_ids: [],
    };
  }

  private showToast(message: string): void {
    this.toast.set(message);
    setTimeout(() => this.toast.set(''), 3000);
  }

  private fail(err: any): void {
    const errors = err?.error?.errors;
    const first = errors ? Object.values(errors).flat()[0] : null;
    this.error.set(String(first || err?.error?.message || 'Something went wrong. Please try again.'));
  }
}
