import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-seller-products',
  imports: [FormsModule, CurrencyPipe, RouterLink],
  template: `
    <div class="head">
      <div>
        <h1>Products</h1>
        <p class="muted">Products belong to one store. Choose a store before creating stock.</p>
      </div>
      <button class="btn" (click)="showForm = !showForm" [disabled]="!stores().length">New product</button>
    </div>

    @if (stores().length) {
      <div class="toolbar card">
        <label>Filter by store</label>
        <select [(ngModel)]="filterStore" name="filterStore" (ngModelChange)="reload()">
          <option value="">All stores</option>
          @for (s of stores(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
        </select>
        <a class="btn ghost" routerLink="/tenant/stores">Manage stores</a>
      </div>
    } @else {
      <div class="card empty">
        <h3>Create a store first</h3>
        <p>Every product must be attached to a store. Add your first draft store, then return here to create products.</p>
        <a class="btn ok" routerLink="/tenant/stores">Create store</a>
      </div>
    }

    @if (error()) { <p class="err">{{ error() }}</p> }

    @if (showForm && stores().length) {
      <form class="card pad" (ngSubmit)="create()">
        <div class="grid two">
          <div class="field"><label>Store</label>
            <select [(ngModel)]="form.store_id" name="store_id" required>
              @for (s of stores(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
            </select>
          </div>
          <div class="field"><label>Category</label>
            <select [(ngModel)]="form.category_id" name="category_id">
              <option value="">No category</option>
              @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
            </select>
          </div>
          <div class="field"><label>Name</label><input [(ngModel)]="form.name" name="name" required /></div>
          <div class="field"><label>Brand</label><input [(ngModel)]="form.brand" name="brand" /></div>
          <div class="field"><label>Price</label><input type="number" step="0.01" min="0" [(ngModel)]="form.price" name="price" required /></div>
          <div class="field"><label>Initial quantity</label><input type="number" min="0" [(ngModel)]="form.quantity" name="quantity" /></div>
          <div class="field"><label>Status</label>
            <select [(ngModel)]="form.status" name="status">
              <option value="draft">draft</option>
              <option value="active">active</option>
            </select>
          </div>
          <div class="field"><label>SKU</label><input [(ngModel)]="form.sku" name="sku" placeholder="Optional" /></div>
        </div>
        <div class="field"><label>Description</label><textarea rows="3" [(ngModel)]="form.description" name="description"></textarea></div>
        <button class="btn ok" type="submit" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Save product' }}</button>
      </form>
    }

    <div class="grid list">
      @for (p of products(); track p.id) {
        <div class="card pad row">
          <div>
            <strong>{{ p.name }}</strong>
            <p class="muted">{{ p.store?.name || 'No store' }} · {{ p.status }} · {{ +p.price | currency }}</p>
            @if (p.variants?.[0]?.inventory) {
              <p class="muted mini">Stock: {{ p.variants[0].inventory.quantity - p.variants[0].inventory.reserved }}</p>
            }
          </div>
          <button class="btn ghost" (click)="toggle(p)">{{ p.status === 'active' ? 'Archive' : 'Activate' }}</button>
        </div>
      } @empty {
        @if (stores().length) {
          <div class="card empty">
            <h3>No products yet</h3>
            <p>Add a product to one of your stores. Products in draft stores stay private.</p>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap: 16px; margin-bottom: 14px; }
    h1, h3 { margin: 0; }
    .toolbar { display:flex; flex-wrap:wrap; gap: 10px; align-items:center; padding: 12px 14px; margin: 12px 0; }
    .toolbar label { font-weight: 700; font-size: 13px; color: var(--ink-soft); }
    .toolbar select { border: 1px solid var(--line); border-radius: 999px; padding: 9px 12px; background: #fff; min-width: 220px; }
    .pad { padding: 14px; margin: 10px 0; }
    .row { display:flex; justify-content:space-between; align-items:center; gap: 12px; }
    .two { grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap: 0 16px; }
    .list { gap: 8px; }
    .mini { font-size: 12px; margin: 0; }
  `],
})
export class SellerProductsComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  products = signal<any[]>([]);
  stores = signal<any[]>([]);
  categories = signal<any[]>([]);
  error = signal('');
  busy = signal(false);
  showForm = false;
  filterStore = '';
  form = {
    store_id: '',
    category_id: '',
    name: '',
    description: '',
    brand: '',
    price: 10,
    quantity: 10,
    status: 'active',
    sku: '',
  };

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.filterStore = params.get('store_id') || '';
      if (this.filterStore) this.form.store_id = this.filterStore;
      this.reload();
    });
    this.api.sellerStores().subscribe((res) => {
      this.stores.set(res.data);
      if (this.filterStore) this.form.store_id = this.filterStore;
      else if (res.data[0]) this.form.store_id = res.data[0].id;
    });
    this.api.sellerCategories().subscribe((res) => this.categories.set(res.data));
  }

  reload() {
    const params: Record<string, string | number> = {};
    if (this.filterStore) params['store_id'] = this.filterStore;
    this.api.sellerProducts(params).subscribe({
      next: (res) => this.products.set(res.data),
      error: (e) => this.error.set(e.error?.error?.message || 'Could not load products.'),
    });
  }

  create() {
    this.busy.set(true);
    this.error.set('');
    const payload = { ...this.form } as any;
    if (!payload.category_id) delete payload.category_id;
    if (!payload.sku) delete payload.sku;
    if (!payload.brand) delete payload.brand;
    if (!payload.description) delete payload.description;
    this.api.createProduct(payload).subscribe({
      next: () => {
        this.busy.set(false);
        this.showForm = false;
        const storeId = this.form.store_id;
        this.form = { ...this.form, store_id: storeId, category_id: '', name: '', description: '', brand: '', price: 10, quantity: 10, status: 'active', sku: '' };
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(e.error?.error?.message || 'Could not create product.');
      },
    });
  }

  toggle(p: any) {
    const status = p.status === 'active' ? 'archived' : 'active';
    this.api.updateProduct(p.id, { status }).subscribe({
      next: () => this.reload(),
      error: (e) => this.error.set(e.error?.error?.message || 'Could not update product.'),
    });
  }
}
