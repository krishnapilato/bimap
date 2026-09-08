import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { gsap } from 'gsap';

import { MotionService } from '../core/motion';

/**
 * The panel beside the sign-in and registration forms.
 *
 * Rather than a stock illustration, it runs a continuous survey: a marker
 * travels a route across the plate while the coordinate readout tracks its real
 * position, and the checklist below signs off one item at a time. It is a
 * thirty-second loop of what the product actually does, which is a better
 * argument for signing in than a photograph would be.
 */
@Component({
  selector: 'bm-access-console',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access-console.html',
  styleUrl: './access-console.scss',
})
export class AccessConsoleComponent {
  private readonly motion = inject(MotionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly route = viewChild<ElementRef<SVGPathElement>>('routePath');
  private readonly probe = viewChild<ElementRef<HTMLElement>>('probe');
  private readonly latitude = viewChild<ElementRef<HTMLElement>>('latitude');
  private readonly longitude = viewChild<ElementRef<HTMLElement>>('longitude');

  readonly checks = [
    { icon: 'lock', label: 'Encrypted session' },
    { icon: 'verified_user', label: 'Authorized access' },
    { icon: 'cloud_sync', label: 'Register synchronized' },
  ];

  constructor() {
    afterNextRender(() => this.run());
  }

  private run(): void {
    if (!this.motion.enabled()) return;

    const context = gsap.context(() => {
      this.assemble();
      this.survey();
    }, this.host.nativeElement);

    this.destroyRef.onDestroy(() => context.revert());
  }

  /** One-off entrance: the plate builds itself before the survey starts. */
  private assemble(): void {
    const path = this.route()?.nativeElement;

    const timeline = this.motion.timeline({ delay: 0.35 });

    timeline
      .from('.console-plate', { opacity: 0, scale: 0.95, duration: 1, ease: 'bmArrive' })
      .from('.console-grid', { opacity: 0, duration: 0.8 }, '-=0.7')
      .from('.contour', { opacity: 0, x: -20, duration: 0.9, stagger: 0.1 }, '-=0.6');

    if (path) {
      const length = path.getTotalLength();

      timeline.fromTo(
        path,
        { strokeDasharray: length, strokeDashoffset: length },
        { strokeDashoffset: 0, duration: 1.4, ease: 'bmGlide' },
        '-=0.7',
      );
    }

    timeline
      .from('.console-readout', { opacity: 0, y: 16, duration: 0.7, stagger: 0.12 }, '-=0.8')
      .from('.console-check', { opacity: 0, x: -16, duration: 0.6, stagger: 0.14 }, '-=0.5');
  }

  /**
   * The loop. The marker is driven along the route by MotionPath rather than by
   * hand-placed keyframes, so its heading stays tangent to the curve — the same
   * relationship the real marker has with the Street View camera.
   */
  private survey(): void {
    const path = this.route()?.nativeElement;
    const probe = this.probe()?.nativeElement;
    const latitude = this.latitude()?.nativeElement;
    const longitude = this.longitude()?.nativeElement;

    if (!path || !probe) return;

    // Bounds of the plate in the same coordinate space the readout pretends to
    // report, so the numbers move with the marker instead of drifting randomly.
    const geo = { north: 45.4772, south: 45.4602, west: 9.1712, east: 9.1934 };
    const box = path.getBBox();
    const position = { progress: 0 };

    gsap
      .timeline({ repeat: -1, repeatDelay: 0.9, delay: 1.6 })
      .to(probe, {
        duration: 9,
        ease: 'none',
        motionPath: { path, align: path, alignOrigin: [0.5, 0.5], autoRotate: true },
      })
      .to(
        position,
        {
          progress: 1,
          duration: 9,
          ease: 'none',
          onUpdate: () => {
            const point = path.getPointAtLength(path.getTotalLength() * position.progress);

            if (latitude) {
              const lat = geo.north - ((point.y - box.y) / box.height) * (geo.north - geo.south);
              latitude.textContent = `${lat.toFixed(6)}° N`;
            }

            if (longitude) {
              const lng = geo.west + ((point.x - box.x) / box.width) * (geo.east - geo.west);
              longitude.textContent = `${lng.toFixed(6)}° E`;
            }
          },
        },
        0,
      )
      .set(position, { progress: 0 });

    gsap.to('.probe-pulse', {
      scale: 2.6,
      opacity: 0,
      duration: 1.9,
      repeat: -1,
      ease: 'power2.out',
    });

    // Each checklist row confirms in turn, then the cycle restarts — the panel
    // is never static, but nothing on it moves fast enough to pull focus from
    // the form beside it.
    gsap
      .timeline({ repeat: -1, repeatDelay: 2.4, delay: 2 })
      .to('.console-check', {
        '--check-fill': 1,
        duration: 0.5,
        stagger: 0.9,
        ease: 'bmGlide',
      })
      .to('.console-check', { '--check-fill': 0, duration: 0.4 }, '+=1.6');
  }
}
