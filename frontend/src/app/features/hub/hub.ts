/**
 * Where you land after signing in.
 *
 * Four cards, one per module. The card the visitor picks expands into the view it leads to, so
 * the transition reads as entering that module rather than as a page swap.
 *
 * @author Khova Krishna Pilato
 */

import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { gsap } from 'gsap';

import { MOTION_DIRECTIVES, prefersReducedMotion } from '../../core/motion/motion';
import { SessionService } from '../../core/session.service';

interface Module {
  readonly path: string;
  readonly icon: string;
  readonly title: string;
  readonly copy: string;
  readonly points: readonly string[];
  /** Modules the caller has no permission for are shown, but not offered. */
  readonly requires?: string;
}

@Component({
  selector: 'bm-hub',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...MOTION_DIRECTIVES],
  template: `
    <div class="bm-screen content-center">
      <header bmReveal="up">
        <p class="bm-label">Signed in as {{ session.user()?.fullName }}</p>
        <h1 class="bm-display mt-1">Where would you like to work?</h1>
        <p class="mt-2 max-w-[52ch] text-ink-2">
          Four modules on one platform. Your role decides which of them will open.
        </p>
      </header>

      <div bmStagger [stagger]="0.06" class="grid gap-3 md:grid-cols-2">
        @for (module of modules; track module.path) {
          @let locked = module.requires && !session.has(module.requires);

          <button
            type="button"
            class="bm-reveal bm-panel group flex items-start gap-3 p-4 text-left transition
                   hover:border-primary/30 hover:shadow-lift disabled:cursor-not-allowed
                   disabled:opacity-55 disabled:hover:border-hairline disabled:hover:shadow-none"
            [disabled]="locked"
            (click)="enter(module.path, $event)"
          >
            <span
              class="grid h-9 w-9 shrink-0 place-items-center rounded-field bg-primary/10 text-primary"
            >
              <span class="material-symbols-rounded text-[1.2rem]">{{ module.icon }}</span>
            </span>

            <span class="min-w-0 flex-1">
              <span class="bm-subtitle block truncate">{{ module.title }}</span>
              <span class="mt-1 block text-ink-2">{{ module.copy }}</span>

              <span class="mt-3 flex flex-wrap gap-1">
                @for (point of module.points; track point) {
                  <span class="badge badge-sm badge-ghost font-medium">{{ point }}</span>
                }
                @if (locked) {
                  <span class="badge badge-sm badge-warning badge-soft font-semibold">
                    Needs a higher role
                  </span>
                }
              </span>
            </span>

            <span
              class="material-symbols-rounded shrink-0 self-center text-[1.2rem] text-ink-3
                     transition group-hover:translate-x-0.5 group-hover:text-primary"
            >
              arrow_forward
            </span>
          </button>
        }
      </div>
    </div>
  `,
})
export class HubComponent {
  protected readonly session = inject(SessionService);
  readonly #router = inject(Router);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly leaving = signal(false);

  protected readonly modules: readonly Module[] = [
    {
      path: '/geo',
      icon: 'public',
      title: 'Geographic asset engine',
      copy: 'The guided cascade over Italian administrative geography, addresses and public-body codes, straight from the live registries.',
      points: ['7,896 comuni', 'ISTAT codes', 'Nominatim', 'Cached'],
    },
    {
      path: '/iam',
      icon: 'group',
      title: 'Identity and access',
      copy: 'The account directory: roles, permissions, the lifecycle, and the switches that lock or disable somebody in one move.',
      points: ['Roles', 'Lifecycle', 'Permissions'],
      requires: 'user:read',
    },
    {
      path: '/email',
      icon: 'outgoing_mail',
      title: 'Email dispatcher',
      copy: 'The sent_email log — every transactional message the platform has sent — and a composer that works out its own content type from what you wrote.',
      points: ['Delivery log', 'Attachments', 'Derived MIME'],
    },
    {
      path: '/health',
      icon: 'monitor_heart',
      title: 'System health',
      copy: 'Real Actuator health indicators and Micrometer meters from both services: uptime, heap, threads, latency and the pool.',
      points: ['Live gauges', 'Both services', 'Actuator'],
    },
  ];

  /** The chosen card lifts and the rest fall away, so the module opens rather than replaces. */
  protected enter(path: string, event: MouseEvent): void {
    if (this.leaving()) {
      return;
    }
    this.leaving.set(true);

    if (prefersReducedMotion()) {
      void this.#router.navigate([path]);
      return;
    }

    const chosen = event.currentTarget as HTMLElement;
    const others = Array.from(this.#host.nativeElement.querySelectorAll('button')).filter(
      (element) => element !== chosen,
    );

    gsap
      .timeline({ onComplete: () => void this.#router.navigate([path]) })
      .to(others, { opacity: 0, y: 14, duration: 0.24, ease: 'power2.in', stagger: 0.03 }, 0)
      .to(chosen, { scale: 1.02, duration: 0.2, ease: 'power2.out' }, 0)
      .to(chosen, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0.2);
  }
}
