import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Invoice, Plan, Subscription, SubscriptionStats, TenantApplication } from '../../core/models';
import { BarChartComponent, DonutChartComponent, LineChartComponent } from '../../shared/charts.component';
import { MoneyPipe } from '../../shared/money.pipe';

type Tab = 'subscriptions' | 'plans' | 'invoices';

@Component({
  selector: 'app-admin-subscriptions',
  imports: [FormsModule, MoneyPipe, DatePipe, DecimalPipe, TitleCasePipe, LineChartComponent, BarChartComponent, DonutChartComponent],
  template: `
    <header class="head">
      <div>
        <h1>Subscriptions</h1>
        <p class="muted">Plans, tenant billing and invoice collection.</p>
      </div>
      <div class="tabs">
        @for (t of tabs; track t) {
          <button type="button" class="tab" [class.on]="tab() === t" (click)="setTab(t)">{{ t | titlecase }}</button>
        }
      </div>
    </header>

    @if (error()) { <p class="err">{{ error() }}</p> }

    @if (stats(); as s) {
      <div class="grid kpis">
        <div class="card kpi"><p class="muted label">MRR</p><strong>{{ s.mrr | money:'' }}</strong></div>
        <div class="card kpi"><p class="muted label">ARR</p><strong>{{ s.arr | money:'' }}</strong></div>
        <div class="card kpi"><p class="muted label">ARPA</p><strong>{{ s.arpa | money:'' }}</strong></div>
        <div class="card kpi"><p class="muted label">Active</p><strong>{{ s.active | number }}</strong></div>
        <div class="card kpi"><p class="muted label">Trialing</p><strong>{{ s.trialing | number }}</strong></div>
        <div class="card kpi"><p class="muted label">Churn</p><strong>{{ s.churn_rate | number: '1.0-1' }}%</strong></div>
        <div class="card kpi"><p class="muted label">Outstanding</p><strong>{{ s.outstanding | money:'' }}</strong></div>
        <div class="card kpi"><p class="muted label">Collected</p><strong>{{ s.collected | money:'' }}</strong></div>
      </div>

      <div class="grid two">
        <section class="card pad">
          <app-line-chart [points]="s.revenue_by_month" title="Collected revenue" subtitle="Paid invoices per month" prefix="$" color="#1f4b3a" />
        </section>
        <section class="card pad">
          <app-donut-chart [points]="statusMix()" title="Subscriptions by status" centerLabel="subs" />
        </section>
      </div>
    }

    @if (tab() === 'subscriptions') {
      <div class="toolbar">
        <select [(ngModel)]="statusFilter" (change)="loadSubscriptions()">
          <option value="all">Any status</option>
          @for (s of statuses; track s) { <option [value]="s">{{ s | titlecase }}</option> }
        </select>
        <input [(ngModel)]="search" (keyup.enter)="loadSubscriptions()" placeholder="Search tenant…" />
        <button class="btn ghost" type="button" (click)="loadSubscriptions()">Search</button>
        <button class="btn accent" type="button" (click)="assigning.set(!assigning())">Assign plan</button>
      </div>

      @if (assigning()) {
        <form class="card pad editor" (ngSubmit)="assign()">
          <h3>Assign a tenant to a plan</h3>
          <div class="cols">
            <div class="field">
              <label>Tenant</label>
              <select [(ngModel)]="assignTenant" name="tenant">
                <option [ngValue]="null">Select…</option>
                @for (t of tenants(); track t.id) { <option [ngValue]="t.id">{{ t.business_name || t.name }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Plan</label>
              <select [(ngModel)]="assignPlan" name="plan">
                <option [ngValue]="null">Select…</option>
                @for (p of plans(); track p.id) { <option [ngValue]="p.id">{{ p.name }} — {{ +p.price | money:'' }}/{{ p.interval }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Trial days (optional)</label>
              <input type="number" min="0" [(ngModel)]="assignTrial" name="trial" />
            </div>
          </div>
          <div class="row gap">
            <button class="btn accent" type="submit" [disabled]="busy() || !assignTenant || !assignPlan">Assign</button>
            <button class="btn ghost" type="button" (click)="assigning.set(false)">Cancel</button>
          </div>
        </form>
      }

      <div class="card table-wrap">
        <table>
          <thead><tr><th>Tenant</th><th>Plan</th><th>Amount</th><th>Status</th><th>Current period</th><th></th></tr></thead>
          <tbody>
            @for (s of subscriptions(); track s.id) {
              <tr>
                <td><strong>{{ s.tenant?.business_name || s.tenant?.name || 'Tenant #' + s.tenant_id }}</strong></td>
                <td>{{ s.plan?.name || '—' }}</td>
                <td>{{ +s.amount | money:'' }} <span class="muted small">/ {{ s.interval }}</span></td>
                <td>
                  <select class="inline" [ngModel]="s.status" (ngModelChange)="changeStatus(s, $event)">
                    @for (st of statuses; track st) { <option [value]="st">{{ st | titlecase }}</option> }
                  </select>
                </td>
                <td class="muted small">
                  {{ s.current_period_start | date: 'MMM d' }} – {{ s.current_period_end | date: 'MMM d, y' }}
                  @if (s.trial_ends_at) { <br />trial ends {{ s.trial_ends_at | date: 'MMM d' }} }
                </td>
                <td class="actions">
                  <select class="inline" [ngModel]="s.plan_id" (ngModelChange)="changePlan(s, $event)">
                    @for (p of plans(); track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }
                  </select>
                  <button class="btn ghost sm" type="button" (click)="renew(s)">Renew</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="muted">No subscriptions match this filter.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (tab() === 'plans') {
      <div class="pricing-toolbar">
        <div>
          <p class="eyebrow">Pricing architecture</p>
          <h2>Plans that make the next step obvious</h2>
          <p class="muted small">Use annual billing to create a clear value anchor while keeping plan limits and commission visible.</p>
        </div>
        <div class="pricing-actions">
          <div class="cycle-toggle" role="group" aria-label="Pricing display cycle">
            <button type="button" [class.on]="pricingCycle() === 'monthly'" (click)="pricingCycle.set('monthly')">Monthly</button>
            <button type="button" [class.on]="pricingCycle() === 'annual'" (click)="pricingCycle.set('annual')">Annual <span>save 2 months</span></button>
          </div>
          <button class="btn accent" type="button" (click)="startPlan()">New plan</button>
        </div>
      </div>

      @if (planForm(); as f) {
        <form class="card pad editor" (ngSubmit)="savePlan()">
          <h3>{{ f.id ? 'Edit plan' : 'New plan' }}</h3>
          <div class="cols">
            <div class="field"><label>Name</label><input [(ngModel)]="f.name" name="name" required /></div>
            <div class="field"><label>Price</label><input type="number" min="0" step="0.01" [(ngModel)]="f.price" name="price" required /></div>
            <div class="field">
              <label>Interval</label>
              <select [(ngModel)]="f.interval" name="interval"><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select>
            </div>
            <div class="field"><label>Trial days</label><input type="number" min="0" [(ngModel)]="f.trial_days" name="trial_days" /></div>
            <div class="field"><label>Commission (%)</label><input type="number" min="0" max="100" step="0.1" [(ngModel)]="f.commission_rate" name="commission" /></div>
            <div class="field"><label>Max products</label><input type="number" min="0" [(ngModel)]="f.max_products" name="max_products" /></div>
            <div class="field"><label>Max stores</label><input type="number" min="0" [(ngModel)]="f.max_stores" name="max_stores" /></div>
            <div class="field"><label>Max staff</label><input type="number" min="0" [(ngModel)]="f.max_staff" name="max_staff" /></div>
            <div class="field"><label>Description</label><input [(ngModel)]="f.description" name="description" /></div>
            <div class="field"><label>Features (comma separated)</label><input [(ngModel)]="f.featuresText" name="features" /></div>
            <div class="field check"><label><input type="checkbox" [(ngModel)]="f.is_active" name="is_active" /> Active</label></div>
          </div>
          <div class="row gap">
            <button class="btn accent" type="submit" [disabled]="busy()">Save plan</button>
            <button class="btn ghost" type="button" (click)="planForm.set(null)">Cancel</button>
          </div>
        </form>
      }

      <div class="grid plans">
        @for (p of plans(); track p.id) {
          <article class="card pad plan" [class.off]="!p.is_active" [class.featured]="isFeatured(p)">
            @if (isFeatured(p)) { <div class="popular">Most popular</div> }
            <div class="row plan-top">
              <div><h3>{{ p.name }}</h3><span class="muted small">{{ p.description || 'A focused toolkit for growing stores.' }}</span></div>
              <span class="pill">{{ p.is_active ? 'active' : 'archived' }}</span>
            </div>
            <p class="price">{{ displayPrice(p) | money: p.currency }}<span class="muted small"> / {{ pricingCycle() === 'annual' ? 'year' : 'month' }}</span></p>
            @if (pricingCycle() === 'annual') { <p class="saving">Annual view · {{ monthlyEquivalent(p) | money: p.currency }}/mo equivalent</p> }
            <div class="plan-rule"></div>
            <ul class="feature-list">
              <li><b>✓</b>{{ p.commission_rate }}% commission</li>
              <li><b>✓</b>{{ p.trial_days }} day trial</li>
              <li><b>✓</b>{{ p.max_products ?? 'Unlimited' }} products · {{ p.max_stores ?? 'Unlimited' }} stores · {{ p.max_staff ?? 'Unlimited' }} staff</li>
              @for (feature of p.features || []; track feature) { <li><b>✓</b>{{ feature }}</li> }
            </ul>
            <div class="plan-footer"><span class="muted small">{{ p.subscribers_count || 0 }} paying subscribers</span><span class="muted small">{{ p.interval | titlecase }} billing</span></div>
            <div class="row gap">
              <button class="btn ghost sm" type="button" (click)="startPlan(p)">Edit plan</button>
              <button class="btn ghost sm danger" type="button" (click)="removePlan(p)">Delete</button>
            </div>
          </article>
        }
      </div>

      <section class="card pad">
        <app-bar-chart [points]="planSubscribers()" title="Subscribers per plan" />
      </section>
    }

    @if (tab() === 'invoices') {
      <div class="toolbar">
        <select [(ngModel)]="invoiceStatus" (change)="loadInvoices()">
          <option value="all">Any status</option>
          <option value="open">Open</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="void">Void</option>
        </select>
      </div>

      <div class="card table-wrap">
        <table>
          <thead><tr><th>Invoice</th><th>Tenant</th><th>Plan</th><th>Amount</th><th>Issued</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (i of invoices(); track i.id) {
              <tr>
                <td><strong>{{ i.number }}</strong></td>
                <td>{{ i.tenant?.business_name || i.tenant?.name || '—' }}</td>
                <td>{{ i.subscription?.plan?.name || '—' }}</td>
                <td>{{ +i.amount | money:'' }}</td>
                <td class="muted small">{{ i.issued_at | date: 'MMM d, y' }}</td>
                <td><span class="pill" [class]="'pill ' + i.status">{{ i.status | titlecase }}</span></td>
                <td class="actions">
                  @if (i.status !== 'paid') {
                    <button class="btn ghost sm" type="button" (click)="setInvoice(i, 'paid')">Mark paid</button>
                  }
                  @if (i.status === 'open') {
                    <button class="btn ghost sm" type="button" (click)="setInvoice(i, 'void')">Void</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="muted">No invoices yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .head h1 { margin: 0 0 4px; }
    .tabs { display: flex; gap: 4px; background: var(--paper-2); padding: 4px; border-radius: 999px; }
    .tab { border: 0; background: transparent; padding: 8px 14px; border-radius: 999px; cursor: pointer; font-weight: 600; color: var(--ink-soft); }
    .tab.on { background: var(--ink); color: #fff; }
    .kpis { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin: 18px 0; }
    .kpi { padding: 12px 14px; }
    .kpi strong { font-family: Fraunces, Georgia, serif; font-size: 20px; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 2px; }
    .two { grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); margin-bottom: 18px; }
    .pad { padding: 20px; }
    .toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
    .toolbar input, .toolbar select { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; background: #fff; }
    .toolbar input { flex: 1; min-width: 200px; }
    .editor { margin-bottom: 16px; }
    .editor h3 { margin: 0 0 12px; }
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0 16px; }
    .check label { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .row.gap { justify-content: flex-start; gap: 8px; margin-top: 10px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft); padding: 14px 16px; }
    td { padding: 12px 16px; border-top: 1px solid var(--line); vertical-align: middle; }
    .small { font-size: 12px; }
    .inline { border: 1px solid var(--line); border-radius: 10px; padding: 6px 8px; background: #fff; font-size: 13px; }
    .actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .btn.sm { padding: 6px 10px; font-size: 12px; }
    .btn.danger { color: var(--danger); }
    .pricing-toolbar { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; flex-wrap:wrap; margin:26px 0 16px; padding:20px; border:1px solid var(--line); border-radius:20px; background:linear-gradient(120deg,color-mix(in srgb,var(--accent-2) 12%,var(--card)),var(--card)); }
    .pricing-toolbar h2 { margin:0 0 4px; font-family:Fraunces, Georgia, serif; font-size:26px; }
    .pricing-toolbar p { margin:0; }
    .eyebrow { color:var(--accent); text-transform:uppercase; letter-spacing:.12em; font-size:10px; font-weight:800; margin-bottom:4px !important; }
    .pricing-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .cycle-toggle { display:flex; gap:3px; padding:4px; border-radius:999px; background:var(--paper-2); border:1px solid var(--line); }
    .cycle-toggle button { border:0; border-radius:999px; padding:8px 12px; color:var(--ink-soft); background:transparent; font-weight:700; cursor:pointer; }
    .cycle-toggle button.on { color:#fff; background:var(--ink); }
    .cycle-toggle span { color:var(--accent); font-size:10px; margin-left:3px; }
    .plans { grid-template-columns: repeat(auto-fit, minmax(255px, 1fr)); margin-bottom: 18px; align-items:stretch; }
    .plan { position:relative; display:flex; flex-direction:column; min-height:390px; overflow:hidden; }
    .plan.featured { border:1px solid var(--accent); box-shadow:0 12px 28px color-mix(in srgb,var(--accent) 16%,transparent); transform:translateY(-4px); }
    .popular { position:absolute; top:0; left:0; right:0; padding:6px; text-align:center; color:#fff; background:var(--accent); text-transform:uppercase; letter-spacing:.12em; font-size:10px; font-weight:800; }
    .plan.featured .plan-top { padding-top:18px; }
    .plan-top { align-items:flex-start; }
    .plan-top h3 { margin:0 0 3px; }
    .plan-top .small { display:block; max-width:210px; line-height:1.4; }
    .plan.off { opacity: .6; }
    .plan h3 { margin: 0; }
    .price { font-family: Fraunces, Georgia, serif; font-size: 32px; margin: 18px 0 3px; }
    .saving { color:var(--ok); font-size:11px; font-weight:700; }
    .plan-rule { border-top:1px solid var(--line); margin:15px 0 8px; }
    .feature-list { list-style:none; margin:0; padding:0; font-size:13px; display:flex; flex-direction:column; gap:8px; color:var(--ink-soft); flex:1; }
    .feature-list li { display:flex; gap:8px; }
    .feature-list b { color:var(--ok); }
    .plan-footer { display:flex; justify-content:space-between; gap:8px; border-top:1px solid var(--line); margin-top:16px; padding-top:12px; }
    .plan .row.gap { margin-top:14px; }

    .pill.paid { background: rgba(31,75,58,.14); color: var(--ok); }
    .pill.open { background: rgba(201,162,39,.18); color: #7a6410; }
    .pill.failed { background: rgba(155,44,44,.14); color: var(--danger); }
  `],
})
export class AdminSubscriptionsComponent {
  private api = inject(ApiService);

