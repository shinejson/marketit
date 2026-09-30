import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-seller-users',
  imports: [FormsModule],
  template: `
    <div class="head">
      <div>
        <h1>Users & departments</h1>
        <p class="muted">Invite staff and map them to finance, sales, operations, or marketing.</p>
      </div>
      <button class="btn" (click)="showForm = !showForm">Invite user</button>
    </div>
    @if (tempPass()) {
      <div class="card pad okbox">Temporary password for {{ tempPass()!.email }}: <code>{{ tempPass()!.password }}</code></div>
    }
    @if (err()) { <p class="err">{{ err() }}</p> }
    @if (showForm) {
      <form class="card pad" (ngSubmit)="create()">
        <div class="grid two">
          <div class="field"><label>Name</label><input [(ngModel)]="form.name" name="name" required /></div>
          <div class="field"><label>Email</label><input type="email" [(ngModel)]="form.email" name="email" required /></div>
          <div class="field"><label>Role</label>
            <select [(ngModel)]="form.role" name="role">
              <option value="store_staff">store_staff</option>
              <option value="tenant_owner">tenant_owner</option>
            </select>
          </div>
          <div class="field"><label>Department</label>
            <select [(ngModel)]="form.department" name="department">
              <option value="">Unassigned</option>
              @for (d of departments(); track d) { <option [value]="d">{{ d }}</option> }
            </select>
          </div>
          <div class="field"><label>Store</label>
            <select [(ngModel)]="form.store_id" name="store_id">
              <option value="">All stores</option>
              @for (s of stores(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
            </select>
          </div>
        </div>
        <button class="btn ok" type="submit">Create access</button>
      </form>
    }
    @for (u of staff(); track u.id) {
      <div class="card pad row">
        <div>
          <strong>{{ u.name }}</strong>
          <p class="muted">{{ u.email }}</p>
        </div>
        <div class="meta">
          <span class="pill">{{ u.role }}</span>
          <select [ngModel]="u.department || ''" (ngModelChange)="assign(u, $event)" [name]="'dept'+u.id">
            <option value="">Unassigned</option>
            @for (d of departments(); track d) { <option [value]="d">{{ d }}</option> }
          </select>
          <button class="btn ghost" (click)="remove(u)">Remove</button>
        </div>
      </div>
    }
    @if (!staff().length) { <div class="empty card">No staff yet.</div> }
  `,
  styles: [`
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap: 12px; }
    .pad { padding: 14px; margin: 10px 0; }
    .row { display:flex; justify-content:space-between; align-items:center; gap: 12px; flex-wrap: wrap; }
    .meta { display:flex; gap: 8px; align-items:center; flex-wrap: wrap; }
    .two { grid-template-columns: 1fr 1fr; }
    .okbox { background: #eef6f1; }
    select { border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; background: #fff; }
  `],
})
export class SellerUsersComponent {
  private api = inject(ApiService);
  staff = signal<any[]>([]);
  stores = signal<any[]>([]);
  departments = signal<string[]>(['finance', 'sales', 'operations', 'marketing']);
  showForm = false;
  err = signal('');
  tempPass = signal<{ email: string; password: string } | null>(null);
  form = { name: '', email: '', role: 'store_staff', department: '', store_id: '' };

  constructor() {
    this.reload();
    this.api.sellerStores().subscribe((res) => this.stores.set(res.data));
  }

  reload() {
    this.api.tenantStaff().subscribe({
      next: (res) => {
        this.staff.set(res.data);
        if (res.meta?.departments?.length) this.departments.set(res.meta.departments);
      },
      error: (e) => this.err.set(e.error?.error?.message || 'Unable to load staff.'),
    });
  }

  create() {
    this.err.set('');
    const payload = { ...this.form, store_id: this.form.store_id ? +this.form.store_id : null, department: this.form.department || null };
    this.api.createStaff(payload).subscribe({
      next: (res) => {
        this.showForm = false;
        if (res.meta?.temporary_password) {
          this.tempPass.set({ email: this.form.email, password: res.meta.temporary_password });
        }
        this.form = { name: '', email: '', role: 'store_staff', department: '', store_id: '' };
        this.reload();
      },
      error: (e) => this.err.set(e.error?.error?.message || 'Invite failed.'),
    });
  }

  assign(u: any, department: string) {
    this.api.updateStaff(u.id, { department: department || null }).subscribe(() => this.reload());
  }

  remove(u: any) {
    this.api.removeStaff(u.id).subscribe({
      next: () => this.reload(),
      error: (e) => this.err.set(e.error?.error?.message || 'Cannot remove this user.'),
    });
  }
}
