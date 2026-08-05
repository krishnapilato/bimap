import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { MotionService } from '../../core/motion';

// `gsap.core.Timeline` below resolves through GSAP's global type namespace —
// nothing from the package is referenced at runtime here, the service owns it.

/**
 * The transition between routes.
 *
 * Rather than a spinner, navigating reads as an instrument re-acquiring its
 * fix: blades of paper sweep across the viewport, a reticle converges, and a
 * coordinate scrambles to a lock. It is the same gesture the map marker makes
 * when it lands, at page scale.
 *
 * Timing is the whole design here. The first load earns a full sequence because
 * there is nothing to interrupt; every navigation after it is capped near half a
 * second, because a transition the user has to wait through twice is no longer
 * cinematic — it is a toll. `cover()` resolves as soon as the viewport is
 * actually hidden, so the router swaps components under an opaque curtain and
 * the incoming page's own entrance is never seen half-finished.
 */
@Component({
  selector: 'bm-route-curtain',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="curtain" role="status" aria-live="polite" aria-label="Loading page" #curtain>
        <div class="curtain-blades" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
        </div>

        <div class="curtain-core" aria-hidden="true">
          <svg class="reticle" viewBox="0 0 120 120" fill="none">
            <circle class="reticle-ring" cx="60" cy="60" r="46" />
            <circle class="reticle-ring reticle-ring--inner" cx="60" cy="60" r="27" />
            <path class="reticle-cross" d="M60 4v26M60 90v26M4 60h26M90 60h26" />
            <path class="reticle-needle" d="M60 60 84 36l-9 33z" />
            <circle class="reticle-dot" cx="60" cy="60" r="4.5" />
          </svg>

          <div class="curtain-copy">
            <strong>BiMap</strong>
            <span class="curtain-readout">45.4697 N · 9.1822 E</span>
          </div>
        </div>

        <span class="curtain-progress" aria-hidden="true"></span>
      </div>
    }
  `,
  styleUrl: './route-curtain.scss',
})
export class RouteCurtainComponent {
  private readonly motion = inject(MotionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly curtain = viewChild<ElementRef<HTMLElement>>('curtain');

  readonly visible = signal(true);

  private timeline?: gsap.core.Timeline;

  constructor() {
    this.destroyRef.onDestroy(() => this.timeline?.kill());
  }

  /**
   * Plays the opening sequence, then clears the curtain. Only ever runs once,
   * on the first paint of the session.
   */
  boot(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const host = this.curtain()?.nativeElement;

        if (!host || !this.motion.enabled()) {
          this.visible.set(false);
          resolve();
          return;
        }

        this.timeline?.kill();

        const timeline = this.motion.timeline({
          onComplete: () => {
            this.visible.set(false);
            resolve();
          },
        });

        this.timeline = timeline;

        timeline
          .from(host.querySelectorAll('.reticle-ring'), {
            scale: 0.3,
            opacity: 0,
            rotate: -90,
            transformOrigin: 'center',
            duration: 0.9,
            stagger: 0.1,
            ease: 'bmArrive',
          })
          .from(
            host.querySelector('.reticle-cross'),
            { strokeDashoffset: 120, opacity: 0, duration: 0.7 },
            '-=0.55',
          )
          .from(
            host.querySelector('.reticle-needle'),
            { scale: 0, rotate: -160, transformOrigin: '0 0', duration: 0.8, ease: 'bmArrive' },
            '-=0.5',
          )
          .from(
            host.querySelector('.curtain-copy strong'),
            { yPercent: 120, opacity: 0, duration: 0.6 },
            '-=0.6',
          )
          .to(
            host.querySelector('.curtain-readout'),
            {
              duration: 0.9,
              scrambleText: { text: '45.4697 N · 9.1822 E', chars: '0123456789.·NE', speed: 0.7 },
            },
            '-=0.5',
          )
          .fromTo(
            host.querySelector('.curtain-progress'),
            { scaleX: 0 },
            { scaleX: 1, transformOrigin: '0 50%', duration: 1.1, ease: 'bmInstrument' },
            '-=1',
          )
          .to(host.querySelector('.curtain-core'), { opacity: 0, scale: 1.08, duration: 0.4 }, '+=0.1')
          .to(
            host.querySelectorAll('.curtain-blades span'),
            {
              scaleY: 0,
              transformOrigin: '50% 0%',
              duration: 0.62,
              stagger: { each: 0.055, from: 'start' },
              ease: 'bmSweep',
            },
            '-=0.24',
          );

        // The opening sequence is the only thing between a visitor and the
        // product. Authored at a readable pace, then played fast enough that it
        // reads as a title card rather than a load screen.
        timeline.timeScale(1.7);
      });
    });
  }

  /** Sweeps the curtain closed. Resolves once the viewport is fully hidden. */
  cover(): Promise<void> {
    return new Promise((resolve) => {
      this.visible.set(true);

      requestAnimationFrame(() => {
        const host = this.curtain()?.nativeElement;

        if (!host || !this.motion.enabled()) {
          resolve();
          return;
        }

        this.timeline?.kill();

        const blades = host.querySelectorAll('.curtain-blades span');

        this.timeline = this.motion
          .timeline({ onComplete: resolve })
          .set(host.querySelector('.curtain-core'), { opacity: 0, scale: 0.94 })
          .fromTo(
            blades,
            { scaleY: 0, transformOrigin: '50% 100%' },
            {
              scaleY: 1,
              duration: 0.42,
              stagger: { each: 0.04, from: 'end' },
              ease: 'bmSweep',
            },
          )
          .to(host.querySelector('.curtain-core'), { opacity: 1, scale: 1, duration: 0.3 }, '-=0.2');
      });
    });
  }

  /** Sweeps the curtain open on the newly mounted page. */
  reveal(): void {
    const host = this.curtain()?.nativeElement;

    if (!host || !this.motion.enabled()) {
      this.visible.set(false);
      return;
    }

    this.timeline?.kill();

    this.timeline = this.motion
      .timeline({ onComplete: () => this.visible.set(false) })
      .to(host.querySelector('.curtain-core'), { opacity: 0, scale: 1.06, duration: 0.28 })
      .to(
        host.querySelectorAll('.curtain-blades span'),
        {
          scaleY: 0,
          transformOrigin: '50% 0%',
          duration: 0.5,
          stagger: { each: 0.045, from: 'start' },
          ease: 'bmSweep',
        },
        '-=0.16',
      );
  }
}
