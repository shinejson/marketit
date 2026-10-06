import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { Category, ProductCard, Storefront } from '../../core/models';
import { ProductCardComponent } from '../../shared/product-card.component';

@Component({
  selector: 'app-home',
  imports: [FormsModule, RouterLink, ProductCardComponent],
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
          <div class="hero-frame">
            <img
              src="/images/market-shopper.jpg"
              alt="Female shopper happily browsing stalls in the bustling market square"
              class="hero-img"
              loading="eager"
            />
            <div class="hero-tag">
              <span class="pulse-dot"></span>
              <span>Live market square · Independent stalls</span>
            </div>
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
    <section class="wrap block">
      <div class="head"><h2>Stores on the square</h2><a routerLink="/stores">See all</a></div>
      <div class="grid stores">
        @for (s of stores(); track s.id) {
          <a class="card store" [routerLink]="['/stores', s.slug]">
            <h3 class="serif">{{ s.name }}</h3>
            <p class="muted">{{ s.description }}</p>
            <span class="pill">{{ s.city }} · {{ s.delivery_days }} day delivery</span>
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

    /* Hero media - Expanded */
    .hero-media { display: flex; align-items: stretch; justify-content: center; width: 100%; height: 100%; }
    .hero-frame {
      position: relative; width: 100%; height: 100%; min-height: 520px; border-radius: 28px;
      overflow: hidden; box-shadow: 0 24px 64px rgba(28, 25, 20, 0.18);
      border: 1px solid rgba(217, 208, 192, 0.85); background: var(--card);
    }
    .hero-img {
      width: 100%; height: 100%; object-fit: cover; object-position: center 25%;
      display: block; transition: transform 0.45s ease;
    }
    .hero-frame:hover .hero-img { transform: scale(1.025); }
    .hero-tag {
      position: absolute; bottom: 18px; left: 18px;
      background: rgba(28, 25, 20, 0.84); backdrop-filter: blur(10px);
      color: #fff; padding: 9px 18px; border-radius: 999px; font-size: 13px; font-weight: 600;
      display: inline-flex; align-items: center; gap: 9px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.35); flex: none; }

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
    .stores { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    .store { padding: 22px; display: block; }
    .store h3 { margin: 0 0 6px; }
    .store p { margin: 0 0 12px; min-height: 40px; }
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
export class HomeComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  auth = inject(AuthService);

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

  search() {
    const q = this.q.trim();
    this.router.navigate(['/products'], { queryParams: q ? { q } : {} });
  }

  sellTarget() {
    return this.auth.isLoggedIn() ? '/sell' : '/register';
  }
}

