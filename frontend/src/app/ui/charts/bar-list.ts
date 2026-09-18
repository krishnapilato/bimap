import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output } from '@angular/core';

import { formatNumber } from '../../core/ui/format';

export interface BarItem {
  key: string;
  label: string;
  value: number;
}

/**
 * Magnitude, ranked: one hue for every bar, because the bars differ only in length. Thin bars
 * grow from a shared baseline with a rounded end, and the value sits at the tip so no tooltip is
 * needed to read it. Rows are buttons when the list is a way into the data.
 */
@Component({
  selector: 'bm-bar-list',
  template: `
    @for (item of rows(); track item.key; let i = $index) {
      <button
        type="button"
        class="bm-bars__row"
        [disabled]="!interactive()"
        [style.--bm-i]="i"
        [attr.aria-label]="item.label + ': ' + format()(item.value)"
        (click)="picked.emit(item)"
      >
        <span class="bm-bars__label">{{ item.label }}</span>
        <span class="bm-bars__track">
          <span class="bm-bars__bar" [style.--bm-share]="item.share"></span>
        </span>
        <span class="bm-bars__value">{{ format()(item.value) }}</span>
      </button>
    }
  `,
  styles: `
    .bm-bars { display: grid; gap: 2px; }
    .bm-bars__row {
      display: grid; grid-template-columns: minmax(96px, 34%) 1fr auto; align-items: center; gap: 12px;
      padding: 7px 8px; margin: 0 -8px; border-radius: var(--bm-radius-sm); text-align: left;
      transition: background-color var(--bm-duration-fast) var(--bm-ease-standard);
    }
    .bm-bars__row:not(:disabled) { cursor: pointer; }
    .bm-bars__row:disabled { cursor: default; }
    @media (hover: hover) { .bm-bars__row:not(:disabled):hover { background: var(--bm-surface-hover); } }
    .bm-bars__row:not(:disabled):hover .bm-bars__bar { filter: brightness(1.08); }
    .bm-bars__label { font: var(--bm-text-small); color: var(--bm-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bm-bars__track { position: relative; height: 10px; }
    .bm-bars__bar {
      position: absolute; inset: 0 auto 0 0; width: calc(var(--bm-share) * 100%); min-width: 4px;
      border-radius: 0 4px 4px 0; background: var(--bm-chart-1);
      transform-origin: left; transform: scaleX(0);
      animation: bm-bar-grow 700ms var(--bm-ease-emphasized) forwards;
      animation-delay: calc(var(--bm-i, 0) * 60ms + 80ms);
      transition: filter var(--bm-duration-fast) var(--bm-ease-standard), width var(--bm-duration-slow) var(--bm-ease-emphasized);
    }
    .bm-bars__value { font: var(--bm-text-caption); font-weight: 650; color: var(--bm-text-2); font-variant-numeric: tabular-nums; }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-bars' },
})
export class BarList {
  readonly items = input.required<BarItem[]>();
  readonly interactive = input(false);
  readonly format = input<(value: number) => string>(formatNumber);
  readonly picked = output<BarItem>();

  protected readonly rows = computed(() => {
    const max = Math.max(...this.items().map((item) => item.value), 1);
    return this.items().map((item) => ({ ...item, share: item.value / max }));
  });
}
