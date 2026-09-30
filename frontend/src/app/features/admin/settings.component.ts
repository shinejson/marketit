import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { SettingField } from '../../core/models';

@Component({
  selector: 'app-admin-settings',
  imports: [FormsModule, DatePipe, TitleCasePipe],
  template: `
    <header class="head">
      <div>
        <h1>Settings</h1>
        <p class="muted">Platform-wide configuration. Changes apply immediately across tenants.</p>
      </div>
      <div class="row gap">
        <button class="btn ghost" type="button" (click)="reset()" [disabled]="busy()">Reset {{ group() }}</button>
        <button class="btn accent" type="button" (click)="save()" [disabled]="busy() || !dirty()">
          {{ busy() ? 'Saving…' : 'Save changes' }}
        </button>
      </div>
    </header>

    @if (error()) { <p class="err">{{ error() }}</p> }
    @if (saved()) { <p class="ok-msg">Settings saved.</p> }

    <div class="tabs">
      @for (g of groups(); track g) {
        <button type="button" class="tab" [class.on]="group() === g" (click)="group.set(g)">{{ g | titlecase }}</button>
      }
    </div>

    @if (loading()) {
      <div class="skeleton" style="height:320px; margin-top:16px"></div>
    } @else {
      <section class="card pad">
        <div class="fields">
          @for (field of visible(); track field.key) {
            <div class="setting" [class.bool]="field.type === 'bool'">
              <div class="meta">
                <label [attr.for]="field.key">{{ field.label }}</label>
                <p class="muted small">{{ field.help }}</p>
                @if (field.updated_at) { <p class="muted tiny">Updated {{ field.updated_at | date: 'MMM d, y' }}</p> }
              </div>
              <div class="control">
                @switch (field.type) {
                  @case ('bool') {
                    <label class="switch">
                      <input type="checkbox" [id]="field.key" [ngModel]="field.value" (ngModelChange)="set(field, $event)" [name]="field.key" />
                      <span>{{ field.value ? 'On' : 'Off' }}</span>
                    </label>
                  }
                  @case ('number') {
                    <input type="number" step="0.01" [id]="field.key" [ngModel]="field.value" (ngModelChange)="set(field, $event)" [name]="field.key" />
                  }
                  @default {
                    <input type="text" [id]="field.key" [ngModel]="field.value" (ngModelChange)="set(field, $event)" [name]="field.key" />
                  }
                }
              </div>
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .head h1 { margin: 0 0 4px; }
    .row.gap { display: flex; gap: 8px; }
    .tabs { display: inline-flex; gap: 4px; background: var(--paper-2); padding: 4px; border-radius: 999px; margin: 18px 0 14px; flex-wrap: wrap; }
    .tab { border: 0; background: transparent; padding: 8px 14px; border-radius: 999px; cursor: pointer; font-weight: 600; color: var(--ink-soft); }
    .tab.on { background: var(--ink); color: #fff; }
    .pad { padding: 8px 20px; }
    .setting { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 18px 0; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
    .setting:last-child { border-bottom: 0; }
    .meta label { font-weight: 700; }
    .meta p { margin: 2px 0 0; }
    .small { font-size: 13px; }
    .tiny { font-size: 11px; }
    .control { min-width: 220px; }
    .control input[type=text], .control input[type=number] { width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; background: #fff; }
    .switch { display: flex; align-items: center; gap: 10px; font-weight: 600; }
    .switch input { width: 20px; height: 20px; accent-color: var(--accent); }
    .ok-msg { color: var(--ok); font-size: 13px; font-weight: 600; }
  `],
})
export class AdminSettingsComponent {
  private api = inject(ApiService);

  data = signal<Record<string, SettingField[]>>({});
  group = signal('general');
  loading = signal(true);
  busy = signal(false);
  saved = signal(false);
  error = signal('');
  private changed = signal<Record<string, unknown>>({});

  groups = computed(() => Object.keys(this.data()));
  visible = computed(() => this.data()[this.group()] ?? []);
  dirty = computed(() => Object.keys(this.changed()).length > 0);

  constructor() {
    this.api.adminSettings().subscribe({
      next: (res) => {
        this.data.set(res.data);
        if (!res.data[this.group()]) this.group.set(Object.keys(res.data)[0] ?? 'general');
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load settings.');
        this.loading.set(false);
      },
    });
  }

  set(field: SettingField, value: unknown) {
    field.value = value as SettingField['value'];
    this.changed.update((current) => ({ ...current, [field.key]: value }));
    this.saved.set(false);
  }

  save() {
    const payload = Object.entries(this.changed()).map(([key, value]) => ({ key, value }));
    if (!payload.length) return;

    this.busy.set(true);
    this.error.set('');
    this.api.saveSettings(payload).subscribe({
      next: (res) => {
        this.data.set(res.data);
        this.changed.set({});
        this.busy.set(false);
        this.saved.set(true);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(e?.error?.message || 'Could not save settings.');
      },
    });
  }

  reset() {
    if (!confirm(`Reset the ${this.group()} settings back to their defaults?`)) return;
    this.busy.set(true);
    this.api.resetSettings(this.group()).subscribe({
      next: (res) => {
        this.data.set(res.data);
        this.changed.set({});
        this.busy.set(false);
        this.saved.set(true);
      },
      error: () => {
        this.busy.set(false);
        this.error.set('Could not reset settings.');
      },
    });
  }
}
