import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { gsap } from 'gsap';

import { MotionService } from './motion.service';

/**
 * Scroll-linked drift. A positive depth lags the scroll (the layer sits back),
 * a negative depth outruns it (the layer sits forward).
 *
 * `scrub` ties the tween to scroll position rather than to time, so the layer
 * tracks the reader's own movement — the effect disappears the moment they stop,
 * which is what keeps it from feeling like decoration.
 */
@Directive({
  selector: '[bmParallax]',
  standalone: true,
})
export class ParallaxDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly motion = inject(MotionService);
  private readonly destroyRef = inject(DestroyRef);

  /** Drift distance in pixels across the element's full scroll pass. */
  readonly depth = input(60, { alias: 'bmParallax', transform: numberAttribute });

  /** Optional rotation applied over the same range, in degrees. */
  readonly spin = input(0, { alias: 'bmParallaxSpin', transform: numberAttribute });

  readonly scale = input(1, { alias: 'bmParallaxScale', transform: numberAttribute });

  constructor() {
    afterNextRender(() => {
      if (!this.motion.enabled()) return;

      const element = this.host.nativeElement;

      const context = gsap.context(() => {
        gsap.to(element, {
          y: this.depth(),
          rotate: this.spin(),
          scale: this.scale(),
          ease: 'none',
          scrollTrigger: {
            trigger: element,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.8,
          },
        });
      }, element);

      this.destroyRef.onDestroy(() => context.revert());
    });
  }
}
