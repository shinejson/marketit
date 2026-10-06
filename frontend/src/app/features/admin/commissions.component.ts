import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import {
  CommissionEarnings,
  CommissionMeta,
  CommissionQuotePreview,
  CommissionRule,
  CommissionTier,
} from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

interface RuleForm {
  name: string;
  description: string;
  scope_type: string;
  scope_id: string;
  calculation: string;
  rate: string;
  flat_fee: string;
  min_fee: string;
  max_fee: string;
  min_order_amount: string;
  include_delivery: boolean;
  priority: string;
  status: string;
  effective_from: string;
  effective_to: string;
  tiers: CommissionTier[];
}

const BLANK: RuleForm = {
  name: '',
  description: '',
  scope_type: 'global',
  scope_id: '',
  calculation: 'percentage',
  rate: '5',
  flat_fee: '0',
  min_fee: '',
  max_fee: '',
  min_order_amount: '0',
  include_delivery: false,
  priority: '0',
  status: 'active',
  effective_from: '',
  effective_to: '',
  tiers: [],
};

@Component({
  selector: 'app-admin-commissions',
  imports: [FormsModule, DatePipe, MoneyPipe],
  template: `
    <main class="page cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">Revenue engine</p>
          <h1>Commissions</h1>
          <p class="intro">
            Replace the flat platform rate with targeted rules. The most specific live rule wins — product beats
            category, category beats store, store beats tenant, tenant beats plan, plan beats global.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
          <button class="btn" type="button" (click)="startCreate()">New rule</button>
        </div>
      </header>

      <section class="cx-stats">
        <div class="cx-stat"><span>Rules</span><strong>{{ summary().total }}</strong><small>{{ summary().active }} active</small></div>
        <div class="cx-stat warn"><span>Scheduled</span><strong>{{ summary().scheduled }}</strong><small>Start in the future</small></div>
        <div class="cx-stat"><span>Fallback rate</span><strong>{{ defaults().platform_rate }}%</strong><small>When no rule matches</small></div>
        <div class="cx-stat good"><span>Commission earned</span><strong>{{ earnings()?.commission_total || '0' | money }}</strong><small>Effective {{ earnings()?.effective_rate || '0' }}%</small></div>
      </section>

      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }

      <div class="cx-split">
        <div class="stack">
          <section class="cx-panel">
            <header>
              <div><h2>Commission rules</h2><p>Ordered by how specific they are, then by priority.</p></div>
              <select [(ngModel)]="scopeFilter" name="scope" (ngModelChange)="load()">
                <option value="">All scopes</option>
                @for (scope of meta()?.scope_types || []; track scope) { <option [value]="scope">{{ pretty(scope) }}</option> }
              </select>
            </header>

            @if (loading()) {
              <div class="cx-skeleton"><span></span><span></span><span></span></div>
            } @else if (!rules().length) {
              <div class="cx-empty">
                <strong>No commission rules</strong>
                <p>Every sale currently uses the {{ defaults().platform_rate }}% platform default. Add a rule to change that.</p>
                <button class="btn" type="button" (click)="startCreate()">Create a rule</button>
              </div>
            } @else {
              <div class="cx-table-scroll">
                <table class="cx-table">
                  <thead><tr><th>Rule</th><th>Applies to</th><th>Charge</th><th>Window</th><th>Status</th><th class="act"></th></tr></thead>
                  <tbody>
                    @for (rule of rules(); track rule.id) {
                      <tr [class.on]="editing()?.id === rule.id">
                        <td><strong>{{ rule.name }}</strong><span class="sub">Priority {{ rule.priority }} · specificity {{ rule.specificity }}</span></td>
                        <td>{{ rule.scope_label }}<span class="sub">{{ pretty(rule.scope_type) }}</span></td>
                        <td>{{ rule.summary }}</td>
                        <td>
                          {{ rule.effective_from ? (rule.effective_from | date: 'MMM d, y') : 'Always' }}
                          <span class="sub">{{ rule.effective_to ? 'until ' + (rule.effective_to | date: 'MMM d, y') : 'no end date' }}</span>
                        </td>
                        <td>
                          <span class="chip" [class]="'chip ' + rule.status">{{ pretty(rule.status) }}</span>
                          @if (rule.is_live) { <span class="chip ok plain">Live</span> }
                        </td>
                        <td class="act">
                          <button class="mini" type="button" (click)="edit(rule)">Edit</button>
                          <button class="mini" type="button" (click)="toggle(rule)">{{ rule.status === 'active' ? 'Pause' : 'Enable' }}</button>
                          <button class="mini danger" type="button" (click)="remove(rule)">Delete</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          @if (earnings(); as report) {
            <section class="cx-panel">
              <header>
                <div><h2>Commission earned</h2><p>{{ report.range.from }} → {{ report.range.to }}</p></div>
                <span class="chip plain">{{ report.settlement_count }} settlement(s)</span>
              </header>
              <div class="cx-panel-body">
                <dl class="cx-kv">
                  <div><dt>Gross merchandise value</dt><dd>{{ report.gross_total | money }}</dd></div>
                  <div><dt>Platform commission</dt><dd><strong>{{ report.commission_total | money }}</strong></dd></div>
                  <div><dt>Paid to sellers</dt><dd>{{ report.net_to_sellers | money }}</dd></div>
                  <div><dt>Effective take rate</dt><dd>{{ report.effective_rate }}%</dd></div>
                </dl>
                @if (report.top_tenants.length) {
                  <h3 class="sub-head">Top contributing sellers</h3>
                  <div class="cx-table-scroll">
                    <table class="cx-table">
                      <thead><tr><th>Seller</th><th class="num">Orders</th><th class="num">Gross</th><th class="num">Commission</th></tr></thead>
                      <tbody>
                        @for (row of report.top_tenants; track row.tenant_id) {
                          <tr><td>{{ row.tenant }}</td><td class="num">{{ row.orders }}</td><td class="num">{{ row.gross | money }}</td><td class="num"><strong>{{ row.commission | money }}</strong></td></tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            </section>
          }
        </div>

        <aside class="stack">
          @if (showForm()) {
            <section class="cx-panel">
              <header><div><h2>{{ editing() ? 'Edit rule' : 'New commission rule' }}</h2><p>Rates are percentages — 7.5 means 7.5%.</p></div></header>
              <div class="cx-panel-body cx-form">
                <label>Rule name<input [(ngModel)]="form.name" name="name" placeholder="Electronics premium rate" /></label>
                <div class="row">
                  <label>
                    Scope
                    <select [(ngModel)]="form.scope_type" name="scope_type" (ngModelChange)="form.scope_id = ''">
                      @for (scope of meta()?.scope_types || []; track scope) { <option [value]="scope">{{ pretty(scope) }}</option> }
                    </select>
                  </label>
                  @if (form.scope_type !== 'global') {
                    <label>
                      Target
                      <select [(ngModel)]="form.scope_id" name="scope_id">
                        <option value="">Select…</option>
                        @for (option of scopeOptions(); track option.id) { <option [value]="option.id">{{ option.name }}</option> }
                      </select>
                    </label>
                  }
                </div>
                <div class="row">
                  <label>
                    Calculation
                    <select [(ngModel)]="form.calculation" name="calculation">
                      @for (option of meta()?.calculations || []; track option) { <option [value]="option">{{ pretty(option) }}</option> }
                    </select>
                  </label>
                  @if (form.calculation !== 'flat' && form.calculation !== 'tiered') {
                    <label>Rate (%)<input type="number" min="0" step="0.0001" [(ngModel)]="form.rate" name="rate" /></label>
                  }
                  @if (form.calculation === 'flat' || form.calculation === 'percentage_plus_flat') {
                    <label>Flat fee<input type="number" min="0" step="0.01" [(ngModel)]="form.flat_fee" name="flat_fee" /></label>
                  }
                </div>

                @if (form.calculation === 'tiered') {
                  <div class="tiers">
                    <div class="tier-head">
                      <span>Tiers</span>
                      <button class="mini" type="button" (click)="addTier()">Add tier</button>
                    </div>
                    @for (tier of form.tiers; track $index) {
                      <div class="tier">
                        <label>From<input type="number" min="0" step="0.01" [(ngModel)]="tier.from_amount" [name]="'tf' + $index" /></label>
                        <label>To<input type="number" min="0" step="0.01" [(ngModel)]="tier.to_amount" [name]="'tt' + $index" placeholder="∞" /></label>
                        <label>Rate %<input type="number" min="0" step="0.0001" [(ngModel)]="tier.rate" [name]="'tr' + $index" /></label>
                        <label>Flat<input type="number" min="0" step="0.01" [(ngModel)]="tier.flat_fee" [name]="'tl' + $index" /></label>
                        <button class="mini danger" type="button" (click)="removeTier($index)">×</button>
                      </div>
                    }
                    @if (!form.tiers.length) { <p class="muted">Add at least one tier — the matching band is applied to the whole sale.</p> }
                  </div>
                }

                <div class="row">
                  <label>Minimum fee<input type="number" min="0" step="0.01" [(ngModel)]="form.min_fee" name="min_fee" placeholder="None" /></label>
                  <label>Maximum fee<input type="number" min="0" step="0.01" [(ngModel)]="form.max_fee" name="max_fee" placeholder="No cap" /></label>
                </div>
                <div class="row">
                  <label>Only above order value<input type="number" min="0" step="0.01" [(ngModel)]="form.min_order_amount" name="min_order_amount" /></label>
                  <label>Priority<input type="number" [(ngModel)]="form.priority" name="priority" /></label>
                </div>
                <div class="row">
                  <label>Effective from<input type="date" [(ngModel)]="form.effective_from" name="effective_from" /></label>
                  <label>Effective to<input type="date" [(ngModel)]="form.effective_to" name="effective_to" /></label>
                </div>
                <label class="check"><input type="checkbox" [(ngModel)]="form.include_delivery" name="include_delivery" /> Charge commission on delivery fees too</label>
                <label class="check"><input type="checkbox" [checked]="form.status === 'active'" (change)="form.status = form.status === 'active' ? 'inactive' : 'active'" /> Active</label>
                <label>Internal note<textarea [(ngModel)]="form.description" name="description" placeholder="Why this rule exists"></textarea></label>

                <div class="actions">
                  <button class="btn" type="button" (click)="save()" [disabled]="busy()">{{ busy() ? 'Saving…' : editing() ? 'Save rule' : 'Create rule' }}</button>
                  <button class="btn ghost" type="button" (click)="showForm.set(false)">Cancel</button>
                </div>
              </div>
            </section>
          }

          <section class="cx-panel">
            <header><div><h2>Rate simulator</h2><p>Check exactly what a sale would be charged.</p></div></header>
            <div class="cx-panel-body cx-form">
              <div class="row">
                <label>Sale amount<input type="number" min="0" step="0.01" [(ngModel)]="sim.amount" name="sim_amount" /></label>
                <label>Delivery fee<input type="number" min="0" step="0.01" [(ngModel)]="sim.delivery" name="sim_delivery" /></label>
              </div>
              <div class="row">
                <label>
                  Tenant
                  <select [(ngModel)]="sim.tenant_id" name="sim_tenant">
                    <option value="">Any</option>
                    @for (tenant of meta()?.tenants || []; track tenant.id) { <option [value]="tenant.id">{{ tenant.name }}</option> }
                  </select>
                </label>
                <label>
                  Store
                  <select [(ngModel)]="sim.store_id" name="sim_store">
                    <option value="">Any</option>
                    @for (store of meta()?.stores || []; track store.id) { <option [value]="store.id">{{ store.name }}</option> }
                  </select>
                </label>
              </div>
              <div class="actions">
                <button class="btn" type="button" (click)="simulate()" [disabled]="busy()">Run simulation</button>
              </div>

              @if (quote(); as result) {
                <dl class="cx-kv">
                  <div><dt>Matched rule</dt><dd>{{ result.rule_name || 'Platform default' }}</dd></div>
                  <div><dt>Basis</dt><dd>{{ result.basis | money }} ({{ pretty(result.calculation) }})</dd></div>
                  <div><dt>Commission</dt><dd><strong>{{ result.amount | money }}</strong> ({{ result.rate }}%)</dd></div>
                  <div><dt>Seller receives</dt><dd>{{ result.seller_receives | money }}</dd></div>
                </dl>
              }
            </div>
          </section>
        </aside>
      </div>
    </main>
  `,
  styles: [
    `
      .page { width: min(1240px, calc(100% - 40px)); margin: 0 auto; }
      .stack { display: grid; gap: 16px; align-content: start; }
      .sub-head { margin: 18px 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-soft); }
      .tiers { display: grid; gap: 8px; padding: 12px; border: 1px dashed var(--line); border-radius: 12px; }
      .tier-head { display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink-soft); }
      .tier { display: grid; grid-template-columns: repeat(4, 1fr) 30px; gap: 7px; align-items: end; }
      .tier .mini { height: 34px; }
    `,
  ],
})
export class AdminCommissionsComponent {
  private api = inject(ApiService);

