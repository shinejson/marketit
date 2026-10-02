import { Component, inject, input, output, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { SocialProviderOption } from '../core/models';

/** Where to come back to after the provider round-trip. */
export const SOCIAL_RETURN_KEY = 'mh_social_return';

/**
 * Social sign-in buttons for marketplace customers.
 *
 * The component only knows how to *start* the flow: it asks the API for an
 * authorize URL (the client secret never reaches the browser), remembers where
 * the user wanted to go, and hands the browser over to the provider. The
 * matching callback route finishes the exchange.
 *
 * Providers are discovered at runtime, so enabling Apple or Facebook is a
 * backend configuration change — no frontend deploy.
 */
@Component({
  selector: 'app-social-login',
  template: `
    @if (providers().length) {
      <div class="social-block">
        <div class="divider"><span>{{ label() }}</span></div>
        <div class="social-grid">
          @for (provider of providers(); track provider.key) {
            <button
              type="button"
              class="social-btn"
              [class]="'social-btn ' + provider.key"
              [disabled]="pending() !== ''"
              (click)="start(provider)"
            >
              <span class="glyph">{{ glyph(provider.key) }}</span>
              {{ pending() === provider.key ? 'Redirecting…' : 'Continue with ' + provider.label }}
            </button>
          }
        </div>
        @if (demoMode()) {
          <p class="demo-note">
            Demo mode: no OAuth app is configured, so these buttons sign you in as a sample customer.
          </p>
        }
        @if (error()) { <p class="err">{{ error() }}</p> }
      </div>
    }
  `,
  styles: [`
    .social-block { margin: 18px 0 6px; }
    .divider { position: relative; text-align: center; margin-bottom: 14px; }
    .divider::before { content: ''; position: absolute; inset: 50% 0 auto; height: 1px; background: var(--line); }
    .divider span { position: relative; padding: 0 12px; background: var(--card); color: var(--ink-soft); font-size: 12px; }
    .social-grid { display: grid; gap: 8px; }
    .social-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 10px;
      width: 100%; padding: 11px 16px; border: 1px solid var(--line); border-radius: 999px;
      background: var(--card); color: var(--ink); font-size: 14px; font-weight: 600; cursor: pointer;
      transition: border-color .15s ease, background .15s ease;
    }
    .social-btn:hover:not(:disabled) { border-color: var(--ink); background: var(--paper-2); }
    .social-btn:disabled { opacity: .6; cursor: progress; }
    .glyph { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; font-weight: 900; font-size: 13px; }
    .social-btn.google .glyph { color: #4285f4; }
    .social-btn.facebook .glyph { color: #1877f2; }
    .social-btn.apple .glyph { color: var(--ink); }
    .social-btn.github .glyph { color: #24292f; }
    .demo-note { margin: 10px 0 0; color: var(--ink-soft); font-size: 11.5px; line-height: 1.5; }
  `],
})
export class SocialLoginComponent {
  private auth = inject(AuthService);

  /** Copy shown in the divider above the buttons. */
  label = input('or continue with');
  /** Where to send the customer after a successful sign-in. */
  returnTo = input('/');
  intent = input<'login' | 'register'>('login');
  failed = output<string>();

  providers = signal<SocialProviderOption[]>([]);
  pending = signal('');
  error = signal('');

  constructor() {
    this.auth.socialProviders().subscribe({
      next: (res) => this.providers.set(res.data ?? []),
      // A missing provider list should never break the password form.
      error: () => this.providers.set([]),
    });
  }

  demoMode(): boolean {
    return this.providers().some((provider) => provider.mode === 'demo');
  }

  glyph(key: string): string {
    return { google: 'G', facebook: 'f', apple: '', github: '⌥' }[key] ?? '◈';
  }

  start(provider: SocialProviderOption) {
    this.pending.set(provider.key);
    this.error.set('');

    const redirectUri = `${window.location.origin}/auth/callback/${provider.key}`;
    try {
      sessionStorage.setItem(SOCIAL_RETURN_KEY, this.returnTo());
    } catch {
      // Private browsing — we simply fall back to the default landing page.
    }

    this.auth.startSocialLogin(provider.key, redirectUri, this.intent()).subscribe({
      next: (res) => window.location.assign(res.data.url),
      error: (e) => {
        this.pending.set('');
        const message = e?.error?.error?.message || `Could not start ${provider.label} sign-in.`;
        this.error.set(message);
        this.failed.emit(message);
      },
    });
  }
}
