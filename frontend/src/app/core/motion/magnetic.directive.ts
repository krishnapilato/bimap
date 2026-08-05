import {
  DestroyRef,
  Directive,
  ElementRef,
  NgZone,
  afterNextRender,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { gsap } from 'gsap';

import { MotionService } from './motion.service';

/**
 * Gives a control a small gravitational pull toward the cursor.
 *
 * The effect is deliberately under-tuned — a few pixels, quick to release — so
 * primary actions feel responsive to approach without turning into a toy. It
 * is skipped entirely on coarse pointers, where there is no hover to track.
 *
 * A `.bm-magnetic-label` child, if present, moves at a fraction of the host's
 * displacement, which reads as depth rather than the whole button sliding.
 */
@Directive({
  selector: '[bmMagnetic]',
  standalone: true,
  host: { class: 'bm-magnetic' },
})
export class MagneticDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly motion = inject(MotionService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  /** Maximum displacement in pixels. */
  readonly strength = input(9, { alias: 'bmMagnetic', transform: numberAttribute });

  constructor() {
    afterNextRender(() => this.attach());
  }

  private attach(): void {
    const element = this.host.nativeElement;

    if (!this.motion.enabled()) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const label = element.querySelector<HTMLElement>('.bm-magnetic-label');

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const strength = this.strength();

      // Normalised −1…1 offset from the centre of the control.
      const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

      gsap.to(element, {
        x: dx * strength,
        y: dy * strength,
        duration: 0.5,
        ease: 'power3.out',
        overwrite: 'auto',
      });

      if (label) {
        gsap.to(label, {
          x: dx * strength * 0.4,
          y: dy * strength * 0.4,
          duration: 0.6,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      }
    };

    const onLeave = () => {
      gsap.to(label ? [element, label] : element, {
        x: 0,
        y: 0,
        duration: 0.7,
        ease: 'elastic.out(1, 0.5)',
        overwrite: 'auto',
      });
    };

    // Pointer tracking must not schedule change detection on every frame.
    this.zone.runOutsideAngular(() => {
      element.addEventListener('pointermove', onMove);
      element.addEventListener('pointerleave', onLeave);
    });

    this.destroyRef.onDestroy(() => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf(element);
    });
  }
}