  readonly tabs: Tab[] = ['subscriptions', 'plans', 'invoices'];
  readonly statuses = ['trialing', 'active', 'past_due', 'canceled', 'expired'];

  tab = signal<Tab>('subscriptions');
  pricingCycle = signal<'monthly' | 'annual'>('monthly');
  subscriptions = signal<Subscription[]>([]);
  plans = signal<Plan[]>([]);
  invoices = signal<Invoice[]>([]);
  tenants = signal<TenantApplication[]>([]);
  stats = signal<SubscriptionStats | null>(null);
  planForm = signal<any>(null);
  assigning = signal(false);
  busy = signal(false);
  error = signal('');

  search = '';
  statusFilter = 'all';
  invoiceStatus = 'all';
  assignTenant: number | null = null;
  assignPlan: number | null = null;
  assignTrial: number | null = null;

  constructor() {
    this.loadSubscriptions();
    this.loadPlans();
    this.api.adminTenants({ status: 'all', per_page: 100 }).subscribe((res) => this.tenants.set(res.data));
  }

  setTab(tab: Tab) {
    this.tab.set(tab);
    if (tab === 'invoices') this.loadInvoices();
    if (tab === 'plans') this.loadPlans();
  }

  statusMix() {
    const by = this.stats()?.by_status ?? {};
    return Object.entries(by).map(([label, value]) => ({ label: label.replace('_', ' '), value: Number(value) }));
  }

