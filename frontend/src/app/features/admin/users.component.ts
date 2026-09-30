import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AdminUser, AdminUserSummary, TenantApplication } from '../../core/models';

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, DatePipe, DecimalPipe, TitleCasePipe],
  template: `
    <header class="head">
      <div>
        <h1>Users</h1>
        <p class="muted">Every account on the platform — admins, sellers, staff and customers.</p>
      </div>
      <button class="btn accent" type="button" (click)="startCreate()">New user</button>
    </header>

    @if (summary(); as s) {
      <div class="grid kpis">
        <div class="card kpi"><p class="muted label">Total</p><strong>{{ s.total | number }}</strong></div>
        <div class="card kpi"><p class="muted label">Active</p><strong>{{ s.active | number }}</strong></div>
        <div class="card kpi"><p class="muted label">Suspended</p><strong>{{ s.suspended | number }}</strong></div>
        @for (role of roles; track role) {
          <div class="card kpi"><p class="muted label">{{ label(role) }}</p><strong>{{ s.by_role[role] || 0 | number }}</strong></div>
        }
      </div>
    }

    <div class="toolbar">
      <div class="tabs">
        <button type="button" class="tab" [class.on]="role() === 'all'" (click)="setRole('all')">All roles</button>
        @for (r of roles; track r) {
          <button type="button" class="tab" [class.on]="role() === r" (click)="setRole(r)">{{ label(r) }}</button>
        }
      </div>
      <select [(ngModel)]="statusFilter" (change)="reload()">
        <option value="all">Any status</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </select>
      <input [(ngModel)]="search" (keyup.enter)="reload()" placeholder="Search name, email, phone…" />
      <button class="btn ghost" type="button" (click)="reload()">Search</button>
    </div>

    @if (error()) { <p class="err">{{ error() }}</p> }

    @if (form(); as f) {
      <form class="card pad editor" (ngSubmit)="save()">
        <h3>{{ f.id ? 'Edit ' + f.name : 'Create user' }}</h3>
        <div class="cols">
          <div class="field"><label>Name</label><input [(ngModel)]="f.name" name="name" required /></div>
          <div class="field"><label>Email</label><input [(ngModel)]="f.email" name="email" type="email" required /></div>
          <div class="field"><label>Phone</label><input [(ngModel)]="f.phone" name="phone" /></div>
          <div class="field">
            <label>Status</label>
            <select [(ngModel)]="f.status" name="status">
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div class="field">
            <label>{{ f.id ? 'New password (optional)' : 'Password' }}</label>
            <input [(ngModel)]="f.password" name="password" type="password" autocomplete="new-password" />
          </div>
          @if (!f.id) {
            <div class="field">
              <label>Role</label>
              <select [(ngModel)]="f.role" name="role">
                @for (r of roles; track r) { <option [value]="r">{{ label(r) }}</option> }
              </select>
            </div>
            @if (f.role === 'tenant_owner' || f.role === 'store_staff') {
              <div class="field">
                <label>Tenant</label>
                <select [(ngModel)]="f.tenant_id" name="tenant_id">
                  <option [ngValue]="null">Select a tenant…</option>
                  @for (t of tenants(); track t.id) { <option [ngValue]="t.id">{{ t.business_name || t.name }}</option> }
                </select>
              </div>
            }
          }
        </div>
        <div class="row gap">
          <button class="btn accent" type="submit" [disabled]="busy()">{{ f.id ? 'Save changes' : 'Create user' }}</button>
          <button class="btn ghost" type="button" (click)="form.set(null)">Cancel</button>
        </div>
      </form>
    }

    @if (loading()) {
      <div class="skeleton" style="height:180px; margin-top:12px"></div>
    } @else if (!users().length) {
      <div class="empty card">No users match these filters.</div>
    } @else {
      <div class="card table-wrap">
        <table>
          <thead>
            <tr><th>User</th><th>Roles</th><th>Status</th><th>Last login</th><th>Joined</th><th></th></tr>
          </thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr>
                <td>
                  <strong>{{ u.name }}</strong>
                  <p class="muted small">{{ u.email }}@if (u.phone) { · {{ u.phone }} }</p>
                </td>
                <td>
                  @for (r of u.roles; track r.id) {
                    <span class="pill">{{ label(r.role) }}@if (r.tenant) { · {{ r.tenant }} }</span>
                  }
                </td>
                <td><span class="pill" [class]="'pill ' + u.status">{{ u.status | titlecase }}</span></td>
                <td class="muted small">{{ u.last_login_at ? (u.last_login_at | date: 'MMM d, y') : 'Never' }}</td>
                <td class="muted small">{{ u.created_at | date: 'MMM d, y' }}</td>
                <td class="actions">
                  <button class="btn ghost sm" type="button" (click)="startEdit(u)">Edit</button>
                  <button class="btn ghost sm" type="button" (click)="toggleStatus(u)">
                    {{ u.status === 'active' ? 'Suspend' : 'Activate' }}
                  </button>
                  <button class="btn ghost sm danger" type="button" (click)="remove(u)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pager">
        <button class="btn ghost" type="button" [disabled]="page() <= 1" (click)="go(page() - 1)">Previous</button>
        <span class="muted small">Page {{ page() }} of {{ lastPage() }} · {{ total() | number }} users</span>
        <button class="btn ghost" type="button" [disabled]="page() >= lastPage()" (click)="go(page() + 1)">Next</button>
      </div>
    }
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .head h1 { margin: 0 0 4px; }
    .kpis { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); margin: 18px 0; }
    .kpi { padding: 12px 14px; }
    .kpi strong { font-family: Fraunces, Georgia, serif; font-size: 22px; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 2px; }
    .toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
    .tabs { display: flex; gap: 4px; background: var(--paper-2); padding: 4px; border-radius: 999px; flex-wrap: wrap; }
    .tab { border: 0; background: transparent; padding: 8px 12px; border-radius: 999px; cursor: pointer; font-weight: 600; color: var(--ink-soft); }
    .tab.on { background: var(--ink); color: #fff; }
    .toolbar input { flex: 1; min-width: 200px; }
    .toolbar input, .toolbar select { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; background: #fff; }
    .editor { padding: 20px; margin-bottom: 16px; }
    .editor h3 { margin: 0 0 12px; }
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0 16px; }
    .row.gap { display: flex; gap: 8px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft); padding: 14px 16px; }
    td { padding: 12px 16px; border-top: 1px solid var(--line); vertical-align: top; }
    td p { margin: 2px 0 0; }
    .small { font-size: 12px; }
    .pill { margin: 0 4px 4px 0; }
    .pill.active { background: rgba(31,75,58,.14); color: var(--ok); }
    .pill.suspended { background: rgba(155,44,44,.14); color: var(--danger); }
    .actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .btn.sm { padding: 6px 10px; font-size: 12px; }
    .btn.danger { color: var(--danger); }
    .pager { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 16px; }
  `],
})
export class AdminUsersComponent {
  private api = inject(ApiService);

