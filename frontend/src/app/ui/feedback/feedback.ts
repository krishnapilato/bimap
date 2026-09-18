import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, computed, input, output } from '@angular/core';

import { ApiError } from '../../core/api/api-error';
import { copyToClipboard } from '../../core/ui/files';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/** A placeholder with the shape of what is loading, shimmering so the wait reads as progress. */
@Component({
  selector: 'bm-skeleton',
  template: '',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bm-skeleton',
    'aria-hidden': 'true',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[attr.data-shape]': 'shape()',
  },
  styles: `
    .bm-skeleton {
      display: block;
      border-radius: var(--bm-radius-sm);
      background: linear-gradient(90deg, var(--bm-surface-3) 0%, #f6f8fb 42%, var(--bm-surface-3) 84%);
      background-size: 240% 100%;
      animation: bm-shimmer 1.6s var(--bm-ease-standard) infinite;
    }
    .bm-skeleton[data-shape='circle'] { border-radius: 50%; }
    .bm-skeleton[data-shape='text'] { height: 12px; border-radius: 6px; }
  `,
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('16px');
  readonly shape = input<'block' | 'circle' | 'text'>('block');
}

/** Nothing here yet — said kindly, with the one action that changes that. */
@Component({
  selector: 'bm-empty-state',
  imports: [Icon],
  template: `
    <div class="bm-empty__art" aria-hidden="true">
      <span class="bm-empty__ring"></span>
      <svg [lucideIcon]="icon()" [size]="26" [strokeWidth]="1.6"></svg>
    </div>
    <h3 class="bm-empty__title">{{ title() }}</h3>
    @if (description()) {
      <p class="bm-empty__text">{{ description() }}</p>
    }
    <div class="bm-empty__actions"><ng-content /></div>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-empty', '[attr.data-compact]': 'compact() || null' },
  styles: `
    .bm-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 6px; padding: 48px 24px; text-align: center;
      animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) both;
    }
    .bm-empty[data-compact] { padding: 28px 16px; }
    .bm-empty__art { position: relative; display: grid; place-items: center; width: 64px; height: 64px; margin-bottom: 10px; color: var(--bm-accent); }
    .bm-empty__art::before {
      content: ''; position: absolute; inset: 0; border-radius: 20px;
      background: linear-gradient(145deg, var(--bm-accent-soft), var(--bm-surface-2));
      box-shadow: inset 0 0 0 1px var(--bm-accent-border);
      transform: rotate(-6deg);
    }
    .bm-empty__art svg { position: relative; }
    .bm-empty__ring {
      position: absolute; inset: -8px; border-radius: 26px; border: 1px dashed var(--bm-border-strong);
      animation: bm-spin 24s linear infinite;
    }
    .bm-empty__title { font: var(--bm-text-heading); color: var(--bm-text); }
    .bm-empty__text { max-width: 44ch; font: var(--bm-text-small); color: var(--bm-text-2); }
    .bm-empty__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 12px; }
    .bm-empty__actions:empty { display: none; }
  `,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly compact = input(false, { transform: booleanAttribute });
}

/** A failed load, with what went wrong, a way to try again, and a reference for support. */
@Component({
  selector: 'bm-error-state',
  imports: [Icon, Button],
  template: `
    <div class="bm-error__icon" aria-hidden="true">
      <svg [lucideIcon]="failure().isNetworkFailure ? 'wifi-off' : 'triangle-alert'" [size]="22"></svg>
    </div>
    <div class="bm-error__body">
      <h3 class="bm-error__title">{{ title() }}</h3>
      <p class="bm-error__text">{{ failure().message }}</p>
      @if (failure().correlationId; as reference) {
        <button type="button" class="bm-error__reference" (click)="copy(reference)">
          Reference <span class="bm-mono">{{ reference.slice(0, 8) }}</span>
          <svg lucideIcon="copy" [size]="12"></svg>
        </button>
      }
    </div>
    <button bmButton size="sm" type="button" (click)="retry.emit()">
      <svg lucideIcon="rotate-ccw"></svg>
      Try again
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-error', role: 'alert' },
  styles: `
    .bm-error {
      display: flex; align-items: center; gap: 14px; padding: 16px;
      border: 1px solid var(--bm-negative-border); border-radius: var(--bm-radius-lg);
      background: linear-gradient(0deg, var(--bm-negative-soft), var(--bm-surface) 140%);
      animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) both;
    }
    .bm-error__icon { display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; border-radius: 12px; background: var(--bm-surface); color: var(--bm-negative); box-shadow: var(--bm-shadow-xs); }
    .bm-error__body { flex: 1; min-width: 0; display: grid; gap: 2px; }
    .bm-error__title { font: var(--bm-text-subheading); }
    .bm-error__text { font: var(--bm-text-small); color: var(--bm-text-2); }
    .bm-error__reference { justify-self: start; display: inline-flex; align-items: center; gap: 5px; margin-top: 2px; font: var(--bm-text-caption); color: var(--bm-text-3); }
    .bm-error__reference:hover { color: var(--bm-text); }
    @media (max-width: 600px) { .bm-error { flex-wrap: wrap; } }
  `,
})
export class ErrorState {
  readonly error = input.required<unknown>();
  readonly title = input('This could not be loaded');
  readonly retry = output<void>();

