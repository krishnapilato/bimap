import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output } from '@angular/core';

import { formatNumber, formatPercent } from '../../core/ui/format';
import { Icon } from '../icon/icon';
import { Tone } from '../status/status-badge';

export interface MeterSegment {
  key: string;
  label: string;
  value: number;
  tone: Tone;
  icon: string;
}

/**
 * Part of a whole, in one bar: each state a segment in its own status colour, separated by a
 * surface gap rather than a border. The legend below carries icon, word and count, so no state
 * is ever identified by colour alone.
 */
@Component({
  selector: 'bm-stacked-meter',
  imports: [Icon],
  template: `
    <div class="bm-meter-stack__bar" role="img" [attr.aria-label]="summary()">
      @for (segment of visible(); track segment.key; let i = $index) {
        <span
          class="bm-meter-stack__segment"
          [attr.data-tone]="segment.tone"
          [style.flex-grow]="segment.value"
          [style.--bm-i]="i"
          [attr.title]="segment.label + ': ' + formatNumber(segment.value)"
        ></span>
      }
    </div>
    <ul class="bm-meter-stack__legend">
      @for (segment of segments(); track segment.key) {
        <li>
          <button type="button" [disabled]="!interactive()" (click)="picked.emit(segment)" [attr.data-tone]="segment.tone">
            <svg [lucideIcon]="segment.icon" [size]="14"></svg>
            <span class="bm-meter-stack__name">{{ segment.label }}</span>
            <span class="bm-meter-stack__count">{{ formatNumber(segment.value) }}</span>
            <span class="bm-meter-stack__share">{{ formatPercent(total() ? segment.value / total() : 0) }}</span>
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    .bm-meter-stack { display: grid; gap: 14px; }
    .bm-meter-stack__bar { display: flex; gap: 2px; height: 12px; border-radius: 6px; overflow: hidden; background: var(--bm-chart-track); }
    .bm-meter-stack__segment {
      --bm-seg: var(--bm-neutral);
      flex-basis: 0; min-width: 6px; background: var(--bm-seg);
      transform-origin: left; transform: scaleX(0);
      animation: bm-bar-grow 640ms var(--bm-ease-emphasized) forwards;
      animation-delay: calc(var(--bm-i, 0) * 70ms + 60ms);
      transition: flex-grow var(--bm-duration-slow) var(--bm-ease-emphasized), filter var(--bm-duration-fast);
    }
    .bm-meter-stack__segment:hover { filter: brightness(1.1) saturate(1.1); }
    [data-tone='positive'] { --bm-seg: var(--bm-positive); }
    [data-tone='critical'] { --bm-seg: #d99a1e; }
    [data-tone='negative'] { --bm-seg: var(--bm-negative); }
    [data-tone='info'] { --bm-seg: var(--bm-accent); }
    [data-tone='special'] { --bm-seg: var(--bm-special); }
    [data-tone='neutral'] { --bm-seg: #97a3b3; }
    [data-tone='signal'] { --bm-seg: var(--bm-signal); }
    .bm-meter-stack__legend { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 4px 12px; }
    .bm-meter-stack__legend button {
      display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 8px; width: 100%;
      padding: 6px 8px; margin: 0 -8px; border-radius: var(--bm-radius-sm); text-align: left;
      transition: background-color var(--bm-duration-fast) var(--bm-ease-standard);
    }
    .bm-meter-stack__legend button:disabled { cursor: default; }
    @media (hover: hover) { .bm-meter-stack__legend button:not(:disabled):hover { background: var(--bm-surface-hover); } }
    .bm-meter-stack__legend svg { color: var(--bm-seg); }
    .bm-meter-stack__name { font: var(--bm-text-small); color: var(--bm-text); }
    .bm-meter-stack__count { font: var(--bm-text-caption); font-weight: 700; color: var(--bm-text); font-variant-numeric: tabular-nums; }
    .bm-meter-stack__share { min-width: 34px; text-align: right; font: var(--bm-text-caption); color: var(--bm-text-3); font-variant-numeric: tabular-nums; }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-meter-stack' },
})
export class StackedMeter {
  readonly segments = input.required<MeterSegment[]>();
  readonly interactive = input(false);
  readonly picked = output<MeterSegment>();

  protected readonly formatNumber = formatNumber;
  protected readonly formatPercent = formatPercent;
  protected readonly total = computed(() => this.segments().reduce((sum, segment) => sum + segment.value, 0));
  protected readonly visible = computed(() => this.segments().filter((segment) => segment.value > 0));
  protected readonly summary = computed(() =>
    this.segments().map((segment) => `${segment.label} ${segment.value}`).join(', '),
  );
}

/** A single ratio against its limit, filling from calm to warning to danger as it climbs. */
@Component({
  selector: 'bm-meter',
  template: `
    <span class="bm-meter__fill" [style.transform]="'scaleX(' + clamped() + ')'"></span>
  `,
  styles: `
    .bm-meter { --bm-meter-fill: var(--bm-chart-1); --bm-meter-track: var(--bm-chart-track);
      position: relative; display: block; height: 8px; border-radius: 4px; background: var(--bm-meter-track); overflow: hidden; }
    .bm-meter[data-severity='warning'] { --bm-meter-fill: #d99a1e; --bm-meter-track: #fbefd6; }
    .bm-meter[data-severity='danger'] { --bm-meter-fill: var(--bm-negative); --bm-meter-track: var(--bm-negative-soft); }
    .bm-meter__fill {
      position: absolute; inset: 0; border-radius: inherit; background: var(--bm-meter-fill); transform-origin: left;
      transition: transform var(--bm-duration-cinematic) var(--bm-ease-emphasized), background-color var(--bm-duration-slow) var(--bm-ease-standard);
    }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bm-meter',
    role: 'meter',
    '[attr.aria-valuenow]': 'ratio()',
    'aria-valuemin': '0',
    'aria-valuemax': '1',
    '[attr.aria-label]': 'label()',
    '[attr.data-severity]': 'severity()',
  },
})
export class Meter {
  readonly ratio = input.required<number>();
  readonly label = input('');
  readonly warnAt = input(0.75);
  readonly dangerAt = input(0.9);

  protected readonly clamped = computed(() => Math.min(Math.max(this.ratio(), 0), 1));
  protected readonly severity = computed(() =>
    this.clamped() >= this.dangerAt() ? 'danger' : this.clamped() >= this.warnAt() ? 'warning' : 'normal',
  );
}
