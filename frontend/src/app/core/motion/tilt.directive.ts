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
 * Parallax tilt for a card-sized surface.
 *
 * Alongside the rotation the directive publishes `--bm-tilt-x` / `--bm-tilt-y`
 * as percentages, which stylesheets use to move a specular highlight across the
 * surface — the light and the geometry then agree, which is what sells the
 * effect. Layers marked `data-tilt-depth` float at their own rate.
 */
@Directive({
  selector: '[bmTilt]',
  standalone: true,
  host: { class: 'bm-tilt' },
})
export class TiltDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly motion = inject(MotionService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  /** Maximum rotation in degrees on each axis. */
  readonly amount = input(6, { alias: 'bmTilt', transform: numberAttribute });

  constructor() {
    afterNextRender(() => this.attach());
  }

  private attach(): void {
    const element = this.host.nativeElement;

    if (!this.motion.enabled()) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const layers = Array.from(element.querySelectorAll<HTMLElement>('[data-tilt-depth]'));

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const amount = this.amount();

      gsap.to(element, {
        rotateY: (px - 0.5) * amount * 2,
        rotateX: (0.5 - py) * amount * 2,
        transformPerspective: 1100,
        transformOrigin: 'center',
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto',
        '--bm-tilt-x': `${(px * 100).toFixed(1)}%`,
        '--bm-tilt-y': `${(py * 100).toFixed(1)}%`,
      });

      for (const layer of layers) {
        const depth = Number(layer.dataset['tiltDepth'] ?? 1);

        gsap.to(layer, {
          x: (px - 0.5) * depth * 26,
          y: (py - 0.5) * depth * 26,
          duration: 0.8,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    const onLeave = () => {
      gsap.to(element, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.9,
        ease: 'elastic.out(1, 0.6)',
        overwrite: 'auto',
      });

      gsap.to(layers, { x: 0, y: 0, duration: 0.9, ease: 'power3.out', overwrite: 'auto' });
    };

    this.zone.runOutsideAngular(() => {
      element.addEventListener('pointermove', onMove);
      element.addEventListener('pointerleave', onLeave);
    });

    this.destroyRef.onDestroy(() => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf([element, ...layers]);
    });
  }
}
