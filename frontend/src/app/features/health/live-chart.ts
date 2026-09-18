import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import uPlot from 'uplot';

export interface ChartSeries {
  key: string;
  label: string;
  /** A categorical palette slot, `--bm-chart-1` to `--bm-chart-8`, assigned in a fixed order. */
  color: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

export interface ChartSample {
  /** Epoch seconds. */
  at: number;
  values: Record<string, number | null>;
}

interface Hover {
  left: number;
  top: number;
  time: string;
  rows: Array<{ label: string; color: string; value: string }>;
}

/**
 * A live line chart: one y axis, thin 2px lines, a legend with the latest reading of each series,
 * and a crosshair with every value at that moment. New samples slide in at the right.
 */
@Component({
  selector: 'bm-live-chart',
  template: `
    <header class="bm-live-chart__head">
      <div class="bm-live-chart__titles">
        <h3>{{ title() }}</h3>
        @if (caption()) {
          <p>{{ caption() }}</p>
        }
      </div>
      <ul class="bm-live-chart__legend" aria-label="Latest readings">
        @for (entry of legend(); track entry.key) {
          <li>
            <span class="bm-live-chart__swatch" [style.background]="entry.color"></span>
            <span class="bm-live-chart__series">{{ entry.label }}</span>
            <strong class="bm-numeric">{{ entry.value }}</strong>
          </li>
        }
      </ul>
    </header>
    <div class="bm-live-chart__plot" #plot role="img" [attr.aria-label]="title() + ' over the last few minutes'">
      @if (hover(); as point) {
        <div class="bm-live-chart__tooltip" [style.left.px]="point.left" [style.top.px]="point.top">
          <span class="bm-live-chart__time">{{ point.time }}</span>
          @for (row of point.rows; track row.label) {
            <span class="bm-live-chart__row">
              <span class="bm-live-chart__swatch" [style.background]="row.color"></span>
              {{ row.label }}
              <strong class="bm-numeric">{{ row.value }}</strong>
            </span>
          }
        </div>
      }
      @if (samples().length < 2) {
        <span class="bm-live-chart__waiting">Collecting readings…</span>
      }
    </div>
  `,
  styleUrl: './live-chart.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-live-chart' },
})
export class LiveChart {
  readonly title = input.required<string>();
  readonly caption = input<string>();
  readonly series = input.required<readonly ChartSeries[]>();
  readonly samples = input.required<readonly ChartSample[]>();
  readonly format = input<(value: number) => string>((value) => value.toFixed(0));
  /** The lowest top of the y axis, so a quiet service does not look like a busy one. */
  readonly minimum = input(1);

  private readonly plot = viewChild.required<ElementRef<HTMLElement>>('plot');
  private chart: uPlot | null = null;
  protected readonly hover = signal<Hover | null>(null);
  private colors: Record<number, string> = {};

  protected readonly legend = computed(() => {
    const latest = this.samples().at(-1);
    return this.series().map((series) => {
      const value = latest?.values[series.key];
      return {
        key: series.key,
        label: series.label,
        color: `var(--bm-chart-${series.color})`,
        value: value == null ? '—' : this.format()(value),
      };
    });
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const element = this.plot().nativeElement;
      const styles = getComputedStyle(element);
      for (let slot = 1; slot <= 8; slot++) this.colors[slot] = styles.getPropertyValue(`--bm-chart-${slot}`).trim();
      const grid = styles.getPropertyValue('--bm-chart-grid').trim();
      const ink = styles.getPropertyValue('--bm-chart-ink').trim();

      this.chart = new uPlot(this.options(element.clientWidth, element.clientHeight, grid, ink), this.data(), element);

      const observer = new ResizeObserver(() => {
        if (element.clientWidth > 0) this.chart?.setSize({ width: element.clientWidth, height: element.clientHeight });
      });
      observer.observe(element);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        this.chart?.destroy();
      });
    });

    effect(() => {
      const data = this.data();
      this.chart?.setData(data, true);
    });
  }

  private data(): uPlot.AlignedData {
    const samples = this.samples();
    return [samples.map((sample) => sample.at), ...this.series().map((series) => samples.map((sample) => sample.values[series.key] ?? null))];
  }

  private options(width: number, height: number, grid: string, ink: string): uPlot.Options {
    const font = '500 11px "Manrope Variable", Manrope, system-ui, sans-serif';
    return {
      width,
      height,
      padding: [10, 6, 0, 0],
      legend: { show: false },
      cursor: { drag: { x: false, y: false, setScale: false }, points: { size: 8, width: 2 } },
      scales: {
        x: { time: true },
        y: { range: (_chart, _min, max) => [0, Math.max(this.minimum(), niceCeiling(max))] },
      },
      axes: [
        {
          stroke: ink,
          font,
          grid: { show: false },
          ticks: { show: false },
          space: 90,
          values: (_chart, ticks) => ticks.map((tick) => new Date(tick * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
        },
        {
          stroke: ink,
          font,
          size: 52,
          gap: 6,
          grid: { stroke: grid, width: 1 },
          ticks: { show: false },
          space: 36,
          values: (_chart, ticks) => ticks.map((tick) => this.format()(tick)),
        },
      ],
      series: [
        {},
        ...this.series().map((series) => ({
          label: series.label,
          stroke: this.colors[series.color],
          width: 2,
          spanGaps: true,
          points: { show: false },
        })),
      ],
      hooks: {
        setCursor: [(chart: uPlot) => this.onCursor(chart)],
      },
    };
  }

  private onCursor(chart: uPlot): void {
    const index = chart.cursor.idx;
    const left = chart.cursor.left ?? -1;
    if (index == null || left < 0) {
      this.hover.set(null);
      return;
    }
    const at = chart.data[0][index];
    this.hover.set({
      left: Math.min(left + 14, chart.over.clientWidth - 150),
      top: Math.max((chart.cursor.top ?? 0) - 12, 4),
      time: new Date(at * 1000).toLocaleTimeString('en-GB'),
      rows: this.series().map((series, position) => {
        const value = chart.data[position + 1][index];
        return { label: series.label, color: this.colors[series.color], value: value == null ? '—' : this.format()(value) };
      }),
    });
  }
}

/** Rounds a maximum up to 1, 2 or 5 times a power of ten, so axis labels are round numbers. */
function niceCeiling(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * exponent * 1.1;
}
