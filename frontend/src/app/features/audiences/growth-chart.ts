import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { format, parseISO } from 'date-fns';

import { GrowthPoint } from '../../core/api/mailing.models';
import { formatNumber } from '../../core/ui/format';

const HEIGHT = 196;
const TOP = 12;
const BOTTOM = 26;
const LEFT = 34;
const RIGHT = 4;

interface Day {
  date: string;
  label: string;
  joined: number;
  left: number;
  x: number;
  up: string | null;
  down: string | null;
}

/**
 * Joins and leaves per day, as one diverging chart: people who subscribed rise above the line,
 * people who left fall below it, on the same scale so the two can be compared by length. Hovering
 * or moving through the days with the arrow keys shows the figures for one day; a table carries the
 * same numbers for screen readers.
 */
@Component({
  selector: 'bm-growth-chart',
  template: `
    <header class="bm-growth__head">
      <div class="bm-growth__titles">
        <h3>{{ title() }}</h3>
        <p>{{ caption() }}</p>
      </div>
      <ul class="bm-growth__legend" aria-label="Totals">
        <li><span class="bm-growth__swatch is-joined"></span>Joined <strong class="bm-numeric">{{ formatNumber(totals().joined) }}</strong></li>
        <li><span class="bm-growth__swatch is-left"></span>Left <strong class="bm-numeric">{{ formatNumber(totals().left) }}</strong></li>
        <li class="bm-growth__net" [attr.data-sign]="totals().net > 0 ? 'up' : totals().net < 0 ? 'down' : 'flat'">
          Net <strong class="bm-numeric">{{ signed(totals().net) }}</strong>
        </li>
      </ul>
    </header>

    <div
      #plot
      class="bm-growth__plot"
      tabindex="0"
      role="img"
      [attr.aria-label]="summary()"
      (pointermove)="point($event)"
      (pointerdown)="point($event)"
      (pointerleave)="active.set(null)"
      (blur)="active.set(null)"
      (keydown)="step($event)"
    >
      @if (width() > 0) {
        <svg [attr.width]="width()" [attr.height]="height" [attr.viewBox]="'0 0 ' + width() + ' ' + height" aria-hidden="true">
          <g class="bm-growth__grid">
            <line [attr.x1]="left" [attr.x2]="width() - right" [attr.y1]="top" [attr.y2]="top" />
            <line [attr.x1]="left" [attr.x2]="width() - right" [attr.y1]="height - bottom" [attr.y2]="height - bottom" />
          </g>
          <text class="bm-growth__tick" [attr.x]="left - 8" [attr.y]="top + 4" text-anchor="end">+{{ scale().upper }}</text>
          <text class="bm-growth__tick" [attr.x]="left - 8" [attr.y]="scale().baseline + 4" text-anchor="end">0</text>
          <text class="bm-growth__tick" [attr.x]="left - 8" [attr.y]="height - bottom + 4" text-anchor="end">−{{ scale().lower }}</text>

          @if (active() !== null) {
            <rect class="bm-growth__band" [attr.x]="days()[active()!].x - band() / 2" [attr.y]="top - 6" [attr.width]="band()" [attr.height]="height - top - bottom + 12" rx="6" />
          }

          @for (day of days(); track day.date; let i = $index) {
            <g class="bm-growth__day" [class.is-dim]="active() !== null && active() !== i" [style.--bm-i]="i">
              @if (day.up) {
                <path class="bm-growth__bar is-joined" [attr.d]="day.up" />
              }
              @if (day.down) {
                <path class="bm-growth__bar is-left" [attr.d]="day.down" />
              }
            </g>
          }

          <line class="bm-growth__baseline" [attr.x1]="left" [attr.x2]="width() - right" [attr.y1]="scale().baseline" [attr.y2]="scale().baseline" />

          @for (tick of axis(); track tick.date) {
            <text class="bm-growth__tick" [attr.x]="tick.x" [attr.y]="height - 6" [attr.text-anchor]="tick.anchor">{{ tick.label }}</text>
          }
        </svg>
      }

      @if (tooltip(); as tip) {
        <div class="bm-growth__tooltip" [style.left.px]="tip.left" [class.is-flipped]="tip.flipped">
          <span class="bm-growth__tooltip-date">{{ tip.day.label }}</span>
          <span class="bm-growth__tooltip-row"><span class="bm-growth__swatch is-joined"></span>Joined<strong>+{{ tip.day.joined }}</strong></span>
          <span class="bm-growth__tooltip-row"><span class="bm-growth__swatch is-left"></span>Left<strong>−{{ tip.day.left }}</strong></span>
        </div>
      }
    </div>

    <table class="bm-visually-hidden">
      <caption>{{ title() }}</caption>
      <thead><tr><th scope="col">Day</th><th scope="col">Joined</th><th scope="col">Left</th></tr></thead>
      <tbody>
        @for (day of days(); track day.date) {
          <tr><th scope="row">{{ day.label }}</th><td>{{ day.joined }}</td><td>{{ day.left }}</td></tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    .bm-growth { display: grid; gap: 12px; min-width: 0; }
    .bm-growth__head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 8px 16px; }
    .bm-growth__titles { display: grid; gap: 2px; }
    .bm-growth__titles h3 { font: var(--bm-text-subheading); }
    .bm-growth__titles p { font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); }
    .bm-growth__legend { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 0; padding: 0; list-style: none; }
    .bm-growth__legend li { display: inline-flex; align-items: center; gap: 6px; font: var(--bm-text-caption); color: var(--bm-text-2); }
    .bm-growth__legend strong { font: 650 13px/1.2 var(--bm-font-mono); color: var(--bm-text); }
    .bm-growth__net { padding-left: 16px; border-left: 1px solid var(--bm-border); }
    .bm-growth__swatch { width: 10px; height: 10px; flex-shrink: 0; border-radius: 3px; }
    .bm-growth__swatch.is-joined { background: var(--bm-chart-positive-pole); }
    .bm-growth__swatch.is-left { background: var(--bm-chart-negative-pole); }
    .bm-growth__plot { position: relative; height: 196px; min-width: 0; border-radius: var(--bm-radius-sm); outline: none; touch-action: pan-y; }
    .bm-growth__plot:focus-visible { box-shadow: var(--bm-focus-ring); }
    .bm-growth__plot svg { display: block; overflow: visible; }
    .bm-growth__grid line { stroke: var(--bm-chart-grid); stroke-width: 1; }
    .bm-growth__baseline { stroke: var(--bm-chart-axis); stroke-width: 1; }
    .bm-growth__tick { fill: var(--bm-chart-ink); font: 500 11px var(--bm-font-mono); }
    .bm-growth__band { fill: var(--bm-surface-3); animation: bm-fade 140ms var(--bm-ease-standard) both; }
    .bm-growth__day { transition: opacity var(--bm-duration-base) var(--bm-ease-standard); }
    .bm-growth__day.is-dim { opacity: 0.4; }
    .bm-growth__bar {
      transform-box: fill-box;
      animation: bm-growth-grow 620ms var(--bm-ease-emphasized) both;
      animation-delay: calc(var(--bm-i, 0) * 14ms + 60ms);
    }
    .bm-growth__bar.is-joined { fill: var(--bm-chart-positive-pole); transform-origin: bottom; }
    .bm-growth__bar.is-left { fill: var(--bm-chart-negative-pole); transform-origin: top; }
    @keyframes bm-growth-grow { from { transform: scaleY(0); } }
    .bm-growth__tooltip {
      position: absolute; top: 0; z-index: 2; display: grid; gap: 3px; min-width: 132px; padding: 8px 10px;
      border-radius: var(--bm-radius-sm); background: #0f1c2e; color: #f4f7fb; box-shadow: 0 8px 24px -10px rgba(8, 20, 38, 0.5);
      font: var(--bm-text-caption); pointer-events: none; transform: translateX(12px);
      transition: left 90ms linear;
      animation: bm-fade 140ms var(--bm-ease-standard) both;
    }
    .bm-growth__tooltip.is-flipped { transform: translateX(calc(-100% - 12px)); }
    .bm-growth__tooltip-date { margin-bottom: 2px; color: rgba(244, 247, 251, 0.64); font: 500 11px/1.3 var(--bm-font-mono); }
    .bm-growth__tooltip-row { display: flex; align-items: center; gap: 6px; }
    .bm-growth__tooltip-row strong { margin-left: auto; padding-left: 12px; font: 650 12px/1.3 var(--bm-font-mono); }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-growth' },
})
export class GrowthChart {
  readonly points = input.required<readonly GrowthPoint[]>();
  readonly title = input('Joins and leaves');
  readonly caption = input('People per day over the last 30 days');

  protected readonly height = HEIGHT;
  protected readonly top = TOP;
  protected readonly bottom = BOTTOM;
  protected readonly left = LEFT;
  protected readonly right = RIGHT;
  protected readonly formatNumber = formatNumber;

  private readonly plot = viewChild.required<ElementRef<HTMLElement>>('plot');
  protected readonly width = signal(0);
  protected readonly active = signal<number | null>(null);

  protected readonly totals = computed(() => {
    const joined = this.points().reduce((sum, point) => sum + point.subscribed, 0);
    const left = this.points().reduce((sum, point) => sum + point.unsubscribed, 0);
    return { joined, left, net: joined - left };
  });

  /** One scale for both directions; the side with less to show still keeps a little room. */
  protected readonly scale = computed(() => {
    const upper = niceCeiling(Math.max(1, ...this.points().map((point) => point.subscribed)));
    const lower = Math.max(niceCeiling(Math.max(0, ...this.points().map((point) => point.unsubscribed))), Math.ceil(upper * 0.25));
    const span = HEIGHT - TOP - BOTTOM;
    const unit = span / (upper + lower);
    return { upper, lower, unit, baseline: TOP + upper * unit };
  });

  protected readonly band = computed(() => (this.width() - LEFT - RIGHT) / Math.max(this.points().length, 1));

  protected readonly days = computed<Day[]>(() => {
    const { unit, baseline } = this.scale();
    const band = this.band();
    const bar = Math.max(2, Math.min(16, band * 0.62));
    return this.points().map((point, index) => {
      const x = LEFT + band * index + band / 2;
      return {
        date: point.date,
        label: format(parseISO(point.date), 'EEE d MMM'),
        joined: point.subscribed,
        left: point.unsubscribed,
        x,
        up: point.subscribed ? column(x - bar / 2, baseline, bar, -point.subscribed * unit) : null,
        down: point.unsubscribed ? column(x - bar / 2, baseline, bar, point.unsubscribed * unit) : null,
      };
    });
  });

  protected readonly axis = computed(() => {
    const days = this.days();
    if (days.length === 0) return [];
    const picks = days.length > 2 ? [0, Math.floor((days.length - 1) / 2), days.length - 1] : days.map((_, index) => index);
    return picks.map((index, position) => ({
      date: days[index].date,
      x: days[index].x,
      label: format(parseISO(days[index].date), 'd MMM'),
      anchor: position === 0 && picks.length > 1 ? 'start' : position === picks.length - 1 && picks.length > 1 ? 'end' : 'middle',
    }));
  });

  protected readonly tooltip = computed(() => {
    const index = this.active();
    if (index === null) return null;
    const day = this.days()[index];
    if (!day) return null;
    return { day, left: day.x, flipped: day.x > this.width() - 160 };
  });

  protected readonly summary = computed(() => {
    const { joined, left, net } = this.totals();
    return `${this.title()}: ${joined} joined and ${left} left over ${this.points().length} days, net ${this.signed(net)}. Use the arrow keys to read each day.`;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const element = this.plot().nativeElement;
      const observer = new ResizeObserver(() => this.width.set(element.clientWidth));
      observer.observe(element);
      this.width.set(element.clientWidth);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected signed(value: number): string {
    return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatNumber(Math.abs(value))}`;
  }

  protected point(event: PointerEvent): void {
    const bounds = this.plot().nativeElement.getBoundingClientRect();
    const index = Math.floor((event.clientX - bounds.left - LEFT) / this.band());
    this.active.set(index >= 0 && index < this.points().length ? index : null);
  }

  protected step(event: KeyboardEvent): void {
    const last = this.points().length - 1;
    const current = this.active();
    const next =
      event.key === 'ArrowRight' ? Math.min((current ?? -1) + 1, last)
      : event.key === 'ArrowLeft' ? Math.max((current ?? last + 1) - 1, 0)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : event.key === 'Escape' ? null
      : undefined;
    if (next === undefined) return;
    event.preventDefault();
    this.active.set(next);
  }
}

/** A bar anchored to the baseline, with its free end rounded and its base square. */
function column(x: number, baseline: number, width: number, length: number): string {
  const r = Math.min(4, width / 2, Math.abs(length));
  const end = baseline + length;
  const direction = Math.sign(length);
  return [
    `M${x},${baseline}`,
    `V${end - direction * r}`,
    `Q${x},${end} ${x + r},${end}`,
    `H${x + width - r}`,
    `Q${x + width},${end} ${x + width},${end - direction * r}`,
    `V${baseline}`,
    'Z',
  ].join(' ');
}

/** 1, 2 or 5 times a power of ten, so the scale labels are round numbers. */
function niceCeiling(value: number): number {
  if (value <= 0) return 0;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * exponent;
}
