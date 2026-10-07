import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Storefront } from '../../core/models';

@Component({
  selector: 'app-stores',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="wrap page">
      <div class="page-head">
        <div>
          <p class="kicker">Market Directory</p>
          <h1 class="serif">Stores on the square</h1>
          <p class="lede muted">Explore vetted independent creators, artisans, food markets, and specialty boutiques.</p>
        </div>
        <div class="search-box">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Search stores by name, niche or city…"
            class="search-input"
          />
        </div>
      </div>

      @if (loading()) {
        <div class="grid stores-grid">
          @for (i of [1, 2, 3]; track i) {
            <div class="skeleton-card"></div>
          }
        </div>
      } @else if (filteredStores().length === 0) {
        <div class="empty-state">
          <h3>No stores found</h3>
          <p class="muted">Try adjusting your search criteria or explore our featured shops.</p>
          <button (click)="searchQuery = ''" class="btn accent">Clear Search</button>
        </div>
      } @else {
        <div class="grid stores-grid">
          @for (s of filteredStores(); track s.id) {
            <a class="card store-card" [routerLink]="['/stores', s.slug]">
              <!-- Cover Header -->
              <div class="store-cover">
                <img
                  [src]="s.banner_path || '/images/market-shopper.jpg'"
                  [alt]="s.name + ' storefront banner'"
                  class="store-cover-img"
                  loading="lazy"
                />
                <div class="store-cover-overlay"></div>
                <div class="cover-badges">
                  <span class="cover-badge cat-badge">{{ s.category_name || 'Market Stall' }}</span>
                  <span class="cover-badge delivery-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    {{ s.delivery_days ? s.delivery_days + 'd delivery' : 'Express' }}
                  </span>
                </div>
              </div>

              <!-- Card Content Body -->
              <div class="store-body">
                <!-- Avatar & Rating Row -->
                <div class="store-identity-row">
                  <div class="store-avatar" [style.background]="getStoreColor(s.name)">
                    @if (s.logo_path) {
                      <img [src]="s.logo_path" [alt]="s.name + ' logo'" class="avatar-img" />
                    } @else {
                      <span class="avatar-initials">{{ getStoreInitials(s.name) }}</span>
                    }
                    <span class="verified-badge" title="Verified Independent Seller">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                  </div>

                  <div class="store-rating-box">
                    <span class="rating-stars">★</span>
                    <span class="rating-num">{{ (s.rating_avg || 4.9).toFixed(1) }}</span>
                    <span class="rating-reviews">({{ s.rating_count || 18 }})</span>
                  </div>
                </div>

                <!-- Store Name & Location/Badge -->
                <div class="store-heading-group">
                  <div class="store-name-row">
                    <h3 class="serif store-name">{{ s.name }}</h3>
                    @if (s.badge) {
                      <span class="niche-badge">{{ s.badge }}</span>
                    }
                  </div>
                  <div class="store-submeta">
                    <span class="store-city">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {{ s.city || 'Accra' }}
                    </span>
                    <span class="meta-separator">•</span>
                    <span class="store-inventory-count">
                      {{ s.products_count || (s.sample_products?.length || 0) }} active items
                    </span>
                  </div>
                </div>

                <!-- Store Description -->
                <p class="store-description muted">
                  {{ s.description || (s.name + ' — authentic, curated products direct to your doorstep.') }}
                </p>

                <!-- Sample Product Showcase Strip -->
                @if (s.sample_products && s.sample_products.length > 0) {
                  <div class="store-preview-shelf">
                    <div class="shelf-label">
                      <span>Popular in stall</span>
                    </div>
                    <div class="shelf-items">
                      @for (prod of s.sample_products.slice(0, 3); track prod.id) {
                        <div class="shelf-thumb" [title]="prod.name + ' · $' + prod.price">
                          <img
                            [src]="prod.image_url || '/storage/placeholders/nimbus-bluetooth-speaker.svg'"
                            [alt]="prod.name"
                            class="thumb-img"
                            loading="lazy"
                          />
                          <span class="thumb-price">\${{ prod.price }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Card Action Bar -->
                <div class="store-card-action">
                  <span class="action-btn">
                    <span>Visit Store</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="action-arrow"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </span>
                </div>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 36px 0 72px; }
    .page-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 24px;
      margin-bottom: 32px;
      flex-wrap: wrap;
    }
    .kicker {
      letter-spacing: .16em;
      text-transform: uppercase;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--accent);
      margin: 0 0 6px;
    }
    h1 { font-size: clamp(28px, 4vw, 42px); margin: 0 0 8px; }
    .lede { font-size: 16px; margin: 0; max-width: 55ch; }
    .search-box {
      width: 100%;
      max-width: 340px;
    }
    .search-input {
      width: 100%;
      padding: 11px 16px;
      border: 1px solid var(--line);
      border-radius: 999px;
      font-size: 14px;
      background: var(--card, #fff);
      color: var(--ink);
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .search-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(22, 78, 63, 0.12);
    }

    .stores-grid {
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
    }
    .skeleton-card {
      height: 380px;
      border-radius: 18px;
      background: linear-gradient(90deg, #f0ece3 25%, #e8e3d8 50%, #f0ece3 75%);
      background-size: 200% 100%;
      animation: skeleton-pulse 1.5s infinite;
    }
    @keyframes skeleton-pulse {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .empty-state {
      text-align: center;
      padding: 64px 20px;
      background: var(--card, #fff);
      border: 1px dashed var(--line);
      border-radius: 18px;
      max-width: 480px;
      margin: 40px auto;
    }
    .empty-state h3 { margin: 0 0 8px; font-size: 20px; }
    .empty-state p { margin: 0 0 20px; }

    .store-card {
      display: flex;
      flex-direction: column;
      border-radius: 18px;
      overflow: hidden;
      border: 1px solid var(--line);
      background: var(--card, #fff);
      text-decoration: none;
      color: inherit;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      position: relative;
    }
    .store-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.12);
      border-color: rgba(22, 78, 63, 0.28);
    }
    .store-cover {
      position: relative;
      height: 140px;
      overflow: hidden;
      background: #1c1917;
    }
    .store-cover-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
      display: block;
    }
    .store-card:hover .store-cover-img {
      transform: scale(1.06);
    }
    .store-cover-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 100%);
      pointer-events: none;
    }
    .cover-badges {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      z-index: 2;
    }
    .cover-badge {
      font-size: 11.5px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
      letter-spacing: 0.02em;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .cat-badge {
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(8px);
      color: #1c1914;
      box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    }
    .delivery-badge {
      background: rgba(22, 78, 63, 0.92);
      backdrop-filter: blur(8px);
      color: #f1ede4;
      box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    }
    .delivery-badge svg { color: #fbbf24; }

    .store-body {
      padding: 0 20px 20px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .store-identity-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: -26px;
      margin-bottom: 12px;
      position: relative;
      z-index: 3;
    }
    .store-avatar {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      border: 3px solid #fff;
      box-shadow: 0 4px 14px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      color: #fff;
      overflow: visible;
      flex-shrink: 0;
    }
    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 11px;
    }
    .avatar-initials {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .verified-badge {
      position: absolute;
      bottom: -4px;
      right: -4px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #10b981;
      border: 2px solid #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }
    .store-rating-box {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--bg, #fcfbf7);
      border: 1px solid var(--line);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12.5px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .rating-stars {
      color: #f59e0b;
      font-size: 14px;
      line-height: 1;
    }
    .rating-num {
      font-weight: 700;
      color: var(--ink);
    }
    .rating-reviews {
      color: var(--ink-soft);
      font-size: 11.5px;
    }
    .store-heading-group {
      margin-bottom: 8px;
    }
    .store-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .store-name {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: var(--ink);
      line-height: 1.25;
      transition: color 0.2s ease;
    }
    .store-card:hover .store-name {
      color: var(--accent);
    }
    .niche-badge {
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(217, 119, 6, 0.12);
      color: #b45309;
    }
    .store-submeta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: var(--ink-soft);
      margin-top: 4px;
    }
    .store-city {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .meta-separator {
      color: var(--line);
    }
    .store-inventory-count {
      font-weight: 500;
    }
    .store-description {
      font-size: 13.5px;
      line-height: 1.45;
      margin: 0 0 14px;
      color: var(--ink-soft);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 39px;
    }
    .store-preview-shelf {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px dashed var(--line);
    }
    .shelf-label {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ink-soft);
      margin-bottom: 8px;
    }
    .shelf-items {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .shelf-thumb {
      height: 64px;
      border-radius: 8px;
      background: var(--bg, #fbf9f4);
      border: 1px solid var(--line);
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .thumb-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 4px;
      transition: transform 0.25s ease;
    }
    .store-card:hover .thumb-img {
      transform: scale(1.08);
    }
    .thumb-price {
      position: absolute;
      bottom: 2px;
      right: 2px;
      font-size: 10px;
      font-weight: 700;
      background: rgba(28, 25, 20, 0.75);
      backdrop-filter: blur(4px);
      color: #fff;
      padding: 1px 5px;
      border-radius: 4px;
      line-height: 1.2;
    }
    .store-card-action {
      margin-top: 14px;
      display: flex;
      justify-content: flex-end;
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--accent);
      transition: gap 0.2s ease, color 0.2s ease;
    }
    .action-arrow {
      transition: transform 0.2s ease;
    }
    .store-card:hover .action-btn {
      color: var(--accent-2, #164e3f);
    }
    .store-card:hover .action-arrow {
      transform: translateX(4px);
    }
  `],
})
export class StoresComponent {
  private api = inject(ApiService);
  stores = signal<Storefront[]>([]);
  loading = signal(true);
  searchQuery = '';

  filteredStores = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.stores();
    return this.stores().filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.city && s.city.toLowerCase().includes(q)) ||
      (s.category_name && s.category_name.toLowerCase().includes(q))
    );
  });

  constructor() {
    this.api.marketStores().subscribe({
      next: (res) => {
        this.stores.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getStoreInitials(name: string): string {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  getStoreColor(name: string): string {
    const colors = [
      'linear-gradient(135deg, #1e3a8a, #3b82f6)',
      'linear-gradient(135deg, #065f46, #10b981)',
      'linear-gradient(135deg, #78350f, #d97706)',
      'linear-gradient(135deg, #831843, #ec4899)',
      'linear-gradient(135deg, #312e81, #6366f1)',
      'linear-gradient(135deg, #134e4a, #14b8a6)',
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  }
}
