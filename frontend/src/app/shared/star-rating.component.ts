import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Read-only star row used across product cards, review feeds and dashboards. */
@Component({
  selector: 'app-stars',
  template: `
    <span class="stars" [attr.aria-label]="label">
      @for (star of slots; track star) {
        <i [class.on]="star <= rounded">★</i>
      }
      @if (showValue) {
        <b class="value">{{ value ? value.toFixed(1) : '—' }}</b>
      }
      @if (count !== null && count !== undefined) {
        <small class="count">({{ count }})</small>
      }
    </span>
  `,
  styles: [
    `
      .stars { display: inline-flex; align-items: center; gap: 1px; color: var(--gold); font-size: 13px; line-height: 1; }
      i { font-style: normal; opacity: 0.22; }
      i.on { opacity: 1; }
      .value { margin-left: 6px; color: var(--ink); font-size: 12px; font-weight: 700; }
      .count { margin-left: 4px; color: var(--ink-soft); font-size: 11px; }
    `,
  ],
})
export class StarRatingComponent {
  @Input() value = 0;
  @Input() count: number | null = null;
  @Input() showValue = false;

  readonly slots = [1, 2, 3, 4, 5];

  get rounded(): number {
    return Math.round(this.value ?? 0);
  }

  get label(): string {
    return `${(this.value ?? 0).toFixed(1)} out of 5`;
  }
}

/** Interactive 1–5 picker for review composers. */
@Component({
  selector: 'app-star-picker',
  template: `
    <span class="star-pick" role="radiogroup" [attr.aria-label]="ariaLabel">
      @for (star of slots; track star) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="star === value"
          [attr.aria-label]="star + ' star' + (star === 1 ? '' : 's')"
          [class.on]="star <= value"
          (click)="pick(star)"
        >
          ★
        </button>
      }
    </span>
  `,
  styles: [
    `
      .star-pick { display: inline-flex; gap: 2px; }
      button { padding: 0 2px; border: 0; background: none; color: var(--gold); font-size: 26px; line-height: 1; cursor: pointer; opacity: 0.24; }
      button.on { opacity: 1; }
      button:hover { opacity: 0.75; }
    `,
  ],
})
export class StarPickerComponent {
  @Input() value = 0;
  @Input() ariaLabel = 'Rating';
  @Output() valueChange = new EventEmitter<number>();

  readonly slots = [1, 2, 3, 4, 5];

  pick(star: number) {
    this.value = star;
    this.valueChange.emit(star);
  }
}
