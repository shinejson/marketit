import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/** Seller-focused extension to the shopper-first marketplace homepage. */
@Component({
  selector: 'app-seller-studio-promo',
  imports: [RouterLink],
  template: `
    <section class="seller-studio" aria-labelledby="seller-studio-title">
      <div class="wrap">
        <div class="studio-hero">
          <div class="studio-copy">
            <p class="eyebrow"><span aria-hidden="true">✳</span> FOR THE PEOPLE BEHIND THE STALLS</p>
            <h2 id="seller-studio-title">Make a storefront that feels like <em>you.</em></h2>
            <p class="studio-lede">
              Bring your brand online with a customizable storefront, a visual page builder, and the tools to run your business in one place.
            </p>
            <div class="studio-actions">
              <a class="btn accent" [routerLink]="sellerTarget()">
                {{ sellerActionLabel() }} <span aria-hidden="true">→</span>
              </a>
              <a routerLink="/platform" class="btn">SaaS Features &amp; Pricing →</a>
              <a class="scroll-link" href="#seller-tools">Explore the tools <span aria-hidden="true">↓</span></a>
            </div>
            <p class="approval-note"><span aria-hidden="true">✓</span> No coding needed. Business approval is required before a store can go live.</p>
          </div>

          <div class="preview-column">
            <div class="preview-card" role="img" aria-label="Illustrative sample storefront with a custom brand, product collection and page builder badge">
              <div class="browser-bar">
                <span class="browser-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                <span class="browser-title">SAMPLE STOREFRONT</span>
                <span class="browser-status"><i></i> Responsive preview</span>
              </div>
              <div class="store-preview">
                <header class="store-nav">
                  <span class="store-wordmark">FABLE <i>&amp;</i> FINCH</span>
                  <span class="store-links">Shop <i>Our story</i> Contact</span>
                  <span class="store-bag">Bag <b>0</b></span>
                </header>
                <div class="store-hero">
                  <div class="store-message">
                    <small>OBJECTS FOR SLOWER DAYS</small>
                    <strong>Good things,<br />made to last.</strong>
                    <p>Thoughtful pieces for the spaces you call home.</p>
                    <span class="sample-button">Explore the collection <b>→</b></span>
                  </div>
                  <div class="hero-art" aria-hidden="true">
                    <span class="art-sun"></span>
                    <span class="art-stem stem-one"></span>
                    <span class="art-stem stem-two"></span>
                    <span class="art-vase vase-one"></span>
                    <span class="art-vase vase-two"></span>
                  </div>
                </div>
                <div class="store-products">
                  <div class="products-heading">
                    <span><small>CURATED FOR YOU</small><b>Thoughtful essentials</b></span>
                    <span class="view-all">View all&nbsp; →</span>
                  </div>
                  <div class="sample-products">
                    <div class="sample-product">
                      <span class="product-art product-vase" aria-hidden="true"><i></i></span>
                      <b>Studio vase</b><small>GH₵ 145</small>
                    </div>
                    <div class="sample-product">
                      <span class="product-art product-bowl" aria-hidden="true"><i></i></span>
                      <b>Woven market basket</b><small>GH₵ 120</small>
                    </div>
                    <div class="sample-product third-product">
                      <span class="product-art product-linen" aria-hidden="true"><i></i></span>
                      <b>Everyday linen</b><small>GH₵ 95</small>
                    </div>
                  </div>
                </div>
              </div>
              <div class="builder-note">
                <span class="note-mark" aria-hidden="true">✳</span>
                <span><b>Storefront Studio</b><small>Make every section yours</small></span>
                <span class="note-check" aria-hidden="true">✓</span>
              </div>
            </div>
          </div>
        </div>

        <section class="studio-tools" id="seller-tools" aria-labelledby="seller-tools-title">
          <div class="tools-heading">
            <div>
              <p class="eyebrow">A STORE AND THE TOOLS BEHIND IT</p>
              <h3 id="seller-tools-title">From storefront to daily operations.</h3>
            </div>
            <p>Start with a design, make it yours, and keep the moving parts of your business connected.</p>
          </div>
          <div class="tool-grid">
            <article class="tool-card">
              <span class="tool-icon design-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 9v11M13 13h4M13 16h4"/><path d="m17 2 .7 1.8L20 4.5l-2.3.7L17 7l-.7-1.8L14 4.5l2.3-.7z"/></svg>
              </span>
              <p class="tool-label">DESIGN</p>
              <h4>Build without code</h4>
              <p>Arrange page sections, shape your brand styles, and add product displays with the visual builder.</p>
            </article>
            <article class="tool-card">
              <span class="tool-icon template-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9M14 13h4M14 17h4"/><path d="m6 6 .01 0"/></svg>
              </span>
              <p class="tool-label">TEMPLATES</p>
              <h4>Start with a design</h4>
              <p>Choose a free or premium storefront template, then customize its colors, content, and layout.</p>
            </article>
            <article class="tool-card">
              <span class="tool-icon commerce-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16l-1.2 13H5.2L4 7Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3M8 13h8M8 16h5"/></svg>
              </span>
              <p class="tool-label">SELL &amp; MANAGE</p>
              <h4>Run it in one place</h4>
              <p>Manage products, inventory, customer orders, and business insights from your seller workspace.</p>
            </article>
          </div>
        </section>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .seller-studio {
      padding: 76px 0 68px;
      overflow: hidden;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      background: radial-gradient(900px 360px at 95% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%), var(--paper-2);
    }
    .studio-hero { display: grid; grid-template-columns: .9fr 1.1fr; gap: clamp(34px, 6vw, 82px); align-items: center; }
    .studio-copy { max-width: 510px; }
    .eyebrow { margin: 0 0 10px; color: var(--accent); font-size: 11px; font-weight: 800; letter-spacing: .15em; line-height: 1.5; }
    .eyebrow > span { margin-right: 5px; font-size: 14px; }
    .studio-copy h2 { margin: 0 0 16px; max-width: 12ch; font-size: clamp(36px, 4.7vw, 58px); line-height: 1.03; }
    .studio-copy h2 em { color: var(--accent); font-style: normal; }
    .studio-lede { max-width: 49ch; margin: 0; color: var(--ink-soft); font-size: 17px; line-height: 1.6; }
    .studio-actions { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; margin-top: 24px; }
    .studio-actions .btn { min-height: 48px; padding: 13px 20px; }
    .scroll-link { display: inline-flex; align-items: center; gap: 8px; color: var(--ink); font-size: 14px; font-weight: 700; }
    .scroll-link span { color: var(--accent); font-size: 18px; transition: transform .2s ease; }
    .scroll-link:hover span { transform: translateY(3px); }
    .approval-note { display: flex; align-items: flex-start; gap: 9px; margin: 18px 0 0; max-width: 48ch; color: var(--ink-soft); font-size: 12px; line-height: 1.5; }
    .approval-note > span { display: grid; flex: none; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: color-mix(in srgb, var(--accent-2) 14%, transparent); color: var(--accent-2); font-size: 11px; font-weight: 800; }

    .preview-column { min-width: 0; }
    .preview-card { position: relative; padding: 10px; border: 1px solid var(--line); border-radius: 24px; background: var(--card); box-shadow: 0 26px 70px rgba(28, 25, 20, .16); transform: rotate(.7deg); }
    .browser-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 34px; padding: 0 9px 9px; color: var(--ink-soft); }
    .browser-dots { display: flex; gap: 4px; flex: none; }
    .browser-dots i { width: 7px; height: 7px; border-radius: 50%; background: #d9d0c0; }
    .browser-dots i:first-child { background: #e58d73; }
    .browser-dots i:nth-child(2) { background: #e8bd65; }
    .browser-dots i:nth-child(3) { background: #74a985; }
    .browser-title { overflow: hidden; font-size: 8px; font-weight: 800; letter-spacing: .14em; text-overflow: ellipsis; white-space: nowrap; }
    .browser-status { display: inline-flex; align-items: center; gap: 5px; flex: none; font-size: 9px; font-weight: 700; }
    .browser-status i { width: 6px; height: 6px; border-radius: 50%; background: #4b9a68; }
    .store-preview { overflow: hidden; border: 1px solid #e9e2d8; border-radius: 15px; background: #fffdf8; color: #28251f; }
    .store-nav { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 42px; padding: 0 17px; border-bottom: 1px solid #eee8de; }
    .store-wordmark { font-family: Georgia, serif; font-size: 11px; font-weight: 800; letter-spacing: .1em; white-space: nowrap; }
    .store-wordmark i { color: #b96c46; font-style: normal; }
    .store-links { color: #676157; font-size: 8px; white-space: nowrap; }
    .store-links i { margin: 0 9px; font-style: normal; }
    .store-bag { font-size: 8px; white-space: nowrap; }
    .store-bag b { display: inline-grid; place-items: center; width: 15px; height: 15px; margin-left: 3px; border-radius: 50%; background: #ede7dc; font-size: 8px; }
    .store-hero { display: grid; grid-template-columns: 1fr .9fr; min-height: 208px; background: #f0e8dc; }
    .store-message { align-self: center; padding: 24px 8px 24px 25px; }
    .store-message > small, .products-heading small { display: block; color: #8b6549; font-size: 7px; font-weight: 800; letter-spacing: .16em; }
    .store-message > strong { display: block; margin: 9px 0 7px; font: 600 clamp(20px, 2.5vw, 30px)/1.02 Georgia, serif; letter-spacing: -.04em; }
    .store-message > p { max-width: 190px; margin: 0 0 12px; color: #6d665b; font-size: 8px; line-height: 1.45; }
    .sample-button { display: inline-flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 3px; background: #264b3d; color: #fff; font-size: 7px; font-weight: 700; }
    .hero-art { position: relative; min-height: 185px; margin: 11px 11px 11px 0; overflow: hidden; border-radius: 7px; background: linear-gradient(145deg, #c8a78d 0%, #b89478 50%, #9d7a64 100%); }
    .art-sun { position: absolute; top: 17%; right: 18%; width: 46px; aspect-ratio: 1; border-radius: 50%; background: #e5c875; box-shadow: 0 0 0 11px rgba(229, 200, 117, .14); }
    .art-vase { position: absolute; z-index: 2; bottom: 9%; width: 48px; height: 80px; border-radius: 42% 42% 34% 34% / 18% 18% 24% 24%; background: linear-gradient(90deg, #ede1cd, #c7ad92 65%, #ac9076); box-shadow: 9px 9px 20px rgba(57, 39, 26, .14); }
    .art-vase::before { position: absolute; top: -11px; left: 18px; width: 13px; height: 18px; border-radius: 3px 3px 0 0; background: #d3bea5; content: ''; }
    .vase-one { left: 22%; transform: rotate(-5deg); }
    .vase-two { left: 55%; width: 38px; height: 63px; background: linear-gradient(90deg, #6f8170, #405c4d); transform: rotate(6deg); }
    .vase-two::before { left: 13px; background: #718273; }
    .art-stem { position: absolute; z-index: 3; bottom: 72%; width: 2px; height: 54px; background: #445748; transform-origin: bottom; }
    .stem-one { left: 34%; transform: rotate(-20deg); }
    .stem-two { left: 64%; height: 44px; transform: rotate(23deg); }
    .store-products { padding: 12px 16px 15px; }
    .products-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; margin-bottom: 9px; }
    .products-heading > span:first-child > b { display: block; margin-top: 3px; font: 600 13px/1.1 Georgia, serif; }
    .view-all { color: #647268; font-size: 8px; font-weight: 700; white-space: nowrap; }
    .sample-products { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .sample-product { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
    .sample-product > b, .sample-product > small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sample-product > b { margin-top: 2px; font-size: 8px; font-weight: 700; }
    .sample-product > small { color: #756c60; font-size: 7px; }
    .product-art { position: relative; display: block; height: 64px; overflow: hidden; border-radius: 5px; }
    .product-vase { background: linear-gradient(135deg, #ded0bf, #b99e83); }
    .product-vase::before { position: absolute; bottom: 8%; left: 39%; width: 27%; height: 61%; border-radius: 42% 42% 32% 32%; background: linear-gradient(90deg, #eee1cf, #b7a087); content: ''; }
    .product-vase::after { position: absolute; bottom: 65%; left: 46%; width: 12%; height: 16%; border-radius: 2px 2px 0 0; background: #d5c0a7; content: ''; }
    .product-bowl { background: linear-gradient(145deg, #e5d5bd, #b78d6a); }
    .product-bowl::before { position: absolute; right: 22%; bottom: 14%; left: 22%; height: 41%; border-radius: 8% 8% 48% 48%; border-bottom: 4px solid #8e674c; background: linear-gradient(90deg, #d6b28c, #f0d8b5 55%, #b98e69); content: ''; }
    .product-linen { background: repeating-linear-gradient(90deg, #d5d9c8 0 8px, #e5e4d6 8px 16px); }
    .product-linen::before { position: absolute; top: 16%; left: 25%; width: 53%; height: 67%; border: 1px solid rgba(84, 99, 77, .25); border-radius: 4px; background: repeating-linear-gradient(0deg, rgba(255,255,255,.25) 0 3px, transparent 3px 7px); content: ''; transform: rotate(-5deg); }
    .builder-note { position: absolute; right: -16px; bottom: -21px; z-index: 2; display: flex; align-items: center; gap: 10px; min-width: 222px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 14px; background: var(--card); box-shadow: 0 12px 30px rgba(28, 25, 20, .14); }
    .note-mark { display: grid; place-items: center; flex: none; width: 34px; height: 34px; border-radius: 10px; background: color-mix(in srgb, var(--accent) 12%, var(--card)); color: var(--accent); font-size: 18px; }
    .builder-note > span:nth-child(2) { display: grid; flex: 1; gap: 2px; }
    .builder-note b { font-size: 11px; }
    .builder-note small { color: var(--ink-soft); font-size: 9px; }
    .note-check { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: color-mix(in srgb, var(--accent-2) 14%, transparent); color: var(--accent-2); font-size: 11px; font-weight: 800; }
    .studio-tools { padding-top: 62px; scroll-margin-top: 100px; }
    .tools-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 19px; }
    .tools-heading .eyebrow { margin-bottom: 5px; }
    .tools-heading h3 { margin: 0; font-size: clamp(25px, 3vw, 34px); line-height: 1.1; }
    .tools-heading > p { max-width: 40ch; margin: 0 0 2px; color: var(--ink-soft); font-size: 14px; line-height: 1.55; }
    .tool-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .tool-card { min-width: 0; padding: 21px 21px 20px; border: 1px solid var(--line); border-radius: 16px; background: var(--card); box-shadow: 0 8px 26px rgba(28, 25, 20, .035); }
    .tool-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; background: color-mix(in srgb, var(--accent) 12%, var(--card)); color: var(--accent); }
    .tool-icon svg { width: 22px; height: 22px; }
    .template-icon { background: color-mix(in srgb, var(--gold) 16%, var(--card)); color: #997719; }
    .commerce-icon { background: color-mix(in srgb, var(--accent-2) 12%, var(--card)); color: var(--accent-2); }
    .tool-label { margin: 16px 0 4px; color: var(--accent); font-size: 9px; font-weight: 800; letter-spacing: .14em; }
    .tool-card h4 { margin: 0 0 7px; font-size: 19px; }
    .tool-card > p:last-child { margin: 0; color: var(--ink-soft); font-size: 13px; line-height: 1.55; }

    @media (max-width: 900px) {
      .studio-hero { grid-template-columns: 1fr; gap: 32px; }
      .studio-copy { max-width: 680px; }
      .studio-copy h2 { max-width: 14ch; }
      .preview-column { width: min(720px, 100%); justify-self: center; }
      .tools-heading { align-items: flex-start; flex-direction: column; gap: 8px; }
      .tools-heading > p { max-width: 60ch; }
    }
    @media (max-width: 620px) {
      .seller-studio { padding: 54px 0 48px; }
      .studio-copy h2 { font-size: clamp(34px, 10vw, 48px); }
      .studio-actions { gap: 15px; }
      .studio-actions .btn { width: 100%; }
      .preview-card { padding: 7px; border-radius: 18px; transform: none; }
      .browser-bar { min-height: 29px; padding: 0 5px 7px; }
      .browser-title { font-size: 7px; }
      .browser-status { font-size: 8px; }
      .store-nav { min-height: 36px; gap: 5px; padding: 0 9px; }
      .store-links { font-size: 7px; }
      .store-links i { margin: 0 4px; }
      .store-hero { grid-template-columns: 1fr .82fr; min-height: 180px; }
      .store-message { padding: 17px 2px 17px 14px; }
      .store-message > strong { font-size: clamp(18px, 5vw, 25px); }
      .store-message > p { font-size: 7px; }
      .hero-art { min-height: 160px; margin: 9px 8px 9px 0; }
      .builder-note { right: 12px; bottom: -20px; min-width: 190px; padding: 8px 10px; }
      .studio-tools { padding-top: 52px; }
      .tools-heading h3 { font-size: 27px; }
      .tool-grid { grid-template-columns: 1fr; gap: 10px; }
      .tool-card { display: grid; grid-template-columns: 42px 1fr; column-gap: 12px; padding: 16px; }
      .tool-icon { grid-row: span 3; }
      .tool-label { margin: 0 0 2px; }
      .tool-card h4 { font-size: 18px; }
      .tool-card > p:last-child { grid-column: 2; }
    }
    @media (prefers-reduced-motion: reduce) {
      .scroll-link span { transition: none; }
    }
  `],
})
export class SellerStudioPromoComponent {
  private readonly auth = inject(AuthService);

  sellerTarget(): string {
    if (this.auth.hasRole('tenant_owner', 'store_staff')) return '/tenant';
    return this.auth.isLoggedIn() ? '/sell' : '/register';
  }

  sellerActionLabel(): string {
    if (this.auth.hasRole('tenant_owner', 'store_staff')) return 'Open seller workspace';
    return this.auth.isLoggedIn() ? 'Apply to sell' : 'Become a seller';
  }
}