  planSubscribers() {
    return this.plans().map((p) => ({ label: p.name, value: p.subscribers_count || 0 }));
  }

  isFeatured(plan: Plan): boolean {
    return plan.slug === 'growth' || (plan.slug === 'pro' && !this.plans().some((item) => item.slug === 'growth'));
  }

  displayPrice(plan: Plan): number {
    const price = Number(plan.price) || 0;
    if (this.pricingCycle() === 'annual') return plan.interval === 'yearly' ? price : price * 10;
    return plan.interval === 'yearly' ? price / 12 : price;
  }

  monthlyEquivalent(plan: Plan): number {
    return this.displayPrice(plan) / 12;
  }

  loadSubscriptions() {
    const params: Record<string, string | number> = { status: this.statusFilter };
    if (this.search.trim()) params['q'] = this.search.trim();

    this.api.adminSubscriptions(params).subscribe({
      next: (res) => {
        this.subscriptions.set(res.data);
        this.stats.set(res.stats);
      },
      error: () => this.error.set('Could not load subscriptions.'),
    });
  }

  loadPlans() {
    this.api.adminPlans().subscribe({
      next: (res) => this.plans.set(res.data),
      error: () => this.error.set('Could not load plans.'),
    });
  }

  loadInvoices() {
    this.api.adminInvoices({ status: this.invoiceStatus }).subscribe({
      next: (res) => this.invoices.set(res.data),
      error: () => this.error.set('Could not load invoices.'),
    });
  }