  readonly roles = ['super_admin', 'tenant_owner', 'store_staff', 'customer'];

  users = signal<AdminUser[]>([]);
  summary = signal<AdminUserSummary | null>(null);
  tenants = signal<TenantApplication[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  role = signal<string>('all');
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  form = signal<any>(null);

  search = '';
  statusFilter = 'all';

  constructor() {
    this.reload();
    this.api.adminTenants({ status: 'all', per_page: 100 }).subscribe((res) => this.tenants.set(res.data));
  }

  label(role: string) {
    return role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  setRole(role: string) {
    this.role.set(role);
    this.page.set(1);
    this.reload();
  }

  go(page: number) {
    this.page.set(page);
    this.reload();
  }

  reload() {
    this.loading.set(true);
    const params: Record<string, string | number> = { page: this.page(), role: this.role(), status: this.statusFilter };
    if (this.search.trim()) params['q'] = this.search.trim();

    this.api.adminUsers(params).subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.summary.set(res.summary);
        this.lastPage.set(res.meta?.last_page ?? 1);
        this.total.set(res.meta?.total ?? res.data.length);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load users.');
        this.loading.set(false);
      },
    });
  }

  startCreate() {
    this.form.set({ name: '', email: '', phone: '', status: 'active', password: '', role: 'customer', tenant_id: null });
  }

  startEdit(user: AdminUser) {
    this.form.set({ id: user.id, name: user.name, email: user.email, phone: user.phone ?? '', status: user.status, password: '' });
  }

  save() {
    const f = this.form();
    if (!f) return;
    this.busy.set(true);
    this.error.set('');

    const payload: Record<string, unknown> = { name: f.name, email: f.email, phone: f.phone || null, status: f.status };
    if (f.password) payload['password'] = f.password;

    const request = f.id
      ? this.api.updateAdminUser(f.id, payload)
      : this.api.createAdminUser({ ...payload, password: f.password, role: f.role, tenant_id: f.tenant_id });

    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.form.set(null);
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(this.messageFrom(e));
      },
    });
  }

  toggleStatus(user: AdminUser) {
    const status = user.status === 'active' ? 'suspended' : 'active';
    this.api.updateAdminUser(user.id, { status }).subscribe({
      next: () => this.reload(),
      error: (e) => this.error.set(this.messageFrom(e)),
    });
  }

  remove(user: AdminUser) {
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    this.api.deleteAdminUser(user.id).subscribe({
      next: () => this.reload(),
      error: (e) => this.error.set(this.messageFrom(e)),
    });
  }

  private messageFrom(e: any): string {
    const payload = e?.error;
    const fields = payload?.errors || payload?.error?.fields;
    const first = fields ? (Object.values(fields).flat()[0] as string) : null;
    return first || payload?.message || payload?.error?.message || 'Something went wrong.';
  }
}
