/**
 * System health and Actuator.
 *
 * Polls `/api/platform/runtime` on both services and renders what comes back. Nothing here is
 * computed in the browser beyond formatting: the ratios, the uptime and the counters are the ones
 * Micrometer reported, which is the difference between a dashboard and a decoration.
 *
 * Polling stops while the tab is hidden. A background tab that keeps hammering two services is a
 * bug, not a feature.
 *
 * @author Khova Krishna Pilato
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, startWith, switchMap, timer } from 'rxjs';

import { HEALTH_API } from '../../core/api/adapters';
import { MOTION_DIRECTIVES } from '../../core/motion/motion';
import { RuntimeSnapshot } from '../../core/api/models';

const POLL_MS = 5000;

@Component({
  selector: 'bm-health',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...MOTION_DIRECTIVES],
  templateUrl: './health.html',
})
export class HealthComponent {
  readonly #health = inject(HEALTH_API);

  protected readonly paused = signal(document.hidden);

  readonly #snapshots = toSignal(
    timer(0, POLL_MS).pipe(
      switchMap(() =>
        this.paused()
          ? of(null)
          : this.#health.snapshots().pipe(catchError(() => of([] as RuntimeSnapshot[]))),
      ),
      startWith(null),
    ),
    { initialValue: null },
  );

  /**
   * Holds the last good reading, so a paused or failed poll does not blank the dashboard.
   *
   * `linkedSignal` rather than a `computed` that writes to a second signal: writing to a signal
   * from inside a computation is exactly what NG0600 forbids, and the error surfaced here as an
   * empty dashboard rather than as anything resembling a stack trace.
   */
  protected readonly services = linkedSignal<readonly RuntimeSnapshot[] | null, readonly RuntimeSnapshot[]>({
    source: this.#snapshots,
    computation: (incoming, previous) => incoming ?? previous?.value ?? [],
  });

  protected readonly loading = computed(() => this.services().length === 0);

  protected readonly allHealthy = computed(
    () => this.services().length > 0 && this.services().every((s) => s.status === 'UP'),
  );

  constructor() {
    const onVisibility = () => this.paused.set(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() =>
      document.removeEventListener('visibilitychange', onVisibility),
    );
  }

  protected percent(ratio: number): number {
    return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  }

  /** Green while there is room, amber when it is filling, red when it is nearly gone. */
  protected pressure(ratio: number): string {
    const value = this.percent(ratio);
    if (value >= 85) {
      return 'text-error';
    }
    return value >= 65 ? 'text-warning' : 'text-success';
  }

  protected poolRatio(snapshot: RuntimeSnapshot): number {
    return snapshot.database.max === 0 ? 0 : snapshot.database.active / snapshot.database.max;
  }
}
