import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

export interface ChartPoint {
  date?: string;
  label?: string;
  value: number;
}

const PALETTE = ['#c45c26', '#1f4b3a', '#c9a227', '#6b4f8a', '#2b6b8a', '#9b2c2c'];

/** Shorten axis/legend numbers: 1200 -> 1.2k */
function short(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (abs >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function labelOf(point: ChartPoint): string {
  if (point.label) return point.label;
  if (!point.date) return '';
  // 2026-09-30 -> Sep 30 ; 2026-09 -> Sep
  const parts = point.date.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[Number(parts[1]) - 1] ?? point.date;
  return parts.length > 2 ? `${month} ${Number(parts[2])}` : month;
}

/**
 * Dependency-free area/line chart. Everything is plain SVG in a 0..100 x 0..40
 * viewBox with `preserveAspectRatio="none"`, so it stretches to any card width.
 */
@Component({
  selector: 'app-line-chart',
  imports: [DecimalPipe],
  template: `
    <figure class="chart">
      <figcaption>
        <div>
          <h3>{{ title() }}</h3>
          @if (subtitle()) { <p class="muted small">{{ subtitle() }}</p> }
        </div>
        <strong class="total">{{ prefix() }}{{ total() | number: '1.0-2' }}</strong>
      </figcaption>

      @if (!points().length) {
        <p class="muted small">No data for this period.</p>
      } @else {
        <div class="plot">
          <div class="axis">
            @for (tick of ticks(); track tick) { <span>{{ tick }}</span> }
          </div>
          <svg [attr.viewBox]="'0 0 100 40'" preserveAspectRatio="none" role="img" [attr.aria-label]="title()">
            <defs>
              <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" [attr.stop-color]="color()" stop-opacity="0.35" />
                <stop offset="100%" [attr.stop-color]="color()" stop-opacity="0.02" />
              </linearGradient>
            </defs>
            @for (y of [0, 10, 20, 30, 40]; track y) {
              <line x1="0" [attr.y1]="y" x2="100" [attr.y2]="y" stroke="#d9d0c0" stroke-width="0.15" />
            }
            <path [attr.d]="areaPath()" [attr.fill]="'url(#' + gradientId + ')'" />
            <path [attr.d]="linePath()" fill="none" [attr.stroke]="color()" stroke-width="0.6"
                  stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          </svg>
        </div>
        <div class="dots">
          @for (p of points(); track $index) {
            <span class="dot" [title]="label(p) + ': ' + prefix() + p.value"></span>
          }
        </div>
        <div class="xaxis">
          <span>{{ label(points()[0]) }}</span>
          <span>{{ label(points()[points().length - 1]) }}</span>
        </div>
      }
    </figure>
  `,
  styles: [`
    .chart { margin: 0; }
    figcaption { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
    figcaption h3 { margin: 0; font-size: 16px; }
    .small { font-size: 12px; margin: 2px 0 0; }
    .total { font-family: Fraunces, Georgia, serif; font-size: 22px; }
    .plot { display: flex; gap: 10px; }
    .axis { display: flex; flex-direction: column; justify-content: space-between; font-size: 10px; color: var(--ink-soft); min-width: 30px; text-align: right; }
    svg { width: 100%; height: 170px; display: block; }
    .dots { display: none; }
    .xaxis { display: flex; justify-content: space-between; font-size: 11px; color: var(--ink-soft); margin-top: 6px; padding-left: 40px; }
  `],
})
export class LineChartComponent {
  points = input<ChartPoint[]>([]);
  title = input('');
  subtitle = input('');
  color = input('#c45c26');
  prefix = input('');

  readonly gradientId = 'grad-' + Math.random().toString(36).slice(2, 8);

  total = computed(() => this.points().reduce((sum, p) => sum + (p.value || 0), 0));
  max = computed(() => Math.max(1, ...this.points().map((p) => p.value || 0)));

  ticks = computed(() => {
    const max = this.max();
    return [max, max * 0.75, max * 0.5, max * 0.25, 0].map((v) => short(Math.round(v * 100) / 100));
  });

  private coords = computed(() => {
    const points = this.points();
    const max = this.max();
    const step = points.length > 1 ? 100 / (points.length - 1) : 0;
    return points.map((p, i) => ({ x: i * step, y: 40 - ((p.value || 0) / max) * 36 - 2 }));
  });

  linePath = computed(() => this.coords().map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' '));

  areaPath = computed(() => {
    const coords = this.coords();
    if (!coords.length) return '';
    return `${this.linePath()} L${coords[coords.length - 1].x.toFixed(2)},40 L${coords[0].x.toFixed(2)},40 Z`;
  });

  label(point: ChartPoint) {
    return point ? labelOf(point) : '';
  }
}

/** Horizontal-friendly vertical bar chart with value labels. */
@Component({
  selector: 'app-bar-chart',
  imports: [DecimalPipe],
  template: `
    <figure class="chart">
      <figcaption>
        <h3>{{ title() }}</h3>
        @if (subtitle()) { <p class="muted small">{{ subtitle() }}</p> }
      </figcaption>
      @if (!points().length) {
        <p class="muted small">Nothing to show yet.</p>
      } @else {
        <div class="bars">
          @for (p of points(); track $index) {
            <div class="bar" [title]="label(p) + ': ' + p.value">
              <span class="value">{{ prefix() }}{{ p.value | number: '1.0-2' }}</span>
              <div class="track"><div class="fill" [style.height.%]="height(p)" [style.background]="colorAt($index)"></div></div>
              <span class="name">{{ label(p) }}</span>
            </div>
          }
        </div>
      }
    </figure>
  `,
  styles: [`
    .chart { margin: 0; }
    figcaption h3 { margin: 0 0 2px; font-size: 16px; }
    .small { font-size: 12px; margin: 0 0 4px; color: var(--ink-soft); }
    .bars { display: flex; align-items: flex-end; gap: 14px; height: 200px; margin-top: 10px; }
    .bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; }
    .value { font-size: 11px; font-weight: 700; color: var(--ink-soft); }
    .track { flex: 1; width: 100%; max-width: 52px; display: flex; align-items: flex-end; background: var(--paper-2); border-radius: 10px; overflow: hidden; }
    .fill { width: 100%; border-radius: 10px 10px 0 0; transition: height .4s ease; min-height: 3px; }
    .name { font-size: 11px; color: var(--ink-soft); text-align: center; }
  `],
})
export class BarChartComponent {
  points = input<ChartPoint[]>([]);
  title = input('');
  subtitle = input('');
  prefix = input('');
  color = input('');

  max = computed(() => Math.max(1, ...this.points().map((p) => p.value || 0)));

  height(point: ChartPoint) {
    return Math.max(2, ((point.value || 0) / this.max()) * 100);
  }

  colorAt(index: number) {
    return this.color() || PALETTE[index % PALETTE.length];
  }

  label(point: ChartPoint) {
    return labelOf(point);
  }
}

/** Donut breakdown with a legend — used for tenant status and plan mix. */
@Component({
  selector: 'app-donut-chart',
  imports: [DecimalPipe],
  template: `
    <figure class="chart">
      <figcaption>
        <h3>{{ title() }}</h3>
        @if (subtitle()) { <p class="muted small">{{ subtitle() }}</p> }
      </figcaption>
      @if (!total()) {
        <p class="muted small">Nothing to show yet.</p>
      } @else {
        <div class="body">
          <svg viewBox="0 0 42 42" class="donut" role="img" [attr.aria-label]="title()">
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--paper-2)" stroke-width="6" />
            @for (seg of segments(); track seg.label) {
              <circle cx="21" cy="21" r="15.9" fill="none" [attr.stroke]="seg.color" stroke-width="6"
                      [attr.stroke-dasharray]="seg.dash" [attr.stroke-dashoffset]="seg.offset" />
            }
            <text x="21" y="20.5" text-anchor="middle" class="big">{{ total() | number }}</text>
            <text x="21" y="25" text-anchor="middle" class="cap">{{ centerLabel() }}</text>
          </svg>
          <ul class="legend">
            @for (seg of segments(); track seg.label) {
              <li>
                <span class="swatch" [style.background]="seg.color"></span>
                <span class="key">{{ seg.label }}</span>
                <strong>{{ seg.value | number }}</strong>
                <span class="muted small">{{ seg.pct | number: '1.0-0' }}%</span>
              </li>
            }
          </ul>
        </div>
      }
    </figure>
  `,
  styles: [`
    .chart { margin: 0; }
    figcaption h3 { margin: 0 0 2px; font-size: 16px; }
    .small { font-size: 12px; }
    .body { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
    .donut { width: 160px; height: 160px; flex: none; }
    .big { font: 700 7px Fraunces, Georgia, serif; fill: var(--ink); }
    .cap { font-size: 2.6px; fill: #4a453c; text-transform: uppercase; letter-spacing: .12em; }
    .legend { list-style: none; margin: 0; padding: 0; flex: 1; min-width: 160px; display: flex; flex-direction: column; gap: 8px; }
    .legend li { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .legend .key { flex: 1; text-transform: capitalize; }
    .swatch { width: 10px; height: 10px; border-radius: 3px; }
  `],
})
export class DonutChartComponent {
  points = input<ChartPoint[]>([]);
  title = input('');
  subtitle = input('');
  centerLabel = input('total');

  total = computed(() => this.points().reduce((sum, p) => sum + (p.value || 0), 0));

  segments = computed(() => {
    const total = this.total() || 1;
    let offset = 25; // start at 12 o'clock
    return this.points().map((point, index) => {
      const pct = ((point.value || 0) / total) * 100;
      const segment = {
        label: labelOf(point) || 'other',
        value: point.value || 0,
        pct,
        color: PALETTE[index % PALETTE.length],
        dash: `${pct.toFixed(2)} ${(100 - pct).toFixed(2)}`,
        offset: offset.toFixed(2),
      };
      offset -= pct;
      return segment;
    });
  });
}
