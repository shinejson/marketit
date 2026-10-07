import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { PageTemplate, TemplateCategory, TemplateDefinition, TemplatePurchase } from '../../core/models';

type AdminTab = 'templates' | 'categories' | 'purchases';

@Component({
  selector: 'app-admin-templates',
  imports: [FormsModule, DatePipe],
  template: `
    <main class="admin-market">
      <header class="page-head"><div><p class="eyebrow">Platform studio</p><h1>Template marketplace</h1><p>Curate storefront designs, manage categories, review licences, and publish approved templates.</p></div><button class="primary" (click)="openEditor()">＋ New template</button></header>
      @if (message()) { <div class="message" [class.error]="messageType() === 'error'">{{ message() }}</div> }
      <nav class="tabs"><button [class.active]="tab() === 'templates'" (click)="tab.set('templates')">Templates <span>{{ templates().length }}</span></button><button [class.active]="tab() === 'categories'" (click)="tab.set('categories'); loadCategories()">Categories <span>{{ categories().length }}</span></button><button [class.active]="tab() === 'purchases'" (click)="tab.set('purchases'); loadPurchases()">Purchases <span>{{ purchases().length }}</span></button></nav>

      @if (tab() === 'templates') {
        <section class="content-card">
          <div class="filters"><label class="search">⌕ <input [(ngModel)]="query" (keyup.enter)="loadTemplates()" placeholder="Search templates" /></label><select [(ngModel)]="statusFilter" (ngModelChange)="loadTemplates()"><option value="">All statuses</option><option value="draft">Draft</option><option value="pending_review">Pending review</option><option value="published">Published</option><option value="rejected">Rejected</option></select><button class="outline" (click)="loadTemplates()">Search</button></div>
          @if (loading()) { <div class="loading">Loading templates…</div> } @else if (templates().length) {
            <div class="table-scroll"><table><thead><tr><th>Template</th><th>Category</th><th>Price</th><th>Licences</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>
              @for (template of templates(); track template.id) {
                <tr><td><div class="template-identity"><div class="thumb" [style.--thumb]="template.definition.theme.primary_color || '#244d43'">@if(template.thumbnail){<img [src]="template.thumbnail" [alt]="template.name"/>}@else{<span>{{ template.name.slice(0, 1) }}</span>}</div><div><b>{{ template.name }}</b><small>{{ template.slug }} · v{{ template.version }}</small></div>@if(template.is_featured){<i class="feature-tag">Featured</i>}</div></td><td>{{ template.category?.name || '—' }}</td><td>{{ price(template) }}</td><td>{{ template.purchases_count || 0 }}</td><td><span class="status" [class]="'status ' + template.status">{{ template.status.replace('_', ' ') }}</span></td><td>{{ template.updated_at | date:'mediumDate' }}</td><td><div class="row-actions"><button (click)="openEditor(template)">Edit</button>@if(template.status !== 'published'){<button class="publish-action" (click)="publish(template)">Publish</button>}</div></td></tr>
              }
            </tbody></table></div>
          } @else { <div class="empty"><span>✦</span><h2>No templates to show</h2><p>Create a new design or adjust the filters.</p><button class="primary" (click)="openEditor()">Create a template</button></div> }
        </section>
      } @else if (tab() === 'categories') {
        <section class="category-workspace">
          <div class="content-card add-category"><div><p class="eyebrow">Organize the library</p><h2>Add a category</h2><p>Group designs so merchants can browse by business type.</p></div><div class="add-fields"><input [(ngModel)]="newCategoryName" placeholder="e.g. Beauty & wellness" (keyup.enter)="createCategory()" /><button class="primary" [disabled]="!newCategoryName.trim() || saving()" (click)="createCategory()">Add category</button></div></div>
          <div class="category-grid">@for(category of categories(); track category.id){<article class="category-card"><div class="category-icon">{{ category.icon || '✦' }}</div><div class="category-info"><h3>{{ category.name }}</h3><p>{{ category.description || 'Browse storefront templates in this category.' }}</p><small>{{ category.templates_count || 0 }} templates · {{ category.slug }}</small></div><label class="active-toggle"><input type="checkbox" [checked]="category.is_active" (change)="toggleCategory(category)"/><span>{{ category.is_active ? 'Active' : 'Hidden' }}</span></label><button class="edit-category" type="button" (click)="renameCategory(category)">Edit</button><button class="delete-category" title="Delete category" (click)="deleteCategory(category)">×</button></article>} @empty {<div class="empty"><h2>No categories yet</h2><p>Add a category to make the marketplace easier to browse.</p></div>}</div>
        </section>
      } @else {
        <section class="content-card">
          <div class="purchase-head"><div><h2>Template licences</h2><p>One-time purchases and their current payment status.</p></div><select [(ngModel)]="purchaseStatus" (ngModelChange)="loadPurchases()"><option value="">All payment statuses</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select></div>
          @if (loading()) {<div class="loading">Loading purchases…</div>} @else if(purchases().length){<div class="table-scroll"><table><thead><tr><th>Template</th><th>Tenant</th><th>Amount</th><th>Payment</th><th>Provider</th><th>Purchased</th></tr></thead><tbody>@for(purchase of purchases();track purchase.id){<tr><td><b>{{ purchase.template.name || 'Deleted template' }}</b><small class="sub-row">Licence #{{ purchase.id }}</small></td><td>{{ purchase.tenant?.name || ('Tenant ' + purchase.tenant_id) }}</td><td>{{ purchase.currency }} {{ Number(purchase.amount).toFixed(2) }}</td><td><span class="status" [class]="'status ' + purchase.payment_status">{{ purchase.payment_status }}</span></td><td>{{ purchase.payment_provider || '—' }}</td><td>{{ purchase.purchased_at | date:'mediumDate' }}</td></tr>}</tbody></table></div>} @else {<div class="empty"><span>▧</span><h2>No licences found</h2><p>Purchases will appear here as tenants acquire templates.</p></div>}
        </section>
      }
    </main>

    @if (editorOpen()) {
      <div class="modal-backdrop" (click)="editorOpen.set(false)"><section class="editor-modal" role="dialog" aria-modal="true" aria-label="Template editor" (click)="$event.stopPropagation()">
        <header><div><p class="eyebrow">{{ editing() ? 'Edit marketplace listing' : 'New marketplace listing' }}</p><h2>{{ editing() ? 'Update template' : 'Create a template' }}</h2></div><button class="close" (click)="editorOpen.set(false)">×</button></header>
        <div class="editor-body">
          <div class="form-grid">
            <label>Template name<input [(ngModel)]="draft.name" placeholder="Coastal Modern" /></label>
            <label>URL slug<input [(ngModel)]="draft.slug" placeholder="coastal-modern" /></label>
            <label>Category<select [(ngModel)]="draft.category_id"><option [ngValue]="null">Uncategorized</option>@for(category of categories();track category.id){<option [ngValue]="category.id">{{ category.name }}</option>}</select></label>
            <label>Designer name<input [(ngModel)]="draft.designer_name" placeholder="MarketHub Studio" /></label>
            <label>Price<input type="number" min="0" step="0.01" [(ngModel)]="draft.price" /></label>
            <label>Currency<input maxlength="3" [(ngModel)]="draft.currency" /></label>
            <label class="span-2">Thumbnail URL<input [(ngModel)]="draft.thumbnail" placeholder="https://…" /></label>
            <label class="span-2">Description<textarea rows="3" [(ngModel)]="draft.description" placeholder="A thoughtful storefront layout for…"></textarea></label>
            <label class="check-field span-2"><input type="checkbox" [(ngModel)]="draft.is_featured" /> Feature this design in the marketplace</label>
          </div>
          <div class="definition-editor"><div><h3>Structured template definition</h3><p>JSON configuration with a theme and reusable, structured page sections.</p></div><textarea spellcheck="false" rows="16" [(ngModel)]="definitionText"></textarea>@if(definitionError()){<p class="json-error">{{ definitionError() }}</p>}</div>
        </div>
        <footer><button class="outline" (click)="editorOpen.set(false)">Cancel</button><button class="primary" [disabled]="saving()" (click)="saveTemplate()">{{ saving() ? 'Saving…' : editing() ? 'Save changes' : 'Create draft' }}</button></footer>
      </section></div>
    }
  `,
  styles: [`
    :host{display:block;color:#202d25}.admin-market{max-width:1220px;margin:0 auto;padding:25px 24px 70px}.page-head{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:9px 0 23px;border-bottom:1px solid #e8ebe5}.eyebrow{margin:0 0 6px;color:#bb6944;font-size:9px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.page-head h1{margin:0;font:700 clamp(28px,4vw,42px) Georgia,serif;letter-spacing:-.03em}.page-head p:not(.eyebrow){margin:8px 0 0;color:#778179;font-size:12px}.primary{border:0;border-radius:8px;padding:10px 14px;background:#244d43;color:white;font-size:11px;font-weight:800;cursor:pointer}.primary:disabled{opacity:.55;cursor:wait}.message{margin:14px 0 0;padding:11px 14px;border-radius:9px;background:#e7f3e9;color:#24613a;font-size:12px;font-weight:700}.message.error{background:#ffefeb;color:#a3402e}.tabs{display:flex;gap:5px;margin:18px 0 15px;border-bottom:1px solid #e7e9e3}.tabs button{padding:11px 14px;border:0;border-bottom:2px solid transparent;background:transparent;color:#728078;font-size:11px;font-weight:800;cursor:pointer}.tabs button.active{border-color:#315f46;color:#315f46}.tabs span{margin-left:5px;padding:2px 6px;border-radius:15px;background:#edf2ed;font-size:9px}.content-card{border:1px solid #e6e9e3;border-radius:13px;background:#fff;padding:17px}.filters{display:flex;align-items:center;gap:8px;margin-bottom:14px}.search{display:flex;align-items:center;gap:8px;flex:1;max-width:390px;border:1px solid #e1e5df;border-radius:8px;padding:8px 10px;color:#839087}.search input{width:100%;border:0;outline:0;font-size:11px}.filters select,.purchase-head select{border:1px solid #e1e5df;border-radius:8px;background:white;padding:9px 10px;color:#506056;font-size:10px}.outline{border:1px solid #dce2dc;border-radius:8px;background:white;color:#4a6151;padding:9px 12px;font-size:10px;font-weight:800;cursor:pointer}.table-scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left;min-width:700px}th{padding:10px;border-bottom:1px solid #e8ebe5;color:#919a92;font-size:8px;letter-spacing:.1em;text-transform:uppercase}td{padding:12px 10px;border-bottom:1px solid #f0f2ee;color:#506056;font-size:10px}tr:last-child td{border:0}.template-identity{display:flex;align-items:center;gap:9px;min-width:210px}.thumb{width:46px;height:36px;display:grid;place-items:center;border-radius:6px;background:var(--thumb);color:white;font:700 15px Georgia,serif;overflow:hidden;flex-shrink:0}.thumb img{width:100%;height:100%;object-fit:cover}.template-identity>div:nth-child(2){display:grid;gap:3px}.template-identity b{color:#2a3d30;font-size:10px}.template-identity small,.sub-row{display:block;color:#89938b;font-size:8px}.feature-tag{padding:4px 6px;border-radius:10px;background:#fff3df;color:#9b6f25;font-style:normal;font-size:8px;font-weight:800}.status{display:inline-flex;padding:5px 8px;border-radius:16px;background:#f0f2ed;color:#6d786f;text-transform:capitalize;font-size:8px;font-weight:800}.status.published,.status.paid{background:#e6f2e8;color:#317146}.status.pending,.status.pending_review{background:#fff2dc;color:#9c6c1f}.status.rejected,.status.failed,.status.refunded{background:#fff0ed;color:#a24a3d}.row-actions{display:flex;justify-content:flex-end;gap:7px}.row-actions button{border:0;background:transparent;color:#416348;font-size:9px;font-weight:800;cursor:pointer}.row-actions .publish-action{color:#b76641}.empty{min-height:230px;display:grid;place-content:center;justify-items:center;text-align:center;color:#7a867c}.empty>span{font-size:25px}.empty h2{margin:8px 0 5px;color:#2f4336;font:700 20px Georgia,serif}.empty p{margin:0 0 14px;font-size:11px}.loading{min-height:180px;display:grid;place-content:center;color:#7a867e;font-size:12px}.category-workspace{display:grid;gap:13px}.add-category{display:flex;justify-content:space-between;align-items:center;gap:15px}.add-category h2,.purchase-head h2{margin:0;font:700 20px Georgia,serif}.add-category p:not(.eyebrow),.purchase-head p{margin:5px 0 0;color:#818b83;font-size:10px}.add-fields{display:flex;gap:7px}.add-fields input{width:min(260px,45vw);border:1px solid #dfe5df;border-radius:8px;padding:9px 10px;font-size:10px}.category-grid{display:grid;gap:9px}.category-card{display:flex;align-items:center;gap:12px;padding:13px;border:1px solid #e7eae4;border-radius:11px;background:white}.category-icon{display:grid;place-items:center;width:37px;height:37px;border-radius:10px;background:#e9f0e9;color:#315c43;font-size:17px}.category-info{flex:1}.category-info h3{margin:0;color:#2b4032;font-size:12px}.category-info p{margin:4px 0;color:#7b877d;font-size:9px}.category-info small{color:#9aa39b;font-size:8px}.active-toggle{display:flex;align-items:center;gap:6px;color:#69766d;font-size:9px}.active-toggle input{accent-color:#3e7950}.edit-category{border:1px solid #e0e6df;border-radius:6px;background:white;color:#416149;padding:6px 9px;font-size:8px;font-weight:800;cursor:pointer}.delete-category{border:0;border-radius:6px;background:#fff2ef;color:#a04a3b;width:25px;height:25px;font-size:17px;cursor:pointer}.purchase-head{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:14px}.editor-modal{width:min(800px,100%);max-height:92vh;display:flex;flex-direction:column;border-radius:15px;background:white;box-shadow:0 25px 90px #0005;overflow:hidden}.modal-backdrop{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:18px;background:#17241fc7}.editor-modal header,.editor-modal footer{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:17px 21px;border-bottom:1px solid #ebeee8}.editor-modal footer{justify-content:flex-end;border-top:1px solid #ebeee8;border-bottom:0}.editor-modal header h2{margin:0;font:700 23px Georgia,serif}.close{border:0;border-radius:50%;width:32px;height:32px;background:#eff2ed;color:#53665a;font-size:22px;cursor:pointer}.editor-body{padding:17px 21px;overflow:auto}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.form-grid label{display:grid;gap:5px;color:#5a695f;font-size:9px;font-weight:800}.form-grid input,.form-grid select,.form-grid textarea{box-sizing:border-box;width:100%;border:1px solid #e0e5df;border-radius:7px;padding:9px;color:#304236;font:10px Arial,sans-serif;outline:0}.form-grid .span-2{grid-column:1/-1}.form-grid .check-field{display:flex;align-items:center}.check-field input{width:auto}.definition-editor{display:grid;gap:7px;margin-top:19px}.definition-editor h3{margin:0;color:#2b4134;font-size:12px}.definition-editor p{margin:4px 0 0;color:#828d85;font-size:9px}.definition-editor textarea{box-sizing:border-box;width:100%;border:1px solid #dce3db;border-radius:8px;padding:12px;background:#f8faf7;color:#34463a;font:10px/1.55 ui-monospace,monospace;resize:vertical}.json-error{margin:0;color:#b44938;font-size:9px}.purchase-head select{min-width:160px}
    @media(max-width:720px){.admin-market{padding:17px 12px 50px}.page-head{align-items:flex-start}.page-head h1{font-size:28px}.page-head p:not(.eyebrow){max-width:460px;line-height:1.5}.page-head>.primary{white-space:nowrap;padding:9px;font-size:9px}.content-card{padding:11px}.filters{flex-wrap:wrap}.search{max-width:none;min-width:100%}.add-category{align-items:flex-start;flex-direction:column}.add-fields{width:100%}.add-fields input{flex:1;width:auto}.category-card{flex-wrap:wrap}.category-info{min-width:calc(100% - 55px)}.active-toggle{margin-left:50px}.purchase-head{align-items:flex-start;flex-direction:column}.purchase-head select{width:100%}.form-grid{grid-template-columns:1fr}.form-grid .span-2{grid-column:auto}}
  `],
})
export class AdminTemplatesComponent implements OnInit {
  readonly Number = Number;
  private readonly api = inject(ApiService);

