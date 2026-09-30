import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Category, ProductCard } from '../../core/models';
import { ProductCardComponent } from '../../shared/product-card.component';

@Component({
  selector: 'app-catalog',
  imports: [FormsModule, ProductCardComponent],
  template: `
    <div class="wrap page">
      <h1>Products</h1>
      <form class="filters" (ngSubmit)="load(true)">
        <input [(ngModel)]="q" name="q" placeholder="Search the square" />
        <select [(ngModel)]="categoryId" name="category_id" (change)="load(true)">
          <option value="">All categories</option>
          @for (c of categories(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
        <select [(ngModel)]="sort" name="sort" (change)="load()">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low</option>
          <option value="price_desc">Price: high</option>
          <option value="name">Name</option>
        </select>
        <button class="btn" type="submit">Search</button>
      </form>
      @if (loading()) {
        <div class="grid cards">@for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton" style="height:280px"></div> }</div>
      } @else if (!products().length) {
        <div class="empty card">No results. Reset filters and try again.</div>
      } @else {
        <div class="grid cards">
          @for (p of products(); track p.impression_id || p.id) { <app-product-card [product]="p" /> }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 32px 0 64px; }
    .filters { display:flex; gap: 10px; margin: 16px 0 24px; flex-wrap: wrap; }
    .filters input { flex:1; min-width: 200px; border:1px solid var(--line); border-radius: 12px; padding: 11px 12px; }
    .filters select { border:1px solid var(--line); border-radius: 12px; padding: 11px 12px; background: #fff; }
    .cards { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
  `],
})
export class CatalogComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  products = signal<ProductCard[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  q = '';
  categoryId = '';
  sort = 'newest';
  private appliedKey: string | null = null;

  constructor() {
    this.api.marketCategories().subscribe((res) => this.categories.set(res.data));
    this.route.queryParams.subscribe((params) => {
      const q = params['q'] ?? '';
      const categoryId = params['category_id'] != null ? String(params['category_id']) : '';
      const key = `${q}|${categoryId}`;
      if (key === this.appliedKey) return;
      this.appliedKey = key;
      this.q = q;
      this.categoryId = categoryId;
      this.load();
    });
  }

  load(syncUrl = false) {
    this.loading.set(true);
    const params: Record<string, string> = { sort: this.sort, per_page: '24' };
    if (this.q) params['q'] = this.q;
    if (this.categoryId) params['category_id'] = this.categoryId;
    if (syncUrl) {
      this.appliedKey = `${this.q}|${this.categoryId}`;
      this.router.navigate(['/products'], {
        queryParams: { ...(this.q ? { q: this.q } : {}), ...(this.categoryId ? { category_id: this.categoryId } : {}) },
        replaceUrl: true,
      });
    }
    this.api.marketProducts(params).subscribe({
      next: (res) => { this.products.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
