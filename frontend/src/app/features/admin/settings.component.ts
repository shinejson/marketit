import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import {
  BackupMeta,
  GatewayTestResult,
  PlatformBackup,
  SettingField,
  SettingGroupMeta,
  SettingsPayload,
} from '../../core/models';

/** Sentinel the API understands as "wipe this stored secret". */
const CLEAR_SECRET = '__clear__';

@Component({
  selector: 'app-admin-settings',
  imports: [FormsModule, DatePipe],
  template: `
    <header class="head">
      <div>
        <p class="eyebrow">Platform configuration</p>
        <h1>Settings</h1>
        <p class="muted">Owner records, branding, delivery channels and recovery — applied across every tenant.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" type="button" (click)="discard()" [disabled]="!dirty() || busy()">Discard</button>
        <button class="btn ghost" type="button" (click)="reset()" [disabled]="busy()">Reset section</button>
        <button class="btn accent" type="button" (click)="save()" [disabled]="busy() || !dirty()">
          {{ busy() ? 'Saving…' : 'Save changes' }}
          @if (dirty()) { <span class="badge">{{ changedCount() }}</span> }
        </button>
      </div>
    </header>

    @if (error()) { <p class="err banner" role="alert">{{ error() }}</p> }
    @if (notice()) { <p class="ok-msg banner" role="status">{{ notice() }}</p> }

    <div class="layout">
      <nav class="card nav" aria-label="Settings sections">
        @for (g of groups(); track g.key) {
          <button type="button" class="nav-item" [class.on]="group() === g.key" (click)="selectGroup(g.key)">
            <span class="nav-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                @switch (g.icon) {
                  @case ('sliders') { <path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/> }
                  @case ('building') { <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16"/><path d="M15 9h3a2 2 0 0 1 2 2v10"/><path d="M8 7h3M8 11h3M8 15h3M2 21h20"/> }
                  @case ('palette') { <path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.4 0-1.1.9-2 2-2h1.5A4.5 4.5 0 0 0 21 9.7C20.8 5.9 16.9 3 12 3Z"/><circle cx="7.5" cy="10.5" r="1.1"/><circle cx="12" cy="7.5" r="1.1"/><circle cx="16.5" cy="10.5" r="1.1"/> }
                  @case ('cart') { <circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/> }
                  @case ('card') { <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/> }
                  @case ('mail') { <rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3 7 9 6 9-6"/> }
                  @case ('chat') { <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.4-4.4A8 8 0 0 1 13 4a8 8 0 0 1 8 8Z"/><path d="M9 11h8M9 15h5"/> }
                  @case ('bell') { <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/> }
                  @case ('shield') { <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/> }
                  @case ('database') { <ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/><path d="M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/> }
                }
              </svg>
            </span>
            <span class="nav-copy">
              <strong>{{ g.label }}</strong>
              <small>{{ g.description }}</small>
            </span>
            @if (groupDirty(g.key)) { <i class="dot" aria-label="Unsaved changes"></i> }
          </button>
        }
      </nav>

      <div class="panel">
        @if (loading()) {
          <div class="skeleton" style="height:420px"></div>
        } @else {
          @if (activeGroup(); as g) {
            <div class="panel-head">
              <div>
                <h2>{{ g.label }}</h2>
                <p class="muted">{{ g.description }}</p>
              </div>
              <span class="pill">{{ visible().length }} settings</span>
            </div>
          }

          <!-- ------------------------------------------------ branding -->
          @if (group() === 'branding') {
            <section class="card pad">
              <div class="block-head">
                <h3>Brand assets</h3>
                <p class="muted small">Uploads are stored on the platform CDN path and applied immediately — no save needed.</p>
              </div>
              <div class="assets">
                @for (f of assetFields(); track f.key) {
                  <article class="asset">
                    <div class="asset-preview" [class.tiny-preview]="f.key === 'brand_favicon'">
                      @if (f.value) {
                        <img [src]="asText(f)" [alt]="f.label" />
                      } @else {
                        <span class="placeholder">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m5 17 4.5-5 3.5 4 2.5-3 3.5 4"/><circle cx="9" cy="9.5" r="1.4"/></svg>
                          Nothing uploaded
                        </span>
                      }
                    </div>
                    <div class="asset-copy">
                      <strong>{{ f.label }}</strong>
                      <p class="muted small">{{ f.help }}</p>
                      <div class="asset-actions">
                        <label class="btn ghost small-btn file-label">
                          {{ f.value ? 'Replace file' : 'Upload file' }}
                          <input type="file" [accept]="accept(f.key)" (change)="upload(f, $event)" />
                        </label>
                        @if (f.value) {
                          <button class="btn ghost small-btn danger" type="button" (click)="removeAsset(f)">Remove</button>
                        }
                      </div>
                      @if (uploading() === f.key) { <p class="muted tiny">Uploading…</p> }
                      @else if (f.updated_at) { <p class="muted tiny">Updated {{ f.updated_at | date: 'MMM d, y, h:mm a' }}</p> }
                    </div>
                  </article>
                }
              </div>
            </section>

            <section class="card pad brand-preview">
              <div class="block-head">
                <h3>Live preview</h3>
                <p class="muted small">How the identity reads in a browser tab and on the console header.</p>
              </div>
              <div class="preview-grid">
                <div class="tab-mock">
                  <div class="tab-chip">
                    @if (settingValue('brand_favicon'); as fav) { <img [src]="fav" alt="" /> } @else { <i class="fav-fallback">{{ initial() }}</i> }
                    <span>{{ settingValue('platform_name') || 'MarketHub' }}</span>
                    <b>×</b>
                  </div>
                  <div class="tab-bar"><span>{{ settingValue('platform_url') || 'https://markethub.test' }}</span></div>
                </div>
                <div class="logo-mock light">
                  @if (settingValue('brand_logo'); as logo) { <img [src]="logo" alt="Logo on light" /> } @else { <span class="muted small">Primary logo</span> }
                </div>
                <div class="logo-mock dark">
                  @if (settingValue('brand_logo_dark') || settingValue('brand_logo'); as logo) { <img [src]="logo" alt="Logo on dark" /> } @else { <span class="small">Dark-mode logo</span> }
                </div>
                <div class="swatches">
                  <span class="swatch" [style.background]="settingValue('brand_primary_color') || '#c45c26'">Primary</span>
                  <span class="swatch" [style.background]="settingValue('brand_accent_color') || '#1f4b3a'">Accent</span>
                </div>
              </div>
            </section>
          }

          <!-- ----------------------------------------------- payments -->
          @if (group() === 'payments') {
            <section class="card pad payment-health">
              <div class="block-head">
                <h3>Checkout health</h3>
                <p class="muted small">Only the provider status is shown here. Secret keys remain write-only.</p>
              </div>
              @if (paymentStatus(); as p) {
                <div class="payment-health-grid">
                  <div><span class="muted tiny">Provider</span><strong>{{ titleCase(p.provider) }}</strong></div>
                  <div><span class="muted tiny">Environment</span><strong>{{ p.mode === 'live' ? 'Live' : 'Test / sandbox' }}</strong></div>
                  <div><span class="muted tiny">Credentials</span><strong [class.bad-text]="!p.provider_configured">{{ p.provider_configured ? 'Configured' : 'Needs setup' }}</strong></div>
                  <div><span class="muted tiny">Checkout</span><strong [class.bad-text]="!p.enabled">{{ p.enabled ? 'Enabled' : 'Disabled' }}</strong></div>
                </div>
                <div class="method-chips">
                  @for (method of p.methods; track method.key) {
                    <span class="method-chip" [class.off]="!method.enabled">{{ method.label }} · {{ method.enabled ? 'On' : 'Off' }}</span>
                  }
                </div>
              } @else {
                <p class="muted small">Loading provider health…</p>
              }
            </section>
          }

          <!-- ------------------------------------------------- fields -->
          @if (formFields().length) {
            <section class="card pad">
              @if (group() === 'branding') {
                <div class="block-head">
                  <h3>Colours & copy</h3>
                  <p class="muted small">Applied to buttons, badges and the footer of every transactional email.</p>
                </div>
              } @else if (group() === 'owner') {
                <div class="block-head">
                  <h3>Owner & legal entity</h3>
                  <p class="muted small">Used on invoices, legal notices and the seller agreement footer.</p>
                </div>
              } @else if (group() === 'email') {
                <div class="block-head">
                  <h3>Outgoing mail</h3>
                  <p class="muted small">Credentials are encrypted at rest. Leave a secret blank to keep the stored value.</p>
                </div>
              } @else if (group() === 'sms') {
                <div class="block-head">
                  <h3>SMS gateway</h3>
                  <p class="muted small">Pick a provider, store its credentials, then send yourself a test message.</p>
                </div>
              } @else if (group() === 'payments') {
                <div class="block-head">
                  <h3>Online payment methods</h3>
                  <p class="muted small">Hosted checkout keeps card data outside MarketHub. Provider secrets are encrypted and never returned to the browser.</p>
                </div>
              } @else if (group() === 'backup') {
                <div class="block-head">
                  <h3>Schedule & retention</h3>
                  <p class="muted small">Automatic snapshots run on the platform worker; manual snapshots are below.</p>
                </div>
              }

              <div class="fields">
                @for (field of formFields(); track field.key) {
                  <div class="field-row" [class.full]="field.columns === 'full' || field.type === 'text'" [class.toggle-row]="field.type === 'bool'">
                    <div class="field-meta">
                      <label [attr.for]="field.key">{{ field.label }}</label>
                      <p class="muted small">{{ field.help }}</p>
                      @if (changedKeys().includes(field.key)) { <span class="chip warn">Unsaved</span> }
                      @else if (field.updated_at) { <span class="chip">Updated {{ field.updated_at | date: 'MMM d, y' }}</span> }
                    </div>

                    <div class="control">
                      @switch (field.type) {
                        @case ('bool') {
                          <button
                            type="button"
                            class="switch"
                            role="switch"
                            [id]="field.key"
                            [attr.aria-checked]="!!field.value"
                            [class.on]="field.value"
                            (click)="set(field, !field.value)">
                            <span class="knob"></span>
                            <em>{{ field.value ? 'On' : 'Off' }}</em>
                          </button>
                        }
                        @case ('number') {
                          <div class="with-unit">
                            <input type="number" step="any" [id]="field.key" [name]="field.key"
                              [ngModel]="field.value" (ngModelChange)="set(field, $event)" />
                            @if (field.unit) { <span class="unit">{{ field.unit }}</span> }
                          </div>
                        }
                        @case ('select') {
                          <select [id]="field.key" [name]="field.key" [ngModel]="asText(field)" (ngModelChange)="set(field, $event)">
                            @for (opt of field.options || []; track opt.value) {
                              <option [value]="opt.value">{{ opt.label }}</option>
                            }
                          </select>
                        }
                        @case ('text') {
                          <textarea rows="3" [id]="field.key" [name]="field.key" [placeholder]="field.placeholder || ''"
                            [ngModel]="asText(field)" (ngModelChange)="set(field, $event)"></textarea>
                        }
                        @case ('color') {
                          <div class="color-control">
                            <input type="color" [id]="field.key" [name]="field.key + '_picker'"
                              [ngModel]="asText(field) || '#000000'" (ngModelChange)="set(field, $event)" />
                            <input type="text" class="hex" [name]="field.key" [ngModel]="asText(field)" (ngModelChange)="set(field, $event)" />
                          </div>
                        }
                        @case ('secret') {
                          <div class="secret-control">
                            @if (isCleared(field)) {
                              <p class="cleared">Stored value will be deleted when you save.
                                <button type="button" class="link" (click)="undoClear(field)">Undo</button>
                              </p>
                            } @else {
                              <input
                                [type]="revealed().includes(field.key) ? 'text' : 'password'"
                                autocomplete="new-password"
                                [id]="field.key" [name]="field.key"
                                [placeholder]="field.has_value ? '•••••••• saved — leave blank to keep' : 'Not set'"
                                [ngModel]="asText(field)" (ngModelChange)="set(field, $event)" />
                              <button type="button" class="icon-btn" (click)="toggleReveal(field.key)"
                                [attr.aria-label]="revealed().includes(field.key) ? 'Hide value' : 'Show value'">
                                @if (revealed().includes(field.key)) {
                                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.4 5.2A9.6 9.6 0 0 1 12 5c5 0 9 4.5 9 7a11 11 0 0 1-2.4 3.4M6.3 7.3C4.2 8.7 3 10.7 3 12c0 2.5 4 7 9 7a9.7 9.7 0 0 0 3.6-.7"/></svg>
                                } @else {
                                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z"/><circle cx="12" cy="12" r="2.6"/></svg>
                                }
                              </button>
                              @if (field.has_value) {
                                <button type="button" class="btn ghost small-btn danger" (click)="clearSecret(field)">Clear</button>
                              }
                            }
                          </div>
                        }
                        @case ('time') {
                          <input type="time" [id]="field.key" [name]="field.key" [ngModel]="asText(field)" (ngModelChange)="set(field, $event)" />
                        }
                        @case ('email') {
                          <input type="email" [id]="field.key" [name]="field.key" [placeholder]="field.placeholder || ''"
                            [ngModel]="asText(field)" (ngModelChange)="set(field, $event)" />
                        }
                        @case ('url') {
                          <input type="url" [id]="field.key" [name]="field.key" [placeholder]="field.placeholder || 'https://'"
                            [ngModel]="asText(field)" (ngModelChange)="set(field, $event)" />
                        }
                        @default {
                          <input type="text" [id]="field.key" [name]="field.key" [placeholder]="field.placeholder || ''"
                            [ngModel]="asText(field)" (ngModelChange)="set(field, $event)" />
                        }
                      }
                    </div>
                  </div>
                }
              </div>
            </section>
          }

          <!-- --------------------------------------------- email test -->
          @if (group() === 'email') {
            <section class="card pad tester">
              <div class="block-head">
                <h3>Send a test email</h3>
                <p class="muted small">Delivers through the saved transport. Save your changes first so the test uses them.</p>
              </div>
              <div class="tester-row">
                <input type="email" name="testEmailTo" [(ngModel)]="testEmailTo" placeholder="you@company.com" aria-label="Test email recipient" />
                <button class="btn" type="button" (click)="testEmail()" [disabled]="emailTesting() || !testEmailTo">
                  {{ emailTesting() ? 'Sending…' : 'Send test email' }}
                </button>
              </div>
              @if (emailResult(); as r) {
                <p class="result" [class.bad]="!r.ok">{{ r.message }}</p>
              }
            </section>
          }

          <!-- ----------------------------------------------- sms test -->
          @if (group() === 'sms') {
            <section class="card pad tester">
              <div class="block-head">
                <h3>Send a test SMS</h3>
                <p class="muted small">One message is sent through the configured gateway. Standard rates apply.</p>
              </div>
              <div class="tester-row">
                <input type="tel" name="testSmsTo" [(ngModel)]="testSmsTo" placeholder="+233 20 000 0000" aria-label="Test SMS recipient" />
                <button class="btn" type="button" (click)="testSms()" [disabled]="smsTesting() || !testSmsTo">
                  {{ smsTesting() ? 'Sending…' : 'Send test SMS' }}
                </button>
              </div>
              @if (smsResult(); as r) {
                <p class="result" [class.bad]="!r.ok">
                  {{ r.message }}@if (r.reference) { <span class="muted"> · reference {{ r.reference }}</span> }
                </p>
              }
            </section>
          }

          <!-- ------------------------------------------------ backups -->
          @if (group() === 'backup') {
            <section class="card pad">
              <div class="block-head">
                <h3>Snapshots</h3>
                <p class="muted small">Archives are JSON exports written to private storage. Settings snapshots restore in place.</p>
              </div>

              @if (backupMeta(); as bm) {
                <div class="stat-strip">
                  <div><p class="label muted">Last snapshot</p><strong>{{ bm.last_completed_at ? (bm.last_completed_at | date: 'MMM d, h:mm a') : 'Never' }}</strong></div>
                  <div><p class="label muted">Schedule</p><strong>{{ bm.scheduled ? titleCase(bm.frequency) : 'Paused' }}</strong></div>
                  <div><p class="label muted">Retention</p><strong>{{ bm.retention_days }} days</strong></div>
                  <div><p class="label muted">Archive size</p><strong>{{ size(bm.total_size_bytes) }}</strong></div>
                </div>
              }

              <div class="backup-create">
                <div class="field">
                  <label for="backup-scope">Scope</label>
                  <select id="backup-scope" name="backupScope" [(ngModel)]="backupScope">
                    @for (s of backupScopes(); track s.value) { <option [value]="s.value">{{ s.label }} — {{ s.description }}</option> }
                  </select>
                </div>
                <div class="field">
                  <label for="backup-note">Note (optional)</label>
                  <input id="backup-note" name="backupNote" [(ngModel)]="backupNote" placeholder="Before pricing migration" />
                </div>
                <button class="btn accent" type="button" (click)="createBackup()" [disabled]="backingUp()">
                  {{ backingUp() ? 'Creating…' : 'Create snapshot' }}
                </button>
              </div>

              @if (backupsLoading()) {
                <div class="skeleton" style="height:140px; margin-top:14px"></div>
              } @else if (!backups().length) {
                <div class="empty">No snapshots yet. Create one before the next release.</div>
              } @else {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Snapshot</th><th>Scope</th><th>Records</th><th>Size</th><th>Created</th><th><span class="sr-only">Actions</span></th></tr>
                    </thead>
                    <tbody>
                      @for (b of backups(); track b.id) {
                        <tr>
                          <td>
                            <strong class="mono">{{ b.filename }}</strong>
                            <p class="muted small">
                              <span class="pill" [class.failed]="b.status === 'failed'">{{ b.status }}</span>
                              @if (b.note) { · {{ b.note }} }
                              @if (b.restored_at) { · restored {{ b.restored_at | date: 'MMM d' }} }
                            </p>
                          </td>
                          <td>{{ b.scope_label }}</td>
                          <td>{{ b.records }}</td>
                          <td>{{ size(b.size_bytes) }}</td>
                          <td class="muted small">
                            {{ b.created_at | date: 'MMM d, y, h:mm a' }}
                            @if (b.created_by) { <br />by {{ b.created_by.name }} }
                          </td>
                          <td class="actions">
                            <button class="btn ghost small-btn" type="button" (click)="download(b)" [disabled]="b.status !== 'completed'">Download</button>
                            <button class="btn ghost small-btn" type="button" (click)="restore(b)" [disabled]="b.status !== 'completed'">Restore</button>
                            <button class="btn ghost small-btn danger" type="button" (click)="deleteBackup(b)">Delete</button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </section>
          }
        }
      </div>
    </div>

    @if (dirty()) {
      <div class="save-bar" role="status">
        <span><strong>{{ changedCount() }}</strong> unsaved {{ changedCount() === 1 ? 'change' : 'changes' }}</span>
        <div class="save-bar-actions">
          <button class="btn ghost" type="button" (click)="discard()" [disabled]="busy()">Discard</button>
          <button class="btn accent" type="button" (click)="save()" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Save changes' }}</button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display:block; }
    .payment-health { margin-bottom:16px; }
    .payment-health-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; margin-top:14px; }
    .payment-health-grid div { display:grid; gap:3px; padding:12px; border:1px solid var(--line); border-radius:12px; background:var(--paper-2); }
    .payment-health-grid strong { font-size:14px; }
    .bad-text { color:var(--danger); }
    .method-chips { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }
    .method-chip { padding:5px 9px; border-radius:999px; font-size:11px; font-weight:700; background:color-mix(in srgb,var(--ok) 12%,transparent); color:var(--ok); }
    .method-chip.off { background:var(--paper-2); color:var(--ink-soft); }
  `],
})
export class AdminSettingsComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  data = signal<Record<string, SettingField[]>>({});
  groups = signal<SettingGroupMeta[]>([]);
  group = signal('general');
  loading = signal(true);
  busy = signal(false);
  notice = signal('');
  error = signal('');
  uploading = signal('');
  revealed = signal<string[]>([]);
  private changed = signal<Record<string, unknown>>({});

  // Email / SMS testers
  testEmailTo = '';
  testSmsTo = '';
  emailTesting = signal(false);
  smsTesting = signal(false);
  emailResult = signal<GatewayTestResult | null>(null);
  smsResult = signal<GatewayTestResult | null>(null);

  // Payment provider health (safe summary; no secrets)
  paymentStatus = signal<{ enabled: boolean; mode: string; provider: string; provider_configured: boolean; currency: string; methods: { key: string; label: string; enabled: boolean }[] } | null>(null);

  // Backups
  backups = signal<PlatformBackup[]>([]);
  backupMeta = signal<BackupMeta | null>(null);
  backupsLoading = signal(false);
  backingUp = signal(false);
  backupScope = 'settings';
  backupNote = '';
  private backupsLoaded = false;

  activeGroup = computed(() => this.groups().find((g) => g.key === this.group()) ?? null);
  visible = computed(() => this.data()[this.group()] ?? []);
  assetFields = computed(() => this.visible().filter((f) => f.type === 'image'));
  formFields = computed(() => this.visible().filter((f) => f.type !== 'image'));
  changedKeys = computed(() => Object.keys(this.changed()));
  changedCount = computed(() => this.changedKeys().length);
  dirty = computed(() => this.changedCount() > 0);
  backupScopes = computed(() => this.backupMeta()?.scopes ?? []);

  constructor() {
    this.load();
  }

  // ------------------------------------------------------------- loading

  private load(done?: () => void) {
    this.api.adminSettings().subscribe({
      next: (res) => {
        this.apply(res);
        this.loading.set(false);
        done?.();
      },
      error: () => {
        this.error.set('Could not load settings.');
        this.loading.set(false);
      },
    });
  }

  private apply(res: SettingsPayload) {
    this.data.set(res.data);
    if (res.meta?.groups?.length) this.groups.set(res.meta.groups);
    if (!res.data[this.group()]) this.group.set(this.groups()[0]?.key ?? 'general');
    this.changed.set({});
  }

  selectGroup(key: string) {
    this.group.set(key);
    this.error.set('');
    if (key === 'backup' && !this.backupsLoaded) this.loadBackups();
    if (key === 'payments') this.loadPaymentStatus();
  }

  loadPaymentStatus() {
    this.api.adminPaymentStatus().subscribe({
      next: (res) => this.paymentStatus.set(res.data),
      error: () => this.paymentStatus.set(null),
    });
  }

  // -------------------------------------------------------------- fields

  asText(field: SettingField): string {
    return field.value === null || field.value === undefined ? '' : String(field.value);
  }

  settingValue(key: string): string {
    for (const fields of Object.values(this.data())) {
      const match = fields.find((f) => f.key === key);
      if (match) return this.asText(match);
    }
    return '';
  }

  initial(): string {
    return (this.settingValue('platform_name') || 'M').trim().charAt(0).toUpperCase();
  }

  groupDirty(group: string): boolean {
    const fields = this.data()[group] ?? [];
    return fields.some((f) => this.changedKeys().includes(f.key));
  }

  set(field: SettingField, value: unknown) {
    field.value = value as SettingField['value'];
    this.changed.update((current) => ({ ...current, [field.key]: value }));
    this.notice.set('');
  }

  // Secrets ------------------------------------------------------------

  toggleReveal(key: string) {
    this.revealed.update((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));
  }

  isCleared(field: SettingField): boolean {
    return this.changed()[field.key] === CLEAR_SECRET;
  }

  clearSecret(field: SettingField) {
    this.set(field, CLEAR_SECRET);
    field.value = '';
  }

  undoClear(field: SettingField) {
    field.value = '';
    this.changed.update((current) => {
      const next = { ...current };
      delete next[field.key];
      return next;
    });
  }

  // ------------------------------------------------------------- actions

  save() {
    const payload = Object.entries(this.changed()).map(([key, value]) => ({ key, value }));
    if (!payload.length) return;

    this.busy.set(true);
    this.error.set('');
    this.api.saveSettings(payload).subscribe({
      next: (res) => {
        this.apply(res);
        this.revealed.set([]);
        this.busy.set(false);
        if (this.group() === 'payments') this.loadPaymentStatus();
        this.notice.set(`Saved ${payload.length} ${payload.length === 1 ? 'setting' : 'settings'}.`);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(this.message(e, 'Could not save settings.'));
      },
    });
  }

  discard() {
    this.loading.set(true);
    this.notice.set('');
    this.error.set('');
    this.load(() => this.notice.set('Changes discarded.'));
  }

  reset() {
    const label = this.activeGroup()?.label ?? this.group();
    if (!confirm(`Reset the ${label} settings back to their defaults? Uploaded files in this section are deleted.`)) return;

    this.busy.set(true);
    this.api.resetSettings(this.group()).subscribe({
      next: (res) => {
        this.apply(res);
        this.busy.set(false);
        this.notice.set(`${label} settings restored to defaults.`);
      },
      error: () => {
        this.busy.set(false);
        this.error.set('Could not reset settings.');
      },
    });
  }

  // -------------------------------------------------------------- assets

  accept(key: string): string {
    return key === 'brand_favicon' ? '.ico,.png,.svg,image/png,image/svg+xml,image/x-icon' : 'image/png,image/jpeg,image/webp,image/svg+xml';
  }

  upload(field: SettingField, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(field.key);
    this.error.set('');
    this.api.uploadBrandingAsset(field.key, file).subscribe({
      next: (res) => {
        this.applyKeepingEdits(res);
        this.uploading.set('');
        this.notice.set(`${field.label} updated.`);
        input.value = '';
      },
      error: (e) => {
        this.uploading.set('');
        this.error.set(this.message(e, `Could not upload the ${field.label.toLowerCase()}.`));
        input.value = '';
      },
    });
  }

  removeAsset(field: SettingField) {
    if (!confirm(`Remove the ${field.label.toLowerCase()}?`)) return;

    this.api.removeBrandingAsset(field.key).subscribe({
      next: (res) => {
        this.applyKeepingEdits(res);
        this.notice.set(`${field.label} removed.`);
      },
      error: (e) => this.error.set(this.message(e, 'Could not remove the file.')),
    });
  }

  /** Asset endpoints return the full form; keep any in-progress edits the admin typed. */
  private applyKeepingEdits(res: SettingsPayload) {
    const edits = this.changed();
    for (const fields of Object.values(res.data)) {
      for (const field of fields) {
        if (Object.prototype.hasOwnProperty.call(edits, field.key)) {
          field.value = edits[field.key] as SettingField['value'];
        }
      }
    }
    this.data.set(res.data);
    if (res.meta?.groups?.length) this.groups.set(res.meta.groups);
    this.changed.set(edits);
  }

  // ------------------------------------------------------------- testers

  testEmail() {
    this.emailTesting.set(true);
    this.emailResult.set(null);
    this.api.sendTestEmail(this.testEmailTo).subscribe({
      next: (res) => {
        this.emailTesting.set(false);
        this.emailResult.set(res.data);
      },
      error: (e) => {
        this.emailTesting.set(false);
        this.emailResult.set({ ok: false, message: this.message(e, 'The test email could not be sent.') });
      },
    });
  }

  testSms() {
    this.smsTesting.set(true);
    this.smsResult.set(null);
    this.api.sendTestSms(this.testSmsTo).subscribe({
      next: (res) => {
        this.smsTesting.set(false);
        this.smsResult.set(res.data);
      },
      error: (e) => {
        this.smsTesting.set(false);
        this.smsResult.set({ ok: false, message: this.message(e, 'The test message could not be sent.') });
      },
    });
  }

  // ------------------------------------------------------------- backups

  loadBackups() {
    this.backupsLoading.set(true);
    this.api.adminBackups().subscribe({
      next: (res) => {
        this.backups.set(res.data);
        this.backupMeta.set(res.meta);
        if (res.meta.scopes.length && !res.meta.scopes.some((s) => s.value === this.backupScope)) {
          this.backupScope = res.meta.scopes[0].value;
        }
        this.backupsLoading.set(false);
        this.backupsLoaded = true;
      },
      error: () => {
        this.backupsLoading.set(false);
        this.error.set('Could not load snapshots.');
      },
    });
  }

  createBackup() {
    this.backingUp.set(true);
    this.error.set('');
    this.api.createAdminBackup(this.backupScope, this.backupNote).subscribe({
      next: () => {
        this.backingUp.set(false);
        this.backupNote = '';
        this.notice.set('Snapshot created.');
        this.loadBackups();
      },
      error: (e) => {
        this.backingUp.set(false);
        this.error.set(this.message(e, 'The snapshot could not be created.'));
      },
    });
  }

  restore(backup: PlatformBackup) {
    if (!confirm(`Restore "${backup.filename}"? Platform settings in the archive overwrite the current values.`)) return;

    this.api.restoreAdminBackup(backup.id).subscribe({
      next: (res) => {
        this.notice.set(res.data.message);
        this.loadBackups();
        this.load();
      },
      error: (e) => this.error.set(this.message(e, 'Restore failed.')),
    });
  }

  deleteBackup(backup: PlatformBackup) {
    if (!confirm(`Delete "${backup.filename}"? The archive cannot be recovered.`)) return;

    this.api.deleteAdminBackup(backup.id).subscribe({
      next: () => {
        this.notice.set('Snapshot deleted.');
        this.loadBackups();
      },
      error: (e) => this.error.set(this.message(e, 'Could not delete the snapshot.')),
    });
  }

  /** Archives are behind the bearer token, so stream them with fetch and save the blob. */
  download(backup: PlatformBackup) {
    const token = this.auth.token();
    fetch(this.api.adminBackupDownloadUrl(backup.id), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => {
        if (!r.ok) throw new Error('download failed');
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = backup.filename;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => this.error.set('Download failed.'));
  }

  titleCase(value: string): string {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : '—';
  }

  size(bytes: number | null | undefined): string {
    const value = bytes ?? 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  private message(e: unknown, fallback: string): string {
    const err = e as { error?: { message?: string; data?: { message?: string }; errors?: Record<string, string[]> } };
    const validation = err?.error?.errors ? Object.values(err.error.errors)[0]?.[0] : null;
    return validation || err?.error?.data?.message || err?.error?.message || fallback;
  }
}
