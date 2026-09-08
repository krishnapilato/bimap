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
 * Typographic entrance: the headline assembles character by character from
 * below its own baseline, each letter rotating up as though set into place.
 *
 * Reserved for one heading per screen. Applied to body copy it becomes noise,
 * and it costs a span per character — which is also why the split is one-shot
 * and reverted on destroy.
 */
@Directive({
  selector: '[bmSplitText]',
  standalone: true,
  host: { class: 'bm-split' },
})
export class SplitTextDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly motion = inject(MotionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly delay = input(0, { alias: 'bmSplitText', transform: numberAttribute });

  readonly stagger = input(0.018, { alias: 'bmSplitStagger', transform: numberAttribute });

  constructor() {
    afterNextRender(() => this.play());
  }

  private play(): void {
    const element = this.host.nativeElement;

    if (!this.motion.enabled()) return;

    // Only split leaf text. A heading with markup inside (a <br>, an <em>)
    // animates as whole lines instead, which keeps its structure intact.
    const hasMarkup = Array.from(element.childNodes).some((node) => node.nodeType !== Node.TEXT_NODE);

    if (hasMarkup) {
      gsap.from(element, {
        opacity: 0,
        y: 26,
        duration: 1,
        delay: this.delay(),
        ease: 'bmGlide',
      });
      return;
    }

    const characters = this.motion.splitChars(element);

    gsap.from(characters, {
      opacity: 0,
      yPercent: 108,
      rotateX: -72,
      transformOrigin: '50% 100%',
      duration: 0.85,
      delay: this.delay(),
      ease: 'bmArrive',
      stagger: this.stagger(),
    });

    this.destroyRef.onDestroy(() => {
      gsap.killTweensOf(characters);
      this.motion.restoreText(element);
    });
  }
}
