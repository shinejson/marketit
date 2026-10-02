import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import {
  SupportAgent,
  SupportTask,
  SupportTaskSummary,
  SupportTenantRef,
  TaskChecklistItem,
  TaskStatus,
  TicketPriority,
} from '../../core/models';
import {
  TASK_COLUMNS,
  TICKET_PRIORITIES,
  avatarColor,
  initials,
  priorityLabel,
  relativeTime,
} from '../support/support-shared';

interface TaskForm {
  id: number | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TicketPriority;
  owner_type: 'support' | 'tenant';
  tenant_id: number | null;
  assignee_id: number | null;
  due_at: string;
  checklist: TaskChecklistItem[];
}

@Component({
  selector: 'app-admin-support-tasks',
  imports: [FormsModule, DatePipe],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Service desk</p>
        <h1>Service tasks</h1>
        <p class="intro muted">
          Follow-ups the support team owns, plus the actions you hand to tenants. Drag a card between columns to move it.
        </p>
      </div>
      <button class="btn accent" type="button" (click)="openNew()">New task</button>
    </header>

    @if (summary(); as s) {
      <section class="stat-row">
        <div class="stat card"><span class="s-label">Open</span><strong>{{ s.open }}</strong></div>
        <div class="stat card" [class.alert]="s.overdue > 0"><span class="s-label">Overdue</span><strong>{{ s.overdue }}</strong></div>
        <div class="stat card"><span class="s-label">Due today</span><strong>{{ s.due_today }}</strong></div>
        <div class="stat card"><span class="s-label">Completed</span><strong>{{ s.done_this_week }}</strong></div>
        <div class="stat card wide">
          <span class="s-label">Progress</span>
          <div class="progress"><i [style.width.%]="donePct()"></i></div>
          <small class="muted">{{ donePct() }}% of all tasks done</small>
        </div>
      </section>
    }

    <section class="filters">
      <input [(ngModel)]="search" (keyup.enter)="load()" placeholder="Search tasks…" aria-label="Search tasks" />
      <div class="seg">
        @for (o of owners; track o.value) {
          <button type="button" [class.on]="owner() === o.value" (click)="setOwner(o.value)">{{ o.label }}</button>
        }
      </div>
      <select [(ngModel)]="priority" (change)="load()" aria-label="Priority">
        <option value="all">Any priority</option>
        @for (p of priorities; track p.value) { <option [value]="p.value">{{ p.label }}</option> }
      </select>
      <select [(ngModel)]="assignee" (change)="load()" aria-label="Assignee">
        <option value="all">Anyone</option>
        <option value="unassigned">Unassigned</option>
        @for (a of agents(); track a.id) { <option [value]="a.id">{{ a.name }}</option> }
      </select>
      @if (dirtyFilters()) { <button class="btn ghost sm" type="button" (click)="resetFilters()">Clear</button> }
    </section>

    @if (error()) { <p class="err">{{ error() }}</p> }

    <section class="board">
      @for (col of columns; track col.value) {
        <div
          class="column"
          [class.drop]="dropTarget() === col.value"
          (dragover)="onDragOver($event, col.value)"
          (dragleave)="dropTarget.set(null)"
          (drop)="onDrop($event, col.value)"
        >
          <header class="col-head">
            <span class="col-dot" [style.background]="col.accent"></span>
            <h2>{{ col.label }}</h2>
            <span class="count">{{ byStatus(col.value).length }}</span>
            <button type="button" class="add" (click)="openNew(col.value)" [attr.aria-label]="'Add task to ' + col.label">+</button>
          </header>

          <div class="col-body">
            @for (t of byStatus(col.value); track t.id) {
              <article
                class="task card"
                draggable="true"
                (dragstart)="onDragStart($event, t)"
                (dragend)="dragging.set(null)"
                [class.ghost]="dragging()?.id === t.id"
                [class.overdue]="t.overdue"
              >
                <div class="t-top">
                  <span class="pri" [class]="t.priority">{{ priorityLabel(t.priority) }}</span>
                  @if (t.owner_type === 'tenant') { <span class="owner-tag">Tenant action</span> }
                  <button type="button" class="edit" (click)="openEdit(t)" aria-label="Edit task">⋯</button>
                </div>

                <h3 (click)="openEdit(t)">{{ t.title }}</h3>

                @if (t.checklist.length) {
                  <div class="checks">
                    <div class="check-bar"><i [style.width.%]="checkPct(t)"></i></div>
                    <span class="muted tiny">{{ doneCount(t) }}/{{ t.checklist.length }}</span>
                  </div>
                  <ul class="check-list">
                    @for (c of t.checklist; track c.label) {
                      <li>
                        <label>
                          <input type="checkbox" [checked]="c.done" (change)="toggleCheck(t, c)" />
                          <span [class.done]="c.done">{{ c.label }}</span>
                        </label>
                      </li>
                    }
                  </ul>
                }

                <div class="t-foot">
                  @if (t.tenant) { <span class="chip">{{ t.tenant.name }}</span> }
                  @if (t.ticket_reference) { <span class="chip link">{{ t.ticket_reference }}</span> }
                  <span class="spacer"></span>
                  @if (t.due_at) {
                    <span class="due" [class.late]="t.overdue">{{ t.due_at | date: 'MMM d' }}</span>
                  }
                  @if (t.assignee) {
                    <span class="mini-avatar" [style.background]="avatarColor(t.assignee.name)" [title]="t.assignee.name">
                      {{ initials(t.assignee.name) }}
                    </span>
                  } @else {
                    <span class="mini-avatar none" title="Unassigned">?</span>
                  }
                </div>
              </article>
            } @empty {
              <p class="col-empty muted">Nothing here.</p>
            }
          </div>
        </div>
      }
    </section>

    <!-- ------------------------------------------------------ editor -->
    @if (editing()) {
      <div class="drawer-backdrop" (click)="editing.set(false)">
        <aside class="drawer card" (click)="$event.stopPropagation()">
          <header class="d-head">
            <h2>{{ form.id ? 'Edit task' : 'New task' }}</h2>
            <button type="button" class="close" (click)="editing.set(false)" aria-label="Close">×</button>
          </header>

          <label class="field"><span>Title</span><input [(ngModel)]="form.title" placeholder="What needs to happen?" /></label>
          <label class="field"><span>Details</span><textarea [(ngModel)]="form.description" rows="3" placeholder="Context, links, acceptance criteria…"></textarea></label>

          <div class="grid2">
            <label class="field">
              <span>Status</span>
              <select [(ngModel)]="form.status">
                @for (c of columns; track c.value) { <option [value]="c.value">{{ c.label }}</option> }
              </select>
            </label>
            <label class="field">
              <span>Priority</span>
              <select [(ngModel)]="form.priority">
                @for (p of priorities; track p.value) { <option [value]="p.value">{{ p.label }}</option> }
              </select>
            </label>
            <label class="field">
              <span>Owned by</span>
              <select [(ngModel)]="form.owner_type">
                <option value="support">Support team</option>
                <option value="tenant">Tenant</option>
              </select>
            </label>
            <label class="field">
              <span>Due date</span>
              <input type="date" [(ngModel)]="form.due_at" />
            </label>
            <label class="field">
              <span>Tenant</span>
              <select [(ngModel)]="form.tenant_id">
                <option [ngValue]="null">None</option>
                @for (t of tenantOptions(); track t.id) { <option [ngValue]="t.id">{{ t.name }}</option> }
              </select>
            </label>
            <label class="field">
              <span>Assignee</span>
              <select [(ngModel)]="form.assignee_id">
                <option [ngValue]="null">Unassigned</option>
                @for (a of agents(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }
              </select>
            </label>
          </div>

          <div class="field">
            <span>Checklist</span>
            <ul class="editor-checks">
              @for (c of form.checklist; track $index) {
                <li>
                  <input type="checkbox" [(ngModel)]="c.done" />
                  <input class="c-text" [(ngModel)]="c.label" placeholder="Step" />
                  <button type="button" (click)="removeCheck($index)" aria-label="Remove step">×</button>
                </li>
              }
            </ul>
            <div class="add-check">
              <input [(ngModel)]="newCheck" placeholder="Add a step…" (keyup.enter)="addCheck()" />
              <button class="btn ghost sm" type="button" (click)="addCheck()">Add</button>
            </div>
          </div>

          @if (formError()) { <p class="err">{{ formError() }}</p> }

          <footer class="d-foot">
            @if (form.id) {
              <button class="btn ghost danger" type="button" (click)="remove()">Delete</button>
            }
            <span class="spacer"></span>
            <button class="btn ghost" type="button" (click)="editing.set(false)">Cancel</button>
            <button class="btn accent" type="button" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'Saving…' : form.id ? 'Save changes' : 'Create task' }}
            </button>
          </footer>
        </aside>
      </div>
    }
  `,
  styles: [`
    :host { display:block; max-width:1560px; margin:0 auto; }

    .page-head { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; flex-wrap:wrap; margin-bottom:16px; }
    .eyebrow { margin:0 0 5px; color:var(--accent); font-size:10px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; }
    h1 { margin:0; font-size:clamp(24px,2.6vw,32px); }
    .intro { margin:6px 0 0; font-size:13.5px; max-width:64ch; }
    .btn { padding:10px 16px; font-size:13px; }
    .btn.sm { padding:7px 12px; font-size:12px; border-radius:10px; }
    .btn.ghost.danger { color:var(--danger); border-color:color-mix(in srgb,var(--danger) 35%,var(--line)); }
    .err { color:var(--danger); font-size:13px; margin:8px 0; }

    .stat-row { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)) minmax(0,1.6fr); gap:12px; margin-bottom:14px; }
    .stat { padding:13px 16px; display:grid; gap:3px; align-content:center; }
    .s-label { font-size:10px; font-weight:800; letter-spacing:.11em; text-transform:uppercase; color:var(--ink-soft); }
    .stat strong { font-family:Fraunces,Georgia,serif; font-size:25px; font-weight:650; line-height:1; }
    .stat.alert strong { color:var(--danger); }
    .progress { height:7px; border-radius:99px; background:var(--paper-2); overflow:hidden; margin:6px 0 4px; }
    .progress i { display:block; height:100%; border-radius:99px; background:linear-gradient(90deg,var(--accent),var(--gold)); }
    .stat small { font-size:11px; }

    .filters { display:flex; gap:9px; flex-wrap:wrap; align-items:center; margin-bottom:14px; }
    .filters input, .filters select { border:1px solid var(--line); border-radius:11px; padding:9px 11px; background:var(--card); color:var(--ink); font-size:12.5px; }
    .filters input { min-width:220px; }
    .seg { display:flex; gap:3px; padding:3px; border:1px solid var(--line); border-radius:11px; background:var(--card); }
    .seg button { border:0; border-radius:8px; background:transparent; color:var(--ink-soft); padding:6px 12px; font-size:12px; font-weight:750; cursor:pointer; }
    .seg button.on { background:var(--ink); color:var(--card); }

    .board { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; align-items:start; }
    .column { background:var(--paper-2); border:1px solid transparent; border-radius:16px; padding:10px; min-height:220px; transition:border-color .15s ease, background .15s ease; }
    .column.drop { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 7%,var(--paper-2)); }
    .col-head { display:flex; align-items:center; gap:7px; padding:2px 4px 10px; }
    .col-dot { width:8px; height:8px; border-radius:50%; flex:none; }
    .col-head h2 { margin:0; font-size:12.5px; font-family:inherit; font-weight:800; letter-spacing:.03em; flex:1; }
    .count { font-size:11px; font-weight:750; color:var(--ink-soft); background:var(--card); border-radius:99px; padding:1px 7px; }
    .add { border:0; background:transparent; color:var(--ink-soft); font-size:17px; line-height:1; cursor:pointer; padding:0 3px; border-radius:6px; }
    .add:hover { color:var(--accent); background:var(--card); }
    .col-body { display:grid; gap:9px; }
    .col-empty { font-size:11.5px; text-align:center; padding:14px 6px; }

    .task { padding:11px 12px; cursor:grab; box-shadow:0 2px 8px rgba(28,25,20,.05); }
    .task:active { cursor:grabbing; }
    .task.ghost { opacity:.4; }
    .task.overdue { border-color:color-mix(in srgb,var(--danger) 42%,var(--line)); }
    .t-top { display:flex; align-items:center; gap:5px; margin-bottom:7px; }
    .pri { font-size:9px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; padding:2px 6px; border-radius:5px; background:var(--paper-2); color:var(--ink-soft); }
    .pri.urgent { background:color-mix(in srgb,var(--danger) 16%,transparent); color:var(--danger); }
    .pri.high { background:color-mix(in srgb,var(--accent) 17%,transparent); color:var(--accent); }
    .owner-tag { font-size:9px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; padding:2px 6px; border-radius:5px; background:color-mix(in srgb,#5a4fcf 14%,transparent); color:#5a4fcf; }
    .edit { margin-left:auto; border:0; background:transparent; color:var(--ink-soft); cursor:pointer; font-size:15px; line-height:1; padding:0 3px; }
    .edit:hover { color:var(--accent); }
    .task h3 { margin:0 0 8px; font-size:13px; line-height:1.38; font-family:inherit; font-weight:650; cursor:pointer; }
    .task h3:hover { color:var(--accent); }

    .checks { display:flex; align-items:center; gap:7px; margin-bottom:6px; }
    .check-bar { flex:1; height:4px; border-radius:99px; background:var(--paper-2); overflow:hidden; }
    .check-bar i { display:block; height:100%; background:var(--accent-2); border-radius:99px; }
    .tiny { font-size:10px; }
    .check-list { list-style:none; margin:0 0 8px; padding:0; display:grid; gap:3px; }
    .check-list label { display:flex; align-items:flex-start; gap:6px; font-size:11.5px; line-height:1.35; cursor:pointer; }
    .check-list input { margin:1px 0 0; accent-color:var(--accent); }
    .check-list span.done { text-decoration:line-through; color:var(--ink-soft); }

    .t-foot { display:flex; align-items:center; gap:5px; flex-wrap:wrap; }
    .t-foot .spacer { flex:1; }
    .chip { font-size:9.5px; font-weight:700; padding:2px 7px; border-radius:99px; background:var(--paper-2); color:var(--ink-soft); max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .chip.link { background:color-mix(in srgb,var(--accent) 13%,transparent); color:var(--accent); }
    .due { font-size:10px; font-weight:700; color:var(--ink-soft); }
    .due.late { color:var(--danger); }
    .mini-avatar { display:grid; place-items:center; width:22px; height:22px; border-radius:999px; color:#fff; font-size:9px; font-weight:800; flex:none; }
    .mini-avatar.none { background:var(--paper-2); color:var(--ink-soft); border:1px dashed var(--line); }

    /* ---- drawer ---- */
    .drawer-backdrop { position:fixed; inset:0; background:rgba(10,8,5,.5); z-index:60; display:flex; justify-content:flex-end; backdrop-filter:blur(2px); }
    .drawer { width:min(460px,100%); height:100%; overflow-y:auto; border-radius:0; padding:20px 22px 28px; display:flex; flex-direction:column; gap:12px; }
    .d-head { display:flex; justify-content:space-between; align-items:center; }
    .d-head h2 { margin:0; font-size:20px; }
    .close { border:0; background:transparent; font-size:24px; line-height:1; color:var(--ink-soft); cursor:pointer; }
    .field { display:grid; gap:5px; }
    .field > span { font-size:11.5px; font-weight:700; color:var(--ink-soft); }
    .field input, .field select, .field textarea { border:1px solid var(--line); border-radius:11px; padding:10px 11px; background:var(--card); color:var(--ink); font-size:13px; width:100%; }
    .field textarea { resize:vertical; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:11px; }
    .editor-checks { list-style:none; margin:0; padding:0; display:grid; gap:6px; }
    .editor-checks li { display:flex; align-items:center; gap:7px; }
    .editor-checks input[type=checkbox] { accent-color:var(--accent); flex:none; }
    .c-text { flex:1; }
    .editor-checks button { border:0; background:transparent; color:var(--ink-soft); font-size:17px; cursor:pointer; line-height:1; }
    .add-check { display:flex; gap:7px; margin-top:7px; }
    .add-check input { flex:1; border:1px solid var(--line); border-radius:11px; padding:9px 11px; background:var(--card); color:var(--ink); font-size:12.5px; }
    .d-foot { display:flex; align-items:center; gap:8px; margin-top:auto; padding-top:14px; border-top:1px solid var(--line); }
    .d-foot .spacer { flex:1; }

    @media (max-width:1280px) { .board { grid-template-columns:repeat(3,minmax(0,1fr)); } .stat-row { grid-template-columns:repeat(2,1fr); } }
    @media (max-width:760px) { .board { grid-template-columns:1fr; } .grid2 { grid-template-columns:1fr; } }
  `],
})
export class AdminSupportTasksComponent {
  private api = inject(ApiService);

  readonly columns = TASK_COLUMNS;
  readonly priorities = TICKET_PRIORITIES;
  readonly owners = [
    { value: 'all', label: 'Everything' },
    { value: 'support', label: 'Support team' },
    { value: 'tenant', label: 'Tenant actions' },
  ];

  readonly initials = initials;
  readonly avatarColor = avatarColor;
  readonly priorityLabel = priorityLabel;
  readonly relativeTime = relativeTime;

  loading = signal(true);
  error = signal('');
  tasks = signal<SupportTask[]>([]);
  summary = signal<SupportTaskSummary | null>(null);
  agents = signal<SupportAgent[]>([]);

  owner = signal('all');
  search = '';
  priority = 'all';
  assignee = 'all';

  dragging = signal<SupportTask | null>(null);
  dropTarget = signal<TaskStatus | null>(null);

  editing = signal(false);
  saving = signal(false);
  formError = signal('');
  newCheck = '';
  form: TaskForm = this.blank();

  constructor() {
    this.api.supportAgents().subscribe({ next: (r) => this.agents.set(r.data), error: () => {} });
    this.load();
  }

  // -------------------------------------------------------------- loading

  load() {
    this.loading.set(true);
    const params: Record<string, string> = {};
    if (this.owner() !== 'all') params['owner_type'] = this.owner();
    if (this.priority !== 'all') params['priority'] = this.priority;
    if (this.assignee !== 'all') params['assignee'] = this.assignee;
    if (this.search.trim()) params['q'] = this.search.trim();

    this.api.supportTasks(params).subscribe({
      next: (res) => {
        this.tasks.set(res.data);
        this.summary.set(res.summary);
        this.loading.set(false);
        this.error.set('');
      },
      error: () => {
        this.error.set('Could not load tasks.');
        this.loading.set(false);
      },
    });
  }

  setOwner(value: string) {
    this.owner.set(value);
    this.load();
  }

  dirtyFilters = computed(() => this.owner() !== 'all');

  resetFilters() {
    this.owner.set('all');
    this.priority = 'all';
    this.assignee = 'all';
    this.search = '';
    this.load();
  }

  byStatus(status: TaskStatus): SupportTask[] {
    return this.tasks().filter((t) => t.status === status);
  }

  tenantOptions = computed<SupportTenantRef[]>(() => {
    const map = new Map<number, SupportTenantRef>();
    for (const t of this.tasks()) if (t.tenant) map.set(t.tenant.id, t.tenant);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  donePct = computed(() => {
    const s = this.summary();
    if (!s || !s.total) return 0;
    return Math.round(((s.total - s.open) / s.total) * 100);
  });

  doneCount(task: SupportTask): number {
    return task.checklist.filter((c) => c.done).length;
  }

  checkPct(task: SupportTask): number {
    return task.checklist.length ? (this.doneCount(task) / task.checklist.length) * 100 : 0;
  }

  // ----------------------------------------------------------- drag & drop

  onDragStart(event: DragEvent, task: SupportTask) {
    this.dragging.set(task);
    event.dataTransfer?.setData('text/plain', String(task.id));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onDragOver(event: DragEvent, status: TaskStatus) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dropTarget.set(status);
  }

  onDrop(event: DragEvent, status: TaskStatus) {
    event.preventDefault();
    this.dropTarget.set(null);
    const task = this.dragging();
    this.dragging.set(null);
    if (!task || task.status === status) return;
    this.move(task, status);
  }

  private move(task: SupportTask, status: TaskStatus) {
    // Optimistic board update, then persist.
    this.tasks.update((list) => list.map((t) => (t.id === task.id ? { ...t, status, overdue: status === 'done' ? false : t.overdue } : t)));
    this.api.updateSupportTask(task.id, { status }).subscribe({
      next: () => this.load(),
      error: () => {
        this.error.set('Could not move that task.');
        this.load();
      },
    });
  }

  toggleCheck(task: SupportTask, item: TaskChecklistItem) {
    const checklist = task.checklist.map((c) => (c.label === item.label ? { ...c, done: !c.done } : c));
    this.tasks.update((list) => list.map((t) => (t.id === task.id ? { ...t, checklist } : t)));
    this.api.updateSupportTask(task.id, { checklist }).subscribe({ error: () => this.load() });
  }

  // --------------------------------------------------------------- editor

  openNew(status: TaskStatus = 'todo') {
    this.form = { ...this.blank(), status };
    this.formError.set('');
    this.newCheck = '';
    this.editing.set(true);
  }

  openEdit(task: SupportTask) {
    this.form = {
      id: task.id,
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      owner_type: task.owner_type,
      tenant_id: task.tenant?.id ?? null,
      assignee_id: task.assignee?.id ?? null,
      due_at: task.due_at ? task.due_at.slice(0, 10) : '',
      checklist: task.checklist.map((c) => ({ ...c })),
    };
    this.formError.set('');
    this.newCheck = '';
    this.editing.set(true);
  }

  addCheck() {
    const label = this.newCheck.trim();
    if (!label) return;
    this.form.checklist = [...this.form.checklist, { label, done: false }];
    this.newCheck = '';
  }

  removeCheck(index: number) {
    this.form.checklist = this.form.checklist.filter((_, i) => i !== index);
  }

  save() {
    if (!this.form.title.trim()) {
      this.formError.set('Give the task a title.');
      return;
    }
    this.saving.set(true);

    const payload: Record<string, unknown> = {
      title: this.form.title.trim(),
      description: this.form.description.trim() || null,
      status: this.form.status,
      priority: this.form.priority,
      owner_type: this.form.owner_type,
      tenant_id: this.form.tenant_id,
      assignee_id: this.form.assignee_id,
      due_at: this.form.due_at ? `${this.form.due_at}T17:00:00` : null,
      checklist: this.form.checklist.filter((c) => c.label.trim()),
    };

    const req = this.form.id
      ? this.api.updateSupportTask(this.form.id, payload)
      : this.api.createSupportTask(payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.formError.set('Could not save the task.');
      },
    });
  }

  remove() {
    if (!this.form.id) return;
    this.api.deleteSupportTask(this.form.id).subscribe({
      next: () => {
        this.editing.set(false);
        this.load();
      },
      error: () => this.formError.set('Could not delete the task.'),
    });
  }

  private blank(): TaskForm {
    return {
      id: null,
      title: '',
      description: '',
      status: 'todo',
      priority: 'normal',
      owner_type: 'support',
      tenant_id: null,
      assignee_id: null,
      due_at: '',
      checklist: [],
    };
  }
}