  assign() {
    if (!this.assignTenant || !this.assignPlan) return;
    this.busy.set(true);
    this.api.createSubscription({
      tenant_id: this.assignTenant,
      plan_id: this.assignPlan,
      trial_days: this.assignTrial ?? undefined,
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.assigning.set(false);
        this.assignTenant = this.assignPlan = this.assignTrial = null;
        this.loadSubscriptions();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(this.messageFrom(e));
      },
    });
  }

  changeStatus(subscription: Subscription, status: string) {
    this.api.updateSubscription(subscription.id, { status }).subscribe({
      next: () => this.loadSubscriptions(),
      error: (e) => this.error.set(this.messageFrom(e)),
    });
  }

  changePlan(subscription: Subscription, planId: number) {
    if (planId === subscription.plan_id) return;
    this.api.updateSubscription(subscription.id, { plan_id: planId }).subscribe({
      next: () => this.loadSubscriptions(),
      error: (e) => this.error.set(this.messageFrom(e)),
    });
  }

  renew(subscription: Subscription) {
    this.api.renewSubscription(subscription.id).subscribe({
      next: () => this.loadSubscriptions(),
      error: (e) => this.error.set(this.messageFrom(e)),
    });
  }

  startPlan(plan?: Plan) {
    this.planForm.set(plan
      ? { ...plan, price: +plan.price, commission_rate: +plan.commission_rate, featuresText: (plan.features || []).join(', ') }
      : {
          name: '', price: 0, interval: 'monthly', trial_days: 14, commission_rate: 10,
          max_products: null, max_stores: null, max_staff: null, description: '', featuresText: '', is_active: true,
        });
  }

  savePlan() {
    const f = this.planForm();
    if (!f) return;
    this.busy.set(true);

    const payload: any = {
      name: f.name,
      price: Number(f.price),
      interval: f.interval,
      trial_days: Number(f.trial_days) || 0,
      commission_rate: Number(f.commission_rate) || 0,
      max_products: f.max_products === '' ? null : f.max_products,
      max_stores: f.max_stores === '' ? null : f.max_stores,
      max_staff: f.max_staff === '' ? null : f.max_staff,
      description: f.description || null,
      is_active: !!f.is_active,
      features: String(f.featuresText || '').split(',').map((s: string) => s.trim()).filter(Boolean),
    };

    const request = f.id ? this.api.updatePlan(f.id, payload) : this.api.createPlan(payload);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.planForm.set(null);
        this.loadPlans();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(this.messageFrom(e));
      },
    });
  }

  removePlan(plan: Plan) {
    if (!confirm(`Delete the ${plan.name} plan?`)) return;
    this.api.deletePlan(plan.id).subscribe({
      next: () => this.loadPlans(),
      error: (e) => this.error.set(this.messageFrom(e)),
    });
  }

  setInvoice(invoice: Invoice, status: string) {
    this.api.updateInvoice(invoice.id, status).subscribe({
      next: () => {
        this.loadInvoices();
        this.loadSubscriptions();
      },
      error: (e) => this.error.set(this.messageFrom(e)),
    });
  }

  private messageFrom(e: any): string {
    const payload = e?.error;
    const fields = payload?.errors || payload?.error?.fields;
    const first = fields ? (Object.values(fields).flat()[0] as string) : null;
    return first || payload?.message || payload?.error?.message || 'Something went wrong.';
  }
}
