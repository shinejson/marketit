import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-seller-backups',
  imports: [DatePipe, DecimalPipe],
  template: `
    <div class="head">
      <div>
        <h1>Backups</h1>
        <p class="muted">Snapshot tenant catalogue, orders, and settings. Restore is operator-confirmed.</p>
      </div>
      <button class="btn ok" [disabled]="busy()" (click)="create()">Create backup</button>
    </div>
    @if (msg()) { <p class="ok">{{ msg() }}</p> }
    @if (err()) { <p class="err">{{ err() }}</p> }
    @for (b of backups(); track b.id) {
      <div class="card pad row">
        <div>
          <strong>{{ b.filename }}</strong>
          <p class="muted">{{ b.created_at | date:'medium' }} · {{ (b.size_bytes / 1024) | number:'1.1-1' }} KB · {{ b.status }}</p>
        </div>
        <div class="actions">
          <a class="btn ghost" [href]="download(b.id)" (click)="downloadAuth($event, b.id)">Download</a>
          <button class="btn" (click)="restore(b.id)">Mark restore</button>
        </div>
      </div>
    }
    @if (!backups().length) { <div class="empty card">No backups yet. Create the first snapshot.</div> }
  `,
  styles: [`
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap: 12px; }
    .pad { padding: 14px; margin: 10px 0; }
    .row { display:flex; justify-content:space-between; align-items:center; gap: 12px; flex-wrap: wrap; }
    .actions { display:flex; gap: 8px; }
    .ok { color: var(--ok); font-weight: 600; }
  `],
})
export class SellerBackupsComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  backups = signal<any[]>([]);
  busy = signal(false);
  msg = signal('');
  err = signal('');

  constructor() { this.reload(); }

  reload() {
    this.api.tenantBackups().subscribe({
      next: (res) => this.backups.set(res.data),
      error: (e) => this.err.set(e.error?.error?.message || 'Unable to load backups.'),
    });
  }

  create() {
    this.busy.set(true);
    this.err.set('');
    this.api.createBackup().subscribe({
      next: () => { this.busy.set(false); this.msg.set('Backup created.'); this.reload(); },
      error: (e) => { this.busy.set(false); this.err.set(e.error?.error?.message || 'Backup failed.'); },
    });
  }

  restore(id: number) {
    this.api.restoreBackup(id).subscribe({
      next: (res) => { this.msg.set(res.data.message || 'Restore marked.'); this.reload(); },
      error: (e) => this.err.set(e.error?.error?.message || 'Restore failed.'),
    });
  }

  download(id: number) {
    return this.api.backupDownloadUrl(id);
  }

  downloadAuth(ev: Event, id: number) {
    ev.preventDefault();
    const token = this.auth.token();
    fetch(this.api.backupDownloadUrl(id), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tenant-backup-${id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => this.err.set('Download failed.'));
  }
}
