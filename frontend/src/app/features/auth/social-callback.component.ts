import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PortalService } from '../../core/portal.service';
import { SOCIAL_RETURN_KEY } from '../../shared/social-login.component';

/**
 * Landing route for the OAuth redirect (`/auth/callback/:provider`).
 *
 * The provider sends the browser here with `?code&state`; the component hands
 * both to the API, which performs the token exchange server-side and returns a
 * session. On success the customer continues wherever they were heading.
 */
@Component({
  selector: 'app-social-callback',
  imports: [RouterLink],
  template: `
    <div class="wrap callback">
      <div class="card panel">
        @if (error()) {
          <h1>Sign-in failed</h1>
          <p class="muted">{{ error() }}</p>
          <div class="actions">
            <a class="btn" routerLink="/login">Back to sign in</a>
            <a class="btn ghost" routerLink="/">Continue shopping</a>
          </div>
        } @else {
          <div class="spinner" aria-hidden="true"></div>
          <h1>Finishing sign-in…</h1>
          <p class="muted">Verifying your {{ providerLabel() }} account. This only takes a moment.</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .callback { display: flex; justify-content: center; padding: 72px 0; }
    .panel { width: min(460px, 100%); padding: 32px; text-align: center; }
    h1 { margin: 14px 0 6px; font-size: 22px; }
    .muted { font-size: 13px; line-height: 1.6; }
    .actions { display: flex; gap: 8px; justify-content: center; margin-top: 18px; }
    .spinner {
      width: 34px; height: 34px; margin: 0 auto; border-radius: 50%;
      border: 3px solid var(--line); border-top-color: var(--accent); animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class SocialCallbackComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private portal = inject(PortalService);

  error = signal('');
  provider = signal('');

  constructor() {
    const provider = this.route.snapshot.paramMap.get('provider') ?? '';
    const params = this.route.snapshot.queryParamMap;
    this.provider.set(provider);

    const denied = params.get('error_description') || params.get('error');
    const code = params.get('code');
    const state = params.get('state');

    if (denied) {
      this.error.set(denied === 'access_denied' ? 'You cancelled the sign-in request.' : denied);
      return;
    }
    if (!provider || !code || !state) {
      this.error.set('This sign-in link is incomplete. Please start again.');
      return;
    }

    this.auth.completeSocialLogin(provider, code, state).subscribe({
      next: (res) => this.router.navigateByUrl(this.destination(res.data.user.role)),
      error: (e) => this.error.set(e?.error?.error?.message || 'We could not complete this sign-in.'),
    });
  }

  providerLabel(): string {
    const provider = this.provider();
    return provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'social';
  }

  private destination(role: string): string {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(SOCIAL_RETURN_KEY);
      sessionStorage.removeItem(SOCIAL_RETURN_KEY);
    } catch {
      stored = null;
    }

    // Only ever return to an in-app path, never to an absolute URL.
    if (stored && stored.startsWith('/') && !stored.startsWith('//')) {
      return stored;
    }

    return this.portal.dashboardForRole(role);
  }
}
