import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { EMPTY } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthResponse, SocialProviderOption, User } from './models';

// sessionStorage keeps bearer tokens scoped to the browser tab instead of
// leaving a reusable platform credential in persistent localStorage.
const TOKEN_KEY = 'mh_token';
const USER_KEY = 'mh_user';
const LEGACY_LOGOUT_KEY = 'mh_logout_event';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<User | null>(this.readUser());
  private loggingOut = false;
  private channel?: BroadcastChannel;
  readonly user = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.userSignal() && !!this.token());
  readonly role = computed(() => this.userSignal()?.role ?? null);

  constructor(private http: HttpClient, private router: Router) {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore storage failures
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === LEGACY_LOGOUT_KEY && event.newValue) this.clear();
      });
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel('markethub-auth');
        this.channel.onmessage = (event) => {
          if (event.data === 'logout') this.clear();
        };
      }
    }
  }

  token(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  login(email: string, password: string, portal: 'marketplace' | 'tenant' | 'admin' = 'marketplace') {
    return this.http.post<{ data: AuthResponse }>('/api/auth/login', { email, password, portal }).pipe(
      tap((res) => this.persist(res.data)),
    );
  }

  /* ----------------------------------------------------------- social login */

  /** Providers the API has credentials for (or demo mode outside production). */
  socialProviders() {
    return this.http.get<{ data: SocialProviderOption[] }>('/api/auth/social/providers');
  }

  /**
   * Ask the API for a provider authorize URL. The client secret stays on the
   * server; we only ever hold the opaque state value.
   */
  startSocialLogin(provider: string, redirectUri: string, intent: 'login' | 'register' = 'login') {
    return this.http.post<{ data: { provider: string; state: string; mode: 'oauth' | 'demo'; url: string } }>(
      `/api/auth/social/${provider}/redirect`,
      { redirect_uri: redirectUri, intent },
    );
  }

  /** Exchange the authorization code for a session. */
  completeSocialLogin(provider: string, code: string, state: string) {
    return this.http
      .post<{ data: AuthResponse }>(`/api/auth/social/${provider}/callback`, { code, state })
      .pipe(tap((res) => this.persist(res.data)));
  }

  register(payload: { name: string; email: string; password: string; phone?: string }) {
    return this.http.post<{ data: AuthResponse }>('/api/auth/register', payload).pipe(
      tap((res) => this.persist(res.data)),
    );
  }

  /** Revoke the current server token, clear the browser session immediately and redirect to the right portal. */
  logout(allSessions = false) {
    if (this.loggingOut) return;
    this.loggingOut = true;
    const token = this.token();
    const currentUrl = this.router.url;
    this.clear();
    this.broadcastLogout();

    // Capture the token before clearing storage. The interceptor deliberately
    // ignores this endpoint so an expired token cannot trigger a logout loop.
    if (token) {
      this.http.post('/api/auth/logout', { all_sessions: allSessions }, {
        headers: { Authorization: `Bearer ${token}` },
      }).pipe(catchError(() => EMPTY)).subscribe();
    }

    const target = currentUrl.startsWith('/admin') ? '/admin/login'
      : currentUrl.startsWith('/tenant') || currentUrl.startsWith('/seller') ? '/tenant/login'
        : '/login';
    this.router.navigateByUrl(target).finally(() => { this.loggingOut = false; });
  }

  hasRole(...roles: string[]): boolean {
    const role = this.userSignal()?.role;
    return !!role && roles.includes(role);
  }

  private persist(data: AuthResponse) {
    try {
      sessionStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
      // Remove tokens written by versions that persisted bearer credentials.
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // Storage can be blocked in private browsing; the API response still
      // completes, but guards will require the user to sign in again.
    }
    this.userSignal.set(data.user);
  }

  private clear() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore storage failures
    }
    this.userSignal.set(null);
  }

  private broadcastLogout() {
    try {
      localStorage.setItem(LEGACY_LOGOUT_KEY, String(Date.now()));
      localStorage.removeItem(LEGACY_LOGOUT_KEY);
    } catch {
      // ignore storage failures
    }
    this.channel?.postMessage('logout');
  }

  private readUser(): User | null {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
