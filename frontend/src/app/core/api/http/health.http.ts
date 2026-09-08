/**
 * Live runtime figures from both services.
 *
 * Each service publishes `/api/platform/runtime` — real Actuator health indicators and Micrometer
 * meters, no token required — so the dashboard shows the pair side by side. If one is down the
 * other still reports, which is the whole point of asking them separately.
 *
 * @author Khova Krishna Pilato
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { HealthApi } from '../adapters';
import { RuntimeSnapshot } from '../models';

@Injectable()
export class HttpHealthAdapter implements HealthApi {
  readonly #http = inject(HttpClient);

  snapshots(): Observable<readonly RuntimeSnapshot[]> {
    const services: ReadonlyArray<readonly [string, string]> = [
      ['IAM Service', environment.iamApiUrl],
      ['Business Core Service', environment.businessApiUrl],
    ];

    return forkJoin(
      services.map(([name, base]) =>
        this.#http
          .get<RuntimeSnapshot>(`${base}/api/platform/runtime`)
          .pipe(catchError(() => of(unreachable(name)))),
      ),
    );
  }
}

/** A service that will not answer is still a fact worth rendering, so it becomes a DOWN card. */
function unreachable(service: string): RuntimeSnapshot {
  const nowIso = new Date().toISOString();
  const noMemory = {
    used: 0,
    committed: 0,
    max: 0,
    usedRatio: 0,
    display: 'unavailable',
    usedDisplay: '—',
    maxDisplay: '—',
  };

  return {
    service,
    version: 'unknown',
    status: 'DOWN',
    components: [{ name: 'reachability', status: 'DOWN' }],
    profiles: [],
    runtime: { java: '—', jvm: '—', os: '—', architecture: '—', port: 0 },
    uptime: { seconds: 0, display: 'unreachable' },
    heap: noMemory,
    nonHeap: noMemory,
    cpu: { process: 0, system: 0, cores: 0 },
    threads: { live: 0, daemon: 0, peak: 0 },
    http: { requests: 0, averageMillis: 0, slowestMillis: 0, clientErrors: 0, serverErrors: 0 },
    database: { active: 0, idle: 0, max: 0, pending: 0 },
    startedAt: nowIso,
    sampledAt: nowIso,
  };
}
