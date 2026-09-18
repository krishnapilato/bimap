import { Directive, ElementRef, effect, inject, input } from '@angular/core';

import { formatNumber } from '../../core/ui/format';
import { Motion } from '../../core/ui/motion';

/** Rolls a figure to its new value instead of swapping digits, so a change is seen, not missed. */
@Directive({ selector: '[bmCountUp]' })
export class CountUp {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly motion = inject(Motion);
  private previous = 0;

  readonly bmCountUp = input.required<number | null | undefined>();
  readonly bmCountUpFormat = input<(value: number) => string>(formatNumber);

  constructor() {
    effect(() => {
      const value = this.bmCountUp();
      const format = this.bmCountUpFormat();
      if (value == null) {
        this.element.textContent = '—';
        return;
      }
      this.motion.countTo(this.element, value, format, this.previous);
      this.previous = value;
    });
  }
}
