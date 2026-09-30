import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { TenantApplication, TenantStatus } from '../../core/models';

@Component({
  selector: 'app-admin-tenants',
  imports: [FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="head">
      <div>
        <h1>Seller applications</h1>
        <p class="muted">Review business details and documents before a tenant can open a store.</p>
      </div>
    </div>

    <div class="toolbar">
      <div class="tabs">
        @for (s of statuses; track s.value) {
          <button type="button" class="tab" [class.on]="status() === s.value" (click)="setStatus(s.value)">{{ s.label }}</button>
        }
      </div>
      <input [(ngModel)]="search" (keyup.enter)="reload()" placeholder="Search name, registration no., email…" />
      <button class="btn ghost" type="button" (click)="reload()">Search</button>
    </div>

    @if (error()) { <p class="err">{{ error() }}</p> }

    @if (loading()) {
      <div class="skeleton" style="height:84px; margin:10px 0"></div>
      <div class="skeleton" style="height:84px; margin:10px 0"></div>
    } @else if (!tenants().length) {
      <div class="empty card">No applications match this filter.</div>
    }

    @for (t of tenants(); track t.id) {
      <article class="card pad">
        <div class="row">
          <div>
            <strong>{{ t.business_name || t.name }}</strong>
            <p class="muted small">
              {{ t.slug }} · {{ t.city || t.country || '—' }} · {{ t.owner?.email || t.owner_email || '—' }}
              @if (t.submitted_at) { · submitted {{ t.submitted_at | date: 'shortDate' }} }
            </p>
          </div>
          <div class="row gap">
            <span [class]="'pill ' + t.status">{{ t.status }}</span>
            @if (t.checklist_complete === false) { <span class="pill warn">incomplete</span> }
            <button class="btn ghost" type="button" (click)="toggle(t.id)">{{ openId() === t.id ? 'Close' : 'Review' }}</button>
          </div>
        </div>

        @if (openId() === t.id && detail(); as d) {
          @if (d.id !== t.id) {
            <p class="muted small">Loading application…</p>
          } @else {
            <div class="detail">
              <div class="cols">
                <section>
                  <h3>Business</h3>
                  <dl>
                    <dt>Registered name</dt><dd>{{ d.business_name || '—' }}</dd>
                    <dt>Trading name</dt><dd>{{ d.trading_name || '—' }}</dd>
                    <dt>Type</dt><dd>{{ d.business_type || '—' }}</dd>
                    <dt>Registration no.</dt><dd>{{ d.registration_number || '—' }}</dd>
                    <dt>Tax ID</dt><dd>{{ d.tax_id || '—' }}</dd>
                    <dt>Year established</dt><dd>{{ d.year_established || '—' }}</dd>
                    <dt>Website</dt><dd>{{ d.website || '—' }}</dd>
                    <dt>Permit</dt><dd>{{ d.permit_number || '—' }} @if (d.permit_expires_at) { (expires {{ d.permit_expires_at | date: 'mediumDate' }}) }</dd>
                  </dl>
                </section>

                <section>
                  <h3>What they sell</h3>
                  <p>{{ d.product_summary || '—' }}</p>
                  <div class="chips">
                    @for (c of d.categories_offered || []; track c) { <span class="pill">{{ c }}</span> }
                  </div>
                </section>

                <section>
                  <h3>Address &amp; GPS</h3>
                  <dl>
                    <dt>Address</dt><dd>{{ d.address_line1 }}@if (d.address_line2) { , {{ d.address_line2 }} }</dd>
                    <dt>City</dt><dd>{{ d.city }} {{ d.region }} {{ d.postal_code }}</dd>
                    <dt>Country</dt><dd>{{ d.country }}</dd>
                    <dt>Coordinates</dt>
                    <dd>
                      @if (d.latitude !== null && d.latitude !== undefined) {
                        {{ d.latitude | number: '1.6-6' }}, {{ d.longitude | number: '1.6-6' }}
                      } @else { — }
                    </dd>
                  </dl>
                </section>

                <section>
                  <h3>Owner</h3>
                  <dl>
                    <dt>Name</dt><dd>{{ d.owner_name || '—' }}</dd>
                    <dt>Email</dt><dd>{{ d.owner_email || '—' }}</dd>
                    <dt>Phone</dt><dd>{{ d.owner_phone || '—' }}</dd>
                    <dt>ID type</dt><dd>{{ d.owner_id_type || '—' }}</dd>
                    <dt>ID number</dt><dd>{{ d.owner_id_number || '—' }}</dd>
                  </dl>
                </section>

                <section>
                  <h3>Social</h3>
                  <dl>
                    @for (entry of socialEntries(d); track entry.key) {
                      <dt>{{ entry.key }}</dt><dd>{{ entry.value }}</dd>
                    }
                  </dl>
                </section>

                <section>
                  <h3>Documents</h3>
                  @if (d.documents?.length) {
                    <ul class="docs">
                      @for (doc of d.documents; track doc.key) {
                        <li>
                          <button class="btn ghost" type="button" (click)="download(d.id, doc.key, doc.original_name)">{{ doc.label }}</button>
                          <span class="muted small">{{ doc.original_name }} · {{ (doc.size / 1024).toFixed(0) }} KB</span>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="muted">No documents uploaded.</p>
                  }
                </section>

                <section>
                  <h3>Payout</h3>
                  <dl>
                    <dt>Method</dt><dd>{{ d.payout_method || '—' }}</dd>
                    <dt>Account name</dt><dd>{{ d.payout_account_name || '—' }}</dd>
                    @if (d.bank_name) { <dt>Bank</dt><dd>{{ d.bank_name }}</dd> }
                    @if (d.mobile_money_provider) { <dt>Provider</dt><dd>{{ d.mobile_money_provider }}</dd> }
                    @if (d.card_brand) { <dt>Card</dt><dd>{{ d.card_brand }} •••• {{ d.card_last4 }}</dd> }
                    <dt>Account</dt><dd>{{ d.payout_account_number || '—' }}</dd>
                  </dl>
                </section>
              </div>

              @if (d.checklist; as checklist) {
                <div class="checklist">
                  <strong>Checklist</strong>
                  @if (checklist.complete) {
                    <span class="pill active">All required details provided</span>
                  } @else {
                    <span class="pill warn">Missing: {{ checklist.missing.join(', ') }}</span>
                  }
                </div>
              }

              @if (d.review_notes || d.rejection_reason || d.reviewed_at) {
                <div class="review">
                  @if (d.rejection_reason) { <p class="bad">Rejected: {{ d.rejection_reason }}</p> }
                  @if (d.review_notes) { <p class="muted">Last review note: {{ d.review_notes }}</p> }
                  @if (d.reviewed_at) { <p class="muted small">Reviewed {{ d.reviewed_at | date: 'medium' }}</p> }
                </div>
              }

              <div class="actions">
                <textarea [(ngModel)]="notes" rows="2" placeholder="Internal review note (optional)"></textarea>
                <div class="row gap">
                  @if (d.status !== 'active') {
                    <button class="btn ok" type="button" (click)="decide(d, 'active')" [disabled]="busy()">Approve &amp; activate store</button>
                  }
                  @if (d.status === 'active') {
                    <button class="btn ghost" type="button" (click)="decide(d, 'suspended')" [disabled]="busy()">Suspend</button>
                  }
                  @if (d.status !== 'rejected') {
                    <button class="btn" type="button" (click)="rejecting.set(!rejecting())" [disabled]="busy()">Reject…</button>
                  }
                  @if (d.status === 'rejected') {
                    <button class="btn ghost" type="button" (click)="decide(d, 'pending')" [disabled]="busy()">Back to review</button>
                  }
                </div>
                @if (rejecting()) {
                  <div class="reject">
                    <input [(ngModel)]="reason" placeholder="Reason shown to the seller (required)" />
                    <button class="btn" type="button" (click)="decide(d, 'rejected')" [disabled]="busy() || !reason.trim()">Confirm rejection</button>
                  </div>
                }
              </div>
            </div>
          }
        }
      </article>
    }
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
    .head h1 { margin: 0 0 4px; }
    .muted { color: var(--ink-soft); }
    .small { font-size: 12px; }
    .pad { padding: 18px; margin: 12px 0; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .row.gap { gap: 8px; }
    .toolbar { display: flex; gap: 10px; align-items: center; margin: 16px 0 6px; flex-wrap: wrap; }
    .tabs { display: flex; gap: 4px; background: var(--paper-2); padding: 4px; border-radius: 999px; }
    .tab { border: 0; background: transparent; padding: 8px 14px; border-radius: 999px; cursor: pointer; font-weight: 600; color: var(--ink-soft); }
    .tab.on { background: var(--ink); color: #fff; }
    .toolbar input { flex: 1; min-width: 220px; border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; background: #fff; }
    .detail { margin-top: 16px; border-top: 1px solid var(--line); padding-top: 16px; }
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; }
    .cols h3 { margin: 0 0 8px; font-size: 16px; }
    .cols dl { display: grid; grid-template-columns: minmax(90px, 38%) 1fr; gap: 4px 10px; margin: 0; font-size: 14px; }
    .cols dt { color: var(--ink-soft); }
    .cols dd { margin: 0; word-break: break-word; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .docs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .docs li { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; }
    .checklist { display: flex; align-items: center; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
    .review { margin-top: 12px; font-size: 14px; }
    .review .bad { color: var(--danger); }
    .actions { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }
    .actions textarea, .reject input { width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; background: #fff; font: inherit; }
    .reject { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .reject input { flex: 1; min-width: 240px; }
    .pill.pending { background: rgba(201,162,39,.18); color: #7a6410; }
    .pill.active { background: rgba(31,75,58,.14); color: var(--accent-2); }
    .pill.rejected { background: rgba(155,44,44,.14); color: var(--danger); }
    .pill.suspended, .pill.warn { background: rgba(196,92,38,.12); color: var(--accent); }
  `],
})
export class AdminTenantsComponent {
  private api = inject(ApiService);

  readonly statuses: { value: TenantStatus | 'all'; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'all', label: 'All' },
  ];

  tenants = signal<TenantApplication[]>([]);
  detail = signal<TenantApplication | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  status = signal<TenantStatus | 'all'>('pending');
  openId = signal<number | null>(null);
  rejecting = signal(false);
  search = '';
  notes = '';
  reason = '';

  constructor() {
    this.reload();
  }

  reload() {
    this.loading.set(true);
    const params: Record<string, string> = {};
    if (this.status() !== 'all') params['status'] = this.status();
    if (this.search.trim()) params['q'] = this.search.trim();

    this.api.adminTenants(params).subscribe({
      next: (res) => { this.tenants.set(res.data); this.loading.set(false); },
      error: () => { this.error.set('Could not load applications.'); this.loading.set(false); },
    });
  }

  setStatus(status: TenantStatus | 'all') {
    this.status.set(status);
    this.closeDetail();
    this.reload();
  }

  toggle(id: number) {
    if (this.openId() === id) {
      this.closeDetail();
      return;
    }
    this.openId.set(id);
    this.notes = '';
    this.reason = '';
    this.rejecting.set(false);
    this.detail.set(null);
    this.api.adminTenant(id).subscribe({
      next: (res) => this.detail.set(res.data),
      error: () => this.error.set('Could not load this application.'),
    });
  }

  private closeDetail() {
    this.openId.set(null);
    this.detail.set(null);
  }

  socialEntries(tenant: TenantApplication): { key: string; value: string }[] {
    return Object.entries(tenant.social_links || {})
      .filter(([, value]) => !!value)
      .map(([key, value]) => ({ key, value: String(value) }));
  }

  decide(tenant: TenantApplication, status: TenantStatus) {
    this.busy.set(true);
    this.error.set('');
    const extra: { review_notes?: string; rejection_reason?: string } = { review_notes: this.notes || undefined };
    if (status === 'rejected') extra.rejection_reason = this.reason.trim();

    this.api.updateTenantStatus(tenant.id, status, extra).subscribe({
      next: () => {
        this.busy.set(false);
        this.rejecting.set(false);
        this.reason = '';
        this.notes = '';
        this.reload();
        if (this.openId() === tenant.id) {
          this.api.adminTenant(tenant.id).subscribe((res) => this.detail.set(res.data));
        }
      },
      error: (e) => {
        this.busy.set(false);
        const payload = e.error?.error;
        const fields: Record<string, string[]> = payload?.fields || {};
        const first = Object.values(fields).flat()[0];
        this.error.set(payload?.message || first || 'Could not update the application.');
      },
    });
  }

  download(id: number, key: string, filename: string) {
    this.api.adminTenantDocument(id, key).subscribe({
      next: (res) => {
        const url = URL.createObjectURL(res);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'document';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error.set('Could not download that document.'),
    });
  }
}
