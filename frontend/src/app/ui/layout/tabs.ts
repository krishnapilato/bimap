import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
  inject,
  input,
  model,
  signal,
  viewChildren,
} from '@angular/core';

import { formatNumber } from '../../core/ui/format';
import { Icon } from '../icon/icon';
import { Ripple } from '../interaction/ripple';

export interface TabOption<T extends string = string> {
  value: T;
  label: string;
  icon?: string;
  count?: number | null;
}

/**
 * The sections of one object, as tabs. The underline glides to the chosen tab and stretches to its
 * width; the arrow keys, Home and End move between tabs the way a tab list is expected to behave.
 * Panels are the consumer's: give each `role="tabpanel"` and `aria-labelledby="bm-tab-{value}"`.
 */
@Component({
  selector: 'bm-tabs',
  imports: [Icon, Ripple],
  template: `
    @for (tab of tabs(); track tab.value; let i = $index) {
      <button
        #tab
        type="button"
        role="tab"
        bmRipple
        class="bm-tabs__tab"
        [id]="'bm-tab-' + tab.value"
        [class.is-selected]="tab.value === value()"
        [attr.aria-selected]="tab.value === value()"
        [attr.tabindex]="tab.value === value() ? 0 : -1"
        (click)="value.set(tab.value)"
        (keydown)="move($event, i)"
      >
        @if (tab.icon) {
          <svg [lucideIcon]="tab.icon" [size]="16"></svg>
        }
        <span>{{ tab.label }}</span>
        @if (tab.count != null) {
          <span class="bm-tabs__count bm-numeric">{{ formatNumber(tab.count) }}</span>
        }
      </button>
    }
    <span class="bm-tabs__ink" aria-hidden="true" [style.transform]="'translateX(' + ink().x + 'px)'" [style.width.px]="ink().width"></span>
  `,
  styles: `
    .bm-tabs {
      position: relative; display: flex; gap: 4px; min-width: 0; overflow-x: auto; scrollbar-width: none;
      border-bottom: 1px solid var(--bm-border);
    }
    .bm-tabs::-webkit-scrollbar { display: none; }
    .bm-tabs__tab {
      position: relative; display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; height: 44px; padding: 0 12px;
      border-radius: var(--bm-radius-sm) var(--bm-radius-sm) 0 0; overflow: hidden;
      font: var(--bm-text-small); font-weight: 600; color: var(--bm-text-2); white-space: nowrap;
      transition: color var(--bm-duration-fast) var(--bm-ease-standard), background-color var(--bm-duration-fast) var(--bm-ease-standard);
    }
    .bm-tabs__tab svg { color: var(--bm-text-3); transition: color var(--bm-duration-fast) var(--bm-ease-standard), transform var(--bm-duration-base) var(--bm-ease-spring); }
    @media (hover: hover) and (pointer: fine) {
      .bm-tabs__tab:hover { color: var(--bm-text); background: var(--bm-surface-hover); }
      .bm-tabs__tab:hover svg { transform: translateY(-1px); }
    }
    .bm-tabs__tab:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--bm-accent); }
    .bm-tabs__tab.is-selected { color: var(--bm-accent-text); }
    .bm-tabs__tab.is-selected svg { color: var(--bm-accent); }
    .bm-tabs__count {
      min-width: 22px; height: 20px; padding: 0 6px; border-radius: 999px; background: var(--bm-surface-3);
      font: 650 11px/20px var(--bm-font-mono); color: var(--bm-text-2); text-align: center;
      transition: background-color var(--bm-duration-base) var(--bm-ease-standard), color var(--bm-duration-base) var(--bm-ease-standard);
    }
    .is-selected .bm-tabs__count { background: var(--bm-accent-soft); color: var(--bm-accent-text); }
    .bm-tabs__ink {
      position: absolute; left: 0; bottom: -1px; height: 2px; border-radius: 2px 2px 0 0; background: var(--bm-accent);
      transition: transform var(--bm-duration-slow) var(--bm-ease-emphasized), width var(--bm-duration-slow) var(--bm-ease-emphasized);
    }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-tabs', role: 'tablist', '[attr.aria-label]': 'ariaLabel()' },
})
export class Tabs<T extends string = string> {
  readonly value = model.required<T>();
  readonly tabs = input.required<ReadonlyArray<TabOption<T>>>();
  readonly ariaLabel = input<string>();

  protected readonly formatNumber = formatNumber;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tab');
  protected readonly ink = signal({ x: 0, width: 0 });

  constructor() {
    afterRenderEffect(() => {
      const index = this.tabs().findIndex((tab) => tab.value === this.value());
      const element = this.buttons()[index]?.nativeElement;
      if (!element) return;
      this.ink.set({ x: element.offsetLeft + 8, width: Math.max(element.offsetWidth - 16, 12) });
      // Only the tab strip scrolls to reveal the chosen tab; the page itself never moves.
      const strip = this.host.nativeElement;
      const start = element.offsetLeft;
      const end = start + element.offsetWidth;
      if (start < strip.scrollLeft) strip.scrollTo({ left: start - 16, behavior: 'smooth' });
      else if (end > strip.scrollLeft + strip.clientWidth) strip.scrollTo({ left: end - strip.clientWidth + 16, behavior: 'smooth' });
    });
  }

  protected move(event: KeyboardEvent, index: number): void {
    const count = this.tabs().length;
    const target =
      event.key === 'ArrowRight' ? (index + 1) % count
      : event.key === 'ArrowLeft' ? (index - 1 + count) % count
      : event.key === 'Home' ? 0
      : event.key === 'End' ? count - 1
      : -1;
    if (target < 0) return;
    event.preventDefault();
    this.value.set(this.tabs()[target].value);
    this.buttons()[target]?.nativeElement.focus();
  }
}