  tab = signal<AdminTab>('templates');
  templates = signal<PageTemplate[]>([]);
  categories = signal<TemplateCategory[]>([]);
  purchases = signal<TemplatePurchase[]>([]);
  loading = signal(false);
  saving = signal(false);
  editorOpen = signal(false);
  editing = signal(false);
  message = signal('');
  messageType = signal<'success' | 'error'>('success');
  definitionError = signal('');
  selectedId: number | null = null;
  query = '';
  statusFilter = '';
  purchaseStatus = '';
  newCategoryName = '';
  definitionText = '';
  draft = this.emptyDraft();

  ngOnInit() {
    this.loadTemplates();
    this.loadCategories();
  }

  emptyDraft() {
    return { name: '', slug: '', description: '', thumbnail: '', designer_name: 'MarketHub Studio', category_id: null as number | null, price: 0, currency: 'USD', version: '1.0.0', is_featured: false };
  }

  defaultDefinition(): TemplateDefinition {
    return {
      schema_version: 1,
      theme: { primary_color: '#244d43', accent_color: '#c16b45', surface_color: '#ffffff', font: 'modern', hero_style: 'split' },
      pages: {
        home: [
          { id: 'hero', type: 'hero', badge: 'A STORE BUILT AROUND YOU', title: 'A new season starts here', subtitle: 'Introduce your collection with a confident first impression.', layout: 'split', button_text: 'Shop the collection', image_url: '', enabled: true },
          { id: 'featured', type: 'featured_products', badge: 'THE COLLECTION', title: 'Made for everyday', subtitle: 'Meet the pieces customers come back for.', product_source: 'featured', columns: 4, limit: 8, enabled: true },
          { id: 'trust', type: 'trust_bar', title: 'Shop with confidence', enabled: true },
        ],
        about: { enabled: true, nav_label: 'Our story', hero_title: 'The story behind the store' },
        contact: { enabled: true, nav_label: 'Contact', title: 'Talk to our team' },
        custom: [],
      },
    };
  }

