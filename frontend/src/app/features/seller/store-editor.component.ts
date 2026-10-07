import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { StorePageSection, StoreProductionStep, StorePageSectionItem, StoreThemeConfig } from '../../core/models';

type EditorTab = 'hero' | 'pages' | 'design' | 'commerce' | 'access' | 'setup';
type PagesSubTab = 'home_sections' | 'about_page' | 'contact_page';
type PreviewDevice = 'desktop' | 'mobile';
type PreviewPage = 'home' | 'about' | 'contact';

@Component({
  selector: 'app-store-editor',
  imports: [FormsModule, RouterLink],
  template: `
    @if (loading()) {
      <div class="loading">
        <span></span>
        <p>Opening Storefront Studio…</p>
      </div>
    } @else if (store(); as s) {
      <header class="editor-head">
        <div class="crumbs">
          <a routerLink="/tenant/stores">Storefronts</a>
          <span>/</span>
          <b>{{ s.name }}</b>
        </div>
        <div class="head-row">
          <div class="identity">
            <div class="logo-box" [style.background]="theme.primary_color || '#1f4b3a'">
              @if (s.logo_path || theme.logo_image) {
                <img [src]="s.logo_path || theme.logo_image" alt="Logo" class="head-logo-img" />
              } @else {
                {{ initials(s.name) }}
              }
            </div>
            <div>
              <div class="name-status">
                <h1>{{ s.name }}</h1>
                <span class="status-pill" [class.live]="s.status === 'active'">
                  <i></i>{{ s.status === 'active' ? 'Live Store' : 'Draft' }}
                </span>
              </div>
              <p class="store-url">
                <span>{{ origin }}/stores/{{ s.slug }}</span>
                <a [href]="'/stores/' + s.slug" target="_blank" class="ext-link">Visit Store ↗</a>
              </p>
            </div>
          </div>

          <div class="top-actions">
            <a class="btn ghost" [routerLink]="['/tenant/stores', s.id, 'builder']">Page Builder ↗</a>
            <a class="btn ghost" routerLink="/tenant/templates">Templates ✦</a>
            <a class="btn ghost" [href]="'/stores/' + s.slug" target="_blank">Open storefront ↗</a>
            <button class="btn publish" type="button" (click)="togglePublish()" [disabled]="saving()">
              {{ s.status === 'active' ? 'Unpublish' : 'Publish store' }}
            </button>
            <button class="btn save-main" type="button" (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Saving…' : 'Save changes' }}
            </button>
          </div>
        </div>
      </header>

      @if (error()) { <div class="alert error">{{ error() }}</div> }
      @if (saved()) { <div class="alert saved">✓ Changes saved successfully</div> }

      <div class="workspace">
        <!-- LEFT: STUDIO NAVIGATION TABS -->
        <nav class="side card" aria-label="Store Builder Navigation">
          <p class="side-eyebrow">Storefront Studio</p>
          @for (item of tabs; track item.id) {
            <button
              type="button"
              [class.active]="tab() === item.id"
              (click)="tab.set(item.id)"
            >
              <span class="tab-icon">{{ item.icon }}</span>
              <div>
                <strong>{{ item.label }}</strong>
                <small>{{ item.copy }}</small>
              </div>
              <b class="chevron">›</b>
            </button>
          }

          <div class="side-foot">
            <span class="pct">{{ completion() }}%</span>
            <div>
              <strong>Studio readiness</strong>
              <div class="bar"><i [style.width.%]="completion()"></i></div>
            </div>
          </div>
        </nav>

        <!-- CENTER: TAB CONFIGURATION PANELS -->
        <main class="panel">
          <!-- ================= TAB 1: HERO & BANNER ================= -->
          @if (tab() === 'hero') {
            <section class="panel-title">
              <div>
                <p class="eyebrow">Hero & Banners</p>
                <h2>Hero Section & Promotional Banners</h2>
                <p>Configure the primary greeting, banner photography, headlines, and call-to-actions.</p>
              </div>
            </section>

            <!-- Hero Layout & Headline Card -->
            <div class="card block">
              <div class="block-head">
                <h3>Hero Banner Layout</h3>
                <p>Choose the visual structure for your storefront hero section.</p>
              </div>

              <div class="layout-choice-grid">
                <button
                  type="button"
                  class="layout-card"
                  [class.active]="heroSection.layout === 'split'"
                  (click)="heroSection.layout = 'split'; theme.hero_style = 'split'"
                >
                  <div class="layout-preview split-preview"><div></div><div></div></div>
                  <strong>Split Banner</strong>
                  <small>Text on left, framed image on right</small>
                </button>

                <button
                  type="button"
                  class="layout-card"
                  [class.active]="heroSection.layout === 'full_banner'"
                  (click)="heroSection.layout = 'full_banner'; theme.hero_style = 'full_banner'"
                >
                  <div class="layout-preview full-preview"><div></div></div>
                  <strong>Full Width Banner</strong>
                  <small>Immersive photo with text overlay</small>
                </button>

                <button
                  type="button"
                  class="layout-card"
                  [class.active]="heroSection.layout === 'centered'"
                  (click)="heroSection.layout = 'centered'; theme.hero_style = 'centered'"
                >
                  <div class="layout-preview centered-preview"><div></div></div>
                  <strong>Centered Hero</strong>
                  <small>Clean editorial greeting</small>
                </button>
              </div>

              <div class="field-grid">
                <div class="field">
                  <label>Overline Tag / Badge</label>
                  <input [(ngModel)]="heroSection.badge" placeholder="e.g. Handcrafted · Independent Maker" />
                </div>
                <div class="field">
                  <label>Hero Headline</label>
                  <input [(ngModel)]="heroSection.title" placeholder="e.g. Crafted with care, made for you" />
                </div>
                <div class="field full">
                  <label>Hero Subtitle / Lead Text</label>
                  <textarea rows="3" [(ngModel)]="heroSection.subtitle" placeholder="Describe what makes your storefront and collections distinct…"></textarea>
                </div>
                <div class="field">
                  <label>Primary Button Text</label>
                  <input [(ngModel)]="heroSection.button_text" placeholder="Shop the collection" />
                </div>
                <div class="field">
                  <label>Primary Button Link</label>
                  <input [(ngModel)]="heroSection.button_link" placeholder="#catalogue or ?page=shop" />
                </div>
              </div>
            </div>

            <!-- Hero Image Upload Card -->
            <div class="card block">
              <div class="block-head">
                <h3>Hero Photography</h3>
                <p>Upload a high-resolution hero photo or provide an external image URL.</p>
              </div>

              <div class="media-upload-row">
                <div class="media-thumb">
                  <img [src]="heroSection.image_url || '/images/market-shopper.jpg'" alt="Hero preview" />
                </div>
                <div class="media-actions">
                  <div class="upload-dropzone">
                    <input type="file" accept="image/*" (change)="onMediaFileSelect($event, 'hero')" id="heroImgInput" />
                    <label for="heroImgInput" class="upload-btn-label">
                      <span>📁 Upload Hero Image</span>
                      <small>PNG, JPG, WebP up to 5MB</small>
                    </label>
                  </div>
                  <div class="field" style="margin-top: 10px;">
                    <label>Or Image URL</label>
                    <input [(ngModel)]="heroSection.image_url" placeholder="https://example.com/hero.jpg" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Promotional Banner Block Card -->
            <div class="card block">
              <div class="block-head">
                <div class="head-flex">
                  <div>
                    <h3>Promotional Mid-Page Banner</h3>
                    <p>Highlight seasonal launches, discounts, or studio specialties.</p>
                  </div>
                  <label class="toggle-sm">
                    <input type="checkbox" [(ngModel)]="bannerSection.enabled" />
                    <span></span>
                    <em>{{ bannerSection.enabled ? 'Enabled' : 'Disabled' }}</em>
                  </label>
                </div>
              </div>

              @if (bannerSection.enabled) {
                <div class="field-grid">
                  <div class="field">
                    <label>Banner Badge</label>
                    <input [(ngModel)]="bannerSection.badge" placeholder="Limited Edition" />
                  </div>
                  <div class="field">
                    <label>Banner Headline</label>
                    <input [(ngModel)]="bannerSection.title" placeholder="Crafted for Discerning Spaces" />
                  </div>
                  <div class="field full">
                    <label>Banner Subtitle</label>
                    <textarea rows="2" [(ngModel)]="bannerSection.subtitle" placeholder="Explore unique handcrafted releases…"></textarea>
                  </div>
                  <div class="field">
                    <label>Action Button Label</label>
                    <input [(ngModel)]="bannerSection.button_text" placeholder="Explore Catalogue" />
                  </div>
                  <div class="field">
                    <label>Action Button Link</label>
                    <input [(ngModel)]="bannerSection.button_link" placeholder="#catalogue" />
                  </div>
                </div>

                <div class="media-upload-row" style="margin-top: 15px;">
                  <div class="media-thumb banner-thumb">
                    <img [src]="bannerSection.image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80'" alt="Banner preview" />
                  </div>
                  <div class="media-actions">
                    <div class="upload-dropzone">
                      <input type="file" accept="image/*" (change)="onMediaFileSelect($event, 'banner')" id="bannerImgInput" />
                      <label for="bannerImgInput" class="upload-btn-label">
                        <span>📁 Upload Banner Background</span>
                        <small>Landscape photo recommended (e.g. 1600x600)</small>
                      </label>
                    </div>
                    <div class="field" style="margin-top: 10px;">
                      <label>Or Banner Image URL</label>
                      <input [(ngModel)]="bannerSection.image_url" placeholder="https://example.com/banner.jpg" />
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- ================= TAB 2: STORE PAGES ================= -->
          @if (tab() === 'pages') {
            <section class="panel-title">
              <div>
                <p class="eyebrow">Pages & Content</p>
                <h2>Store Pages & Section Builder</h2>
                <p>Customize your Homepage blocks, and build dedicated About Us and Contact pages.</p>
              </div>
            </section>

            <!-- Sub-tab Selector -->
            <div class="subtabs-bar">
              <button
                type="button"
                [class.active]="pagesSubTab() === 'home_sections'"
                (click)="pagesSubTab.set('home_sections')"
              >
                ▦ Homepage Sections ({{ sections.length }})
              </button>
              <button
                type="button"
                [class.active]="pagesSubTab() === 'about_page'"
                (click)="pagesSubTab.set('about_page')"
              >
                📖 About Page / Story
              </button>
              <button
                type="button"
                [class.active]="pagesSubTab() === 'contact_page'"
                (click)="pagesSubTab.set('contact_page')"
              >
                ✉ Contact Page & Form
              </button>
            </div>

            <!-- SUB-TAB 1: HOMEPAGE SECTIONS BUILDER -->
            @if (pagesSubTab() === 'home_sections') {
              <div class="section-builder-toolbar">
                <p>Drag, reorder, and configure the sections that appear on your storefront homepage.</p>
                <div class="add-section-dropdown">
                  <button type="button" class="btn add-btn" (click)="showAddSection = !showAddSection">
                    ＋ Add Section
                  </button>
                  @if (showAddSection) {
                    <div class="add-section-menu card">
                      <div class="menu-head">Choose section type:</div>
                      <button (click)="addSectionByType('banner')"><span>▰</span> Promo Image Banner</button>
                      <button (click)="addSectionByType('production')"><span>⚙</span> Workshop & Production Steps</button>
                      <button (click)="addSectionByType('gallery')"><span>▦</span> Studio Photo Gallery</button>
                      <button (click)="addSectionByType('rich_text')"><span>¶</span> Brand Story / Narrative</button>
                      <button (click)="addSectionByType('featured_products')"><span>❖</span> Featured Products Grid</button>
                      <button (click)="addSectionByType('trust_bar')"><span>✓</span> Trust & Guarantees Bar</button>
                      <button (click)="addSectionByType('contact_card')"><span>📍</span> Quick Contact Card</button>
                      <button (click)="addSectionByType('newsletter')"><span>✉</span> Newsletter Signup</button>
                    </div>
                  }
                </div>
              </div>

              <div class="sections-stack">
                @for (sec of sections; track sec.id; let i = $index) {
                  <article class="card section-card" [class.off]="!sec.enabled">
                    <div class="sec-header">
                      <div class="sec-left">
                        <span class="sec-icon">{{ sectionIcon(sec.type) }}</span>
                        <div>
                          <strong>{{ sectionLabel(sec.type) }}</strong>
                          <small>{{ sec.title || 'Untitled section' }}</small>
                        </div>
                      </div>

                      <div class="sec-controls">
                        <button type="button" class="icon-btn" (click)="move(i, -1)" [disabled]="i === 0" title="Move up">↑</button>
                        <button type="button" class="icon-btn" (click)="move(i, 1)" [disabled]="i === sections.length - 1" title="Move down">↓</button>
                        <button type="button" class="btn-toggle" [class.on]="sec.enabled" (click)="sec.enabled = !sec.enabled">
                          {{ sec.enabled ? 'Active' : 'Off' }}
                        </button>
                        <button type="button" class="icon-btn trash" (click)="sections.splice(i, 1)" title="Delete section">×</button>
                      </div>
                    </div>

                    <!-- Expandable Section Settings -->
                    <div class="sec-body">
                      <div class="field-grid">
                        <div class="field">
                          <label>Section Badge / Overline</label>
                          <input [(ngModel)]="sec.badge" placeholder="e.g. OUR CRAFT" />
                        </div>
                        <div class="field">
                          <label>Section Heading</label>
                          <input [(ngModel)]="sec.title" placeholder="Heading text" />
                        </div>
                        <div class="field full">
                          <label>Subtitle or Narrative</label>
                          <textarea rows="2" [(ngModel)]="sec.subtitle" placeholder="Supporting text or description"></textarea>
                        </div>

                        <!-- Special Fields for Production Section -->
                        @if (sec.type === 'production') {
                          <div class="field full production-editor">
                            <label>Workshop / Craft Image</label>
                            <div class="media-upload-row">
                              <img [src]="sec.image_url || 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=400&q=80'" class="sec-inline-thumb" alt="Craft preview" />
                              <div class="media-actions">
                                <div class="upload-dropzone">
                                  <input type="file" accept="image/*" (change)="onSectionImageUpload($event, sec)" [id]="'prod_img_' + sec.id" />
                                  <label [for]="'prod_img_' + sec.id" class="upload-btn-label">
                                    <span>Upload Workshop Photo</span>
                                  </label>
                                </div>
                                <input [(ngModel)]="sec.image_url" placeholder="Or image URL" style="margin-top: 6px;" />
                              </div>
                            </div>

                            <div class="steps-builder">
                              <div class="steps-head">
                                <strong>Production Steps ({{ (sec.steps || []).length }})</strong>
                                <button type="button" class="btn-text-sm" (click)="addStepToSection(sec)">＋ Add Step</button>
                              </div>
                              @for (step of (sec.steps || []); track $index; let sIdx = $index) {
                                <div class="step-builder-row">
                                  <span class="step-num-pill">0{{ sIdx + 1 }}</span>
                                  <input [(ngModel)]="step.title" placeholder="Step title (e.g. Ethical Sourcing)" class="step-title-input" />
                                  <input [(ngModel)]="step.description" placeholder="Short description" class="step-desc-input" />
                                  <button type="button" class="trash-sm" (click)="sec.steps?.splice(sIdx, 1)">×</button>
                                </div>
                              }
                            </div>
                          </div>
                        }

                        <!-- Special Fields for Gallery Section -->
                        @if (sec.type === 'gallery') {
                          <div class="field full gallery-editor">
                            <div class="steps-head">
                              <strong>Gallery Images ({{ (sec.items || []).length }})</strong>
                              <button type="button" class="btn-text-sm" (click)="addGalleryItem(sec)">＋ Add Photo</button>
                            </div>
                            <div class="gallery-items-grid">
                              @for (item of (sec.items || []); track $index; let gIdx = $index) {
                                <div class="gallery-item-card">
                                  <img [src]="item.image || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=300&q=80'" alt="Gallery item" />
                                  <input [(ngModel)]="item.title" placeholder="Photo caption" />
                                  <input [(ngModel)]="item.image" placeholder="Image URL" />
                                  <button type="button" class="trash-sm" (click)="sec.items?.splice(gIdx, 1)">Remove</button>
                                </div>
                              }
                            </div>
                          </div>
                        }

                        <!-- Special Fields for Banner Section -->
                        @if (sec.type === 'banner') {
                          <div class="field">
                            <label>Button Label</label>
                            <input [(ngModel)]="sec.button_text" placeholder="Explore now" />
                          </div>
                          <div class="field">
                            <label>Button Link</label>
                            <input [(ngModel)]="sec.button_link" placeholder="#catalogue" />
                          </div>
                          <div class="field full">
                            <label>Banner Background Photo</label>
                            <div class="media-upload-row">
                              <img [src]="sec.image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80'" class="sec-inline-thumb" alt="Banner preview" />
                              <div class="media-actions">
                                <div class="upload-dropzone">
                                  <input type="file" accept="image/*" (change)="onSectionImageUpload($event, sec)" [id]="'banner_img_' + sec.id" />
                                  <label [for]="'banner_img_' + sec.id" class="upload-btn-label">
                                    <span>Upload Banner Background</span>
                                  </label>
                                </div>
                                <input [(ngModel)]="sec.image_url" placeholder="Or background URL" style="margin-top: 6px;" />
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  </article>
                }
              </div>
            }

            <!-- SUB-TAB 2: ABOUT US PAGE BUILDER -->
            @if (pagesSubTab() === 'about_page') {
              <div class="card block">
                <div class="block-head">
                  <div class="head-flex">
                    <div>
                      <h3>About Page Settings</h3>
                      <p>Customers can learn about your story, heritage, and crafting philosophy.</p>
                    </div>
                    <label class="toggle-sm">
                      <input type="checkbox" [(ngModel)]="aboutConfig.enabled" />
                      <span></span>
                      <em>{{ aboutConfig.enabled ? 'Enabled in Menu' : 'Disabled' }}</em>
                    </label>
                  </div>
                </div>

                <div class="field-grid">
                  <div class="field">
                    <label>Navigation Link Label</label>
                    <input [(ngModel)]="aboutConfig.nav_label" placeholder="Our story" />
                  </div>
                  <div class="field">
                    <label>About Hero Title</label>
                    <input [(ngModel)]="aboutConfig.hero_title" placeholder="The Story Behind Northstar" />
                  </div>
                  <div class="field full">
                    <label>About Hero Subtitle</label>
                    <textarea rows="2" [(ngModel)]="aboutConfig.hero_subtitle" placeholder="Thoughtfully created goods with dedication to enduring craftsmanship."></textarea>
                  </div>
                </div>

                <div class="media-upload-row" style="margin-top: 15px;">
                  <div class="media-thumb banner-thumb">
                    <img [src]="aboutConfig.cover_image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80'" alt="Cover" />
                  </div>
                  <div class="media-actions">
                    <div class="upload-dropzone">
                      <input type="file" accept="image/*" (change)="onAboutImageUpload($event, 'cover')" id="aboutCoverInput" />
                      <label for="aboutCoverInput" class="upload-btn-label">
                        <span>Upload About Cover Banner</span>
                      </label>
                    </div>
                    <input [(ngModel)]="aboutConfig.cover_image" placeholder="Or cover image URL" style="margin-top: 8px;" />
                  </div>
                </div>
              </div>

              <!-- Brand Story Narrative Block -->
              <div class="card block">
                <div class="block-head">
                  <h3>Story & Heritage Narrative</h3>
                  <p>Share your beginnings, team values, and what drives your studio.</p>
                </div>

                <div class="field-grid">
                  <div class="field">
                    <label>Story Heading</label>
                    <input [(ngModel)]="aboutConfig.story_title" placeholder="How We Began" />
                  </div>
                  <div class="field full">
                    <label>Story Text / Narrative</label>
                    <textarea rows="5" [(ngModel)]="aboutConfig.story_body" placeholder="Describe the journey, workshop philosophy, and materials used…"></textarea>
                  </div>
                </div>

                <div class="media-upload-row" style="margin-top: 15px;">
                  <div class="media-thumb">
                    <img [src]="aboutConfig.story_image || 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=400&q=80'" alt="Story photo" />
                  </div>
                  <div class="media-actions">
                    <div class="upload-dropzone">
                      <input type="file" accept="image/*" (change)="onAboutImageUpload($event, 'story')" id="aboutStoryInput" />
                      <label for="aboutStoryInput" class="upload-btn-label">
                        <span>Upload Story Photo</span>
                      </label>
                    </div>
                    <input [(ngModel)]="aboutConfig.story_image" placeholder="Or story image URL" style="margin-top: 8px;" />
                  </div>
                </div>
              </div>

              <!-- Craftsmanship & Production Section in About Page -->
              <div class="card block">
                <div class="block-head">
                  <h3>Production & Craft Section</h3>
                  <p>Display your workshop process and small-batch craftsmanship in the About page.</p>
                </div>

                <div class="field-grid">
                  <div class="field">
                    <label>Craft Section Title</label>
                    <input [(ngModel)]="aboutConfig.craft_title" placeholder="Production & Artistry" />
                  </div>
                  <div class="field full">
                    <label>Craft Philosophy Description</label>
                    <textarea rows="3" [(ngModel)]="aboutConfig.craft_body" placeholder="Explain the methods, sourcing, and precision behind every piece…"></textarea>
                  </div>
                </div>

                <div class="media-upload-row" style="margin-top: 15px;">
                  <div class="media-thumb">
                    <img [src]="aboutConfig.craft_image || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80'" alt="Workshop photo" />
                  </div>
                  <div class="media-actions">
                    <div class="upload-dropzone">
                      <input type="file" accept="image/*" (change)="onAboutImageUpload($event, 'craft')" id="aboutCraftInput" />
                      <label for="aboutCraftInput" class="upload-btn-label">
                        <span>Upload Workshop / Process Photo</span>
                      </label>
                    </div>
                    <input [(ngModel)]="aboutConfig.craft_image" placeholder="Or workshop photo URL" style="margin-top: 8px;" />
                  </div>
                </div>
              </div>
            }

            <!-- SUB-TAB 3: CONTACT PAGE BUILDER -->
            @if (pagesSubTab() === 'contact_page') {
              <div class="card block">
                <div class="block-head">
                  <div class="head-flex">
                    <div>
                      <h3>Contact Page & Customer Inquiries</h3>
                      <p>Customers can find your details and send questions directly to your store.</p>
                    </div>
                    <label class="toggle-sm">
                      <input type="checkbox" [(ngModel)]="contactConfig.enabled" />
                      <span></span>
                      <em>{{ contactConfig.enabled ? 'Enabled in Menu' : 'Disabled' }}</em>
                    </label>
                  </div>
                </div>

                <div class="field-grid">
                  <div class="field">
                    <label>Navigation Link Label</label>
                    <input [(ngModel)]="contactConfig.nav_label" placeholder="Contact" />
                  </div>
                  <div class="field">
                    <label>Page Heading</label>
                    <input [(ngModel)]="contactConfig.title" placeholder="Contact Northstar" />
                  </div>
                  <div class="field full">
                    <label>Page Intro Subtitle</label>
                    <textarea rows="2" [(ngModel)]="contactConfig.subtitle" placeholder="Have a question about products or shipping? Reach out to us directly."></textarea>
                  </div>
                  <div class="field">
                    <label>Public Support Email</label>
                    <input type="email" [(ngModel)]="s.contact_email" placeholder="hello@store.markethub.test" />
                  </div>
                  <div class="field">
                    <label>Support Phone</label>
                    <input [(ngModel)]="s.contact_phone" placeholder="+1 (555) 019-2834" />
                  </div>
                  <div class="field full">
                    <label>Studio / Showroom Address</label>
                    <input [(ngModel)]="s.address_line" placeholder="Market Square Atelier, Suite 10" />
                  </div>
                  <div class="field">
                    <label>City</label>
                    <input [(ngModel)]="s.city" placeholder="Accra" />
                  </div>
                  <div class="field">
                    <label>Operating / Care Hours</label>
                    <input [(ngModel)]="contactConfig.hours" placeholder="Monday – Friday: 9am – 6pm" />
                  </div>
                </div>
              </div>
            }
          }

          <!-- ================= TAB 3: BRAND & THEME ================= -->
          @if (tab() === 'design') {
            <section class="panel-title">
              <div>
                <p class="eyebrow">Visual Styling</p>
                <h2>Brand Colors, Typography & Logo</h2>
                <p>Customize the palette, fonts, and store insignia.</p>
              </div>
            </section>

            <div class="card block">
              <div class="block-head">
                <h3>Storefront Logo & Cover</h3>
                <p>Your brand logo appears in the top navigation; the banner cover appears across headers.</p>
              </div>

              <div class="media-upload-row">
                <div class="media-thumb logo-thumb" [style.background]="theme.primary_color || '#1f4b3a'">
                  @if (s.logo_path || theme.logo_image) {
                    <img [src]="s.logo_path || theme.logo_image" alt="Logo preview" />
                  } @else {
                    <span>{{ initials(s.name) }}</span>
                  }
                </div>
                <div class="media-actions">
                  <div class="upload-dropzone">
                    <input type="file" accept="image/*" (change)="onMediaFileSelect($event, 'logo')" id="logoInput" />
                    <label for="logoInput" class="upload-btn-label">
                      <span>📁 Upload Brand Logo</span>
                      <small>Square or transparent PNG recommended</small>
                    </label>
                  </div>
                  <input [(ngModel)]="s.logo_path" placeholder="Or logo image URL" style="margin-top: 8px;" />
                </div>
              </div>
            </div>

            <div class="card block">
              <div class="block-head">
                <h3>Brand Colors</h3>
                <p>Define the signature colors applied to buttons, headers, and highlights.</p>
              </div>

              <div class="color-picker-grid">
                <div class="color-box">
                  <label>Primary Brand Color</label>
                  <div class="color-row">
                    <input type="color" [(ngModel)]="theme.primary_color" />
                    <input type="text" [(ngModel)]="theme.primary_color" />
                  </div>
                </div>

                <div class="color-box">
                  <label>Accent Highlight Color</label>
                  <div class="color-row">
                    <input type="color" [(ngModel)]="theme.accent_color" />
                    <input type="text" [(ngModel)]="theme.accent_color" />
                  </div>
                </div>

                <div class="color-box">
                  <label>Page Background Tone</label>
                  <div class="color-row">
                    <input type="color" [(ngModel)]="theme.surface_color" />
                    <input type="text" [(ngModel)]="theme.surface_color" />
                  </div>
                </div>
              </div>

              <div class="field" style="margin-top: 20px;">
                <label>Typography Style</label>
                <select [(ngModel)]="theme.font">
                  <option value="modern">Modern Sans (Clean & Functional)</option>
                  <option value="editorial">Editorial Serif (Artisan & Heritage)</option>
                  <option value="friendly">Friendly Rounded (Warm & Approachable)</option>
                </select>
              </div>
            </div>
          }

          <!-- ================= TAB 4: COMMERCE & FULFILLMENT ================= -->
          @if (tab() === 'commerce') {
            <section class="panel-title">
              <div>
                <p class="eyebrow">Operations</p>
                <h2>Commerce & Delivery</h2>
                <p>Configure pricing, taxes and delivery rates for this storefront.</p>
              </div>
              <a class="btn ghost" routerLink="/tenant/products" [queryParams]="{store_id: s.id}">Open products ↗</a>
            </section>

            <div class="card block">
              <div class="field-grid">
                <div class="field">
                  <label>Currency</label>
                  <select [(ngModel)]="s.currency">
                    <option>USD</option><option>EUR</option><option>GBP</option><option>GHS</option><option>NGN</option><option>ZAR</option>
                  </select>
                </div>
                <div class="field">
                  <label>Standard Delivery Fee</label>
                  <input type="number" min="0" step=".01" [(ngModel)]="s.delivery_fee" />
                </div>
                <div class="field">
                  <label>Estimated Delivery (Days)</label>
                  <input type="number" min="0" [(ngModel)]="s.delivery_days" />
                </div>
                <label class="toggle full">
                  <input type="checkbox" [(ngModel)]="s.tax_inclusive" />
                  <span></span>
                  <div>
                    <strong>Tax-inclusive pricing</strong>
                    <small>Product prices already include applicable sales tax</small>
                  </div>
                </label>
              </div>
            </div>

            <div class="catalog-card card">
              <div>
                <span class="icon">▦</span>
                <div>
                  <h3>{{ s.products_count || 0 }} products in catalogue</h3>
                  <p>Manage your inventory, price variants, and product images in the Products studio.</p>
                </div>
              </div>
              <a class="btn ok" routerLink="/tenant/products" [queryParams]="{store_id: s.id}">Manage catalogue</a>
            </div>
          }

          <!-- ================= TAB 5: ACCESS & SEO ================= -->
          @if (tab() === 'access') {
            <section class="panel-title">
              <div>
                <p class="eyebrow">Customers & SEO</p>
                <h2>Customer Accounts & SEO</h2>
                <p>Control customer accounts, guest checkouts, and search listings.</p>
              </div>
            </section>

            <div class="card block access-list">
              <label class="setting">
                <div>
                  <span>◎</span>
                  <div>
                    <strong>Customer Accounts</strong>
                    <p>Allow shoppers to create an account or sign in to track orders.</p>
                  </div>
                </div>
                <input type="checkbox" [(ngModel)]="s.customer_accounts_enabled" />
              </label>

              <label class="setting">
                <div>
                  <span>⚡</span>
                  <div>
                    <strong>Guest Checkout</strong>
                    <p>Allow frictionless purchases without mandatory account sign-up.</p>
                  </div>
                </div>
                <input type="checkbox" [(ngModel)]="s.guest_checkout_enabled" />
              </label>
            </div>

            <div class="card block">
              <div class="block-head">
                <h3>Search Engine Optimization (SEO)</h3>
                <p>Customize how your store appears in Google and shared links.</p>
              </div>
              <div class="field">
                <label>Page Title · {{ (s.seo_title || '').length }}/70</label>
                <input maxlength="70" [(ngModel)]="s.seo_title" [placeholder]="s.name + ' — Online Store'" />
              </div>
              <div class="field">
                <label>Meta Description · {{ (s.seo_description || '').length }}/170</label>
                <textarea maxlength="170" rows="3" [(ngModel)]="s.seo_description" placeholder="A brief description for search engines…"></textarea>
              </div>
            </div>
          }

          <!-- ================= TAB 6: STORE SETUP & ESSENTIALS ================= -->
          @if (tab() === 'setup') {
            <section class="panel-title">
              <div>
                <p class="eyebrow">Essentials</p>
                <h2>Storefront Identity</h2>
                <p>Manage public name, address, and unique URL slug.</p>
              </div>
            </section>

            <div class="card block">
              <div class="field-grid">
                <div class="field">
                  <label>Store Name</label>
                  <input [(ngModel)]="s.name" />
                </div>
                <div class="field">
                  <label>Store URL Slug</label>
                  <div class="url-field">
                    <span>{{ origin }}/stores/</span>
                    <input [(ngModel)]="s.slug" />
                  </div>
                </div>
                <div class="field full">
                  <label>Store Description</label>
                  <textarea rows="3" [(ngModel)]="s.description"></textarea>
                </div>
                <div class="field">
                  <label>Contact Email</label>
                  <input type="email" [(ngModel)]="s.contact_email" />
                </div>
                <div class="field">
                  <label>Contact Phone</label>
                  <input [(ngModel)]="s.contact_phone" />
                </div>
                <div class="field">
                  <label>City</label>
                  <input [(ngModel)]="s.city" />
                </div>
                <div class="field">
                  <label>Country Code</label>
                  <input maxlength="2" [(ngModel)]="s.country" placeholder="GH" />
                </div>
              </div>
            </div>

            <div class="card block danger-zone">
              <div>
                <h3>Delete Storefront</h3>
                <p>Deletes this storefront. Attached products and data will be permanently removed.</p>
              </div>
              <button class="btn danger" (click)="remove()">Delete Store</button>
            </div>
          }

          <footer class="save-bar">
            <span>{{ dirtyHint }}</span>
            <button class="btn publish" (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Saving…' : 'Save all changes' }}
            </button>
          </footer>
        </main>

        <!-- RIGHT: INTERACTIVE LIVE PREVIEW PANEL -->
        <aside class="preview-panel">
          <div class="preview-header">
            <div class="preview-tabs">
              <button type="button" [class.on]="previewPage() === 'home'" (click)="previewPage.set('home')">Home</button>
              <button type="button" [class.on]="previewPage() === 'about'" (click)="previewPage.set('about')">About</button>
              <button type="button" [class.on]="previewPage() === 'contact'" (click)="previewPage.set('contact')">Contact</button>
            </div>

            <div class="viewport-toggle">
              <button type="button" [class.on]="previewDevice() === 'desktop'" (click)="previewDevice.set('desktop')">💻</button>
              <button type="button" [class.on]="previewDevice() === 'mobile'" (click)="previewDevice.set('mobile')">📱</button>
            </div>
          </div>

          <div class="browser-frame" [class.mobile]="previewDevice() === 'mobile'">
            <div class="browser-bar">
              <i></i><i></i><i></i>
              <span>/stores/{{ s.slug }}{{ previewPage() !== 'home' ? '?page=' + previewPage() : '' }}</span>
            </div>

            <div
              class="mock-viewport"
              [style.--primary]="theme.primary_color || '#1f4b3a'"
              [style.--accent]="theme.accent_color || '#c45c26'"
              [class.editorial]="theme.font === 'editorial'"
              [class.friendly]="theme.font === 'friendly'"
            >
              <!-- Mock Nav -->
              <div class="mock-nav">
                <b>{{ s.name }}</b>
                <div class="mock-links">
                  <span [class.active]="previewPage() === 'home'">Home</span>
                  <span>Shop</span>
                  <span [class.active]="previewPage() === 'about'">Our story</span>
                  <span [class.active]="previewPage() === 'contact'">Contact</span>
                </div>
              </div>

              <!-- PREVIEW: ABOUT PAGE -->
              @if (previewPage() === 'about') {
                <div class="mock-about">
                  <div class="mock-about-hero">
                    <small>OUR STORY</small>
                    <h4>{{ aboutConfig.hero_title || ('The Story Behind ' + s.name) }}</h4>
                    <p>{{ aboutConfig.hero_subtitle || 'Dedicated to enduring craftsmanship.' }}</p>
                  </div>
                  <div class="mock-story-row">
                    <div>
                      <h5>{{ aboutConfig.story_title || 'How We Began' }}</h5>
                      <p>{{ aboutConfig.story_body || s.description || 'We founded our workshop with a simple vision: create purposeful, beautiful items.' }}</p>
                    </div>
                    <img [src]="aboutConfig.story_image || s.banner_path || 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=300&q=80'" alt="Story" />
                  </div>
                </div>
              }

              <!-- PREVIEW: CONTACT PAGE -->
              @else if (previewPage() === 'contact') {
                <div class="mock-contact">
                  <h4>{{ contactConfig.title || ('Contact ' + s.name) }}</h4>
                  <p>{{ contactConfig.subtitle || 'Reach out to our studio team directly.' }}</p>
                  <div class="mock-contact-info">
                    <span>✉ {{ s.contact_email || 'hello@store.markethub.test' }}</span>
                    <span>📍 {{ s.city || 'Studio Atelier' }}{{ s.country ? ', ' + s.country : '' }}</span>
                  </div>
                  <div class="mock-form-box">
                    <small>Interactive Shopper Contact Form</small>
                    <div class="mock-field"></div>
                    <div class="mock-field"></div>
                    <button class="mock-btn">Send Message</button>
                  </div>
                </div>
              }

              <!-- PREVIEW: HOMEPAGE -->
              @else {
                <!-- Mock Hero -->
                <div class="mock-hero" [class.centered]="heroSection.layout === 'centered'" [class.full]="heroSection.layout === 'full_banner'">
                  <div class="mock-hero-text">
                    <small>{{ heroSection.badge || ('WELCOME TO ' + s.name) }}</small>
                    <h3>{{ heroSection.title || s.name }}</h3>
                    <p>{{ heroSection.subtitle || s.description || 'Thoughtfully selected products.' }}</p>
                    <button class="mock-btn">{{ heroSection.button_text || 'Shop the collection' }}</button>
                  </div>
                  @if (heroSection.layout !== 'centered' && heroSection.layout !== 'full_banner') {
                    <div class="mock-hero-img">
                      <img [src]="heroSection.image_url || '/images/market-shopper.jpg'" alt="Hero" />
                    </div>
                  }
                </div>

                <!-- Mock Trust -->
                <div class="mock-trust">
                  <span>✓ Secure checkout</span>
                  <span>↗ Reliable delivery</span>
                  <span>★ Verified ratings</span>
                </div>

                <!-- Mock Catalogue -->
                <div class="mock-catalogue">
                  <small>FEATURED COLLECTION</small>
                  <div class="mock-grid">
                    <div><span></span><b>Product Item 1</b><em>$49.00</em></div>
                    <div><span></span><b>Product Item 2</b><em>$79.00</em></div>
                  </div>
                </div>

                <!-- Mock Promo Banner (if enabled) -->
                @if (bannerSection.enabled) {
                  <div class="mock-banner" [style.background-image]="'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(' + (bannerSection.image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80') + ')'">
                    <small>{{ bannerSection.badge || 'PROMOTION' }}</small>
                    <h5>{{ bannerSection.title || 'Limited Edition Collection' }}</h5>
                  </div>
                }
              }
            </div>
          </div>
        </aside>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      max-width: 1440px;
      margin: auto;
      padding: 0 16px 80px;
    }
    .loading {
      display: grid;
      place-items: center;
      padding: 120px 20px;
      gap: 12px;
      color: #666;
    }
    .loading span {
      width: 38px;
      height: 38px;
      border: 3px solid #e0ded7;
      border-top-color: #1f4b3a;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Header */
    .editor-head {
      margin-bottom: 24px;
      padding-top: 10px;
    }
    .crumbs {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #727a72;
      font-size: 13px;
      margin-bottom: 14px;
    }
    .crumbs a {
      color: #1f4b3a;
      text-decoration: none;
      font-weight: 600;
    }
    .head-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .identity {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo-box {
      width: 54px;
      height: 54px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      color: white;
      font: 700 18px 'Fraunces', Georgia, serif;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      flex-shrink: 0;
    }
    .head-logo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .name-status {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .name-status h1 {
      margin: 0;
      font-size: 26px;
      letter-spacing: -0.02em;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 20px;
      background: #f1ede4;
      font-size: 11px;
      font-weight: 700;
      color: #616861;
    }
    .status-pill i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #eab308;
    }
    .status-pill.live {
      background: #dcfce7;
      color: #15803d;
    }
    .status-pill.live i {
      background: #22c55e;
    }
    .store-url {
      margin: 4px 0 0;
      font-size: 12px;
      color: #727a72;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ext-link {
      color: #1f4b3a;
      text-decoration: underline;
      font-weight: 600;
    }
    .top-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn {
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn.ghost {
      border-color: #dcd8cf;
      background: transparent;
      color: #2b312b;
    }
    .btn.publish {
      background: #c45c26;
      color: white;
    }
    .btn.save-main {
      background: #1f4b3a;
      color: white;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Alerts */
    .alert {
      position: fixed;
      right: 25px;
      top: 20px;
      z-index: 100;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      font-size: 13px;
      font-weight: 700;
      animation: fadeIn 0.3s ease;
    }
    .alert.saved { background: #15803d; color: white; }
    .alert.error { background: #dc2626; color: white; }

    /* Main Grid */
    .workspace {
      display: grid;
      grid-template-columns: 240px minmax(0, 1.25fr) minmax(0, 1fr);
      gap: 20px;
      align-items: start;
    }

    /* Left Nav */
    .side {
      position: sticky;
      top: 20px;
      padding: 10px;
      border-radius: 16px;
      background: white;
      border: 1px solid #ebe8e1;
    }
    .side-eyebrow {
      margin: 8px 12px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #8c948c;
    }
    .side button {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 11px 12px;
      border: 0;
      border-radius: 12px;
      background: transparent;
      color: #2b312b;
      text-align: left;
      cursor: pointer;
      margin-bottom: 3px;
      transition: background 0.15s;
    }
    .side button:hover {
      background: #f7f6f2;
    }
    .side button.active {
      background: #1f4b3a;
      color: white;
    }
    .tab-icon {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: #f3f1eb;
      color: #2b312b;
      font-size: 14px;
      flex-shrink: 0;
    }
    .side button.active .tab-icon {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }
    .side button div {
      flex: 1;
      display: grid;
      gap: 2px;
    }
    .side button strong {
      font-size: 13px;
    }
    .side button small {
      font-size: 10px;
      color: #727a72;
    }
    .side button.active small {
      color: rgba(255, 255, 255, 0.75);
    }
    .chevron {
      font-size: 16px;
      opacity: 0.5;
    }
    .side-foot {
      display: flex;
      align-items: center;
      gap: 10px;
      border-top: 1px solid #ebe8e1;
      margin-top: 12px;
      padding: 14px 10px 4px;
    }
    .side-foot .pct {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #f3f1eb;
      font-size: 11px;
      font-weight: 800;
    }
    .side-foot div {
      flex: 1;
    }
    .side-foot strong {
      font-size: 11px;
    }
    .bar {
      height: 4px;
      background: #f1ede4;
      border-radius: 4px;
      margin-top: 4px;
      overflow: hidden;
    }
    .bar i {
      display: block;
      height: 100%;
      background: #1f4b3a;
    }

    /* Panels & Cards */
    .panel-title {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 18px;
    }
    .eyebrow {
      margin: 0 0 4px;
      color: #c45c26;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .panel-title h2 {
      margin: 0;
      font-size: 24px;
    }
    .panel-title p:not(.eyebrow) {
      margin: 4px 0 0;
      color: #727a72;
      font-size: 13px;
    }
    .card.block {
      background: white;
      border: 1px solid #ebe8e1;
      border-radius: 18px;
      padding: 22px;
      margin-bottom: 18px;
    }
    .block-head {
      border-bottom: 1px solid #f1ede4;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .block-head h3 {
      margin: 0;
      font-size: 16px;
    }
    .block-head p {
      margin: 3px 0 0;
      color: #727a72;
      font-size: 12px;
    }
    .head-flex {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Subtabs */
    .subtabs-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      background: #f3f1eb;
      padding: 4px;
      border-radius: 12px;
    }
    .subtabs-bar button {
      flex: 1;
      padding: 9px 12px;
      border: 0;
      border-radius: 9px;
      background: transparent;
      font-size: 12px;
      font-weight: 700;
      color: #555d55;
      cursor: pointer;
      transition: all 0.2s;
    }
    .subtabs-bar button.active {
      background: white;
      color: #1f4b3a;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }

    /* Layout Selection Cards */
    .layout-choice-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .layout-card {
      border: 2px solid #ebe8e1;
      border-radius: 14px;
      background: white;
      padding: 12px;
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: all 0.2s;
    }
    .layout-card:hover {
      border-color: #c45c26;
    }
    .layout-card.active {
      border-color: #1f4b3a;
      background: #f9fbf9;
    }
    .layout-preview {
      height: 48px;
      border-radius: 8px;
      background: #f3f1eb;
      padding: 6px;
      margin-bottom: 4px;
      display: flex;
      gap: 6px;
    }
    .split-preview div:first-child { flex: 1.2; background: #e2dfd7; border-radius: 4px; }
    .split-preview div:last-child { flex: 1; background: #cdd6cd; border-radius: 4px; }
    .full-preview div { flex: 1; background: #cdd6cd; border-radius: 4px; }
    .centered-preview div { width: 60%; margin: auto; height: 100%; background: #e2dfd7; border-radius: 4px; }
    .layout-card strong { font-size: 12px; }
    .layout-card small { font-size: 10px; color: #727a72; }

    /* Media Upload Rows */
    .media-upload-row {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .media-thumb {
      width: 140px;
      height: 95px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2dfd7;
      flex-shrink: 0;
      background: #f9f8f5;
    }
    .media-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .media-thumb.banner-thumb {
      width: 180px;
      height: 75px;
    }
    .media-thumb.logo-thumb {
      width: 75px;
      height: 75px;
      display: grid;
      place-items: center;
      color: white;
      font: 700 20px Georgia, serif;
    }
    .media-actions {
      flex: 1;
    }
    .upload-dropzone input {
      display: none;
    }
    .upload-btn-label {
      display: inline-flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 16px;
      border: 2px dashed #dcd8cf;
      border-radius: 10px;
      background: #faf8f5;
      cursor: pointer;
      transition: all 0.2s;
    }
    .upload-btn-label:hover {
      border-color: #1f4b3a;
      background: #f5f8f5;
    }
    .upload-btn-label span {
      font-size: 12px;
      font-weight: 700;
      color: #1f4b3a;
    }
    .upload-btn-label small {
      font-size: 10px;
      color: #727a72;
    }

    /* Form Fields */
    .field-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .field.full {
      grid-column: 1 / -1;
    }
    .field label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: #3b423b;
      margin-bottom: 5px;
    }
    .field input, .field textarea, .field select {
      width: 100%;
      padding: 9px 12px;
      border: 1px solid #dcd8cf;
      border-radius: 9px;
      font-size: 13px;
      background: #fdfcfb;
      color: #191b18;
      box-sizing: border-box;
      font-family: inherit;
    }
    .field input:focus, .field textarea:focus, .field select:focus {
      outline: 0;
      border-color: #1f4b3a;
      background: white;
    }
    .url-field {
      display: flex;
      align-items: center;
      border: 1px solid #dcd8cf;
      border-radius: 9px;
      overflow: hidden;
      background: #fdfcfb;
    }
    .url-field span {
      padding-left: 10px;
      font-size: 11px;
      color: #727a72;
      white-space: nowrap;
    }
    .url-field input {
      border: 0;
      background: transparent;
    }

    /* Toggles */
    .toggle-sm {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    .toggle-sm input { display: none; }
    .toggle-sm span {
      position: relative;
      width: 34px;
      height: 20px;
      border-radius: 20px;
      background: #e2dfd7;
      transition: 0.2s;
    }
    .toggle-sm span::after {
      content: '';
      position: absolute;
      left: 2px;
      top: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: white;
      transition: 0.2s;
    }
    .toggle-sm input:checked + span { background: #1f4b3a; }
    .toggle-sm input:checked + span::after { transform: translateX(14px); }
    .toggle-sm em { font-style: normal; color: #555d55; }

    /* Section Builder Toolbar & Stack */
    .section-builder-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      gap: 14px;
    }
    .section-builder-toolbar p {
      margin: 0;
      font-size: 12px;
      color: #727a72;
    }
    .add-section-dropdown {
      position: relative;
    }
    .add-btn {
      background: #1f4b3a;
      color: white;
    }
    .add-section-menu {
      position: absolute;
      right: 0;
      top: 42px;
      z-index: 50;
      width: 240px;
      background: white;
      border: 1px solid #ebe8e1;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      padding: 6px;
    }
    .menu-head {
      font-size: 10px;
      font-weight: 800;
      color: #8c948c;
      padding: 6px 8px;
      text-transform: uppercase;
    }
    .add-section-menu button {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      font-size: 12px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
    }
    .add-section-menu button:hover {
      background: #f4f2ec;
    }

    .sections-stack {
      display: grid;
      gap: 12px;
    }
    .section-card {
      background: white;
      border: 1px solid #ebe8e1;
      border-radius: 16px;
      padding: 16px;
      transition: opacity 0.2s;
    }
    .section-card.off {
      opacity: 0.6;
      background: #faf8f5;
    }
    .sec-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f3f1eb;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .sec-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sec-icon {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: #f3f1eb;
      font-size: 14px;
    }
    .sec-left strong {
      display: block;
      font-size: 13px;
    }
    .sec-left small {
      font-size: 11px;
      color: #727a72;
    }
    .sec-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .icon-btn {
      width: 28px;
      height: 28px;
      border: 1px solid #dcd8cf;
      border-radius: 7px;
      background: white;
      font-size: 12px;
      cursor: pointer;
    }
    .icon-btn.trash {
      color: #dc2626;
    }
    .btn-toggle {
      padding: 4px 10px;
      border: 1px solid #dcd8cf;
      border-radius: 7px;
      background: transparent;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-toggle.on {
      background: #1f4b3a;
      color: white;
      border-color: #1f4b3a;
    }

    /* Production and Gallery Inner Builders */
    .production-editor, .gallery-editor {
      background: #fbfaf8;
      border: 1px solid #ebe8e1;
      border-radius: 12px;
      padding: 14px;
      margin-top: 6px;
    }
    .sec-inline-thumb {
      width: 80px;
      height: 60px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #dcd8cf;
    }
    .steps-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 12px 0 8px;
      font-size: 12px;
    }
    .btn-text-sm {
      background: none;
      border: 0;
      color: #1f4b3a;
      font-weight: 700;
      font-size: 11px;
      cursor: pointer;
    }
    .step-builder-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .step-num-pill {
      font-size: 11px;
      font-weight: 800;
      background: #1f4b3a;
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
    }
    .step-title-input { flex: 1.2; }
    .step-desc-input { flex: 2; }
    .trash-sm {
      background: none;
      border: 0;
      color: #dc2626;
      font-weight: 700;
      cursor: pointer;
    }
    .gallery-items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }
    .gallery-item-card {
      border: 1px solid #dcd8cf;
      border-radius: 8px;
      padding: 6px;
      background: white;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .gallery-item-card img {
      width: 100%;
      height: 70px;
      object-fit: cover;
      border-radius: 4px;
    }
    .gallery-item-card input {
      font-size: 10px;
      padding: 4px;
    }

    /* Color Pickers */
    .color-picker-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .color-box label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .color-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .color-row input[type=color] {
      width: 38px;
      height: 36px;
      border: 0;
      background: none;
      padding: 0;
      cursor: pointer;
    }
    .color-row input[type=text] {
      flex: 1;
      padding: 8px;
      border: 1px solid #dcd8cf;
      border-radius: 8px;
      font: 12px monospace;
    }

    /* Save Bar */
    .save-bar {
      position: sticky;
      bottom: 14px;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 14px;
      margin-top: 24px;
      padding: 12px 18px;
      border: 1px solid #ebe8e1;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      z-index: 30;
    }
    .save-bar span {
      font-size: 11px;
      color: #727a72;
    }

    /* RIGHT: PREVIEW PANEL */
    .preview-panel {
      position: sticky;
      top: 20px;
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .preview-tabs {
      display: flex;
      gap: 4px;
      background: #f1ede4;
      padding: 3px;
      border-radius: 8px;
    }
    .preview-tabs button {
      padding: 4px 10px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      font-size: 11px;
      font-weight: 700;
      color: #555d55;
      cursor: pointer;
    }
    .preview-tabs button.on {
      background: white;
      color: #1f4b3a;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .viewport-toggle {
      display: flex;
      gap: 4px;
    }
    .viewport-toggle button {
      padding: 4px 8px;
      border: 1px solid #dcd8cf;
      border-radius: 6px;
      background: white;
      font-size: 12px;
      cursor: pointer;
    }
    .viewport-toggle button.on {
      background: #1f4b3a;
      color: white;
      border-color: #1f4b3a;
    }

    /* Browser Frame & Mock */
    .browser-frame {
      border: 1px solid #ebe8e1;
      border-radius: 16px;
      overflow: hidden;
      background: white;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.08);
      transition: max-width 0.3s;
    }
    .browser-frame.mobile {
      max-width: 320px;
      margin: auto;
    }
    .browser-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #f3f1eb;
      color: #777e77;
    }
    .browser-bar i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #ccc7be;
    }
    .browser-bar span {
      margin: auto;
      font-size: 9px;
    }

    /* Mock Viewport */
    .mock-viewport {
      padding: 14px;
      min-height: 480px;
      font-size: 11px;
      background: white;
    }
    .mock-viewport.editorial { font-family: Georgia, serif; }
    .mock-viewport.friendly { font-family: 'Trebuchet MS', sans-serif; }
    .mock-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1ede4;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .mock-nav b {
      font-size: 12px;
      color: var(--primary);
    }
    .mock-links {
      display: flex;
      gap: 8px;
      font-size: 9px;
      color: #727a72;
    }
    .mock-links span.active {
      color: var(--primary);
      font-weight: 700;
    }

    /* Mock Homepage */
    .mock-hero {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px;
      background: color-mix(in srgb, var(--primary) 8%, white);
      border-radius: 10px;
      margin-bottom: 12px;
    }
    .mock-hero.centered {
      flex-direction: column;
      text-align: center;
    }
    .mock-hero.full {
      background: #333a33;
      color: white;
    }
    .mock-hero-text { flex: 1; }
    .mock-hero-text small {
      font-size: 8px;
      color: var(--accent);
      font-weight: 800;
      text-transform: uppercase;
    }
    .mock-hero-text h3 {
      margin: 4px 0;
      font-size: 15px;
      color: var(--primary);
    }
    .mock-hero.full .mock-hero-text h3 { color: white; }
    .mock-hero-text p {
      margin: 0 0 8px;
      font-size: 9px;
      color: #616861;
      line-height: 1.4;
    }
    .mock-hero-img {
      width: 80px;
      height: 65px;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .mock-hero-img img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .mock-btn {
      padding: 5px 10px;
      border-radius: 12px;
      border: 0;
      background: var(--primary);
      color: white;
      font-size: 8px;
      font-weight: 700;
    }
    .mock-trust {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #f1ede4;
      border-bottom: 1px solid #f1ede4;
      padding: 6px 0;
      font-size: 8px;
      color: #727a72;
      margin-bottom: 12px;
    }
    .mock-catalogue small {
      font-size: 8px;
      font-weight: 800;
      color: var(--accent);
    }
    .mock-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 6px;
    }
    .mock-grid div {
      border: 1px solid #f1ede4;
      border-radius: 6px;
      padding: 6px;
      background: #faf8f5;
    }
    .mock-grid span {
      display: block;
      height: 40px;
      background: #e5e2da;
      border-radius: 4px;
      margin-bottom: 4px;
    }
    .mock-grid b { display: block; font-size: 9px; }
    .mock-grid em { font-size: 8px; color: #727a72; font-style: normal; }
    .mock-banner {
      margin-top: 10px;
      padding: 14px;
      border-radius: 8px;
      background-size: cover;
      color: white;
    }
    .mock-banner h5 { margin: 2px 0 0; font-size: 11px; }

    /* Mock About & Contact */
    .mock-about-hero {
      text-align: center;
      padding: 14px;
      background: var(--primary);
      color: white;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .mock-about-hero h4 { margin: 4px 0; font-size: 13px; }
    .mock-about-hero p { margin: 0; font-size: 8px; opacity: 0.8; }
    .mock-story-row {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 10px;
      align-items: center;
    }
    .mock-story-row h5 { margin: 0 0 4px; font-size: 11px; color: var(--primary); }
    .mock-story-row p { margin: 0; font-size: 8px; color: #616861; line-height: 1.4; }
    .mock-story-row img { width: 100%; height: 60px; object-fit: cover; border-radius: 6px; }

    .mock-contact h4 { margin: 0 0 4px; font-size: 13px; color: var(--primary); }
    .mock-contact p { margin: 0 0 10px; font-size: 9px; color: #616861; }
    .mock-contact-info {
      display: grid;
      gap: 4px;
      font-size: 8px;
      margin-bottom: 10px;
      background: #f7f6f2;
      padding: 8px;
      border-radius: 6px;
    }
    .mock-form-box {
      border: 1px solid #f1ede4;
      border-radius: 8px;
      padding: 10px;
    }
    .mock-field {
      height: 14px;
      background: #f3f1eb;
      border-radius: 4px;
      margin-bottom: 6px;
    }

    /* Responsive */
    @media (max-width: 1100px) {
      .workspace {
        grid-template-columns: 1fr;
      }
      .preview-panel {
        display: none;
      }
    }
  `],
})
export class StoreEditorComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  error = signal('');
  saved = signal(false);
  store = signal<any>(null);
  tab = signal<EditorTab>('hero');
  pagesSubTab = signal<PagesSubTab>('home_sections');
  previewPage = signal<PreviewPage>('home');
  previewDevice = signal<PreviewDevice>('desktop');
  showAddSection = false;
  origin = location.origin;
  dirtyHint = 'Changes apply directly to your storefront.';
  private publishRollback: string | null = null;

  theme: StoreThemeConfig = {
    primary_color: '#1f4b3a',
    accent_color: '#c45c26',
    surface_color: '#ffffff',
    font: 'modern',
    hero_style: 'split',
    pages: {}
  };

  sections: StorePageSection[] = [];

  tabs: { id: EditorTab; label: string; copy: string; icon: string }[] = [
    { id: 'hero', label: 'Hero & Banners', copy: 'Hero visual, headlines & promo banner', icon: '🖼' },
    { id: 'pages', label: 'Store Pages', copy: 'Homepage, About Us & Contact pages', icon: '▤' },
    { id: 'design', label: 'Brand & Layout', copy: 'Colours, fonts & store insignia', icon: '◐' },
    { id: 'commerce', label: 'Operations', copy: 'Catalogue & delivery fees', icon: '▦' },
    { id: 'access', label: 'Accounts & SEO', copy: 'Customer access & search title', icon: '◎' },
    { id: 'setup', label: 'Store Details', copy: 'Name, address & unique URL slug', icon: '⌂' }
  ];

  completion = computed(() => {
    const s = this.store();
    if (!s) return 0;
    let n = 25;
    if (s.description) n += 15;
    if (s.contact_email) n += 10;
    if (s.city && s.country) n += 10;
    if (this.theme.hero_image || this.heroSection.image_url) n += 10;
    if (this.sections.length >= 3) n += 15;
    if (+s.products_count) n += 10;
    if (s.status === 'active') n += 5;
    return Math.min(n, 100);
  });

  get heroSection(): StorePageSection {
    let hero = this.sections.find((sec) => sec.type === 'hero');
    if (!hero) {
      hero = {
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
      };
      this.sections.unshift(hero);
    }
    return hero;
  }

  get bannerSection(): StorePageSection {
    let banner = this.sections.find((sec) => sec.type === 'banner');
    if (!banner) {
      banner = {
        id: 'banner',
        type: 'banner',
        badge: 'Limited Edition',
        title: 'Crafted for Discerning Spaces',
        subtitle: 'Explore limited seasonal pieces and studio specialties.',
        button_text: 'Explore Catalogue',
        button_link: '#catalogue',
        image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
        enabled: true
      };
      this.sections.push(banner);
    }
    return banner;
  }

  get aboutConfig() {
    this.theme.pages ??= {};
    this.theme.pages.about ??= {
      enabled: true,
      nav_label: 'Our story',
      hero_title: 'The Story Behind ' + (this.store()?.name || 'Our Workshop'),
      hero_subtitle: 'Dedicated to purposeful goods and enduring craftsmanship.',
      cover_image: '',
      story_title: 'How We Began',
      story_body: this.store()?.description || 'We founded our workshop to create purposeful, beautiful items made to last.',
      story_image: '',
      craft_title: 'Production & Artistry',
      craft_body: 'Step inside our workshop to see how our materials are selected and transformed.',
      craft_image: '',
      craft_steps: [
        { title: 'Ethical Sourcing', description: 'Raw materials are responsibly sourced from certified ethical suppliers.' },
        { title: 'Artisan Craftsmanship', description: 'Crafted by hand using timeless methods and modern precision.' },
        { title: 'Quality Assurance', description: 'Inspected rigorously before packing to guarantee high standards.' }
      ]
    };
    return this.theme.pages.about;
  }

  get contactConfig() {
    this.theme.pages ??= {};
    this.theme.pages.contact ??= {
      enabled: true,
      nav_label: 'Contact',
      title: 'Contact ' + (this.store()?.name || 'Our Studio'),
      subtitle: 'Have a question about products, custom orders, or shipping? Reach out to us directly.',
      hours: 'Monday – Friday: 9am – 6pm · Saturday: 10am – 4pm',
      show_form: true,
      form_intro: 'Drop us a message and our studio team will reply within 24 hours.'
    };
    return this.theme.pages.contact;
  }

  constructor() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.api.sellerStore(id).subscribe({
      next: (r) => {
        const s = r.data;
        s.customer_accounts_enabled ??= true;
        s.guest_checkout_enabled ??= true;
        this.store.set(s);
        this.theme = { ...this.theme, ...(s.theme_config || {}) };
        this.sections = s.page_sections?.length ? s.page_sections : this.defaults();
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e.error?.error?.message || 'Could not open this storefront studio.');
        this.loading.set(false);
      }
    });
  }

  save(extra: any = {}) {
    const s = this.store();
    this.saving.set(true);
    this.error.set('');

    const payload = {
      name: s.name,
      slug: s.slug,
      status: s.status,
      description: s.description,
      currency: s.currency,
      tax_inclusive: !!s.tax_inclusive,
      delivery_fee: +s.delivery_fee,
      delivery_days: +s.delivery_days,
      contact_email: s.contact_email,
      contact_phone: s.contact_phone,
      address_line: s.address_line,
      city: s.city,
      country: s.country,
      logo_path: s.logo_path,
      banner_path: s.banner_path,
      theme_config: this.theme,
      page_sections: this.sections,
      seo_title: s.seo_title,
      seo_description: s.seo_description,
      customer_accounts_enabled: !!s.customer_accounts_enabled,
      guest_checkout_enabled: !!s.guest_checkout_enabled,
      ...extra
    };

    this.api.updateStore(s.id, payload).subscribe({
      next: (r) => {
        this.store.set({ ...s, ...r.data });
        this.publishRollback = null;
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2000);
      },
      error: (e) => {
        if (this.publishRollback) {
          s.status = this.publishRollback;
          this.publishRollback = null;
        }
        this.saving.set(false);
        this.error.set(e.error?.error?.message || 'Could not save changes.');
      }
    });
  }

  togglePublish() {
    const s = this.store();
    this.publishRollback = s.status;
    s.status = s.status === 'active' ? 'draft' : 'active';
    this.save({ status: s.status });
  }

  remove() {
    const s = this.store();
    if (!confirm(`Permanently delete ${s.name}? This will remove all storefront configurations.`)) return;
    this.api.deleteStore(s.id).subscribe({
      next: () => this.router.navigate(['/tenant/stores']),
      error: (e) => this.error.set(e.error?.error?.message || 'Could not delete storefront.')
    });
  }

  // --- Image Upload Helpers ---
  onMediaFileSelect(e: Event, type: 'logo' | 'banner' | 'hero') {
    const input = e.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const s = this.store();
    if (!s) return;

    this.api.uploadStoreMedia(s.id, file, type).subscribe({
      next: (res) => {
        const url = res.data.url;
        if (type === 'logo') {
          s.logo_path = url;
          this.theme.logo_image = url;
        } else if (type === 'hero') {
          this.heroSection.image_url = url;
          this.theme.hero_image = url;
        } else if (type === 'banner') {
          this.bannerSection.image_url = url;
          this.theme.banner_image = url;
          s.banner_path = url;
        }
        this.save();
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Image upload failed. Ensure file is an image under 5MB.');
      }
    });
  }

  onSectionImageUpload(e: Event, section: StorePageSection) {
    const input = e.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const s = this.store();
    if (!s) return;

    this.api.uploadStoreMedia(s.id, file, 'section').subscribe({
      next: (res) => {
        section.image_url = res.data.url;
        this.save();
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to upload section photo.');
      }
    });
  }

  onAboutImageUpload(e: Event, target: 'cover' | 'story' | 'craft') {
    const input = e.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const s = this.store();
    if (!s) return;

    this.api.uploadStoreMedia(s.id, file, 'section').subscribe({
      next: (res) => {
        if (target === 'cover') this.aboutConfig.cover_image = res.data.url;
        if (target === 'story') this.aboutConfig.story_image = res.data.url;
        if (target === 'craft') this.aboutConfig.craft_image = res.data.url;
        this.save();
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to upload image.');
      }
    });
  }

  // --- Section & Page Helpers ---
  move(i: number, d: number) {
    const to = i + d;
    if (to < 0 || to >= this.sections.length) return;
    const [x] = this.sections.splice(i, 1);
    this.sections.splice(to, 0, x);
  }

  addSectionByType(type: string) {
    this.showAddSection = false;
    const id = `sec_${Date.now()}`;
    const newSec: StorePageSection = {
      id,
      type,
      title: this.defaultTitleForType(type),
      subtitle: this.defaultSubtitleForType(type),
      badge: 'STUDIO SPOTLIGHT',
      enabled: true
    };

    if (type === 'production') {
      newSec.image_url = 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=80';
      newSec.steps = [
        { title: 'Ethical Sourcing', description: 'Raw materials are responsibly sourced from certified suppliers.' },
        { title: 'Artisan Craftsmanship', description: 'Crafted with timeless methods and modern precision.' },
        { title: 'Quality Assurance', description: 'Inspected rigorously before dispatch to ensure longevity.' }
      ];
    } else if (type === 'gallery') {
      newSec.items = [
        { title: 'Design & Prototype', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80' },
        { title: 'Hand Assembly', image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=600&q=80' },
        { title: 'Finished Collection', image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80' }
      ];
    } else if (type === 'banner') {
      newSec.image_url = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80';
      newSec.button_text = 'Explore Collection';
      newSec.button_link = '#catalogue';
    }

    this.sections.push(newSec);
  }

  addStepToSection(sec: StorePageSection) {
    sec.steps ??= [];
    sec.steps.push({
      title: 'New Craft Step',
      description: 'Describe this production stage…'
    });
  }

  addGalleryItem(sec: StorePageSection) {
    sec.items ??= [];
    sec.items.push({
      title: 'Studio Moment',
      image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80'
    });
  }

  defaults(): StorePageSection[] {
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
      { id: 'trust', type: 'trust_bar', title: 'Why shop with us', subtitle: '', enabled: true },
      { id: 'featured', type: 'featured_products', title: 'Featured collection', subtitle: 'Shop customer favourites.', enabled: true },
      {
        id: 'banner',
        type: 'banner',
        badge: 'Limited Edition',
        title: 'Crafted for Discerning Spaces',
        subtitle: 'Explore limited seasonal pieces and studio specialties.',
        button_text: 'Explore Catalogue',
        button_link: '#catalogue',
        image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
        enabled: true
      },
      {
        id: 'production',
        type: 'production',
        badge: 'OUR WORKSHOP & STUDIO',
        title: 'How our products are made',
        subtitle: 'Every piece is crafted with attention to detail and traditional techniques.',
        image_url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=80',
        steps: [
          { title: 'Ethical Sourcing', description: 'Raw materials are responsibly sourced from certified ethical suppliers.' },
          { title: 'Artisan Craftsmanship', description: 'Crafted by hand using timeless methods and modern precision.' },
          { title: 'Quality Assurance', description: 'Inspected rigorously before packing to guarantee high standards.' }
        ],
        enabled: true
      },
      { id: 'rich_text', type: 'rich_text', title: 'Our story', subtitle: 'Share what makes your brand different.', enabled: true },
      { id: 'newsletter', type: 'newsletter', title: 'Stay in the loop', subtitle: 'News, launches and special offers.', button_text: 'Join us →', enabled: true }
    ];
  }

  sectionLabel(t: string): string {
    const map: Record<string, string> = {
      hero: 'Hero Banner',
      banner: 'Promo Image Banner',
      production: 'Workshop & Production',
      gallery: 'Studio Gallery',
      featured_products: 'Featured Products',
      rich_text: 'Brand Story / Rich Text',
      trust_bar: 'Trust & Guarantees Bar',
      contact_card: 'Quick Contact Card',
      newsletter: 'Newsletter'
    };
    return map[t] || 'Content Block';
  }

  sectionIcon(t: string): string {
    const map: Record<string, string> = {
      hero: '🖼',
      banner: '▰',
      production: '⚙',
      gallery: '▦',
      featured_products: '❖',
      rich_text: '¶',
      trust_bar: '✓',
      contact_card: '📍',
      newsletter: '✉'
    };
    return map[t] || '□';
  }

  defaultTitleForType(t: string): string {
    const map: Record<string, string> = {
      banner: 'Seasonal Spotlight',
      production: 'How Our Products Are Made',
      gallery: 'Studio & Workshop Moments',
      featured_products: 'Featured Collection',
      rich_text: 'A Commitment to Quality',
      trust_bar: 'Why Shop With Us',
      contact_card: 'Connect with Our Studio',
      newsletter: 'Stay in the Loop'
    };
    return map[t] || 'Section Heading';
  }

  defaultSubtitleForType(t: string): string {
    const map: Record<string, string> = {
      banner: 'Explore limited run pieces made with sustainable materials.',
      production: 'Step inside our workshop to see how our materials are selected and crafted.',
      gallery: 'A visual collection of our workspace, materials, and finished goods.',
      featured_products: 'Discover standout pieces selected from our studio catalogue.',
      rich_text: 'Every item should be durable, beautiful, and made with purpose.',
      trust_bar: 'Secure checkout · Reliable dispatch · Simple returns',
      contact_card: 'Reach out for inquiries, bespoke orders, or assistance.',
      newsletter: 'Subscribe to receive updates, studio launches, and discounts.'
    };
    return map[t] || '';
  }

  initials(name: string) {
    return (name || 'S').split(/\s+/).slice(0, 2).map((x: string) => x[0]).join('').toUpperCase();
  }
}
