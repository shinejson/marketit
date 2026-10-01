import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import {
  AdminRoleDefinition,
  AdminUser,
  AdminUserSummary,
  PermissionGroup,
  TenantApplication,
} from '../../core/models';

type UserRoleAssignment = { role: string; tenant_id: number | null; store_id?: number | null; department?: string | null };
type UserEditor = {
  id?: number;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'suspended';
  password: string;
  roles: UserRoleAssignment[];
};
type RoleEditor = {
  id?: number;
  key: string;
  name: string;
  description: string;
  permissions: string[];
};

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, DatePipe, DecimalPipe, TitleCasePipe],
  template: `
    <header class="head">
      <div>
        <p class="eyebrow">Access control</p>
        <h1>Users</h1>
        <p class="muted">Manage accounts, role assignments, and the permissions behind every role.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" type="button" (click)="openRolesModal()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-3v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 7 14.8a1.7 1.7 0 0 0-1.5-1H5.4v-3h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.1h3v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v3h-.1a1.7 1.7 0 0 0-1.5 1.2Z"/></svg>
          Roles & permissions
        </button>
        <button class="btn accent" type="button" (click)="startCreate()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          New user
        </button>
      </div>
    </header>

    @if (summary(); as s) {
      <div class="grid kpis">
        <div class="card kpi"><p class="muted label">Total users</p><strong>{{ s.total | number }}</strong></div>
        <div class="card kpi"><p class="muted label">Active</p><strong>{{ s.active | number }}</strong></div>
        <div class="card kpi"><p class="muted label">Suspended</p><strong>{{ s.suspended | number }}</strong></div>
        @for (role of roleDefinitions(); track role.id) {
          <div class="card kpi"><p class="muted label">{{ role.name }}</p><strong>{{ s.by_role[role.key] || 0 | number }}</strong></div>
        }
      </div>
    }

    <div class="toolbar" aria-label="User filters">
      <div class="tabs">
        <button type="button" class="tab" [class.on]="role() === 'all'" (click)="setRole('all')">All roles</button>
        @for (r of roleDefinitions(); track r.id) {
          <button type="button" class="tab" [class.on]="role() === r.key" (click)="setRole(r.key)">{{ r.name }}</button>
        }
      </div>
      <select [(ngModel)]="statusFilter" (change)="reload()" aria-label="Filter by account status">
        <option value="all">Any status</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </select>
      <input [(ngModel)]="search" (keyup.enter)="reload()" placeholder="Search name, email, phone…" aria-label="Search users" />
      <button class="btn ghost search-btn" type="button" (click)="reload()">Search</button>
    </div>

    @if (error()) { <p class="err" role="alert">{{ error() }}</p> }

    @if (loading()) {
      <div class="skeleton" style="height:180px; margin-top:12px"></div>
    } @else if (!users().length) {
      <div class="empty card">No users match these filters.</div>
    } @else {
      <div class="card table-wrap">
        <table>
          <thead>
            <tr><th>User</th><th>Roles</th><th>Status</th><th>Last login</th><th>Joined</th><th><span class="sr-only">Actions</span></th></tr>
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
                    <span class="pill">{{ r.role_name || roleName(r.role) }}@if (r.tenant) { · {{ r.tenant }} }</span>
                  }
                </td>
                <td><span class="pill" [class]="'pill ' + u.status">{{ u.status | titlecase }}</span></td>
                <td class="muted small">{{ u.last_login_at ? (u.last_login_at | date: 'MMM d, y') : 'Never' }}</td>
                <td class="muted small">{{ u.created_at | date: 'MMM d, y' }}</td>
                <td class="actions">
                  <button class="icon-btn" type="button" (click)="startEdit(u)" title="Edit {{ u.name }}" [attr.aria-label]="'Edit ' + u.name">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.7 4.3 5 5M4 20l4.3-1 11.5-11.5a2.1 2.1 0 0 0-3-3L5.3 16 4 20Z"/></svg>
                  </button>
                  <button class="icon-btn" type="button" (click)="toggleStatus(u)" [title]="u.status === 'active' ? 'Suspend ' + u.name : 'Activate ' + u.name" [attr.aria-label]="u.status === 'active' ? 'Suspend ' + u.name : 'Activate ' + u.name">
                    @if (u.status === 'active') {
                      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h7"/></svg>
                    } @else {
                      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/></svg>
                    }
                  </button>
                  <button class="icon-btn danger" type="button" (click)="remove(u)" title="Delete {{ u.name }}" [attr.aria-label]="'Delete ' + u.name">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l.8 13h8.4L17 7M10 11v5M14 11v5"/></svg>
                  </button>
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

    @if (form(); as f) {
      <div class="modal-backdrop" (click)="closeUserModal()">
        <section class="modal-card user-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <div>
              <p class="eyebrow">{{ f.id ? 'Account details' : 'New account' }}</p>
              <h2 id="user-modal-title">{{ f.id ? 'Edit user' : 'Create user' }}</h2>
              <p class="muted">{{ f.id ? 'Update the account and its role assignments.' : 'Set up an account and choose every role it needs.' }}</p>
            </div>
            <button class="icon-btn close" type="button" (click)="closeUserModal()" title="Close" aria-label="Close user form">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
            </button>
          </header>

          <form (ngSubmit)="save()">
            <div class="cols">
              <div class="field"><label for="user-name">Name</label><input id="user-name" [(ngModel)]="f.name" name="name" required /></div>
              <div class="field"><label for="user-email">Email</label><input id="user-email" [(ngModel)]="f.email" name="email" type="email" required /></div>
              <div class="field"><label for="user-phone">Phone</label><input id="user-phone" [(ngModel)]="f.phone" name="phone" /></div>
              <div class="field">
                <label for="user-status">Status</label>
                <select id="user-status" [(ngModel)]="f.status" name="status">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div class="field full">
                <label for="user-password">{{ f.id ? 'New password (leave blank to keep current password)' : 'Password' }}</label>
                <input id="user-password" [(ngModel)]="f.password" name="password" type="password" autocomplete="new-password" [required]="!f.id" minlength="8" />
              </div>
            </div>

            <section class="assignment-section" aria-labelledby="role-assignment-title">
              <div class="section-head">
                <div>
                  <h3 id="role-assignment-title">Role assignments</h3>
                  <p class="muted small">A person can hold more than one role. Tenant roles must be attached to a tenant.</p>
                </div>
                <button class="btn ghost small-btn" type="button" (click)="addAssignment()">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                  Add role
                </button>
              </div>

              @for (assignment of f.roles; track $index) {
                <div class="role-assignment">
                  <div class="field assignment-role">
                    <label [for]="'role-' + $index">Role</label>
                    <select [id]="'role-' + $index" [(ngModel)]="assignment.role" [name]="'role-' + $index" (ngModelChange)="onAssignmentRoleChange(assignment)">
                      @for (option of roleDefinitions(); track option.id) {
                        <option [value]="option.key">{{ option.name }}</option>
                      }
                    </select>
                  </div>
                  @if (roleNeedsTenant(assignment.role)) {
                    <div class="field assignment-tenant">
                      <label [for]="'tenant-' + $index">Tenant</label>
                      <select [id]="'tenant-' + $index" [(ngModel)]="assignment.tenant_id" [name]="'tenant-' + $index" required>
                        <option [ngValue]="null">Select a tenant…</option>
                        @for (t of tenants(); track t.id) { <option [ngValue]="t.id">{{ t.business_name || t.name }}</option> }
                      </select>
                    </div>
                  } @else {
                    <div class="assignment-note muted small">This is a platform-wide role.</div>
                  }
                  <button class="icon-btn danger remove-role" type="button" (click)="removeAssignment($index)" [disabled]="f.roles.length === 1" title="Remove role" aria-label="Remove role assignment">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l.8 13h8.4L17 7M10 11v5M14 11v5"/></svg>
                  </button>
                </div>
              }
            </section>

            @if (error()) { <p class="err modal-error" role="alert">{{ error() }}</p> }
            <footer class="modal-footer">
              <button class="btn ghost" type="button" (click)="closeUserModal()">Cancel</button>
              <button class="btn accent" type="submit" [disabled]="busy()">{{ busy() ? 'Saving…' : (f.id ? 'Save changes' : 'Create user') }}</button>
            </footer>
          </form>
        </section>
      </div>
    }

    @if (rolesModal()) {
      <div class="modal-backdrop" (click)="closeRolesModal()">
        <section class="modal-card roles-modal" role="dialog" aria-modal="true" aria-labelledby="roles-modal-title" (click)="$event.stopPropagation()">
          @if (roleForm(); as rf) {
            <header class="modal-head compact">
              <div class="head-with-back">
                <button class="icon-btn" type="button" (click)="roleForm.set(null)" title="Back to roles" aria-label="Back to roles">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>
                </button>
                <div>
                  <p class="eyebrow">Role editor</p>
                  <h2 id="roles-modal-title">{{ rf.id ? 'Edit role' : 'Create role' }}</h2>
                </div>
              </div>
              <button class="icon-btn close" type="button" (click)="closeRolesModal()" title="Close" aria-label="Close role editor">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
              </button>
            </header>

            <form (ngSubmit)="saveRole()">
              <div class="cols role-details">
                <div class="field"><label for="role-name">Role name</label><input id="role-name" [(ngModel)]="rf.name" name="role-name" required maxlength="100" placeholder="e.g. Support manager" /></div>
                <div class="field">
                  <label for="role-key">Role key</label>
                  <input id="role-key" [(ngModel)]="rf.key" name="role-key" [readOnly]="!!rf.id" required maxlength="50" pattern="[a-z][a-z0-9_]*" placeholder="e.g. support_manager" />
                  <small class="muted">{{ rf.id ? 'Keys are fixed once a role is assigned.' : 'Lowercase letters, numbers, and underscores only.' }}</small>
                </div>
                <div class="field full"><label for="role-description">Description <span class="muted">(optional)</span></label><textarea id="role-description" [(ngModel)]="rf.description" name="role-description" rows="2" maxlength="1000" placeholder="What is this role for?"></textarea></div>
              </div>

              <section class="permissions" aria-labelledby="permission-list-title">
                <div class="section-head">
                  <div>
                    <h3 id="permission-list-title">Permissions</h3>
                    <p class="muted small">Choose exactly what members of this role are allowed to do.</p>
                  </div>
                  <span class="permission-count">{{ rf.permissions.length }} selected</span>
                </div>
                @for (group of permissionGroups(); track group.key) {
                  <fieldset class="permission-group">
                    <legend>{{ group.label }}</legend>
                    <div class="permission-list">
                      @for (permission of group.permissions; track permission.key) {
                        <label class="permission-option" [class.selected]="roleHasPermission(permission.key)">
                          <input type="checkbox" [checked]="roleHasPermission(permission.key)" (change)="toggleRolePermission(permission.key, $any($event.target).checked)" />
                          <span><strong>{{ permission.label }}</strong><small>{{ permission.description }}</small></span>
                        </label>
                      }
                    </div>
                  </fieldset>
                }
              </section>

              @if (error()) { <p class="err modal-error" role="alert">{{ error() }}</p> }
              <footer class="modal-footer">
                <button class="btn ghost" type="button" (click)="roleForm.set(null)">Cancel</button>
                <button class="btn accent" type="submit" [disabled]="roleBusy()">{{ roleBusy() ? 'Saving…' : (rf.id ? 'Save role' : 'Create role') }}</button>
              </footer>
            </form>
          } @else {
            <header class="modal-head compact">
              <div>
                <p class="eyebrow">Access control</p>
                <h2 id="roles-modal-title">Roles & permissions</h2>
                <p class="muted">Permissions are shared by everyone assigned to the same role.</p>
              </div>
              <div class="modal-actions">
                <button class="btn accent" type="button" (click)="startCreateRole()">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                  Create role
                </button>
                <button class="icon-btn close" type="button" (click)="closeRolesModal()" title="Close" aria-label="Close roles and permissions">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
                </button>
              </div>
            </header>

            @if (error()) { <p class="err modal-error" role="alert">{{ error() }}</p> }
            @if (roleLoading()) {
              <div class="skeleton" style="height:200px"></div>
            } @else if (!roleDefinitions().length) {
              <div class="empty card">No roles have been created yet.</div>
            } @else {
              <div class="roles-list">
                @for (item of roleDefinitions(); track item.id) {
                  <article class="role-card">
                    <div class="role-card-copy">
                      <div class="role-title">
                        <h3>{{ item.name }}</h3>
                        @if (item.is_system) { <span class="system-badge">System</span> }
                      </div>
                      <p class="role-key">{{ item.key }}</p>
                      <p class="muted">{{ item.description || 'No description provided.' }}</p>
                      <div class="role-meta">
                        <span>{{ item.permissions.length }} permission{{ item.permissions.length === 1 ? '' : 's' }}</span>
                        <span aria-hidden="true">•</span>
                        <span>{{ item.users_count }} assigned user{{ item.users_count === 1 ? '' : 's' }}</span>
                      </div>
                    </div>
                    <div class="actions role-actions">
                      <button class="icon-btn" type="button" (click)="startEditRole(item)" title="Edit {{ item.name }}" [attr.aria-label]="'Edit ' + item.name">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.7 4.3 5 5M4 20l4.3-1 11.5-11.5a2.1 2.1 0 0 0-3-3L5.3 16 4 20Z"/></svg>
                      </button>
                      <button class="icon-btn danger" type="button" (click)="removeRole(item)" [disabled]="item.users_count > 0" [title]="item.users_count > 0 ? 'Reassign users before deleting this role' : 'Delete ' + item.name" [attr.aria-label]="'Delete ' + item.name">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l.8 13h8.4L17 7M10 11v5M14 11v5"/></svg>
                      </button>
                    </div>
                  </article>
                }
              </div>
            }
          }
        </section>
      </div>
    }
  `,
  styles: [`
    :host { display: block; max-width: 1440px; margin: 0 auto; }
    .head, .modal-head, .section-head, .pager { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .head { align-items: flex-end; flex-wrap: wrap; }
    .head h1, .modal-head h2 { margin: 0; }
    .head > div > .muted, .modal-head > div > .muted { margin: 5px 0 0; }
    .eyebrow { margin: 0 0 5px; color: var(--accent); font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    .page-actions, .modal-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .page-actions svg, .btn svg, .small-btn svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
    .kpis { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); margin: 18px 0; }
    .kpi { padding: 12px 14px; min-height: 83px; }
    .kpi strong { font-family: Fraunces, Georgia, serif; font-size: 22px; }
    .label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 4px; }
    .toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
    .tabs { display: flex; gap: 4px; background: var(--paper-2); padding: 4px; border-radius: 999px; flex-wrap: wrap; }
    .tab { border: 0; background: transparent; padding: 8px 12px; border-radius: 999px; cursor: pointer; font-weight: 600; color: var(--ink-soft); }
    .tab.on { background: var(--ink); color: var(--card); }
    .toolbar input { flex: 1; min-width: 200px; }
    .toolbar input, .toolbar select { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; background: var(--card); color: var(--ink); }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; min-width: 780px; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft); padding: 14px 16px; }
    td { padding: 12px 16px; border-top: 1px solid var(--line); vertical-align: top; }
    td p { margin: 2px 0 0; }
    .small { font-size: 12px; }
    .pill { margin: 0 4px 4px 0; }
    .pill.active { background: rgba(31,75,58,.14); color: var(--ok); }
    .pill.suspended { background: rgba(155,44,44,.14); color: var(--danger); }
    .actions { display: flex; justify-content: flex-end; gap: 6px; flex-wrap: wrap; }
    .icon-btn { display: inline-grid; place-items: center; flex: 0 0 auto; width: 34px; height: 34px; padding: 0; border: 1px solid var(--line); border-radius: 10px; background: transparent; color: var(--ink); cursor: pointer; }
    .icon-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent) 7%, transparent); }
    .icon-btn:focus-visible, .tab:focus-visible, .permission-option:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }
    .icon-btn:disabled { cursor: not-allowed; opacity: .38; }
    .icon-btn.danger:hover:not(:disabled) { border-color: var(--danger); color: var(--danger); background: color-mix(in srgb, var(--danger) 8%, transparent); }
    .icon-btn svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .pager { margin-top: 16px; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

    .modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 24px; overflow-y: auto; background: rgba(21, 19, 15, .58); backdrop-filter: blur(3px); }
    .modal-card { width: min(720px, 100%); max-height: calc(100vh - 48px); overflow: auto; padding: 24px; border: 1px solid var(--line); border-radius: 20px; background: var(--card); box-shadow: 0 24px 72px rgba(0,0,0,.28); }
    .roles-modal { width: min(860px, 100%); }
    .modal-head { align-items: flex-start; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
    .modal-head.compact { padding-bottom: 16px; }
    .modal-head h2 { font-size: 25px; }
    .modal-head .close { margin-left: auto; }
    .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; margin-top: 18px; }
    .full { grid-column: 1 / -1; }
    textarea { resize: vertical; min-height: 72px; }
    .field small { font-size: 11px; line-height: 1.35; }
    .assignment-section, .permissions { margin-top: 8px; padding: 18px 0; border-top: 1px solid var(--line); }
    .section-head { align-items: flex-start; margin-bottom: 12px; }
    .section-head h3 { margin: 0; font-size: 18px; }
    .section-head p { margin: 4px 0 0; }
    .small-btn { padding: 8px 12px; font-size: 12px; }
    .role-assignment { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(190px, 1fr) 34px; align-items: end; gap: 10px; margin: 8px 0; padding: 12px; border: 1px solid var(--line); border-radius: 14px; background: var(--paper-2); }
    .role-assignment .field { margin: 0; }
    .assignment-note { align-self: center; padding: 11px 0; }
    .remove-role { margin-bottom: 1px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 18px; border-top: 1px solid var(--line); }
    .modal-error { margin: 0 0 12px; }
    .head-with-back { display: flex; align-items: center; gap: 10px; }
    .role-details { margin-top: 18px; }
    .permission-count { display: inline-flex; align-items: center; min-height: 28px; padding: 4px 9px; border-radius: 999px; background: var(--paper-2); color: var(--ink-soft); font-size: 11px; font-weight: 700; white-space: nowrap; }
    .permission-group { min-inline-size: 0; margin: 12px 0; padding: 12px; border: 1px solid var(--line); border-radius: 14px; }
    .permission-group legend { padding: 0 5px; color: var(--ink-soft); font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
    .permission-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .permission-option { display: flex; gap: 10px; align-items: flex-start; min-height: 66px; padding: 10px; border: 1px solid transparent; border-radius: 10px; cursor: pointer; }
    .permission-option:hover, .permission-option.selected { border-color: var(--line); background: var(--paper-2); }
    .permission-option input { width: 16px; height: 16px; margin: 2px 0 0; accent-color: var(--accent); }
    .permission-option span { display: grid; gap: 3px; }
    .permission-option strong { font-size: 12px; }
    .permission-option small { color: var(--ink-soft); font-size: 11px; line-height: 1.3; }
    .roles-list { display: grid; gap: 10px; margin-top: 18px; }
    .role-card { display: flex; justify-content: space-between; gap: 16px; padding: 16px; border: 1px solid var(--line); border-radius: 16px; background: var(--paper-2); }
    .role-card h3, .role-card p { margin: 0; }
    .role-card-copy { min-width: 0; }
    .role-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .role-title h3 { font-size: 17px; }
    .system-badge { padding: 3px 7px; border: 1px solid var(--line); border-radius: 999px; color: var(--ink-soft); font-size: 10px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
    .role-key { margin-top: 3px !important; color: var(--accent); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
    .role-card-copy > .muted { margin-top: 8px; font-size: 13px; }
    .role-meta { display: flex; gap: 7px; margin-top: 10px; color: var(--ink-soft); font-size: 11px; font-weight: 600; }
    .role-actions { align-self: flex-start; }

    @media (max-width: 700px) {
      .modal-backdrop { padding: 12px; place-items: start center; }
      .modal-card { max-height: none; min-height: calc(100vh - 24px); padding: 18px; border-radius: 16px; }
      .cols, .permission-list { grid-template-columns: 1fr; }
      .role-assignment { grid-template-columns: 1fr 34px; }
      .assignment-tenant, .assignment-note { grid-column: 1; }
      .remove-role { grid-column: 2; grid-row: 1; }
      .role-card { align-items: flex-start; }
      .head { align-items: flex-start; }
      .page-actions { width: 100%; }
      .page-actions .btn { flex: 1; }
      .pager { align-items: center; }
      .search-btn { display: none; }
    }
  `],
})
export class AdminUsersComponent {
  private api = inject(ApiService);