  loadTemplates() {
    this.loading.set(true);
    const params: Record<string, string | number> = { per_page: 100 };
    if (this.query.trim()) params['q'] = this.query.trim();
    if (this.statusFilter) params['status'] = this.statusFilter;
    this.api.adminTemplates(params).subscribe({
      next: (res) => { this.templates.set(res.data || []); this.loading.set(false); },
      error: (error) => { this.loading.set(false); this.notify(error?.error?.message || 'Could not load template listings.', 'error'); },
    });
  }

  loadCategories() {
    this.api.adminTemplateCategories().subscribe({
      next: (res) => this.categories.set(res.data || []),
      error: (error) => this.notify(error?.error?.message || 'Could not load categories.', 'error'),
    });
  }

  loadPurchases() {
    this.loading.set(true);
    const params: Record<string, string | number> = { per_page: 100 };
    if (this.purchaseStatus) params['status'] = this.purchaseStatus;
    this.api.adminTemplatePurchases(params).subscribe({
      next: (res) => { this.purchases.set(res.data || []); this.loading.set(false); },
      error: (error) => { this.loading.set(false); this.notify(error?.error?.message || 'Could not load template licences.', 'error'); },
    });
  }

  price(template: PageTemplate) { return Number(template.price) === 0 ? 'Free' : `${template.currency} ${Number(template.price).toFixed(2)}`; }

