/**
 * The application shell.
 *
 * Paper wash, graticule, one corner, and whatever the router puts on screen. There is no navbar and
 * no rail: navigation lives behind ⌘K, and every view owns the whole viewport.
 *
 * A demo build carries a corner ribbon, in the spirit of Flutter's debug banner — the two builds are
 * otherwise identical on screen, and nobody looking at a mocked sign-in should have to wonder which
 * one they are looking at.
 *
 * @author Khova Krishna Pilato
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { CommandBarComponent } from './shared/command-bar/command-bar';
import { isDemoMode } from './core/api/api.providers';
import { refreshScrollTriggers } from './core/motion/motion';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, CommandBarComponent],
  template: `
    <div class="bm-wash" aria-hidden="true"></div>
    <div class="bm-graticule" aria-hidden="true"></div>

    @if (demo) {
      <div class="bm-ribbon" role="note" aria-label="Demo build: data is mocked in the browser">
        <span>DEMO</span>
      </div>
    }

    <router-outlet />

    <bm-command-bar />
  `,
})
export class App {
  protected readonly demo = isDemoMode;

  readonly #router = inject(Router);

  constructor() {
    // A new view means new geometry, and a ScrollTrigger measured against the old page is wrong.
    this.#router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => refreshScrollTriggers());
  }
}
