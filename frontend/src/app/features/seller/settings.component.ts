import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-seller-settings',
  imports: [FormsModule],
  template: `
    <h1>Settings</h1>
    <p class="muted">Store identity, notifications, and department goals.</p>
    @if (saved()) { <p class="ok">Saved.</p> }
    @if (err()) { <p class="err">{{ err() }}</p> }
    @if (form) {
      <form class="card pad" (ngSubmit)="save()">
        <h3>Business</h3>
        <div class="grid two">
          <div class="field"><label>Tenant name</label><input [(ngModel)]="form.name" name="name" required /></div>
          <div class="field"><label>Business name</label><input [(ngModel)]="form.business_name" name="business_name" /></div>
          <div class="field"><label>Country</label><input [(ngModel)]="form.country" name="country" maxlength="2" /></div>
          <div class="field"><label>Timezone</label><input [(ngModel)]="form.timezone" name="timezone" /></div>
          <div class="field"><label>Currency</label><input [(ngModel)]="form.currency" name="currency" maxlength="3" /></div>
          <div class="field"><label>Fiscal year start (month)</label><input type="number" min="1" max="12" [(ngModel)]="form.fiscal_year_start_month" name="fy" /></div>
          <div class="field"><label>Support email</label><input [(ngModel)]="form.support_email" name="support_email" /></div>
          <div class="field"><label>Payout email</label><input [(ngModel)]="form.payout_email" name="payout_email" /></div>
          <div class="field"><label>Tax ID</label><input [(ngModel)]="form.tax_id" name="tax_id" /></div>
          <div class="field"><label>Support phone</label><input [(ngModel)]="form.support_phone" name="support_phone" /></div>
        </div>
        <div class="field"><label>Business details</label><textarea rows="3" [(ngModel)]="form.business_details" name="details"></textarea></div>
        <h3>Notifications</h3>
        <label class="chk"><input type="checkbox" [(ngModel)]="form.notify_orders" name="n1" /> Order updates</label>
        <label class="chk"><input type="checkbox" [(ngModel)]="form.notify_low_stock" name="n2" /> Low stock alerts</label>
        <label class="chk"><input type="checkbox" [(ngModel)]="form.notify_payouts" name="n3" /> Payout notices</label>
        <div class="field"><label>Backup retention (days)</label><input type="number" min="7" max="365" [(ngModel)]="form.backup_retention_days" name="ret" /></div>
        <h3>Department goals</h3>
        <div class="grid two">
          <div class="field"><label>Finance monthly GMV</label><input type="number" [(ngModel)]="form.goals.finance.monthly_gmv" name="g1" /></div>
          <div class="field"><label>Finance released payouts %</label><input type="number" [(ngModel)]="form.goals.finance.released_settlements" name="g2" /></div>
          <div class="field"><label>Sales monthly orders</label><input type="number" [(ngModel)]="form.goals.sales.monthly_orders" name="g3" /></div>
          <div class="field"><label>Sales AOV</label><input type="number" [(ngModel)]="form.goals.sales.avg_order_value" name="g4" /></div>
          <div class="field"><label>Ops fulfilment %</label><input type="number" [(ngModel)]="form.goals.operations.fulfillment_rate" name="g5" /></div>
          <div class="field"><label>Ops in-stock %</label><input type="number" [(ngModel)]="form.goals.operations.in_stock_rate" name="g6" /></div>
          <div class="field"><label>Marketing CTR %</label><input type="number" step="0.1" [(ngModel)]="form.goals.marketing.ad_ctr" name="g7" /></div>
          <div class="field"><label>Active campaigns</label><input type="number" [(ngModel)]="form.goals.marketing.campaigns_active" name="g8" /></div>
        </div>
        <button class="btn ok" type="submit">Save settings</button>
      </form>
    }
  `,
  styles: [`
    .pad { padding: 18px; margin-top: 12px; }
    .two { grid-template-columns: 1fr 1fr; }
    .chk { display:flex; gap: 8px; align-items:center; margin-bottom: 8px; }
    .ok { color: var(--ok); font-weight: 600; }
    h3 { margin: 18px 0 10px; }
  `],
})
export class SellerSettingsComponent {
  private api = inject(ApiService);
  form: any = null;
  saved = signal(false);
  err = signal('');

  constructor() {
    this.api.tenantSettings().subscribe((res) => {
      const d = res.data;
      this.form = {
        name: d.tenant.name,
        business_name: d.tenant.business_name,
        country: d.tenant.country,
        business_details: d.tenant.business_details,
        ...d.settings,
      };
    });
  }

  save() {
    this.saved.set(false);
    this.err.set('');
    this.api.updateTenantSettings(this.form).subscribe({
      next: () => this.saved.set(true),
      error: (e) => this.err.set(e.error?.error?.message || 'Save failed.'),
    });
  }
}
