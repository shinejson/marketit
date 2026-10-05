import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import {
  PermissionGroup,
  TenantAccessLevel,
  TenantAccessLevelOption,
  TenantCustomer,
  TenantCustomerStats,
  TenantRoleSummary,
  TenantSystemUser,
  TenantSystemUserStats,
  TenantUserStatus,
} from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type Tab = 'system' | 'customers' | 'roles';
type CustomerFilter = '' | 'active' | 'blocked' | 'repeat' | 'social' | 'password';

/** Draft state for the invite / edit-system-user drawer. */
interface UserEditor {
  mode: 'create' | 'edit';
  id: number | null;
  name: string;
  email: string;
  phone: string;
  title: string;
  accessLevel: TenantAccessLevel;
  tenantRoleId: number | null;
  department: string;
  storeId: number | null;
  status: TenantUserStatus;
  permissions: string[];
  isOwnerRecord: boolean;
  isSelf: boolean;
}

/** Draft state for the role editor drawer. */
interface RoleEditor {
  id: number | null;
  key: string;
  name: string;
  description: string;
  department: string;
  permissions: string[];
  isSystem: boolean;
}

const STATUS_LABELS: Record<TenantUserStatus, string> = {
  active: 'Active',
  invited: 'Invited',
  suspended: 'Suspended',
};

const PROVIDER_GLYPHS: Record<string, string> = {
  password: '🔑',
  google: 'G',
  facebook: 'f',
  apple: '',
  github: '⌥',
};

/**
 * Access control for a tenant: who works here, what each person may do, and
 * which shoppers buy from this tenant.
 *
 * The page is deliberately one workspace with three tabs, because the three
 * objects are edited together: an admin invites a *system user*, assigns a
 * *role*, ticks any extra *permissions*, and separately curates the *customer*
 * directory (where social sign-in shows up).
 */
