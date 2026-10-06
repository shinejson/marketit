import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Coupon, CouponMeta, CouponRedemption, CouponSummary } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

interface CouponForm {
  code: string;
  name: string;
  description: string;
  discount_type: string;
  value: string;
  min_subtotal: string;
  max_discount: string;
  usage_limit: string;
  per_user_limit: string;
  applies_to: string;
  store_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  first_order_only: boolean;
  auto_apply: boolean;
  target_ids: number[];
}

const BLANK: CouponForm = {
  code: '',
  name: '',
  description: '',
  discount_type: 'percentage',
  value: '10',
  min_subtotal: '0',
  max_discount: '',
  usage_limit: '',
  per_user_limit: '1',
  applies_to: 'all',
  store_id: '',
  starts_at: '',
  ends_at: '',
  status: 'active',
  first_order_only: false,
  auto_apply: false,
  target_ids: [],
};

@Component({
  selector: 'app-seller-coupons',
  imports: [FormsModule, DatePipe, MoneyPipe],
  template: `
    <div class="wrap cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">Promotions</p>
          <h1>Coupons &amp; discounts</h1>
          <p class="intro">
            Run percentage, fixed-amount or free-shipping offers across your stores. Discounts are applied before
            commission, so what you see is what you keep.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
          <button class="btn" type="button" (click)="startCreate()">New coupon</button>
        </div>
      </header>

      <section class="cx-stats">
        <div class="cx-stat"><span>Coupons</span><strong>{{ summary()?.total ?? 0 }}</strong><small>All time</small></div>
        <div class="cx-stat good"><span>Live now</span><strong>{{ summary()?.active ?? 0 }}</strong><small>Redeemable today</small></div>
        <div class="cx-stat"><span>Redemptions</span><strong>{{ summary()?.redemptions ?? 0 }}</strong><small>Times used</small></div>
        <div class="cx-stat warn"><span>Discount given</span><strong>{{ summary()?.discount_given || '0' | money }}</strong><small>Total customer savings</small></div>
      </section>

      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }

      <div class="cx-toolbar">
        <input type="search" [(ngModel)]="query" name="q" placeholder="Search code or name" (keyup.enter)="apply()" />
        <select [(ngModel)]="status" name="status" (ngModelChange)="apply()">
          <option value="">All statuses</option>
          @for (option of meta()?.statuses || []; track option) { <option [value]="option">{{ pretty(option) }}</option> }
        </select>
      </div>

      <div class="cx-split">
        <section class="cx-panel">
          <header><div><h2>Your coupons</h2><p>{{ rows().length }} on this page.</p></div></header>
          @if (loading()) {
            <div class="cx-skeleton"><span></span><span></span><span></span></div>
          } @else if (!rows().length) {
            <div class="cx-empty">
              <strong>No coupons yet</strong>
              <p>Create your first offer — a 10% welcome code is a good place to start.</p>
              <button class="btn" type="button" (click)="startCreate()">New coupon</button>
            </div>
          } @else {
            <div class="cx-table-scroll">
              <table class="cx-table">
                <thead><tr><th>Code</th><th>Offer</th><th>Window</th><th class="num">Used</th><th>Status</th><th class="act"></th></tr></thead>
                <tbody>
                  @for (coupon of rows(); track coupon.id) {
                    <tr [class.on]="editing()?.id === coupon.id">
                      <td><strong>{{ coupon.code }}</strong><span class="sub">{{ coupon.name }}</span></td>
                      <td>{{ offerText(coupon) }}<span class="sub">{{ scopeText(coupon) }}</span></td>
                      <td>
                        {{ coupon.starts_at ? (coupon.starts_at | date: 'MMM d') : 'Always' }} –
                        {{ coupon.ends_at ? (coupon.ends_at | date: 'MMM d, y') : 'open' }}
                      </td>
                      <td class="num">{{ coupon.used_count }}@if (coupon.usage_limit) { <span class="muted">/{{ coupon.usage_limit }}</span> }</td>
                      <td>
                        <span class="chip" [class]="'chip ' + coupon.status">{{ pretty(coupon.status) }}</span>
                        @if (coupon.is_live) { <span class="chip ok plain">Live</span> }
                      </td>
                      <td class="act">
                        <button class="mini" type="button" (click)="edit(coupon)">Edit</button>
                        <button class="mini" type="button" (click)="redemptions(coupon)">Usage</button>
                        <button class="mini danger" type="button" (click)="remove(coupon)">Delete</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <footer>
              <span>Page {{ page() }} of {{ lastPage() }}</span>
              <span class="cx-pager">
                <button type="button" [disabled]="page() <= 1" (click)="go(page() - 1)">Previous</button>
                <button type="button" [disabled]="page() >= lastPage()" (click)="go(page() + 1)">Next</button>
              </span>
            </footer>
          }
        </section>

        <aside class="cx-panel">
          @if (showForm()) {
            <header>
              <div><h2>{{ editing() ? 'Edit coupon' : 'New coupon' }}</h2><p>{{ editing()?.code || 'Shoppers enter this at checkout.' }}</p></div>
            </header>
            <div class="cx-panel-body cx-form">
              <div class="row">
                <label>Code<input [(ngModel)]="form.code" name="code" placeholder="WELCOME10" /></label>
                <label>Internal name<input [(ngModel)]="form.name" name="name" placeholder="Welcome offer" /></label>
              </div>
              <div class="row">
                <label>
                  Discount type
                  <select [(ngModel)]="form.discount_type" name="discount_type">
                    <option value="percentage">Percentage off</option>
                    <option value="fixed">Fixed amount off</option>
                    <option value="free_shipping">Free shipping</option>
                  </select>
                </label>
                <label>
                  {{ form.discount_type === 'percentage' ? 'Percent' : 'Amount' }}
                  <input type="number" min="0" step="0.01" [(ngModel)]="form.value" name="value" [disabled]="form.discount_type === 'free_shipping'" />
                </label>
              </div>
              <div class="row">
                <label>Minimum basket<input type="number" min="0" step="0.01" [(ngModel)]="form.min_subtotal" name="min_subtotal" /></label>
                <label>Max discount<input type="number" min="0" step="0.01" [(ngModel)]="form.max_discount" name="max_discount" placeholder="No cap" /></label>
              </div>
              <div class="row">
                <label>Total uses<input type="number" min="1" [(ngModel)]="form.usage_limit" name="usage_limit" placeholder="Unlimited" /></label>
                <label>Uses per customer<input type="number" min="1" [(ngModel)]="form.per_user_limit" name="per_user_limit" /></label>
              </div>
              <div class="row">
                <label>
                  Applies to
                  <select [(ngModel)]="form.applies_to" name="applies_to">
                    <option value="all">Everything in my stores</option>
                    <option value="products">Selected products</option>
                    <option value="categories">Selected categories</option>
                    <option value="stores">Selected stores</option>
                  </select>
                </label>
                <label>
                  Limit to one store
                  <select [(ngModel)]="form.store_id" name="store_id">
                    <option value="">All my stores</option>
                    @for (store of meta()?.stores || []; track store.id) { <option [value]="store.id">{{ store.name }}</option> }
                  </select>
                </label>
              </div>

              @if (form.applies_to !== 'all') {
                <label>
                  Targets
                  <select multiple size="6" [(ngModel)]="form.target_ids" name="target_ids">
                    @for (option of targetOptions(); track option.id) { <option [value]="option.id">{{ option.name }}</option> }
                  </select>
                  <span class="hint">Hold ⌘/Ctrl to pick several.</span>
                </label>
              }

              <div class="row">
                <label>Starts<input type="date" [(ngModel)]="form.starts_at" name="starts_at" /></label>
                <label>Ends<input type="date" [(ngModel)]="form.ends_at" name="ends_at" /></label>
              </div>
              <div class="row">
                <label>
                  Status
                  <select [(ngModel)]="form.status" name="status">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>
              <label class="check"><input type="checkbox" [(ngModel)]="form.first_order_only" name="first_order_only" /> First order only</label>
              <label class="check"><input type="checkbox" [(ngModel)]="form.auto_apply" name="auto_apply" /> Apply automatically when the basket qualifies</label>
              <label>Customer-facing description<textarea [(ngModel)]="form.description" name="description" placeholder="10% off your first order over $50"></textarea></label>

              <div class="actions">
                <button class="btn" type="button" (click)="save()" [disabled]="busy()">{{ busy() ? 'Saving…' : editing() ? 'Save changes' : 'Create coupon' }}</button>
                <button class="btn ghost" type="button" (click)="closeForm()">Cancel</button>
              </div>
            </div>
          } @else if (usageFor(); as coupon) {
            <header>
              <div><h2>{{ coupon.code }} usage</h2><p>{{ usage().length }} redemption(s) loaded.</p></div>
              <button class="mini" type="button" (click)="usageFor.set(null)">Close</button>
            </header>
            @if (!usage().length) {
              <div class="cx-empty"><strong>Not used yet</strong><p>Share the code with your customers to get it moving.</p></div>
            } @else {
              <div class="cx-panel-body cx-list">
                @for (entry of usage(); track entry.id) {
                  <article class="cx-item">
                    <div class="top">
                      <strong>{{ entry.customer?.name || 'Customer' }}</strong>
                      <span class="chip plain">{{ entry.amount | money: entry.currency }}</span>
                      <span class="when">{{ entry.created_at ? (entry.created_at | date: 'MMM d, HH:mm') : '' }}</span>
                    </div>
                    <p>Order #{{ entry.order_id }} · {{ entry.status }}</p>
                  </article>
                }
              </div>
            }
          } @else {
            <header><div><h2>Promotion tips</h2><p>What works on MarketHub.</p></div></header>
            <div class="cx-panel-body">
              <ul class="tips">
                <li><strong>Set a floor.</strong> A minimum basket keeps discounts profitable after commission.</li>
                <li><strong>Cap percentages.</strong> Use “Max discount” so a 20% code cannot wipe out a large order.</li>
                <li><strong>Free shipping converts.</strong> It often beats an equivalent cash discount.</li>
                <li><strong>Auto-apply quietly.</strong> Qualifying baskets get the deal without hunting for a code.</li>
              </ul>
              <button class="btn" type="button" (click)="startCreate()">Create a coupon</button>
            </div>
          }
        </aside>
      </div>
    </div>
  `,
  styles: [
    `
      .tips { margin: 0 0 16px; padding-left: 18px; display: grid; gap: 9px; font-size: 12.5px; line-height: 1.55; color: var(--ink-soft); }
      .tips strong { color: var(--ink); }
      select[multiple] { min-height: 120px; }
    `,
  ],
})
export class SellerCouponsComponent {
  private api = inject(ApiService);

