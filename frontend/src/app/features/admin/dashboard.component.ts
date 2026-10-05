import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AdminOverview, Kpi } from '../../core/models';
import { BarChartComponent, DonutChartComponent, LineChartComponent } from '../../shared/charts.component';
import { MoneyPipe } from '../../shared/money.pipe';

@Component({
  selector: 'app-admin-dashboard',
  imports: [MoneyPipe, DecimalPipe, DatePipe, RouterLink, LineChartComponent, BarChartComponent, DonutChartComponent],
  template: `
    <header class="head">
      <div>
        <h1>Platform overview</h1>
        <p class="muted">Tenant growth, marketplace revenue and recurring billing at a glance.</p>
      </div>
      <div class="ranges">
        @for (r of ranges; track r) {
          <button type="button" class="tab" [class.on]="days() === r" (click)="setRange(r)">{{ r }}d</button>
        }
      </div>
    </header>

    @if (error()) { <p class="err">{{ error() }}</p> }

    @if (loading()) {
      <div class="grid kpis">
        @for (n of [1,2,3,4,5,6]; track n) { <div class="skeleton" style="height:104px"></div> }
      </div>
      <div class="skeleton" style="height:280px; margin-top:18px"></div>
    } @else if (data(); as d) {
      <div class="grid kpis">
        @for (card of cards(); track card.key) {
          <div class="card kpi">
            <p class="muted label">{{ card.label }}</p>
            <h2>{{ card.kpi.format === 'currency' ? (card.kpi.value | money:'') : (card.kpi.value | number) }}</h2>
            <p class="delta" [class]="card.kpi.direction">
              <span class="arrow">{{ card.kpi.direction === 'up' ? '▲' : card.kpi.direction === 'down' ? '▼' : '■' }}</span>
              {{ card.kpi.change > 0 ? '+' : '' }}{{ card.kpi.change | number: '1.0-1' }}% vs previous {{ d.range.days }}d
            </p>
          </div>
        }
      </div>

      <div class="grid two">
        <section class="card pad">
          <app-line-chart [points]="d.series.revenue" title="Marketplace revenue" [subtitle]="'GMV per day, last ' + d.range.days + ' days'" prefix="$" color="#c45c26" />
        </section>
        <section class="card pad">
          <app-line-chart [points]="d.series.orders" title="Orders" subtitle="Orders placed per day" color="#1f4b3a" />
        </section>
      </div>

      <div class="grid two">
        <section class="card pad">
          <app-line-chart [points]="d.series.tenants" title="New tenants" subtitle="Seller applications received" color="#c9a227" />
        </section>
        <section class="card pad">
          <app-line-chart [points]="d.series.users" title="New users" subtitle="Accounts created" color="#2b6b8a" />
        </section>
      </div>

      <div class="grid two">
        <section class="card pad">
          <app-donut-chart [points]="tenantStatus()" title="Tenants by status" centerLabel="tenants" />
        </section>
        <section class="card pad">
          <app-bar-chart [points]="planMix()" title="MRR by plan" subtitle="Monthly recurring revenue per plan" prefix="$" />
        </section>
      </div>

      <div class="grid two">
        <section class="card pad">
          <div class="row">
            <h3>Top tenants</h3>
            <a routerLink="/admin/tenants" class="link">All tenants →</a>
          </div>
          @if (!d.top_tenants.length) {
            <p class="muted small">No seller revenue in this window yet.</p>
          } @else {
            <table>
              <thead><tr><th>Tenant</th><th>Orders</th><th>Revenue</th><th>Commission</th></tr></thead>
              <tbody>
                @for (t of d.top_tenants; track t.tenant_id) {
                  <tr>
                    <td>{{ t.name }}</td>
                    <td>{{ t.orders }}</td>
                    <td>{{ t.revenue | money:'' }}</td>
                    <td>{{ t.commission | money:'' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>

        <section class="card pad">
          <div class="row">
            <h3>Recent activity</h3>
            <a routerLink="/admin/audit" class="link">Audit log →</a>
          </div>
          <ul class="feed">
            @for (a of d.recent_activity; track a.id) {
              <li>
                <span class="pill">{{ a.action }}</span>
                <span class="entity">{{ a.entity }}</span>
                <span class="muted small">{{ a.actor }} · {{ a.created_at | date: 'MMM d, HH:mm' }}</span>
              </li>
            } @empty {
              <li class="muted small">No activity recorded yet.</li>
            }
          </ul>
        </section>
      </div>

      <section class="card pad totals">
        @for (t of totals(); track t.label) {
          <div><p class="muted label">{{ t.label }}</p><strong>{{ t.value | number }}</strong></div>
        }
      </section>
    }
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .head h1 { margin: 0 0 4px; }
    .ranges { display: flex; gap: 4px; background: var(--paper-2); padding: 4px; border-radius: 999px; }
    .tab { border: 0; background: transparent; padding: 8px 14px; border-radius: 999px; cursor: pointer; font-weight: 600; color: var(--ink-soft); }
    .tab.on { background: var(--ink); color: #fff; }
    .kpis { grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); margin: 20px 0; }
    .kpi { padding: 16px 18px; }
    .kpi h2 { margin: 4px 0 6px; font-size: 26px; }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; margin: 0; }
    .delta { margin: 0; font-size: 12px; font-weight: 600; color: var(--ink-soft); }
    .delta.up { color: var(--ok); }
    .delta.down { color: var(--danger); }
    .two { grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); margin-bottom: 18px; }
    .pad { padding: 20px; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px; }
    .row h3 { margin: 0; font-size: 16px; }
    .link { font-size: 13px; font-weight: 600; color: var(--accent); }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft); padding-bottom: 8px; }
    td { padding: 8px 0; border-top: 1px solid var(--line); }
    .feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .feed li { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; }
    .entity { font-weight: 600; }
    .small { font-size: 12px; }
    .totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; }
    .totals strong { font-family: Fraunces, Georgia, serif; font-size: 20px; }
  `],
})
export class AdminDashboardComponent {
  private api = inject(ApiService);