  users = signal<AdminUser[]>([]);
  summary = signal<AdminUserSummary | null>(null);
  tenants = signal<TenantApplication[]>([]);
  roleDefinitions = signal<AdminRoleDefinition[]>([]);
  permissionGroups = signal<PermissionGroup[]>([]);
  loading = signal(true);
  busy = signal(false);
  roleBusy = signal(false);
  roleLoading = signal(false);
  error = signal('');
  role = signal<string>('all');
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  form = signal<UserEditor | null>(null);
  rolesModal = signal(false);
  roleForm = signal<RoleEditor | null>(null);

  search = '';
  statusFilter = 'all';

  constructor() {
    this.reload();
    this.loadRoles();
    this.api.adminTenants({ status: 'all', per_page: 100 }).subscribe({
      next: (res) => this.tenants.set(res.data),
      error: () => this.error.set('Could not load tenants for role assignments.'),
    });
  }

  roleName(key: string): string {
    return this.roleDefinitions().find((role) => role.key === key)?.name || this.label(key);
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
      error: (e) => {
        this.error.set(this.messageFrom(e, 'Could not load users.'));
        this.loading.set(false);
      },
    });
  }

  loadRoles() {
    this.roleLoading.set(true);
    this.api.adminRoles().subscribe({
      next: (res) => {
        this.roleDefinitions.set(res.data);
        this.permissionGroups.set(res.meta.permission_groups);
        if (this.role() !== 'all' && !res.data.some((item) => item.key === this.role())) {
          this.role.set('all');
          this.reload();
        }
        this.roleLoading.set(false);
      },
      error: (e) => {
        this.error.set(this.messageFrom(e, 'Could not load roles.'));
        this.roleLoading.set(false);
      },
    });
  }

  startCreate() {
    this.error.set('');
    this.form.set({
      name: '',
      email: '',
      phone: '',
      status: 'active',
      password: '',
      roles: [{ role: this.defaultRoleKey(), tenant_id: null }],
    });
  }

  startEdit(user: AdminUser) {
    this.error.set('');
    this.form.set({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      status: user.status,
      password: '',
      roles: user.roles.length
        ? user.roles.map((assignment) => ({
            role: assignment.role,
            tenant_id: assignment.tenant_id,
            store_id: assignment.store_id,
            department: assignment.department,
          }))
        : [{ role: this.defaultRoleKey(), tenant_id: null }],
    });
  }

  closeUserModal() {
    if (!this.busy()) this.form.set(null);
  }

  addAssignment() {
    const editor = this.form();
    if (!editor) return;
    editor.roles.push({ role: this.defaultRoleKey(), tenant_id: null });
    this.form.set({ ...editor, roles: [...editor.roles] });
  }

  removeAssignment(index: number) {
    const editor = this.form();
    if (!editor || editor.roles.length === 1) return;
    editor.roles.splice(index, 1);
    this.form.set({ ...editor, roles: [...editor.roles] });
  }

  onAssignmentRoleChange(assignment: UserRoleAssignment) {
    if (!this.roleNeedsTenant(assignment.role)) {
      assignment.tenant_id = null;
      assignment.store_id = null;
      assignment.department = null;
    }
  }

  roleNeedsTenant(role: string): boolean {
    return role === 'tenant_owner' || role === 'store_staff';
  }

  save() {
    const editor = this.form();
    if (!editor || this.busy()) return;

    this.busy.set(true);
    this.error.set('');
    const payload: Record<string, unknown> = {
      name: editor.name,
      email: editor.email,
      phone: editor.phone || null,
      status: editor.status,
    };
    if (editor.password) payload['password'] = editor.password;
    const assignments = editor.roles.map((assignment) => ({
      role: assignment.role,
      tenant_id: this.roleNeedsTenant(assignment.role) ? assignment.tenant_id : null,
      // Preserve tenant staff metadata while editing an existing account. The
      // dedicated tenant staff screen owns changing these two fields.
      store_id: this.roleNeedsTenant(assignment.role) ? assignment.store_id ?? null : null,
      department: this.roleNeedsTenant(assignment.role) ? assignment.department ?? null : null,
    }));

    if (editor.id) {
      this.api.updateAdminUser(editor.id, payload).subscribe({
        next: () => this.syncEditedUserRoles(editor.id!, assignments),
        error: (e) => this.userSaveFailed(e),
      });
      return;
    }

    this.api.createAdminUser({ ...payload, password: editor.password, roles: assignments }).subscribe({
      next: () => this.userSaveComplete(),
      error: (e) => this.userSaveFailed(e),
    });
  }

  toggleStatus(user: AdminUser) {
    const status = user.status === 'active' ? 'suspended' : 'active';
    this.error.set('');
    this.api.updateAdminUser(user.id, { status }).subscribe({
      next: () => this.reload(),
      error: (e) => this.error.set(this.messageFrom(e)),
    });
  }

  remove(user: AdminUser) {
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    this.error.set('');
    this.api.deleteAdminUser(user.id).subscribe({
      next: () => this.reload(),
      error: (e) => this.error.set(this.messageFrom(e, 'Cannot delete this user.')),
    });
  }

  openRolesModal() {
    this.error.set('');
    this.rolesModal.set(true);
    this.roleForm.set(null);
    this.loadRoles();
  }

  closeRolesModal() {
    if (!this.roleBusy()) {
      this.rolesModal.set(false);
      this.roleForm.set(null);
    }
  }

  startCreateRole() {
    this.error.set('');
    this.roleForm.set({ key: '', name: '', description: '', permissions: [] });
  }

  startEditRole(role: AdminRoleDefinition) {
    this.error.set('');
    this.roleForm.set({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description || '',
      permissions: [...role.permissions],
    });
  }

  roleHasPermission(key: string): boolean {
    return this.roleForm()?.permissions.includes(key) ?? false;
  }

  toggleRolePermission(key: string, checked: boolean) {
    const editor = this.roleForm();
    if (!editor) return;
    const permissions = checked
      ? [...new Set([...editor.permissions, key])]
      : editor.permissions.filter((permission) => permission !== key);
    this.roleForm.set({ ...editor, permissions });
  }

  saveRole() {
    const editor = this.roleForm();
    if (!editor || this.roleBusy()) return;

    this.roleBusy.set(true);
    this.error.set('');
    const key = editor.key.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    const payload = {
      name: editor.name.trim(),
      description: editor.description.trim() || null,
      permissions: editor.permissions,
    };
    const request = editor.id
      ? this.api.updateAdminRole(editor.id, payload)
      : this.api.createAdminRole({ ...payload, key });

    request.subscribe({
      next: () => {
        this.roleBusy.set(false);
        this.roleForm.set(null);
        this.loadRoles();
        this.reload();
      },
      error: (e) => {
        this.roleBusy.set(false);
        this.error.set(this.messageFrom(e, 'Could not save this role.'));
      },
    });
  }

  removeRole(role: AdminRoleDefinition) {
    if (role.users_count > 0 || !confirm(`Delete the ${role.name} role? This cannot be undone.`)) return;
    this.error.set('');
    this.api.deleteAdminRole(role.id).subscribe({
      next: () => {
        this.loadRoles();
        this.reload();
      },
      error: (e) => this.error.set(this.messageFrom(e, 'Could not delete this role.')),
    });
  }

  private syncEditedUserRoles(userId: number, assignments: UserRoleAssignment[]) {
    this.api.syncAdminUserRoles(userId, assignments).subscribe({
      next: () => this.userSaveComplete(),
      error: (e) => this.userSaveFailed(e),
    });
  }

  private userSaveComplete() {
    this.busy.set(false);
    this.form.set(null);
    this.reload();
  }

  private userSaveFailed(error: any) {
    this.busy.set(false);
    this.error.set(this.messageFrom(error, 'Could not save this user.'));
  }

  private defaultRoleKey(): string {
    return this.roleDefinitions().find((role) => role.key === 'customer')?.key || this.roleDefinitions()[0]?.key || 'customer';
  }

  private label(role: string): string {
    return role.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private messageFrom(error: any, fallback = 'Something went wrong.'): string {
    const payload = error?.error;
    const fields = payload?.errors || payload?.error?.fields;
    const first = fields ? (Object.values(fields).flat()[0] as string) : null;
    return first || payload?.message || payload?.error?.message || fallback;
  }
}
