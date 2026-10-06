import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Coupon, CouponRedemption, CouponSummary } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

interface CouponOptions {
  discount_types: string[];
  statuses: string[];
  applies_to: string[];
  tenants: { id: number; name: string }[];
  stores: { id: number; tenant_id: number; name: string }[];
  platform_categories: { id: number; name: string }[];
}

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
  tenant_id: string;
  store_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  first_order_only: boolean;
  auto_apply: boolean;
  is_stackable: boolean;
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
  tenant_id: '',
  store_id: '',
  starts_at: '',
  ends_at: '',
  status: 'active',
  first_order_only: false,
  auto_apply: false,
  is_stackable: false,
  target_ids: [],
};

@Component({
  selector: 'app-admin-coupons',
  imports: [FormsModule, DatePipe, MoneyPipe],
  template: `
    <main class="page cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">Growth</p>
          <h1>Platform coupons</h1>
          <p class="intro">
            Marketplace-wide promotions funded by the platform, plus visibility on every seller-funded coupon running
            right now.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
          <button class="btn" type="button" (click)="startCreate()">New platform coupon</button>
        </div>
      </header>

      <section class="cx-stats">
        <div class="cx-stat"><span>Coupons</span><strong>{{ summary()?.total ?? 0 }}</strong><small>{{ summary()?.platform ?? 0 }} platform · {{ summary()?.seller ?? 0 }} seller</small></div>
        <div class="cx-stat good"><span>Live now</span><strong>{{ summary()?.active ?? 0 }}</strong><small>Redeemable today</small></div>
        <div class="cx-stat"><span>Redemptions</span><strong>{{ summary()?.redemptions ?? 0 }}</strong><small>Times used</small></div>
        <div class="cx-stat warn"><span>Discount given</span><strong>{{ summary()?.discount_given || '0' | money }}</strong><small>Total customer savings</small></div>
      </section>

      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }

      <div class="cx-toolbar">
        <input type="search" [(ngModel)]="query" name="q" placeholder="Search code or name" (keyup.enter)="apply()" />
        <select [(ngModel)]="scope" name="scope" (ngModelChange)="apply()">
          <option value="">Platform and seller</option>
          <option value="platform">Platform funded</option>
          <option value="seller">Seller funded</option>
        </select>
        <select [(ngModel)]="status" name="status" (ngModelChange)="apply()">
          <option value="">Every status</option>
          @for (option of options()?.statuses || []; track option) { <option [value]="option">{{ pretty(option) }}</option> }
        </select>
      </div>

      <div class="cx-split">
        <section class="cx-panel">
          <header><div><h2>Coupons</h2><p>{{ rows().length }} on this page.</p></div></header>
          @if (loading()) {
            <div class="cx-skeleton"><span></span><span></span><span></span></div>
          } @else if (!rows().length) {
            <div class="cx-empty"><strong>No coupons</strong><p>Create a marketplace-wide offer to drive first orders.</p></div>
          } @else {
            <div class="cx-table-scroll">
              <table class="cx-table">
                <thead><tr><th>Code</th><th>Offer</th><th>Funded by</th><th class="num">Used</th><th>Status</th><th class="act"></th></tr></thead>
                <tbody>
                  @for (coupon of rows(); track coupon.id) {
                    <tr [class.on]="editing()?.id === coupon.id">
                      <td><strong>{{ coupon.code }}</strong><span class="sub">{{ coupon.name }}</span></td>
                      <td>{{ offerText(coupon) }}<span class="sub">{{ windowText(coupon) }}</span></td>
                      <td>
                        @if (coupon.scope === 'platform') { <span class="chip ok plain">Platform</span> }
                        @else { <span class="chip plain">{{ coupon.tenant || 'Seller' }}</span> }
                      </td>
                      <td class="num">{{ coupon.used_count }}@if (coupon.usage_limit) { <span class="muted">/{{ coupon.usage_limit }}</span> }<span class="sub">{{ coupon.redeemed_value | money }}</span></td>
                      <td>
                        <span class="chip" [class]="'chip ' + coupon.status">{{ pretty(coupon.status) }}</span>
                        @if (coupon.is_live) { <span class="chip ok plain">Live</span> }
                      </td>
                      <td class="act">
                        <button class="mini" type="button" (click)="redemptions(coupon)">Usage</button>
                        @if (coupon.scope === 'platform') {
                          <button class="mini" type="button" (click)="edit(coupon)">Edit</button>
                          <button class="mini" type="button" (click)="toggle(coupon)">{{ coupon.status === 'active' ? 'Pause' : 'Activate' }}</button>
                          <button class="mini danger" type="button" (click)="remove(coupon)">Delete</button>
                        } @else {
                          <button class="mini danger" type="button" (click)="toggle(coupon)">{{ coupon.status === 'active' ? 'Suspend' : 'Restore' }}</button>
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
                <button type="button" [disabled]="page() <= 1" (click)="go(page() - 1)">Previous</button>
                <button type="button" [disabled]="page() >= lastPage()" (click)="go(page() + 1)">Next</button>
              </span>
            </footer>
          }
        </section>

        <aside class="cx-panel">
          @if (showForm()) {
            <header><div><h2>{{ editing() ? 'Edit coupon' : 'New platform coupon' }}</h2><p>Funded by the marketplace — the seller is still paid in full.</p></div></header>
            <div class="cx-panel-body cx-form">
              <div class="row">
                <label>Code<input [(ngModel)]="form.code" name="code" placeholder="MARKETHUB10" /></label>
                <label>Name<input [(ngModel)]="form.name" name="name" placeholder="New shopper offer" /></label>
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
                <label>Per customer<input type="number" min="1" [(ngModel)]="form.per_user_limit" name="per_user_limit" /></label>
              </div>
              <div class="row">
                <label>
                  Applies to
                  <select [(ngModel)]="form.applies_to" name="applies_to">
                    <option value="all">Whole marketplace</option>
                    <option value="categories">Selected categories</option>
                    <option value="stores">Selected stores</option>
                  </select>
                </label>
                <label>
                  Restrict to a seller
                  <select [(ngModel)]="form.tenant_id" name="tenant_id">
                    <option value="">Every seller</option>
                    @for (tenant of options()?.tenants || []; track tenant.id) { <option [value]="tenant.id">{{ tenant.name }}</option> }
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
              <label>
                Status
                <select [(ngModel)]="form.status" name="status">
                  @for (option of options()?.statuses || []; track option) { <option [value]="option">{{ pretty(option) }}</option> }
                </select>
              </label>
              <label class="check"><input type="checkbox" [(ngModel)]="form.first_order_only" name="first_order_only" /> First order only</label>
              <label class="check"><input type="checkbox" [(ngModel)]="form.auto_apply" name="auto_apply" /> Apply automatically to qualifying baskets</label>
              <label class="check"><input type="checkbox" [(ngModel)]="form.is_stackable" name="is_stackable" /> Can stack with a seller coupon</label>
              <label>Customer-facing description<textarea [(ngModel)]="form.description" name="description"></textarea></label>
              <div class="actions">
                <button class="btn" type="button" (click)="save()" [disabled]="busy()">{{ busy() ? 'Saving…' : editing() ? 'Save coupon' : 'Create coupon' }}</button>
                <button class="btn ghost" type="button" (click)="showForm.set(false)">Cancel</button>
              </div>
            </div>
          } @else if (usageFor(); as coupon) {
            <header>
              <div><h2>{{ coupon.code }}</h2><p>{{ usage().length }} redemption(s).</p></div>
              <button class="mini" type="button" (click)="usageFor.set(null)">Close</button>
            </header>
            @if (!usage().length) {
              <div class="cx-empty"><strong>Not used yet</strong><p>No shopper has redeemed this code.</p></div>
            } @else {
              <div class="cx-panel-body cx-list">
                @for (entry of usage(); track entry.id) {
                  <article class="cx-item">
                    <div class="top">
                      <strong>{{ entry.customer?.name || 'Customer' }}</strong>
                      <span class="chip plain">{{ entry.amount | money: entry.currency }}</span>
                      <span class="when">{{ entry.created_at ? (entry.created_at | date: 'MMM d, HH:mm') : '' }}</span>
                    </div>
                    <p>Order #{{ entry.order_id }} · basket {{ entry.order_total || '—' }}</p>
                  </article>
                }
              </div>
            }
          } @else {
            <header><div><h2>Who pays for what</h2><p>How discounts settle.</p></div></header>
            <div class="cx-panel-body">
              <ul class="tips">
                <li><strong>Seller coupons</strong> reduce the seller's own net sale, and commission is charged on the discounted amount.</li>
                <li><strong>Platform coupons</strong> are funded centrally, so the seller still settles on the full price.</li>
                <li><strong>Free shipping</strong> credits the delivery fee back to the buyer.</li>
                <li>Suspending a seller coupon stops redemptions immediately without deleting the history.</li>
              </ul>
              <button class="btn" type="button" (click)="startCreate()">Create a platform coupon</button>
            </div>
          }
        </aside>
      </div>
    </main>
  `,
  styles: [
    `
      .page { width: min(1240px, calc(100% - 40px)); margin: 0 auto; }
      .tips { margin: 0 0 16px; padding-left: 18px; display: grid; gap: 9px; font-size: 12.5px; line-height: 1.55; color: var(--ink-soft); }
      .tips strong { color: var(--ink); }
      select[multiple] { min-height: 120px; }
    `,
  ],
})
export class AdminCouponsComponent {
  private api = inject(ApiService);