  readonly ranges = [7, 30, 90];

  data = signal<AdminOverview | null>(null);
  loading = signal(true);
  error = signal('');
  days = signal(30);

  cards = computed(() => {
    const kpis = this.data()?.kpis ?? {};
    const labels: Record<string, string> = {
      gmv: 'GMV',
      orders: 'Orders',
      mrr: 'MRR',
      commission: 'Commission',
      new_tenants: 'New tenants',
      new_users: 'New users',
    };
    return Object.keys(labels)
      .filter((key) => kpis[key])
      .map((key) => ({ key, label: labels[key], kpi: kpis[key] as Kpi }));
  });

  tenantStatus = computed(() =>
    Object.entries(this.data()?.tenant_status ?? {}).map(([label, value]) => ({ label, value: Number(value) })),
  );

  planMix = computed(() =>
    (this.data()?.plan_distribution ?? []).map((p) => ({ label: p.plan, value: p.mrr })),
  );

  totals = computed(() => {
    const totals = this.data()?.totals ?? {};
    const labels: Record<string, string> = {
      tenants: 'Tenants',
      active_tenants: 'Active',
      pending_tenants: 'Pending review',
      stores: 'Stores',
      products: 'Products',
      users: 'Users',
      orders: 'Orders',
      open_invoices: 'Open invoices',
    };
    return Object.entries(labels).map(([key, label]) => ({ label, value: Number(totals[key] ?? 0) }));
  });

  constructor() {
    this.load();
  }

  setRange(days: number) {
    this.days.set(days);
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.error.set('');
    this.api.adminOverview(this.days()).subscribe({
      next: (res) => {
        this.data.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load platform metrics.');
        this.loading.set(false);
      },
    });
  }
}
