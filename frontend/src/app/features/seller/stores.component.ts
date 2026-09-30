import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { TenantApplication } from '../../core/models';

interface StoreForm {
  name: string;
  slug: string;
  status: 'draft' | 'active' | 'suspended';
  description: string;
  currency: string;
  delivery_fee: number;
  delivery_days: number;
  contact_email: string;
  contact_phone: string;
  city: string;
  country: string;
}

@Component({
  selector: 'app-seller-stores',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="head">
      <div>
        <h1>Stores</h1>
        <p class="muted">Create and configure each storefront, then add products under the correct store.</p>
      </div>
      <a class="btn ghost" routerLink="/tenant/products">Products</a>
    </div>

    @if (tenant(); as t) {
      <section [class]="'notice ' + t.status">
        <strong>{{ statusTitle(t) }}</strong>
        <span>{{ statusCopy(t) }}</span>
        @if (t.status !== 'active') {
          <a routerLink="/sell">Review application</a>
        }
      </section>
    }

    @if (error()) { <p class="err">{{ error() }}</p> }
    @if (saved()) { <p class="ok">{{ saved() }}</p> }

    <form class="card pad form" (ngSubmit)="create()">
      <div>
        <h2 class="serif">New store</h2>
        <p class="muted">Draft stores are private. Only active stores owned by approved tenants appear in the marketplace.</p>
      </div>
      <div class="grid two">
        <div class="field"><label>Name</label><input [(ngModel)]="form.name" name="name" required placeholder="Accra Home Goods" /></div>
        <div class="field"><label>Slug</label><input [(ngModel)]="form.slug" name="slug" placeholder="accra-home-goods" /></div>
        <div class="field"><label>Currency</label><input [(ngModel)]="form.currency" name="currency" maxlength="3" required /></div>
        <div class="field"><label>Country</label><input [(ngModel)]="form.country" name="country" maxlength="2" /></div>
        <div class="field"><label>City</label><input [(ngModel)]="form.city" name="city" /></div>
        <div class="field"><label>Contact email</label><input [(ngModel)]="form.contact_email" name="contact_email" type="email" /></div>
        <div class="field"><label>Contact phone</label><input [(ngModel)]="form.contact_phone" name="contact_phone" /></div>
        <div class="field"><label>Delivery fee</label><input [(ngModel)]="form.delivery_fee" name="delivery_fee" type="number" min="0" step="0.01" /></div>
        <div class="field"><label>Delivery days</label><input [(ngModel)]="form.delivery_days" name="delivery_days" type="number" min="0" /></div>
      </div>
      <div class="field"><label>Description</label><textarea [(ngModel)]="form.description" name="description" rows="3"></textarea></div>
      <button class="btn ok" type="submit" [disabled]="busy()">{{ busy() ? 'Creating…' : 'Create draft store' }}</button>
    </form>

    <div class="grid stores">
      @for (store of stores(); track store.id) {
        <article class="card pad store">
          <div class="store-head">
            <div>
              <p class="muted mini">Store #{{ store.id }} · {{ store.products_count || 0 }} products</p>
              <h3>{{ store.name }}</h3>
              <p class="muted">/{{ store.slug }} · {{ store.city || 'No city' }} {{ store.country ? '· ' + store.country : '' }}</p>
            </div>
            <span [class]="'pill ' + store.status">{{ store.status }}</span>
          </div>

          <div class="grid two edit">
            <div class="field"><label>Name</label><input [(ngModel)]="store.name" [name]="'name-' + store.id" /></div>
            <div class="field"><label>Slug</label><input [(ngModel)]="store.slug" [name]="'slug-' + store.id" /></div>
            <div class="field"><label>Status</label>
              <select [(ngModel)]="store.status" [name]="'status-' + store.id">
                <option value="draft">draft</option>
                <option value="active" [disabled]="!canPublish()">active</option>
                <option value="suspended">suspended</option>
              </select>
              @if (!canPublish()) { <span class="hint">Publishing unlocks after super admin approval.</span> }
            </div>
            <div class="field"><label>Currency</label><input [(ngModel)]="store.currency" [name]="'currency-' + store.id" maxlength="3" /></div>
            <div class="field"><label>Delivery fee</label><input [(ngModel)]="store.delivery_fee" [name]="'fee-' + store.id" type="number" min="0" step="0.01" /></div>
            <div class="field"><label>Delivery days</label><input [(ngModel)]="store.delivery_days" [name]="'days-' + store.id" type="number" min="0" /></div>
            <div class="field"><label>Contact email</label><input [(ngModel)]="store.contact_email" [name]="'email-' + store.id" type="email" /></div>
            <div class="field"><label>Contact phone</label><input [(ngModel)]="store.contact_phone" [name]="'phone-' + store.id" /></div>
            <div class="field"><label>City</label><input [(ngModel)]="store.city" [name]="'city-' + store.id" /></div>
            <div class="field"><label>Country</label><input [(ngModel)]="store.country" [name]="'country-' + store.id" maxlength="2" /></div>
          </div>
          <div class="field"><label>Description</label><textarea [(ngModel)]="store.description" [name]="'description-' + store.id" rows="2"></textarea></div>
          <div class="actions">
            <button class="btn ok" type="button" (click)="save(store)">Save configuration</button>
            <a class="btn ghost" [routerLink]="['/tenant/products']" [queryParams]="{ store_id: store.id }">Products for this store</a>
            <button class="btn ghost danger" type="button" (click)="remove(store.id)">Remove</button>
          </div>
        </article>
      } @empty {
        <div class="card empty">
          <h3>No stores yet</h3>
          <p>Create your first draft store above. Once your tenant is approved, set it active to publish it.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap: 16px; margin-bottom: 16px; }
    h1, h2, h3 { margin: 0; }
    .pad { padding: 18px; }
    .form { margin-bottom: 18px; }
    .two { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0 16px; }
    .stores { gap: 16px; }
    .store-head { display:flex; justify-content:space-between; align-items:flex-start; gap: 12px; margin-bottom: 14px; }
    .mini { font-size: 12px; margin: 0 0 4px; }
    .store-head h3 { font-size: 24px; }
    .edit { margin-top: 8px; }
    .actions { display:flex; flex-wrap:wrap; gap: 8px; margin-top: 10px; }
    .notice { display:flex; flex-wrap:wrap; gap: 8px 12px; align-items:center; padding: 12px 14px; border-radius: 14px; margin: 0 0 16px; background: var(--paper-2); }
    .notice.active { background: rgba(31,75,58,.12); }
    .notice.pending { background: rgba(201,162,39,.15); }
    .notice.suspended, .notice.rejected { background: rgba(155,44,44,.10); }
    .notice a { color: var(--accent); font-weight: 700; text-decoration: underline; }
    .pill.active { background: rgba(31,75,58,.14); color: var(--accent-2); }
    .pill.draft { background: var(--paper-2); }
    .pill.suspended { background: rgba(155,44,44,.10); color: var(--danger); }
    .hint { display:block; font-size: 12px; color: var(--ink-soft); margin-top: 5px; }
    .ok { color: var(--ok); font-weight: 700; }
    .btn.ok { color: #fff; }
    .danger { color: var(--danger); }
  `],
})
export class SellerStoresComponent {
  private readonly api = inject(ApiService);

  tenant = signal<TenantApplication | null>(null);
  stores = signal<any[]>([]);
  busy = signal(false);
  error = signal('');
  saved = signal('');
  canPublish = computed(() => this.tenant()?.status === 'active');

  form: StoreForm = {
    name: '',
    slug: '',
    status: 'draft',
    description: '',
    currency: 'USD',
    delivery_fee: 0,
    delivery_days: 3,
    contact_email: '',
    contact_phone: '',
    city: '',
    country: '',
  };

  constructor() {
    this.loadTenant();
    this.reload();
  }

  loadTenant() {
    this.api.tenant().subscribe({
      next: (res) => this.tenant.set(res.data),
      error: (e) => this.error.set(e.error?.error?.message || 'Could not load tenant status.'),
    });
  }

  reload() {
    this.api.sellerStores().subscribe({
      next: (res) => this.stores.set(res.data),
      error: (e) => this.error.set(e.error?.error?.message || 'Could not load stores.'),
    });
  }

  create() {
    this.busy.set(true);
    this.error.set('');
    this.saved.set('');
    this.api.createStore({ ...this.form, status: 'draft' }).subscribe({
      next: () => {
        this.busy.set(false);
        this.saved.set('Draft store created. Add products or update its configuration below.');
        this.form = { ...this.form, name: '', slug: '', description: '', contact_email: '', contact_phone: '', city: '' };
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(e.error?.error?.message || 'Could not create store.');
      },
    });
  }

  save(store: any) {
    this.error.set('');
    this.saved.set('');
    this.api.updateStore(store.id, this.payload(store)).subscribe({
      next: () => {
        this.saved.set(`${store.name} saved.`);
        this.reload();
      },
      error: (e) => this.error.set(e.error?.error?.message || 'Could not save store.'),
    });
  }

  remove(id: number) {
    if (!confirm('Remove this store? Products under it will also be removed.')) return;
    this.error.set('');
    this.saved.set('');
    this.api.deleteStore(id).subscribe({
      next: () => {
        this.saved.set('Store removed.');
        this.reload();
      },
      error: (e) => this.error.set(e.error?.error?.message || 'Could not remove store.'),
    });
  }

  statusTitle(tenant: TenantApplication): string {
    if (tenant.status === 'active') return 'Tenant approved';
    if (tenant.status === 'pending') return 'Application under review';
    if (tenant.status === 'rejected') return 'Application needs changes';
    return 'Tenant suspended';
  }

  statusCopy(tenant: TenantApplication): string {
    if (tenant.status === 'active') return 'You can publish active stores and products to the marketplace.';
    if (tenant.status === 'pending') return 'You can prepare draft stores and products now. Publishing unlocks after super admin approval.';
    if (tenant.status === 'rejected') return 'Update and resubmit your seller application before publishing stores.';
    return 'Store changes are limited while this tenant is suspended.';
  }

  private payload(store: any): Record<string, unknown> {
    return {
      name: store.name,
      slug: store.slug,
      status: store.status,
      description: store.description,
      currency: store.currency,
      delivery_fee: store.delivery_fee,
      delivery_days: store.delivery_days,
      contact_email: store.contact_email,
      contact_phone: store.contact_phone,
      city: store.city,
      country: store.country,
    };
  }
}
