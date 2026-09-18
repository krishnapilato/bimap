import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
  input,
  model,
  signal,
  viewChildren,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

import { Icon } from '../icon/icon';
import { Ripple } from '../interaction/ripple';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  icon?: string;
  count?: number | null;
}

/**
 * A handful of mutually exclusive choices, with one thumb that glides to the chosen one instead
 * of the highlight blinking from button to button.
 */
@Component({
  selector: 'bm-segmented',
  imports: [Icon, Ripple],
  template: `
    <span class="bm-segmented__thumb" aria-hidden="true" [style.transform]="'translateX(' + thumb().x + 'px)'" [style.width.px]="thumb().width"></span>
    @for (option of options(); track option.value) {
      <button
        #segment
        type="button"
        role="radio"
        bmRipple
        class="bm-segmented__option"
        [attr.aria-checked]="option.value === value()"
        [class.is-selected]="option.value === value()"
        [disabled]="disabled()"
        (click)="value.set(option.value)"
      >
        @if (option.icon) {
          <svg [lucideIcon]="option.icon" [size]="15"></svg>
        }
        @if (!iconsOnly() || !option.icon) {
          <span>{{ option.label }}</span>
        } @else {
          <span class="bm-visually-hidden">{{ option.label }}</span>
        }
        @if (option.count != null) {
          <span class="bm-segmented__count bm-numeric">{{ option.count }}</span>
        }
      </button>
    }
  `,
  styleUrl: './segmented.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-segmented', role: 'radiogroup', '[attr.data-size]': 'size()', '[attr.aria-label]': 'ariaLabel()' },
})
export class Segmented<T extends string = string> implements FormValueControl<T> {
  readonly value = model.required<T>();
  readonly options = input.required<ReadonlyArray<SegmentOption<T>>>();
  readonly disabled = input(false);
  readonly size = input<'sm' | 'md'>('md');
  readonly iconsOnly = input(false);
  readonly ariaLabel = input<string>();

  private readonly segments = viewChildren<ElementRef<HTMLButtonElement>>('segment');
  protected readonly thumb = signal({ x: 0, width: 0 });

  constructor() {
    afterRenderEffect(() => {
      const index = this.options().findIndex((option) => option.value === this.value());
      const element = this.segments()[index]?.nativeElement;
      if (!element) return;
      this.thumb.set({ x: element.offsetLeft, width: element.offsetWidth });
    });
  }
}
