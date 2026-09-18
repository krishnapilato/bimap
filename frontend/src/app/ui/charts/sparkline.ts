import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

const WIDTH = 84;
const HEIGHT = 26;
const PAD = 4;

/**
 * A trend in a glance: the history in the de-emphasis grey, the latest point in the accent with a
 * surface ring so it reads against the line. No axes — the tile it sits in says what it measures.
 */
@Component({
  selector: 'bm-sparkline',
  template: `
    <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" [attr.width]="width" [attr.height]="height" role="img" [attr.aria-label]="label()">
      <path class="bm-sparkline__line" [attr.d]="path()" pathLength="1" />
      @if (last(); as point) {
        <circle class="bm-sparkline__dot" [attr.cx]="point.x" [attr.cy]="point.y" r="3.5" />
      }
    </svg>
  `,
  styles: `
    .bm-sparkline { display: inline-block; line-height: 0; }
    .bm-sparkline__line {
      fill: none; stroke: var(--bm-chart-deemphasis); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
      stroke-dasharray: 1; stroke-dashoffset: 1;
      animation: bm-sparkline-draw 900ms var(--bm-ease-emphasized) 120ms forwards;
    }
    .bm-sparkline__dot {
      fill: var(--bm-chart-1); stroke: var(--bm-surface); stroke-width: 2;
      transform-box: fill-box; transform-origin: center;
      animation: bm-pop 320ms var(--bm-ease-spring) 820ms both;
    }
    @keyframes bm-sparkline-draw { to { stroke-dashoffset: 0; } }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-sparkline' },
})
export class Sparkline {
  readonly values = input.required<number[]>();
  readonly label = input('Trend');

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;

  private readonly points = computed(() => {
    const values = this.values();
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const step = values.length > 1 ? (WIDTH - PAD * 2) / (values.length - 1) : 0;
    return values.map((value, index) => ({
      x: PAD + index * step,
      y: HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2),
    }));
  });

  protected readonly path = computed(() =>
    this.points()
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(' '),
  );

  protected readonly last = computed(() => this.points().at(-1) ?? null);
}
