import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { MhChartComponent } from '../../shared/mh-chart.component';
import { LineChart } from '../../core/models';

@Component({
  selector: 'app-seller-dashboard',
  imports: [CurrencyPipe, RouterLink, MhChartComponent],
  template: `
    <h1>Tenant dashboard</h1>
    <p class="muted">Overview across finance, sales, operations, and marketing.</p>
    @if (data(); as d) {
      <div class="grid kpis">
        <div class="card pad"><p class="muted">Today sales</p><h2>{{ +d.sales_today | currency }}</h2></div>
        <div class="card pad"><p class="muted">Open orders</p><h2>{{ d.open_orders }}</h2></div>
        <div class="card pad"><p class="muted">Low stock</p><h2>{{ d.low_stock }}</h2></div>
      </div>
      @if (salesChart(); as c) {
        <app-mh-chart [chart]="c" />
      }
    }
    <h3>Departments</h3>
    <div class="grid depts">
      @for (dept of departments(); track dept.key) {
        <a class="card pad dept" [routerLink]="'/seller/departments/' + dept.key">
          <strong>{{ dept.title }}</strong>
          <div class="mini">
            @for (k of dept.kpis?.slice(0,2) || []; track k.key) {
              <p class="muted">{{ k.label }} · {{ k.value }}</p>
            }
          </div>
          @for (p of dept.progress?.slice(0,1) || []; track p.label) {
            <div class="track"><div class="fill" [style.width.%]="p.percent"></div></div>
            <p class="muted">{{ p.label }} {{ p.percent }}%</p>
          }
        </a>
      }
    </div>
    @if (data(); as d) {
      <h3>Recent orders</h3>
      @for (o of d.recent_orders; track o.id) {
        <div class="card pad row">
          <span>#{{ o.id }}</span>
          <span class="pill">{{ o.status }}</span>
          <span>{{ +o.subtotal | currency }}</span>
        </div>
      }
    }
  `,
  styles: [`
    .kpis { grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); margin: 16px 0 20px; }
    .depts { grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); margin: 12px 0 24px; }
    .pad { padding: 16px; margin-bottom: 8px; }
    .row { display:flex; justify-content:space-between; }
    .dept { display:block; }
    .track { height: 8px; background: var(--paper-2); border-radius: 99px; margin: 10px 0 6px; overflow:hidden; }
    .fill { height: 100%; background: var(--accent); }
  `],
})
export class SellerDashboardComponent {
  data = signal<any>(null);
  departments = signal<any[]>([]);
  salesChart = signal<LineChart | null>(null);

  constructor() {
    const api = inject(ApiService);
    api.sellerDashboard().subscribe((res) => {
      this.data.set(res.data);
      const points = (res.data.sales_chart || []).map((r: any) => ({
        label: r.day,
        total: Number(r.total || 0),
      }));
      if (points.length) {
        this.salesChart.set({
          type: 'line',
          title: 'Sales (14 days)',
          points,
          series: [{ key: 'total', label: 'Sales', color: '#1f4b3a' }],
        });
      }
    });
    api.departmentOverview().subscribe((res) => this.departments.set(res.data.departments || []));
  }
}
