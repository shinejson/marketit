import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { GuideStatus, GuideSummary, HelpArticle, HelpCategory } from '../../core/models';
import { GUIDE_STATUSES, relativeTime, renderGuide } from '../support/support-shared';

interface GuideForm {
  id: number | null;
  title: string;
  excerpt: string;
  body: string;
  category_id: number | null;
  status: GuideStatus;
  audience: 'tenant' | 'customer' | 'internal' | 'all';
  tags: string;
  is_pinned: boolean;
}

@Component({
  selector: 'app-admin-support-guides',
  imports: [FormsModule, DecimalPipe],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Service desk</p>
        <h1>Help &amp; guides</h1>
        <p class="intro muted">
          The knowledge base tenants read inside their console. Publishing a strong guide is the cheapest way to close a ticket queue.
        </p>
      </div>
      <div class="head-actions">
        <button class="btn ghost" type="button" (click)="newCategory()">New category</button>
        <button class="btn accent" type="button" (click)="openNew()">Write a guide</button>
      </div>
    </header>

    @if (summary(); as s) {
      <section class="stat-row">
        <div class="stat card"><span class="s-label">Published</span><strong>{{ s.published }}</strong></div>
        <div class="stat card"><span class="s-label">In review</span><strong>{{ s.review }}</strong></div>
        <div class="stat card"><span class="s-label">Drafts</span><strong>{{ s.draft }}</strong></div>
        <div class="stat card"><span class="s-label">Total reads</span><strong>{{ s.views | number }}</strong></div>
        <div class="stat card"><span class="s-label">Avg. helpful</span><strong>{{ s.avg_helpful }}%</strong></div>
      </section>
    }

    @if (error()) { <p class="err">{{ error() }}</p> }

    <div class="kb">
      <!-- ------------------------------------------------------ sidebar -->
      <aside class="side card">
        <h3>Collections</h3>
        <button type="button" class="cat" [class.on]="categoryId() === null" (click)="setCategory(null)">
          <span class="c-name">All guides</span>
          <span class="c-count">{{ articles().length }}</span>
        </button>
        @for (c of categories(); track c.id) {
          <button type="button" class="cat" [class.on]="categoryId() === c.id" (click)="setCategory(c.id)">
            <span class="c-icon">{{ iconFor(c.icon) }}</span>
            <span class="c-name">{{ c.name }}</span>
            <span class="c-count">{{ c.articles_count ?? 0 }}</span>
          </button>
        }

        <h3 class="spaced">Status</h3>
        <div class="seg vertical">
          <button type="button" [class.on]="status() === 'all'" (click)="setStatus('all')">All</button>
          @for (s of statuses; track s.value) {
            <button type="button" [class.on]="status() === s.value" (click)="setStatus(s.value)">{{ s.label }}</button>
          }
        </div>
      </aside>

      <!-- --------------------------------------------------------- main -->
      <section class="main">
        @if (!editing()) {
          <div class="list-head">
            <input [(ngModel)]="search" (keyup.enter)="load()" placeholder="Search titles and content…" aria-label="Search guides" />
            <span class="muted small">{{ filtered().length }} guide{{ filtered().length === 1 ? '' : 's' }}</span>
          </div>

          @if (loading()) {
            <div class="cards">
              @for (i of [1,2,3,4]; track i) { <div class="skeleton" style="height:160px"></div> }
            </div>
          } @else if (!filtered().length) {
            <div class="card empty">
              <h2>Nothing here yet</h2>
              <p class="muted">Write the first guide for this collection — tenants will see it in their help centre the moment you publish.</p>
              <button class="btn accent" type="button" (click)="openNew()">Write a guide</button>
            </div>
          } @else {
            <div class="cards">
              @for (a of filtered(); track a.id) {
                <article class="g-card card" [class.pinned]="a.is_pinned">
                  <div class="g-top">
                    <span class="g-status" [attr.data-status]="a.status">{{ statusLabel(a.status) }}</span>
                    @if (a.is_pinned) { <span class="g-pin" title="Pinned to the top of the help centre">★</span> }
                    <span class="spacer"></span>
                    <span class="muted tiny">{{ a.read_minutes }} min read</span>
                  </div>

                  <h2 (click)="openEdit(a)">{{ a.title }}</h2>
                  <p class="g-excerpt muted">{{ a.excerpt }}</p>

                  <div class="g-meta">
                    <span class="chip">{{ a.category?.name || 'Uncategorised' }}</span>
                    @for (t of a.tags.slice(0, 2); track t) { <span class="chip soft">{{ t }}</span> }
                  </div>

                  <div class="g-stats">
                    <span><strong>{{ a.views | number }}</strong> reads</span>
                    @if (a.helpful_score !== null) {
                      <span class="helpful" [class.low]="a.helpful_score < 70"><strong>{{ a.helpful_score }}%</strong> helpful</span>
                    } @else {
                      <span class="muted">No ratings</span>
                    }
                    <span class="spacer"></span>
                    <span class="muted tiny">{{ relativeTime(a.updated_at) }}</span>
                  </div>

                  <div class="g-actions">
                    <button class="btn ghost sm" type="button" (click)="openEdit(a)">Edit</button>
                    @if (a.status !== 'published') {
                      <button class="btn ok sm" type="button" (click)="quickPublish(a)">Publish</button>
                    } @else {
                      <button class="btn ghost sm" type="button" (click)="quickUnpublish(a)">Unpublish</button>
                    }
                    <button class="btn ghost sm pin" type="button" (click)="togglePin(a)">{{ a.is_pinned ? 'Unpin' : 'Pin' }}</button>
                  </div>
                </article>
              }
            </div>
          }
        } @else {
          <!-- ------------------------------------------------- editor -->
          <div class="editor card">
            <header class="e-head">
              <button type="button" class="back" (click)="closeEditor()">← Back to guides</button>
              <div class="e-actions">
                @if (form.id) {
                  <button class="btn ghost sm danger" type="button" (click)="remove()">Delete</button>
                }
                <button class="btn ghost sm" type="button" [disabled]="saving()" (click)="save('draft')">Save draft</button>
                <button class="btn accent sm" type="button" [disabled]="saving()" (click)="save('published')">
                  {{ saving() ? 'Saving…' : 'Publish' }}
                </button>
              </div>
            </header>

            <div class="e-meta">
              <input class="title-input" [(ngModel)]="form.title" placeholder="Guide title" aria-label="Guide title" />
              <input class="excerpt-input" [(ngModel)]="form.excerpt" placeholder="One-line summary shown in the help centre list" aria-label="Summary" />
              <div class="meta-row">
                <label>
                  <span>Collection</span>
                  <select [(ngModel)]="form.category_id">
                    <option [ngValue]="null">Uncategorised</option>
                    @for (c of categories(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
                  </select>
                </label>
                <label>
                  <span>Audience</span>
                  <select [(ngModel)]="form.audience">
                    <option value="tenant">Tenants</option>
                    <option value="customer">Customers</option>
                    <option value="internal">Internal only</option>
                    <option value="all">Everyone</option>
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select [(ngModel)]="form.status">
                    @for (s of statuses; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
                  </select>
                </label>
                <label>
                  <span>Tags</span>
                  <input [(ngModel)]="form.tags" placeholder="payouts, dns" />
                </label>
                <label class="switch">
                  <input type="checkbox" [(ngModel)]="form.is_pinned" />
                  <span>Pin to top</span>
                </label>
              </div>
            </div>

            <div class="e-panes">
              <div class="pane">
                <div class="pane-head">
                  <span>Markdown</span>
                  <span class="muted tiny">## heading · **bold** · - list · | tables | · \`code\`</span>
                </div>
                <textarea [(ngModel)]="form.body" spellcheck="true" placeholder="Write the guide…"></textarea>
              </div>
              <div class="pane preview-pane">
                <div class="pane-head"><span>Preview</span><span class="muted tiny">{{ readMinutes() }} min read</span></div>
                <div class="preview" [innerHTML]="preview()"></div>
              </div>
            </div>

            @if (formError()) { <p class="err">{{ formError() }}</p> }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    :host { display:block; max-width:1560px; margin:0 auto; }

    .page-head { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; flex-wrap:wrap; margin-bottom:16px; }
    .eyebrow { margin:0 0 5px; color:var(--accent); font-size:10px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; }
    h1 { margin:0; font-size:clamp(24px,2.6vw,32px); }
    .intro { margin:6px 0 0; font-size:13.5px; max-width:66ch; }
    .head-actions { display:flex; gap:8px; }
    .btn { padding:10px 16px; font-size:13px; }
    .btn.sm { padding:7px 12px; font-size:12px; border-radius:10px; }
    .btn.sm.danger { color:var(--danger); border-color:color-mix(in srgb,var(--danger) 35%,var(--line)); }
    .err { color:var(--danger); font-size:13px; margin:10px 0 0; }

    .stat-row { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; margin-bottom:16px; }
    .stat { padding:13px 16px; display:grid; gap:3px; }
    .s-label { font-size:10px; font-weight:800; letter-spacing:.11em; text-transform:uppercase; color:var(--ink-soft); }
    .stat strong { font-family:Fraunces,Georgia,serif; font-size:25px; font-weight:650; line-height:1; }

    .kb { display:grid; grid-template-columns:222px minmax(0,1fr); gap:14px; align-items:start; }

    .side { padding:13px; position:sticky; top:16px; }
    .side h3 { margin:0 0 8px; font-size:10.5px; letter-spacing:.11em; text-transform:uppercase; color:var(--ink-soft); font-family:inherit; font-weight:800; }
    .side h3.spaced { margin-top:16px; }
    .cat { display:flex; align-items:center; gap:8px; width:100%; border:0; background:transparent; color:var(--ink); padding:8px 9px; border-radius:10px; cursor:pointer; text-align:left; font-size:12.5px; }
    .cat:hover { background:var(--paper-2); }
    .cat.on { background:var(--ink); color:var(--card); }
    .c-icon { font-size:13px; }
    .c-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:650; }
    .c-count { font-size:10.5px; opacity:.7; }
    .seg.vertical { display:grid; gap:2px; }
    .seg button { border:0; border-radius:9px; background:transparent; color:var(--ink-soft); padding:7px 9px; font-size:12px; font-weight:700; cursor:pointer; text-align:left; }
    .seg button.on { background:var(--paper-2); color:var(--ink); }

    .list-head { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
    .list-head input { flex:1; max-width:380px; border:1px solid var(--line); border-radius:11px; padding:10px 12px; background:var(--card); color:var(--ink); font-size:13px; }
    .small { font-size:12px; }
    .tiny { font-size:10.5px; }

    .cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:13px; }
    .g-card { padding:15px 17px; display:flex; flex-direction:column; gap:8px; }
    .g-card.pinned { border-color:color-mix(in srgb,var(--gold) 45%,var(--line)); }
    .g-top { display:flex; align-items:center; gap:7px; }
    .g-top .spacer { flex:1; }
    .g-status { font-size:9.5px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; padding:3px 7px; border-radius:6px; background:var(--paper-2); color:var(--ink-soft); }
    .g-status[data-status="published"] { background:color-mix(in srgb,var(--ok) 15%,transparent); color:var(--ok); }
    .g-status[data-status="review"] { background:color-mix(in srgb,var(--gold) 22%,transparent); color:#8a6d11; }
    .g-status[data-status="draft"] { background:var(--paper-2); color:var(--ink-soft); }
    .g-pin { color:var(--gold); font-size:13px; }
    .g-card h2 { margin:0; font-size:15.5px; line-height:1.3; cursor:pointer; }
    .g-card h2:hover { color:var(--accent); }
    .g-excerpt { margin:0; font-size:12.5px; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .g-meta { display:flex; gap:5px; flex-wrap:wrap; }
    .chip { font-size:10px; font-weight:700; padding:3px 8px; border-radius:99px; background:color-mix(in srgb,var(--accent) 12%,transparent); color:var(--accent); }
    .chip.soft { background:var(--paper-2); color:var(--ink-soft); }
    .g-stats { display:flex; align-items:center; gap:12px; font-size:11.5px; color:var(--ink-soft); padding-top:8px; border-top:1px solid var(--line); }
    .g-stats .spacer { flex:1; }
    .g-stats strong { color:var(--ink); font-family:Fraunces,serif; font-size:13px; }
    .helpful strong { color:var(--ok); }
    .helpful.low strong { color:var(--accent); }
    .g-actions { display:flex; gap:6px; flex-wrap:wrap; }
    .btn.ok { background:var(--accent-2); color:#fff; }
    .btn.pin { margin-left:auto; }

    .empty { padding:48px 28px; text-align:center; display:grid; gap:8px; justify-items:center; }
    .empty h2 { margin:0; font-size:19px; }
    .empty p { margin:0; max-width:46ch; font-size:13px; }

    /* ---- editor ---- */
    .editor { padding:0; overflow:hidden; display:flex; flex-direction:column; }
    .e-head { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid var(--line); }
    .back { border:0; background:transparent; color:var(--ink-soft); font-size:12.5px; font-weight:700; cursor:pointer; }
    .back:hover { color:var(--accent); }
    .e-actions { display:flex; gap:7px; }
    .e-meta { padding:14px 16px; border-bottom:1px solid var(--line); display:grid; gap:9px; }
    .title-input { border:0; background:transparent; color:var(--ink); font-family:Fraunces,Georgia,serif; font-size:24px; font-weight:650; letter-spacing:-.02em; padding:0; }
    .title-input:focus { outline:none; }
    .excerpt-input { border:0; background:transparent; color:var(--ink-soft); font-size:13px; padding:0; }
    .excerpt-input:focus { outline:none; }
    .meta-row { display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; margin-top:4px; }
    .meta-row label { display:grid; gap:4px; }
    .meta-row span { font-size:10px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:var(--ink-soft); }
    .meta-row select, .meta-row input[type=text], .meta-row input:not([type]) { border:1px solid var(--line); border-radius:9px; padding:7px 9px; background:var(--card); color:var(--ink); font-size:12px; }
    .switch { flex-direction:row !important; align-items:center; gap:6px !important; padding-bottom:7px; }
    .switch input { accent-color:var(--accent); }
    .switch span { text-transform:none !important; letter-spacing:0 !important; font-size:12px !important; font-weight:650 !important; }

    .e-panes { display:grid; grid-template-columns:1fr 1fr; min-height:440px; }
    .pane { display:flex; flex-direction:column; min-width:0; }
    .pane + .pane { border-left:1px solid var(--line); }
    .pane-head { display:flex; justify-content:space-between; align-items:center; padding:8px 14px; background:var(--paper-2); font-size:10.5px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:var(--ink-soft); }
    .pane textarea { flex:1; border:0; resize:none; padding:16px; background:var(--card); color:var(--ink); font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12.5px; line-height:1.65; }
    .pane textarea:focus { outline:none; }
    .preview { flex:1; padding:18px 20px; overflow-y:auto; max-height:560px; font-size:13.5px; line-height:1.65; }
    .preview :is(h2,h3,h4,h5) { font-family:Fraunces,Georgia,serif; margin:18px 0 7px; line-height:1.25; }
    .preview h2 { font-size:19px; }
    .preview h3 { font-size:16px; }
    .preview h4 { font-size:14px; }
    .preview p { margin:0 0 11px; }
    .preview ul { margin:0 0 12px; padding-left:20px; }
    .preview li { margin-bottom:4px; }
    .preview code { background:var(--paper-2); padding:1px 5px; border-radius:5px; font-size:12px; }
    .preview pre { background:var(--paper-2); padding:12px 14px; border-radius:11px; overflow-x:auto; margin:0 0 12px; }
    .preview pre code { background:none; padding:0; }
    .preview blockquote { margin:0 0 12px; padding:9px 14px; border-left:3px solid var(--accent); background:color-mix(in srgb,var(--accent) 7%,transparent); border-radius:0 10px 10px 0; }
    .preview blockquote p { margin:0; }
    .preview table { width:100%; border-collapse:collapse; margin:0 0 14px; font-size:12.5px; }
    .preview th, .preview td { text-align:left; padding:7px 10px; border-bottom:1px solid var(--line); }
    .preview th { font-size:10.5px; letter-spacing:.07em; text-transform:uppercase; color:var(--ink-soft); }

    .skeleton { background:linear-gradient(90deg,var(--paper-2),var(--card),var(--paper-2)); background-size:200% 100%; animation:sd-shimmer 1.2s infinite; border-radius:16px; }
    @keyframes sd-shimmer { to { background-position:-200% 0; } }

    @media (max-width:1100px) { .stat-row { grid-template-columns:repeat(3,1fr); } .e-panes { grid-template-columns:1fr; } .pane + .pane { border-left:0; border-top:1px solid var(--line); } }
    @media (max-width:820px) { .kb { grid-template-columns:1fr; } .side { position:static; } }
  `],
})
export class AdminSupportGuidesComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  readonly statuses = GUIDE_STATUSES;
  readonly relativeTime = relativeTime;

  loading = signal(true);
  error = signal('');
  categories = signal<HelpCategory[]>([]);
  articles = signal<HelpArticle[]>([]);
  summary = signal<GuideSummary | null>(null);

  categoryId = signal<number | null>(null);
  status = signal<GuideStatus | 'all'>('all');
  search = '';

  editing = signal(false);
  saving = signal(false);
  formError = signal('');
  form: GuideForm = this.blank();

  /** `?guide=<id>` opens that article in the editor as soon as the list lands. */
  private pendingGuideId: number | null = null;

  constructor() {
    const deep = Number(this.route.snapshot.queryParamMap.get('guide'));
    this.pendingGuideId = Number.isFinite(deep) && deep > 0 ? deep : null;
    this.load();
  }

  load() {
    this.loading.set(true);
    const params: Record<string, string> = {};
    if (this.search.trim()) params['q'] = this.search.trim();

    this.api.supportGuides(params).subscribe({
      next: (res) => {
        this.categories.set(res.data.categories);
        this.articles.set(res.data.articles);
        this.summary.set(res.summary);
        this.loading.set(false);
        this.error.set('');

        if (this.pendingGuideId !== null) {
          const target = res.data.articles.find((a) => a.id === this.pendingGuideId);
          this.pendingGuideId = null;
          if (target) this.openEdit(target);
        }
      },
      error: () => {
        this.error.set('Could not load the help centre.');
        this.loading.set(false);
      },
    });
  }

  filtered = computed(() => {
    const cat = this.categoryId();
    const st = this.status();
    return this.articles().filter(
      (a) => (cat === null || a.category_id === cat) && (st === 'all' || a.status === st),
    );
  });

  setCategory(id: number | null) {
    this.categoryId.set(id);
  }

  setStatus(value: GuideStatus | 'all') {
    this.status.set(value);
  }

  statusLabel(status: GuideStatus): string {
    return GUIDE_STATUSES.find((s) => s.value === status)?.label ?? status;
  }

  iconFor(icon: string): string {
    const map: Record<string, string> = {
      rocket: '🚀', wallet: '💳', truck: '🚚', box: '📦', shield: '🔐', book: '📘',
    };
    return map[icon] ?? '📘';
  }

  // --------------------------------------------------------------- editor

  openNew() {
    this.form = { ...this.blank(), category_id: this.categoryId() };
    this.formError.set('');
    this.editing.set(true);
  }

  openEdit(article: HelpArticle) {
    this.form = {
      id: article.id,
      title: article.title,
      excerpt: article.excerpt ?? '',
      body: article.body ?? '',
      category_id: article.category_id,
      status: article.status,
      audience: article.audience,
      tags: article.tags.join(', '),
      is_pinned: article.is_pinned,
    };
    this.formError.set('');
    this.editing.set(true);
  }

  closeEditor() {
    this.editing.set(false);
    this.load();
  }

  preview = computed(() => renderGuide(this.form.body));

  readMinutes = computed(() => Math.max(1, Math.ceil(this.form.body.split(/\s+/).filter(Boolean).length / 200)));

  save(as?: GuideStatus) {
    if (!this.form.title.trim()) {
      this.formError.set('Give the guide a title.');
      return;
    }
    if (!this.form.body.trim()) {
      this.formError.set('The guide needs some content.');
      return;
    }

    const status = as ?? this.form.status;
    this.saving.set(true);

    const payload: Record<string, unknown> = {
      title: this.form.title.trim(),
      excerpt: this.form.excerpt.trim() || this.form.body.split('\n')[0].slice(0, 155),
      body: this.form.body,
      category_id: this.form.category_id,
      status,
      audience: this.form.audience,
      tags: this.form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      is_pinned: this.form.is_pinned,
    };

    const req = this.form.id
      ? this.api.updateSupportGuide(this.form.id, payload)
      : this.api.createSupportGuide(payload);

    req.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.form.id = res.data.id;
        this.form.status = res.data.status;
        this.closeEditor();
      },
      error: () => {
        this.saving.set(false);
        this.formError.set('Could not save the guide.');
      },
    });
  }

  remove() {
    if (!this.form.id) return;
    this.api.deleteSupportGuide(this.form.id).subscribe({
      next: () => this.closeEditor(),
      error: () => this.formError.set('Could not delete the guide.'),
    });
  }

  // ------------------------------------------------------- quick actions

  quickPublish(article: HelpArticle) {
    this.patch(article, { status: 'published' });
  }

  quickUnpublish(article: HelpArticle) {
    this.patch(article, { status: 'draft' });
  }

  togglePin(article: HelpArticle) {
    this.patch(article, { is_pinned: !article.is_pinned });
  }

  private patch(article: HelpArticle, payload: Record<string, unknown>) {
    this.articles.update((list) => list.map((a) => (a.id === article.id ? { ...a, ...(payload as Partial<HelpArticle>) } : a)));
    this.api.updateSupportGuide(article.id, payload).subscribe({
      next: () => this.load(),
      error: () => {
        this.error.set('Update failed.');
        this.load();
      },
    });
  }

  newCategory() {
    const name = typeof window !== 'undefined' ? window.prompt('Name the new collection') : null;
    if (!name?.trim()) return;
    this.api.createGuideCategory({ name: name.trim() }).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Could not create the collection.'),
    });
  }

  private blank(): GuideForm {
    return {
      id: null,
      title: '',
      excerpt: '',
      body: '## Overview\n\nExplain the outcome the tenant wants.\n\n## Steps\n\n1. First step\n2. Second step\n\n> Tip: link to the exact screen in the console.',
      category_id: null,
      status: 'draft',
      audience: 'tenant',
      tags: '',
      is_pinned: false,
    };
  }
}
