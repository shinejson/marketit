import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PortalService } from '../../core/portal.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="wrap page">
      <form class="card form" (ngSubmit)="submit()">
        <h1>Welcome back</h1>
        <div class="field"><label>Email</label><input [(ngModel)]="email" name="email" type="email" required /></div>
        <div class="field"><label>Password</label><input [(ngModel)]="password" name="password" type="password" required /></div>
        @if (error()) { <p class="err">{{ error() }}</p> }
        <button class="btn" [disabled]="busy()">Log in</button>
        <p class="muted">No account? <a routerLink="/register">Register</a></p>
        <p class="muted split">
          Console logins:
          <a routerLink="/tenant/login">Tenant</a>
          ·
          <a routerLink="/admin/login">Super admin</a>
        </p>
        <p class="muted demos">Demos: customer&#64;markethub.test · seller1&#64;markethub.test · admin&#64;markethub.test</p>
      </form>
    </div>
  `,
  styles: [`
    .page { padding: 48px 0; display:flex; justify-content:center; }
    .form { width: min(420px, 100%); padding: 28px; }
    .split { font-size: 13px; }
    .split a { color: var(--accent); font-weight: 700; }
    .demos { font-size: 12px; }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private portal = inject(PortalService);
  email = 'customer@markethub.test';
  password = 'password';
  busy = signal(false);
  error = signal('');

  constructor() {
    const hostPortal = this.portal.hostPortal();
    if (hostPortal !== 'marketplace') {
      this.router.navigateByUrl(this.portal.loginPath(hostPortal));
    }
  }

  submit() {
    this.busy.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password, 'marketplace').subscribe({
      next: (res) => {
        this.router.navigateByUrl(this.portal.dashboardForRole(res.data.user.role));
      },
      error: (e) => {
        this.error.set(e.error?.error?.message || 'Login failed');
        this.busy.set(false);
      },
    });
  }
}