  protected readonly failure = computed(() => ApiError.from(this.error()));

  protected copy(reference: string): void {
    void copyToClipboard(reference, 'Reference copied');
  }
}

export type StripTone = 'info' | 'positive' | 'critical' | 'negative';

const STRIP_ICONS: Record<StripTone, string> = {
  info: 'info',
  positive: 'circle-check',
  critical: 'triangle-alert',
  negative: 'circle-alert',
};

/** An inline message that belongs to the content around it, not a toast that vanishes. */
@Component({
  selector: 'bm-message-strip',
  imports: [Icon],
  template: `
    <svg class="bm-strip__icon" [lucideIcon]="icon() ?? iconFor()" [size]="18" aria-hidden="true"></svg>
    <div class="bm-strip__body"><ng-content /></div>
    <div class="bm-strip__actions"><ng-content select="[bmStripAction]" /></div>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-strip', '[attr.data-tone]': 'tone()', role: 'status' },
  styles: `
    .bm-strip {
      --bm-strip-fg: var(--bm-accent-text); --bm-strip-bg: var(--bm-accent-softer); --bm-strip-border: var(--bm-accent-border);
      display: flex; flex-wrap: wrap; align-items: flex-start; gap: 10px; padding: 11px 14px;
      border: 1px solid var(--bm-strip-border); border-left-width: 3px; border-radius: var(--bm-radius-md);
      background: var(--bm-strip-bg); font: var(--bm-text-small); color: var(--bm-text);
      animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) both;
    }
    .bm-strip[data-tone='positive'] { --bm-strip-fg: var(--bm-positive); --bm-strip-bg: var(--bm-positive-soft); --bm-strip-border: var(--bm-positive-border); }
    .bm-strip[data-tone='critical'] { --bm-strip-fg: var(--bm-critical); --bm-strip-bg: var(--bm-critical-soft); --bm-strip-border: var(--bm-critical-border); }
    .bm-strip[data-tone='negative'] { --bm-strip-fg: var(--bm-negative); --bm-strip-bg: var(--bm-negative-soft); --bm-strip-border: var(--bm-negative-border); }
    .bm-strip__icon { flex-shrink: 0; margin-top: 1px; color: var(--bm-strip-fg); }
    .bm-strip__body { flex: 1 1 200px; min-width: 0; }
    .bm-strip__body strong { font-weight: 650; }
    .bm-strip__actions { display: flex; gap: 6px; align-self: center; margin-left: auto; }
    .bm-strip__actions:empty { display: none; }
  `,
})
export class MessageStrip {
  readonly tone = input<StripTone>('info');
  readonly icon = input<string>();
  protected readonly iconFor = computed(() => STRIP_ICONS[this.tone()]);
}
