import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AuthSession, SettingField } from '../../core/models';

@Component({
  selector: 'app-admin-security',
  imports: [DatePipe, TitleCasePipe, RouterLink],
  template: `
    <header class="head">
      <div>
        <p class="eyebrow">Access control</p>
        <h1>Security centre</h1>
        <p class="muted">Review active sessions, revoke access and keep the platform policy intentional.</p>
      </div>
      <button class="btn ghost" type="button" (click)="refresh()" [disabled]="loading()">Refresh</button>
    </header>

    @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
    @if (notice()) { <p class="ok-msg" role="status">{{ notice() }}</p> }

    <div class="grid posture">
      <article class="card pad posture-card"><span class="status-dot good"></span><div><strong>Bearer sessions</strong><p class="muted small">Short-lived, revocable access tokens</p></div></article>
      <article class="card pad posture-card"><span class="status-dot" [class.good]="twoFactorEnabled()" [class.warn]="!twoFactorEnabled()"></span><div><strong>Admin 2FA</strong><p class="muted small">{{ twoFactorEnabled() ? 'Required by platform policy' : 'Recommended — enable in settings' }}</p></div></article>
      <article class="card pad posture-card"><span class="status-dot good"></span><div><strong>Login throttling</strong><p class="muted small">{{ setting('max_login_attempts') || 5 }} attempts before throttling</p></div></article>
      <article class="card pad posture-card"><span class="status-dot good"></span><div><strong>Session lifetime</strong><p class="muted small">{{ setting('session_timeout_minutes') || 120 }} minutes</p></div></article>
    </div>

    <section class="card pad sessions-card">
      <div class="section-head">
        <div><h2>Active sessions</h2><p class="muted small">Revoke a device you do not recognise. Signing out of other sessions keeps this browser active.</p></div>
        <button class="btn danger ghost" type="button" (click)="revokeOthers()" [disabled]="loading() || sessions().length < 2">Sign out other sessions</button>
      </div>

      @if (loading()) {
        <div class="skeleton" style="height:120px"></div>
      } @else {
        <div class="session-list">
          @for (session of sessions(); track session.id) {
            <div class="session-row">
              <div class="device"><span class="device-icon">⌁</span><div><strong>{{ session.name | titlecase }} session</strong><p class="muted small">Started {{ session.created_at | date:'MMM d, y, h:mm a' }} · Last used {{ session.last_used_at ? (session.last_used_at | date:'MMM d, h:mm a') : 'not yet' }}</p></div></div>
              <div class="session-actions"><span class="pill" [class.active-pill]="session.current">{{ session.current ? 'This device' : 'Active' }}</span><button class="btn ghost small-btn danger" type="button" (click)="revoke(session)">Revoke</button></div>
            </div>
          } @empty { <p class="empty muted">No active sessions were found. Sign in again to create one.</p> }
        </div>
      }
    </section>

    <section class="card pad hardening">
      <div><h2>Hardening checklist</h2><p class="muted small">Settings changes are audited. Secrets in the platform configuration are encrypted and write-only.</p></div>
      <div class="check-grid">
        <a routerLink="/admin/settings" class="check"><span>✓</span><div><strong>Review security policy</strong><small>2FA, session lifetime and upload limits</small></div></a>
        <a routerLink="/admin/settings" class="check"><span>✓</span><div><strong>Configure payment webhooks</strong><small>Use provider signing secrets and a narrow tolerance</small></div></a>
        <a routerLink="/admin/audit" class="check"><span>✓</span><div><strong>Inspect audit activity</strong><small>Look for unfamiliar IPs or permission changes</small></div></a>
      </div>
    </section>
  `,
  styles: [`
    :host { display:block; }
    .head { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; }
    .head h1 { margin:0 0 4px; }
    .eyebrow { margin:0 0 5px; color:var(--accent); text-transform:uppercase; letter-spacing:.12em; font-size:11px; font-weight:800; }
    .posture { grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); margin:20px 0; }
    .posture-card { display:flex; align-items:flex-start; gap:11px; padding:15px; }
    .posture-card p { margin:4px 0 0; }
    .status-dot { display:block; width:10px; height:10px; flex:none; margin-top:4px; border-radius:50%; background:var(--ink-soft); box-shadow:0 0 0 4px color-mix(in srgb,var(--ink-soft) 12%,transparent); }
    .status-dot.good { background:var(--ok); box-shadow:0 0 0 4px color-mix(in srgb,var(--ok) 13%,transparent); }
    .status-dot.warn { background:var(--accent); box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 13%,transparent); }
    .pad { padding:20px; }
    .section-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; }
    h2 { margin:0; font-size:19px; }
    .section-head p { margin:4px 0 0; }
    .session-list { margin-top:16px; }
    .session-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 0; border-top:1px solid var(--line); }
    .device, .session-actions { display:flex; align-items:center; gap:10px; }
    .device { min-width:0; }
    .device p { margin:3px 0 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .device-icon { display:grid; place-items:center; width:34px; height:34px; border-radius:10px; background:var(--paper-2); color:var(--accent); font-size:20px; }
    .active-pill { color:var(--ok); background:color-mix(in srgb,var(--ok) 12%,transparent); }
    .small-btn { padding:7px 10px; font-size:12px; }
    .danger { color:var(--danger); }
    .empty { padding:22px 0; margin:0; }
    .hardening { margin-top:18px; }
    .hardening > div:first-child p { margin:4px 0 0; }
    .check-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; margin-top:15px; }
    .check { display:flex; gap:10px; padding:13px; border:1px solid var(--line); border-radius:13px; }
    .check:hover { border-color:var(--accent); }
    .check > span { color:var(--ok); font-weight:800; }
    .check strong, .check small { display:block; }
    .check small { margin-top:3px; color:var(--ink-soft); }
    @media (max-width:650px) { .session-row { align-items:flex-start; flex-direction:column; } .session-actions { width:100%; justify-content:space-between; } }
  `],
})
export class AdminSecurityComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  sessions = signal<AuthSession[]>([]);
  settings = signal<SettingField[]>([]);
  loading = signal(true);
  error = signal('');
  notice = signal('');

  twoFactorEnabled = computed(() => !!this.settings().find((item) => item.key === 'require_2fa_admins')?.value);

  constructor() { this.refresh(); }

  setting(key: string): string {
    const item = this.settings().find((field) => field.key === key);
    return item?.value === null || item?.value === undefined ? '' : String(item.value);
  }

  refresh() {
    this.loading.set(true);
    this.error.set('');
    this.api.authSessions().subscribe({
      next: (res) => { this.sessions.set(res.data); this.loading.set(false); },
      error: () => { this.error.set('Could not load active sessions.'); this.loading.set(false); },
    });
    this.api.adminSettings().subscribe({
      next: (res) => this.settings.set(Object.values(res.data).flat()),
      error: () => undefined,
    });
  }

  revoke(session: AuthSession) {
    if (session.current) {
      this.auth.logout();
      return;
    }
    this.api.revokeAuthSession(session.id).subscribe({
      next: () => { this.notice.set('Session revoked.'); this.refresh(); },
      error: () => this.error.set('Could not revoke that session.'),
    });
  }

  revokeOthers() {
    if (!confirm('Sign out every other active session?')) return;
    this.api.revokeOtherAuthSessions().subscribe({
      next: (res) => { this.notice.set(`${res.data.revoked} other session(s) signed out.`); this.refresh(); },
      error: () => this.error.set('Could not revoke other sessions.'),
    });
  }
}
