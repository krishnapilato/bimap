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

/** Where the element travels in from. */
export type RevealFrom = 'up' | 'down' | 'left' | 'right' | 'scale' | 'mask' | 'none';

const OFFSETS: Record<RevealFrom, gsap.TweenVars> = {
  up: { y: 34 },
  down: { y: -28 },
  left: { x: -36 },
  right: { x: 36 },
  scale: { scale: 0.94, y: 18 },
  mask: { y: 26, clipPath: 'inset(0 0 100% 0)' },
  none: {},
};

/**
 * The entrance primitive.
 *
 * Everything that should arrive rather than simply appear carries this. It
 * fires once, when the element first reaches the lower edge of the viewport, so
 * content above the fold animates on load and content below animates as the
 * reader gets to it — one directive, no separate "on scroll" variant.
 *
 *   <section bmReveal>…</section>
 *   <ul bmReveal="left" bmRevealChildren="li" bmRevealStagger="0.06">…</ul>
 */
@Directive({
  selector: '[bmReveal]',
  standalone: true,
})
export class RevealDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly motion = inject(MotionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly bmReveal = input<RevealFrom | ''>('');

  /** Seconds to hold before the element starts moving. */
  readonly delay = input(0, { alias: 'bmRevealDelay', transform: numberAttribute });

  /** Optional child selector — when set, the children stagger instead of the host. */
  readonly children = input('', { alias: 'bmRevealChildren' });

  readonly stagger = input(0.07, { alias: 'bmRevealStagger', transform: numberAttribute });

  readonly duration = input(0.9, { alias: 'bmRevealDuration', transform: numberAttribute });

  constructor() {
    afterNextRender(() => {
      const context = this.play();

      if (context) this.destroyRef.onDestroy(() => context.revert());
    });
  }

  private play(): gsap.Context | undefined {
    const element = this.host.nativeElement;
    const direction = (this.bmReveal() || 'up') as RevealFrom;
    const selector = this.children();

    const targets: HTMLElement[] = selector
      ? Array.from(element.querySelectorAll<HTMLElement>(selector))
      : [element];

    if (!targets.length) return undefined;

    if (!this.motion.enabled()) {
      gsap.set(targets, { opacity: 1, x: 0, y: 0, scale: 1, clipPath: 'none' });
      return undefined;
    }

    return gsap.context(() => {
      gsap.set(targets, { opacity: 0, ...OFFSETS[direction], willChange: 'transform, opacity' });

      gsap.to(targets, {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        ...(direction === 'mask' ? { clipPath: 'inset(0 0 0% 0)' } : {}),
        duration: this.duration(),
        delay: this.delay(),
        ease: 'bmGlide',
        stagger: selector ? this.stagger() : 0,
        clearProps: 'willChange,clipPath',
        scrollTrigger: {
          trigger: element,
          // Elements already on screen satisfy this immediately, so above-the-fold
          // content animates on load rather than waiting for a scroll event.
          start: 'top 92%',
          once: true,
        },
      });
    }, element);
  }
}
