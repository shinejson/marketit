import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { PageMeta } from '../../core/models';

export interface AdminStoreRow {
  id: number;
  tenant_id: number;
  name: string;
  slug: string;
  status: 'active' | 'draft' | 'suspended';
  currency: string;
  is_featured: boolean;
  city?: string | null;
  country?: string | null;
  delivery_fee?: string | number | null;
  products_count?: number;
  rating_avg?: number | string | null;
  rating_count?: number | null;
  created_at?: string;
  tenant?: {
    id: number;
    name: string;
    status: string;
  };
}

@Component({
  selector: 'app-admin-stores',
  imports: [FormsModule, RouterLink, DecimalPipe],
  template: `
    <div class="head">
      <div>
        <p class="eyebrow">Commerce / Directory</p>
        <h1>Store Directory</h1>
        <p class="muted">View, audit, and toggle storefront status and featured promotions across all tenant workspaces.</p>
      </div>
      <div class="head-actions">
        <button class="btn ghost" type="button" (click)="loadStores()" [disabled]="loading()">
          {{ loading() ? 'Refreshing…' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Summary KPIs -->
    <section class="kpis">
      <div class="card kpi">
        <p>Total Stores</p>
        <strong>{{ meta()?.total ?? stores().length | number }}</strong>
        <small>Across all tenants</small>
      </div>
      <div class="card kpi">
        <p>Active</p>
        <strong class="text-ok">{{ activeCount() | number }}</strong>
        <small>Live on marketplace</small>
      </div>
      <div class="card kpi">
        <p>Draft</p>
        <strong class="text-warn">{{ draftCount() | number }}</strong>
        <small>In configuration</small>
      </div>
      <div class="card kpi">
        <p>Suspended</p>
        <strong class="text-danger">{{ suspendedCount() | number }}</strong>
        <small>Hidden from shoppers</small>
      </div>
    </section>

    <!-- Filters & Search Toolbar -->
    <div class="toolbar">
      <div class="tabs">
        <button type="button" class="tab" [class.on]="statusFilter() === ''" (click)="setStatusFilter('')">All</button>
        <button type="button" class="tab" [class.on]="statusFilter() === 'active'" (click)="setStatusFilter('active')">Active</button>
        <button type="button" class="tab" [class.on]="statusFilter() === 'draft'" (click)="setStatusFilter('draft')">Draft</button>
        <button type="button" class="tab" [class.on]="statusFilter() === 'suspended'" (click)="setStatusFilter('suspended')">Suspended</button>
      </div>
      <div class="search-box">
        <input
          [(ngModel)]="searchQuery"
          (keyup.enter)="onSearch()"
          placeholder="Search by store name, slug, tenant, or city…"
        />
        <button class="btn ghost" type="button" (click)="onSearch()">Search</button>
      </div>
    </div>

    @if (notice()) { <div class="notice success">✓ {{ notice() }}</div> }
    @if (error()) { <div class="notice error">{{ error() }}</div> }

    <!-- Stores Table -->
    @if (loading() && !stores().length) {
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    } @else if (!stores().length) {
      <div class="empty card">
        <p>No storefronts match the current filter criteria.</p>
      </div>
    } @else {
      <div class="card table-wrap">
        <table class="stores-table">
          <thead>
            <tr>
              <th>Storefront</th>
              <th>Tenant Workspace</th>
              <th>Products</th>
              <th>Location</th>
              <th>Rating</th>
              <th>Featured</th>
              <th>Status</th>
              <th class="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (s of stores(); track s.id) {
              <tr [class.row-busy]="busyId() === s.id">
                <td>
                  <div class="store-info">
                    <strong>{{ s.name }}</strong>
                    <div class="store-links">
                      <span class="mono">/stores/{{ s.slug }}</span>
                      <a [routerLink]="['/stores', s.slug]" target="_blank" class="ext-link" title="View live storefront">↗</a>
                    </div>
                  </div>
                </td>
                <td>
                  @if (s.tenant) {
                    <span class="tenant-tag">{{ s.tenant.name }}</span>
                  } @else {
                    <span class="muted">Tenant #{{ s.tenant_id }}</span>
                  }
                </td>
                <td>
                  <span class="num">{{ s.products_count ?? 0 }}</span>
                </td>
                <td>
                  <span class="muted small">{{ s.city || '—' }}{{ s.country ? ', ' + s.country : '' }}</span>
                </td>
                <td>
                  @if (s.rating_count) {
                    <span class="rating">★ {{ s.rating_avg }} <small>({{ s.rating_count }})</small></span>
                  } @else {
                    <span class="muted small">Unrated</span>
                  }
                </td>
                <td>
                  <button
                    type="button"
                    class="badge-btn"
                    [class.featured]="s.is_featured"
                    (click)="toggleFeatured(s)"
                    [disabled]="busyId() === s.id"
                    [title]="s.is_featured ? 'Click to unfeature' : 'Click to feature on marketplace'"
                  >
                    {{ s.is_featured ? '★ Featured' : '☆ Standard' }}
                  </button>
                </td>
                <td>
                  <span [class]="'pill ' + s.status">{{ s.status }}</span>
                </td>
                <td class="right actions-col">
                  @if (s.status === 'active') {
                    <button
                      type="button"
                      class="btn mini danger"
                      (click)="toggleStatus(s, 'suspended')"
                      [disabled]="busyId() === s.id"
                    >
                      Suspend
                    </button>
                  } @else {
                    <button
                      type="button"
                      class="btn mini ok"
                      (click)="toggleStatus(s, 'active')"
                      [disabled]="busyId() === s.id"
                    >
                      Activate
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      @if (meta(); as m) {
        @if (m.last_page > 1) {
          <div class="pagination">
            <button
              class="btn ghost"
              [disabled]="m.page <= 1 || loading()"
              (click)="changePage(m.page - 1)"
            >
              ← Previous
            </button>
            <span class="page-info">Page {{ m.page }} of {{ m.last_page }} ({{ m.total }} total)</span>
            <button
              class="btn ghost"
              [disabled]="m.page >= m.last_page || loading()"
              (click)="changePage(m.page + 1)"
            >
              Next →
            </button>
          </div>
        }
      }
    }
  `,
  styles: [`
    :host { display: block; max-width: 1200px; margin: 0 auto; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 22px; }
    .eyebrow { margin: 0 0 6px; color: var(--accent); font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    .head h1 { margin: 0; font-size: clamp(26px, 3vw, 36px); }
    .muted { color: var(--ink-soft); font-size: 13.5px; }
    .small { font-size: 12px; }
    .mono { font-family: ui-monospace, monospace; font-size: 11px; }

    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .kpi { padding: 16px 18px; border-radius: 14px; background: var(--card); border: 1px solid var(--line); }
    .kpi p { margin: 0; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); }
    .kpi strong { display: block; margin: 6px 0 2px; font-size: 26px; }
    .kpi small { color: var(--ink-soft); font-size: 11px; }
    .text-ok { color: var(--ok); }
    .text-warn { color: #d97706; }
    .text-danger { color: var(--danger); }

    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 18px; flex-wrap: wrap; }
    .tabs { display: flex; gap: 4px; background: var(--paper-2); padding: 4px; border-radius: 10px; }
    .tab { border: 0; background: transparent; color: var(--ink-soft); padding: 7px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
    .tab.on { background: var(--card); color: var(--ink); box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .search-box { display: flex; gap: 8px; flex: 1; max-width: 440px; }
    .search-box input { flex: 1; border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; background: var(--card); color: var(--ink); font-size: 13px; }

    .btn { border-radius: 10px; padding: 8px 14px; font-size: 13px; font-weight: 700; cursor: pointer; border: 0; }
    .btn.ghost { background: transparent; border: 1px solid var(--line); color: var(--ink); }
    .btn.ghost:hover { background: var(--paper-2); }
    .btn.mini { padding: 4px 10px; font-size: 11.5px; border-radius: 7px; }
    .btn.ok { background: var(--ok); color: #fff; }
    .btn.danger { background: var(--danger); color: #fff; }
    .btn:disabled { opacity: .55; cursor: not-allowed; }

    .notice { padding: 11px 14px; border-radius: 11px; margin-bottom: 16px; font-size: 13px; font-weight: 600; }
    .notice.success { background: color-mix(in srgb, var(--ok) 12%, transparent); color: var(--ok); }
    .notice.error { background: color-mix(in srgb, var(--danger) 12%, transparent); color: var(--danger); }

    .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 16px; background: var(--card); }
    .stores-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .stores-table th { text-align: left; padding: 12px 16px; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); font-weight: 800; border-bottom: 1px solid var(--line); background: var(--paper-2); }
    .stores-table td { padding: 14px 16px; border-bottom: 1px solid var(--line); vertical-align: middle; }
    .stores-table tr:last-child td { border-bottom: 0; }
    .stores-table tr.row-busy { opacity: .5; pointer-events: none; }
    .right { text-align: right; }

    .store-info { display: flex; flex-direction: column; gap: 3px; }
    .store-info strong { font-size: 14px; }
    .store-links { display: flex; align-items: center; gap: 6px; color: var(--ink-soft); }
    .ext-link { color: var(--accent); text-decoration: none; font-weight: 800; font-size: 12px; }
    .tenant-tag { display: inline-block; padding: 3px 8px; border-radius: 6px; background: var(--paper-2); font-size: 11.5px; font-weight: 600; }
    .rating { font-size: 12px; font-weight: 700; color: #b45309; }

    .pill { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
    .pill.active { background: color-mix(in srgb, var(--ok) 14%, transparent); color: var(--ok); }
    .pill.draft { background: color-mix(in srgb, #d97706 14%, transparent); color: #d97706; }
    .pill.suspended { background: color-mix(in srgb, var(--danger) 14%, transparent); color: var(--danger); }

    .badge-btn { border: 1px solid var(--line); background: var(--paper-2); color: var(--ink-soft); border-radius: 999px; padding: 3px 9px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all .15s ease; }
    .badge-btn.featured { background: color-mix(in srgb, var(--accent) 15%, transparent); border-color: color-mix(in srgb, var(--accent) 40%, transparent); color: var(--accent); }
    .badge-btn:hover:not(:disabled) { border-color: var(--ink); color: var(--ink); }

    .actions-col { white-space: nowrap; }

    .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 20px; }
    .page-info { font-size: 12.5px; color: var(--ink-soft); font-weight: 600; }

    .skeleton-card { height: 70px; border-radius: 12px; background: var(--paper-2); margin-bottom: 10px; }
    .empty { padding: 40px; text-align: center; color: var(--ink-soft); border: 1px solid var(--line); border-radius: 14px; background: var(--card); }

    @media (max-width: 768px) {
      .toolbar { flex-direction: column; align-items: stretch; }
      .search-box { max-width: 100%; }
    }
  `],
})
export class AdminStoresComponent {
  private api = inject(ApiService);