  openEditor(template?: PageTemplate) {
    this.selectedId = template?.id || null;
    this.editing.set(!!template);
    this.definitionError.set('');
    this.draft = template ? {
      name: template.name,
      slug: template.slug,
      description: template.description || '',
      thumbnail: template.thumbnail || '',
      designer_name: template.designer_name || 'MarketHub Studio',
      category_id: template.category_id ?? null,
      price: Number(template.price),
      currency: template.currency || 'USD',
      version: template.version || '1.0.0',
      is_featured: template.is_featured,
    } : this.emptyDraft();
    this.definitionText = JSON.stringify(template?.definition || this.defaultDefinition(), null, 2);
    this.editorOpen.set(true);
  }

  saveTemplate() {
    this.definitionError.set('');
    let definition: TemplateDefinition;
    try {
      definition = JSON.parse(this.definitionText) as TemplateDefinition;
      if (definition.schema_version !== 1 || !definition.theme || !Array.isArray(definition.pages?.home)) throw new Error('Definition must include schema_version 1, a theme, and pages.home as an array.');
    } catch (error) {
      this.definitionError.set(error instanceof Error ? error.message : 'Definition must be valid JSON.');
      return;
    }
    this.saving.set(true);
    const payload = { ...this.draft, price: Number(this.draft.price), currency: (this.draft.currency || 'USD').toUpperCase(), definition };
    const request = this.selectedId ? this.api.updateAdminTemplate(this.selectedId, payload) : this.api.createAdminTemplate(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.notify(this.selectedId ? 'Template changes saved as a draft.' : 'Draft template created.');
        this.loadTemplates();
      },
      error: (error) => { this.saving.set(false); this.notify(error?.error?.message || error?.error?.error?.message || 'Could not save the template.', 'error'); },
    });
  }

  publish(template: PageTemplate) {
    if (!window.confirm(`Publish “${template.name}” to the tenant marketplace?`)) return;
    this.api.publishAdminTemplate(template.id).subscribe({
      next: () => { this.notify(`${template.name} is now published.`); this.loadTemplates(); },
      error: (error) => this.notify(error?.error?.message || 'Could not publish this template.', 'error'),
    });
  }

  createCategory() {
    const name = this.newCategoryName.trim();
    if (!name || this.saving()) return;
    this.saving.set(true);
    this.api.createAdminTemplateCategory({ name, is_active: true }).subscribe({
      next: () => { this.newCategoryName = ''; this.saving.set(false); this.loadCategories(); this.notify('Template category added.'); },
      error: (error) => { this.saving.set(false); this.notify(error?.error?.message || 'Could not create the category.', 'error'); },
    });
  }

  renameCategory(category: TemplateCategory) {
    const name = window.prompt('Category name', category.name)?.trim();
    if (!name || name === category.name) return;
    this.api.updateAdminTemplateCategory(category.id, { name }).subscribe({
      next: () => { this.loadCategories(); this.notify('Category updated.'); },
      error: (error) => this.notify(error?.error?.message || 'Could not update this category.', 'error'),
    });
  }

  toggleCategory(category: TemplateCategory) {
    this.api.updateAdminTemplateCategory(category.id, { is_active: !category.is_active }).subscribe({
      next: () => this.loadCategories(),
      error: (error) => this.notify(error?.error?.message || 'Could not update this category.', 'error'),
    });
  }

  deleteCategory(category: TemplateCategory) {
    if (!window.confirm(`Delete category “${category.name}”?`)) return;
    this.api.deleteAdminTemplateCategory(category.id).subscribe({
      next: () => { this.loadCategories(); this.notify('Category deleted.'); },
      error: (error) => this.notify(error?.error?.error?.message || error?.error?.message || 'Could not delete this category.', 'error'),
    });
  }

  notify(text: string, type: 'success' | 'error' = 'success') {
    this.message.set(text);
    this.messageType.set(type);
    window.setTimeout(() => { if (this.message() === text) this.message.set(''); }, 5000);
  }
}
