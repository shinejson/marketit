import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

type DevicePreview = 'desktop' | 'tablet' | 'mobile';

interface FaqItem {
  q: string;
  a: string;
  open: boolean;
}

@Component({
  selector: 'app-saas-landing',
  imports: [RouterLink],
  template: `
    <div class="saas-page">
      <!-- 21-SECTION SAAS PLATFORM LANDING PAGE (landingPage.md) -->

      <!-- TOPNAV: Dedicated SaaS Platform Navigation -->
      <header class="saas-nav wrap">
        <div class="nav-left">
          <a routerLink="/platform" class="brand serif">
            MarketHub <span class="brand-badge">SaaS Platform</span>
          </a>
          <span class="nav-tagline">Build. Customize. Sell. Grow.</span>
        </div>
        <nav class="nav-links">
          <a href="#overview">Overview</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#builder">Page Builder</a>
          <a href="#templates">Templates</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div class="nav-actions">
          <a routerLink="/" class="btn-ghost-sm" title="Browse customer market square">← Market Square</a>
          @if (!auth.isLoggedIn()) {
            <a routerLink="/login" [queryParams]="{ returnUrl: '/platform' }" class="btn-ghost-sm">Log in</a>
            <a [routerLink]="createStoreTarget()" class="btn-primary-sm">Create Store →</a>
          } @else {
            <a [routerLink]="createStoreTarget()" class="btn-primary-sm">Open Workspace →</a>
          }
        </div>
      </header>

      <!-- SECTION 1: HERO SECTION -->
      <section class="hero-section" id="overview">
        <div class="wrap hero-grid">
          <div class="hero-copy">
            <span class="hero-badge">✦ ALL-IN-ONE STORE ENGINE &amp; BUILDER</span>
            <h1>Build Your Online Store. <em>Your Way.</em></h1>
            <p class="hero-desc">
              Create a professional online store, customize every part of your website with our powerful visual page builder, choose from professionally designed templates, and manage your entire business from one place.
            </p>
            <p class="hero-subdesc">
              Whether you're starting a small business or growing an established brand, MarketHub gives you everything you need to build your online presence and start selling.
            </p>
            <div class="hero-cta-group">
              <a [routerLink]="createStoreTarget()" class="btn-primary-lg">
                Create Your Store <span aria-hidden="true">→</span>
              </a>
              <a href="#templates" class="btn-secondary-lg">
                Explore Templates <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div class="hero-trust-ticks">
              <span><b>✓</b> No coding required</span>
              <span><b>✓</b> Beautiful responsive designs</span>
              <span><b>✓</b> Powerful store management</span>
              <span><b>✓</b> Built for growing businesses</span>
            </div>
          </div>

          <!-- Interactive Live Builder Mockup -->
          <div class="hero-visual">
            <div class="visual-studio-card">
              <div class="studio-header">
                <div class="studio-dots"><i></i><i></i><i></i></div>
                <span class="studio-title">STOREFRONT STUDIO · LIVE EDITOR</span>
                <div class="studio-device-pills">
                  <button type="button" [class.active]="previewDevice() === 'desktop'" (click)="previewDevice.set('desktop')">Desktop</button>
                  <button type="button" [class.active]="previewDevice() === 'tablet'" (click)="previewDevice.set('tablet')">Tablet</button>
                  <button type="button" [class.active]="previewDevice() === 'mobile'" (click)="previewDevice.set('mobile')">Mobile</button>
                </div>
              </div>

              <div class="mockup-canvas" [class.is-tablet]="previewDevice() === 'tablet'" [class.is-mobile]="previewDevice() === 'mobile'" [style.--preview-brand]="activePalette().primary" [style.--preview-accent]="activePalette().accent">
                <header class="mockup-nav">
                  <b>AURORA STUDIO</b>
                  <div class="mockup-links"><span>Home</span><span>Shop</span><span>Story</span><span>Contact</span></div>
                  <i>Bag (2)</i>
                </header>
                <div class="mockup-hero">
                  <div class="mock-hero-text">
                    <small>AUTUMN CAPSULE 2026</small>
                    <h3>Thoughtfully crafted for daily living.</h3>
                    <button type="button">Explore collection →</button>
                  </div>
                  <div class="mock-hero-image">
                    <span class="floating-builder-tag">✦ Visual Block: Hero</span>
                  </div>
                </div>
                <div class="mockup-products">
                  <div class="mock-product"><div></div><strong>Studio Ceramic</strong><small>GH₵ 180</small></div>
                  <div class="mock-product"><div></div><strong>Linen Wrap</strong><small>GH₵ 240</small></div>
                  @if (previewDevice() === 'desktop') {
                    <div class="mock-product"><div></div><strong>Walnut Tray</strong><small>GH₵ 150</small></div>
                  }
                </div>
              </div>

              <!-- Live Color Palette Selector inside hero mockup -->
              <div class="studio-footer-controls">
                <span>Select Brand Palette:</span>
                <div class="palette-swatches">
                  @for (p of palettes; track p.name) {
                    <button type="button" [class.selected]="selectedPaletteName() === p.name" (click)="selectedPaletteName.set(p.name)" [title]="p.name" [style.background]="p.primary"></button>
                  }
                </div>
                <span class="live-pill">● Real-time CSS tokens</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SECTION 2: EVERYTHING YOU NEED TO BUILD AND GROW ONLINE -->
      <section class="section-pillars wrap">
        <div class="section-header text-center">
          <p class="eyebrow">ONE PLATFORM · COMPLETE FREEDOM</p>
          <h2>Everything You Need to Build and Grow Online</h2>
          <p class="section-lede">
            MarketHub brings your store, website builder, products, customers, orders and business tools together in one powerful platform.
          </p>
        </div>
        <div class="pillar-grid">
          <div class="pillar-card">
            <div class="pillar-icon">🏪</div>
            <h3>Create Your Store</h3>
            <p>Launch a professional online store without having to build everything from scratch.</p>
          </div>
          <div class="pillar-card">
            <div class="pillar-icon">🎨</div>
            <h3>Design Your Way</h3>
            <p>Use our drag-and-drop page builder to create pages that match your brand.</p>
          </div>
          <div class="pillar-card">
            <div class="pillar-icon">📦</div>
            <h3>Sell Anything</h3>
            <p>Add products, organize categories, manage inventory and accept customer orders.</p>
          </div>
          <div class="pillar-card">
            <div class="pillar-icon">📈</div>
            <h3>Grow Your Business</h3>
            <p>Get the tools and insights you need to understand your customers and grow your business.</p>
          </div>
        </div>
      </section>

      <!-- SECTION 3: HOW MARKETHUB WORKS (6 STEPS) -->
      <section class="section-steps-bg" id="how-it-works">
        <div class="wrap">
          <div class="section-header text-center">
            <p class="eyebrow">SIMPLE ONBOARDING</p>
            <h2>How MarketHub Works</h2>
            <p class="section-subtitle">From Idea to Online Store in Simple Steps</p>
          </div>
          <div class="steps-grid">
            <div class="step-card">
              <span class="step-num">01</span>
              <h3>Create Your Account</h3>
              <p>Sign up for MarketHub and create your business account in just a few steps.</p>
            </div>
            <div class="step-card">
              <span class="step-num">02</span>
              <h3>Create Your Store</h3>
              <p>Give your store a name, choose your business category and set up your online storefront.</p>
            </div>
            <div class="step-card">
              <span class="step-num">03</span>
              <h3>Choose a Design</h3>
              <p>Start from scratch or select a professionally designed template from the MarketHub Template Marketplace.</p>
            </div>
            <div class="step-card">
              <span class="step-num">04</span>
              <h3>Customize Your Store</h3>
              <p>Use the visual drag-and-drop builder to change sections, colors, fonts, images, buttons and layouts.</p>
            </div>
            <div class="step-card">
              <span class="step-num">05</span>
              <h3>Add Your Products</h3>
              <p>Add your products, prices, images, descriptions, categories and inventory.</p>
            </div>
            <div class="step-card">
              <span class="step-num">06</span>
              <h3>Start Selling</h3>
              <p>Publish your store and start welcoming customers.</p>
            </div>
          </div>
          <div class="steps-cta text-center">
            <a [routerLink]="createStoreTarget()" class="btn-primary-lg">Create My Store →</a>
          </div>
        </div>
      </section>

      <!-- SECTION 4: DESIGN YOUR STORE WITHOUT CODING (PAGE BUILDER SHOWCASE) -->
      <section class="section-builder wrap" id="builder">
        <div class="section-header text-center">
          <p class="eyebrow">ELEMENTOR-STYLE FREEDOM</p>
          <h2>Design Your Store Without Coding</h2>
          <p class="section-subtitle">Powerful Page Builder. Complete Creative Freedom.</p>
          <p class="section-lede">
            Your store should look like your brand. With the MarketHub visual page builder, you can create and customize beautiful pages without writing complicated code.
          </p>
        </div>
        <div class="builder-feature-grid">
          <div class="b-feat-card">
            <div class="b-icon">⠿</div>
            <h3>Drag &amp; Drop</h3>
            <p>Build pages by adding, moving and arranging elements exactly where you want them.</p>
          </div>
          <div class="b-feat-card">
            <div class="b-icon">📱</div>
            <h3>Responsive Design</h3>
            <p>Create experiences that look great on desktops, tablets and mobile phones.</p>
          </div>
          <div class="b-feat-card">
            <div class="b-icon">▤</div>
            <h3>Sections &amp; Containers</h3>
            <p>Build professional layouts using flexible sections, containers and columns.</p>
          </div>
          <div class="b-feat-card">
            <div class="b-icon">✦</div>
            <h3>Global Styles</h3>
            <p>Set your brand colors, typography, buttons and other design elements from one place.</p>
          </div>
          <div class="b-feat-card">
            <div class="b-icon">▦</div>
            <h3>Ecommerce Widgets</h3>
            <p>Add products, product grids, categories, shopping features and other store components directly to your pages.</p>
          </div>
          <div class="b-feat-card">
            <div class="b-icon">↗</div>
            <h3>Live Preview</h3>
            <p>See your changes as you make them before publishing your page.</p>
          </div>
        </div>
        <div class="builder-banner-cta">
          <div>
            <h3>Ready to see the visual studio in action?</h3>
            <p>Explore pre-built templates or install one directly onto your store.</p>
          </div>
          <a [routerLink]="templatesTarget()" class="btn-accent">Explore the Page Builder →</a>
        </div>
      </section>

      <!-- SECTION 5: START WITH A DESIGN YOU LOVE (PROFESSIONAL TEMPLATES) -->
      <section class="section-templates-bg" id="templates">
        <div class="wrap">
          <div class="section-header text-center">
            <p class="eyebrow">READY-TO-USE LAYOUTS</p>
            <h2>Start With a Design You Love</h2>
            <p class="section-subtitle">Professional Templates for Every Business</p>
            <p class="section-lede">
              You don't have to start from a blank page. Explore professionally designed MarketHub templates created for different industries and business types.
            </p>
          </div>

          <div class="template-categories-grid">
            <div class="tmpl-card tone-fashion">
              <div class="tmpl-art">
                <span class="tmpl-chip">✦ GH₵ 50</span>
                <div class="tmpl-mockup-inner">
                  <small>FASHION &amp; APPAREL</small>
                  <h4>Maison Atelier</h4>
                  <p>Editorial typography, high-impact lookbooks, seamless bag drawer.</p>
                </div>
              </div>
              <div class="tmpl-copy">
                <h3>Fashion</h3>
                <p>Modern layouts designed for clothing, shoes, accessories and fashion brands.</p>
              </div>
            </div>

            <div class="tmpl-card tone-tech">
              <div class="tmpl-art">
                <span class="tmpl-chip">✦ GH₵ 70</span>
                <div class="tmpl-mockup-inner">
                  <small>ELECTRONICS &amp; HARDWARE</small>
                  <h4>Neon Pulse</h4>
                  <p>Spec comparison matrices, badge highlights, high-density catalogs.</p>
                </div>
              </div>
              <div class="tmpl-copy">
                <h3>Electronics</h3>
                <p>Clean and professional storefronts for phones, computers, gadgets and electronics.</p>
              </div>
            </div>

            <div class="tmpl-card tone-dining">
              <div class="tmpl-art">
                <span class="tmpl-chip">✦ GH₵ 60</span>
                <div class="tmpl-mockup-inner">
                  <small>FOOD &amp; BEVERAGE</small>
                  <h4>The Market Kitchen</h4>
                  <p>Daily menus, chef's specials, dietary tags, pickup &amp; delivery.</p>
                </div>
              </div>
              <div class="tmpl-copy">
                <h3>Restaurant</h3>
                <p>Beautiful layouts for restaurants, food businesses, cafes and catering services.</p>
              </div>
            </div>

            <div class="tmpl-card tone-beauty">
              <div class="tmpl-art">
                <span class="tmpl-chip">✦ GH₵ 50</span>
                <div class="tmpl-mockup-inner">
                  <small>BEAUTY &amp; WELLNESS</small>
                  <h4>Velvet Glow</h4>
                  <p>Ingredient spotlights, before/after galleries, skin regimen bundles.</p>
                </div>
              </div>
              <div class="tmpl-copy">
                <h3>Beauty</h3>
                <p>Elegant storefronts for beauty products, cosmetics, salons and personal-care brands.</p>
              </div>
            </div>

            <div class="tmpl-card tone-grocery">
              <div class="tmpl-art">
                <span class="tmpl-chip">✦ GH₵ 60</span>
                <div class="tmpl-mockup-inner">
                  <small>SUPERMARKET &amp; FRESH</small>
                  <h4>Fresh Harvest</h4>
                  <p>Multi-aisle quick add, weight pricing, fast category switching.</p>
                </div>
              </div>
              <div class="tmpl-copy">
                <h3>Grocery</h3>
                <p>Practical layouts for supermarkets, grocery stores and food retailers.</p>
              </div>
            </div>

            <div class="tmpl-card tone-home">
              <div class="tmpl-art">
                <span class="tmpl-chip">✦ GH₵ 75</span>
                <div class="tmpl-mockup-inner">
                  <small>HOME &amp; LIVING</small>
                  <h4>Botanica Living</h4>
                  <p>Room showcases, craftsmanship stories, dimensional product specs.</p>
                </div>
              </div>
              <div class="tmpl-copy">
                <h3>Furniture</h3>
                <p>Modern designs for furniture, home décor and interior businesses.</p>
              </div>
            </div>
          </div>

          <div class="templates-footer-note text-center">
            <p><strong>✦ More Templates Coming</strong> — Our template marketplace is continuously growing with new designs and layouts.</p>
            <a [routerLink]="templatesTarget()" class="btn-primary-lg">Browse All Templates →</a>
          </div>
        </div>
      </section>

      <!-- SECTION 6: PREMIUM TEMPLATES MARKETPLACE -->
      <section class="section-premium wrap">
        <div class="premium-box">
          <div class="premium-copy">
            <p class="eyebrow">BUY · CUSTOMIZE · MAKE IT YOURS</p>
            <h2>Premium Templates Marketplace</h2>
            <p class="section-lede">
              Found a design you love? Purchase a premium template and customize it to fit your business. Your template becomes the foundation for your unique online store.
            </p>
            <div class="customize-list-wrap">
              <p><strong>Customize everything without breaking the master layout:</strong></p>
              <div class="tags-cloud">
                <span>✓ Logo</span>
                <span>✓ Colors</span>
                <span>✓ Fonts</span>
                <span>✓ Images</span>
                <span>✓ Text</span>
                <span>✓ Sections</span>
                <span>✓ Product displays</span>
                <span>✓ Navigation</span>
                <span>✓ Footer</span>
                <span>✓ Layout</span>
              </div>
            </div>
            <div class="premium-actions">
              <a [routerLink]="templatesTarget()" class="btn-primary-lg">Explore Premium Templates →</a>
            </div>
          </div>
          <div class="premium-features-list">
            <div class="p-feat">
              <span class="p-check">✓</span>
              <div>
                <h4>Live Preview</h4>
                <p>See how a template looks on desktop, tablet and mobile before purchasing.</p>
              </div>
            </div>
            <div class="p-feat">
              <span class="p-check">✓</span>
              <div>
                <h4>One-Time Purchase Options</h4>
                <p>Purchase selected templates once and use them with lifetime licensing for your store.</p>
              </div>
            </div>
            <div class="p-feat">
              <span class="p-check">✓</span>
              <div>
                <h4>Regularly Updated Designs</h4>
                <p>Discover new designs, seasonal variants and layout improvements as the marketplace grows.</p>
              </div>
            </div>
            <div class="p-feat">
              <span class="p-check">✓</span>
              <div>
                <h4>Easy Customization</h4>
                <p>Modify your purchased template using the visual MarketHub Page Builder without affecting the master copy.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SECTION 7: BUILT FOR EVERY KIND OF BUSINESS (8 INDUSTRIES) -->
      <section class="section-industries wrap" id="industries">
        <div class="section-header text-center">
          <p class="eyebrow">VERSATILE COMMERCE</p>
          <h2>Built for Every Kind of Business</h2>
          <p class="section-subtitle">Whatever You Sell, MarketHub Helps You Sell It Online.</p>
          <p class="section-lede">MarketHub is designed to support businesses across different industries.</p>
        </div>
        <div class="industries-grid">
          <div class="ind-card"><span>👗</span><h4>Fashion &amp; Clothing</h4><p>Sell clothes, shoes, bags, accessories and more.</p></div>
          <div class="ind-card"><span>💻</span><h4>Electronics</h4><p>Sell phones, computers, gadgets, appliances and technology products.</p></div>
          <div class="ind-card"><span>🍽</span><h4>Food &amp; Restaurants</h4><p>Promote food, menus, meals, drinks and catering services.</p></div>
          <div class="ind-card"><span>💄</span><h4>Beauty &amp; Cosmetics</h4><p>Sell cosmetics, skincare, hair products and beauty accessories.</p></div>
          <div class="ind-card"><span>🛒</span><h4>Grocery &amp; Supermarkets</h4><p>Manage products across multiple categories and sell everyday essentials.</p></div>
          <div class="ind-card"><span>🛋</span><h4>Furniture &amp; Home</h4><p>Showcase furniture, home décor and interior products.</p></div>
          <div class="ind-card"><span>📚</span><h4>Books &amp; Education</h4><p>Sell books, learning materials and educational products.</p></div>
          <div class="ind-card"><span>💼</span><h4>Services</h4><p>Create an online presence for businesses that provide professional services.</p></div>
        </div>
      </section>

      <!-- SECTION 8: EVERYTHING YOU NEED TO RUN YOUR STORE (OPERATIONS SUITE) -->
      <section class="section-ops-bg" id="operations">
        <div class="wrap">
          <div class="section-header text-center">
            <p class="eyebrow">CENTRALIZED MANAGEMENT</p>
            <h2>Everything You Need to Run Your Store</h2>
            <p class="section-subtitle">Your Business. One Powerful Dashboard.</p>
            <p class="section-lede">MarketHub gives you centralized tools to manage your online business.</p>
          </div>
          <div class="ops-grid">
            <div class="op-card">
              <span class="op-icon">🏷</span>
              <h4>Product Management</h4>
              <p>Create, edit and organize products with images, descriptions, pricing, categories and variations.</p>
            </div>
            <div class="op-card">
              <span class="op-icon">📊</span>
              <h4>Inventory Management</h4>
              <p>Keep track of your available stock and manage your inventory more efficiently.</p>
            </div>
            <div class="op-card">
              <span class="op-icon">📦</span>
              <h4>Order Management</h4>
              <p>View, process and manage customer orders from one unified dashboard.</p>
            </div>
            <div class="op-card">
              <span class="op-icon">👥</span>
              <h4>Customer Management</h4>
              <p>Keep your customer information organized, reachable and accessible.</p>
            </div>
            <div class="op-card">
              <span class="op-icon">🗂</span>
              <h4>Categories</h4>
              <p>Create and organize product categories to make your store easier to navigate.</p>
            </div>
            <div class="op-card">
              <span class="op-icon">⚙</span>
              <h4>Store Management</h4>
              <p>Manage your store settings, branding, pages, navigation and storefront features.</p>
            </div>
            <div class="op-card">
              <span class="op-icon">💳</span>
              <h4>Payments</h4>
              <p>Connect your preferred payment methods and manage transactions through your store.</p>
            </div>
            <div class="op-card">
              <span class="op-icon">📈</span>
              <h4>Analytics</h4>
              <p>Monitor important business metrics and understand how your store is performing.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- SECTION 9: YOUR STORE. YOUR BRAND. -->
      <section class="section-brand wrap">
        <div class="section-header text-center">
          <p class="eyebrow">BRAND FREEDOM</p>
          <h2>Your Store. Your Brand.</h2>
          <p class="section-subtitle">Build a Store That Looks Like You.</p>
          <p class="section-lede">
            Your online store shouldn't look like everyone else's. MarketHub gives you complete control over your brand identity.
          </p>
        </div>
        <div class="brand-tokens-grid">
          <div class="token-card"><b>Logo</b><p>Display your brand everywhere customers interact with your store.</p></div>
          <div class="token-card"><b>Colors</b><p>Create a consistent color scheme that represents your business.</p></div>
          <div class="token-card"><b>Typography</b><p>Choose fonts that match your brand and improve readability.</p></div>
          <div class="token-card"><b>Images</b><p>Use your own product and promotional images throughout your website.</p></div>
          <div class="token-card"><b>Pages</b><p>Create landing pages, promotional pages, information pages and more.</p></div>
          <div class="token-card"><b>Navigation</b><p>Build menus that make it easy for customers to find what they need.</p></div>
        </div>
      </section>

      <!-- SECTION 10: BEAUTIFUL ON EVERY SCREEN (RESPONSIVE DEVICES) -->
      <section class="section-responsive-bg">
        <div class="wrap">
          <div class="section-header text-center">
            <p class="eyebrow">RESPONSIVE DESIGN</p>
            <h2>Beautiful on Every Screen</h2>
            <p class="section-subtitle">Your Store Goes Everywhere Your Customers Go.</p>
            <p class="section-lede">
              Customers shop from phones, tablets and computers. MarketHub helps you create responsive storefronts that adapt to different screen sizes.
            </p>
          </div>
          <div class="device-demo-box">
            <div class="device-tabs">
              <button type="button" [class.active]="screenTab() === 'desktop'" (click)="screenTab.set('desktop')">🖥 Desktop Experience</button>
              <button type="button" [class.active]="screenTab() === 'tablet'" (click)="screenTab.set('tablet')">📱 Tablet Browsing</button>
              <button type="button" [class.active]="screenTab() === 'mobile'" (click)="screenTab.set('mobile')">📱 Mobile-First Commerce</button>
            </div>
            <div class="device-description">
              @if (screenTab() === 'desktop') {
                <p><strong>Desktop:</strong> Give customers a complete shopping experience on larger screens with expansive hero layouts and 4-column product grids.</p>
              } @else if (screenTab() === 'tablet') {
                <p><strong>Tablet:</strong> Make browsing comfortable and easy on medium-sized devices with balanced touch navigation and fluid spacing.</p>
              } @else {
                <p><strong>Mobile:</strong> Give mobile customers a fast, clean and easy-to-use storefront optimized for thumbs, speed and simple checkout.</p>
              }
              <span class="device-mantra">✦ One store. Every screen.</span>
            </div>
          </div>
        </div>
      </section>

      <!-- SECTION 11: POWERFUL ECOMMERCE FEATURES (20-ITEM CHECKLIST) -->
      <section class="section-features wrap" id="features">
        <div class="section-header text-center">
          <p class="eyebrow">COMPLETE FEATURE SET</p>
          <h2>Powerful Ecommerce Features</h2>
          <p class="section-subtitle">Everything You Need to Sell Online</p>
          <p class="section-lede">MarketHub brings essential ecommerce tools together in one platform.</p>
        </div>
        <div class="checklist-grid">
          @for (f of ecommerceFeatures; track f) {
            <div class="chk-item">
              <span class="chk-icon">✓</span>
              <span>{{ f }}</span>
            </div>
          }
        </div>
        <p class="checklist-footer-note text-center">...And we're continuously adding more.</p>
      </section>

      <!-- SECTION 12: CREATE MORE THAN A STORE (MULTI-PAGE SUITE) -->
      <section class="section-multipage wrap">
        <div class="section-header text-center">
          <p class="eyebrow">BEYOND THE CATALOG</p>
          <h2>Create More Than a Store</h2>
          <p class="section-subtitle">Build a Complete Online Presence.</p>
          <p class="section-lede">
            MarketHub isn't limited to your product catalog. Create additional pages for your business, including:
          </p>
        </div>
        <div class="pages-grid">
          <div class="p-type-card"><b>Home</b><p>Introduce your business and showcase your products.</p></div>
          <div class="p-type-card"><b>About Us</b><p>Tell customers who you are and what your business stands for.</p></div>
          <div class="p-type-card"><b>Contact</b><p>Give customers an easy way to get in touch with your business.</p></div>
          <div class="p-type-card"><b>Landing Pages</b><p>Create focused pages for campaigns, promotions and special offers.</p></div>
          <div class="p-type-card"><b>Product Pages</b><p>Showcase your products with detailed information and compelling visuals.</p></div>
          <div class="p-type-card"><b>Category Pages</b><p>Organize products and help customers discover what they're looking for.</p></div>
          <div class="p-type-card"><b>Custom Pages</b><p>Build any additional page your business needs using the Page Builder.</p></div>
        </div>
      </section>

      <!-- SECTION 13: GROW FROM ONE STORE TO MORE -->
      <section class="section-grow-bg">
        <div class="wrap">
          <div class="grow-box text-center">
            <p class="eyebrow">MULTI-TENANT ARCHITECTURE</p>
            <h2>Grow From One Store to More</h2>
            <p class="section-subtitle">Built for Businesses With Bigger Ambitions.</p>
            <p class="section-lede">
              Start with one store and expand as your business grows. MarketHub can evolve with your business, giving you the flexibility to manage additional stores and business operations as your needs increase.
            </p>
            <div class="grow-mantra">
              <strong>Start small. Build smart. Grow without limits.</strong>
            </div>
          </div>
        </div>
      </section>

      <!-- SECTION 14 & 15: CUSTOMER AUDIENCES & SIMPLE/FLEXIBLE/POWERFUL -->
      <section class="section-audiences wrap">
        <div class="section-header text-center">
          <p class="eyebrow">DESIGNED FOR YOU</p>
          <h2>Simple. Flexible. Powerful.</h2>
          <p class="section-subtitle">Choose the Tools Your Business Needs.</p>
          <p class="section-lede">
            MarketHub is designed to grow with you. Whether you need a simple online store or a fully customized ecommerce experience, you can start with what you need and expand as your business grows.
          </p>
        </div>
        <div class="audiences-grid">
          <div class="aud-card">
            <span class="aud-tag">ENTREPRENEURS</span>
            <h3>Turn Your Idea Into a Business</h3>
            <p>
              Have an idea but don't know where to start? MarketHub gives you the tools to establish your online presence, showcase your products and begin building your customer base.
            </p>
            <strong>Start building your store today.</strong>
          </div>
          <div class="aud-card">
            <span class="aud-tag">GROWING BUSINESSES</span>
            <h3>Take Your Business Online</h3>
            <p>
              Already have a physical business? Use MarketHub to create an online sales channel and reach customers beyond your physical location.
            </p>
            <strong>Expand your brand. Reach more customers. Sell online.</strong>
          </div>
          <div class="aud-card">
            <span class="aud-tag">ESTABLISHED BRANDS</span>
            <h3>Build a Store That Matches Your Brand</h3>
            <p>
              Create a professional online experience that reflects your existing business. Customize your storefront, showcase your products and manage your online operations from one central platform.
            </p>
            <strong>No unnecessary complexity. No need to build everything from scratch.</strong>
          </div>
        </div>
      </section>

      <!-- SECTION 16: PRICING PLANS -->
      <section class="section-pricing-bg" id="pricing">
        <div class="wrap">
          <div class="section-header text-center">
            <p class="eyebrow">CLEAR, HONEST PLANS</p>
            <h2>Pricing</h2>
            <p class="section-subtitle">Start Building Without the Complexity</p>
            <p class="section-lede">Choose a plan that fits your business and upgrade as you grow.</p>
          </div>
          <div class="pricing-grid">
            <!-- Starter Plan -->
            <div class="pricing-card">
              <div class="plan-head">
                <span class="plan-name">Starter</span>
                <p class="plan-desc">For individuals and small businesses</p>
                <div class="plan-price"><strong>GH₵ 0</strong><small>/ to start</small></div>
              </div>
              <ul class="plan-features">
                <li><span>✓</span> Store creation</li>
                <li><span>✓</span> Product management</li>
                <li><span>✓</span> Basic store customization</li>
                <li><span>✓</span> Essential ecommerce tools</li>
                <li><span>✓</span> Store dashboard</li>
                <li><span>✓</span> Responsive storefront</li>
              </ul>
              <a [routerLink]="createStoreTarget()" class="btn-plan outline">Get Started</a>
            </div>

            <!-- Professional Plan (Featured) -->
            <div class="pricing-card featured">
              <span class="featured-ribbon">POPULAR CHOICE</span>
              <div class="plan-head">
                <span class="plan-name">Professional</span>
                <p class="plan-desc">For growing businesses</p>
                <div class="plan-price"><strong>GH₵ 80</strong><small>/ month</small></div>
              </div>
              <ul class="plan-features">
                <li><span>✓</span> Everything in Starter</li>
                <li><span>✓</span> <strong>Advanced Page Builder</strong></li>
                <li><span>✓</span> <strong>Premium templates access</strong></li>
                <li><span>✓</span> Advanced brand customization</li>
                <li><span>✓</span> More ecommerce tools &amp; coupons</li>
                <li><span>✓</span> Store analytics &amp; reports</li>
                <li><span>✓</span> Additional business features</li>
              </ul>
              <a [routerLink]="createStoreTarget()" class="btn-plan solid">Start Growing</a>
            </div>

            <!-- Business Plan -->
            <div class="pricing-card">
              <div class="plan-head">
                <span class="plan-name">Business</span>
                <p class="plan-desc">For established businesses</p>
                <div class="plan-price"><strong>GH₵ 180</strong><small>/ month</small></div>
              </div>
              <ul class="plan-features">
                <li><span>✓</span> Everything in Professional</li>
                <li><span>✓</span> <strong>Multiple-store capabilities</strong></li>
                <li><span>✓</span> Advanced business tools &amp; roles</li>
                <li><span>✓</span> Extended analytics &amp; export</li>
                <li><span>✓</span> Extended custom pages</li>
                <li><span>✓</span> Priority support</li>
                <li><span>✓</span> More powerful management features</li>
              </ul>
              <a [routerLink]="createStoreTarget()" class="btn-plan outline">Choose Business</a>
            </div>
          </div>
        </div>
      </section>

      <!-- SECTION 17: TEMPLATE MARKETPLACE PRICING HIGHLIGHT -->
      <section class="section-tmpl-pricing wrap">
        <div class="tmpl-pricing-card">
          <div class="tp-copy">
            <p class="eyebrow">TEMPLATE MARKETPLACE</p>
            <h2>Find the Perfect Starting Point</h2>
            <p class="section-lede">Don't want to build your website from scratch? Explore the MarketHub Template Marketplace.</p>
            <div class="tp-options">
              <div>
                <strong>Free Templates</strong>
                <p>Start with professionally designed templates at no additional cost.</p>
              </div>
              <div>
                <strong>Premium Templates</strong>
                <p>Access advanced designs created for specific industries and business types.</p>
              </div>
              <div>
                <strong>Customizable Templates</strong>
                <p>Change colors, fonts, images, content, sections and layouts to make the design your own.</p>
              </div>
            </div>
          </div>
          <div class="tp-action">
            <a [routerLink]="templatesTarget()" class="btn-primary-lg">Explore Templates →</a>
          </div>
        </div>
      </section>

      <!-- SECTION 18: WHY MARKETHUB? (6 VALUE DRIVERS) -->
      <section class="section-why wrap">
        <div class="section-header text-center">
          <p class="eyebrow">THE MARKETHUB ADVANTAGE</p>
          <h2>Why MarketHub?</h2>
          <p class="section-subtitle">One Platform. Multiple Possibilities.</p>
        </div>
        <div class="why-grid">
          <div class="why-card">
            <h4>Easy to Use</h4>
            <p>You don't need to be a developer to create a professional online store.</p>
          </div>
          <div class="why-card">
            <h4>Flexible</h4>
            <p>Customize your store and build pages around your business needs.</p>
          </div>
          <div class="why-card">
            <h4>Professional</h4>
            <p>Start with modern designs created for real businesses.</p>
          </div>
          <div class="why-card">
            <h4>Scalable</h4>
            <p>Grow your store and expand your capabilities as your business grows.</p>
          </div>
          <div class="why-card">
            <h4>All-in-One</h4>
            <p>Manage your store, products, orders, customers and website from one platform.</p>
          </div>
          <div class="why-card">
            <h4>Continuously Improving</h4>
            <p>New features, templates and improvements are continuously being added.</p>
          </div>
        </div>
      </section>

      <!-- SECTION 19: FREQUENTLY ASKED QUESTIONS (13 ACCORDIONS) -->
      <section class="section-faq-bg" id="faq">
        <div class="wrap">
          <div class="section-header text-center">
            <p class="eyebrow">COMMON QUESTIONS</p>
            <h2>Frequently Asked Questions</h2>
            <p class="section-subtitle">Everything You Need to Know</p>
          </div>
          <div class="faq-list">
            @for (item of faqs(); track item.q; let i = $index) {
              <div class="faq-card" [class.open]="item.open">
                <button type="button" class="faq-question" (click)="toggleFaq(i)" [attr.aria-expanded]="item.open">
                  <span>{{ item.q }}</span>
                  <span class="faq-toggle-icon">{{ item.open ? '−' : '+' }}</span>
                </button>
                @if (item.open) {
                  <div class="faq-answer">
                    <p>{{ item.a }}</p>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </section>

      <!-- SECTION 20: FINAL CALL TO ACTION -->
      <section class="section-final-cta wrap">
        <div class="final-cta-box text-center">
          <p class="eyebrow-light">READY TO BUILD?</p>
          <h2>Your Business Deserves a Better Online Store.</h2>
          <p class="cta-lede">
            Whether you're starting a new business, taking your existing business online or building the next big brand, MarketHub gives you the tools to make it happen.
          </p>
          <div class="cta-pillars">
            <span>✦ Build Your Store.</span>
            <span>✦ Customize Your Brand.</span>
            <span>✦ Sell Your Products.</span>
            <span>✦ Grow Your Business.</span>
          </div>
          <div class="final-btns">
            <a [routerLink]="createStoreTarget()" class="btn-primary-lg">Create Your MarketHub Store →</a>
            <a [routerLink]="templatesTarget()" class="btn-secondary-lg">Explore Templates</a>
          </div>
        </div>
      </section>

      <!-- SECTION 21: SAAS MARKETING FOOTER -->
      <footer class="saas-footer">
        <div class="wrap footer-grid">
          <div class="footer-brand-col">
            <a routerLink="/platform" class="footer-wordmark serif">MarketHub</a>
            <p class="footer-tagline"><strong>Build. Customize. Sell. Grow.</strong></p>
            <p class="footer-desc">An all-in-one platform for creating and growing your online store.</p>
            <div class="social-links">
              <span>Facebook</span> · <span>Instagram</span> · <span>TikTok</span> · <span>LinkedIn</span> · <span>YouTube</span>
            </div>
          </div>
          <div class="footer-col">
            <h4>Platform</h4>
            <ul>
              <li><a href="#builder">Store Builder</a></li>
              <li><a href="#builder">Page Builder</a></li>
              <li><a href="#templates">Templates</a></li>
              <li><a href="#features">Ecommerce</a></li>
              <li><a href="#operations">Product Management</a></li>
              <li><a href="#operations">Order Management</a></li>
              <li><a href="#operations">Analytics</a></li>
              <li><a href="#pricing">Pricing</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Resources</h4>
            <ul>
              <li><a routerLink="/support">Help Center</a></li>
              <li><a routerLink="/support">Documentation</a></li>
              <li><a routerLink="/">Marketplace Blog</a></li>
              <li><a href="#builder">Tutorials</a></li>
              <li><a href="#faq">FAQs</a></li>
              <li><a routerLink="/support">Contact Support</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Company</h4>
            <ul>
              <li><a routerLink="/">About MarketHub</a></li>
              <li><a routerLink="/support">Contact Us</a></li>
              <li><span>Careers</span></li>
              <li><span>Partners</span></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><span>Terms &amp; Conditions</span></li>
              <li><span>Privacy Policy</span></li>
              <li><span>Cookie Policy</span></li>
              <li><span>Refund Policy</span></li>
            </ul>
          </div>
        </div>
        <div class="wrap footer-bottom">
          <p>© 2026 MarketHub. All rights reserved.</p>
          <a routerLink="/" class="back-to-market">Visit Public Market Square →</a>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; background: #fafaf7; color: #1e241f; font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .saas-page { min-height: 100vh; display: flex; flex-direction: column; overflow-x: hidden; }
    .wrap { max-width: 1240px; margin: 0 auto; padding: 0 24px; box-sizing: border-box; width: 100%; }
    .text-center { text-align: center; }

    /* TYPOGRAPHY HELPERS */
    .serif { font-family: 'Fraunces', Georgia, serif; }
    .eyebrow { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.16em; color: #c45c26; margin: 0 0 10px; }
    .eyebrow-light { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.16em; color: #f7a974; margin: 0 0 10px; }
    .section-header { margin-bottom: 50px; }
    .section-header h2 { font-size: clamp(30px, 3.8vw, 46px); color: #183329; margin: 0 0 10px; line-height: 1.12; font-family: 'Fraunces', Georgia, serif; }
    .section-subtitle { font-size: 18px; font-weight: 700; color: #3f5549; margin: 0 0 12px; }
    .section-lede { font-size: 16.5px; color: #5a665e; max-width: 680px; margin: 0 auto; line-height: 1.6; }

    /* BUTTONS */
    .btn-primary-sm { background: #1f4b3a; color: white; padding: 9px 18px; border-radius: 999px; font-size: 13px; font-weight: 700; text-decoration: none; transition: opacity 0.15s; }
    .btn-primary-sm:hover { opacity: 0.9; }
    .btn-ghost-sm { color: #435147; padding: 9px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; text-decoration: none; }
    .btn-ghost-sm:hover { background: rgba(0,0,0,0.04); color: #183329; }
    .btn-primary-lg { background: #1f4b3a; color: white; padding: 14px 28px; border-radius: 999px; font-size: 15px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: transform 0.15s, opacity 0.15s; }
    .btn-primary-lg:hover { opacity: 0.92; transform: translateY(-1px); }
    .btn-secondary-lg { background: white; color: #1f4b3a; border: 1px solid #d4ded7; padding: 14px 26px; border-radius: 999px; font-size: 15px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: background 0.15s; }
    .btn-secondary-lg:hover { background: #f0f4f1; }
    .btn-accent { background: #c45c26; color: white; padding: 12px 24px; border-radius: 999px; font-size: 14px; font-weight: 700; text-decoration: none; }

    /* SAAS TOPNAV */
    .saas-nav { height: 78px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e9eee9; background: #fafaf7; position: sticky; top: 0; z-index: 60; backdrop-filter: blur(8px); }
    .nav-left { display: flex; align-items: center; gap: 14px; }
    .brand { font-size: 22px; font-weight: 800; color: #183329; text-decoration: none; letter-spacing: -0.02em; display: flex; align-items: center; gap: 8px; }
    .brand-badge { font-family: 'Inter', sans-serif; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; background: #e6f0ea; color: #1f4b3a; padding: 3px 8px; border-radius: 12px; }
    .nav-tagline { font-size: 12px; color: #738278; font-weight: 500; }
    .nav-links { display: flex; gap: 18px; }
    .nav-links a { color: #536257; font-size: 13.5px; font-weight: 600; text-decoration: none; transition: color 0.15s; }
    .nav-links a:hover { color: #1f4b3a; }
    .nav-actions { display: flex; align-items: center; gap: 10px; }

    /* HERO */
    .hero-section { padding: 65px 0 85px; background: radial-gradient(1000px 480px at 20% 0%, #f3ebe0 0%, transparent 80%); }
    .hero-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 50px; align-items: center; }
    .hero-badge { display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #c45c26; margin-bottom: 14px; }
    .hero-copy h1 { font-size: clamp(38px, 4.8vw, 60px); color: #143024; margin: 0 0 20px; line-height: 1.05; letter-spacing: -0.03em; font-family: 'Fraunces', Georgia, serif; }
    .hero-copy h1 em { color: #c45c26; font-style: italic; }
    .hero-desc { font-size: 18px; color: #36443c; line-height: 1.55; margin: 0 0 14px; font-weight: 500; }
    .hero-subdesc { font-size: 15px; color: #627066; line-height: 1.6; margin: 0 0 30px; }
    .hero-cta-group { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 30px; }
    .hero-trust-ticks { display: flex; gap: 18px; flex-wrap: wrap; font-size: 12.5px; color: #4a594f; font-weight: 600; }
    .hero-trust-ticks span b { color: #2e7d52; margin-right: 4px; }

    /* HERO MOCKUP CARD */
    .hero-visual { position: relative; }
    .visual-studio-card { background: white; border: 1px solid #dfe5df; border-radius: 20px; box-shadow: 0 25px 60px rgba(18, 40, 28, 0.12); overflow: hidden; }
    .studio-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #f3f6f3; border-bottom: 1px solid #e2e8e2; }
    .studio-dots { display: flex; gap: 5px; }
    .studio-dots i { width: 8px; height: 8px; border-radius: 50%; background: #d0dad2; }
    .studio-title { font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; color: #5a6e61; }
    .studio-device-pills { display: flex; gap: 4px; }
    .studio-device-pills button { border: 0; background: transparent; font-size: 10px; font-weight: 700; color: #6d7f73; padding: 3px 8px; border-radius: 6px; cursor: pointer; }
    .studio-device-pills button.active { background: white; color: #1f4b3a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .mockup-canvas { padding: 18px; background: #fafaf7; transition: all 0.3s ease; }
    .mockup-canvas.is-tablet { max-width: 82%; margin: 0 auto; border-left: 1px dashed #c0ccc2; border-right: 1px dashed #c0ccc2; }
    .mockup-canvas.is-mobile { max-width: 60%; margin: 0 auto; border: 2px solid #2e3b32; border-radius: 22px; }
    .mockup-nav { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #eaece8; font-size: 10px; color: var(--preview-brand); }
    .mockup-nav b { font-family: 'Fraunces', Georgia, serif; font-size: 12px; }
    .mockup-links { display: flex; gap: 8px; color: #627267; font-size: 9px; }
    .mockup-hero { display: grid; grid-template-columns: 1fr 0.8fr; gap: 14px; align-items: center; padding: 20px 0; }
    .mock-hero-text small { font-size: 7.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--preview-accent); }
    .mock-hero-text h3 { margin: 6px 0 10px; font-size: 15px; line-height: 1.2; color: var(--preview-brand); font-family: 'Fraunces', Georgia, serif; }
    .mock-hero-text button { background: var(--preview-brand); color: white; border: 0; font-size: 8px; font-weight: 700; padding: 6px 10px; border-radius: 14px; }
    .mock-hero-image { height: 110px; background: linear-gradient(135deg, #e4ded3, #cec2af); border-radius: 10px; position: relative; overflow: hidden; }
    .floating-builder-tag { position: absolute; bottom: 8px; right: 8px; background: rgba(31, 75, 58, 0.9); color: white; font-size: 7.5px; font-weight: 700; padding: 3px 6px; border-radius: 4px; }
    .mockup-products { display: grid; grid-template-columns: repeat(auto-fit, minmax(75px, 1fr)); gap: 10px; margin-top: 10px; }
    .mock-product { background: white; border: 1px solid #e7ebe7; border-radius: 8px; padding: 6px; font-size: 8px; }
    .mock-product div { height: 50px; background: #eef2ee; border-radius: 4px; margin-bottom: 4px; }
    .mock-product strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mock-product small { color: var(--preview-accent); font-weight: 700; }
    .studio-footer-controls { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #f8faf8; border-top: 1px solid #e2e8e2; font-size: 10.5px; color: #5a6d60; font-weight: 600; }
    .palette-swatches { display: flex; gap: 6px; }
    .palette-swatches button { width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 1px #cbd5ce; cursor: pointer; }
    .palette-swatches button.selected { box-shadow: 0 0 0 2px #1f4b3a; }
    .live-pill { color: #2e7d52; font-weight: 700; font-size: 9.5px; }

    /* SECTION 2: 4 PILLARS */
    .section-pillars { padding: 80px 24px; }
    .pillar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
    .pillar-card { background: white; border: 1px solid #e4eae4; border-radius: 16px; padding: 28px 24px; transition: transform 0.2s, box-shadow 0.2s; }
    .pillar-card:hover { transform: translateY(-3px); box-shadow: 0 14px 32px rgba(20, 48, 32, 0.06); }
    .pillar-icon { font-size: 28px; margin-bottom: 14px; }
    .pillar-card h3 { font-size: 18px; color: #183329; margin: 0 0 10px; font-family: 'Fraunces', Georgia, serif; }
    .pillar-card p { font-size: 14px; color: #5b675f; line-height: 1.55; margin: 0; }

    /* SECTION 3: 6 STEPS */
    .section-steps-bg { background: #f2f6f3; padding: 90px 0; border-top: 1px solid #e5ebe5; border-bottom: 1px solid #e5ebe5; }
    .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 45px; }
    .step-card { background: white; border: 1px solid #e0e7e1; border-radius: 16px; padding: 28px; position: relative; }
    .step-num { font-family: 'Fraunces', Georgia, serif; font-size: 32px; font-weight: 800; color: #c45c26; display: block; margin-bottom: 12px; }
    .step-card h3 { font-size: 18px; color: #183329; margin: 0 0 8px; }
    .step-card p { font-size: 14px; color: #5a665e; line-height: 1.55; margin: 0; }
    .steps-cta { margin-top: 20px; }

    /* SECTION 4: PAGE BUILDER */
    .section-builder { padding: 90px 24px; }
    .builder-feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 40px; }
    .b-feat-card { background: white; border: 1px solid #e4eae4; border-radius: 16px; padding: 28px; }
    .b-icon { font-size: 26px; color: #1f4b3a; margin-bottom: 12px; }
    .b-feat-card h3 { font-size: 18px; color: #183329; margin: 0 0 8px; font-family: 'Fraunces', Georgia, serif; }
    .b-feat-card p { font-size: 14px; color: #5b6860; line-height: 1.55; margin: 0; }
    .builder-banner-cta { background: #1f4b3a; color: white; border-radius: 20px; padding: 36px 42px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
    .builder-banner-cta h3 { font-size: 24px; margin: 0 0 6px; font-family: 'Fraunces', Georgia, serif; }
    .builder-banner-cta p { font-size: 15px; color: rgba(255,255,255,0.8); margin: 0; }

    /* SECTION 5: TEMPLATES */
    .section-templates-bg { background: #fbf8f2; padding: 90px 0; border-top: 1px solid #ebd9c6; border-bottom: 1px solid #ebd9c6; }
    .template-categories-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; margin-bottom: 40px; }
    .tmpl-card { background: white; border: 1px solid #e7ded2; border-radius: 18px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
    .tmpl-card:hover { transform: translateY(-4px); box-shadow: 0 16px 36px rgba(45, 30, 15, 0.08); }
    .tmpl-art { height: 160px; padding: 18px; position: relative; display: flex; flex-direction: column; justify-content: flex-end; }
    .tmpl-card.tone-fashion .tmpl-art { background: linear-gradient(135deg, #2b3930, #15221b); color: white; }
    .tmpl-card.tone-tech .tmpl-art { background: linear-gradient(135deg, #1b263b, #0d1b2a); color: white; }
    .tmpl-card.tone-dining .tmpl-art { background: linear-gradient(135deg, #78350f, #451a03); color: white; }
    .tmpl-card.tone-beauty .tmpl-art { background: linear-gradient(135deg, #831843, #500724); color: white; }
    .tmpl-card.tone-grocery .tmpl-art { background: linear-gradient(135deg, #14532d, #052e16); color: white; }
    .tmpl-card.tone-home .tmpl-art { background: linear-gradient(135deg, #44403c, #1c1917); color: white; }
    .tmpl-chip { position: absolute; top: 14px; right: 14px; background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 800; color: white; }
    .tmpl-mockup-inner small { font-size: 9px; font-weight: 800; letter-spacing: 0.12em; opacity: 0.75; }
    .tmpl-mockup-inner h4 { margin: 4px 0; font-size: 17px; font-family: 'Fraunces', Georgia, serif; }
    .tmpl-mockup-inner p { margin: 0; font-size: 10.5px; opacity: 0.85; line-height: 1.4; }
    .tmpl-copy { padding: 20px; }
    .tmpl-copy h3 { font-size: 18px; color: #183329; margin: 0 0 6px; }
    .tmpl-copy p { font-size: 13.5px; color: #5d6760; line-height: 1.5; margin: 0; }
    .templates-footer-note p { font-size: 15px; color: #5a665e; margin-bottom: 24px; }

    /* SECTION 6: PREMIUM TEMPLATES */
    .section-premium { padding: 80px 24px; }
    .premium-box { background: #ffffff; border: 1px solid #e1e7e2; border-radius: 24px; padding: 50px 45px; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 50px; align-items: center; box-shadow: 0 18px 45px rgba(20, 45, 30, 0.05); }
    .premium-copy h2 { font-size: 34px; color: #183329; margin: 0 0 16px; font-family: 'Fraunces', Georgia, serif; }
    .customize-list-wrap { margin: 24px 0 30px; }
    .customize-list-wrap p { margin-bottom: 12px; font-size: 14px; color: #2d3b32; }
    .tags-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
    .tags-cloud span { background: #f0f5f2; color: #1f4b3a; border: 1px solid #dbe6de; padding: 6px 12px; border-radius: 20px; font-size: 12.5px; font-weight: 700; }
    .premium-features-list { display: flex; flex-direction: column; gap: 20px; }
    .p-feat { display: flex; gap: 14px; align-items: flex-start; }
    .p-check { width: 24px; height: 24px; border-radius: 50%; background: #dcfce7; color: #15803d; display: grid; place-items: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
    .p-feat h4 { font-size: 16px; color: #183329; margin: 0 0 4px; }
    .p-feat p { font-size: 13.5px; color: #5d6860; margin: 0; line-height: 1.5; }

    /* SECTION 7: 8 INDUSTRIES */
    .section-industries { padding: 80px 24px; }
    .industries-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .ind-card { background: white; border: 1px solid #e5ebe5; border-radius: 16px; padding: 24px; transition: transform 0.15s; }
    .ind-card:hover { transform: translateY(-2px); border-color: #c45c26; }
    .ind-card span { font-size: 26px; display: block; margin-bottom: 12px; }
    .ind-card h4 { font-size: 17px; color: #183329; margin: 0 0 6px; }
    .ind-card p { font-size: 13.5px; color: #5a665e; margin: 0; line-height: 1.5; }

    /* SECTION 8: 8 OPERATIONS TOOLS */
    .section-ops-bg { background: #162c22; color: white; padding: 90px 0; }
    .section-ops-bg .section-header h2 { color: white; }
    .section-ops-bg .section-subtitle { color: #a4c2b2; }
    .section-ops-bg .section-lede { color: #cfded6; }
    .ops-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }
    .op-card { background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 26px; }
    .op-icon { font-size: 26px; display: block; margin-bottom: 12px; }
    .op-card h4 { font-size: 17px; margin: 0 0 8px; color: white; }
    .op-card p { font-size: 13.5px; color: rgba(255, 255, 255, 0.75); margin: 0; line-height: 1.55; }

    /* SECTION 9: BRAND PILLARS */
    .section-brand { padding: 90px 24px; }
    .brand-tokens-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
    .token-card { background: white; border: 1px solid #e4eae4; border-radius: 16px; padding: 26px; }
    .token-card b { display: block; font-size: 18px; color: #1f4b3a; margin-bottom: 8px; font-family: 'Fraunces', Georgia, serif; }
    .token-card p { font-size: 14px; color: #58645c; margin: 0; line-height: 1.55; }

    /* SECTION 10: RESPONSIVE SCREEN DEMO */
    .section-responsive-bg { background: #f3f7f4; padding: 85px 0; border-top: 1px solid #e1e9e2; border-bottom: 1px solid #e1e9e2; }
    .device-demo-box { max-width: 760px; margin: 0 auto; background: white; border: 1px solid #dce4dd; border-radius: 20px; padding: 30px; box-shadow: 0 12px 30px rgba(0,0,0,0.04); }
    .device-tabs { display: flex; gap: 8px; justify-content: center; margin-bottom: 24px; }
    .device-tabs button { border: 1px solid #d4ded6; background: #fafcfa; padding: 10px 18px; border-radius: 30px; font-size: 13px; font-weight: 700; color: #526357; cursor: pointer; }
    .device-tabs button.active { background: #1f4b3a; color: white; border-color: #1f4b3a; }
    .device-description { text-align: center; }
    .device-description p { font-size: 16px; color: #3b4940; line-height: 1.6; margin: 0 0 16px; }
    .device-mantra { font-size: 13px; font-weight: 800; color: #c45c26; letter-spacing: 0.1em; text-transform: uppercase; }

    /* SECTION 11: 20 ECOMMERCE FEATURES */
    .section-features { padding: 90px 24px; }
    .checklist-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
    .chk-item { display: flex; align-items: center; gap: 10px; background: white; border: 1px solid #e5ebe5; border-radius: 12px; padding: 14px 18px; font-size: 14px; font-weight: 600; color: #2e3b32; }
    .chk-icon { color: #16a34a; font-weight: 800; font-size: 16px; }
    .checklist-footer-note { font-size: 15px; color: #6a776e; font-style: italic; }

    /* SECTION 12: MULTI-PAGE SUITE */
    .section-multipage { padding: 80px 24px; }
    .pages-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; }
    .p-type-card { background: white; border: 1px solid #e4eae4; border-radius: 14px; padding: 22px; }
    .p-type-card b { display: block; font-size: 16px; color: #183329; margin-bottom: 6px; }
    .p-type-card p { font-size: 13.5px; color: #5c6860; margin: 0; line-height: 1.5; }

    /* SECTION 13: GROW FROM ONE STORE */
    .section-grow-bg { background: radial-gradient(800px 300px at 50% 0%, #faeee4 0%, #fafaf7 100%); padding: 85px 0; }
    .grow-box { max-width: 720px; margin: 0 auto; }
    .grow-mantra { margin-top: 24px; font-size: 18px; color: #c45c26; font-family: 'Fraunces', Georgia, serif; }

    /* SECTION 14 & 15: AUDIENCES */
    .section-audiences { padding: 80px 24px; }
    .audiences-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .aud-card { background: white; border: 1px solid #e4eae4; border-radius: 18px; padding: 32px 28px; display: flex; flex-direction: column; }
    .aud-tag { font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: #c45c26; margin-bottom: 12px; }
    .aud-card h3 { font-size: 20px; color: #183329; margin: 0 0 12px; font-family: 'Fraunces', Georgia, serif; }
    .aud-card p { font-size: 14px; color: #58655d; line-height: 1.6; margin: 0 0 20px; flex: 1; }
    .aud-card strong { font-size: 13px; color: #1f4b3a; }

    /* SECTION 16: PRICING */
    .section-pricing-bg { background: #f3f6f3; padding: 95px 0; border-top: 1px solid #e1e8e2; border-bottom: 1px solid #e1e8e2; }
    .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; align-items: stretch; }
    .pricing-card { background: white; border: 1px solid #e0e7e1; border-radius: 20px; padding: 36px 30px; display: flex; flex-direction: column; position: relative; }
    .pricing-card.featured { border: 2px solid #1f4b3a; box-shadow: 0 20px 45px rgba(20, 50, 35, 0.1); transform: scale(1.02); }
    .featured-ribbon { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: #1f4b3a; color: white; font-size: 9.5px; font-weight: 800; letter-spacing: 0.15em; padding: 4px 14px; border-radius: 20px; }
    .plan-name { font-size: 22px; font-weight: 800; color: #183329; font-family: 'Fraunces', Georgia, serif; display: block; }
    .plan-desc { font-size: 13px; color: #617066; margin: 4px 0 18px; }
    .plan-price strong { font-size: 38px; font-weight: 800; color: #183329; font-family: 'Fraunces', Georgia, serif; }
    .plan-price small { font-size: 13px; color: #728277; margin-left: 4px; }
    .plan-features { list-style: none; padding: 24px 0; margin: 0 0 24px; border-top: 1px solid #eef2ee; border-bottom: 1px solid #eef2ee; display: flex; flex-direction: column; gap: 12px; flex: 1; }
    .plan-features li { display: flex; gap: 10px; font-size: 13.5px; color: #3b4940; }
    .plan-features li span { color: #16a34a; font-weight: 800; }
    .btn-plan { width: 100%; text-align: center; padding: 13px 0; border-radius: 999px; font-size: 14px; font-weight: 700; text-decoration: none; display: block; }
    .btn-plan.solid { background: #1f4b3a; color: white; }
    .btn-plan.outline { border: 1px solid #cbd7ce; color: #1f4b3a; }
    .btn-plan.outline:hover { background: #f0f5f2; }

    /* SECTION 17: TEMPLATE PRICING HIGHLIGHT */
    .section-tmpl-pricing { padding: 80px 24px; }
    .tmpl-pricing-card { background: white; border: 1px solid #e3eae4; border-radius: 20px; padding: 40px; display: flex; align-items: center; justify-content: space-between; gap: 40px; box-shadow: 0 12px 30px rgba(0,0,0,0.03); }
    .tp-copy h2 { font-size: 30px; color: #183329; margin: 0 0 12px; font-family: 'Fraunces', Georgia, serif; }
    .tp-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 24px; }
    .tp-options strong { display: block; font-size: 15px; color: #1f4b3a; margin-bottom: 4px; }
    .tp-options p { font-size: 13px; color: #5d6860; margin: 0; line-height: 1.45; }
    .tp-action { flex-shrink: 0; }

    /* SECTION 18: WHY MARKETHUB */
    .section-why { padding: 80px 24px; }
    .why-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
    .why-card { background: white; border: 1px solid #e4eae4; border-radius: 16px; padding: 26px; }
    .why-card h4 { font-size: 18px; color: #183329; margin: 0 0 8px; font-family: 'Fraunces', Georgia, serif; }
    .why-card p { font-size: 14px; color: #59655d; line-height: 1.55; margin: 0; }

    /* SECTION 19: FAQ */
    .section-faq-bg { background: #f2f6f3; padding: 90px 0; border-top: 1px solid #e1e9e2; border-bottom: 1px solid #e1e9e2; }
    .faq-list { max-width: 820px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
    .faq-card { background: white; border: 1px solid #e0e7e1; border-radius: 14px; overflow: hidden; transition: border-color 0.15s; }
    .faq-card.open { border-color: #1f4b3a; }
    .faq-question { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border: 0; background: none; font-size: 16px; font-weight: 700; color: #183329; text-align: left; cursor: pointer; }
    .faq-toggle-icon { font-size: 20px; color: #5d6f63; font-weight: 400; margin-left: 14px; }
    .faq-answer { padding: 0 24px 22px; }
    .faq-answer p { margin: 0; font-size: 14.5px; color: #4e5c53; line-height: 1.65; }

    /* SECTION 20: FINAL CTA */
    .section-final-cta { padding: 85px 24px; }
    .final-cta-box { background: linear-gradient(135deg, #183329 0%, #0d1e18 100%); color: white; border-radius: 26px; padding: 65px 40px; box-shadow: 0 25px 65px rgba(10, 25, 18, 0.2); }
    .final-cta-box h2 { font-size: clamp(32px, 4.2vw, 50px); margin: 0 0 16px; font-family: 'Fraunces', Georgia, serif; line-height: 1.1; }
    .cta-lede { font-size: 17.5px; color: rgba(255,255,255,0.85); max-width: 680px; margin: 0 auto 30px; line-height: 1.6; }
    .cta-pillars { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 35px; font-size: 13px; font-weight: 700; color: #f7a974; letter-spacing: 0.08em; text-transform: uppercase; }
    .final-btns { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }
    .final-btns .btn-primary-lg { background: #c45c26; }
    .final-btns .btn-secondary-lg { background: transparent; border-color: rgba(255,255,255,0.4); color: white; }
    .final-btns .btn-secondary-lg:hover { background: rgba(255,255,255,0.1); }

    /* SECTION 21: FOOTER */
    .saas-footer { background: #121513; color: white; padding: 75px 0 35px; border-top: 1px solid #232724; }
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 60px; }
    .footer-wordmark { font-size: 26px; font-weight: 800; color: white; text-decoration: none; margin-bottom: 10px; display: inline-block; }
    .footer-tagline strong { font-size: 13px; color: #f7a974; display: block; margin-bottom: 8px; }
    .footer-desc { font-size: 13.5px; color: rgba(255,255,255,0.65); line-height: 1.6; max-width: 320px; margin: 0 0 18px; }
    .social-links { font-size: 12px; color: rgba(255,255,255,0.45); }
    .footer-col h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: rgba(255,255,255,0.45); margin: 0 0 16px; font-weight: 800; }
    .footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 9px; }
    .footer-col a, .footer-col span { font-size: 13px; color: rgba(255,255,255,0.7); text-decoration: none; transition: color 0.15s; }
    .footer-col a:hover { color: white; }
    .footer-bottom { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; font-size: 12px; color: rgba(255,255,255,0.45); }
    .back-to-market { color: rgba(255,255,255,0.7); text-decoration: none; font-weight: 600; }
    .back-to-market:hover { color: white; text-decoration: underline; }

    /* RESPONSIVE BREAKPOINTS */
    @media (max-width: 1024px) {
      .hero-grid { grid-template-columns: 1fr; gap: 40px; }
      .pillar-grid, .steps-grid, .builder-feature-grid, .template-categories-grid, .industries-grid, .ops-grid, .checklist-grid, .pricing-grid, .why-grid { grid-template-columns: repeat(2, 1fr); }
      .footer-grid { grid-template-columns: 1fr 1fr; }
      .premium-box { grid-template-columns: 1fr; gap: 35px; }
      .tmpl-pricing-card { flex-direction: column; align-items: flex-start; }
      .tp-options { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .saas-nav .nav-links { display: none; }
      .saas-nav .nav-tagline { display: none; }
      .pillar-grid, .steps-grid, .builder-feature-grid, .template-categories-grid, .industries-grid, .ops-grid, .checklist-grid, .pricing-grid, .why-grid, .brand-tokens-grid, .audiences-grid { grid-template-columns: 1fr; }
      .builder-banner-cta { flex-direction: column; align-items: flex-start; }
      .footer-grid { grid-template-columns: 1fr; gap: 30px; }
      .footer-bottom { flex-direction: column; gap: 10px; text-align: center; }
    }
  `],
})
export class SaasLandingComponent {
  auth = inject(AuthService);