  stores = signal<AdminStoreRow[]>([]);
  meta = signal<PageMeta | null>(null);
  loading = signal(false);
  busyId = signal<number | null>(null);
  statusFilter = signal<string>('');
  searchQuery = '';
  notice = signal('');
  error = signal('');
  page = signal(1);

  activeCount = computed(() => this.stores().filter((s) => s.status === 'active').length);
  draftCount = computed(() => this.stores().filter((s) => s.status === 'draft').length);
  suspendedCount = computed(() => this.stores().filter((s) => s.status === 'suspended').length);

  constructor() {
    this.loadStores();
  }

  loadStores(): void {
    this.loading.set(true);
    this.error.set('');
    const params: Record<string, string | number> = {
      page: this.page(),
      per_page: 15,
    };
    if (this.statusFilter()) {
      params['status'] = this.statusFilter();
    }
    if (this.searchQuery.trim()) {
      params['q'] = this.searchQuery.trim();
    }

    this.api
      .adminStores(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.stores.set(res.data as AdminStoreRow[]);
          this.meta.set(res.meta);
        },
        error: (err) => {
          this.error.set(err.error?.error?.message || 'Could not load stores directory.');
        },
      });
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
    this.page.set(1);
    this.loadStores();
  }

  onSearch(): void {
    this.page.set(1);
    this.loadStores();
  }

  changePage(p: number): void {
    this.page.set(p);
    this.loadStores();
  }

  toggleStatus(store: AdminStoreRow, nextStatus: 'active' | 'suspended'): void {
    this.busyId.set(store.id);
    this.notice.set('');
    this.error.set('');

    this.api
      .adminUpdateStore(store.id, { status: nextStatus })
      .pipe(finalize(() => this.busyId.set(null)))
      .subscribe({
        next: (res) => {
          const updated = res.data;
          this.stores.update((list) =>
            list.map((s) => (s.id === store.id ? { ...s, status: updated.status } : s))
          );
          this.notice.set(`Store "${store.name}" is now ${nextStatus}.`);
        },
        error: (err) => {
          this.error.set(err.error?.error?.message || `Failed to update status for "${store.name}".`);
        },
      });
  }

  toggleFeatured(store: AdminStoreRow): void {
    const nextFeatured = !store.is_featured;
    this.busyId.set(store.id);
    this.notice.set('');
    this.error.set('');

    this.api
      .adminUpdateStore(store.id, { is_featured: nextFeatured })
      .pipe(finalize(() => this.busyId.set(null)))
      .subscribe({
        next: (res) => {
          const updated = res.data;
          this.stores.update((list) =>
            list.map((s) => (s.id === store.id ? { ...s, is_featured: updated.is_featured } : s))
          );
          this.notice.set(
            `Store "${store.name}" is now ${nextFeatured ? 'featured' : 'standard'}.`
          );
        },
        error: (err) => {
          this.error.set(err.error?.error?.message || `Failed to toggle featured status.`);
        },
      });
  }
}
