import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { DeptDashboard, DeptKpi } from '../../core/models';
import { MhChartComponent } from '../../shared/mh-chart.component';

@Component({
  selector: 'app-seller-department',
  imports: [MhChartComponent, RouterLink],
  template: `
    <p class="crumb"><a routerLink="/tenant">Console</a> / {{ title() }}</p>
    <h1>{{ title() }}</h1>
    <p class="muted">Live metrics, goal progress, and trend charts for this department.</p>
    @if (loading()) {
      <div class="grid kpis"><div class="skeleton" style="height:90px"></div><div class="skeleton" style="height:90px"></div></div>
    } @else if (data(); as d) {
      <div class="grid kpis">
        @for (k of d.kpis; track k.key) {
          <div class="card pad">
            <p class="muted">{{ k.label }}</p>
            <h2>{{ format(k) }}</h2>
          </div>
        }
      </div>
      <div class="grid progress">
        @for (p of d.progress; track p.label) {
          <div class="card pad">
            <div class="row">
              <strong>{{ p.label }}</strong>
              <span class="pill">{{ p.percent }}%</span>
            </div>
            <div class="track"><div class="fill" [style.width.%]="p.percent"></div></div>
            <p class="muted">{{ p.current }} / {{ p.target }}</p>
          </div>
        }
      </div>
      <div class="grid charts">
        @for (c of d.charts; track c.title) {
          <app-mh-chart [chart]="c" />
        }
      </div>
      @if (d.table; as t) {
        <div class="card pad table">
          <h3>{{ t.title }}</h3>
          @if (!t.rows.length) {
            <p class="muted">No rows yet.</p>
          } @else {
            <table>
              <thead><tr>@for (c of t.columns; track c) { <th>{{ c }}</th> }</tr></thead>
              <tbody>
                @for (r of t.rows; track $index) {
                  <tr>@for (cell of r; track $index) { <td>{{ cell }}</td> }</tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
    }
  `,
  styles: [`
    .crumb { font-size: 13px; color: var(--ink-soft); }
    .kpis { grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); margin: 16px 0; }
    .progress { grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); margin-bottom: 18px; }
    .charts { grid-template-columns: repeat(auto-fit, minmax(280px,1fr)); }
    .pad { padding: 16px; }
    .row { display:flex; justify-content:space-between; align-items:center; }
    .track { height: 8px; background: var(--paper-2); border-radius: 99px; margin: 10px 0 6px; overflow:hidden; }
    .fill { height: 100%; background: var(--accent-2); }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid var(--line); }
    h3 { margin: 0 0 10px; }
  `],
})
export class SellerDepartmentComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  data = signal<DeptDashboard | null>(null);
  loading = signal(true);
  title = signal('Department');

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const key = params.get('dept') || 'finance';
      this.loading.set(true);
      this.api.departmentDashboard(key).subscribe({
        next: (res) => {
          this.data.set(res.data);
          this.title.set(res.data.title);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  format(k: DeptKpi): string {
    if (k.format === 'currency') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(+k.value);
    }
    if (k.format === 'percent') {
      return `${k.value}%`;
    }
    return k.value;
  }
}
