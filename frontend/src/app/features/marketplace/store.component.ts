import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ProductCard, Storefront } from '../../core/models';
import { ProductCardComponent } from '../../shared/product-card.component';
import { StarRatingComponent } from '../../shared/star-rating.component';
import { AuthService } from '../../core/auth.service';
import { Review } from '../../core/models';

@Component({
  selector: 'app-store',
  imports: [ProductCardComponent, RouterLink, StarRatingComponent],
  template: `
    @if (store(); as s) {
      <div class="storefront" [style.--store-primary]="theme().primary_color" [style.--store-accent]="theme().accent_color" [class.editorial]="theme().font === 'editorial'" [class.friendly]="theme().font === 'friendly'">
        <header class="store-nav wrap">
          <a class="brand" href="#">{{ s.name }}</a>
          <nav><a href="#catalogue">Shop</a><a href="#about">Our story</a><a href="#contact">Contact</a></nav>
          @if (accountEnabled()) {
            <div class="account"><a routerLink="/login" [queryParams]="{store:s.slug}">Log in</a><a class="join" routerLink="/register" [queryParams]="{store:s.slug}">Create account</a></div>
          }
        </header>

        @for (section of sections(); track section.id) {
          @if (section.enabled && section.type === 'hero') {
            <section [class]="'hero ' + theme().hero_style">
              <div class="wrap hero-inner"><p class="overline">WELCOME TO {{ s.name }}</p><h1>{{ section.title || s.name }}</h1><p class="lead">{{ section.subtitle || s.description }}</p><a href="#catalogue" class="shop-btn">Shop the collection <span>→</span></a></div>
            </section>
          }
          @if (section.enabled && section.type === 'trust_bar') {
            <section class="trust">
              <div class="wrap">
                @if (s.rating_count) {
                  <span class="rated"><app-stars [value]="s.rating_avg || 0" [showValue]="true" /> {{ s.rating_count }} review{{ s.rating_count === 1 ? '' : 's' }}</span>
                } @else {
                  <span>✓ Secure checkout</span>
                }
                <span>◇ Carefully selected</span>
                <span>↗ Reliable delivery</span>
                <span>↺ Simple returns</span>
                @if (auth.isLoggedIn()) {
                  <button type="button" class="follow" [class.on]="following()" (click)="toggleFollow(s.id)">
                    {{ following() ? '♥ Following' : '♡ Follow store' }}
                  </button>
                }
              </div>
            </section>
          }
          @if (section.enabled && section.type === 'rich_text') {
            <section class="story wrap" id="about"><p class="overline">OUR STORY</p><h2>{{ section.title }}</h2><p>{{ section.subtitle }}</p></section>
          }
          @if (section.enabled && section.type === 'featured_products') {
            <section class="catalogue wrap" id="catalogue"><div class="section-head"><div><p class="overline">CURATED FOR YOU</p><h2>{{ section.title || 'Featured collection' }}</h2><p>{{ section.subtitle }}</p></div><span>{{ products().length }} products</span></div><div class="grid cards">@for (p of products(); track p.id) { <app-product-card [product]="p" /> } @empty { <div class="empty"><h3>New collection coming soon</h3><p>This shop is preparing its first products.</p></div> }</div></section>
          }
          @if (section.enabled && section.type === 'newsletter') {
            <section class="newsletter"><div class="wrap"><div><p class="overline">KEEP IN TOUCH</p><h2>{{ section.title || 'Stay in the loop' }}</h2><p>{{ section.subtitle }}</p></div><form (submit)="$event.preventDefault()"><input type="email" placeholder="Email address" aria-label="Email address" /><button>Join us →</button></form></div></section>
          }
        }
        @if (reviews().length) {
          <section class="store-reviews wrap">
            <p class="overline">WHAT SHOPPERS SAY</p>
            <h2>Customer reviews</h2>
            <div class="review-grid">
              @for (review of reviews(); track review.id) {
                <article>
                  <app-stars [value]="review.rating" />
                  <strong>{{ review.title || 'Verified review' }}</strong>
                  @if (review.body) { <p>{{ review.body }}</p> }
                  <small>{{ review.author?.name || 'Customer' }}@if (review.product) { <span> · {{ review.product.name }}</span> }</small>
                </article>
              }
            </div>
          </section>
        }

        <footer id="contact"><div class="wrap"><div><b>{{ s.name }}</b><p>{{ s.description }}</p></div><div><strong>Contact</strong><p>{{ s.contact_email || 'Visit our store for support' }}</p><p>{{ s.city }}{{ s.country ? ', ' + s.country : '' }}</p></div><div>@if (accountEnabled()) {<strong>Your account</strong><a routerLink="/login" [queryParams]="{store:s.slug}">Customer login</a><a routerLink="/register" [queryParams]="{store:s.slug}">Create an account</a>}</div></div></footer>
      </div>
    } @else {
      <div class="loading"><span></span></div>
    }
  `,
  styles: [`
    :host{display:block}.storefront{--store-primary:#1f4b3a;--store-accent:#c45c26;background:#fff;color:#191b18;font-family:Arial,sans-serif}.storefront.editorial{font-family:Georgia,serif}.storefront.friendly{font-family:'Trebuchet MS',sans-serif}.store-nav{display:flex;align-items:center;justify-content:space-between;gap:25px;height:75px}.brand{font:700 22px Georgia,serif;color:var(--store-primary)}.store-nav nav{display:flex;gap:25px;font-size:13px}.account{display:flex;align-items:center;gap:12px;font-size:12px}.join{padding:9px 14px;border:1px solid var(--store-primary);border-radius:30px;color:var(--store-primary);font-weight:700}.hero{background:color-mix(in srgb,var(--store-primary) 9%,#fff)}.hero-inner{min-height:530px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding-top:70px;padding-bottom:70px}.hero.centered .hero-inner{text-align:center;align-items:center}.hero.minimal{background:#fff}.overline{color:var(--store-accent);font-size:10px!important;font-weight:800;letter-spacing:.18em;margin:0 0 15px!important}.hero h1{max-width:780px;margin:0;color:var(--store-primary);font:700 clamp(45px,7vw,88px)/.98 Georgia,serif;letter-spacing:-.045em}.lead{max-width:570px;margin:23px 0!important;color:#596059;font-size:17px;line-height:1.7}.shop-btn{display:inline-flex;align-items:center;gap:22px;margin-top:7px;padding:14px 20px;border-radius:30px;background:var(--store-primary);color:white;font-size:13px;font-weight:700}.trust{border-top:1px solid #e8e6e0;border-bottom:1px solid #e8e6e0}.trust .wrap{display:flex;justify-content:space-between;gap:20px;padding-top:18px;padding-bottom:18px;color:#656b64;font-size:11px}.catalogue{padding-top:85px;padding-bottom:90px}.section-head{display:flex;align-items:end;justify-content:space-between;margin-bottom:28px}.section-head h2,.story h2,.newsletter h2{margin:0;color:var(--store-primary);font:700 36px Georgia,serif}.section-head p:not(.overline){color:#777;margin:7px 0}.section-head>span{color:#777;font-size:11px}.cards{grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px}.empty{grid-column:1/-1;padding:60px;text-align:center;background:#f6f5f1;border-radius:16px}.story{max-width:780px;text-align:center;padding-top:100px;padding-bottom:100px}.story>p:last-child{font-size:17px;line-height:1.8;color:#696e68}.newsletter{padding:70px 0;background:var(--store-primary);color:white}.newsletter .wrap{display:flex;justify-content:space-between;align-items:center;gap:30px}.newsletter h2{color:white}.newsletter p{color:rgba(255,255,255,.7)}.newsletter form{display:flex;min-width:380px;border-bottom:1px solid rgba(255,255,255,.5)}.newsletter input{flex:1;border:0;background:transparent;color:white;padding:13px 3px;outline:0}.newsletter input::placeholder{color:rgba(255,255,255,.6)}.newsletter button{border:0;background:transparent;color:white;font-weight:700;cursor:pointer}footer{padding:55px 0;background:#131713;color:white}footer .wrap{display:grid;grid-template-columns:2fr 1fr 1fr;gap:40px}footer b{font:700 20px Georgia,serif}footer strong{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px}footer p,footer a{display:block;max-width:390px;margin:7px 0;color:rgba(255,255,255,.6);font-size:11px;line-height:1.6}.rated{display:inline-flex;align-items:center;gap:7px}.follow{margin-left:auto;padding:6px 14px;border:1px solid var(--store-primary);border-radius:30px;background:transparent;color:var(--store-primary);font:inherit;font-size:11px;font-weight:700;cursor:pointer}.follow.on{background:var(--store-primary);color:#fff}.store-reviews{padding-top:70px;padding-bottom:70px}.store-reviews h2{margin:0 0 26px;color:var(--store-primary);font:700 36px Georgia,serif}.review-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}.review-grid article{padding:18px;border:1px solid #e8e6e0;border-radius:16px;background:#faf9f6}.review-grid strong{display:block;margin:9px 0 6px;font-size:14px}.review-grid p{margin:0;color:#5d635c;font-size:13px;line-height:1.6}.review-grid small{display:block;margin-top:11px;color:#8a8f88;font-size:11px}.loading{display:grid;place-items:center;min-height:500px}.loading span{width:35px;height:35px;border:3px solid #ddd;border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:700px){.store-nav nav{display:none}.account .join{display:none}.hero-inner{min-height:430px}.trust .wrap{overflow:auto}.trust span{min-width:max-content}.newsletter .wrap{align-items:flex-start;flex-direction:column}.newsletter form{min-width:0;width:100%}footer .wrap{grid-template-columns:1fr}.section-head{align-items:flex-start;flex-direction:column}}
  `],
})
export class StoreComponent {
  auth = inject(AuthService);
  private api = inject(ApiService);

