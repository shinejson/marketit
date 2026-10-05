import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CurrencyService } from '../../core/currency.service';
import {
  ProfileActivityEntry,
  ProfileActivityStats,
  ProfilePayload,
  ProfileSession,
} from '../../core/models';

type ProfileTab = 'overview' | 'activity' | 'security';

/**
 * "My account" for whoever signed into the tenant console — the person who
 * registered the workspace or a teammate they invited.
 *
 * Three jobs: keep your details current, see every action you have taken in
 * this workspace (the audit trail, filtered to you), and manage how you sign
 * in — password plus the devices holding a live session.
 */
@Component({
  selector: 'app-seller-profile',
  imports: [FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="profile-page">
      <header class="page-head">
        <div>
          <p class="eyebrow">Tenant console / Account</p>
          <h1>My profile</h1>
          <p class="intro">Your details, your activity trail and the sessions signed in as you.</p>
        </div>
        <div class="head-actions">
          <button class="btn ghost" type="button" (click)="reload()" [disabled]="loading()">Refresh</button>
          @if (tab() === 'overview') {
            <button class="btn primary" type="button" (click)="save()" [disabled]="saving() || !form">{{ saving() ? 'Saving…' : 'Save profile' }}</button>
          }
        </div>
      </header>

      @if (notice()) { <div class="notice success">✓ {{ notice() }}</div> }
      @if (error()) { <div class="notice error">{{ error() }}</div> }

      @if (profile(); as p) {
        <section class="card hero">
          <div class="identity">
            <label class="avatar" [class.busy]="uploading()">
              @if (p.user.avatar_url) { <img [src]="p.user.avatar_url" [alt]="p.user.name" /> } @else { <span>{{ initials() }}</span> }
              <input type="file" accept="image/*" (change)="uploadAvatar($event)" hidden />
              <i class="edit">{{ uploading() ? '…' : 'Edit' }}</i>
            </label>
            <div class="who">
              <h2>{{ p.user.name }}</h2>
              <p class="muted">{{ p.user.email }}</p>
              <div class="tags">
                <span class="tag role">{{ roleLabel(p.user.role) }}</span>
                @if (p.tenant) { <span class="tag">{{ p.tenant.name }}</span> }
                @if (p.tenant?.is_owner) { <span class="tag owner">Workspace owner</span> }
                @if (p.user.job_title) { <span class="tag">{{ p.user.job_title }}</span> }
                <span class="tag currency">{{ currency.displayMeta().symbol }} {{ currency.display() }}</span>
              </div>
            </div>
          </div>
          <dl class="facts">
            <div><dt>Member since</dt><dd>{{ p.user.created_at ? (p.user.created_at | date: 'MMM d, y') : '—' }}</dd></div>
            <div><dt>Last sign-in</dt><dd>{{ p.user.last_login_at ? (p.user.last_login_at | date: 'MMM d, HH:mm') : 'Never' }}</dd></div>
            <div><dt>Last seen</dt><dd>{{ rel(p.user.last_seen_at) }}</dd></div>
            <div><dt>Tracked actions</dt><dd>{{ p.stats.activity_total | number }}</dd></div>
          </dl>
        </section>

        <div class="kpis">
          <div class="card kpi"><p>Actions all time</p><strong>{{ p.stats.activity_total | number }}</strong><small>recorded in the audit trail</small></div>
          <div class="card kpi"><p>Last 7 days</p><strong>{{ p.stats.activity_last_7_days | number }}</strong><small>your recent footprint</small></div>
          <div class="card kpi"><p>Active sessions</p><strong>{{ p.stats.active_sessions | number }}</strong><small>devices signed in as you</small></div>
          @if (p.stats.products_in_workspace !== undefined) {
            <div class="card kpi"><p>Workspace catalogue</p><strong>{{ p.stats.products_in_workspace | number }}</strong><small>products · {{ p.stats.stores_in_workspace ?? 0 }} stores</small></div>
          }
        </div>

        <nav class="tabs card" aria-label="Profile sections">
          <button type="button" [class.active]="tab() === 'overview'" (click)="tab.set('overview')">Profile details</button>
          <button type="button" [class.active]="tab() === 'activity'" (click)="switchToActivity()">Activity</button>
          <button type="button" [class.active]="tab() === 'security'" (click)="switchToSecurity()">Security &amp; sessions</button>
        </nav>

        @if (tab() === 'overview' && form) {
          <section class="card panel">
            <div class="panel-title"><div><p class="eyebrow">Who you are</p><h2>Profile details</h2><p>Shown to teammates across the workspace and on anything you issue.</p></div></div>
            <div class="form-grid">
              <label class="field"><span>Full name</span><input [(ngModel)]="form.name" name="name" /></label>
              <label class="field"><span>Email</span><input type="email" [(ngModel)]="form.email" name="email" /></label>
              <label class="field"><span>Phone</span><input [(ngModel)]="form.phone" name="phone" placeholder="+233 24 000 0000" /></label>
              <label class="field"><span>Job title</span><input [(ngModel)]="form.job_title" name="job_title" placeholder="e.g. Operations lead" /></label>
              <label class="field"><span>Timezone</span>
                <select [(ngModel)]="form.timezone" name="timezone">
                  <option [ngValue]="null">Use workspace default</option>
                  <option>Africa/Accra</option><option>Africa/Lagos</option><option>Africa/Nairobi</option><option>Europe/London</option><option>UTC</option>
                </select>
              </label>
              <label class="field"><span>Preferred currency</span>
                <select [(ngModel)]="form.preferred_currency" name="preferred_currency">
                  <option [ngValue]="null">Follow the workspace</option>
                  @for (c of currency.currencies(); track c.code) { <option [value]="c.code">{{ c.code }} — {{ c.name }}</option> }
                </select>
                <small>Only affects how figures are shown to you.</small>
              </label>
              <label class="field wide"><span>About</span><textarea rows="3" [(ngModel)]="form.bio" name="bio" placeholder="A line about what you do here…"></textarea></label>
            </div>
          </section>

          <section class="card panel">
            <div class="panel-title"><div><p class="eyebrow">Access</p><h2>Roles &amp; permissions</h2><p>What this account may do. Changes are made by a workspace owner under Users &amp; permissions.</p></div></div>
            <div class="chips">
              @for (role of p.roles; track role.role + '-' + role.tenant_id) {
                <span class="chip">{{ roleLabel(role.role) }}@if (role.department) { <small> · {{ role.department }}</small> }</span>
              }
            </div>
            @if (p.permissions.length) {
              <div class="perm-grid">
                @for (perm of p.permissions; track perm) { <span class="perm">{{ perm }}</span> }
              </div>
            } @else { <p class="muted pad">No workspace permissions recorded.</p> }
          </section>
        }

        @if (tab() === 'activity') {
          <section class="card panel">
            <div class="panel-title">
              <div><p class="eyebrow">Audit trail</p><h2>What you have been doing</h2><p>Every create, update, delete and sign-in recorded against your account.</p></div>
              @if (activityStats(); as st) { <span class="completion">{{ st.last_30_days | number }} in 30 days</span> }
            </div>

            @if (activityStats(); as st) {
              <div class="spark">
                @for (day of st.trend; track day.day) {
                  <span class="bar" [style.height.%]="barHeight(day.count, st.trend)" [title]="day.day + ': ' + day.count"></span>
                }
              </div>
              @if (st.by_action.length) {
                <div class="chips actions">
                  @for (a of st.by_action; track a.action) { <span class="chip"><b>{{ a.action }}</b> {{ a.count | number }}</span> }
                </div>
              }
            }

            <div class="filters">
              <label class="f wide"><span>Search</span><input [(ngModel)]="filters.q" name="q" (keyup.enter)="loadActivity(true)" placeholder="Action, subject or IP…" /></label>
              <label class="f"><span>Action</span>
                <select [(ngModel)]="filters.action" name="action" (change)="loadActivity(true)">
                  <option value="">All actions</option>
                  @for (a of activityStats()?.by_action ?? []; track a.action) { <option [value]="a.action">{{ a.action }}</option> }
                </select>
              </label>
              <label class="f"><span>From</span><input type="date" [(ngModel)]="filters.from" name="from" (change)="loadActivity(true)" /></label>
              <label class="f"><span>To</span><input type="date" [(ngModel)]="filters.to" name="to" (change)="loadActivity(true)" /></label>
            </div>

            @if (!activity().length) {
              <p class="pad muted">{{ activityLoading() ? 'Loading your activity…' : 'Nothing recorded yet — actions you take appear here automatically.' }}</p>
            } @else {
              <ol class="timeline">
                @for (row of activity(); track row.id) {
                  <li>
                    <span class="dot" [attr.data-kind]="kind(row.action)"></span>
                    <div class="entry">
                      <p class="line"><b>{{ describe(row) }}</b> <span class="muted">{{ row.created_at | date: 'MMM d, HH:mm' }}</span></p>
                      <p class="meta muted">{{ row.action }} · {{ row.subject_label }}@if (row.subject_id) { #{{ row.subject_id }} } @if (row.ip) { · {{ row.ip }} }</p>
                      @if (expanded() === row.id && row.diff) {
                        <pre class="diff">{{ pretty(row.diff) }}</pre>
                      }
                      <button type="button" class="link" (click)="toggle(row.id)">{{ expanded() === row.id ? 'Hide details' : 'Details' }}</button>
                    </div>
                  </li>
                }
              </ol>
              @if (activity().length < activityTotal()) {
                <button class="btn ghost more" type="button" (click)="loadMore()" [disabled]="activityLoading()">{{ activityLoading() ? 'Loading…' : 'Load more' }}</button>
              }
              <p class="muted pad">Showing {{ activity().length | number }} of {{ activityTotal() | number }} events.</p>
            }
          </section>
        }

        @if (tab() === 'security') {
          <section class="card panel">
            <div class="panel-title"><div><p class="eyebrow">Security</p><h2>Change password</h2><p>Updating your password signs out every other device.</p></div></div>
            <div class="form-grid">
              <label class="field"><span>Current password</span><input type="password" [(ngModel)]="password.current_password" name="current" autocomplete="current-password" /></label>
              <label class="field"><span>New password</span><input type="password" [(ngModel)]="password.password" name="new" autocomplete="new-password" /></label>
              <label class="field"><span>Confirm new password</span><input type="password" [(ngModel)]="password.password_confirmation" name="confirm" autocomplete="new-password" /></label>
            </div>
            <button class="btn primary" type="button" (click)="changePassword()" [disabled]="passwordSaving()">{{ passwordSaving() ? 'Updating…' : 'Update password' }}</button>
          </section>

          <section class="card panel">
            <div class="panel-title"><div><p class="eyebrow">Devices</p><h2>Active sessions</h2><p>Each bearer token issued to you. Revoke anything you do not recognise.</p></div></div>
            @if (!sessions().length) { <p class="pad muted">No active sessions found.</p> } @else {
              <table class="sessions">
                <thead><tr><th>Session</th><th>Started</th><th>Last used</th><th></th></tr></thead>
                <tbody>
                  @for (s of sessions(); track s.id) {
                    <tr>
                      <td><b>{{ s.name || 'Session' }}</b>@if (s.current) { <span class="tag owner">This device</span> }</td>
                      <td class="muted">{{ s.created_at ? (s.created_at | date: 'MMM d, HH:mm') : '—' }}</td>
                      <td class="muted">{{ rel(s.last_used_at) }}</td>
                      <td class="right">@if (!s.current) { <button type="button" class="link danger" (click)="revoke(s)">Revoke</button> }</td>
                    </tr>
                  }
                </tbody>
              </table>
              <button class="btn outline" type="button" (click)="revokeOthers()">Sign out everywhere else</button>
            }
          </section>
        }
      } @else {
        <div class="card loading">{{ error() ? 'Could not load your profile.' : 'Loading your profile…' }}</div>
      }
    </div>
  `,
  styles: [`
    :host{display:block;max-width:1100px;margin:0 auto;padding-bottom:70px}
    .page-head{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;margin-bottom:18px}
    .eyebrow{margin:0 0 6px;color:var(--accent);font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}
    .page-head h1{margin:0;font-size:clamp(28px,3vw,38px)}
    .intro{margin:7px 0 0;color:var(--ink-soft);font-size:14px}
    .head-actions{display:flex;gap:10px}
    .btn{border-radius:10px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;border:0}
    .btn.primary{background:var(--accent-2);color:#fff}
    .btn.ghost{background:transparent;border:1px solid var(--line);color:var(--ink)}
    .btn.outline{border:1px solid var(--line);background:var(--card);color:var(--ink);margin-top:12px}
    .btn:disabled{opacity:.55;cursor:not-allowed}
    .notice{padding:11px 14px;border-radius:11px;margin-bottom:14px;font-size:13px}
    .notice.success{background:color-mix(in srgb,var(--ok) 12%,transparent);color:var(--ok)}
    .notice.error{background:color-mix(in srgb,var(--danger) 12%,transparent);color:var(--danger)}
    .hero{display:flex;justify-content:space-between;gap:26px;align-items:center;padding:22px 24px;flex-wrap:wrap}
    .identity{display:flex;gap:16px;align-items:center}
    .avatar{position:relative;width:74px;height:74px;border-radius:50%;display:grid;place-items:center;background:var(--accent-2);color:#fff;font-size:26px;font-weight:800;overflow:hidden;cursor:pointer;flex:none}
    .avatar img{width:100%;height:100%;object-fit:cover}
    .avatar .edit{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.55);font-size:9.5px;font-style:normal;text-align:center;padding:2px 0;letter-spacing:.06em;text-transform:uppercase}
    .avatar.busy{opacity:.6}
    .who h2{margin:0;font-size:24px}
    .who p{margin:3px 0 8px;font-size:13px}
    .tags{display:flex;flex-wrap:wrap;gap:6px}
    .tag{padding:4px 9px;border-radius:999px;border:1px solid var(--line);font-size:10.5px;font-weight:750}
    .tag.role{background:var(--ink);color:var(--card);border-color:transparent}
    .tag.owner{background:color-mix(in srgb,var(--ok) 14%,transparent);color:var(--ok);border-color:transparent;margin-left:8px}
    .tag.currency{background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);border-color:transparent}
    .facts{display:grid;grid-template-columns:repeat(2,minmax(130px,1fr));gap:12px 26px;margin:0}
    .facts dt{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);font-weight:800}
    .facts dd{margin:2px 0 0;font-size:13.5px;font-weight:650}
    .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:14px 0}
    .kpi{padding:15px 17px}
    .kpi p{margin:0;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft)}
    .kpi strong{display:block;margin:6px 0 2px;font-size:26px}
    .kpi small{color:var(--ink-soft);font-size:11px}
    .tabs{display:flex;gap:4px;padding:6px;margin-bottom:14px;overflow:auto}
    .tabs button{border:0;background:transparent;color:var(--ink);padding:10px 15px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
    .tabs button.active{background:var(--ink);color:var(--card)}
    .panel{padding:21px 23px;margin-bottom:14px}
    .panel-title{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:16px}
    .panel-title h2{margin:0;font-size:20px}
    .panel-title p:not(.eyebrow){margin:4px 0 0;color:var(--ink-soft);font-size:12px}
    .completion{padding:6px 9px;border-radius:7px;background:color-mix(in srgb,var(--ok) 12%,transparent);color:var(--ok);font-size:10px;font-weight:800;white-space:nowrap}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}
    .field{display:flex;flex-direction:column;gap:6px;margin-bottom:15px}
    .field.wide{grid-column:1/-1}
    .field span{font-size:12px;font-weight:750}
    .field input,.field select,.field textarea{width:100%;border:1px solid var(--line);border-radius:9px;padding:10px 11px;background:var(--card);color:var(--ink)}
    .field small,.muted{color:var(--ink-soft)}
    .field small{font-size:10.5px}
    .chips{display:flex;flex-wrap:wrap;gap:7px}
    .chip{padding:5px 10px;border-radius:999px;border:1px solid var(--line);font-size:11.5px;font-weight:700}
    .chips.actions{margin:12px 0 4px}
    .perm-grid{display:flex;flex-wrap:wrap;gap:5px;margin-top:13px}
    .perm{font-family:ui-monospace,monospace;font-size:10.5px;padding:3px 7px;border-radius:6px;background:var(--paper-2);color:var(--ink-soft)}
    .spark{display:flex;align-items:flex-end;gap:4px;height:62px;margin-bottom:6px}
    .spark .bar{flex:1;min-height:3px;background:color-mix(in srgb,var(--accent-2) 70%,transparent);border-radius:3px 3px 0 0}
    .filters{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:12px;margin:16px 0}
    .f{display:flex;flex-direction:column;gap:5px;font-size:11.5px;font-weight:700}
    .f input,.f select{border:1px solid var(--line);border-radius:9px;padding:9px 10px;background:var(--card);color:var(--ink);font-weight:500}
    .timeline{list-style:none;margin:0;padding:0}
    .timeline li{display:grid;grid-template-columns:18px 1fr;gap:12px;padding:12px 0;border-top:1px solid var(--line)}
    .dot{width:10px;height:10px;border-radius:50%;margin-top:6px;background:var(--ink-soft)}
    .dot[data-kind="created"]{background:var(--ok)}
    .dot[data-kind="updated"]{background:var(--accent)}
    .dot[data-kind="deleted"]{background:var(--danger)}
    .dot[data-kind="auth"]{background:var(--accent-2)}
    .entry .line{margin:0;font-size:13.5px;display:flex;gap:9px;flex-wrap:wrap;align-items:baseline}
    .entry .meta{margin:3px 0 0;font-size:11px}
    .link{background:none;border:0;padding:0;margin-top:5px;color:var(--accent);font-size:11.5px;font-weight:700;cursor:pointer}
    .link.danger{color:var(--danger)}
    .diff{margin:8px 0 0;padding:10px;background:var(--paper-2);border-radius:9px;font-size:11px;max-height:220px;overflow:auto;white-space:pre-wrap}
    .sessions{width:100%;border-collapse:collapse;font-size:13px}
    .sessions th{text-align:left;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-soft);padding-bottom:8px}
    .sessions td{padding:10px 0;border-top:1px solid var(--line)}
    .sessions .right{text-align:right}
    .pad{padding:12px 0;font-size:12.5px}
    .more{margin-top:12px}
    .loading{padding:40px;text-align:center;color:var(--ink-soft)}
    @media(max-width:760px){.form-grid,.filters{grid-template-columns:1fr}.page-head{flex-direction:column;align-items:flex-start}.facts{grid-template-columns:1fr 1fr}}
  `],
})
export class SellerProfileComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  currency = inject(CurrencyService);

  profile = signal<ProfilePayload | null>(null);
  form: Partial<ProfilePayload['user']> | null = null;
  tab = signal<ProfileTab>('overview');
  loading = signal(false);
  saving = signal(false);
  uploading = signal(false);
  notice = signal('');
  error = signal('');

  activity = signal<ProfileActivityEntry[]>([]);
  activityStats = signal<ProfileActivityStats | null>(null);
  activityTotal = signal(0);
  activityLoading = signal(false);
  activityPage = signal(1);
  expanded = signal<number | null>(null);
  filters = { q: '', action: '', from: '', to: '' };

  sessions = signal<ProfileSession[]>([]);
  password = { current_password: '', password: '', password_confirmation: '' };
  passwordSaving = signal(false);

  initials = computed(() => {
    const name = this.profile()?.user.name ?? this.auth.user()?.name ?? '';
    return (
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'U'
    );
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .profile()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.profile.set(res.data);
          this.form = { ...res.data.user };
        },
        error: () => this.error.set('Could not load your profile.'),
      });
  }

  save(): void {
    if (!this.form) return;
    this.saving.set(true);
    this.notice.set('');
    this.error.set('');
    const payload = {
      name: this.form.name,
      email: this.form.email,
      phone: this.form.phone ?? null,
      job_title: this.form.job_title ?? null,
      bio: this.form.bio ?? null,
      timezone: this.form.timezone ?? null,
      preferred_currency: this.form.preferred_currency ?? null,
    };

    this.api
      .updateProfile(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (res) => {
          this.profile.set(res.data);
          this.form = { ...res.data.user };
          this.notice.set('Profile updated.');
          // A personal currency preference overrides the workspace default.
          if (res.data.user.preferred_currency) this.currency.setDisplay(res.data.user.preferred_currency);
        },
        error: (e) => this.error.set(e.error?.error?.message || 'Could not save your profile.'),
      });
  }

  uploadAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.api
      .uploadProfileAvatar(file)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: () => {
          input.value = '';
          this.notice.set('Profile photo updated.');
          this.reload();
        },
        error: (e) => this.error.set(e.error?.error?.message || 'Could not upload that image.'),
      });
  }

  /* ------------------------------------------------------------ activity */

  switchToActivity(): void {
    this.tab.set('activity');
    if (!this.activity().length) this.loadActivity(true);
  }

  loadActivity(reset = false): void {
    if (reset) {
      this.activityPage.set(1);
      this.activity.set([]);
    }
    this.activityLoading.set(true);
    const params: Record<string, string | number> = { page: this.activityPage(), per_page: 20 };
    if (this.filters.q) params['q'] = this.filters.q;
    if (this.filters.action) params['action'] = this.filters.action;
    if (this.filters.from) params['from'] = this.filters.from;
    if (this.filters.to) params['to'] = this.filters.to;

    this.api
      .profileActivity(params)
      .pipe(finalize(() => this.activityLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.activity.update((rows) => (this.activityPage() === 1 ? res.data : [...rows, ...res.data]));
          this.activityTotal.set(res.meta.total);
          this.activityStats.set(res.stats);
        },
        error: () => this.error.set('Could not load your activity.'),
      });
  }

  loadMore(): void {
    this.activityPage.update((p) => p + 1);
    this.loadActivity();
  }

  toggle(id: number): void {
    this.expanded.update((current) => (current === id ? null : id));
  }

  barHeight(count: number, trend: { count: number }[]): number {
    const peak = Math.max(1, ...trend.map((t) => t.count));
    return Math.max(4, Math.round((count / peak) * 100));
  }

  /** Turn "product.updated"/"created" into a sentence a human reads. */
  describe(row: ProfileActivityEntry): string {
    const subject = row.subject_label || 'record';
    switch (row.action) {
      case 'auth.login':
        return 'Signed in';
      case 'auth.logout':
        return 'Signed out';
      case 'auth.registered':
        return 'Created this account';
      case 'profile.updated':
        return 'Updated profile details';
      case 'profile.password_changed':
        return 'Changed password';
      case 'profile.avatar_updated':
        return 'Changed profile photo';
      case 'currency.changed':
        return 'Changed the workspace currency';
      case 'created':
        return `Created a ${subject.toLowerCase()}`;
      case 'updated':
        return `Updated a ${subject.toLowerCase()}`;
      case 'deleted':
        return `Deleted a ${subject.toLowerCase()}`;
      default:
        return `${row.action} · ${subject}`;
    }
  }

  kind(action: string): string {
    if (action.startsWith('auth') || action.startsWith('profile')) return 'auth';
    return action;
  }

  pretty(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  /* ------------------------------------------------------------ security */

  switchToSecurity(): void {
    this.tab.set('security');
    if (!this.sessions().length) this.loadSessions();
  }

  loadSessions(): void {
    this.api.profileSessions().subscribe({
      next: (res) => this.sessions.set(res.data),
      error: () => this.error.set('Could not load your sessions.'),
    });
  }

  changePassword(): void {
    this.notice.set('');
    this.error.set('');
    if (!this.password.current_password || !this.password.password) {
      this.error.set('Enter your current and new password.');
      return;
    }
    if (this.password.password !== this.password.password_confirmation) {
      this.error.set('The new passwords do not match.');
      return;
    }

    this.passwordSaving.set(true);
    this.api
      .updateProfilePassword(this.password)
      .pipe(finalize(() => this.passwordSaving.set(false)))
      .subscribe({
        next: (res) => {
          this.password = { current_password: '', password: '', password_confirmation: '' };
          this.notice.set(`Password updated. ${res.data.sessions_revoked} other session(s) signed out.`);
          this.loadSessions();
        },
        error: (e) => this.error.set(e.error?.error?.message || 'Could not update your password.'),
      });
  }

  revoke(session: ProfileSession): void {
    this.api.revokeAuthSession(session.id).subscribe({
      next: () => this.loadSessions(),
      error: () => this.error.set('Could not revoke that session.'),
    });
  }

  revokeOthers(): void {
    this.api.revokeOtherAuthSessions().subscribe({
      next: () => {
        this.notice.set('Signed out of every other device.');
        this.loadSessions();
      },
      error: () => this.error.set('Could not sign out other sessions.'),
    });
  }

  /* -------------------------------------------------------------- shared */

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      tenant_owner: 'Workspace owner',
      store_staff: 'Team member',
      super_admin: 'Platform admin',
      customer: 'Customer',
    };
    return labels[role] ?? role.replace(/_/g, ' ');
  }

  rel(value?: string | null): string {
    if (!value) return 'Never';
    const diff = Date.now() - Date.parse(value);
    if (!Number.isFinite(diff)) return '—';
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return days < 30 ? `${days}d ago` : new Date(value).toLocaleDateString();
  }
}