  rules = signal<CommissionRule[]>([]);
  meta = signal<CommissionMeta | null>(null);
  earnings = signal<CommissionEarnings | null>(null);
  quote = signal<CommissionQuotePreview | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  message = signal('');
  showForm = signal(false);
  editing = signal<CommissionRule | null>(null);

  summary = signal({ total: 0, active: 0, scheduled: 0, expired: 0, by_scope: {} as Record<string, number> });
  defaults = signal({ platform_rate: '5', config_rate: '5' });

  scopeFilter = '';
  form: RuleForm = { ...BLANK, tiers: [] };
  sim = { amount: '100', delivery: '0', tenant_id: '', store_id: '' };

  scopeOptions = computed<{ id: number; name: string }[]>(() => {
    const meta = this.meta();
    if (!meta) return [];
    switch (this.form.scope_type) {
      case 'plan':
        return meta.plans.map((plan) => ({ id: plan.id, name: `${plan.name} (${plan.commission_rate}%)` }));
      case 'tenant':
        return meta.tenants;
      case 'store':
        return meta.stores;
      case 'category':
        return meta.categories;
      default:
        return [];
    }
  });

  constructor() {
    this.load();
    this.api.commissionMeta().subscribe({ next: (res) => this.meta.set(res.data), error: () => undefined });
    this.api.commissionEarnings().subscribe({ next: (res) => this.earnings.set(res.data), error: () => undefined });
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    const params: Record<string, string> = {};
    if (this.scopeFilter) params['scope_type'] = this.scopeFilter;

    this.api.commissionRules(params).subscribe({
      next: (res) => {
        this.rules.set(res.data || []);
        this.summary.set(res.summary);
        this.defaults.set(res.defaults);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load the commission rules.');
      },
    });
  }

