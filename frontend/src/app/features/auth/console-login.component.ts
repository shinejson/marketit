import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PortalKind, PortalService } from '../../core/portal.service';

interface ConsoleCopy {
  badge: string;
  title: string;
  subtitle: string;
  email: string;
  panelTitle: string;
  panelBody: string;
  primaryCta: string;
  secondaryCta: string;
  secondaryPath: string;
  demo: string;
}

@Component({
  selector: 'app-console-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div [class]="'console-page ' + portal">
      <section class="story">
        <header class="story-head">
          <a routerLink="/" class="brand serif">MarketHub</a>
          <span class="badge">{{ copy.badge }}</span>
        </header>
        <div class="story-copy">
          <h1>{{ copy.title }}</h1>
          <p>{{ copy.subtitle }}</p>
        </div>
        <div class="host-card">
          <span>Recommended subdomain</span>
          <strong>{{ exampleHost }}</strong>
        </div>
        <ul class="highlights">
          @if (portal === 'admin') {
            <li>Review and approve tenant registrations</li>
            <li>Manage plans, users, domains, ads, audit logs, and platform settings</li>
            <li>Cross-tenant dashboards stay separate from seller workspaces</li>
          } @else {
            <li>Access the tenant dashboard after registering your seller account</li>
            <li>Create and configure stores, then publish after approval</li>
            <li>Add products per store with stock, pricing, and fulfilment tools</li>
          }
        </ul>
      </section>

      <section class="login-card card">
        <form (ngSubmit)="submit()">
          <p class="eyebrow">{{ copy.panelTitle }}</p>
          <h2 class="serif">Sign in</h2>
          <p class="muted panel">{{ copy.panelBody }}</p>
          <div class="field">
            <label for="console-email">Email</label>
            <input
              id="console-email"
              [(ngModel)]="email"
              name="email"
              type="email"
              autocomplete="email"
              inputmode="email"
              required
            />
          </div>
          <div class="field">
            <label for="console-password">Password</label>
            <input
              id="console-password"
              [(ngModel)]="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>
          @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
          <button class="btn" type="submit" [disabled]="busy()">{{ busy() ? 'Signing in…' : copy.primaryCta }}</button>
          <a [href]="secondaryHref" class="btn ghost secondary">{{ copy.secondaryCta }}</a>
          <p class="muted demo">Demo: {{ copy.demo }} · password</p>
        </form>
      </section>
    </div>
  `,
  styles: [
    `
    :host { display: block; min-height: 100vh; min-height: 100dvh; }
    .console-page {
      min-height: 100vh;
      min-height: 100dvh;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(360px, 520px);
    }

    /* ---- Story / hero panel ---- */
    .story {
      position: relative;
      min-width: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 18px;
      padding: clamp(32px, 7vw, 76px);
      color: #fff;
    }
    .story > * { position: relative; z-index: 1; }
    .story::after { content: ''; position: absolute; z-index: 0; inset: auto -15% -35% auto; width: 420px; height: 420px; border-radius: 50%; background: rgba(255, 255, 255, .09); }
    .admin .story { background: radial-gradient(circle at 20% 15%, rgba(201, 162, 39, .22), transparent 28%), linear-gradient(135deg, #11100d, #2b211b 58%, #5a2714); }
    .tenant .story { background: radial-gradient(circle at 20% 15%, rgba(196, 92, 38, .20), transparent 28%), linear-gradient(135deg, #16352a, #1f4b3a 55%, #0f251d); }
    .story-head { display: flex; flex-direction: column; align-items: flex-start; gap: 18px; }
    .story-copy { display: grid; gap: 14px; }
    .brand { font-size: 28px; width: fit-content; }
    .badge { max-width: 100%; width: fit-content; border: 1px solid rgba(255, 255, 255, .25); background: rgba(255, 255, 255, .12); border-radius: 999px; padding: 7px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: .14em; font-weight: 800; }
    h1 { margin: 0; font-size: clamp(32px, 5vw, 68px); line-height: .98; max-width: 720px; overflow-wrap: break-word; }
    .story p { margin: 0; max-width: 58ch; color: rgba(255, 255, 255, .82); font-size: clamp(15.5px, 1.4vw, 18px); line-height: 1.5; }
    .host-card { width: fit-content; max-width: 100%; min-width: min(100%, 340px); padding: 16px 18px; border: 1px solid rgba(255, 255, 255, .20); border-radius: 18px; background: rgba(255, 255, 255, .10); backdrop-filter: blur(10px); }
    .host-card span { display: block; color: rgba(255, 255, 255, .68); font-size: 12px; text-transform: uppercase; letter-spacing: .12em; margin-bottom: 4px; }
    .host-card strong { font-size: 20px; overflow-wrap: anywhere; }
    .highlights { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 10px; color: rgba(255, 255, 255, .86); }
    .highlights li { display: flex; gap: 10px; align-items: flex-start; }
    .highlights li::before { content: '✓'; display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: rgba(255, 255, 255, .16); flex: none; }

    /* ---- Sign-in panel ---- */
    .login-card { min-width: 0; border-radius: 0; border-width: 0 0 0 1px; box-shadow: none; display: grid; align-items: center; background: var(--card); }
    form { width: min(420px, calc(100% - 48px)); margin: 0 auto; padding: 40px 0; }
    .eyebrow { margin: 0 0 8px; color: var(--accent); font-size: 12px; text-transform: uppercase; letter-spacing: .14em; font-weight: 800; }
    h2 { margin: 0 0 8px; font-size: clamp(30px, 2.6vw, 38px); }
    .panel { margin: 0 0 18px; line-height: 1.5; }
    .field input { font-size: 16px; }
    .btn { width: 100%; margin-top: 6px; }
    .tenant .login-card .btn:not(.ghost) { background: var(--accent-2); }
    .admin .login-card .btn:not(.ghost) { background: var(--ink); }
    .secondary { margin-top: 10px; }
    .demo { font-size: 12px; margin-top: 16px; overflow-wrap: anywhere; }

    /* ---- Stacked layout: tablets and phones ---- */
    @media (max-width: 900px) {
      .console-page { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto 1fr; }
      .story {
        justify-content: flex-start;
        gap: 16px;
        margin-bottom: -26px;
        padding: clamp(24px, 5vw, 44px) clamp(20px, 5vw, 48px) clamp(58px, 9vw, 92px);
      }
      .story::after { width: 300px; height: 300px; }
      .story-head { flex-direction: row; align-items: center; justify-content: space-between; gap: 14px; width: 100%; }
      .story-copy { gap: 12px; }
      .story p { max-width: 62ch; }
      .host-card { width: 100%; min-width: 0; }
      .login-card {
        position: relative;
        z-index: 2;
        border-left: 0;
        border-top: 1px solid var(--line);
        border-radius: 26px 26px 0 0;
        box-shadow: 0 -22px 48px rgba(28, 25, 20, .14);
      }
      form { padding: 32px 0 44px; }
    }

    /* ---- Phone ---- */
    @media (max-width: 560px) {
      .story { gap: 12px; padding: 18px 16px 46px; }
      .story::after { width: 240px; height: 240px; }
      .brand { font-size: 22px; }
      .badge { font-size: 10px; padding: 6px 10px; letter-spacing: .1em; }
      h1 { font-size: clamp(26px, 7.6vw, 34px); line-height: 1.03; }
      .story p { font-size: 15px; }
      .host-card { padding: 12px 14px; border-radius: 14px; }
      .host-card span { font-size: 11px; }
      .host-card strong { font-size: 17px; }
      .highlights { gap: 8px; font-size: 14px; }
      .highlights li::before { width: 18px; height: 18px; font-size: 11px; }
      form { width: min(420px, 100%); padding: 26px 16px calc(30px + env(safe-area-inset-bottom)); }
      h2 { font-size: 28px; }
      .eyebrow { font-size: 11px; }
      .panel { font-size: 14.5px; margin-bottom: 16px; }
      .field input { padding: 12px 13px; }
      .btn { min-height: 48px; }
      .demo { margin-top: 14px; }
    }

    /* ---- Very small phones (320-380px) ---- */
    @media (max-width: 380px) {
      .story { padding: 16px 14px 42px; }
      h1 { font-size: 26px; }
      .badge { max-width: 62%; text-align: right; }
      form { padding-left: 14px; padding-right: 14px; }
    }
  `,
  ],
})
export class ConsoleLoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly portalService = inject(PortalService);

  readonly portal = (this.route.snapshot.data['portal'] === 'admin' ? 'admin' : 'tenant') as Extract<PortalKind, 'tenant' | 'admin'>;
  readonly exampleHost = this.portalService.exampleHost(this.portal);
  readonly copy: ConsoleCopy = this.portal === 'admin'
    ? {
        badge: 'Super admin console',
        title: 'One secure entry point for platform operators.',
        subtitle: 'Use the admin subdomain for platform-wide controls. Tenant and customer accounts cannot sign in here.',
        email: 'admin@markethub.test',
        panelTitle: 'Platform access',
        panelBody: 'For super admins only. Use this console to review tenants, plans, billing, settings, domains, ads, and audits.',
        primaryCta: 'Open super admin',
        secondaryCta: 'Go to marketplace login',
        secondaryPath: '/login',
        demo: 'admin@markethub.test',
      }
    : {
        badge: 'Tenant workspace',
        title: 'Your store operations live on a tenant subdomain.',
        subtitle: 'Registered tenants can sign in here to prepare draft stores, configure operations, and create products for each store.',
        email: 'seller1@markethub.test',
        panelTitle: 'Tenant access',
        panelBody: 'For tenant owners and store staff. New sellers should create a customer account first, then submit a seller application.',
        primaryCta: 'Open tenant dashboard',
        secondaryCta: 'Create account to sell',
        secondaryPath: '/register',
        demo: 'seller1@markethub.test',
      };

  readonly secondaryHref = this.portalService.marketplaceUrl(this.copy.secondaryPath);

  email = this.copy.email;
  password = 'password';
  busy = signal(false);
  error = signal('');

  constructor() {
    if (this.auth.isLoggedIn()) {
      const target = this.portalService.dashboardForRole(this.auth.role());
      if ((this.portal === 'admin' && target === '/admin') || (this.portal === 'tenant' && target === '/tenant')) {
        this.router.navigateByUrl(target);
      }
    }
  }

  submit() {
    this.busy.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password, this.portal).subscribe({
      next: (res) => {
        const target = this.portalService.dashboardForRole(res.data.user.role);
        if (this.portal === 'admin' && target !== '/admin') {
          this.error.set('This account is not a super admin. Use the marketplace or tenant login instead.');
          this.busy.set(false);
          return;
        }
        if (this.portal === 'tenant' && target !== '/tenant') {
          this.error.set('This account is not attached to a tenant. Apply to sell before opening the tenant dashboard.');
          this.busy.set(false);
          return;
        }
        this.router.navigateByUrl(target);
      },
      error: (e) => {
        this.error.set(e.error?.error?.message || 'Login failed');
        this.busy.set(false);
      },
    });
  }
}
