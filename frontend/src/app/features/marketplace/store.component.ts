import { Component, HostListener, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ProductCard, Storefront, StorePageSection, Review } from '../../core/models';
import { ProductCardComponent } from '../../shared/product-card.component';
import { StarRatingComponent } from '../../shared/star-rating.component';
import { AuthService } from '../../core/auth.service';
import { CurrencyService } from '../../core/currency.service';

type StorePageTab = 'home' | 'shop' | 'about' | 'contact' | string;

@Component({
  selector: 'app-store',
  imports: [FormsModule, ProductCardComponent, RouterLink, StarRatingComponent],
  template: `
    @if (store(); as s) {
      <div
        class="storefront"
        [style.--store-primary]="theme().primary_color || '#1f4b3a'"
        [style.--store-accent]="theme().accent_color || '#c45c26'"
        [style.--store-surface]="theme().surface_color || '#ffffff'"
        [class.editorial]="theme().font === 'editorial' || theme().font === 'classic'"
        [class.friendly]="theme().font === 'friendly'"
      >
        <!-- DEDICATED STORE TOPNAV -->
        <header class="store-nav wrap">
          <!-- Left: Back to MarketHub + Store Brand -->
          <div class="nav-brand-group">
            <a routerLink="/" class="back-market-link" title="Return to MarketHub Marketplace">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              <span>MarketHub</span>
            </a>
            <span class="nav-sep">/</span>
            <a class="brand" (click)="setPage('home')">
              @if (s.logo_path || theme().logo_image) {
                <img [src]="s.logo_path || theme().logo_image" [alt]="s.name" class="brand-logo" />
              } @else {
                <span class="brand-initials">{{ initials(s.name) }}</span>
              }
              <span class="brand-name">{{ s.name }}</span>
            </a>
          </div>

          <!-- Center: Store Navigation Links -->
          <nav class="nav-links">
            <button type="button" [class.active]="activePage() === 'home'" (click)="setPage('home')">Home</button>
            <button type="button" [class.active]="activePage() === 'shop'" (click)="setPage('shop')">Shop</button>
            @if (aboutConfig().enabled !== false) {
              <button type="button" [class.active]="activePage() === 'about'" (click)="setPage('about')">
                {{ aboutConfig().nav_label || 'Our story' }}
              </button>
            }
            @if (contactConfig().enabled !== false) {
              <button type="button" [class.active]="activePage() === 'contact'" (click)="setPage('contact')">
                {{ contactConfig().nav_label || 'Contact' }}
              </button>
            }
            @for (page of publishedPages(); track page.id) {
              <button type="button" [class.active]="activePage() === page.slug" (click)="setPage(page.slug)">{{ page.name }}</button>
            }
          </nav>

          <!-- Right: Currency Converter, Cart Bag, Follow, Login / Profile -->
          <div class="nav-actions">
            <!-- Currency Converter Picker -->
            <label class="currency-picker" title="Show prices in">
              <span class="curr-sym">{{ currency.displayMeta().symbol }}</span>
              <select [value]="currency.display()" (change)="onCurrencyChange($event)" aria-label="Display currency">
                @for (c of currency.currencies(); track c.code) {
                  <option [value]="c.code">{{ c.code }}</option>
                }
              </select>
            </label>

            <!-- Follow Store Button -->
            @if (auth.isLoggedIn()) {
              <button type="button" class="btn-follow" [class.on]="following()" (click)="toggleFollow(s.id)" title="Follow store">
                {{ following() ? '♥ Following' : '♡ Follow' }}
              </button>
            }

            <!-- Bag / Cart Shortcut -->
            <a routerLink="/cart" class="btn-bag" title="View Cart Bag">
              <span>Bag</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </a>

            <!-- Auth Actions / User Profile -->
            @if (!auth.isLoggedIn()) {
              <div class="auth-btns">
                <a [routerLink]="['/login']" [queryParams]="{ returnUrl: '/stores/' + s.slug }" class="btn-auth ghost">Log in</a>
                <a [routerLink]="['/register']" [queryParams]="{ returnUrl: '/stores/' + s.slug }" class="btn-auth solid">Join</a>
              </div>
            } @else {
              <div class="dropdown-wrap" (click)="$event.stopPropagation()">
                <button
                  type="button"
                  class="profile-btn"
                  (click)="toggleProfile($event)"
                  [attr.aria-expanded]="profileOpen()"
                  title="Account menu"
                >
                  @if (auth.user()?.avatar_url) {
                    <img [src]="auth.user()?.avatar_url" [alt]="auth.user()?.name" class="avatar-img" />
                  } @else {
                    <span class="avatar-initials">{{ userInitials() }}</span>
                  }
                  <span class="who-meta">
                    <span class="who-name">{{ auth.user()?.name }}</span>
                    <span class="who-role">{{ roleLabel() }}</span>
                  </span>
                  <svg class="chevron-icon" [class.open]="profileOpen()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                @if (profileOpen()) {
                  <div class="profile-dropdown-menu">
                    <div class="drop-user-info">
                      <p class="drop-user-name">{{ auth.user()?.name }}</p>
                      <p class="drop-user-email">{{ auth.user()?.email }}</p>
                    </div>
                    <div class="drop-menu-links">
                      <a routerLink="/profile" (click)="closeProfile()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <span>My profile</span>
                      </a>
                      <a routerLink="/orders" (click)="closeProfile()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        <span>My orders</span>
                      </a>
                      <a routerLink="/quotes" (click)="closeProfile()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8z"/><path d="M8.5 10.5h7M8.5 13.5h4"/></svg>
                        <span>My quotes</span>
                      </a>
                      <a routerLink="/wishlist" (click)="closeProfile()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l1.7 1.7L12 21.2l7.1-6.8 1.7-1.7a5 5 0 0 0 0-7.1z"/></svg>
                        <span>Wishlist</span>
                      </a>
                      @if (hasTenantRole()) {
                        <a routerLink="/tenant" (click)="closeProfile()">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                          <span>Tenant console</span>
                        </a>
                      }
                      @if (hasAdminRole()) {
                        <a routerLink="/admin" (click)="closeProfile()">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          <span>Admin console</span>
                        </a>
                      }
                    </div>
                    <button type="button" class="drop-logout-btn" (click)="onLogout()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      <span>Log out</span>
                    </button>
                  </div>
                }
              </div>
            }

            <!-- Mobile Hamburger Toggle -->
            <button type="button" class="mobile-toggle" (click)="toggleMobileMenu()" aria-label="Toggle navigation">
              <span></span><span></span><span></span>
            </button>
          </div>
        </header>

        <!-- Mobile Drawer Menu -->
        @if (mobileMenuOpen()) {
          <div class="mobile-drawer-backdrop" (click)="closeMobileMenu()">
            <div class="mobile-drawer" (click)="$event.stopPropagation()">
              <div class="drawer-head">
                <b>{{ s.name }}</b>
                <button type="button" class="drawer-close" (click)="closeMobileMenu()">×</button>
              </div>
              <div class="drawer-nav">
                <button type="button" (click)="setPage('home'); closeMobileMenu()">Home</button>
                <button type="button" (click)="setPage('shop'); closeMobileMenu()">Shop catalogue</button>
                @if (aboutConfig().enabled !== false) {
                  <button type="button" (click)="setPage('about'); closeMobileMenu()">Our story</button>
                }
                @if (contactConfig().enabled !== false) {
                  <button type="button" (click)="setPage('contact'); closeMobileMenu()">Contact</button>
                }
              </div>
              <div class="drawer-actions">
                <label class="drawer-curr">
                  <span>Display currency:</span>
                  <select [value]="currency.display()" (change)="onCurrencyChange($event)">
                    @for (c of currency.currencies(); track c.code) {
                      <option [value]="c.code">{{ c.code }} ({{ c.symbol }})</option>
                    }
                  </select>
                </label>
                @if (!auth.isLoggedIn()) {
                  <a [routerLink]="['/login']" [queryParams]="{ returnUrl: '/stores/' + s.slug }" class="drawer-btn" (click)="closeMobileMenu()">Log in</a>
                  <a [routerLink]="['/register']" [queryParams]="{ returnUrl: '/stores/' + s.slug }" class="drawer-btn solid" (click)="closeMobileMenu()">Join</a>
                } @else {
                  <a routerLink="/profile" class="drawer-btn" (click)="closeMobileMenu()">My Profile ({{ auth.user()?.name }})</a>
                  <a routerLink="/orders" class="drawer-btn" (click)="closeMobileMenu()">My Orders</a>
                  <button type="button" class="drawer-btn ghost" (click)="onLogout()">Log out</button>
                }
                <a routerLink="/" class="drawer-market-back" (click)="closeMobileMenu()">← Back to MarketHub</a>
              </div>
            </div>
          </div>
        }

        <!-- SUB-PAGE: ABOUT / OUR STORY -->
        @if (activePage() === 'about') {
          <main class="page-view about-view">
            <!-- About Hero -->
            <section class="about-hero" [style.background-image]="aboutConfig().cover_image ? 'linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url(' + aboutConfig().cover_image + ')' : ''">
              <div class="wrap about-hero-inner">
                <p class="overline-light">OUR STORY · CRAFT & COMMITMENT</p>
                <h1>{{ aboutConfig().hero_title || ('The Story Behind ' + s.name) }}</h1>
                <p class="hero-sub">{{ aboutConfig().hero_subtitle || s.description || 'Thoughtfully created goods with dedication to enduring craftsmanship.' }}</p>
              </div>
            </section>

            <!-- Brand Narrative -->
            <section class="wrap story-block">
              <div class="story-grid">
                <div class="story-copy">
                  <span class="section-tag">HERITAGE</span>
                  <h2>{{ aboutConfig().story_title || 'How We Began' }}</h2>
                  <div class="story-text">
                    <p>{{ aboutConfig().story_body || s.description || 'We founded our workshop with a simple vision: create purposeful, beautiful items made to last. Every piece reflects hours of careful design, ethical sourcing, and hand finishing.' }}</p>
                  </div>
                  @if (s.city || s.country) {
                    <div class="location-badge">
                      <span>📍 Studio Location:</span>
                      <strong>{{ s.city }}{{ s.country ? ', ' + s.country : '' }}</strong>
                    </div>
                  }
                </div>
                <div class="story-media">
                  <img
                    [src]="aboutConfig().story_image || s.banner_path || 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=80'"
                    [alt]="s.name"
                    class="story-img"
                  />
                  <div class="quote-card">
                    <p>“True quality is never an accident; it is always the result of high intention and sincere effort.”</p>
                    <small>— Studio Artisan Team</small>
                  </div>
                </div>
              </div>
            </section>

            <!-- Production / Workshop Section in About -->
            <section class="production-showcase wrap">
              <div class="showcase-head">
                <span class="section-tag">OUR CRAFT</span>
                <h2>{{ aboutConfig().craft_title || 'Production & Artistry' }}</h2>
                <p class="sub">{{ aboutConfig().craft_body || 'Step inside our workshop to see how our materials are selected and transformed into finished collections.' }}</p>
              </div>

              <div class="production-grid">
                <div class="prod-image-col">
                  <img
                    [src]="aboutConfig().craft_image || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=80'"
                    alt="Artisan production process"
                    class="prod-main-img"
                  />
                  <div class="artisan-badge">
                    <span class="pulse"></span>
                    <span>Handcrafted in small batches</span>
                  </div>
                </div>

                <div class="prod-steps-col">
                  @for (step of aboutSteps(); track $index) {
                    <div class="step-card">
                      <div class="step-num">0{{ $index + 1 }}</div>
                      <div>
                        <h4>{{ step.title }}</h4>
                        <p>{{ step.description }}</p>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </section>

            <!-- Values Banner -->
            <section class="values-section">
              <div class="wrap">
                <div class="values-grid">
                  @for (val of aboutValues(); track $index) {
                    <div class="value-item">
                      <span class="value-icon">{{ val.icon }}</span>
                      <h3>{{ val.title }}</h3>
                      <p>{{ val.desc }}</p>
                    </div>
                  }
                </div>
              </div>
            </section>

            <!-- Explore Shop CTA -->
            <section class="wrap cta-banner">
              <h2>Discover the finished pieces</h2>
              <p>Explore handcrafted collections available right now from {{ s.name }}.</p>
              <button class="shop-btn" (click)="setPage('shop')">Explore Catalogue →</button>
            </section>
          </main>
        }

        <!-- SUB-PAGE: CONTACT -->
        @else if (activePage() === 'contact') {
          <main class="page-view contact-view">
            <section class="contact-hero">
              <div class="wrap">
                <p class="overline">GET IN TOUCH</p>
                <h1>{{ contactConfig().title || ('Contact ' + s.name) }}</h1>
                <p class="hero-sub">{{ contactConfig().subtitle || 'Have a question about products, custom orders, or shipping? Reach out to us directly.' }}</p>
              </div>
            </section>

            <section class="wrap contact-container">
              <div class="contact-grid">
                <!-- Info Column -->
                <div class="contact-info-col">
                  <h3>Direct Information</h3>
                  <p class="col-lead">We are always happy to help with product questions, sizing, or custom artisan requests.</p>

                  <div class="info-list">
                    <div class="info-item">
                      <span class="icon">✉</span>
                      <div>
                        <strong>Email Address</strong>
                        <a [href]="'mailto:' + (s.contact_email || contactConfig().email || 'hello@markethub.test')">
                          {{ s.contact_email || contactConfig().email || 'hello@markethub.test' }}
                        </a>
                      </div>
                    </div>

                    @if (s.contact_phone || contactConfig().phone) {
                      <div class="info-item">
                        <span class="icon">📞</span>
                        <div>
                          <strong>Telephone</strong>
                          <p>{{ s.contact_phone || contactConfig().phone }}</p>
                        </div>
                      </div>
                    }

                    <div class="info-item">
                      <span class="icon">📍</span>
                      <div>
                        <strong>Studio & Showroom</strong>
                        <p>{{ s.address_line || contactConfig().address || 'Market Square Atelier' }}</p>
                        <p>{{ s.city }}{{ s.country ? ', ' + s.country : '' }}</p>
                      </div>
                    </div>

                    <div class="info-item">
                      <span class="icon">⏱</span>
                      <div>
                        <strong>Customer Care Hours</strong>
                        <p>{{ contactConfig().hours || 'Monday – Friday: 9am – 6pm · Saturday: 10am – 4pm' }}</p>
                      </div>
                    </div>
                  </div>

                  <div class="trust-pill-box">
                    <span>✓ Guaranteed response within 24h</span>
                    <span>✓ Direct communication with maker</span>
                  </div>
                </div>

                <!-- Form Column -->
                <div class="contact-form-col">
                  <div class="form-card">
                    <h3>Send a message</h3>
                    <p>{{ contactConfig().form_intro || 'Fill in the form below and the store owner will reply promptly.' }}</p>

                    @if (contactSent()) {
                      <div class="contact-success">
                        <span class="check">✓</span>
                        <h4>Message sent successfully!</h4>
                        <p>{{ contactMessage() }}</p>
                        <button class="btn-resend" type="button" (click)="contactSent.set(false)">Send another inquiry</button>
                      </div>
                    } @else {
                      <form (submit)="submitContact($event)">
                        <div class="form-field">
                          <label>Your Name *</label>
                          <input type="text" [(ngModel)]="contactForm.name" name="name" required placeholder="Jane Doe" />
                        </div>

                        <div class="form-field">
                          <label>Email Address *</label>
                          <input type="email" [(ngModel)]="contactForm.email" name="email" required placeholder="jane@example.com" />
                        </div>

                        <div class="form-field">
                          <label>Subject</label>
                          <input type="text" [(ngModel)]="contactForm.subject" name="subject" placeholder="Inquiry about product or order" />
                        </div>

                        <div class="form-field">
                          <label>Message *</label>
                          <textarea rows="5" [(ngModel)]="contactForm.message" name="message" required placeholder="Write your question or request here…"></textarea>
                        </div>

                        @if (contactError()) {
                          <div class="form-error">{{ contactError() }}</div>
                        }

                        <button type="submit" class="submit-btn" [disabled]="contactLoading()">
                          {{ contactLoading() ? 'Sending message…' : 'Send Message →' }}
                        </button>
                      </form>
                    }
                  </div>
                </div>
              </div>
            </section>
          </main>
        }

        <!-- SUB-PAGE: SHOP / CATALOGUE ONLY -->
        @else if (activePage() === 'shop') {
          <main class="page-view shop-view wrap">
            <div class="shop-head">
              <div>
                <p class="overline">OUR FULL COLLECTION</p>
                <h1>All Products</h1>
                <p class="sub">Browse all available goods from {{ s.name }}.</p>
              </div>
              <span class="count-tag">{{ shopProducts().length }} product{{ shopProducts().length === 1 ? '' : 's' }}</span>
            </div>
            @if (categoryFilter()) { <button type="button" class="clear-category" (click)="categoryFilter.set(null)">Showing {{ categoryName(categoryFilter()) }} · Clear filter ×</button> }

            <div class="grid cards">
              @for (p of shopProducts(); track p.id) {
                <app-product-card [product]="p" />
              } @empty {
                <div class="empty">
                  <h3>New collection coming soon</h3>
                  <p>This shop is preparing its catalogue. Check back shortly!</p>
                </div>
              }
            </div>
          </main>
        }

        @else if (customPage(); as page) {
          <main class="page-view custom-view">
            <section class="custom-page-heading wrap"><p class="overline">{{ s.name }} · STORE JOURNAL</p><h1>{{ page.name }}</h1></section>
            @for (section of page.content.sections; track section.id) {
              @if (section.enabled) {
                @if (section.type === 'hero') {
                  <section class="hero" [class.custom-hero-cover]="section.layout === 'full_banner'" [style.background-image]="section.layout === 'full_banner' ? 'linear-gradient(rgba(0,0,0,.46),rgba(0,0,0,.55)),url(' + (section.image_url || '') + ')' : ''">
                    <div class="wrap hero-inner centered-hero"><p class="overline">{{ section.badge || page.name }}</p><h1>{{ section.title || page.name }}</h1><p class="lead">{{ section.subtitle || '' }}</p>@if (section.button_text) { <button class="shop-btn" (click)="handleBannerAction(section.button_link)">{{ section.button_text }} →</button> }</div>
                  </section>
                } @else if (section.type === 'featured_products' || section.type === 'product_grid') {
                  <section class="catalogue wrap">
                    <div class="section-head"><div><p class="overline">{{ section.badge || 'THE COLLECTION' }}</p><h2>{{ section.title || 'Products selected for you' }}</h2><p class="sub">{{ section.subtitle || '' }}</p></div><button class="view-all-link" (click)="setPage('shop')">Browse all products →</button></div>
                    <div class="grid cards widget-grid" [style.--widget-cols]="section.columns || 4" [style.--tablet-cols]="section.responsive?.tablet?.columns || 3" [style.--mobile-cols]="section.responsive?.mobile?.columns || 2">
                      @for (product of sectionProducts(section); track product.id) { <app-product-card [product]="product" /> }
                      @empty { <div class="empty"><h3>Products coming soon</h3><p>Products from this store will appear here.</p></div> }
                    </div>
                  </section>
                } @else if (section.type === 'category_grid') {
                  <section class="wrap custom-categories"><div class="section-head"><div><p class="overline">{{ section.badge || 'BROWSE OUR RANGE' }}</p><h2>{{ section.title || 'Shop by category' }}</h2><p class="sub">{{ section.subtitle || '' }}</p></div></div><div class="custom-category-grid">@for (category of productCategories(); track category.id) { <button type="button" (click)="openCategory(category.id)"><strong>{{ category.name }}</strong><span>Explore collection →</span></button> } @empty { <p class="empty">Store categories will appear here as products are added.</p> }</div></section>
                } @else if (section.type === 'banner') {
                  <section class="promo-banner-wrap"><div class="promo-banner" [style.background-image]="'linear-gradient(rgba(0,0,0,0.48), rgba(0,0,0,0.64)), url(' + (section.image_url || '') + ')' "><div class="wrap banner-inner"><p class="overline-light">{{ section.badge }}</p><h2>{{ section.title }}</h2><p>{{ section.subtitle }}</p><button class="banner-btn" (click)="handleBannerAction(section.button_link)">{{ section.button_text || 'Explore now' }} →</button></div></div></section>
                } @else if (section.type === 'rich_text') {
                  <section class="story wrap"><p class="overline">{{ section.badge || page.name }}</p><h2>{{ section.title }}</h2><p class="story-body">{{ section.content || section.subtitle }}</p></section>
                } @else if (section.type === 'image') {
                  <section class="wrap custom-image-section">@if (section.image_url) { <img [src]="section.image_url" [alt]="section.title || page.name" /> }@if (section.title) { <p>{{ section.title }}</p> }</section>
                } @else if (section.type === 'gallery') {
                  <section class="gallery-section wrap"><div class="section-head-center"><p class="overline">{{ section.badge || 'GALLERY' }}</p><h2>{{ section.title || 'A closer look' }}</h2><p class="sub">{{ section.subtitle }}</p></div><div class="gallery-grid">@for (item of (section.items || []); track $index) { <div class="gallery-card"><img [src]="item.image || ''" [alt]="item.title" /><div class="gallery-overlay"><h4>{{ item.title }}</h4>@if(item.desc){<p>{{ item.desc }}</p>}</div></div> }</div></section>
                } @else if (section.type === 'trust_bar') {
                  <section class="trust"><div class="wrap"><span>✓ Secure & verified checkout</span><span>◇ Carefully curated products</span><span>↗ Reliable dispatch</span></div></section>
                } @else if (section.type === 'faq') {
                  <section class="wrap custom-faq"><p class="overline">HELP & DETAILS</p><h2>{{ section.title || 'Frequently asked questions' }}</h2>@for (item of (section.items || []); track $index) { <details><summary>{{ item.title }}</summary><p>{{ item.desc }}</p></details> }</section>
                } @else if (section.type === 'testimonials') {
                  <section class="wrap custom-testimonials"><p class="overline">KIND WORDS</p><h2>{{ section.title || 'Loved by customers' }}</h2><div>@for (item of (section.items || []); track $index) { <blockquote>“{{ item.desc || item.title }}”</blockquote> } @empty { <blockquote>“{{ section.subtitle || 'Thoughtful design and a lovely experience.' }}”</blockquote> }</div></section>
                } @else if (section.type === 'reviews') {
                  @if (reviews().length) { <section class="store-reviews wrap"><p class="overline">SHOPPER REVIEWS</p><h2>{{ section.title || 'Customer reviews' }}</h2><div class="review-grid">@for (review of reviews(); track review.id) { <article><app-stars [value]="review.rating" /><strong>{{ review.title || 'Verified review' }}</strong>@if(review.body){<p>{{ review.body }}</p>}<small>{{ review.author?.name || 'Customer' }}</small></article> }</div></section> }
                } @else if (section.type === 'newsletter') {
                  <section class="newsletter"><div class="wrap"><div><p class="overline-light">KEEP IN TOUCH</p><h2>{{ section.title || 'Stay in the loop' }}</h2><p>{{ section.subtitle }}</p></div><form (submit)="onNewsletterSubmit($event)"><input type="email" placeholder="Your email address" required /><button type="submit">{{ section.button_text || 'Subscribe →' }}</button></form></div></section>
                } @else if (section.type === 'contact_card') {
                  <section class="contact-card-section wrap"><div class="contact-card-box"><div><p class="overline">LET'S CONNECT</p><h2>{{ section.title || 'Connect with our team' }}</h2><p>{{ section.subtitle }}</p></div><div class="contact-card-meta"><span>✉ {{ s.contact_email || 'hello@markethub.test' }}</span><button class="shop-btn-sm" (click)="setPage('contact')">Contact us →</button></div></div></section>
                } @else if (section.type === 'spacer') { <div class="custom-spacer" [style.height.px]="section.responsive?.desktop?.padding || 48"></div> }
              }
            } @empty { <section class="wrap empty"><h2>This page is being prepared</h2></section> }
          </main>
        }

        <!-- SUB-PAGE: HOMEPAGE (DEFAULT DYNAMIC SECTION BUILDER) -->
        @else {
          <main class="page-view home-view">
            @for (section of sections(); track section.id) {
              <!-- 1. HERO SECTION -->
              @if (section.enabled && section.type === 'hero') {
                <section [class]="'hero hero-' + (section.layout || theme().hero_style || 'split')">
                  @if (section.layout === 'full_banner' || theme().hero_style === 'full_banner') {
                    <div
                      class="hero-full-backdrop"
                      [style.background-image]="'linear-gradient(rgba(0,0,0,' + (section.overlay_opacity || 0.45) + '), rgba(0,0,0,' + (section.overlay_opacity || 0.7) + ')), url(' + (section.image_url || theme().hero_image || s.banner_path || '/images/market-shopper.jpg') + ')'"
                    >
                      <div class="wrap hero-inner centered-hero">
                        <p class="overline-light">{{ section.badge || ('WELCOME TO ' + s.name) }}</p>
                        <h1>{{ section.title || s.name }}</h1>
                        <p class="lead-light">{{ section.subtitle || s.description || 'Crafted with passion, designed for everyday living.' }}</p>
                        <div class="hero-actions">
                          <button class="shop-btn" (click)="setPage('shop')">{{ section.button_text || 'Shop the collection' }} <span>→</span></button>
                          @if (aboutConfig().enabled !== false) {
                            <button class="ghost-btn-light" (click)="setPage('about')">Our Story</button>
                          }
                        </div>
                      </div>
                    </div>
                  } @else if (section.layout === 'centered' || theme().hero_style === 'centered') {
                    <div class="wrap hero-inner centered-hero">
                      <p class="overline">{{ section.badge || ('WELCOME TO ' + s.name) }}</p>
                      <h1>{{ section.title || s.name }}</h1>
                      <p class="lead">{{ section.subtitle || s.description }}</p>
                      <div class="hero-actions">
                        <button class="shop-btn" (click)="setPage('shop')">{{ section.button_text || 'Shop the collection' }} <span>→</span></button>
                        @if (aboutConfig().enabled !== false) {
                          <button class="ghost-btn" (click)="setPage('about')">Our Story</button>
                        }
                      </div>
                    </div>
                  } @else {
                    <!-- Default Split Hero with Framed Image -->
                    <div class="wrap hero-inner split-hero">
                      <div class="hero-content">
                        <p class="overline">{{ section.badge || ('WELCOME TO ' + s.name) }}</p>
                        <h1>{{ section.title || s.name }}</h1>
                        <p class="lead">{{ section.subtitle || s.description || 'Thoughtfully selected products, crafted for longevity and personal expression.' }}</p>
                        <div class="hero-actions">
                          <button class="shop-btn" (click)="setPage('shop')">{{ section.button_text || 'Shop the collection' }} <span>→</span></button>
                          @if (aboutConfig().enabled !== false) {
                            <button class="ghost-btn" (click)="setPage('about')">Our Story</button>
                          }
                        </div>
                      </div>
                      <div class="hero-visual">
                        <div class="hero-frame">
                          <img
                            [src]="section.image_url || theme().hero_image || s.banner_path || '/images/market-shopper.jpg'"
                            [alt]="s.name"
                          />
                          <div class="hero-tag">
                            <span class="pulse-dot"></span>
                            <span>{{ section.badge || 'Curated Artisan Stall' }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </section>
              }

              <!-- 2. TRUST BAR SECTION -->
              @if (section.enabled && section.type === 'trust_bar') {
                <section class="trust">
                  <div class="wrap">
                    @if (s.rating_count) {
                      <span class="rated"><app-stars [value]="s.rating_avg || 0" [showValue]="true" /> {{ s.rating_count }} review{{ s.rating_count === 1 ? '' : 's' }}</span>
                    } @else {
                      <span>✓ Secure & verified checkout</span>
                    }
                    <span>◇ Carefully crafted & curated</span>
                    <span>↗ Reliable dispatch</span>
                    <span>↺ Simple returns</span>
                    @if (auth.isLoggedIn()) {
                      <button type="button" class="follow" [class.on]="following()" (click)="toggleFollow(s.id)">
                        {{ following() ? '♥ Following' : '♡ Follow store' }}
                      </button>
                    }
                  </div>
                </section>
              }

              <!-- 3. FEATURED PRODUCTS CATALOGUE SECTION -->
              @if (section.enabled && (section.type === 'featured_products' || section.type === 'product_grid')) {
                <section class="catalogue wrap" id="catalogue">
                  <div class="section-head">
                    <div>
                      <p class="overline">{{ section.badge || 'CURATED FOR YOU' }}</p>
                      <h2>{{ section.title || 'Featured collection' }}</h2>
                      <p class="sub">{{ section.subtitle || 'Discover standout pieces selected from our studio catalogue.' }}</p>
                    </div>
                    <button class="view-all-link" (click)="setPage('shop')">View all {{ products().length }} products →</button>
                  </div>
                  <div class="grid cards widget-grid" [style.--widget-cols]="section.columns || 4" [style.--tablet-cols]="section.responsive?.tablet?.columns || 3" [style.--mobile-cols]="section.responsive?.mobile?.columns || 2">
                    @for (p of sectionProducts(section); track p.id) {
                      <app-product-card [product]="p" />
                    } @empty {
                      <div class="empty">
                        <h3>New collection coming soon</h3>
                        <p>This shop is preparing its first products.</p>
                      </div>
                    }
                  </div>
                </section>
              }

              @if (section.enabled && section.type === 'category_grid') {
                <section class="wrap custom-categories">
                  <div class="section-head"><div><p class="overline">{{ section.badge || 'BROWSE OUR RANGE' }}</p><h2>{{ section.title || 'Shop by category' }}</h2><p class="sub">{{ section.subtitle || 'Explore collections from our store.' }}</p></div></div>
                  <div class="custom-category-grid">@for (category of productCategories(); track category.id) { <button type="button" (click)="openCategory(category.id)"><strong>{{ category.name }}</strong><span>Explore collection →</span></button> } @empty { <p class="empty">Store categories will appear here as products are added.</p> }</div>
                </section>
              }

              <!-- 4. PROMOTIONAL BANNER SECTION -->
              @if (section.enabled && section.type === 'banner') {
                <section class="promo-banner-wrap">
                  <div
                    class="promo-banner"
                    [style.background-image]="'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.65)), url(' + (section.image_url || theme().banner_image || s.banner_path || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80') + ')'"
                  >
                    <div class="wrap banner-inner">
                      @if (section.badge) {
                        <span class="banner-badge">{{ section.badge }}</span>
                      }
                      <h2>{{ section.title || 'Handcrafted for Everyday Living' }}</h2>
                      <p>{{ section.subtitle || 'Explore limited seasonal pieces and studio specialties.' }}</p>
                      <button class="banner-btn" (click)="handleBannerAction(section.button_link)">
                        {{ section.button_text || 'Explore now' }} →
                      </button>
                    </div>
                  </div>
                </section>
              }

              <!-- 5. PRODUCTION & CRAFT SECTION -->
              @if (section.enabled && section.type === 'production') {
                <section class="production-showcase wrap">
                  <div class="showcase-head">
                    <p class="overline">{{ section.badge || 'BEHIND THE CRAFT' }}</p>
                    <h2>{{ section.title || 'How our products are made' }}</h2>
                    <p class="sub">{{ section.subtitle || 'Every piece undergoes dedicated preparation, ethical crafting, and rigorous quality inspection.' }}</p>
                  </div>

                  <div class="production-grid">
                    <div class="prod-image-col">
                      <img
                        [src]="section.image_url || 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=80'"
                        [alt]="section.title || 'Artisan production process'"
                        class="prod-main-img"
                      />
                      <div class="artisan-badge">
                        <span class="pulse"></span>
                        <span>Direct from maker's workshop</span>
                      </div>
                    </div>

                    <div class="prod-steps-col">
                      @for (step of (section.steps?.length ? section.steps : defaultSteps); track $index) {
                        <div class="step-card">
                          <div class="step-num">0{{ $index + 1 }}</div>
                          <div>
                            <h4>{{ step.title }}</h4>
                            <p>{{ step.description }}</p>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                </section>
              }

              <!-- 6. STUDIO GALLERY SECTION -->
              @if (section.enabled && section.type === 'gallery') {
                <section class="gallery-section wrap">
                  <div class="section-head-center">
                    <p class="overline">{{ section.badge || 'GALLERY' }}</p>
                    <h2>{{ section.title || 'Inside our workshop & studio' }}</h2>
                    <p class="sub">{{ section.subtitle || 'A visual collection of our workspace, materials, and finished goods.' }}</p>
                  </div>

                  <div class="gallery-grid">
                    @for (item of (section.items?.length ? section.items : defaultGallery); track $index) {
                      <div class="gallery-card">
                        <img [src]="item.image" [alt]="item.title" />
                        <div class="gallery-overlay">
                          <h4>{{ item.title }}</h4>
                          @if (item.desc) { <p>{{ item.desc }}</p> }
                        </div>
                      </div>
                    }
                  </div>
                </section>
              }

              <!-- 7. RICH STORY TEXT SECTION -->
              @if (section.enabled && section.type === 'rich_text') {
                <section class="story wrap">
                  <p class="overline">{{ section.badge || 'OUR STORY' }}</p>
                  <h2>{{ section.title || 'A commitment to quality' }}</h2>
                  <p class="story-body">{{ section.subtitle || s.description }}</p>
                  @if (aboutConfig().enabled !== false) {
                    <button class="text-link-btn" (click)="setPage('about')">Read the full story →</button>
                  }
                </section>
              }

              <!-- 8. CONTACT CARD SECTION -->
              @if (section.enabled && section.type === 'contact_card') {
                <section class="contact-card-section wrap">
                  <div class="contact-card-box">
                    <div>
                      <p class="overline">VISIT & CONTACT</p>
                      <h2>{{ section.title || 'Connect with our studio' }}</h2>
                      <p>{{ section.subtitle || 'Reach out for inquiries, bespoke orders, or questions.' }}</p>
                    </div>
                    <div class="contact-card-meta">
                      <span>✉ {{ s.contact_email || 'hello@markethub.test' }}</span>
                      <span>📍 {{ s.city }}{{ s.country ? ', ' + s.country : '' }}</span>
                      <button class="shop-btn-sm" (click)="setPage('contact')">Send a message →</button>
                    </div>
                  </div>
                </section>
              }

              <!-- 9. NEWSLETTER SECTION -->
              @if (section.enabled && section.type === 'newsletter') {
                <section class="newsletter">
                  <div class="wrap">
                    <div>
                      <p class="overline-light">KEEP IN TOUCH</p>
                      <h2>{{ section.title || 'Stay in the loop' }}</h2>
                      <p>{{ section.subtitle || 'Subscribe to receive updates, new releases, and studio announcements.' }}</p>
                    </div>
                    <form (submit)="onNewsletterSubmit($event)">
                      <input type="email" placeholder="Your email address" aria-label="Email address" required />
                      <button type="submit">{{ section.button_text || 'Join us →' }}</button>
                    </form>
                  </div>
                </section>
              }
              @if (section.enabled && section.type === 'image') {
                <section class="wrap custom-image-section">@if (section.image_url) { <img [src]="section.image_url" [alt]="section.title || 'Store image'" /> }@if (section.title) { <p>{{ section.title }}</p> }</section>
              }
              @if (section.enabled && section.type === 'faq') {
                <section class="wrap custom-faq"><p class="overline">HELP & DETAILS</p><h2>{{ section.title || 'Frequently asked questions' }}</h2>@for (item of (section.items || []); track $index) { <details><summary>{{ item.title }}</summary><p>{{ item.desc }}</p></details> }</section>
              }
              @if (section.enabled && section.type === 'testimonials') {
                <section class="wrap custom-testimonials"><p class="overline">KIND WORDS</p><h2>{{ section.title || 'Loved by customers' }}</h2><div>@for (item of (section.items || []); track $index) { <blockquote>“{{ item.desc || item.title }}”</blockquote> } @empty { <blockquote>“{{ section.subtitle || 'Thoughtful design and a lovely experience.' }}”</blockquote> }</div></section>
              }
              @if (section.enabled && section.type === 'spacer') { <div class="custom-spacer" [style.height.px]="section.responsive?.desktop?.padding || 48"></div> }
            }

            <!-- CUSTOMER REVIEWS (IF PRESENT) -->
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
          </main>
        }

        <!-- DEDICATED STORE FOOTER -->
        <footer id="contact">
          <div class="wrap">
            <div class="foot-col-brand">
              <b>{{ s.name }}</b>
              <p>{{ s.description || 'Independent artisan storefront on MarketHub.' }}</p>
              <div class="foot-badge-wrap">
                <a routerLink="/" class="market-pill-badge">
                  <span>✦ Certified MarketHub Storefront</span>
                </a>
              </div>
            </div>

            <div class="foot-col-nav">
              <strong>Navigation</strong>
              <a (click)="setPage('home')">Home</a>
              <a (click)="setPage('shop')">Shop catalogue</a>
              @if (aboutConfig().enabled !== false) {
                <a (click)="setPage('about')">Our story</a>
              }
              @if (contactConfig().enabled !== false) {
                <a (click)="setPage('contact')">Contact</a>
              }
            </div>

            <div class="foot-col-contact">
              <strong>Contact & Location</strong>
              <p>{{ s.contact_email || 'hello@markethub.test' }}</p>
              @if (s.contact_phone) { <p>{{ s.contact_phone }}</p> }
              <p>{{ s.address_line || '' }} {{ s.city }}{{ s.country ? ', ' + s.country : '' }}</p>
            </div>
          </div>
          <div class="foot-bottom wrap">
            <small>© {{ currentYear }} {{ s.name }}. All rights reserved.</small>
            <a routerLink="/" class="market-brand-link">Back to MarketHub Marketplace →</a>
          </div>
        </footer>
      </div>
    } @else {
      <div class="loading">
        <span></span>
        <p>Loading storefront…</p>
      </div>
    }
  `,
  styles: [],

})
export class StoreComponent implements OnInit {
  auth = inject(AuthService);
  currency = inject(CurrencyService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  store = signal<Storefront | null>(null);
  products = signal<ProductCard[]>([]);
  reviews = signal<Review[]>([]);
  following = signal(false);
  activePage = signal<StorePageTab>('home');
  categoryFilter = signal<number | null>(null);
  publishedPages = computed(() => (this.store()?.pages || []).filter((page) => page.status === 'published'));
  customPage = computed(() => this.publishedPages().find((page) => page.slug === this.activePage()) || null);
  shopProducts = computed(() => {
    const selected = this.categoryFilter();
    return selected ? this.products().filter((product) => product.category?.id === selected) : this.products();
  });
  currentYear = new Date().getFullYear();

  // Navigation, Profile & Currency UI states
  profileOpen = signal(false);
  mobileMenuOpen = signal(false);

  userInitials = computed(() => {
    const name = this.auth.user()?.name ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join('') || 'U';
  });

  roleLabel = computed(() => {
    const user = this.auth.user();
    if (!user) return '';
    if (user.role === 'super_admin') return 'Admin';
    if (user.role === 'tenant_owner') return 'Seller';
    if (user.role === 'store_staff') return user.department ? `${user.department} staff` : 'Staff';
    if (user.role === 'customer') return 'Customer';
    return user.role;
  });

  hasTenantRole = computed(() => this.auth.hasRole('tenant_owner', 'store_staff'));
  hasAdminRole = computed(() => this.auth.hasRole('super_admin'));

  // Contact form state
  contactForm = { name: '', email: '', subject: '', message: '' };
  contactLoading = signal(false);
  contactSent = signal(false);
  contactMessage = signal('');
  contactError = signal('');

  defaultSteps = [
    { title: 'Ethical Sourcing', description: 'Raw materials are responsibly sourced from certified ethical suppliers.' },
    { title: 'Artisan Craftsmanship', description: 'Crafted by hand using timeless methods and modern precision.' },
    { title: 'Quality Assurance', description: 'Inspected rigorously before packing to guarantee high standards.' },
    { title: 'Conscious Packaging', description: 'Packaged using recycled, biodegradable and plastic-free materials.' }
  ];

  defaultGallery = [
    { title: 'Design & Prototype', desc: 'Initial sketch and modeling', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80' },
    { title: 'Hand Assembly', desc: 'Forming individual components', image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=600&q=80' },
    { title: 'Finished Collection', desc: 'Ready for display and delivery', image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80' }
  ];

  theme = computed(() => ({
    primary_color: '#1f4b3a',
    accent_color: '#c45c26',
    surface_color: '#ffffff',
    font: 'modern',
    hero_style: 'split',
    ...(this.store()?.theme_config || {})
  }));

  aboutConfig = computed(() => ({
    enabled: true,
    nav_label: 'Our story',
    hero_title: '',
    hero_subtitle: '',
    cover_image: '',
    story_title: 'How We Began',
    story_body: '',
    story_image: '',
    craft_title: 'Production & Artistry',
    craft_body: '',
    craft_image: '',
    craft_steps: [],
    values: [],
    ...(this.theme().pages?.about || {})
  }));

  contactConfig = computed(() => ({
    enabled: true,
    nav_label: 'Contact',
    title: '',
    subtitle: '',
    address: '',
    hours: '',
    phone: '',
    email: '',
    show_form: true,
    form_intro: '',
    ...(this.theme().pages?.contact || {})
  }));

  aboutSteps = computed(() => {
    const s = this.aboutConfig().craft_steps;
    return s && s.length ? s : this.defaultSteps;
  });

  aboutValues = computed(() => {
    const v = this.aboutConfig().values;
    return v && v.length ? v : [
      { icon: '🌿', title: 'Sustainable', desc: 'Sourced consciously with minimal carbon footprint.' },
      { icon: '✂️', title: 'Handcrafted', desc: 'Crafted with genuine passion and artisan pride.' },
      { icon: '✦', title: 'Uncompromising', desc: 'Materials and durability that exceed expectations.' }
    ];
  });

  sections = computed<StorePageSection[]>(() => {
    const s = this.store()?.page_sections;
    if (s && s.length) return s;
    return [
      {
        id: 'hero',
        type: 'hero',
        layout: 'split',
        badge: 'Handcrafted · Independent Maker',
        title: this.store()?.name || 'Curated Goods',
        subtitle: this.store()?.description || 'Discover thoughtfully selected products, made for everyday living.',
        button_text: 'Shop the collection',
        button_link: '#catalogue',
        image_url: '/images/market-shopper.jpg',
        enabled: true
      },
      { id: 'trust', type: 'trust_bar', title: '', subtitle: '', enabled: true },
      {
        id: 'featured',
        type: 'featured_products',
        badge: 'CURATED FOR YOU',
        title: 'Featured collection',
        subtitle: 'Discover our latest arrivals and customer favorites.',
        enabled: true
      },
      {
        id: 'banner',
        type: 'banner',
        badge: 'Seasonal Showcase',
        title: 'Crafted for Discerning Spaces',
        subtitle: 'Explore limited run pieces made with sustainable materials.',
        button_text: 'Explore Catalogue',
        button_link: '#catalogue',
        image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
        enabled: true
      },
      {
        id: 'production',
        type: 'production',
        badge: 'BEHIND THE CRAFT',
        title: 'How our products are made',
        subtitle: 'Every piece is crafted with conscious sourcing and precision.',
        image_url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=80',
        steps: this.defaultSteps,
        enabled: true
      },
      {
        id: 'gallery',
        type: 'gallery',
        badge: 'FROM THE STUDIO',
        title: 'Inside our workshop & studio',
        subtitle: 'A glimpse into our materials, creative process, and finished pieces.',
        items: this.defaultGallery,
        enabled: true
      },
      {
        id: 'rich_text',
        type: 'rich_text',
        badge: 'OUR HERITAGE',
        title: 'A commitment to quality',
        subtitle: this.store()?.description || 'We started with a simple belief: that everyday items should be durable, beautiful, and made with purpose.',
        enabled: true
      },
      {
        id: 'newsletter',
        type: 'newsletter',
        title: 'Stay in the loop',
        subtitle: 'Subscribe to receive updates, studio launches, and exclusive member discounts.',
        button_text: 'Join us →',
        enabled: true
      }
    ];
  });

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug')!;

    // Check query param for page
    this.route.queryParamMap.subscribe((qp) => {
      const page = qp.get('page');
      this.activePage.set(page || 'home');
    });

    this.api.marketStore(slug).subscribe((res) => {
      this.store.set({ ...res.data.store, pages: res.data.pages || [] });
      this.products.set(res.data.products);
      if (this.auth.isLoggedIn()) {
        this.api.wishlistIds().subscribe({
          next: (ids) => this.following.set(ids.data.store_ids.includes(res.data.store.id)),
          error: () => undefined,
        });
      }
    });

    this.api.storeReviews(slug, { per_page: '6' }).subscribe({
      next: (res) => this.reviews.set(res.data || []),
      error: () => undefined,
    });
  }

  onCurrencyChange(event: Event): void {
    this.currency.setDisplay((event.target as HTMLSelectElement).value);
  }

  toggleProfile(e?: Event) {
    if (e) e.stopPropagation();
    this.profileOpen.update((v) => !v);
  }

  closeProfile() {
    this.profileOpen.set(false);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  onLogout() {
    this.closeProfile();
    this.closeMobileMenu();
    this.auth.logout();
  }

  @HostListener('document:click')
  onDocClick() {
    this.closeProfile();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeProfile();
    this.closeMobileMenu();
  }

  setPage(page: StorePageTab) {
    this.activePage.set(page);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: page === 'home' ? {} : { page },
      queryParamsHandling: 'replace',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handleBannerAction(link?: string) {
    if (link === '#catalogue' || !link) {
      this.setPage('shop');
    } else if (link.startsWith('?page=')) {
      const p = link.split('=')[1] as StorePageTab;
      this.setPage(p || 'home');
    } else if (link.startsWith('#')) {
      const el = document.querySelector(link);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else this.setPage('shop');
    } else {
      window.location.href = link;
    }
  }

  sectionProducts(section: StorePageSection): ProductCard[] {
    let rows = [...this.products()];
    switch (section.product_source) {
      case 'featured':
        rows = rows.filter((product) => product.is_featured);
        break;
      case 'bestsellers':
        rows.sort((a, b) => (b.best_selling_count || 0) - (a.best_selling_count || 0));
        break;
      case 'category':
        if (section.category_id) rows = rows.filter((product) => product.category?.id === section.category_id);
        break;
      case 'manual':
        rows = (section.product_ids || []).map((id) => this.products().find((product) => product.id === id)).filter((product): product is ProductCard => !!product);
        break;
    }
    return rows.slice(0, Math.max(1, Math.min(24, section.limit || 8)));
  }

  productCategories(): { id: number; name: string; image: string | null }[] {
    const categories = new Map<number, { id: number; name: string; image: string | null }>();
    for (const product of this.products()) {
      const category = product.category;
      if (category && !categories.has(category.id)) categories.set(category.id, { id: category.id, name: category.name, image: product.image || null });
    }
    return [...categories.values()];
  }

  categoryName(id: number | null): string {
    return this.productCategories().find((category) => category.id === id)?.name || 'selected category';
  }

  openCategory(id: number) {
    this.categoryFilter.set(id);
    this.setPage('shop');
  }

  toggleFollow(storeId: number) {
    this.api.toggleFavouriteStore(storeId).subscribe({
      next: (res) => this.following.set(res.data.saved),
      error: () => undefined,
    });
  }

  submitContact(e: Event) {
    e.preventDefault();
    const s = this.store();
    if (!s) return;

    this.contactLoading.set(true);
    this.contactError.set('');
    this.api.contactStore(s.slug, this.contactForm).subscribe({
      next: (res) => {
        this.contactLoading.set(false);
        this.contactSent.set(true);
        this.contactMessage.set(res.data.message || 'Thank you for reaching out!');
        this.contactForm = { name: '', email: '', subject: '', message: '' };
      },
      error: (err) => {
        this.contactLoading.set(false);
        this.contactError.set(err.error?.message || 'Unable to submit message right now. Please try again.');
      }
    });
  }

  onNewsletterSubmit(e: Event) {
    e.preventDefault();
    alert('Thank you for subscribing to ' + (this.store()?.name || 'our shop') + ' updates!');
  }

  initials(name: string) {
    return (name || 'S').split(/\s+/).slice(0, 2).map((x: string) => x[0]).join('').toUpperCase();
  }
}