  startCreate() {
    this.editing.set(null);
    this.form = { ...BLANK, tiers: [] };
    this.showForm.set(true);
  }

  edit(rule: CommissionRule) {
    this.editing.set(rule);
    this.form = {
      name: rule.name,
      description: rule.description || '',
      scope_type: rule.scope_type,
      scope_id: rule.scope_id ? String(rule.scope_id) : '',
      calculation: rule.calculation,
      rate: String(rule.rate ?? '0'),
      flat_fee: String(rule.flat_fee ?? '0'),
      min_fee: rule.min_fee ? String(rule.min_fee) : '',
      max_fee: rule.max_fee ? String(rule.max_fee) : '',
      min_order_amount: String(rule.min_order_amount ?? '0'),
      include_delivery: rule.include_delivery,
      priority: String(rule.priority ?? 0),
      status: rule.status,
      effective_from: (rule.effective_from || '').slice(0, 10),
      effective_to: (rule.effective_to || '').slice(0, 10),
      tiers: (rule.tiers || []).map((tier) => ({ ...tier })),
    };
    this.showForm.set(true);
  }

  addTier() {
    const last = this.form.tiers[this.form.tiers.length - 1];
    this.form.tiers = [
      ...this.form.tiers,
      { from_amount: last?.to_amount ? String(last.to_amount) : '0', to_amount: null, rate: '5', flat_fee: '0' },
    ];
  }

