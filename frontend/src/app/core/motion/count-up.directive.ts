import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { gsap } from 'gsap';

import { MotionService } from './motion.service';

/**
 * Counts a number up to its value when it scrolls into view, and re-counts from
 * wherever it currently reads whenever the bound value changes.
 *
 * Used for the admin stat tiles and the record count: a figure that arrives by
 * tallying tells the reader it was measured, and it draws the eye to the one
 * that changed after a delete or a save.
 */
@Directive({
  selector: '[bmCountUp]',
  standalone: true,
})
export class CountUpDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly motion = inject(MotionService);
  private readonly destroyRef = inject(DestroyRef);

  private ready = false;
  private displayed = 0;

  readonly value = input(0, { alias: 'bmCountUp', transform: numberAttribute });

  /** Decimal places to render; coordinates use 4, counts use 0. */
  readonly decimals = input(0, { alias: 'bmCountUpDecimals', transform: numberAttribute });

  readonly suffix = input('', { alias: 'bmCountUpSuffix' });

  constructor() {
    // Render the value immediately so the figure is never blank or wrong for a
    // frame — the entrance tween then re-runs it from zero.
    effect(() => {
      const target = this.value();

      if (!this.ready) {
        this.paint(target);
        return;
      }

      this.run(this.displayed, target);
    });

    afterNextRender(() => {
      this.ready = true;
      this.run(0, this.value(), { trigger: true });
    });

    this.destroyRef.onDestroy(() => gsap.killTweensOf(this));
  }

  private paint(value: number): void {
    this.displayed = value;
    this.host.nativeElement.textContent = `${value.toFixed(this.decimals())}${this.suffix()}`;
  }

  private run(from: number, to: number, options: { trigger?: boolean } = {}): void {
    if (!this.motion.enabled() || from === to) {
      this.paint(to);
      return;
    }

    const counter = { value: from };
    this.paint(from);

    gsap.to(counter, {
      value: to,
      duration: 1.1,
      ease: 'bmInstrument',
      onUpdate: () => this.paint(counter.value),
      onComplete: () => this.paint(to),
      ...(options.trigger
        ? { scrollTrigger: { trigger: this.host.nativeElement, start: 'top 95%', once: true } }
        : {}),
    });
  }
}