  rows = signal<Coupon[]>([]);
  summary = signal<CouponSummary | null>(null);
  meta = signal<CouponMeta | null>(null);
  usage = signal<CouponRedemption[]>([]);
  usageFor = signal<Coupon | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  message = signal('');
  page = signal(1);
  lastPage = signal(1);
  showForm = signal(false);
  editing = signal<Coupon | null>(null);

  query = '';
  status = '';
  form: CouponForm = { ...BLANK };

  constructor() {
    this.load();
    this.api.tenantCouponMeta().subscribe({ next: (res) => this.meta.set(res.data), error: () => undefined });
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    const params: Record<string, string> = { page: String(this.page()), per_page: '15' };
    if (this.query.trim()) params['q'] = this.query.trim();
    if (this.status) params['status'] = this.status;

    this.api.tenantCoupons(params).subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.summary.set(res.summary);
        this.lastPage.set(res.meta?.last_page || 1);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load your coupons.');
      },
    });
  }

  apply() {
    this.page.set(1);
    this.load();
  }

  go(page: number) {
    this.page.set(Math.max(1, Math.min(page, this.lastPage())));
    this.load();
  }

  targetOptions(): { id: number; name: string }[] {
    const meta = this.meta();
    if (!meta) return [];
    if (this.form.applies_to === 'products') return meta.products;
    if (this.form.applies_to === 'categories') return meta.categories;
    if (this.form.applies_to === 'stores') return meta.stores;
    return [];
  }

  startCreate() {
    this.editing.set(null);
    this.usageFor.set(null);
    this.form = { ...BLANK };
    this.showForm.set(true);
  }

  edit(coupon: Coupon) {
    this.editing.set(coupon);
    this.usageFor.set(null);
    this.form = {
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      value: String(coupon.value ?? ''),
      min_subtotal: String(coupon.min_subtotal ?? '0'),
      max_discount: coupon.max_discount ? String(coupon.max_discount) : '',
      usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : '',
      per_user_limit: coupon.per_user_limit ? String(coupon.per_user_limit) : '',
      applies_to: coupon.applies_to,
      store_id: coupon.store_id ? String(coupon.store_id) : '',
      starts_at: (coupon.starts_at || '').slice(0, 10),
      ends_at: (coupon.ends_at || '').slice(0, 10),
      status: coupon.status,
      first_order_only: coupon.first_order_only,
      auto_apply: coupon.auto_apply,
      target_ids: (coupon.targets || []).map((target) => target.target_id),
    };
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editing.set(null);
  }

  payload(): Record<string, unknown> {
    const num = (value: string) => (value === '' || value === null ? null : Number(value));
    return {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim() || this.form.code.trim(),
      description: this.form.description.trim() || null,
      discount_type: this.form.discount_type,
      value: this.form.discount_type === 'free_shipping' ? 0 : num(this.form.value) ?? 0,
      min_subtotal: num(this.form.min_subtotal) ?? 0,
      max_discount: num(this.form.max_discount),
      usage_limit: num(this.form.usage_limit),
      per_user_limit: num(this.form.per_user_limit),
      applies_to: this.form.applies_to,
      store_id: this.form.store_id ? Number(this.form.store_id) : null,
      starts_at: this.form.starts_at || null,
      ends_at: this.form.ends_at || null,
      status: this.form.status,
      first_order_only: this.form.first_order_only,
      auto_apply: this.form.auto_apply,
      targets: this.form.applies_to === 'all' ? [] : this.form.target_ids.map((id) => Number(id)),
    };
  }

  save() {
    this.busy.set(true);
    this.error.set('');
    const existing = this.editing();
    const call = existing
      ? this.api.updateTenantCoupon(existing.id, this.payload())
      : this.api.createTenantCoupon(this.payload());

    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.closeForm();
        this.message.set(existing ? 'Coupon updated.' : 'Coupon created.');
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'We could not save that coupon.');
      },
    });
  }

  remove(coupon: Coupon) {
    this.api.deleteTenantCoupon(coupon.id).subscribe({
      next: () => {
        this.message.set(`${coupon.code} removed.`);
        this.load();
      },
      error: (err) => this.error.set(err?.error?.message || 'That coupon could not be deleted.'),
    });
  }

  redemptions(coupon: Coupon) {
    this.showForm.set(false);
    this.usageFor.set(coupon);
    this.usage.set([]);
    this.api.tenantCouponRedemptions(coupon.id, { per_page: '25' }).subscribe({
      next: (res) => this.usage.set(res.data || []),
      error: () => this.error.set('We could not load redemptions for that coupon.'),
    });
  }

  offerText(coupon: Coupon): string {
    if (coupon.discount_type === 'free_shipping') return 'Free shipping';
    if (coupon.discount_type === 'percentage') return `${Number(coupon.value)}% off`;
    return `${Number(coupon.value).toFixed(2)} off`;
  }

  scopeText(coupon: Coupon): string {
    const base = coupon.applies_to === 'all' ? 'Whole catalogue' : `Selected ${coupon.applies_to}`;
    return coupon.store ? `${base} · ${coupon.store}` : base;
  }

  pretty(value: string | null | undefined): string {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
