import { Component, DestroyRef, afterNextRender, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';

import { BootService } from './core/boot.service';
import { CommandPaletteComponent } from './shared/command-palette/command-palette';
import { RouteCurtainComponent } from './shared/route-curtain/route-curtain';

/**
 * The application frame: an outlet, the transition that covers it, and the
 * command palette that floats above everything.
 *
 * The previous implementation held a 2-second overlay on *every* navigation,
 * timed by a `setTimeout` that had no relationship to whether the next page was
 * ready. Here the curtain and the router are actually coupled — the page is
 * swapped while the viewport is genuinely hidden, and the curtain lifts as soon
 * as both the sweep and the navigation have finished, so a cached lazy chunk
 * costs the user about half a second rather than two.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouteCurtainComponent, CommandPaletteComponent],
  template: `
    <router-outlet />

    <bm-command-palette />
    <bm-route-curtain />
  `,
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly boot = inject(BootService);
  private readonly curtain = viewChild.required(RouteCurtainComponent);

  /** Until the opening sequence has finished, navigations do not draw a curtain. */
  private booted = false;

  /** Resolves when the viewport is fully hidden for the navigation in flight. */
  private covered?: Promise<void>;

  constructor() {
    afterNextRender(() => {
      this.curtain()
        .boot()
        .then(() => {
          this.booted = true;
          // Releases any page holding its entrance until the viewport is
          // actually visible.
          this.boot.markReady();
        });
    });

    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart) {
        if (this.booted) this.covered = this.curtain().cover();
        return;
      }

      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        if (!this.booted) return;

        // Lift only once the sweep has actually closed. Without this a fast
        // navigation reveals a half-drawn curtain over the page it just built.
        const covered = this.covered ?? Promise.resolve();
        this.covered = undefined;

        covered.then(() => this.curtain().reveal());
      }
    });
  }
}
