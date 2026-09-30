import { Component, Input } from '@angular/core';
import { MhChart } from '../core/models';

@Component({
  selector: 'app-mh-chart',
  template: `
    @if (chart) {
      <div class="card chart">
        <h3>{{ chart.title }}</h3>
        @switch (chart.type) {
          @case ('line') {
            <svg viewBox="0 0 320 160" preserveAspectRatio="none" class="plot">
              @for (s of lineChart!.series; track s.key) {
                <polyline [attr.points]="linePoints(s.key)" fill="none" [attr.stroke]="s.color" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />
              }
            </svg>
            <div class="legend">
              @for (s of lineChart!.series; track s.key) {
                <span><i [style.background]="s.color"></i>{{ s.label }}</span>
              }
            </div>
            <div class="axis">
              <span>{{ firstLabel() }}</span>
              <span>{{ lastLabel() }}</span>
            </div>
          }
          @case ('bar') {
            <div class="bars">
              @for (b of barChart!.bars; track b.label) {
                <div class="bar">
                  <div class="fill" [style.height.%]="barHeight(b.value)" [style.background]="b.color"></div>
                  <span class="lbl">{{ b.label }}</span>
                </div>
              }
            </div>
          }
          @case ('donut') {
            <div class="donut-wrap">
              <svg viewBox="0 0 42 42" class="donut">
                <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#ebe4d6" stroke-width="6" />
                @for (seg of donutSegs(); track seg.label) {
                  <circle cx="21" cy="21" r="15.9" fill="transparent" [attr.stroke]="seg.color" stroke-width="6"
                    [attr.stroke-dasharray]="seg.dash" [attr.stroke-dashoffset]="seg.offset" />
                }
              </svg>
              <div class="legend col">
                @for (s of donutChart!.slices; track s.label) {
                  <span><i [style.background]="s.color"></i>{{ s.label }} · {{ s.value }}</span>
                }
              </div>
            </div>
          }
        }
      </div>
    }
  `,
  styles: [`
    .chart { padding: 16px; min-height: 220px; }
    h3 { margin: 0 0 12px; font-size: 16px; }
    .plot { width: 100%; height: 140px; background: linear-gradient(#fffdf8, #f7f1e4); border-radius: 12px; }
    .legend { display:flex; gap: 14px; flex-wrap: wrap; margin-top: 10px; font-size: 12px; color: var(--ink-soft); }
    .legend.col { flex-direction: column; gap: 6px; }
    .legend i { display:inline-block; width: 10px; height: 10px; border-radius: 99px; margin-right: 6px; }
    .axis { display:flex; justify-content:space-between; font-size: 11px; color: var(--ink-soft); margin-top: 4px; }
    .bars { display:flex; align-items:flex-end; gap: 10px; height: 140px; padding: 8px 4px 0; }
    .bar { flex:1; display:flex; flex-direction:column; align-items:center; height: 100%; justify-content:flex-end; }
    .fill { width: 100%; max-width: 36px; border-radius: 8px 8px 4px 4px; min-height: 4px; }
    .lbl { font-size: 10px; color: var(--ink-soft); margin-top: 6px; text-align:center; max-width: 72px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .donut-wrap { display:flex; align-items:center; gap: 18px; }
    .donut { width: 140px; height: 140px; transform: rotate(-90deg); }
  `],
})
export class MhChartComponent {
  @Input({ required: true }) chart!: MhChart;

  get lineChart() {
    return this.chart.type === 'line' ? this.chart : null;
  }

  get barChart() {
    return this.chart.type === 'bar' ? this.chart : null;
  }

  get donutChart() {
    return this.chart.type === 'donut' ? this.chart : null;
  }

  linePoints(key: string): string {
    const line = this.lineChart;
    if (!line) return '';
    const pts = line.points;
    if (!pts.length) return '';
    const vals = pts.map((p) => Number(p[key] ?? 0));
    const max = Math.max(...vals, 1);
    return vals
      .map((v, i) => {
        const x = pts.length === 1 ? 160 : (i / (pts.length - 1)) * 300 + 10;
        const y = 150 - (v / max) * 130;
        return `${x},${y}`;
      })
      .join(' ');
  }

  firstLabel(): string {
    if (this.chart.type !== 'line') return '';
    return String(this.chart.points[0]?.['label'] ?? '');
  }

  lastLabel(): string {
    if (this.chart.type !== 'line') return '';
    return String(this.chart.points.at(-1)?.['label'] ?? '');
  }

  barHeight(value: number): number {
    if (this.chart.type !== 'bar') return 0;
    const max = Math.max(...this.chart.bars.map((b) => b.value), 1);
    return Math.max(4, (value / max) * 100);
  }

  donutSegs() {
    if (this.chart.type !== 'donut') return [];
    const total = this.chart.slices.reduce((s, x) => s + x.value, 0) || 1;
    const circ = 2 * Math.PI * 15.9;
    let cursor = 0;
    return this.chart.slices.map((s) => {
      const len = (s.value / total) * circ;
      const offset = circ - cursor;
      cursor += len;
      return { label: s.label, color: s.color, dash: `${len} ${circ - len}`, offset };
    });
  }
}