  store = signal<any | null>(null);
  products = signal<ProductCard[]>([]);
  reviews = signal<Review[]>([]);
  following = signal(false);
  theme = computed(() => ({ primary_color: '#1f4b3a', accent_color: '#c45c26', font: 'modern', hero_style: 'split', ...(this.store()?.theme_config || {}) }));
  sections = computed<any[]>(() => this.store()?.page_sections?.length ? this.store().page_sections : [
    {id:'hero',type:'hero',title:this.store()?.name,subtitle:this.store()?.description,enabled:true},
    {id:'trust',type:'trust_bar',title:'',subtitle:'',enabled:true},
    {id:'featured',type:'featured_products',title:'Featured collection',subtitle:'Discover our latest products.',enabled:true},
    {id:'newsletter',type:'newsletter',title:'Stay in the loop',subtitle:'News, launches and special offers.',enabled:true},
  ]);
  accountEnabled = computed(() => this.store()?.customer_accounts_enabled !== false);
  constructor() {
    const slug = inject(ActivatedRoute).snapshot.paramMap.get('slug')!;
    this.api.marketStore(slug).subscribe((res) => {
      this.store.set(res.data.store);
      this.products.set(res.data.products);
      if (this.auth.isLoggedIn()) {
        this.api.wishlistIds().subscribe({
          next: (ids) => this.following.set(ids.data.store_ids.includes(res.data.store.id)),
          error: () => undefined,
        });
      }
    });

    // §17 — the storefront shows its own trust signal.
    this.api.storeReviews(slug, { per_page: '6' }).subscribe({
      next: (res) => this.reviews.set(res.data || []),
      error: () => undefined,
    });
  }

  toggleFollow(storeId: number) {
    this.api.toggleFavouriteStore(storeId).subscribe({
      next: (res) => this.following.set(res.data.saved),
      error: () => undefined,
    });
  }
}