@Component({
  selector: 'app-seller-users',
  imports: [FormsModule, DatePipe, MoneyPipe, TitleCasePipe, RouterLink],
  template: `
    <div class="users-shell">
      <header class="page-head">
        <div>
          <div class="breadcrumbs"><a routerLink="/tenant">Tenant</a><span>/</span><span>Administration</span></div>
          <p class="eyebrow">Access control</p>
          <h1>Users &amp; permissions</h1>
          <p class="intro">
            Invite the staff who run this business, give each person a role with exactly the permissions they
            need, and keep an eye on the customers buying from your stores — including how they sign in.
          </p>
        </div>
        <div class="head-actions">
          <button class="btn ghost" type="button" (click)="exportCsv()">⤓ Export CSV</button>
          <button class="btn ghost" type="button" (click)="refresh()" [disabled]="busy()">
            <span class="spin-icon" [class.spinning]="busy()">⟳</span> Refresh
          </button>
          @if (canManageUsers()) {
            <button class="btn primary" type="button" (click)="openInvite()">+ Invite user</button>
          }
        </div>
      </header>

      @if (toast()) { <div class="toast" role="status"><span>✓</span>{{ toast() }}</div> }
      @if (error()) {
        <div class="error-banner"><span>!</span><p>{{ error() }}</p><button type="button" (click)="error.set('')">Dismiss</button></div>
      }
      @if (tempPassword(); as temp) {
        <div class="credential-banner">
          <span>🔐</span>
          <div>
            <strong>Temporary password for {{ temp.email }}</strong>
            <p>Share it over a secure channel — it is shown once and should be changed at first sign-in.</p>
          </div>
          <code>{{ temp.password }}</code>
          <button class="btn ghost" type="button" (click)="copyPassword(temp.password)">Copy</button>
          <button class="icon-btn" type="button" (click)="tempPassword.set(null)" aria-label="Dismiss">×</button>
        </div>
      }

      <nav class="status-tabs" aria-label="Access control sections">
        <button type="button" [class.active]="tab() === 'system'" (click)="setTab('system')">
          System users <span class="tab-count">{{ userStats()?.total ?? users().length }}</span>
        </button>
        <button type="button" [class.active]="tab() === 'customers'" (click)="setTab('customers')">
          Customers <span class="tab-count">{{ customerStats()?.total ?? 0 }}</span>
        </button>
        <button type="button" [class.active]="tab() === 'roles'" (click)="setTab('roles')">
          Roles &amp; permissions <span class="tab-count">{{ roles().length }}</span>
        </button>
      </nav>

      <!-- ------------------------------------------------------ system users -->
      @if (tab() === 'system') {
        <section class="kpi-grid">
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon slate">👥</span></div>
            <p>System users</p><h2>{{ userStats()?.total ?? 0 }}</h2>
            <small>{{ userStats()?.owners ?? 0 }} owner(s) · {{ roles().length }} roles</small>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon green">✓</span></div>
            <p>Active</p><h2>{{ userStats()?.active ?? 0 }}</h2>
            <small>Can sign into the console now</small>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon amber">✉</span></div>
            <p>Invited</p><h2>{{ userStats()?.invited ?? 0 }}</h2>
            <small>Waiting for a first sign-in</small>
          </article>
          <article class="metric-card" [class.urgent]="(userStats()?.suspended ?? 0) > 0">
            <div class="metric-top"><span class="metric-icon rose">⦸</span></div>
            <p>Suspended</p><h2>{{ userStats()?.suspended ?? 0 }}</h2>
            <small>Blocked without losing history</small>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon plum">⚙</span></div>
            <p>Custom permissions</p><h2>{{ userStats()?.customised ?? 0 }}</h2>
            <small>People who differ from their role</small>
          </article>
        </section>

        <section class="table-panel panel">
          <div class="table-toolbar">
            <div class="search-box">
              <span>⌕</span>
              <input type="search" placeholder="Search name or email" [(ngModel)]="userSearch" (ngModelChange)="onUserSearch($event)" />
              @if (userSearch) { <button type="button" class="clear-btn" (click)="clearUserSearch()" aria-label="Clear search">×</button> }
            </div>
            <select [(ngModel)]="roleFilter" (ngModelChange)="loadUsers()" aria-label="Filter by role">
              <option value="">All roles</option>
              @for (role of roles(); track role.id) { <option [value]="role.key">{{ role.name }}</option> }
            </select>
            <select [(ngModel)]="statusFilter" (ngModelChange)="loadUsers()" aria-label="Filter by status">
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="suspended">Suspended</option>
            </select>
            <select [(ngModel)]="departmentFilter" (ngModelChange)="loadUsers()" aria-label="Filter by department">
              <option value="">All departments</option>
              @for (dept of departments(); track dept) { <option [value]="dept">{{ dept | titlecase }}</option> }
            </select>
            @if (userFiltersApplied()) {
              <button class="link-btn" type="button" (click)="clearUserFilters()">Clear filters</button>
            }
          </div>

          @if (loadingUsers() && !users().length) {
            <div class="empty-state"><div class="empty-glyph">⏳</div><h3>Loading team…</h3></div>
          } @else if (!users().length) {
            <div class="empty-state">
              <div class="empty-glyph">👥</div>
              <h3>No system users match</h3>
              <p>Invite a colleague and give them a role — they will receive a temporary password to sign in with.</p>
              @if (canManageUsers()) { <button class="btn primary" type="button" (click)="openInvite()">+ Invite user</button> }
            </div>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Access</th>
                    <th>Role</th>
                    <th>Permissions</th>
                    <th>Assignment</th>
                    <th>Status</th>
                    <th>Last sign-in</th>
                    <th class="right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (user of users(); track user.id) {
                    <tr>
                      <td>
                        <div class="person">
                          <span class="avatar" [class.owner]="user.is_owner">{{ initials(user.name) }}</span>
                          <div>
                            <strong>{{ user.name }}</strong>
                            <small>{{ user.email }}</small>
                            @if (user.title) { <small class="muted-title">{{ user.title }}</small> }
                          </div>
                        </div>
                      </td>
                      <td><span class="pill" [class.owner]="user.is_owner">{{ user.is_owner ? 'Owner' : 'Staff' }}</span></td>
                      <td>
                        <strong>{{ user.tenant_role?.name || '—' }}</strong>
                        @if (user.custom_permissions) { <small class="flag">Customised</small> }
                      </td>
                      <td>
                        <div class="perm-cell">
                          <b>{{ user.is_owner ? 'All' : user.permissions.length }}</b>
                          <span>{{ user.is_owner ? 'unrestricted' : 'permissions' }}</span>
                        </div>
                        @if (!user.is_owner) {
                          <div class="chips">
                            @for (perm of user.permissions.slice(0, 3); track perm) {
                              <span class="chip-tag">{{ permissionLabel(perm) }}</span>
                            }
                            @if (user.permissions.length > 3) {
                              <span class="chip-tag cool">+{{ user.permissions.length - 3 }}</span>
                            }
                          </div>
                        }
                      </td>
                      <td>
                        <strong>{{ user.department ? (user.department | titlecase) : 'All departments' }}</strong>
                        <small>{{ user.store?.name || 'All stores' }}</small>
                      </td>
                      <td><span class="state-pill" [class]="user.status">{{ statusLabel(user.status) }}</span></td>
                      <td>
                        @if (user.last_login_at) {
                          <strong>{{ user.last_login_at | date: 'd MMM y' }}</strong>
                          <small>{{ user.last_login_at | date: 'HH:mm' }}</small>
                        } @else { <small>Never</small> }
                      </td>
                      <td class="right">
                        <div class="row-toolbar" (click)="$event.stopPropagation()">
                          <button class="row-action menu" type="button" (click)="toggleActionMenu('user-' + user.id)" [attr.aria-expanded]="actionMenu() === 'user-' + user.id" [attr.aria-label]="'User actions for ' + user.name" title="More actions">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
                          </button>
                          @if (actionMenu() === 'user-' + user.id) {
                            <div class="action-menu" role="menu" aria-label="User actions">
                              <button type="button" class="action-item" (click)="openEdit(user); closeActionMenu()" role="menuitem">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>
                                <span>Edit</span>
                              </button>
                              @if (!user.is_owner || (userStats()?.owners ?? 0) > 1) {
                                <button type="button" class="action-item warn" (click)="toggleStatus(user); closeActionMenu()" role="menuitem">
                                  @if (user.status === 'suspended') {
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 1 18 0 9 9 0 0 1-18 0Z"/><path d="M8 8v8"/><path d="M16 8v8"/></svg>
                                  } @else {
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14"/><path d="M16 5v14"/></svg>
                                  }
                                  <span>{{ user.status === 'suspended' ? 'Restore' : 'Suspend' }}</span>
                                </button>
                              }
                              <button type="button" class="action-item" (click)="resetPassword(user); closeActionMenu()" role="menuitem">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 1 1 10 0v3"/><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M12 15v2"/></svg>
                                <span>Reset password</span>
                              </button>
                              <button type="button" class="action-item danger" (click)="removeUser(user); closeActionMenu()" role="menuitem">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12h10l1-12"/><path d="M9 7V4h6v3"/></svg>
                                <span>Remove</span>
                              </button>
                            </div>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="table-foot">
              <span>{{ users().length }} of {{ userStats()?.total ?? users().length }} system users</span>
            </div>
          }
        </section>
      }

      <!-- --------------------------------------------------------- customers -->
      @if (tab() === 'customers') {
        <section class="kpi-grid">
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon slate">🛍</span></div>
            <p>Customers</p><h2>{{ customerStats()?.total ?? 0 }}</h2>
            <small>{{ customerStats()?.new_this_month ?? 0 }} new this month</small>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon green">↻</span></div>
            <p>Repeat buyers</p><h2>{{ customerStats()?.repeat ?? 0 }}</h2>
            <small>More than one order</small>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span class="metric-icon blue">⎆</span></div>
            <p>Social sign-in</p><h2>{{ customerStats()?.social_logins ?? 0 }}</h2>
            <small>
              @for (provider of providerCounts(); track provider.key) {
                @if (provider.count) { <span class="chip-tag">{{ provider.label }} {{ provider.count }}</span> }
              }
              @if (!socialProviderTotal()) { No linked providers yet }
            </small>
          </article>
          <article class="metric-card value">
            <div class="metric-top"><span class="metric-icon gold">◈</span></div>
            <p>Customer revenue</p><h2>{{ customerStats()?.revenue ?? 0 | money:'':'symbol':'1.0-0' }}</h2>
            <small>Avg {{ customerStats()?.average_spend ?? 0 | money:'':'symbol':'1.0-0' }} per customer</small>
          </article>
          <article class="metric-card" [class.urgent]="(customerStats()?.blocked ?? 0) > 0">
            <div class="metric-top"><span class="metric-icon rose">⦸</span></div>
            <p>Blocked</p><h2>{{ customerStats()?.blocked ?? 0 }}</h2>
            <small>Cannot buy from your stores</small>
          </article>
        </section>

        <section class="table-panel panel">
          <div class="table-toolbar">
            <div class="search-box">
              <span>⌕</span>
              <input type="search" placeholder="Search name, email or phone" [(ngModel)]="customerSearch" (ngModelChange)="onCustomerSearch($event)" />
              @if (customerSearch) { <button type="button" class="clear-btn" (click)="clearCustomerSearch()" aria-label="Clear search">×</button> }
            </div>
            <select [(ngModel)]="customerFilter" (ngModelChange)="loadCustomers(1)" aria-label="Filter customers">
              <option value="">All customers</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="repeat">Repeat buyers</option>
              <option value="social">Social sign-in</option>
              <option value="password">Password only</option>
            </select>
            <select [(ngModel)]="providerFilter" (ngModelChange)="loadCustomers(1)" aria-label="Filter by provider">
              <option value="">Any login method</option>
              @for (provider of providerCounts(); track provider.key) {
                <option [value]="provider.key">{{ provider.label }}</option>
              }
            </select>
            <select [(ngModel)]="customerSort" (ngModelChange)="loadCustomers(1)" aria-label="Sort customers">
              <option value="spend_desc">Highest spend</option>
              <option value="orders_desc">Most orders</option>
              <option value="recent_desc">Most recent order</option>
              <option value="name_asc">Name A–Z</option>
              <option value="joined_desc">Newest account</option>
            </select>
          </div>

          @if (loadingCustomers() && !customers().length) {
            <div class="empty-state"><div class="empty-glyph">⏳</div><h3>Loading customers…</h3></div>
          } @else if (!customers().length) {
            <div class="empty-state">
              <div class="empty-glyph">🛍</div>
              <h3>No customers yet</h3>
              <p>Customer accounts appear here as soon as someone places an order with one of your stores.</p>
            </div>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Signs in with</th>
                    <th class="right">Orders</th>
                    <th class="right">Spend</th>
                    <th class="right">Avg order</th>
                    <th>Last order</th>
                    <th>Segment</th>
                    <th>Status</th>
                    <th class="right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (customer of customers(); track customer.id) {
                    <tr class="clickable" (click)="openCustomer(customer)">
                      <td>
                        <div class="person">
                          <span class="avatar">{{ initials(customer.name) }}</span>
                          <div>
                            <strong>{{ customer.name }}</strong>
                            <small>{{ customer.email }}</small>
                            @if (customer.phone) { <small>{{ customer.phone }}</small> }
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="chips">
                          @for (method of customer.login_methods; track method) {
                            <span class="login-chip" [class]="method">
                              <i>{{ providerGlyph(method) }}</i>{{ methodLabel(method) }}
                            </span>
                          }
                        </div>
                      </td>
                      <td class="right"><strong>{{ customer.orders_count }}</strong></td>
                      <td class="right"><strong>{{ customer.total_spent | money:'':'symbol':'1.2-2' }}</strong></td>
                      <td class="right">{{ customer.average_order_value | money:'':'symbol':'1.2-2' }}</td>
                      <td>
                        @if (customer.last_order_at) { <strong>{{ customer.last_order_at | date: 'd MMM y' }}</strong> }
                        @else { <small>—</small> }
                      </td>
                      <td>
                        <span class="chip-tag gold">{{ (customer.segment || 'new') | titlecase }}</span>
                        @if (customer.tags.length) {
                          <div class="chips">
                            @for (tag of customer.tags; track tag) { <span class="chip-tag">{{ tag }}</span> }
                          </div>
                        }
                      </td>
                      <td><span class="state-pill" [class]="customer.status">{{ customer.status | titlecase }}</span></td>
                      <td class="right">
                        <div class="row-toolbar" (click)="$event.stopPropagation()">
                          <button class="row-action menu" type="button" (click)="toggleActionMenu('customer-' + customer.id)" [attr.aria-expanded]="actionMenu() === 'customer-' + customer.id" [attr.aria-label]="'Customer actions for ' + customer.name" title="More actions">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
                          </button>
                          @if (actionMenu() === 'customer-' + customer.id) {
                            <div class="action-menu" role="menu" aria-label="Customer actions">
                              <button type="button" class="action-item" (click)="openCustomer(customer); closeActionMenu(); $event.stopPropagation()" role="menuitem">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>
                                <span>View</span>
                              </button>
                              @if (canManageCustomers()) {
                                <button type="button" class="action-item warn" (click)="toggleBlock(customer); closeActionMenu(); $event.stopPropagation()" role="menuitem">
                                  @if (customer.status === 'blocked') {
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 0 1 12.1-5.1L6.9 17.1A7 7 0 0 1 5 12Z"/><path d="M18.5 6.5A7 7 0 0 1 6.9 17.1L17.1 6.9Z"/></svg>
                                  } @else {
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v10H7z"/><path d="M9 9h6v6H9z"/></svg>
                                  }
                                  <span>{{ customer.status === 'blocked' ? 'Unblock' : 'Block' }}</span>
                                </button>
                              }
                            </div>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="table-foot">
              <span>Page {{ customerPage() }} of {{ customerLastPage() }} · {{ customerTotal() }} customers</span>
              <div class="pager">
                <button type="button" (click)="loadCustomers(customerPage() - 1)" [disabled]="customerPage() <= 1">Previous</button>
                <button type="button" (click)="loadCustomers(customerPage() + 1)" [disabled]="customerPage() >= customerLastPage()">Next</button>
              </div>
            </div>
          }
        </section>
      }

      <!-- ------------------------------------------------------------- roles -->
      @if (tab() === 'roles') {
        <section class="panel role-intro">
          <div class="panel-head">
            <div>
              <p class="overline">Permission sets</p>
              <h3>Roles assigned by the administrator</h3>
            </div>
            @if (canManageRoles()) {
              <button class="btn primary" type="button" (click)="openRole(null)">+ New role</button>
            }
          </div>
          <p class="pad hint">
            A role is a reusable set of permission checkboxes. Everyone assigned to the role inherits its
            permissions; individual people can still be given extra capabilities from the user drawer.
          </p>
        </section>

        <section class="role-grid">
          @for (role of roles(); track role.id) {
            <article class="role-card" [class.owner]="role.is_owner_role">
              <header>
                <div>
                  <h3>{{ role.name }}</h3>
                  <p>{{ role.description || 'No description yet.' }}</p>
                </div>
                @if (role.is_system) { <span class="chip-tag cool">Built-in</span> }
              </header>
              <div class="role-meta">
                <span><b>{{ role.is_owner_role ? allPermissionKeys().length : role.permissions.length }}</b> permissions</span>
                <span><b>{{ role.users_count }}</b> assigned</span>
                @if (role.department) { <span class="chip-tag">{{ role.department | titlecase }}</span> }
              </div>
              <div class="role-perms">
                @for (perm of role.permissions.slice(0, 6); track perm) {
                  <span class="chip-tag">{{ permissionLabel(perm) }}</span>
                }
                @if (role.permissions.length > 6) { <span class="chip-tag cool">+{{ role.permissions.length - 6 }} more</span> }
              </div>
              <footer>
                @if (canManageRoles()) {
                  <div class="row-toolbar" (click)="$event.stopPropagation()">
                    <button class="row-action menu" type="button" (click)="toggleActionMenu('role-' + role.id)" [attr.aria-expanded]="actionMenu() === 'role-' + role.id" [attr.aria-label]="'Role actions for ' + role.name" title="More actions">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
                    </button>
                    @if (actionMenu() === 'role-' + role.id) {
                      <div class="action-menu" role="menu" aria-label="Role actions">
                        <button type="button" class="action-item" (click)="openRole(role); closeActionMenu()" role="menuitem">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>
                          <span>{{ role.is_owner_role ? 'Locked' : 'Edit' }}</span>
                        </button>
                        <button type="button" class="action-item" (click)="duplicateRole(role); closeActionMenu()" role="menuitem">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1.5 1.5 0 0 1 1.5-1.5H15"/></svg>
                          <span>Duplicate</span>
                        </button>
                        @if (!role.is_system) {
                          <button type="button" class="action-item danger" (click)="deleteRole(role); closeActionMenu()" role="menuitem">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12h10l1-12"/><path d="M9 7V4h6v3"/></svg>
                            <span>Delete</span>
                          </button>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <small>Only administrators can change roles.</small>
                }
              </footer>
            </article>
          }
        </section>
      }

      <!-- ------------------------------------------------- user editor drawer -->
      @if (editor(); as draft) {
        <div class="drawer-backdrop" (click)="closeEditor()"></div>
        <aside class="drawer wide" role="dialog" aria-label="System user">
          <header class="drawer-head">
            <div>
              <p class="overline">{{ draft.mode === 'create' ? 'Invite' : 'Edit' }} system user</p>
              <h2>{{ draft.mode === 'create' ? 'New team member' : draft.name }}</h2>
            </div>
            <button class="icon-btn" type="button" (click)="closeEditor()" aria-label="Close">×</button>
          </header>

          <div class="drawer-body">
            <section class="form-grid">
              <label class="field">
                <span>Full name</span>
                <input type="text" [(ngModel)]="draft.name" name="name" placeholder="Ama Mensah" />
              </label>
              <label class="field">
                <span>Work email</span>
                <input type="email" [(ngModel)]="draft.email" name="email" [disabled]="draft.mode === 'edit'" placeholder="name@company.com" />
              </label>
              <label class="field">
                <span>Phone <i>optional</i></span>
                <input type="tel" [(ngModel)]="draft.phone" name="phone" placeholder="+233…" />
              </label>
              <label class="field">
                <span>Job title <i>optional</i></span>
                <input type="text" [(ngModel)]="draft.title" name="title" placeholder="Operations lead" />
              </label>
            </section>

            <section class="block">
              <h4>Console access</h4>
              <div class="choice-grid">
                @for (level of accessLevels(); track level.key) {
                  <label class="choice" [class.selected]="draft.accessLevel === level.key">
                    <input
                      type="radio"
                      name="access-level"
                      [value]="level.key"
                      [checked]="draft.accessLevel === level.key"
                      (change)="setAccessLevel(level.key)"
                    />
                    <span><strong>{{ level.label }}</strong><small>{{ level.description }}</small></span>
                  </label>
                }
              </div>
            </section>

            <section class="block">
              <h4>Role &amp; assignment</h4>
              <div class="form-grid">
                <label class="field">
                  <span>Role</span>
                  <select [ngModel]="draft.tenantRoleId" (ngModelChange)="selectRole($event)" [disabled]="draft.accessLevel === 'tenant_owner'">
                    @for (role of assignableRoles(); track role.id) {
                      <option [ngValue]="role.id">{{ role.name }}</option>
                    }
                  </select>
                </label>
                <label class="field">
                  <span>Department</span>
                  <select [(ngModel)]="draft.department" name="department">
                    <option value="">All departments</option>
                    @for (dept of departments(); track dept) { <option [value]="dept">{{ dept | titlecase }}</option> }
                  </select>
                </label>
                <label class="field">
                  <span>Store</span>
                  <select [ngModel]="draft.storeId" (ngModelChange)="draft.storeId = $event">
                    <option [ngValue]="null">All stores</option>
                    @for (store of stores(); track store.id) { <option [ngValue]="store.id">{{ store.name }}</option> }
                  </select>
                </label>
                <label class="field">
                  <span>Status</span>
                  <select [(ngModel)]="draft.status" name="status" [disabled]="draft.isSelf">
                    <option value="active">Active</option>
                    <option value="invited">Invited</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>
              </div>
            </section>

            <section class="block">
              <div class="block-head">
                <div>
                  <h4>Permissions</h4>
                  <p class="hint">
                    @if (draft.accessLevel === 'tenant_owner') {
                      Owners always hold every permission — this cannot be narrowed.
                    } @else if (permissionsDiffer()) {
                      Customised for this person. <button class="link-btn" type="button" (click)="resetPermissions()">Reset to role defaults</button>
                    } @else {
                      Inherited from <b>{{ selectedRoleName() }}</b>. Tick or untick to tailor them for this person.
                    }
                  </p>
                </div>
                <span class="permission-count">{{ draft.accessLevel === 'tenant_owner' ? allPermissionKeys().length : draft.permissions.length }} selected</span>
              </div>

              @for (group of permissionGroups(); track group.key) {
                <fieldset class="permission-group" [disabled]="draft.accessLevel === 'tenant_owner'">
                  <legend>{{ group.label }}</legend>
                  <button class="link-btn group-toggle" type="button" (click)="toggleGroup(group)" [disabled]="draft.accessLevel === 'tenant_owner'">
                    {{ groupFullySelected(group) ? 'Clear group' : 'Select all' }}
                  </button>
                  <div class="permission-list">
                    @for (permission of group.permissions; track permission.key) {
                      <label class="permission-option" [class.selected]="hasPermission(permission.key)">
                        <input
                          type="checkbox"
                          [checked]="hasPermission(permission.key)"
                          [disabled]="draft.accessLevel === 'tenant_owner'"
                          (change)="togglePermission(permission.key, $any($event.target).checked)"
                        />
                        <span><strong>{{ permission.label }}</strong><small>{{ permission.description }}</small></span>
                      </label>
                    }
                  </div>
                </fieldset>
              }
            </section>
          </div>

          <footer class="drawer-foot">
            <button class="btn ghost" type="button" (click)="closeEditor()">Cancel</button>
            <button class="btn primary" type="button" (click)="saveUser()" [disabled]="saving() || !draft.name || !draft.email">
              {{ saving() ? 'Saving…' : draft.mode === 'create' ? 'Send invite' : 'Save changes' }}
            </button>
          </footer>
        </aside>
      }

      <!-- ------------------------------------------------- role editor drawer -->
      @if (roleEditor(); as draft) {
        <div class="drawer-backdrop" (click)="closeRole()"></div>
        <aside class="drawer wide" role="dialog" aria-label="Role">
          <header class="drawer-head">
            <div>
              <p class="overline">{{ draft.id ? 'Edit role' : 'New role' }}</p>
              <h2>{{ draft.name || 'Untitled role' }}</h2>
            </div>
            <button class="icon-btn" type="button" (click)="closeRole()" aria-label="Close">×</button>
          </header>

          <div class="drawer-body">
            <section class="form-grid">
              <label class="field">
                <span>Role name</span>
                <input type="text" [(ngModel)]="draft.name" name="role-name" placeholder="Warehouse lead" />
              </label>
              <label class="field">
                <span>Default department</span>
                <select [(ngModel)]="draft.department" name="role-department">
                  <option value="">None</option>
                  @for (dept of departments(); track dept) { <option [value]="dept">{{ dept | titlecase }}</option> }
                </select>
              </label>
              <label class="field wide">
                <span>Description</span>
                <input type="text" [(ngModel)]="draft.description" name="role-description" placeholder="What this role is responsible for" />
              </label>
            </section>

            <section class="block">
              <div class="block-head">
                <div>
                  <h4>Permissions</h4>
                  <p class="hint">Everyone assigned to this role inherits exactly these checkboxes.</p>
                </div>
                <span class="permission-count">{{ draft.permissions.length }} selected</span>
              </div>

              @for (group of permissionGroups(); track group.key) {
                <fieldset class="permission-group">
                  <legend>{{ group.label }}</legend>
                  <button class="link-btn group-toggle" type="button" (click)="toggleRoleGroup(group)">
                    {{ roleGroupFullySelected(group) ? 'Clear group' : 'Select all' }}
                  </button>
                  <div class="permission-list">
                    @for (permission of group.permissions; track permission.key) {
                      <label class="permission-option" [class.selected]="roleHasPermission(permission.key)">
                        <input
                          type="checkbox"
                          [checked]="roleHasPermission(permission.key)"
                          (change)="toggleRolePermission(permission.key, $any($event.target).checked)"
                        />
                        <span><strong>{{ permission.label }}</strong><small>{{ permission.description }}</small></span>
                      </label>
                    }
                  </div>
                </fieldset>
              }
            </section>
          </div>

          <footer class="drawer-foot">
            <button class="btn ghost" type="button" (click)="closeRole()">Cancel</button>
            <button class="btn primary" type="button" (click)="saveRole()" [disabled]="saving() || !draft.name">
              {{ saving() ? 'Saving…' : draft.id ? 'Save role' : 'Create role' }}
            </button>
          </footer>
        </aside>
      }

      <!-- ---------------------------------------------- customer detail drawer -->
      @if (activeCustomer(); as customer) {
        <div class="drawer-backdrop" (click)="closeCustomer()"></div>
        <aside class="drawer" role="dialog" aria-label="Customer">
          <header class="drawer-head">
            <div>
              <p class="overline">Customer</p>
              <h2>{{ customer.name }}</h2>
              <small>{{ customer.email }}</small>
            </div>
            <button class="icon-btn" type="button" (click)="closeCustomer()" aria-label="Close">×</button>
          </header>

          <div class="drawer-body">
            <section class="stat-row">
              <div><b>{{ customer.orders_count }}</b><span>Orders</span></div>
              <div><b>{{ customer.total_spent | money:'':'symbol':'1.0-0' }}</b><span>Spend</span></div>
              <div><b>{{ customer.average_order_value | money:'':'symbol':'1.0-0' }}</b><span>Avg order</span></div>
              <div><b>{{ customer.last_order_at ? (customer.last_order_at | date: 'd MMM') : '—' }}</b><span>Last order</span></div>
            </section>

            <section class="block">
              <h4>Sign-in methods</h4>
              <div class="chips">
                @for (method of customer.login_methods; track method) {
                  <span class="login-chip" [class]="method"><i>{{ providerGlyph(method) }}</i>{{ methodLabel(method) }}</span>
                }
              </div>
              @for (account of customer.social_accounts; track account.provider) {
                <p class="hint">
                  {{ account.label }} · {{ account.email || 'no email shared' }}
                  @if (account.last_login_at) { · last used {{ account.last_login_at | date: 'd MMM y' }} }
                </p>
              }
              <p class="hint">Account created {{ customer.joined_at | date: 'd MMM y' }}.</p>
            </section>

            <section class="block">
              <h4>Relationship</h4>
              <div class="form-grid">
                <label class="field">
                  <span>Segment</span>
                  <select [(ngModel)]="customerDraft.segment" [disabled]="!canManageCustomers()">
                    <option value="">Unsegmented</option>
                    @for (segment of segments(); track segment) { <option [value]="segment">{{ segment | titlecase }}</option> }
                  </select>
                </label>
                <label class="field">
                  <span>Status</span>
                  <select [(ngModel)]="customerDraft.status" [disabled]="!canManageCustomers()">
                    <option value="active">Active</option>
                    <option value="blocked">Blocked from my stores</option>
                  </select>
                </label>
                <label class="field wide">
                  <span>Tags <i>comma separated</i></span>
                  <input type="text" [(ngModel)]="customerDraft.tags" [disabled]="!canManageCustomers()" placeholder="vip, wholesale" />
                </label>
                <label class="field wide">
                  <span>Internal notes</span>
                  <textarea rows="3" [(ngModel)]="customerDraft.notes" [disabled]="!canManageCustomers()" placeholder="Context for your team — never shown to the customer."></textarea>
                </label>
                <label class="switch">
                  <input type="checkbox" [(ngModel)]="customerDraft.marketing" [disabled]="!canManageCustomers()" />
                  <span>Opted in to marketing messages</span>
                </label>
              </div>
            </section>

            @if (customer.orders?.length) {
              <section class="block">
                <h4>Recent orders</h4>
                <ul class="order-list">
                  @for (order of customer.orders; track order.id) {
                    <li>
                      <span>#{{ order.order_id }}</span>
                      <span class="chip-tag">{{ order.status.replace('_', ' ') | titlecase }}</span>
                      <b>{{ order.total | money:'':'symbol':'1.2-2' }}</b>
                      <small>{{ order.placed_at | date: 'd MMM y' }}</small>
                    </li>
                  }
                </ul>
              </section>
            }
          </div>

          <footer class="drawer-foot">
            <button class="btn ghost" type="button" (click)="closeCustomer()">Close</button>
            @if (canManageCustomers()) {
              <button class="btn primary" type="button" (click)="saveCustomer()" [disabled]="saving()">
                {{ saving() ? 'Saving…' : 'Save customer' }}
              </button>
            }
          </footer>
        </aside>
      }
    </div>
  `,
})
export class SellerUsersComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  // ------------------------------------------------------------------ state
  tab = signal<Tab>('system');
  users = signal<TenantSystemUser[]>([]);
  userStats = signal<TenantSystemUserStats | null>(null);
  roles = signal<TenantRoleSummary[]>([]);
  permissionGroups = signal<PermissionGroup[]>([]);
  accessLevels = signal<TenantAccessLevelOption[]>([]);
  departments = signal<string[]>(['finance', 'sales', 'operations', 'marketing']);
  stores = signal<{ id: number; name: string }[]>([]);
  canManageUsers = signal(false);
  canManageRoles = signal(false);

  customers = signal<TenantCustomer[]>([]);
  customerStats = signal<TenantCustomerStats | null>(null);
  providerCounts = signal<{ key: string; label: string; count: number }[]>([]);
  segments = signal<string[]>(['new', 'returning', 'vip', 'wholesale']);
  canManageCustomers = signal(false);
  customerPage = signal(1);
  customerLastPage = signal(1);
  customerTotal = signal(0);

  loadingUsers = signal(false);
  loadingCustomers = signal(false);
  saving = signal(false);
  error = signal('');
  toast = signal('');
  tempPassword = signal<{ email: string; password: string } | null>(null);

  editor = signal<UserEditor | null>(null);
  roleEditor = signal<RoleEditor | null>(null);
  actionMenu = signal<string | null>(null);
  activeCustomer = signal<TenantCustomer | null>(null);
  customerDraft = { segment: '', status: 'active', tags: '', notes: '', marketing: false };

  // filters
  userSearch = '';
  roleFilter = '';
  statusFilter = '';
  departmentFilter = '';
  customerSearch = '';
  customerFilter: CustomerFilter = '';
  providerFilter = '';
  customerSort = 'spend_desc';

  private userSearch$ = new Subject<string>();
  private customerSearch$ = new Subject<string>();
  private permissionLabels = new Map<string, string>();

  busy = computed(() => this.loadingUsers() || this.loadingCustomers());
  allPermissionKeys = computed(() => this.permissionGroups().flatMap((group) => group.permissions.map((p) => p.key)));
  socialProviderTotal = computed(() => this.providerCounts().reduce((sum, p) => sum + p.count, 0));
  /** Owners always hold everything, so the owner role is not offered to staff. */
  assignableRoles = computed(() => {
    const draft = this.editor();
    const roles = this.roles();
    return draft?.accessLevel === 'tenant_owner' ? roles.filter((r) => r.is_owner_role) : roles.filter((r) => !r.is_owner_role);
  });
  userFiltersApplied = computed(() => !!(this.userSearch || this.roleFilter || this.statusFilter || this.departmentFilter));

  constructor() {
    this.userSearch$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.loadUsers());
    this.customerSearch$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.loadCustomers(1));

    this.loadUsers();
    this.loadCustomers(1);
  }

  // ----------------------------------------------------------------- loading

  setTab(tab: Tab) {
    this.closeActionMenu();
    this.tab.set(tab);
    if (tab === 'customers' && !this.customers().length) this.loadCustomers(1);
  }

  toggleActionMenu(id: string) {
    this.actionMenu.update((current) => (current === id ? null : id));
  }

  closeActionMenu() {
    this.actionMenu.set(null);
  }

  refresh() {
    this.loadUsers();
    this.loadCustomers(this.customerPage());
  }

  loadUsers() {
    this.loadingUsers.set(true);
    const params: Record<string, string | number> = {};
    if (this.userSearch) params['search'] = this.userSearch;
    if (this.roleFilter) params['role'] = this.roleFilter;
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.departmentFilter) params['department'] = this.departmentFilter;

    this.api
      .tenantSystemUsers(params)
      .pipe(finalize(() => this.loadingUsers.set(false)))
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
          this.userStats.set(res.stats);
          this.roles.set(res.meta.tenant_roles ?? []);
          this.permissionGroups.set(res.meta.permission_groups ?? []);
          this.accessLevels.set(res.meta.access_levels ?? []);
          this.departments.set(res.meta.departments ?? this.departments());
          this.stores.set(res.meta.stores ?? []);
          this.canManageUsers.set(!!res.meta.can_manage);
          this.canManageRoles.set(!!res.meta.can_manage);
          this.indexPermissionLabels();
        },
        error: (e) => this.error.set(this.message(e, 'Unable to load system users.')),
      });
  }

  loadCustomers(page: number) {
    const target = Math.max(1, page);
    this.loadingCustomers.set(true);
    const params: Record<string, string | number> = { page: target, per_page: 20, sort: this.customerSort };
    if (this.customerSearch) params['search'] = this.customerSearch;
    if (this.customerFilter) params['status'] = this.customerFilter;
    if (this.providerFilter) params['provider'] = this.providerFilter;

    this.api
      .tenantCustomers(params)
      .pipe(finalize(() => this.loadingCustomers.set(false)))
      .subscribe({
        next: (res) => {
          this.customers.set(res.data);
          this.customerStats.set(res.stats);
          this.providerCounts.set(res.meta.providers ?? []);
          this.segments.set(res.meta.segments ?? this.segments());
          this.canManageCustomers.set(!!res.meta.can_manage);
          this.customerPage.set(res.meta.page);
          this.customerLastPage.set(res.meta.last_page);
          this.customerTotal.set(res.meta.total);
        },
        error: (e) => this.error.set(this.message(e, 'Unable to load customers.')),
      });
  }

  onUserSearch(value: string) {
    this.userSearch = value;
    this.userSearch$.next(value);
  }

  clearUserSearch() {
    this.userSearch = '';
    this.loadUsers();
  }

  clearUserFilters() {
    this.userSearch = '';
    this.roleFilter = '';
    this.statusFilter = '';
    this.departmentFilter = '';
    this.loadUsers();
  }

  onCustomerSearch(value: string) {
    this.customerSearch = value;
    this.customerSearch$.next(value);
  }

  clearCustomerSearch() {
    this.customerSearch = '';
    this.loadCustomers(1);
  }

  // ------------------------------------------------------------ system users

  openInvite() {
    const fallback = this.roles().find((role) => role.key === 'store_staff') ?? this.assignableRoles()[0] ?? null;
    this.editor.set({
      mode: 'create',
      id: null,
      name: '',
      email: '',
      phone: '',
      title: '',
      accessLevel: 'store_staff',
      tenantRoleId: fallback?.id ?? null,
      department: fallback?.department ?? '',
      storeId: null,
      status: 'invited',
      permissions: [...(fallback?.permissions ?? [])],
      isOwnerRecord: false,
      isSelf: false,
    });
  }

  openEdit(user: TenantSystemUser) {
    this.editor.set({
      mode: 'edit',
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      title: user.title ?? '',
      accessLevel: user.access_level,
      tenantRoleId: user.tenant_role_id ?? null,
      department: user.department ?? '',
      storeId: user.store_id ?? null,
      status: user.status,
      permissions: user.is_owner ? [...this.allPermissionKeys()] : [...user.permissions],
      isOwnerRecord: user.is_owner,
      isSelf: user.user_id === this.auth.user()?.id,
    });
  }

  closeEditor() {
    this.editor.set(null);
  }

  setAccessLevel(level: TenantAccessLevel) {
    const draft = this.editor();
    if (!draft) return;
    const roles = this.roles();
    const next = level === 'tenant_owner'
      ? roles.find((role) => role.is_owner_role) ?? null
      : roles.find((role) => role.id === draft.tenantRoleId && !role.is_owner_role)
        ?? roles.find((role) => role.key === 'store_staff')
        ?? roles.find((role) => !role.is_owner_role)
        ?? null;

    this.editor.set({
      ...draft,
      accessLevel: level,
      tenantRoleId: next?.id ?? null,
      permissions: level === 'tenant_owner' ? [...this.allPermissionKeys()] : [...(next?.permissions ?? [])],
    });
  }

  selectRole(roleId: number) {
    const draft = this.editor();
    const role = this.roles().find((item) => item.id === Number(roleId));
    if (!draft || !role) return;
    this.editor.set({
      ...draft,
      tenantRoleId: role.id,
      department: role.department ?? draft.department,
      permissions: [...role.permissions],
    });
  }

  hasPermission(key: string): boolean {
    return this.editor()?.permissions.includes(key) ?? false;
  }

  togglePermission(key: string, checked: boolean) {
    const draft = this.editor();
    if (!draft) return;
    const permissions = checked
      ? [...new Set([...draft.permissions, key])]
      : draft.permissions.filter((item) => item !== key);
    this.editor.set({ ...draft, permissions });
  }

  groupFullySelected(group: PermissionGroup): boolean {
    return group.permissions.every((permission) => this.hasPermission(permission.key));
  }

  toggleGroup(group: PermissionGroup) {
    const draft = this.editor();
    if (!draft) return;
    const keys = group.permissions.map((permission) => permission.key);
    const permissions = this.groupFullySelected(group)
      ? draft.permissions.filter((key) => !keys.includes(key))
      : [...new Set([...draft.permissions, ...keys])];
    this.editor.set({ ...draft, permissions });
  }

  /** True when the ticked boxes no longer match the selected role. */
  permissionsDiffer(): boolean {
    const draft = this.editor();
    if (!draft || draft.accessLevel === 'tenant_owner') return false;
    const role = this.roles().find((item) => item.id === draft.tenantRoleId);
    return !this.sameSet(draft.permissions, role?.permissions ?? []);
  }

  resetPermissions() {
    const draft = this.editor();
    const role = this.roles().find((item) => item.id === draft?.tenantRoleId);
    if (!draft || !role) return;
    this.editor.set({ ...draft, permissions: [...role.permissions] });
  }

  selectedRoleName(): string {
    const draft = this.editor();
    return this.roles().find((role) => role.id === draft?.tenantRoleId)?.name ?? 'no role';
  }

  saveUser() {
    const draft = this.editor();
    if (!draft) return;

    const payload: Record<string, unknown> = {
      name: draft.name.trim(),
      phone: draft.phone.trim() || null,
      title: draft.title.trim() || null,
      role: draft.accessLevel,
      tenant_role_id: draft.tenantRoleId,
      department: draft.department || null,
      store_id: draft.storeId,
      status: draft.status,
      permissions: draft.accessLevel === 'tenant_owner' ? null : draft.permissions,
    };

    this.saving.set(true);
    const request = draft.mode === 'create'
      ? this.api.createTenantSystemUser({ ...payload, email: draft.email.trim() })
      : this.api.updateTenantSystemUser(draft.id!, payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (res: any) => {
        if (res?.meta?.temporary_password) {
          this.tempPassword.set({ email: draft.email.trim(), password: res.meta.temporary_password });
        }
        this.notify(draft.mode === 'create' ? 'Invitation created.' : 'Access updated.');
        this.closeEditor();
        this.loadUsers();
      },
      error: (e) => this.error.set(this.message(e, 'Could not save this user.')),
    });
  }

  toggleStatus(user: TenantSystemUser) {
    const status: TenantUserStatus = user.status === 'suspended' ? 'active' : 'suspended';
    if (status === 'suspended' && !confirm(`Suspend ${user.name}? They will be signed out of the console.`)) return;

    this.api.updateTenantSystemUser(user.id, { status }).subscribe({
      next: () => {
        this.notify(status === 'suspended' ? 'Access suspended.' : 'Access restored.');
        this.loadUsers();
      },
      error: (e) => this.error.set(this.message(e, 'Could not change this status.')),
    });
  }

  resetPassword(user: TenantSystemUser) {
    if (!confirm(`Issue a new temporary password for ${user.name}? Their current sessions end immediately.`)) return;

    this.api.resetTenantSystemUserPassword(user.id).subscribe({
      next: (res) => {
        this.tempPassword.set({ email: user.email, password: res.meta.temporary_password });
        this.notify('Temporary password issued.');
      },
      error: (e) => this.error.set(this.message(e, 'Could not reset the password.')),
    });
  }

  removeUser(user: TenantSystemUser) {
    if (!confirm(`Remove ${user.name}'s access to this workspace? Their account stays on the marketplace.`)) return;

    this.api.removeTenantSystemUser(user.id).subscribe({
      next: () => {
        this.notify('Access removed.');
        this.loadUsers();
      },
      error: (e) => this.error.set(this.message(e, 'Could not remove this user.')),
    });
  }

  // ------------------------------------------------------------------- roles

  openRole(role: TenantRoleSummary | null) {
    this.roleEditor.set({
      id: role?.id ?? null,
      key: role?.key ?? '',
      name: role?.name ?? '',
      description: role?.description ?? '',
      department: role?.department ?? '',
      permissions: [...(role?.permissions ?? [])],
      isSystem: role?.is_system ?? false,
    });
  }

  duplicateRole(role: TenantRoleSummary) {
    this.roleEditor.set({
      id: null,
      key: '',
      name: `${role.name} copy`,
      description: role.description ?? '',
      department: role.department ?? '',
      permissions: [...role.permissions],
      isSystem: false,
    });
  }

  closeRole() {
    this.roleEditor.set(null);
  }

  roleHasPermission(key: string): boolean {
    return this.roleEditor()?.permissions.includes(key) ?? false;
  }

  toggleRolePermission(key: string, checked: boolean) {
    const draft = this.roleEditor();
    if (!draft) return;
    const permissions = checked
      ? [...new Set([...draft.permissions, key])]
      : draft.permissions.filter((item) => item !== key);
    this.roleEditor.set({ ...draft, permissions });
  }

  roleGroupFullySelected(group: PermissionGroup): boolean {
    return group.permissions.every((permission) => this.roleHasPermission(permission.key));
  }

  toggleRoleGroup(group: PermissionGroup) {
    const draft = this.roleEditor();
    if (!draft) return;
    const keys = group.permissions.map((permission) => permission.key);
    const permissions = this.roleGroupFullySelected(group)
      ? draft.permissions.filter((key) => !keys.includes(key))
      : [...new Set([...draft.permissions, ...keys])];
    this.roleEditor.set({ ...draft, permissions });
  }

  saveRole() {
    const draft = this.roleEditor();
    if (!draft) return;

    const payload: Record<string, unknown> = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      department: draft.department || null,
      permissions: draft.permissions,
    };

    this.saving.set(true);
    const request = draft.id
      ? this.api.updateTenantRole(draft.id, payload)
      : this.api.createTenantRole(payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notify(draft.id ? 'Role updated.' : 'Role created.');
        this.closeRole();
        this.loadUsers();
      },
      error: (e) => this.error.set(this.message(e, 'Could not save this role.')),
    });
  }

  deleteRole(role: TenantRoleSummary) {
    if (!confirm(`Delete the ${role.name} role?`)) return;

    this.api.deleteTenantRole(role.id).subscribe({
      next: () => {
        this.notify('Role deleted.');
        this.loadUsers();
      },
      error: (e) => this.error.set(this.message(e, 'Could not delete this role.')),
    });
  }

  // --------------------------------------------------------------- customers

  openCustomer(customer: TenantCustomer) {
    this.activeCustomer.set(customer);
    this.customerDraft = {
      segment: customer.segment ?? '',
      status: customer.status,
      tags: (customer.tags ?? []).join(', '),
      notes: customer.notes ?? '',
      marketing: customer.marketing_opt_in,
    };

    // Pull the full record (recent orders are only returned by show()).
    this.api.tenantCustomer(customer.id).subscribe({
      next: (res) => this.activeCustomer.set(res.data),
      error: () => undefined,
    });
  }

  closeCustomer() {
    this.activeCustomer.set(null);
  }

  saveCustomer() {
    const customer = this.activeCustomer();
    if (!customer) return;

    this.saving.set(true);
    this.api
      .updateTenantCustomer(customer.id, {
        status: this.customerDraft.status,
        segment: this.customerDraft.segment || null,
        tags: this.customerDraft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        notes: this.customerDraft.notes || null,
        marketing_opt_in: this.customerDraft.marketing,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notify('Customer updated.');
          this.closeCustomer();
          this.loadCustomers(this.customerPage());
        },
        error: (e) => this.error.set(this.message(e, 'Could not update this customer.')),
      });
  }

  toggleBlock(customer: TenantCustomer) {
    const status = customer.status === 'blocked' ? 'active' : 'blocked';
    if (status === 'blocked' && !confirm(`Block ${customer.name} from buying in your stores?`)) return;

    this.api.updateTenantCustomer(customer.id, { status }).subscribe({
      next: () => {
        this.notify(status === 'blocked' ? 'Customer blocked.' : 'Customer unblocked.');
        this.loadCustomers(this.customerPage());
      },
      error: (e) => this.error.set(this.message(e, 'Could not update this customer.')),
    });
  }

  // ----------------------------------------------------------------- helpers

  initials(name?: string | null): string {
    return (name ?? '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  statusLabel(status: TenantUserStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  permissionLabel(key: string): string {
    return this.permissionLabels.get(key) ?? key;
  }

  providerGlyph(method: string): string {
    return PROVIDER_GLYPHS[method] ?? '•';
  }

  methodLabel(method: string): string {
    if (method === 'password') return 'Password';
    return this.providerCounts().find((provider) => provider.key === method)?.label
      ?? method.charAt(0).toUpperCase() + method.slice(1);
  }

  exportCsv() {
    const rows: string[][] = this.tab() === 'customers'
      ? [
          ['Name', 'Email', 'Orders', 'Total spent', 'Login methods', 'Segment', 'Status'],
          ...this.customers().map((customer) => [
            customer.name,
            customer.email,
            String(customer.orders_count),
            String(customer.total_spent),
            customer.login_methods.join(' | '),
            customer.segment ?? '',
            customer.status,
          ]),
        ]
      : [
          ['Name', 'Email', 'Access', 'Role', 'Department', 'Status', 'Permissions'],
          ...this.users().map((user) => [
            user.name,
            user.email,
            user.is_owner ? 'Owner' : 'Staff',
            user.tenant_role?.name ?? '',
            user.department ?? '',
            user.status,
            user.permissions.join(' | '),
          ]),
        ];

    const csv = rows
      .map((row) => row.map((cell) => `"${(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `markethub-${this.tab()}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  copyPassword(password: string) {
    navigator.clipboard?.writeText(password).then(
      () => this.notify('Temporary password copied.'),
      () => undefined,
    );
  }

  private indexPermissionLabels() {
    this.permissionLabels.clear();
    for (const group of this.permissionGroups()) {
      for (const permission of group.permissions) {
        this.permissionLabels.set(permission.key, permission.label);
      }
    }
  }

  private sameSet(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((value, index) => value === sortedB[index]);
  }

  private notify(message: string) {
    this.toast.set(message);
    setTimeout(() => this.toast.set(''), 2600);
  }

  private message(error: any, fallback: string): string {
    return error?.error?.error?.message || error?.error?.message || fallback;
  }
}
