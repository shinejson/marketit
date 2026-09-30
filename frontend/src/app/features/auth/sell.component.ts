import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { TenantApplication } from '../../core/models';

interface StoreApplicationForm {
  business_name: string;
  trading_name: string;
  business_type: string;
  registration_number: string;
  tax_id: string;
  year_established: number | null;
  website: string;
  permit_number: string;
  permit_expires_at: string;
  product_summary: string;
  preferred_store_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  latitude: string | number;
  longitude: string | number;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_id_type: string;
  owner_id_number: string;
  payout_method: string;
  payout_account_name: string;
  payout_account_number: string;
  bank_name: string;
  mobile_money_provider: string;
  card_brand: string;
  card_last4: string;
}

interface SocialLinks {
  facebook: string;
  instagram: string;
  whatsapp: string;
  tiktok: string;
  x: string;
  linkedin: string;
  youtube: string;
}

@Component({
  selector: 'app-sell',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="wrap page">
      <header class="intro">
        <p class="kicker">For sellers</p>
        <h1>Open your store on MarketHub</h1>
        <p class="muted">Tell us about your business and upload the certificates we need. Our platform team reviews every application before a store goes live.</p>
      </header>

      @if (loadingApp()) {
        <div class="card pad muted">Loading your application…</div>
      } @else if (application(); as app) {
        <section class="card pad summary">
          <div class="row">
            <div>
              <h2 class="serif">{{ app.business_name || app.name }}</h2>
              <p class="muted">Submitted {{ app.submitted_at | date: 'medium' }} · {{ app.city || app.country }}</p>
            </div>
            <span [class]="'pill ' + app.status">{{ app.status }}</span>
          </div>

          @if (app.status === 'pending') {
            <p class="notice">Your application is with the platform team for review. You can prepare draft stores and products in the tenant console now — publishing unlocks after approval.</p>
            <a routerLink="/tenant" class="btn ghost">Open tenant console</a>
          }
          @if (app.status === 'rejected' && app.rejection_reason) {
            <p class="notice bad"><strong>Changes needed:</strong> {{ app.rejection_reason }}</p>
          }
          @if (app.status === 'active') {
            <p class="notice good">Approved. You can now manage and publish stores from the tenant console.</p>
            <a routerLink="/tenant" class="btn ok">Open tenant console</a>
          }
          @if (app.status === 'suspended') {
            <p class="notice bad">This account is suspended. Contact the platform team.</p>
          }
          @if (app.review_notes) {
            <p class="muted"><strong>Reviewer note:</strong> {{ app.review_notes }}</p>
          }

          <div class="row actions">
            @if (app.status === 'pending' || app.status === 'rejected') {
              <button class="btn ghost" type="button" (click)="toggleEdit()">{{ editing() ? 'Stop editing' : 'Edit details' }}</button>
            }
          </div>
        </section>
      }

      @if (!application() || editing()) {
        <form class="card pad form" (ngSubmit)="submit()">
          <fieldset>
            <legend>Business registration</legend>
            <div class="field"><label for="business_name">Registered business name *</label>
              <input id="business_name" name="business_name" [(ngModel)]="form.business_name" required />
              @if (fieldError('business_name'); as msg) { <span class="hint bad">{{ msg }}</span> }
            </div>
            <div class="grid2">
              <div class="field"><label for="trading_name">Trading / brand name</label>
                <input id="trading_name" name="trading_name" [(ngModel)]="form.trading_name" />
              </div>
              <div class="field"><label for="business_type">Business type *</label>
                <select id="business_type" name="business_type" [(ngModel)]="form.business_type" required>
                  @for (t of businessTypes; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
                </select>
              </div>
              <div class="field"><label for="registration_number">Company registration no. *</label>
                <input id="registration_number" name="registration_number" [(ngModel)]="form.registration_number" required placeholder="RC-123456" />
                @if (fieldError('registration_number'); as msg) { <span class="hint bad">{{ msg }}</span> }
              </div>
              <div class="field"><label for="tax_id">Tax ID (TIN)</label>
                <input id="tax_id" name="tax_id" [(ngModel)]="form.tax_id" />
              </div>
              <div class="field"><label for="year_established">Year established</label>
                <input id="year_established" name="year_established" type="number" [(ngModel)]="form.year_established" />
              </div>
              <div class="field"><label for="website">Website</label>
                <input id="website" name="website" [(ngModel)]="form.website" placeholder="https://" />
              </div>
              <div class="field"><label for="permit_number">Operating permit no.</label>
                <input id="permit_number" name="permit_number" [(ngModel)]="form.permit_number" />
              </div>
              <div class="field"><label for="permit_expires_at">Permit expiry</label>
                <input id="permit_expires_at" name="permit_expires_at" type="date" [(ngModel)]="form.permit_expires_at" />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>What you sell</legend>
            <div class="field"><label for="product_summary">Describe your products *</label>
              <textarea id="product_summary" name="product_summary" rows="4" [(ngModel)]="form.product_summary" required placeholder="Electronics, fashion, food, household goods…"></textarea>
              @if (fieldError('product_summary'); as msg) { <span class="hint bad">{{ msg }}</span> }
            </div>
            <div class="field"><label for="categories">Categories offered</label>
              <input id="categories" name="categories" [(ngModel)]="categoriesText" placeholder="Food & Beverages, Home, Beauty" />
              <span class="hint">Comma separated — up to 12.</span>
            </div>
            <div class="field"><label for="preferred_store_name">First store name</label>
              <input id="preferred_store_name" name="preferred_store_name" [(ngModel)]="form.preferred_store_name" placeholder="We create this store for you after approval" />
            </div>
          </fieldset>

          <fieldset>
            <legend>Business address &amp; location</legend>
            <div class="grid2">
              <div class="field"><label for="address_line1">Address line 1 *</label>
                <input id="address_line1" name="address_line1" [(ngModel)]="form.address_line1" required />
              </div>
              <div class="field"><label for="address_line2">Address line 2</label>
                <input id="address_line2" name="address_line2" [(ngModel)]="form.address_line2" />
              </div>
              <div class="field"><label for="city">City *</label>
                <input id="city" name="city" [(ngModel)]="form.city" required />
              </div>
              <div class="field"><label for="region">Region</label>
                <input id="region" name="region" [(ngModel)]="form.region" />
              </div>
              <div class="field"><label for="postal_code">Postal / digital address</label>
                <input id="postal_code" name="postal_code" [(ngModel)]="form.postal_code" />
              </div>
              <div class="field"><label for="country">Country (ISO-2) *</label>
                <input id="country" name="country" maxlength="2" [(ngModel)]="form.country" required placeholder="GH" />
              </div>
              <div class="field"><label for="latitude">Latitude *</label>
                <input id="latitude" name="latitude" [(ngModel)]="form.latitude" required placeholder="5.6037" />
                @if (fieldError('latitude'); as msg) { <span class="hint bad">{{ msg }}</span> }
              </div>
              <div class="field"><label for="longitude">Longitude *</label>
                <input id="longitude" name="longitude" [(ngModel)]="form.longitude" required placeholder="-0.1870" />
                @if (fieldError('longitude'); as msg) { <span class="hint bad">{{ msg }}</span> }
              </div>
            </div>
            <button class="btn ghost" type="button" (click)="useLocation()" [disabled]="locating()">
              {{ locating() ? 'Locating…' : '📍 Use my current location' }}
            </button>
          </fieldset>

          <fieldset>
            <legend>Owner / signatory</legend>
            <div class="grid2">
              <div class="field"><label for="owner_name">Owner full name *</label>
                <input id="owner_name" name="owner_name" [(ngModel)]="form.owner_name" required />
                @if (fieldError('owner_name'); as msg) { <span class="hint bad">{{ msg }}</span> }
              </div>
              <div class="field"><label for="owner_email">Owner email *</label>
                <input id="owner_email" name="owner_email" type="email" [(ngModel)]="form.owner_email" required />
              </div>
              <div class="field"><label for="owner_phone">Owner phone *</label>
                <input id="owner_phone" name="owner_phone" [(ngModel)]="form.owner_phone" required placeholder="+233…" />
              </div>
              <div class="field"><label for="owner_id_type">ID type *</label>
                <select id="owner_id_type" name="owner_id_type" [(ngModel)]="form.owner_id_type" required>
                  @for (t of idTypes; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
                </select>
              </div>
              <div class="field"><label for="owner_id_number">ID number *</label>
                <input id="owner_id_number" name="owner_id_number" [(ngModel)]="form.owner_id_number" required />
                @if (fieldError('owner_id_number'); as msg) { <span class="hint bad">{{ msg }}</span> }
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Social media</legend>
            <div class="grid2">
              <div class="field"><label for="fb">Facebook</label><input id="fb" name="fb" [(ngModel)]="social.facebook" placeholder="https://facebook.com/…" /></div>
              <div class="field"><label for="ig">Instagram</label><input id="ig" name="ig" [(ngModel)]="social.instagram" placeholder="https://instagram.com/…" /></div>
              <div class="field"><label for="wa">WhatsApp</label><input id="wa" name="wa" [(ngModel)]="social.whatsapp" placeholder="+233…" /></div>
              <div class="field"><label for="tt">TikTok</label><input id="tt" name="tt" [(ngModel)]="social.tiktok" /></div>
              <div class="field"><label for="x">X (Twitter)</label><input id="x" name="x" [(ngModel)]="social.x" /></div>
              <div class="field"><label for="li">LinkedIn</label><input id="li" name="li" [(ngModel)]="social.linkedin" /></div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Certificates &amp; permits</legend>
            <div class="field">
              <label for="cert">Business certificate *</label>
              <input id="cert" type="file" accept=".pdf,.jpg,.jpeg,.png" (change)="pickCertificate($event)" />
              @if (certificateName()) { <span class="hint">Selected: {{ certificateName() }}</span> }
              @if (fieldError('business_certificate'); as msg) { <span class="hint bad">{{ msg }}</span> }
            </div>
            <div class="field">
              <label for="permit">Operating permit</label>
              <input id="permit" type="file" accept=".pdf,.jpg,.jpeg,.png" (change)="pickPermit($event)" />
              @if (permitName()) { <span class="hint">Selected: {{ permitName() }}</span> }
            </div>
            <div class="field">
              <label for="extra">Other supporting documents</label>
              <input id="extra" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" (change)="pickExtra($event)" />
              @if (extraNames().length) { <span class="hint">Selected: {{ extraNames().join(', ') }}</span> }
              <span class="hint">Stored privately — only the platform review team can open them. PDF/JPG/PNG, max 5 MB each.</span>
            </div>
          </fieldset>

          <fieldset>
            <legend>Where we send your money</legend>
            <div class="grid2">
              <div class="field"><label for="payout_method">Payout method *</label>
                <select id="payout_method" name="payout_method" [(ngModel)]="form.payout_method" required>
                  <option value="mobile_money">Mobile money</option>
                  <option value="bank">Bank transfer</option>
                  <option value="card">Debit card</option>
                </select>
              </div>
              <div class="field"><label for="payout_account_name">Account name *</label>
                <input id="payout_account_name" name="payout_account_name" [(ngModel)]="form.payout_account_name" />
              </div>
            </div>

            @if (form.payout_method === 'mobile_money') {
              <div class="grid2">
                <div class="field"><label for="momo_provider">Provider *</label>
                  <select id="momo_provider" name="momo_provider" [(ngModel)]="form.mobile_money_provider" required>
                    <option value="MTN MoMo">MTN MoMo</option><option value="Telecel Cash">Telecel Cash</option>
                    <option value="AirtelTigo Money">AirtelTigo Money</option><option value="AT Money">AT Money</option>
                  </select>
                </div>
                <div class="field"><label for="momo_number">Mobile money number *</label>
                  <input id="momo_number" name="momo_number" [(ngModel)]="form.payout_account_number" required />
                </div>
              </div>
            }

            @if (form.payout_method === 'bank') {
              <div class="grid2">
                <div class="field"><label for="bank_name">Bank name *</label>
                  <input id="bank_name" name="bank_name" [(ngModel)]="form.bank_name" required />
                </div>
                <div class="field"><label for="bank_number">Account number *</label>
                  <input id="bank_number" name="bank_number" [(ngModel)]="form.payout_account_number" required />
                </div>
              </div>
            }

            @if (form.payout_method === 'card') {
              <div class="grid2">
                <div class="field"><label for="card_brand">Card brand</label>
                  <select id="card_brand" name="card_brand" [(ngModel)]="form.card_brand">
                    <option value="Visa">Visa</option><option value="Mastercard">Mastercard</option>
                    <option value="Verve">Verve</option>
                  </select>
                </div>
                <div class="field"><label for="card_last4">Card last 4 digits *</label>
                  <input id="card_last4" name="card_last4" maxlength="4" [(ngModel)]="form.card_last4" required />
                </div>
              </div>
              <p class="hint">Never enter your full card number or CVV — we only keep the last 4 digits for payout reconciliation.</p>
            }
            @if (fieldError('payout_account_number'); as msg) { <span class="hint bad">{{ msg }}</span> }
          </fieldset>

          @if (error()) { <p class="err">{{ error() }}</p> }
          @if (success()) { <p class="notice good">{{ success() }}</p> }

          <div class="row actions">
            <button class="btn" type="submit" [disabled]="busy()">{{ busy() ? 'Submitting…' : submitLabel() }}</button>
            <span class="muted">Fields marked * are required. Review usually takes 1–2 business days.</span>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .page { padding: 32px 0 64px; }
    .intro { max-width: 62ch; margin-bottom: 20px; }
    .intro h1 { margin: 4px 0 8px; font-size: clamp(28px, 4vw, 40px); }
    .kicker { letter-spacing: .16em; text-transform: uppercase; font-size: 12px; font-weight: 700; color: var(--accent); margin: 0; }
    .muted { color: var(--ink-soft); }
    .pad { padding: 22px; margin-bottom: 18px; }
    .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .actions { margin-top: 16px; }
    .pill.pending { background: rgba(201,162,39,.18); color: #7a6410; }
    .pill.active, .pill.approved { background: rgba(31,75,58,.14); color: var(--accent-2); }
    .pill.rejected { background: rgba(155,44,44,.14); color: var(--danger); }
    .pill.suspended { background: var(--paper-2); }
    .form { max-width: 860px; }
    fieldset { border: 0; border-top: 1px solid var(--line); padding: 18px 0 6px; margin: 0 0 6px; }
    fieldset:first-of-type { border-top: 0; padding-top: 0; }
    legend { font-family: Fraunces, Georgia, serif; font-size: 20px; font-weight: 650; padding: 0 10px 0 0; }
    .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0 16px; }
    .field { margin-bottom: 14px; }
    .field label { display: block; font-size: 13px; font-weight: 600; color: var(--ink-soft); margin-bottom: 6px; }
    .field input, .field select, .field textarea { width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 11px 12px; background: #fff; }
    .field input[type=file] { padding: 9px; background: var(--paper); }
    .hint { display: block; font-size: 12px; color: var(--ink-soft); margin-top: 5px; }
    .hint.bad { color: var(--danger); }
    .notice { padding: 12px 14px; border-radius: 12px; background: var(--paper-2); margin: 12px 0; }
    .notice.good { background: rgba(31,75,58,.12); color: var(--accent-2); }
    .notice.bad { background: rgba(155,44,44,.10); color: var(--danger); }
    .summary h2 { margin: 0; }
  `],
})
export class SellComponent {
  api = inject(ApiService);
  auth = inject(AuthService);

  readonly businessTypes = [
    { value: 'sole_proprietor', label: 'Sole proprietor' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'limited_company', label: 'Limited company' },
    { value: 'cooperative', label: 'Cooperative' },
    { value: 'individual', label: 'Individual seller' },
    { value: 'non_profit', label: 'Non-profit' },
  ];

  readonly idTypes = [
    { value: 'ghana_card', label: 'Ghana Card' },
    { value: 'national_id', label: 'National ID' },
    { value: 'passport', label: 'Passport' },
    { value: 'drivers_license', label: "Driver's licence" },
    { value: 'other', label: 'Other' },
  ];

  application = signal<TenantApplication | null>(null);
  loadingApp = signal(true);
  editing = signal(false);
  busy = signal(false);
  locating = signal(false);
  error = signal('');
  success = signal('');
  errors = signal<Record<string, string[]>>({});

  certificate = signal<File | null>(null);
  permit = signal<File | null>(null);
  extraFiles = signal<File[]>([]);

  categoriesText = '';
  social: SocialLinks = { facebook: '', instagram: '', whatsapp: '', tiktok: '', x: '', linkedin: '', youtube: '' };

  form: StoreApplicationForm = {
    business_name: '',
    trading_name: '',
    business_type: 'limited_company',
    registration_number: '',
    tax_id: '',
    year_established: null as number | null,
    website: '',
    permit_number: '',
    permit_expires_at: '',
    product_summary: '',
    preferred_store_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    region: '',
    postal_code: '',
    country: 'GH',
    latitude: '' as string | number,
    longitude: '' as string | number,
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    owner_id_type: 'ghana_card',
    owner_id_number: '',
    payout_method: 'mobile_money',
    payout_account_name: '',
    payout_account_number: '',
    bank_name: '',
    mobile_money_provider: 'MTN MoMo',
    card_brand: 'Visa',
    card_last4: '',
  };

  constructor() {
    this.api.myTenantApplication().subscribe({
      next: (res) => {
        if (res.data) {
          this.hydrate(res.data);
        }
        this.loadingApp.set(false);
      },
      error: () => this.loadingApp.set(false),
    });
  }

  /** Pre-fill the form when an application already exists. */
  private hydrate(app: TenantApplication): void {
    this.application.set(app);
    const form = this.form as unknown as Record<string, unknown>;
    for (const key of Object.keys(form)) {
      const value = (app as unknown as Record<string, unknown>)[key];
      if (value !== null && value !== undefined && value !== '') {
        form[key] = value;
      }
    }
    this.form.owner_email = app.owner_email || this.auth.user()?.email || '';
    this.form.owner_name = app.owner_name || this.auth.user()?.name || '';
    this.categoriesText = (app.categories_offered || []).join(', ');
    this.social = { ...this.social, ...(app.social_links || {}) };
  }

  toggleEdit() {
    this.editing.set(!this.editing());
    this.error.set('');
    this.success.set('');
  }

  submitLabel(): string {
    if (!this.application()) return 'Submit application';
    return this.application()!.status === 'rejected' ? 'Resubmit for review' : 'Save changes';
  }

  fieldError(name: string): string | null {
    const messages = this.errors()[name];
    return messages && messages.length ? messages[0] : null;
  }

  pickCertificate(event: Event) {
    this.certificate.set(this.firstFile(event));
  }

  pickPermit(event: Event) {
    this.permit.set(this.firstFile(event));
  }

  pickExtra(event: Event) {
    const input = event.target as HTMLInputElement;
    this.extraFiles.set(input.files ? Array.from(input.files) : []);
  }

  certificateName(): string | null {
    return this.certificate()?.name ?? null;
  }

  permitName(): string | null {
    return this.permit()?.name ?? null;
  }

  extraNames(): string[] {
    return this.extraFiles().map((f) => f.name);
  }

  private firstFile(event: Event): File | null {
    const input = event.target as HTMLInputElement;
    return input.files && input.files.length ? input.files[0] : null;
  }

  useLocation() {
    if (!navigator.geolocation) {
      this.error.set('Geolocation is not available in this browser — enter the coordinates manually.');
      return;
    }
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.form.latitude = Number(position.coords.latitude.toFixed(6));
        this.form.longitude = Number(position.coords.longitude.toFixed(6));
        this.locating.set(false);
      },
      () => {
        this.locating.set(false);
        this.error.set('Could not read your location — enter the coordinates manually.');
      },
      { timeout: 10000 },
    );
  }

  submit() {
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    this.errors.set({});

    const form = new FormData();
    const append = (key: string, value: any) => {
      if (value === null || value === undefined || value === '') return;
      form.append(key, value);
    };

    const fields = this.form as unknown as Record<string, unknown>;
    for (const key of Object.keys(fields)) {
      append(key, fields[key]);
    }
    for (const category of this.categoriesText.split(',').map((c) => c.trim()).filter(Boolean)) {
      form.append('categories_offered[]', category);
    }
    for (const [key, value] of Object.entries(this.social)) {
      append(`social_links[${key}]`, value);
    }
    if (this.certificate()) form.append('business_certificate', this.certificate()!);
    if (this.permit()) form.append('operating_permit', this.permit()!);
    for (const file of this.extraFiles()) form.append('additional_documents[]', file);

    const isUpdate = !!this.application();
    if (isUpdate && this.application()!.status === 'rejected') {
      form.append('resubmit', 'true');
    }

    if (isUpdate) {
      this.api.updateTenantApplication(form).subscribe({
        next: (res) => this.onSubmitted(res.data, true),
        error: (e: HttpErrorResponse) => this.onSubmitError(e),
      });

      return;
    }

    this.api.applyForStore(form).subscribe({
      next: (res) => this.onSubmitted(res.data, false),
      error: (e: HttpErrorResponse) => this.onSubmitError(e),
    });
  }

  private onSubmitted(data: TenantApplication, isUpdate: boolean) {
    this.hydrate(data);
    this.busy.set(false);
    this.editing.set(false);
    this.success.set(
      isUpdate
        ? 'Details saved. Our team will take another look.'
        : 'Application submitted! We will review it and let you know when your store is approved.',
    );
  }

  private onSubmitError(e: HttpErrorResponse) {
    this.busy.set(false);
    const payload = e.error?.error;
    this.errors.set(payload?.fields || {});
    this.error.set(payload?.message || 'Could not submit your application. Please check the highlighted fields.');
  }
}
