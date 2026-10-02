import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { TenantApplication } from '../../core/models';

@Component({
  selector: 'app-seller-stores',
  imports: [FormsModule, RouterLink],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Sales channels</p>
        <h1>Your storefronts</h1>
        <p class="intro muted">Create independent shopping experiences, each with its own catalogue, identity and public URL.</p>
      </div>
      <button class="btn create" type="button" (click)="creating.set(!creating())"><span>＋</span> New storefront</button>
    </header>

    @if (tenant(); as t) {
      <section [class]="'approval ' + t.status">
        <span class="status-dot"></span>
        <div><strong>{{ statusTitle(t) }}</strong><small>{{ statusCopy(t) }}</small></div>
        @if (t.status !== 'active') { <a routerLink="/sell">View application →</a> }
      </section>
    }

    @if (error()) { <div class="message error">{{ error() }} <button (click)="reload()">Try again</button></div> }
    @if (saved()) { <div class="message success">✓ {{ saved() }}</div> }

    @if (creating()) {
      <form class="create-panel card" (ngSubmit)="create()">
        <div class="create-copy">
          <span class="store-glyph">◇</span>
          <div><h2>Build a new storefront</h2><p class="muted">Start with the essentials. Branding, pages and customer access are configured next.</p></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>Store name</label><input [(ngModel)]="form.name" name="name" required placeholder="e.g. North & Pine" (ngModelChange)="suggestSlug()" /></div>
          <div class="field"><label>Unique URL</label><div class="url-input"><span>/stores/</span><input [(ngModel)]="form.slug" name="slug" pattern="[a-z0-9-]+" placeholder="north-and-pine" /></div></div>
          <div class="field"><label>Currency</label><select [(ngModel)]="form.currency" name="currency"><option>USD</option><option>EUR</option><option>GBP</option><option>GHS</option><option>NGN</option><option>ZAR</option></select></div>
          <div class="field"><label>Country</label><input [(ngModel)]="form.country" name="country" maxlength="2" placeholder="US" /></div>
        </div>
        <div class="create-actions"><button class="btn ghost" type="button" (click)="creating.set(false)">Cancel</button><button class="btn ok" [disabled]="busy() || !form.name">{{ busy() ? 'Creating…' : 'Create & configure' }}</button></div>
      </form>
    }

    <section class="summary">
      <div><strong>{{ stores().length }}</strong><span>Storefronts</span></div>
      <div><strong>{{ activeCount() }}</strong><span>Published</span></div>
      <div><strong>{{ productCount() }}</strong><span>Total products</span></div>
    </section>

    @if (loading()) {
      <div class="store-grid"><div class="skeleton-card"></div><div class="skeleton-card"></div></div>
    } @else {
      <div class="store-grid">
        @for (store of stores(); track store.id) {
          <article class="store-card" role="link" tabindex="0" (click)="open(store.id)" (keydown.enter)="open(store.id)">
            <div class="visual" [style.--brand]="store.theme_config?.primary_color || '#1f4b3a'">
              <span class="monogram">{{ initials(store.name) }}</span>
              <span [class]="'state ' + store.status"><i></i>{{ store.status === 'active' ? 'Live' : store.status }}</span>
              <div class="mini-shop"><b>{{ store.name }}</b><span></span><span></span><span></span></div>
            </div>
            <div class="store-body">
              <div class="title-row"><div><h2>{{ store.name }}</h2><p>{{ store.city || 'Online store' }}{{ store.country ? ', ' + store.country : '' }}</p></div><span class="arrow">↗</span></div>
              <button class="public-link" type="button" title="Copy storefront link" (click)="copyLink(store, $event)"><span>↗</span> /stores/{{ store.slug }} <b>{{ copied() === store.id ? 'Copied!' : 'Copy' }}</b></button>
              <div class="metrics"><div><strong>{{ store.products_count || 0 }}</strong><span>Products</span></div><div><strong>{{ store.currency }}</strong><span>Currency</span></div><div><strong>{{ completion(store) }}%</strong><span>Setup</span></div></div>
              <div class="progress"><span [style.width.%]="completion(store)"></span></div>
              <div class="card-actions">
                <span>{{ nextStep(store) }}</span>
                <a [routerLink]="['/tenant/products']" [queryParams]="{store_id: store.id}" (click)="$event.stopPropagation()">Manage products</a>
              </div>
            </div>
          </article>
        } @empty {
          <button class="empty-store" type="button" (click)="creating.set(true)"><span>＋</span><h2>Create your first storefront</h2><p>Launch a branded online shop with a unique link in minutes.</p></button>
        }
        @if (stores().length) {
          <button class="add-card" type="button" (click)="creating.set(true)"><span>＋</span><strong>Add another storefront</strong><small>New brand, region or catalogue</small></button>
        }
      </div>
    }
  `,
  styles: [`
    :host{display:block;max-width:1240px;margin:auto;padding-bottom:60px}.page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:20px}.eyebrow{margin:0 0 7px;color:var(--accent);font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.page-head h1{font-size:clamp(30px,4vw,44px);line-height:1;margin:0}.intro{margin:10px 0 0;max-width:650px}.create{background:var(--accent);box-shadow:0 9px 24px color-mix(in srgb,var(--accent) 25%,transparent)}.create span{font-size:19px}.approval{display:flex;align-items:center;gap:11px;margin-bottom:20px;padding:12px 15px;border:1px solid var(--line);border-radius:14px;background:var(--card)}.approval .status-dot{width:9px;height:9px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 5px color-mix(in srgb,var(--gold) 15%,transparent)}.approval.active .status-dot{background:var(--ok);box-shadow:0 0 0 5px color-mix(in srgb,var(--ok) 15%,transparent)}.approval div{display:grid;gap:2px}.approval small{color:var(--ink-soft)}.approval a{margin-left:auto;color:var(--accent);font-size:13px;font-weight:750}.message{padding:12px 14px;border-radius:12px;margin-bottom:14px;font-size:13px;font-weight:650}.message.error{background:color-mix(in srgb,var(--danger) 10%,transparent);color:var(--danger)}.message.success{background:color-mix(in srgb,var(--ok) 10%,transparent);color:var(--ok)}.message button{border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer}.create-panel{padding:22px;margin-bottom:22px}.create-copy{display:flex;align-items:center;gap:14px;margin-bottom:18px}.store-glyph{display:grid;place-items:center;width:44px;height:44px;border-radius:13px;background:var(--ink);color:var(--card);font-size:21px}.create-copy h2{margin:0;font-size:21px}.create-copy p{margin:3px 0 0;font-size:13px}.form-grid{display:grid;grid-template-columns:1.2fr 1.2fr .6fr .5fr;gap:12px}.url-input{display:flex;align-items:center;border:1px solid var(--line);border-radius:12px;background:var(--paper-2);overflow:hidden}.url-input span{padding-left:11px;color:var(--ink-soft);font-size:13px}.url-input input{min-width:0;border:0!important;background:transparent!important;padding-left:2px!important}.create-actions{display:flex;justify-content:flex-end;gap:8px}.summary{display:flex;gap:0;margin:8px 0 18px}.summary div{display:flex;align-items:baseline;gap:7px;padding:0 24px;border-right:1px solid var(--line)}.summary div:first-child{padding-left:0}.summary div:last-child{border:0}.summary strong{font:700 22px Fraunces,serif}.summary span{font-size:12px;color:var(--ink-soft)}.store-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.store-card{overflow:hidden;border:1px solid var(--line);border-radius:20px;background:var(--card);box-shadow:0 7px 26px rgba(28,25,20,.06);cursor:pointer;transition:transform .18s,border-color .18s,box-shadow .18s}.store-card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--accent) 45%,var(--line));box-shadow:0 16px 38px rgba(28,25,20,.11)}.store-card:focus-visible{outline:3px solid color-mix(in srgb,var(--accent) 45%,transparent);outline-offset:2px}.visual{position:relative;height:148px;padding:18px;background:linear-gradient(135deg,var(--brand),color-mix(in srgb,var(--brand) 65%,#111));color:#fff;overflow:hidden}.visual:after{content:'';position:absolute;width:220px;height:220px;border:1px solid rgba(255,255,255,.14);border-radius:50%;right:-55px;top:-90px}.monogram{display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(255,255,255,.32);border-radius:12px;background:rgba(255,255,255,.14);font:700 17px Fraunces,serif;backdrop-filter:blur(8px)}.state{position:absolute;right:16px;top:16px;display:flex;align-items:center;gap:6px;padding:5px 9px;border-radius:99px;background:rgba(0,0,0,.25);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.state i{width:6px;height:6px;border-radius:50%;background:#e9c65a}.state.active i{background:#63dfa4}.state.suspended i{background:#ff8d8d}.mini-shop{position:absolute;left:72px;right:18px;bottom:-22px;height:88px;padding:15px 14px;border-radius:12px 12px 0 0;background:rgba(255,255,255,.95);color:#25221e;box-shadow:0 12px 30px rgba(0,0,0,.18)}.mini-shop b{display:block;font:700 13px Fraunces,serif;margin-bottom:10px}.mini-shop span{display:inline-block;width:25%;height:27px;margin-right:6px;border-radius:5px;background:#e9e4da}.store-body{padding:20px}.title-row{display:flex;justify-content:space-between;align-items:start}.title-row h2{font-size:22px;margin:0}.title-row p{font-size:12px;color:var(--ink-soft);margin:4px 0}.arrow{font-size:19px;color:var(--ink-soft)}.public-link{display:flex;width:100%;align-items:center;gap:7px;margin:13px 0 17px;padding:9px 10px;border:1px solid var(--line);border-radius:10px;background:var(--paper-2);color:var(--ink-soft);font:500 11px ui-monospace,monospace;cursor:pointer;text-align:left}.public-link b{margin-left:auto;color:var(--accent);font:750 11px system-ui}.metrics{display:grid;grid-template-columns:repeat(3,1fr)}.metrics div{display:grid;gap:2px;border-right:1px solid var(--line);padding-left:14px}.metrics div:first-child{padding-left:0}.metrics div:last-child{border:0}.metrics strong{font-size:14px}.metrics span{font-size:10px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em}.progress{height:3px;margin:15px 0 11px;border-radius:4px;background:var(--paper-2);overflow:hidden}.progress span{display:block;height:100%;border-radius:4px;background:var(--accent)}.card-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:11px;color:var(--ink-soft)}.card-actions a{color:var(--accent);font-weight:750}.add-card,.empty-store{min-height:300px;border:1.5px dashed var(--line);border-radius:20px;background:transparent;color:var(--ink-soft);cursor:pointer;display:grid;place-content:center;justify-items:center;gap:7px}.add-card span,.empty-store>span{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:var(--paper-2);font-size:21px}.add-card strong{color:var(--ink)}.add-card small{font-size:11px}.empty-store{grid-column:1/-1;padding:45px}.empty-store h2{color:var(--ink);margin:4px 0 0}.empty-store p{margin:0}.skeleton-card{height:410px;border-radius:20px;background:linear-gradient(90deg,var(--paper-2),var(--card),var(--paper-2));background-size:200%;animation:shimmer 1.2s infinite}@keyframes shimmer{to{background-position:-200%}}@media(max-width:900px){.form-grid{grid-template-columns:1fr 1fr}.store-grid{grid-template-columns:1fr}}@media(max-width:600px){.page-head{align-items:flex-start;flex-direction:column}.form-grid{grid-template-columns:1fr}.summary{overflow:auto}.summary div{min-width:max-content}.approval{align-items:flex-start}.approval a{display:none}.store-body{padding:16px}}
  `],
})
export class SellerStoresComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  tenant = signal<TenantApplication | null>(null);
  stores = signal<any[]>([]);
  loading = signal(true);
  creating = signal(false);
  busy = signal(false);
  error = signal('');
  saved = signal('');
  copied = signal<number | null>(null);
  activeCount = computed(() => this.stores().filter(s => s.status === 'active').length);
  productCount = computed(() => this.stores().reduce((sum, s) => sum + +(s.products_count || 0), 0));
  form = { name: '', slug: '', currency: 'USD', country: '', description: '', delivery_fee: 0, delivery_days: 3 };
  private slugTouched = false;

  constructor() { this.loadTenant(); this.reload(); }
  loadTenant() { this.api.tenant().subscribe({ next: r => this.tenant.set(r.data), error: () => {} }); }
  reload() { this.loading.set(true); this.error.set(''); this.api.sellerStores().subscribe({ next: r => { this.stores.set(r.data); this.loading.set(false); }, error: e => { this.loading.set(false); this.error.set(e.error?.error?.message || 'Could not load storefronts.'); } }); }
  suggestSlug() { if (!this.slugTouched || !this.form.slug) this.form.slug = this.form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  create() { this.busy.set(true); this.error.set(''); this.api.createStore(this.form).subscribe({ next: r => { this.busy.set(false); this.creating.set(false); this.form = { name: '', slug: '', currency: 'USD', country: '', description: '', delivery_fee: 0, delivery_days: 3 }; this.router.navigate(['/tenant/stores', r.data.id]); }, error: e => { this.busy.set(false); this.error.set(e.error?.error?.message || 'Could not create the storefront.'); } }); }
  open(id: number) { this.router.navigate(['/tenant/stores', id]); }
  copyLink(store: any, event: Event) { event.stopPropagation(); const url = `${location.origin}/stores/${store.slug}`; navigator.clipboard?.writeText(url); this.copied.set(store.id); setTimeout(() => this.copied.set(null), 1600); }
  initials(name: string) { return (name || 'S').split(/\s+/).slice(0, 2).map((x: string) => x[0]).join('').toUpperCase(); }
  completion(s: any) { let n = 25; if (s.description) n += 15; if (s.contact_email) n += 10; if (s.city && s.country) n += 10; if (s.theme_config) n += 15; if (+s.products_count > 0) n += 15; if (s.status === 'active') n += 10; return Math.min(n, 100); }
  nextStep(s: any) { if (!s.description) return 'Next: add store details'; if (!s.theme_config) return 'Next: customise design'; if (!s.products_count) return 'Next: add products'; if (s.status !== 'active') return 'Ready to publish'; return 'Storefront is live'; }
  statusTitle(t: TenantApplication) { return t.status === 'active' ? 'Tenant approved' : t.status === 'pending' ? 'Application under review' : t.status === 'rejected' ? 'Application needs changes' : 'Tenant suspended'; }
  statusCopy(t: TenantApplication) { return t.status === 'active' ? 'Your storefronts can be published and visited by customers.' : 'You can build draft storefronts now; publishing unlocks after approval.'; }
}