  previewDevice = signal<DevicePreview>('desktop');
  screenTab = signal<'desktop' | 'tablet' | 'mobile'>('desktop');
  selectedPaletteName = signal('Forest & Terracotta');

  palettes = [
    { name: 'Forest & Terracotta', primary: '#1f4b3a', accent: '#c45c26' },
    { name: 'Midnight & Gold', primary: '#111827', accent: '#d97706' },
    { name: 'Plum & Rose', primary: '#4c1d95', accent: '#db2777' },
    { name: 'Deep Navy & Coral', primary: '#0f172a', accent: '#f43f5e' },
  ];

  activePalette = computed(() => this.palettes.find((p) => p.name === this.selectedPaletteName()) || this.palettes[0]);

  createStoreTarget(): string {
    if (!this.auth.isLoggedIn()) return '/register';
    if (this.auth.hasRole('tenant_owner', 'store_staff')) return '/tenant/stores';
    return '/sell';
  }

  templatesTarget(): string {
    if (this.auth.hasRole('tenant_owner', 'store_staff')) return '/tenant/templates';
    return '/register';
  }

  ecommerceFeatures: string[] = [
    'Product Management',
    'Product Categories',
    'Product Variations',
    'Inventory Management',
    'Shopping Cart',
    'Checkout',
    'Order Management',
    'Customer Management',
    'Product Search',
    'Discounts',
    'Coupons',
    'Store Pages',
    'Responsive Storefronts',
    'Payment Integration',
    'Store Analytics',
    'Customer Reviews',
    'Promotional Sections',
    'Featured Products',
    'Related Products',
    'Multi-Store Scaling',
  ];

