/**
 * The GSAP layer: entrances, and nothing else.
 *
 * Motion here confirms that something arrived — a panel fading up, a number counting once, the map
 * flying to a new selection. It never performs. There is deliberately no pinning and no scrubbing:
 * scroll-driven choreography reads well in a portfolio video and badly in a tool somebody uses all
 * day, and it was the largest single source of layout bugs in the previous build.
 *
 * Anything animated starts at `opacity: 0` via `.bm-reveal`, so there is never a flash of finished
 * layout before the timeline takes over. If the visitor asked for reduced motion, the directives set
 * the final state immediately and register nothing.
 *
 * @author Khova Krishna Pilato
 */

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
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Refreshes every trigger once the router has swapped a view in and the layout has settled. */
export function refreshScrollTriggers(): void {
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

type RevealFrom = 'up' | 'down' | 'left' | 'right' | 'scale';

const ENTRY: Record<RevealFrom, gsap.TweenVars> = {
  up: { y: 20, opacity: 0 },
  down: { y: -20, opacity: 0 },
  left: { x: -24, opacity: 0 },
  right: { x: 24, opacity: 0 },
  scale: { scale: 0.97, opacity: 0 },
};

/**
 * Reveals one element as it enters the viewport.
 *
 * ```html
 * <section bmReveal="up" [delay]="0.1">…</section>
 * ```
 */
@Directive({ selector: '[bmReveal]', host: { class: 'bm-reveal' } })
export class RevealDirective {
  readonly from = input<RevealFrom>('up', { alias: 'bmReveal' });
  readonly delay = input(0, { transform: numberAttribute });

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const element = this.#host.nativeElement;

      if (prefersReducedMotion()) {
        gsap.set(element, { opacity: 1, x: 0, y: 0, scale: 1 });
        return;
      }

      const tween = gsap.fromTo(element, ENTRY[this.from()], {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 0.55,
        delay: this.delay(),
        ease: 'power3.out',
        scrollTrigger: {
          trigger: element,
          start: 'top 94%',
          // Plays once. A panel that fades itself out again on the way back up looks broken the
          // second time you see it.
          toggleActions: 'play none none none',
        },
      });

      destroyRef.onDestroy(() => {
        tween.scrollTrigger?.kill();
        tween.kill();
      });
    });
  }
}

/**
 * Staggers the direct children of the host as the group enters.
 *
 * ```html
 * <div bmStagger [stagger]="0.05">…rows…</div>
 * ```
 */
@Directive({ selector: '[bmStagger]' })
export class StaggerDirective {
  readonly stagger = input(0.05, { transform: numberAttribute });

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const children = Array.from(this.#host.nativeElement.children) as HTMLElement[];
      if (children.length === 0) {
        return;
      }

      if (prefersReducedMotion()) {
        gsap.set(children, { opacity: 1, y: 0 });
        return;
      }

      const tween = gsap.fromTo(
        children,
        { y: 14, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.45,
          ease: 'power3.out',
          stagger: this.stagger(),
          scrollTrigger: {
            trigger: this.#host.nativeElement,
            start: 'top 94%',
            toggleActions: 'play none none none',
          },
        },
      );

      destroyRef.onDestroy(() => {
        tween.scrollTrigger?.kill();
        tween.kill();
      });
    });
  }
}

/** Counts a number up when it first arrives, and holds the value afterwards. */
@Directive({ selector: '[bmCountUp]' })
export class CountUpDirective {
  readonly value = input.required<number>({ alias: 'bmCountUp' });
  readonly decimals = input(0, { transform: numberAttribute });

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const element = this.#host.nativeElement;
      const target = this.value();
      const render = (n: number) => {
        element.textContent = n.toLocaleString('en-GB', {
          minimumFractionDigits: this.decimals(),
          maximumFractionDigits: this.decimals(),
        });
      };

      if (prefersReducedMotion()) {
        render(target);
        return;
      }

      const counter = { n: 0 };
      const tween = gsap.to(counter, {
        n: target,
        duration: 1.1,
        ease: 'power2.out',
        onUpdate: () => render(counter.n),
        scrollTrigger: { trigger: element, start: 'top 96%', toggleActions: 'play none none none' },
      });

      destroyRef.onDestroy(() => {
        tween.scrollTrigger?.kill();
        tween.kill();
      });
    });
  }
}

export const MOTION_DIRECTIVES = [RevealDirective, StaggerDirective, CountUpDirective] as const;
