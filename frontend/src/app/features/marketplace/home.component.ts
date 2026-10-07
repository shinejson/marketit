import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { Category, HeroSlide, ProductCard, Storefront } from '../../core/models';
import { ProductCardComponent } from '../../shared/product-card.component';
import { SellerStudioPromoComponent } from './seller-studio-promo.component';

@Component({
  selector: 'app-home',
  imports: [FormsModule, RouterLink, ProductCardComponent, SellerStudioPromoComponent],
  template: `
    <!-- Hero: search + CTAs + live counts (§9 Marketplace and Storefront) -->
    <section class="hero">
      <div class="wrap hero-wrap">
        <div class="hero-content">
          <p class="kicker">Independent stores. One checkout.</p>
          <h1>A marketplace built like a city market — many stalls, one square.</h1>
          <p class="lede">Browse products across many sellers, keep a multi-store cart, and pay once. Every store packs and delivers its own orders.</p>
          <form class="search" (ngSubmit)="search()">
            <input [(ngModel)]="q" name="q" placeholder="Search products across every store…" aria-label="Search products" />
            <button class="btn accent" type="submit">Search</button>
          </form>
          <div class="cta">
            <a routerLink="/products" class="btn">Shop the square</a>
            <a routerLink="/platform" class="btn accent">Store Builder SaaS</a>
            <a [routerLink]="sellTarget()" class="btn ghost">Open your store</a>
          </div>
          @if (statsReady()) {
            <div class="stats">
              <div><strong>{{ productsTotal() }}</strong><span>products listed</span></div>
              <div><strong>{{ storesTotal() }}</strong><span>independent stores</span></div>
              <div><strong>{{ categories().length }}</strong><span>categories to browse</span></div>
            </div>
          }
        </div>
        <div class="hero-media">
          <div
            class="hero-frame"
            (mouseenter)="pauseSlider()"
            (mouseleave)="resumeSlider()"
            role="region"
            aria-roledescription="carousel"
            aria-label="Market highlights"
          >
            @for (slide of slides(); track slide.id; let idx = $index) {
              <div
                class="hero-slide"
                [class.active]="currentSlide() === idx"
                [attr.aria-hidden]="currentSlide() !== idx"
              >
                <img
                  [src]="slide.image_url"
                  [alt]="slide.alt || slide.title || 'Marketplace hero photo'"
                  class="hero-img"
                  [loading]="idx === 0 ? 'eager' : 'lazy'"
                />
                @if (slide.tag) {
                  <div class="hero-tag">
                    <span class="pulse-dot"></span>
                    <span>{{ slide.tag }}</span>
                  </div>
                }
              </div>
            }

            @if (slides().length > 1) {
              <button
                type="button"
                class="hero-nav prev"
                (click)="prevSlide($event)"
                aria-label="Previous slide"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                class="hero-nav next"
                (click)="nextSlide($event)"
                aria-label="Next slide"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>

              <div class="hero-dots" role="tablist" aria-label="Slides">
                @for (slide of slides(); track slide.id; let idx = $index) {
                  <button
                    type="button"
                    class="hero-dot"
                    [class.active]="currentSlide() === idx"
                    (click)="goToSlide(idx, $event)"
                    [attr.aria-label]="'Go to slide ' + (idx + 1)"
                    [attr.aria-selected]="currentSlide() === idx"
                    role="tab"
                  ></button>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </section>

    <!-- Vision chain (§2 Project Vision) -->
    <section class="chain">
      <div class="wrap links">
        <span>One marketplace</span><i>→</i><span>Many stores</span><i>→</i><span>Many sellers</span><i>→</i><span>Many products</span><i>→</i><span>Many customers</span>
      </div>
    </section>

    <!-- Categories (§9: home page with categories) -->
    @if (categories().length) {
      <section class="wrap block">
        <div class="head"><h2>Browse by category</h2><a routerLink="/products">All products</a></div>
        <div class="cats">
          @for (c of categories(); track c.id) {
            <a class="cat" [routerLink]="['/products']" [queryParams]="{ category_id: c.id }">{{ c.name }}</a>
          }
        </div>
      </section>
    }


    <!-- Featured products (§9) -->
    <section class="wrap block">
      <div class="head">
        <h2>Featured this week</h2>
        <a routerLink="/products">See all</a>
      </div>
      @if (loading()) {
        <div class="grid cards">@for (i of [1,2,3,4]; track i) { <div class="skeleton" style="height:280px"></div> }</div>
      } @else {
        <div class="grid cards">
          @for (p of products(); track p.impression_id || p.id) { <app-product-card [product]="p" /> }
        </div>
      }
    </section>

    <!-- Featured stores (§9) -->
    <section class="wrap block stores-section">
      <div class="head">
        <div>
          <h2>Stores on the square</h2>
          <p class="section-sub muted">Discover vetted independent stalls, local makers, and specialty boutiques</p>
        </div>
        <a routerLink="/stores" class="see-all-link">
          <span>Browse all stores</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>
      <div class="grid stores-grid">
        @for (s of stores(); track s.id) {
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
    </section>

    <!-- How it works: multi-store cart & order split (§10, §11) + trust (§12, §17) -->
    <section class="wrap block">
      <div class="head"><h2>How the square works</h2></div>
      <div class="grid steps">
        <div class="card step">
          <span class="num">1</span>
          <h3>Fill one cart, everywhere</h3>
          <p class="muted">Shop across independent stores and keep a single multi-store cart — no jumping between checkouts.</p>
        </div>
        <div class="card step">
          <span class="num">2</span>
          <h3>Pay once at checkout</h3>
          <p class="muted">One master order pays every seller in a single transaction, then splits into per-store orders behind the scenes.</p>
        </div>
        <div class="card step">
          <span class="num">3</span>
          <h3>Sellers fulfil their own</h3>
          <p class="muted">Each store packs and ships its part of the order, with status tracked in your order history.</p>
        </div>
      </div>
      <div class="trust">
        <span class="pill">Verified customer reviews</span>
        <span class="pill">Star ratings on every store</span>
        <span class="pill">Secure checkout — cards, mobile money &amp; bank</span>
        <span class="pill">Public seller profiles</span>
      </div>
    </section>

    <!-- Seller SaaS capabilities from landingPage.md, added without replacing shopper discovery. -->
    <app-seller-studio-promo />

    <!-- Seller CTA with commission example (§13, §14 Platform Revenue Model) -->
    <section class="sellband">
      <div class="wrap sell">
        <div>
          <p class="kicker">For sellers</p>
          <h2>Open your own stall on the square</h2>
          <p class="lede">Register your business, list any kind of product — electronics, fashion, food, household goods — and run stock, orders and payouts from one dashboard.</p>
          <div class="cta">
            <a [routerLink]="sellTarget()" class="btn accent">Open your store</a>
            <a routerLink="/stores" class="btn ghost">Browse stores</a>
          </div>
        </div>
        <div class="card example">
          <h3>Keep what you earn</h3>
          <ul>
            <li><span>Sale price</span><strong>GH₵500</strong></li>
            <li><span>Marketplace commission (5%)</span><strong>− GH₵25</strong></li>
            <li class="total"><span>You keep</span><strong>GH₵475</strong></li>
          </ul>
          <p class="muted">Subscription plans plus commission on completed sales — limits stay configurable from the platform panel.</p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .hero { padding: 64px 0 52px; background: radial-gradient(1200px 500px at 15% -10%, #f3d9b8, transparent); overflow: hidden; }
    .hero .wrap { width: min(1260px, calc(100% - 32px)); }
    .hero-wrap { display: grid; grid-template-columns: 1fr 1fr; align-items: stretch; gap: 40px; }
    .hero-content { display: flex; flex-direction: column; justify-content: center; }
    h1 { font-size: clamp(34px, 4.5vw, 56px); margin: 8px 0 14px; line-height: 1.12; max-width: 17ch; }
    .kicker { letter-spacing: .16em; text-transform: uppercase; font-size: 12px; font-weight: 700; color: var(--accent); margin: 0 0 6px; }
    .lede { max-width: 52ch; font-size: 17.5px; line-height: 1.5; color: var(--ink-soft); margin: 0; }
    .search { display: flex; gap: 8px; max-width: 540px; margin-top: 24px; }
    .search input { flex: 1; border: 1px solid var(--line); border-radius: 999px; padding: 13px 18px; background: #fff; }
    .cta { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
    .stats { display: flex; gap: 32px; margin-top: 36px; flex-wrap: wrap; }
    .stats div { display: flex; flex-direction: column; }
    .stats strong { font-family: Fraunces, Georgia, serif; font-size: 28px; font-weight: 650; }
    .stats span { font-size: 13px; color: var(--ink-soft); }

    /* Hero media - Slideshow Carousel */
    .hero-media { display: flex; align-items: stretch; justify-content: center; width: 100%; height: 100%; }
    .hero-frame {
      position: relative; width: 100%; height: 100%; min-height: 520px; border-radius: 28px;
      overflow: hidden; box-shadow: 0 24px 64px rgba(28, 25, 20, 0.18);
      border: 1px solid rgba(217, 208, 192, 0.85); background: #1c1914;
    }
    .hero-slide {
      position: absolute; inset: 0; width: 100%; height: 100%;
      opacity: 0; transform: scale(1.02);
      transition: opacity 0.75s cubic-bezier(0.4, 0, 0.2, 1), transform 0.75s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none; z-index: 1;
    }
    .hero-slide.active {
      opacity: 1; transform: scale(1);
      pointer-events: auto; z-index: 2;
    }
    .hero-img {
      width: 100%; height: 100%; object-fit: cover; object-position: center 25%;
      display: block; transition: transform 0.6s ease;
    }
    .hero-frame:hover .hero-slide.active .hero-img { transform: scale(1.025); }
    .hero-tag {
      position: absolute; bottom: 20px; left: 20px;
      background: rgba(28, 25, 20, 0.86); backdrop-filter: blur(12px);
      color: #fff; padding: 10px 20px; border-radius: 999px; font-size: 13px; font-weight: 600;
      display: inline-flex; align-items: center; gap: 9px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); z-index: 5;
      pointer-events: none; max-width: calc(100% - 130px);
    }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.35); flex: none; }

    /* Navigation arrows */
    .hero-nav {
      position: absolute; top: 50%; transform: translateY(-50%);
      width: 44px; height: 44px; border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(28, 25, 20, 0.65); backdrop-filter: blur(8px);
      color: #fff; display: flex; align-items: center; justify-content: center;
      cursor: pointer; z-index: 10; opacity: 0; transition: all 0.25s ease;
    }
    .hero-nav:hover { background: rgba(28, 25, 20, 0.9); transform: translateY(-50%) scale(1.08); border-color: rgba(255, 255, 255, 0.6); }
    .hero-nav.prev { left: 16px; }
    .hero-nav.next { right: 16px; }
    .hero-frame:hover .hero-nav { opacity: 1; }

    /* Indicator dots */
    .hero-dots {
      position: absolute; bottom: 20px; right: 20px;
      display: flex; gap: 7px; align-items: center;
      background: rgba(28, 25, 20, 0.65); backdrop-filter: blur(10px);
      padding: 7px 12px; border-radius: 999px; z-index: 10;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    }
    .hero-dot {
      width: 8px; height: 8px; border-radius: 50%;
      border: 0; padding: 0; background: rgba(255, 255, 255, 0.4);
      cursor: pointer; transition: all 0.25s ease;
    }
    .hero-dot.active {
      width: 22px; border-radius: 6px; background: #fff;
    }
    .hero-dot:hover:not(.active) { background: rgba(255, 255, 255, 0.75); }

    @media (max-width: 980px) {
      .hero-wrap { grid-template-columns: 1fr; gap: 36px; }
      .hero-frame { min-height: 400px; max-height: 500px; aspect-ratio: 16 / 10; margin: 0 auto; }
      h1 { max-width: 100%; }
      .lede { max-width: 100%; }
    }

    @media (max-width: 600px) {
      .hero-frame { min-height: 280px; aspect-ratio: 4 / 3; border-radius: 20px; }
    }
    .chain { background: var(--accent-2); color: #f1ede4; padding: 16px 0; }
    .links { display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap; font-weight: 600; font-size: 15px; }
    .links i { color: var(--gold); font-style: normal; }

    .block { padding: 34px 0 16px; }
    .head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
    .head a { color: var(--accent); font-weight: 600; font-size: 14px; }
    .cats { display: flex; flex-wrap: wrap; gap: 10px; }
    .cat { padding: 9px 16px; border: 1px solid var(--line); border-radius: 999px; background: var(--card); font-weight: 600; font-size: 14px; }
    .cat:hover { border-color: var(--accent); color: var(--accent); }
    .cards { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
    /* Enhanced Stores on the square section */
    .stores-section { padding: 42px 0 24px; }
    .section-sub { margin: 4px 0 0; font-size: 14.5px; }
    .see-all-link {
      display: inline-flex; align-items: center; gap: 6px;
      color: var(--accent); font-weight: 600; font-size: 14px;
      text-decoration: none; transition: gap 0.2s ease, color 0.2s ease;
    }
    .see-all-link:hover { gap: 10px; color: var(--accent-2, #164e3f); }
    .stores-grid {
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
      margin-top: 20px;
    }
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

    .steps { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .step { padding: 24px; }
    .step .num { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 999px; background: var(--accent); color: #fff; font-weight: 700; margin-bottom: 12px; }
    .step h3 { margin: 0 0 8px; font-size: 19px; }
    .step p { margin: 0; font-size: 15px; }
    .trust { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
    .trust .pill { font-size: 13px; padding: 7px 14px; }
    .sellband { margin-top: 40px; padding: 56px 0; background: linear-gradient(160deg, #f3d9b8, transparent 60%); border-top: 1px solid var(--line); }
    .sell { display: grid; grid-template-columns: 1.2fr .8fr; gap: 40px; align-items: center; }
    .sell h2 { font-size: clamp(26px, 4vw, 40px); margin: 6px 0 12px; }
    .example { padding: 26px; }
    .example h3 { margin: 0 0 14px; font-size: 20px; }
    .example ul { list-style: none; margin: 0 0 14px; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .example li { display: flex; justify-content: space-between; gap: 12px; font-size: 15px; }
    .example li span { color: var(--ink-soft); }
    .example li.total { border-top: 1px dashed var(--line); padding-top: 10px; font-size: 17px; }
    .example li.total strong { color: var(--accent-2); }
    .example p { margin: 0; font-size: 13px; }
    @media (max-width: 780px) {
      .hero { padding: 48px 0 36px; }
      .search { flex-direction: column; }
      .search input { width: 100%; }
      .sell { grid-template-columns: 1fr; }
      .links { font-size: 13px; gap: 8px; }
    }
  `],

})
export class HomeComponent implements OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  auth = inject(AuthService);

  slides = signal<HeroSlide[]>([
    {
      id: 'slide_1',
      image_url: '/images/market-shopper.jpg',
      tag: 'Live market square · Independent stalls',
      title: 'A marketplace built like a city market',
      link: '/products',
      alt: 'Female shopper happily browsing stalls in the bustling market square',
    },
    {
      id: 'slide_2',
      image_url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80',
      tag: 'Handcrafted goods · Local artisans',
      title: 'Discover handcrafted & artisan items',
      link: '/products',
      alt: 'Artisan produce and handcrafted market goods',
    },
    {
      id: 'slide_3',
      image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
      tag: 'Curated boutiques · Unique fashion & lifestyle',
      title: 'Curated independent boutiques',
      link: '/stores',
      alt: 'Curated independent boutiques and shops',
    },
  ]);
  currentSlide = signal(0);
  autoplay = signal(true);
  intervalSeconds = signal(5);
  private timer: any = null;
  private isPaused = false;

  products = signal<ProductCard[]>([]);
  stores = signal<Storefront[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  productsTotal = signal(0);
  storesTotal = signal(0);
  productsLoaded = signal(false);
  storesLoaded = signal(false);
  catsLoaded = signal(false);
  statsReady = computed(() => this.productsLoaded() && this.storesLoaded() && this.catsLoaded());
  q = '';

  constructor() {
    this.api.marketHeroSlides().subscribe({
      next: (res) => {
        if (res.data?.slides?.length) {
          this.slides.set(res.data.slides);
          this.autoplay.set(res.data.autoplay !== false);
          this.intervalSeconds.set(res.data.interval || 5);
        }
        this.startAutoplay();
      },
      error: () => this.startAutoplay(),
    });

    this.api.marketProducts({ per_page: 8 }).subscribe({
      next: (res) => {
        this.products.set(res.data);
        this.productsTotal.set(res.meta.total);
        this.productsLoaded.set(true);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.marketStores({ per_page: 6 }).subscribe({
      next: (res) => {
        this.stores.set(res.data);
        this.storesTotal.set(res.meta.total);
        this.storesLoaded.set(true);
      },
      error: () => this.storesLoaded.set(true),
    });
    this.api.marketCategories().subscribe({
      next: (res) => { this.categories.set(res.data); this.catsLoaded.set(true); },
      error: () => this.catsLoaded.set(true),
    });
  }

  ngOnDestroy() {
    this.stopAutoplay();
  }

  startAutoplay() {
    this.stopAutoplay();
    if (!this.autoplay() || this.slides().length <= 1) return;
    this.timer = setInterval(() => {
      if (!this.isPaused) {
        this.nextSlide();
      }
    }, Math.max(2, this.intervalSeconds()) * 1000);
  }

  stopAutoplay() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  pauseSlider() {
    this.isPaused = true;
  }

  resumeSlider() {
    this.isPaused = false;
  }

  nextSlide(e?: Event) {
    e?.stopPropagation();
    const count = this.slides().length;
    if (count <= 1) return;
    this.currentSlide.update((curr) => (curr + 1) % count);
  }

  prevSlide(e?: Event) {
    e?.stopPropagation();
    const count = this.slides().length;
    if (count <= 1) return;
    this.currentSlide.update((curr) => (curr - 1 + count) % count);
  }

  goToSlide(idx: number, e?: Event) {
    e?.stopPropagation();
    this.currentSlide.set(idx);
    this.startAutoplay();
  }

  search() {
    const q = this.q.trim();
    this.router.navigate(['/products'], { queryParams: q ? { q } : {} });
  }

  sellTarget() {
    if (this.auth.hasRole('tenant_owner', 'store_staff')) return '/tenant';
    return this.auth.isLoggedIn() ? '/sell' : '/register';
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