  rows = signal<Coupon[]>([]);
  summary = signal<CouponSummary | null>(null);
  options = signal<CouponOptions | null>(null);
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
  scope = '';
  status = '';
  form: CouponForm = { ...BLANK };

  constructor() {
    this.load();
    this.api.adminCouponOptions().subscribe({ next: (res) => this.options.set(res.data), error: () => undefined });
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    const params: Record<string, string> = { page: String(this.page()), per_page: '20' };
    if (this.query.trim()) params['q'] = this.query.trim();
    if (this.scope) params['scope'] = this.scope;
    if (this.status) params['status'] = this.status;

    this.api.adminCoupons(params).subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.summary.set(res.summary);
        this.lastPage.set(res.meta?.last_page || 1);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load coupons.');
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
    const options = this.options();
    if (!options) return [];
    if (this.form.applies_to === 'categories') return options.platform_categories;
    if (this.form.applies_to === 'stores') return options.stores;
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
      tenant_id: coupon.tenant_id ? String(coupon.tenant_id) : '',
      store_id: coupon.store_id ? String(coupon.store_id) : '',
      starts_at: (coupon.starts_at || '').slice(0, 10),
      ends_at: (coupon.ends_at || '').slice(0, 10),
      status: coupon.status,
      first_order_only: coupon.first_order_only,
      auto_apply: coupon.auto_apply,
      is_stackable: coupon.is_stackable,
      target_ids: (coupon.targets || []).map((target) => target.target_id),
    };
    this.showForm.set(true);
  }

  save() {
    const num = (value: string) => (value === '' ? null : Number(value));
    const payload: Record<string, unknown> = {
      code: this.form.code.trim().toUpperCase(),
      name: this.form.name.trim() || this.form.code.trim(),
      description: this.form.description || null,
      discount_type: this.form.discount_type,
      value: this.form.discount_type === 'free_shipping' ? 0 : num(this.form.value) ?? 0,
      min_subtotal: num(this.form.min_subtotal) ?? 0,
      max_discount: num(this.form.max_discount),
      usage_limit: num(this.form.usage_limit),
      per_user_limit: num(this.form.per_user_limit),
      applies_to: this.form.applies_to,
      tenant_id: this.form.tenant_id ? Number(this.form.tenant_id) : null,
      store_id: this.form.store_id ? Number(this.form.store_id) : null,
      starts_at: this.form.starts_at || null,
      ends_at: this.form.ends_at || null,
      status: this.form.status,
      first_order_only: this.form.first_order_only,
      auto_apply: this.form.auto_apply,
      is_stackable: this.form.is_stackable,
      targets: this.form.applies_to === 'all' ? [] : this.form.target_ids.map((id) => Number(id)),
    };

    this.busy.set(true);
    const existing = this.editing();
    const call = existing ? this.api.updateAdminCoupon(existing.id, payload) : this.api.createAdminCoupon(payload);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.showForm.set(false);
        this.message.set(existing ? 'Coupon updated.' : 'Coupon created.');
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'That coupon could not be saved.');
      },
    });
  }

  toggle(coupon: Coupon) {
    this.api.toggleAdminCoupon(coupon.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('We could not change that coupon.'),
    });
  }

  remove(coupon: Coupon) {
    this.api.deleteAdminCoupon(coupon.id).subscribe({
      next: () => {
        this.message.set(`${coupon.code} deleted.`);
        this.load();
      },
      error: (err) => this.error.set(err?.error?.message || 'That coupon could not be deleted.'),
    });
  }

  redemptions(coupon: Coupon) {
    this.showForm.set(false);
    this.usageFor.set(coupon);
    this.usage.set([]);
    this.api.adminCouponRedemptions(coupon.id, { per_page: '30' }).subscribe({
      next: (res) => this.usage.set(res.data || []),
      error: () => this.error.set('We could not load redemptions.'),
    });
  }

  offerText(coupon: Coupon): string {
    if (coupon.discount_type === 'free_shipping') return 'Free shipping';
    if (coupon.discount_type === 'percentage') return `${Number(coupon.value)}% off`;
    return `${Number(coupon.value).toFixed(2)} off`;
  }

  windowText(coupon: Coupon): string {
    const from = coupon.starts_at ? new Date(coupon.starts_at).toLocaleDateString() : 'always';
    const to = coupon.ends_at ? new Date(coupon.ends_at).toLocaleDateString() : 'open ended';
    return `${from} → ${to}`;
  }

  pretty(value: string | null | undefined): string {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
