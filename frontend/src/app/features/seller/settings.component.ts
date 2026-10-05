import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

interface TenantDocument { key: string; label: string; original_name: string; mime?: string; size?: number; uploaded_at?: string; }

@Component({
  selector: 'app-seller-settings',
  imports: [FormsModule],
  template: `
    <div class="settings-page">
      <header class="page-head">
        <div>
          <p class="eyebrow">Tenant console / Account</p>
          <h1>Workspace settings</h1>
          <p class="intro">Keep your business profile, commerce defaults and compliance records up to date.</p>
        </div>
        <div class="head-actions">
          <span class="status" [class.pending]="form?.status === 'pending'"><i></i>{{ form?.status === 'active' ? 'Account active' : 'Review in progress' }}</span>
          <button class="btn primary" type="button" (click)="save()" [disabled]="saving() || !form">{{ saving() ? 'Saving…' : 'Save changes' }}</button>
        </div>
      </header>

      @if (saved()) { <div class="notice success">✓ Your settings were saved successfully.</div> }
      @if (err()) { <div class="notice error">{{ err() }}</div> }

      <div class="layout">
        <nav class="tabs card" aria-label="Settings sections">
          @for (item of sections; track item.key) {
            <button type="button" [class.active]="tab() === item.key" (click)="tab.set(item.key)"><span>{{ item.icon }}</span><b>{{ item.label }}</b><small>{{ item.description }}</small></button>
          }
        </nav>

        @if (form) {
          <main class="content">
            @if (tab() === 'profile') {
              <section class="card panel"><div class="panel-title"><div><p class="eyebrow">Business identity</p><h2>Registered details</h2><p>These details appear on invoices, receipts and your public merchant profile.</p></div><span class="completion">{{ profileCompletion() }}% complete</span></div>
                <div class="form-grid">
                  <label class="field wide"><span>Tenant name <em>Required</em></span><input [(ngModel)]="form.name" name="name" required /><small>Internal name used across MarketHub.</small></label>
                  <label class="field"><span>Legal business name</span><input [(ngModel)]="form.business_name" name="business_name" /></label>
                  <label class="field"><span>Country</span><select [(ngModel)]="form.country" name="country"><option value="GH">Ghana</option><option value="NG">Nigeria</option><option value="KE">Kenya</option><option value="ZA">South Africa</option></select></label>
                  <label class="field"><span>Tax or registration ID</span><input [(ngModel)]="form.tax_id" name="tax_id" placeholder="e.g. C0001234567" /></label>
                  <label class="field"><span>Support phone</span><input [(ngModel)]="form.support_phone" name="phone" placeholder="+233 24 000 0000" /></label>
                  <label class="field wide"><span>Business description</span><textarea [(ngModel)]="form.business_details" name="details" rows="4" placeholder="Tell customers what your business does…"></textarea></label>
                </div>
              </section>
              <section class="card panel"><div class="panel-title"><div><p class="eyebrow">Communication</p><h2>Contact & regional settings</h2><p>Choose where operational and payout messages are sent.</p></div></div>
                <div class="form-grid"><label class="field"><span>Support email</span><input type="email" [(ngModel)]="form.support_email" name="support" /></label><label class="field"><span>Payout email</span><input type="email" [(ngModel)]="form.payout_email" name="payout" /></label><label class="field"><span>Timezone</span><select [(ngModel)]="form.timezone" name="timezone"><option>Africa/Accra</option><option>Africa/Lagos</option><option>Africa/Nairobi</option><option>UTC</option></select></label><label class="field"><span>Currency</span><select [(ngModel)]="form.currency" name="currency"><option>GHS</option><option>USD</option><option>NGN</option><option>KES</option><option>ZAR</option></select></label></div>
              </section>
            }

            @if (tab() === 'commerce') {
              <section class="card panel"><div class="panel-title"><div><p class="eyebrow">Commerce defaults</p><h2>Pricing & discounts</h2><p>Set safe defaults for new products. Store-level pricing always takes priority.</p></div></div>
                <div class="form-grid"><label class="field"><span>Default markup <em>Percent</em></span><div class="input-unit"><input type="number" min="0" step="0.1" [(ngModel)]="form.default_markup_percent" name="markup" /><i>%</i></div><small>Applied when a product has no markup.</small></label><label class="field"><span>Default discount <em>Percent</em></span><div class="input-unit"><input type="number" min="0" max="100" step="0.1" [(ngModel)]="form.default_discount_percent" name="discount" /><i>%</i></div><small>Maximum automatic discount on new campaigns.</small></label><label class="field"><span>Default tax rate <em>Percent</em></span><div class="input-unit"><input type="number" min="0" max="100" step="0.1" [(ngModel)]="form.tax_rate" name="tax" /><i>%</i></div></label><label class="field"><span>Fiscal year begins</span><select [(ngModel)]="form.fiscal_year_start_month" name="fiscal"><option [ngValue]="1">January</option><option [ngValue]="4">April</option><option [ngValue]="7">July</option><option [ngValue]="10">October</option></select></label></div>
              </section>
              <section class="card panel"><div class="panel-title"><div><p class="eyebrow">Notifications</p><h2>Stay informed</h2><p>Control the operational alerts your team receives.</p></div></div><div class="checks"><label><input type="checkbox" [(ngModel)]="form.notify_orders" name="orders" /><span><b>Order updates</b><small>New orders, cancellations and fulfilment changes</small></span></label><label><input type="checkbox" [(ngModel)]="form.notify_low_stock" name="stock" /><span><b>Low stock alerts</b><small>Notify your team when inventory falls below threshold</small></span></label><label><input type="checkbox" [(ngModel)]="form.notify_payouts" name="payouts" /><span><b>Payout notices</b><small>Settlement and payment status updates</small></span></label></div></section>
            }

            @if (tab() === 'documents') {
              <section class="card panel"><div class="panel-title"><div><p class="eyebrow">Compliance centre</p><h2>Business documents</h2><p>Upload clear, current records to keep verification and payouts moving.</p></div><span class="secure">⌁ Secure storage</span></div>
                <div class="upload-zone" [class.has-file]="selectedFile()"><input #fileInput type="file" accept=".pdf,.jpg,.jpeg,.png" (change)="selectFile($event)" /><div class="upload-icon">↑</div><div><b>{{ selectedFile() ? selectedFile()?.name : 'Drop a document here or browse' }}</b><small>PDF, JPG or PNG · maximum 5 MB</small></div><button class="btn outline" type="button" (click)="fileInput.click()">Choose file</button></div>
                @if (selectedFile()) { <button class="btn primary upload-btn" type="button" (click)="upload()" [disabled]="uploading()">{{ uploading() ? 'Uploading…' : 'Upload document' }}</button> }
                <div class="doc-list"><div class="list-heading">Uploaded documents <span>{{ documents().length }}</span></div>@for (doc of documents(); track doc.key) { <div class="doc"><span class="doc-icon">PDF</span><div><b>{{ doc.label || doc.original_name }}</b><small>{{ doc.original_name }} · {{ formatSize(doc.size) }} · {{ formatDate(doc.uploaded_at) }}</small></div><span class="verified">Verified</span></div>} @empty { <div class="empty">No documents uploaded yet.</div> }</div>
              </section>
            }
          </main>
        } @else { <div class="card loading">Loading your workspace settings…</div> }
      </div>
    </div>
  `,
  styles: [`
    :host{display:block;max-width:1180px;margin:0 auto;padding-bottom:70px}.page-head{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;margin-bottom:20px}.eyebrow{margin:0 0 6px;color:var(--accent);font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}.page-head h1{margin:0;font-size:clamp(28px,3vw,38px)}.intro{margin:7px 0 0;color:var(--ink-soft);font-size:14px}.head-actions{display:flex;align-items:center;gap:12px}.status{display:flex;align-items:center;gap:7px;color:var(--ok);font-size:12px;font-weight:700;white-space:nowrap}.status i{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 4px color-mix(in srgb,var(--ok) 15%,transparent)}.status.pending{color:#9b6a1d}.status.pending i{background:#d19a31}.btn{border:0;border-radius:10px;padding:11px 16px;font-weight:750;cursor:pointer}.btn.primary{background:var(--accent-2);color:white}.btn.outline{border:1px solid var(--line);background:var(--card);color:var(--ink)}.btn:disabled{opacity:.55;cursor:not-allowed}.notice{padding:11px 14px;border-radius:11px;margin-bottom:16px;font-size:13px}.notice.success{background:color-mix(in srgb,var(--ok) 12%,transparent);color:var(--ok)}.notice.error{background:color-mix(in srgb,var(--danger) 12%,transparent);color:var(--danger)}.layout{display:grid;grid-template-columns:240px 1fr;gap:20px;align-items:start}.tabs{padding:8px;display:flex;flex-direction:column;gap:2px;position:sticky;top:20px}.tabs button{display:grid;grid-template-columns:28px 1fr;column-gap:9px;text-align:left;padding:12px 11px;border:0;border-radius:11px;background:transparent;color:var(--ink);cursor:pointer}.tabs button:hover{background:var(--paper-2)}.tabs button.active{background:var(--ink);color:var(--card)}.tabs button span{grid-row:span 2;font-size:18px}.tabs button b{font-size:13px}.tabs button small{color:var(--ink-soft);font-size:10.5px;margin-top:2px}.tabs button.active small{color:color-mix(in srgb,var(--card) 62%,transparent)}.content{display:grid;gap:16px}.panel{padding:21px 23px}.panel-title{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:17px}.panel-title h2{margin:0;font-size:21px}.panel-title p:not(.eyebrow){margin:4px 0 0;color:var(--ink-soft);font-size:12px}.completion,.secure{padding:6px 9px;border-radius:7px;background:color-mix(in srgb,var(--ok) 12%,transparent);color:var(--ok);font-size:10px;font-weight:800;white-space:nowrap}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}.field{display:flex;flex-direction:column;gap:6px;margin-bottom:15px}.field.wide{grid-column:1/-1}.field span{font-size:12px;font-weight:750}.field em{font-style:normal;color:var(--ink-soft);font-size:10px;font-weight:500;float:right}.field input,.field select,.field textarea{width:100%;border:1px solid var(--line);border-radius:9px;padding:10px 11px;background:var(--card);color:var(--ink)}.field input:focus,.field select:focus,.field textarea:focus{outline:2px solid color-mix(in srgb,var(--accent) 40%,transparent);border-color:var(--accent)}.field small,.checks small,.doc small{color:var(--ink-soft);font-size:10.5px}.input-unit{position:relative}.input-unit input{padding-right:33px}.input-unit i{position:absolute;right:12px;top:10px;color:var(--ink-soft);font-size:12px;font-style:normal}.checks{display:grid;grid-template-columns:1fr 1fr;gap:10px}.checks label{display:flex;gap:10px;padding:13px;border:1px solid var(--line);border-radius:10px;cursor:pointer}.checks input{accent-color:var(--accent-2);margin-top:2px}.checks span{display:grid;gap:3px}.upload-zone{display:flex;align-items:center;gap:13px;padding:19px;border:1px dashed var(--line);border-radius:12px;background:color-mix(in srgb,var(--paper-2) 38%,transparent)}.upload-zone input{display:none}.upload-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:var(--accent-2);color:white;font-size:21px}.upload-zone>div:nth-child(3){display:grid;gap:3px;flex:1}.upload-zone small{color:var(--ink-soft);font-size:11px}.upload-btn{margin-top:12px}.doc-list{margin-top:25px}.list-heading{display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:10px;font-size:12px;font-weight:800}.list-heading span{color:var(--ink-soft)}.doc{display:flex;align-items:center;gap:11px;padding:13px 0;border-bottom:1px solid var(--line)}.doc-icon{display:grid;place-items:center;width:35px;height:35px;border-radius:8px;background:#f8e7df;color:var(--accent);font-size:9px;font-weight:800}.doc div{display:grid;gap:3px;flex:1}.verified{color:var(--ok);font-size:10px;font-weight:800}.empty,.loading{padding:28px;text-align:center;color:var(--ink-soft);font-size:13px}.loading{min-height:220px}@media(max-width:800px){.page-head{align-items:flex-start;flex-direction:column}.layout{grid-template-columns:1fr}.tabs{position:static;display:grid;grid-template-columns:1fr 1fr}.checks{grid-template-columns:1fr}.head-actions{width:100%;justify-content:space-between}}@media(max-width:500px){.form-grid{grid-template-columns:1fr}.field.wide{grid-column:auto}.tabs{grid-template-columns:1fr}.upload-zone{align-items:flex-start;flex-wrap:wrap}.upload-zone .btn{margin-left:51px}}
  `],
})
export class SellerSettingsComponent {
  private api = inject(ApiService); form: any = null; tab = signal('profile'); saved = signal(false); err = signal(''); saving = signal(false); uploading = signal(false); selectedFile = signal<File | null>(null); documents = signal<TenantDocument[]>([]);
  sections = [{key:'profile',label:'Business profile',description:'Identity & contacts',icon:'◉'},{key:'commerce',label:'Commerce defaults',description:'Pricing & alerts',icon:'◇'},{key:'documents',label:'Documents',description:'Compliance records',icon:'▤'}];
  constructor(){this.api.tenantSettings().subscribe({next:res=>{const d=res.data;this.form={name:d.tenant.name,business_name:d.tenant.business_name,country:d.tenant.country||'GH',business_details:d.tenant.business_details,...d.settings,status:d.tenant.status,default_markup_percent:d.settings.default_markup_percent??30,default_discount_percent:d.settings.default_discount_percent??0,tax_rate:d.settings.tax_rate??0};this.documents.set(d.documents||[]);},error:()=>this.err.set('Could not load your settings.')});}
  profileCompletion(){if(!this.form)return 0;const fields=['name','business_name','country','tax_id','support_email','support_phone'];return Math.round(fields.filter(k=>!!this.form[k]).length/fields.length*100)}
  save(){if(!this.form)return;this.saved.set(false);this.err.set('');this.saving.set(true);const {status,...payload}=this.form;this.api.updateTenantSettings(payload).subscribe({next:res=>{this.saving.set(false);this.saved.set(true);if(res.data){const d=res.data;this.form={...this.form,...d.settings};}},error:e=>{this.saving.set(false);this.err.set(e.error?.error?.message||'Could not save changes.')}})}
  selectFile(e:Event){const file=(e.target as HTMLInputElement).files?.[0]||null;if(file&&file.size>5*1024*1024){this.err.set('Documents must be smaller than 5 MB.');return}this.selectedFile.set(file);this.err.set('')}
  upload(){const file=this.selectedFile();if(!file)return;this.uploading.set(true);this.api.uploadTenantDocument(file).subscribe({next:res=>{this.documents.set(res.data.documents||[]);this.selectedFile.set(null);this.uploading.set(false)},error:e=>{this.uploading.set(false);this.err.set(e.error?.error?.message||'Could not upload document.')}})}
  formatSize(size?:number){return size?`${Math.max(1,Math.round(size/1024))} KB`:'—'} formatDate(date?:string){return date?new Date(date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Recently'}
}