  faqs = signal<FaqItem[]>([
    {
      q: 'What is MarketHub?',
      a: 'MarketHub is an all-in-one SaaS platform that allows businesses to create, customize and manage their own online stores with an Elementor-style visual page builder, template marketplace, and integrated order and inventory management.',
      open: true,
    },
    {
      q: 'Do I need coding knowledge?',
      a: 'No. MarketHub is designed to make store creation and customization accessible without requiring advanced coding knowledge. Everything is managed through our drag-and-drop visual interface.',
      open: false,
    },
    {
      q: 'Can I customize my store?',
      a: 'Yes. You can customize your store’s branding, pages, layout, colors, typography, images and other design elements using the MarketHub Page Builder.',
      open: false,
    },
    {
      q: 'What is the Page Builder?',
      a: 'The Page Builder is a visual drag-and-drop tool that allows you to create and customize pages without manually writing code. You can arrange sections, configure ecommerce widgets, and preview live on desktop, tablet, and mobile.',
      open: false,
    },
    {
      q: 'Are templates available?',
      a: 'Yes. MarketHub provides both free and premium templates through the Template Marketplace across fashion, electronics, food, beauty, grocery, furniture, and more.',
      open: false,
    },
    {
      q: 'Can I purchase premium templates?',
      a: 'Yes. Selected templates can be purchased separately and customized for your store. The purchase includes a lifetime licence with immediate installation into your workspace.',
      open: false,
    },
    {
      q: 'Can I change my template?',
      a: 'Your ability to change templates can depend on the template and your MarketHub plan. Your store content remains separate from the template design so your products, categories, and business data are always protected.',
      open: false,
    },
    {
      q: 'Can I sell different types of products?',
      a: 'Yes. MarketHub is designed to support businesses selling different types of products across multiple categories, including physical goods, variations (size, color), and services.',
      open: false,
    },
    {
      q: 'Can customers shop from mobile devices?',
      a: 'Yes. MarketHub storefronts are designed to support responsive layouts across desktop, tablet and mobile devices with fast loading speeds.',
      open: false,
    },
    {
      q: 'Can I manage my orders?',
      a: 'Yes. Your MarketHub tenant dashboard provides centralized tools for viewing, fulfilling, tracking, and managing customer orders.',
      open: false,
    },
    {
      q: 'Can I manage my products?',
      a: 'Yes. You can create products, organize categories, manage pricing, upload galleries, configure variants, and maintain your entire catalog.',
      open: false,
    },
    {
      q: 'Can I have more than one store?',
      a: 'Depending on your MarketHub plan, you can create and manage multiple independent storefronts from a single tenant workspace.',
      open: false,
    },
    {
      q: 'How do payments work?',
      a: 'MarketHub supports integrated payment methods so customers can pay for products through your online store via Cards, Mobile Money, and configured platform gateways.',
      open: false,
    },
  ]);

  toggleFaq(index: number): void {
    const items = [...this.faqs()];
    items[index].open = !items[index].open;
    this.faqs.set(items);
  }
}
