import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, computed, input } from '@angular/core';

import { formatNumber } from '../../core/ui/format';
import { Icon } from '../icon/icon';
import { Ripple } from '../interaction/ripple';
import { Spotlight } from '../interaction/spotlight';
import { Skeleton } from '../feedback/feedback';
import { CountUp } from './count-up';
import { Sparkline } from './sparkline';

/**
 * One headline number: its label, the value rolling into place, an optional change against a
 * named period, and an optional trend. When `selectable`, the tile is also the filter it names.
 */
@Component({
  selector: 'bm-stat-tile',
  imports: [Icon, CountUp, Sparkline, Skeleton],
  hostDirectives: [Spotlight, Ripple],
  template: `
    <div class="bm-stat__head">
      @if (icon()) {
        <span class="bm-stat__icon" [attr.data-tone]="tone()"><svg [lucideIcon]="icon()!" [size]="16"></svg></span>
      }
      <span class="bm-stat__label">{{ label() }}</span>
    </div>
    @if (loading()) {
      <bm-skeleton width="56%" height="30px" />
    } @else {
      <div class="bm-stat__value" [bmCountUp]="value()" [bmCountUpFormat]="format()"></div>
    }
    <div class="bm-stat__foot">
      @if (delta() != null && !loading()) {
        <span class="bm-stat__delta" [attr.data-direction]="direction()">
          <svg [lucideIcon]="deltaIcon()" [size]="14"></svg>
          {{ deltaText() }}
        </span>
      }
      @if (caption()) {
        <span class="bm-stat__caption">{{ caption() }}</span>
      }
      @if (trend()?.length && !loading()) {
        <bm-sparkline class="bm-stat__trend" [values]="trend()!" [label]="label() + ' trend'" />
      }
    </div>
  `,
  styleUrl: './stat-tile.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bm-stat',
    '[class.is-selectable]': 'selectable()',
    '[class.is-selected]': 'selected()',
    '[attr.role]': "selectable() ? 'button' : null",
    '[attr.tabindex]': 'selectable() ? 0 : null',
    '[attr.aria-pressed]': 'selectable() ? selected() : null',
  },
})
export class StatTile {
  readonly label = input.required<string>();
  readonly value = input<number | null | undefined>();
  readonly format = input<(value: number) => string>(formatNumber);
  readonly icon = input<string>();
  readonly tone = input<'accent' | 'positive' | 'critical' | 'negative' | 'neutral' | 'special'>('accent');
  readonly caption = input<string>();
  /** Signed change against the period named in `caption`. */
  readonly delta = input<number | null>(null);
  readonly upIsGood = input(true);
  readonly trend = input<number[] | null>(null);
  readonly loading = input(false, { transform: booleanAttribute });
  readonly selectable = input(false, { transform: booleanAttribute });
  readonly selected = input(false, { transform: booleanAttribute });

  protected readonly direction = computed(() => {
    const delta = this.delta() ?? 0;
    if (delta === 0) return 'flat';
    return delta > 0 === this.upIsGood() ? 'good' : 'bad';
  });

  protected readonly deltaIcon = computed(() => {
    const delta = this.delta() ?? 0;
    return delta > 0 ? 'trending-up' : delta < 0 ? 'trending-down' : 'minus';
  });

  protected readonly deltaText = computed(() => {
    const delta = this.delta() ?? 0;
    return `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${formatNumber(Math.abs(delta))}`;
  });
}
