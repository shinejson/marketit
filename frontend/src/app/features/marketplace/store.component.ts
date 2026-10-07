import { Component, HostListener, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ProductCard, Storefront, StorePageSection, Review } from '../../core/models';
import { ProductCardComponent } from '../../shared/product-card.component';
import { StarRatingComponent } from '../../shared/star-rating.component';
import { AuthService } from '../../core/auth.service';
import { CurrencyService } from '../../core/currency.service';

type StorePageTab = 'home' | 'shop' | 'about' | 'contact';

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
              <span class="count-tag">{{ products().length }} product{{ products().length === 1 ? '' : 's' }}</span>
            </div>

            <div class="grid cards">
              @for (p of products(); track p.id) {
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
              @if (section.enabled && section.type === 'featured_products') {
                <section class="catalogue wrap" id="catalogue">
                  <div class="section-head">
                    <div>
                      <p class="overline">{{ section.badge || 'CURATED FOR YOU' }}</p>
                      <h2>{{ section.title || 'Featured collection' }}</h2>
                      <p class="sub">{{ section.subtitle || 'Discover standout pieces selected from our studio catalogue.' }}</p>
                    </div>
                    <button class="view-all-link" (click)="setPage('shop')">View all {{ products().length }} products →</button>
                  </div>
                  <div class="grid cards">
                    @for (p of products(); track p.id) {
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
  styles: [`
    :host { display: block; }
    .storefront {
      --store-primary: #1f4b3a;
      --store-accent: #c45c26;
      --store-surface: #ffffff;
      background: var(--store-surface);
      color: #191b18;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .storefront.editorial {
      font-family: 'Fraunces', Georgia, serif;
    }
    .storefront.friendly {
      font-family: 'Trebuchet MS', 'Nunito', sans-serif;
    }

    /* Wrap utility */
    .wrap {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 24px;
      box-sizing: border-box;
    }

    /* Dedicated Store Navigation Header */
    .store-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      height: 76px;
      border-bottom: 1px solid #ebe8e1;
      position: sticky;
      top: 0;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(12px);
      z-index: 50;
      width: 100%;
    }
    .nav-brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .back-market-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 11px;
      border-radius: 20px;
      background: #f4f2ec;
      color: #5d665d;
      font-size: 11px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.15s;
    }
    .back-market-link:hover {
      background: #eae6dd;
      color: #191b18;
    }
    .nav-sep {
      color: #d2cdc4;
      font-size: 14px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      text-decoration: none;
    }
    .brand-logo {
      height: 36px;
      max-width: 130px;
      object-fit: contain;
      border-radius: 6px;
    }
    .brand-initials {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--store-primary);
      color: white;
      font: 700 15px Georgia, serif;
    }
    .brand-name {
      font: 700 20px 'Fraunces', Georgia, serif;
      color: var(--store-primary);
      letter-spacing: -0.02em;
    }

    /* Nav Links */
    .nav-links {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .nav-links button {
      background: none;
      border: 0;
      padding: 8px 4px;
      font-size: 14px;
      font-weight: 500;
      color: #555d55;
      cursor: pointer;
      position: relative;
      transition: color 0.15s;
    }
    .nav-links button:hover {
      color: var(--store-primary);
    }
    .nav-links button.active {
      color: var(--store-primary);
      font-weight: 700;
    }
    .nav-links button.active::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--store-accent);
      border-radius: 2px;
    }

    /* Actions */
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Currency Converter Picker */
    .currency-picker {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 10px;
      border: 1px solid #dcd8cf;
      border-radius: 20px;
      background: #faf8f5;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .currency-picker:hover {
      border-color: var(--store-primary);
    }
    .curr-sym {
      color: var(--store-accent);
      font-size: 12px;
    }
    .currency-picker select {
      border: 0;
      background: transparent;
      font-size: 11px;
      font-weight: 700;
      color: #2b312b;
      cursor: pointer;
      outline: 0;
      padding: 0;
    }

    /* Follow & Bag */
    .btn-follow {
      padding: 6px 14px;
      border: 1px solid var(--store-primary);
      border-radius: 20px;
      background: transparent;
      color: var(--store-primary);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-follow.on {
      background: var(--store-primary);
      color: white;
    }
    .btn-bag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      background: #f4f2ec;
      color: #242924;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
    }

    /* Auth Buttons (Logged Out) */
    .auth-btns {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-auth {
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-auth.ghost {
      border: 1px solid #dcd8cf;
      background: transparent;
      color: #2b312b;
    }
    .btn-auth.ghost:hover {
      border-color: var(--store-primary);
      color: var(--store-primary);
    }
    .btn-auth.solid {
      background: var(--store-primary);
      color: white;
      border: 1px solid var(--store-primary);
    }

    /* User Profile Dropdown (Logged In) */
    .dropdown-wrap {
      position: relative;
    }
    .profile-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px 4px 4px;
      border: 1px solid #dcd8cf;
      border-radius: 30px;
      background: #faf8f5;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .profile-btn:hover {
      border-color: var(--store-primary);
    }
    .avatar-img {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
    }
    .avatar-initials {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--store-primary);
      color: white;
      font-size: 11px;
      font-weight: 800;
    }
    .who-meta {
      display: flex;
      flex-direction: column;
      text-align: left;
      line-height: 1.1;
    }
    .who-name {
      font-size: 12px;
      font-weight: 700;
      color: #191b18;
      max-width: 100px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .who-role {
      font-size: 9px;
      color: #727a72;
      text-transform: capitalize;
    }
    .chevron-icon {
      width: 12px;
      height: 12px;
      color: #727a72;
      transition: transform 0.2s;
    }
    .chevron-icon.open {
      transform: rotate(180deg);
    }

    .profile-dropdown-menu {
      position: absolute;
      right: 0;
      top: 44px;
      z-index: 100;
      width: 210px;
      background: white;
      border: 1px solid #ebe8e1;
      border-radius: 14px;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.12);
      padding: 8px;
      animation: fadeIn 0.15s ease;
    }
    .drop-user-info {
      padding: 8px 10px 10px;
      border-bottom: 1px solid #f1ede4;
      margin-bottom: 6px;
    }
    .drop-user-name {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      color: #191b18;
    }
    .drop-user-email {
      margin: 2px 0 0;
      font-size: 11px;
      color: #727a72;
      word-break: break-all;
    }
    .drop-menu-links {
      display: grid;
      gap: 2px;
    }
    .drop-menu-links a {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #3b423b;
      text-decoration: none;
      transition: background 0.15s;
    }
    .drop-menu-links a:hover {
      background: #f4f2ec;
      color: var(--store-primary);
    }
    .drop-menu-links svg {
      width: 15px;
      height: 15px;
      color: #727a72;
    }
    .drop-logout-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px 10px;
      border: 0;
      border-top: 1px solid #f1ede4;
      margin-top: 6px;
      background: transparent;
      font-size: 12px;
      font-weight: 600;
      color: #dc2626;
      cursor: pointer;
      text-align: left;
      border-radius: 0 0 8px 8px;
    }
    .drop-logout-btn svg {
      width: 15px;
      height: 15px;
    }

    /* Mobile Drawer */
    .mobile-toggle {
      display: none;
      flex-direction: column;
      gap: 4px;
      width: 32px;
      height: 32px;
      border: 1px solid #dcd8cf;
      border-radius: 8px;
      background: white;
      padding: 6px;
      cursor: pointer;
    }
    .mobile-toggle span {
      display: block;
      height: 2px;
      background: #222822;
      border-radius: 2px;
    }
    .mobile-drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
    }
    .mobile-drawer {
      width: 300px;
      background: white;
      height: 100%;
      box-shadow: -10px 0 30px rgba(0,0,0,0.2);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .drawer-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #ebe8e1;
      padding-bottom: 14px;
    }
    .drawer-head b { font-size: 18px; color: var(--store-primary); }
    .drawer-close {
      background: none;
      border: 0;
      font-size: 24px;
      cursor: pointer;
    }
    .drawer-nav {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .drawer-nav button {
      background: none;
      border: 0;
      text-align: left;
      font-size: 16px;
      font-weight: 600;
      color: #2b312b;
      cursor: pointer;
    }
    .drawer-actions {
      border-top: 1px solid #ebe8e1;
      padding-top: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .drawer-curr {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .drawer-curr select {
      padding: 5px 8px;
      border-radius: 6px;
      border: 1px solid #dcd8cf;
    }
    .drawer-btn {
      display: block;
      padding: 10px;
      text-align: center;
      border: 1px solid #dcd8cf;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      color: #2b312b;
      text-decoration: none;
    }
    .drawer-btn.solid {
      background: var(--store-primary);
      color: white;
      border-color: var(--store-primary);
    }
    .drawer-btn.ghost {
      color: #dc2626;
      border-color: #fca5a5;
    }
    .drawer-market-back {
      font-size: 12px;
      color: #727a72;
      text-align: center;
      margin-top: 10px;
      text-decoration: underline;
    }

    /* Overlines & Tags */
    .overline {
      color: var(--store-accent);
      font-size: 11px !important;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      margin: 0 0 12px !important;
    }
    .overline-light {
      color: #f7d2aa;
      font-size: 11px !important;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      margin: 0 0 12px !important;
    }

    /* Hero Variations */
    .hero {
      background: color-mix(in srgb, var(--store-primary) 7%, #ffffff);
      position: relative;
    }
    .hero-inner {
      padding: 75px 0;
    }
    .split-hero {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      align-items: center;
      gap: 50px;
      min-height: 520px;
    }
    .hero-content h1 {
      margin: 0;
      color: var(--store-primary);
      font: 700 clamp(38px, 5.5vw, 68px)/1.04 'Fraunces', Georgia, serif;
      letter-spacing: -0.035em;
    }
    .lead {
      max-width: 540px;
      margin: 22px 0 28px !important;
      color: #555d55;
      font-size: 17px;
      line-height: 1.65;
    }
    .hero-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .shop-btn {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 13px 26px;
      border-radius: 30px;
      border: 0;
      background: var(--store-primary);
      color: white;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .shop-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
    }
    .ghost-btn {
      display: inline-flex;
      align-items: center;
      padding: 12px 22px;
      border-radius: 30px;
      border: 1px solid var(--store-primary);
      background: transparent;
      color: var(--store-primary);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .ghost-btn-light {
      display: inline-flex;
      align-items: center;
      padding: 12px 22px;
      border-radius: 30px;
      border: 1px solid rgba(255, 255, 255, 0.6);
      background: transparent;
      color: white;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .hero-visual {
      position: relative;
    }
    .hero-frame {
      position: relative;
      border-radius: 24px;
      overflow: hidden;
      aspect-ratio: 4 / 3.2;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.16);
      border: 6px solid #ffffff;
    }
    .hero-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .hero-tag {
      position: absolute;
      bottom: 16px;
      left: 16px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(18, 22, 18, 0.85);
      backdrop-filter: blur(8px);
      padding: 7px 14px;
      border-radius: 30px;
      color: white;
      font-size: 11px;
      font-weight: 600;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.35);
    }

    /* Centered Hero */
    .centered-hero {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 860px;
      margin: auto;
    }
    .centered-hero h1 {
      margin: 0;
      color: var(--store-primary);
      font: 700 clamp(40px, 6vw, 72px)/1.04 'Fraunces', Georgia, serif;
    }
    .hero-full-backdrop {
      background-size: cover;
      background-position: center;
      padding: 100px 0;
      color: white;
    }
    .hero-full-backdrop h1 {
      color: white !important;
    }
    .lead-light {
      max-width: 600px;
      margin: 20px auto 30px !important;
      color: rgba(255, 255, 255, 0.9);
      font-size: 18px;
      line-height: 1.7;
    }

    /* Trust Bar */
    .trust {
      border-top: 1px solid #ebe8e1;
      border-bottom: 1px solid #ebe8e1;
      background: #fbfaf8;
    }
    .trust .wrap {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      padding-top: 16px;
      padding-bottom: 16px;
      color: #636b63;
      font-size: 12px;
      font-weight: 500;
      flex-wrap: wrap;
    }

    /* Catalogue */
    .catalogue {
      padding-top: 75px;
      padding-bottom: 85px;
    }
    .section-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 34px;
      gap: 20px;
    }
    .section-head h2 {
      margin: 0;
      color: var(--store-primary);
      font: 700 36px 'Fraunces', Georgia, serif;
    }
    .section-head .sub {
      margin: 6px 0 0;
      color: #666e66;
      font-size: 15px;
    }
    .view-all-link {
      background: none;
      border: 0;
      color: var(--store-primary);
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      text-decoration: underline;
    }
    .cards {
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 24px;
    }
    .empty {
      grid-column: 1/-1;
      padding: 60px 20px;
      text-align: center;
      background: #f7f6f2;
      border-radius: 18px;
    }

    /* Promo Banner Section */
    .promo-banner-wrap {
      padding: 30px 0;
    }
    .promo-banner {
      background-size: cover;
      background-position: center;
      border-radius: 24px;
      overflow: hidden;
      margin: 0 auto;
      max-width: 1280px;
      color: white;
    }
    .banner-inner {
      padding: 85px 30px;
      max-width: 720px;
    }
    .banner-badge {
      display: inline-block;
      padding: 5px 12px;
      background: var(--store-accent);
      color: white;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .banner-inner h2 {
      margin: 0 0 14px;
      font: 700 clamp(30px, 4.5vw, 48px)/1.1 'Fraunces', Georgia, serif;
      color: white;
    }
    .banner-inner p {
      margin: 0 0 28px;
      color: rgba(255, 255, 255, 0.88);
      font-size: 16px;
      line-height: 1.6;
    }
    .banner-btn {
      padding: 13px 26px;
      border-radius: 30px;
      border: 0;
      background: white;
      color: #191b18;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    /* Production / Workshop Showcase */
    .production-showcase {
      padding: 80px 0;
    }
    .showcase-head {
      margin-bottom: 40px;
      max-width: 760px;
    }
    .showcase-head h2 {
      margin: 0 0 10px;
      color: var(--store-primary);
      font: 700 36px 'Fraunces', Georgia, serif;
    }
    .showcase-head .sub {
      color: #636b63;
      font-size: 16px;
      line-height: 1.6;
      margin: 0;
    }
    .production-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      align-items: center;
    }
    .prod-image-col {
      position: relative;
    }
    .prod-main-img {
      width: 100%;
      height: 440px;
      object-fit: cover;
      border-radius: 22px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.1);
    }
    .artisan-badge {
      position: absolute;
      bottom: 20px;
      left: 20px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(25, 28, 25, 0.85);
      backdrop-filter: blur(8px);
      padding: 8px 16px;
      border-radius: 30px;
      color: white;
      font-size: 12px;
      font-weight: 600;
    }
    .artisan-badge .pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
    }
    .prod-steps-col {
      display: grid;
      gap: 16px;
    }
    .step-card {
      display: flex;
      align-items: flex-start;
      gap: 18px;
      padding: 20px;
      border: 1px solid #ebe8e1;
      border-radius: 16px;
      background: #faf8f5;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .step-card:hover {
      transform: translateX(4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
    }
    .step-num {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: var(--store-primary);
      color: white;
      font-size: 13px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .step-card h4 {
      margin: 0 0 5px;
      font-size: 16px;
      color: var(--store-primary);
    }
    .step-card p {
      margin: 0;
      font-size: 13px;
      color: #616861;
      line-height: 1.55;
    }

    /* Gallery Section */
    .gallery-section {
      padding: 80px 0;
    }
    .section-head-center {
      text-align: center;
      margin-bottom: 40px;
      max-width: 680px;
      margin-left: auto;
      margin-right: auto;
    }
    .section-head-center h2 {
      margin: 0 0 10px;
      color: var(--store-primary);
      font: 700 36px 'Fraunces', Georgia, serif;
    }
    .section-head-center .sub {
      color: #636b63;
      font-size: 15px;
      margin: 0;
    }
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .gallery-card {
      position: relative;
      border-radius: 18px;
      overflow: hidden;
      aspect-ratio: 4 / 3;
      box-shadow: 0 10px 25px rgba(0,0,0,0.08);
    }
    .gallery-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.35s;
    }
    .gallery-card:hover img {
      transform: scale(1.05);
    }
    .gallery-overlay {
      position: absolute;
      inset: auto 0 0 0;
      padding: 24px 16px 14px;
      background: linear-gradient(transparent, rgba(0,0,0,0.75));
      color: white;
    }
    .gallery-overlay h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
    }
    .gallery-overlay p {
      margin: 4px 0 0;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.85);
    }

    /* Rich Story Block */
    .story {
      max-width: 780px;
      text-align: center;
      padding: 90px 20px;
      margin: auto;
    }
    .story h2 {
      margin: 0 0 18px;
      color: var(--store-primary);
      font: 700 36px 'Fraunces', Georgia, serif;
    }
    .story-body {
      font-size: 18px;
      line-height: 1.8;
      color: #555d55;
    }
    .text-link-btn {
      margin-top: 18px;
      background: none;
      border: 0;
      color: var(--store-accent);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }

    /* Contact Card Banner */
    .contact-card-section {
      padding: 40px 0;
    }
    .contact-card-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fbfaf8;
      border: 1px solid #ebe8e1;
      border-radius: 20px;
      padding: 38px 45px;
      gap: 30px;
    }
    .contact-card-box h2 {
      margin: 0 0 6px;
      color: var(--store-primary);
      font: 700 28px 'Fraunces', Georgia, serif;
    }
    .contact-card-box p {
      margin: 0;
      color: #636b63;
      font-size: 14px;
    }
    .contact-card-meta {
      display: flex;
      align-items: center;
      gap: 22px;
      font-size: 13px;
      color: #444a44;
      flex-wrap: wrap;
    }
    .shop-btn-sm {
      padding: 10px 20px;
      border-radius: 20px;
      border: 0;
      background: var(--store-primary);
      color: white;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    /* Newsletter */
    .newsletter {
      padding: 70px 0;
      background: var(--store-primary);
      color: white;
    }
    .newsletter .wrap {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 30px;
      flex-wrap: wrap;
    }
    .newsletter h2 {
      margin: 0 0 6px;
      color: white;
      font: 700 32px 'Fraunces', Georgia, serif;
    }
    .newsletter p {
      margin: 0;
      color: rgba(255, 255, 255, 0.78);
      font-size: 14px;
    }
    .newsletter form {
      display: flex;
      min-width: 360px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.4);
    }
    .newsletter input {
      flex: 1;
      border: 0;
      background: transparent;
      color: white;
      padding: 12px 4px;
      outline: 0;
      font-size: 14px;
    }
    .newsletter input::placeholder {
      color: rgba(255, 255, 255, 0.55);
    }
    .newsletter button {
      border: 0;
      background: transparent;
      color: white;
      font-weight: 700;
      cursor: pointer;
      font-size: 14px;
    }

    /* Reviews */
    .store-reviews {
      padding: 75px 0;
    }
    .store-reviews h2 {
      margin: 0 0 26px;
      color: var(--store-primary);
      font: 700 34px 'Fraunces', Georgia, serif;
    }
    .review-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 20px;
    }
    .review-grid article {
      padding: 22px;
      border: 1px solid #ebe8e1;
      border-radius: 16px;
      background: #faf8f5;
    }
    .review-grid strong {
      display: block;
      margin: 10px 0 6px;
      font-size: 14px;
    }
    .review-grid p {
      margin: 0;
      color: #5d635c;
      font-size: 13px;
      line-height: 1.6;
    }
    .review-grid small {
      display: block;
      margin-top: 12px;
      color: #8a8f88;
      font-size: 11px;
    }

    /* ABOUT SUBPAGE STYLES */
    .about-hero {
      background-size: cover;
      background-position: center;
      background-color: var(--store-primary);
      color: white;
      padding: 80px 0;
      text-align: center;
    }
    .about-hero-inner {
      max-width: 820px;
      margin: auto;
    }
    .about-hero h1 {
      margin: 0 0 16px;
      font: 700 clamp(36px, 5.5vw, 62px)/1.08 'Fraunces', Georgia, serif;
      color: white;
    }
    .about-hero .hero-sub {
      color: rgba(255, 255, 255, 0.9);
      font-size: 18px;
      line-height: 1.65;
      margin: 0;
    }
    .story-block {
      padding: 85px 0 60px;
    }
    .story-grid {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 50px;
      align-items: center;
    }
    .section-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      color: var(--store-accent);
      letter-spacing: 0.16em;
      margin-bottom: 8px;
    }
    .story-copy h2 {
      margin: 0 0 20px;
      color: var(--store-primary);
      font: 700 36px 'Fraunces', Georgia, serif;
    }
    .story-text p {
      font-size: 16px;
      line-height: 1.8;
      color: #555d55;
      margin: 0 0 16px;
    }
    .location-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 30px;
      background: #f7f5ef;
      font-size: 13px;
      color: #3b423b;
      margin-top: 10px;
    }
    .story-media {
      position: relative;
    }
    .story-img {
      width: 100%;
      height: 420px;
      object-fit: cover;
      border-radius: 20px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
    }
    .quote-card {
      position: absolute;
      bottom: -25px;
      right: 20px;
      max-width: 320px;
      background: white;
      padding: 18px 22px;
      border-radius: 16px;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.14);
      border-left: 4px solid var(--store-accent);
    }
    .quote-card p {
      margin: 0 0 6px;
      font-size: 13px;
      font-style: italic;
      color: #333a33;
      line-height: 1.5;
    }
    .quote-card small {
      font-size: 11px;
      font-weight: 700;
      color: #777e77;
    }
    .values-section {
      background: #fbfaf8;
      border-top: 1px solid #ebe8e1;
      border-bottom: 1px solid #ebe8e1;
      padding: 70px 0;
    }
    .values-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 30px;
    }
    .value-item {
      text-align: center;
      padding: 24px;
    }
    .value-icon {
      font-size: 32px;
      display: block;
      margin-bottom: 14px;
    }
    .value-item h3 {
      margin: 0 0 10px;
      color: var(--store-primary);
      font-size: 20px;
    }
    .value-item p {
      margin: 0;
      color: #636b63;
      font-size: 14px;
      line-height: 1.6;
    }
    .cta-banner {
      text-align: center;
      padding: 85px 20px;
      max-width: 700px;
      margin: auto;
    }
    .cta-banner h2 {
      margin: 0 0 12px;
      color: var(--store-primary);
      font: 700 36px 'Fraunces', Georgia, serif;
    }
    .cta-banner p {
      margin: 0 0 26px;
      color: #636b63;
      font-size: 16px;
    }

    /* CONTACT SUBPAGE STYLES */
    .contact-hero {
      padding: 65px 0 40px;
      text-align: center;
      background: #fbfaf8;
      border-bottom: 1px solid #ebe8e1;
    }
    .contact-hero h1 {
      margin: 0 0 12px;
      color: var(--store-primary);
      font: 700 44px 'Fraunces', Georgia, serif;
    }
    .contact-hero .hero-sub {
      color: #636b63;
      font-size: 16px;
      max-width: 620px;
      margin: auto;
    }
    .contact-container {
      padding: 65px 0 90px;
    }
    .contact-grid {
      display: grid;
      grid-template-columns: 1fr 1.25fr;
      gap: 50px;
    }
    .contact-info-col h3 {
      margin: 0 0 10px;
      font: 700 24px 'Fraunces', Georgia, serif;
      color: var(--store-primary);
    }
    .col-lead {
      color: #636b63;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 30px;
    }
    .info-list {
      display: grid;
      gap: 22px;
    }
    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .info-item .icon {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: #f4f2ec;
      font-size: 18px;
      flex-shrink: 0;
    }
    .info-item strong {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #7a827a;
      margin-bottom: 4px;
    }
    .info-item p, .info-item a {
      margin: 0;
      color: #222822;
      font-size: 14px;
      text-decoration: none;
    }
    .info-item a:hover {
      color: var(--store-primary);
      text-decoration: underline;
    }
    .trust-pill-box {
      margin-top: 35px;
      padding: 18px;
      background: #f8f6f0;
      border-radius: 16px;
      display: grid;
      gap: 8px;
      font-size: 12px;
      color: #4a524a;
      font-weight: 600;
    }
    .form-card {
      background: white;
      border: 1px solid #ebe8e1;
      border-radius: 20px;
      padding: 35px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
    }
    .form-card h3 {
      margin: 0 0 6px;
      color: var(--store-primary);
      font: 700 24px 'Fraunces', Georgia, serif;
    }
    .form-card p {
      margin: 0 0 24px;
      color: #636b63;
      font-size: 13px;
    }
    .form-field {
      margin-bottom: 18px;
    }
    .form-field label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: #3b423b;
      margin-bottom: 6px;
    }
    .form-field input, .form-field textarea {
      width: 100%;
      border: 1px solid #dcd8cf;
      border-radius: 10px;
      padding: 11px 14px;
      font-size: 14px;
      background: #fcfbf9;
      color: #191b18;
      box-sizing: border-box;
      font-family: inherit;
    }
    .form-field input:focus, .form-field textarea:focus {
      outline: 0;
      border-color: var(--store-primary);
      background: white;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--store-primary) 15%, transparent);
    }
    .submit-btn {
      width: 100%;
      padding: 13px;
      border-radius: 12px;
      border: 0;
      background: var(--store-primary);
      color: white;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
    }
    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .contact-success {
      text-align: center;
      padding: 40px 10px;
    }
    .contact-success .check {
      display: grid;
      place-items: center;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #dcfce7;
      color: #15803d;
      font-size: 22px;
      margin: 0 auto 16px;
      font-weight: 800;
    }
    .contact-success h4 {
      margin: 0 0 8px;
      font-size: 18px;
      color: var(--store-primary);
    }
    .contact-success p {
      color: #636b63;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .btn-resend {
      background: none;
      border: 1px solid #dcd8cf;
      padding: 8px 18px;
      border-radius: 20px;
      font-size: 12px;
      cursor: pointer;
    }
    .form-error {
      color: #dc2626;
      font-size: 12px;
      margin-bottom: 14px;
    }

    /* SHOP SUBPAGE STYLES */
    .shop-view {
      padding: 55px 0 90px;
    }
    .shop-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 35px;
      border-bottom: 1px solid #ebe8e1;
      padding-bottom: 24px;
    }
    .shop-head h1 {
      margin: 0 0 6px;
      color: var(--store-primary);
      font: 700 38px 'Fraunces', Georgia, serif;
    }
    .shop-head .sub {
      margin: 0;
      color: #636b63;
      font-size: 15px;
    }
    .count-tag {
      font-size: 13px;
      color: #777e77;
      font-weight: 600;
    }

    /* FOOTER */
    footer {
      background: #141714;
      color: white;
      padding-top: 65px;
      border-top: 1px solid #232723;
      margin-top: auto;
    }
    footer .wrap {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 45px;
    }
    footer b {
      font: 700 22px 'Fraunces', Georgia, serif;
      color: white;
      display: block;
      margin-bottom: 10px;
    }
    footer strong {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      margin-bottom: 14px;
      color: rgba(255, 255, 255, 0.45);
    }
    footer p, footer a {
      display: block;
      max-width: 360px;
      margin: 8px 0;
      color: rgba(255, 255, 255, 0.65);
      font-size: 13px;
      line-height: 1.6;
      text-decoration: none;
      cursor: pointer;
    }
    footer a:hover {
      color: white;
    }
    .foot-badge-wrap {
      margin-top: 18px;
    }
    .market-pill-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.75) !important;
      font-size: 11px;
      font-weight: 600;
      text-decoration: none !important;
      transition: background 0.15s;
    }
    .market-pill-badge:hover {
      background: rgba(255, 255, 255, 0.15);
      color: white !important;
    }
    .foot-bottom {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: 50px;
      padding-top: 20px;
      padding-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.45);
    }
    .market-brand-link {
      color: rgba(255, 255, 255, 0.65) !important;
      text-decoration: underline !important;
    }

    /* Loading */
    .loading {
      display: grid;
      place-items: center;
      min-height: 480px;
      gap: 12px;
      color: #666;
    }
    .loading span {
      width: 38px;
      height: 38px;
      border: 3px solid #ddd;
      border-top-color: #1f4b3a;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 900px) {
      .split-hero {
        grid-template-columns: 1fr;
        padding: 50px 0;
        gap: 30px;
      }
      .production-grid, .story-grid, .contact-grid {
        grid-template-columns: 1fr;
      }
      .gallery-grid, .values-grid {
        grid-template-columns: 1fr 1fr;
      }
      .contact-card-box {
        flex-direction: column;
        align-items: flex-start;
      }
      footer .wrap {
        grid-template-columns: 1fr;
        gap: 30px;
      }
    }
    @media (max-width: 768px) {
      .store-nav nav.nav-links, .nav-actions .auth-btns, .nav-actions .who-meta {
        display: none;
      }
      .mobile-toggle {
        display: flex;
      }
      .gallery-grid, .values-grid {
        grid-template-columns: 1fr;
      }
      .newsletter form {
        min-width: 100%;
      }
      .section-head {
        flex-direction: column;
        align-items: flex-start;
      }
      .banner-inner {
        padding: 50px 20px;
      }
    }
  `],
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
      if (page === 'about' || page === 'contact' || page === 'shop' || page === 'home') {
        this.activePage.set(page as StorePageTab);
      }
    });

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