  removeTier(index: number) {
    this.form.tiers = this.form.tiers.filter((_, position) => position !== index);
  }

  save() {
    const num = (value: string) => (value === '' ? null : Number(value));
    const payload: Record<string, unknown> = {
      name: this.form.name.trim(),
      description: this.form.description || null,
      scope_type: this.form.scope_type,
      scope_id: this.form.scope_type === 'global' ? null : this.form.scope_id ? Number(this.form.scope_id) : null,
      calculation: this.form.calculation,
      rate: num(this.form.rate) ?? 0,
      flat_fee: num(this.form.flat_fee) ?? 0,
      min_fee: num(this.form.min_fee),
      max_fee: num(this.form.max_fee),
      min_order_amount: num(this.form.min_order_amount) ?? 0,
      include_delivery: this.form.include_delivery,
      priority: num(this.form.priority) ?? 0,
      status: this.form.status,
      effective_from: this.form.effective_from || null,
      effective_to: this.form.effective_to || null,
    };
    if (this.form.calculation === 'tiered') {
      payload['tiers'] = this.form.tiers.map((tier) => ({
        from_amount: Number(tier.from_amount || 0),
        to_amount: tier.to_amount === null || tier.to_amount === '' ? null : Number(tier.to_amount),
        rate: Number(tier.rate || 0),
        flat_fee: Number(tier.flat_fee || 0),
      }));
    }

    this.busy.set(true);
    const existing = this.editing();
    const call = existing ? this.api.updateCommissionRule(existing.id, payload) : this.api.createCommissionRule(payload);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.showForm.set(false);
        this.message.set(existing ? 'Rule updated.' : 'Rule created.');
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'That rule could not be saved.');
      },
    });
  }

  toggle(rule: CommissionRule) {
    this.api.toggleCommissionRule(rule.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('We could not change that rule.'),
    });
  }

  remove(rule: CommissionRule) {
    this.api.deleteCommissionRule(rule.id).subscribe({
      next: () => {
        this.message.set(`${rule.name} deleted.`);
        this.load();
      },
      error: () => this.error.set('That rule could not be deleted.'),
    });
  }

  simulate() {
    this.busy.set(true);
    this.api
      .simulateCommission({
        amount: Number(this.sim.amount || 0),
        delivery_fee: Number(this.sim.delivery || 0),
        tenant_id: this.sim.tenant_id ? Number(this.sim.tenant_id) : null,
        store_id: this.sim.store_id ? Number(this.sim.store_id) : null,
      })
      .subscribe({
        next: (res) => {
          this.busy.set(false);
          this.quote.set(res.data);
        },
        error: () => {
          this.busy.set(false);
          this.error.set('The simulation failed.');
        },
      });
  }

  pretty(value: string | null | undefined): string {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
