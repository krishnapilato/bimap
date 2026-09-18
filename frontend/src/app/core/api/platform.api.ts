import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { coreUrl, iamUrl, queryParams } from './http-helpers';
import {
  CachesResponse,
  HealthComponent,
  LoggersResponse,
  MetricResponse,
  RuntimeSnapshot,
  ServiceName,
} from './platform.models';

const root = (service: ServiceName, path: string): string =>
  service === 'iam' ? iamUrl(path) : coreUrl(path);

/**
 * Runtime and Actuator endpoints of either service.
 *
 * `/api/platform/runtime` and `/actuator/health` are public; everything else under `/actuator`
 * needs the ADMINISTRATOR role, and production exposes only health, info and metrics.
 */
@Injectable({ providedIn: 'root' })
export class PlatformApi {
  private readonly http = inject(HttpClient);

  runtime(service: ServiceName): Promise<RuntimeSnapshot> {
    return firstValueFrom(this.http.get<RuntimeSnapshot>(root(service, '/api/platform/runtime')));
  }

  health(service: ServiceName, group?: 'liveness' | 'readiness'): Promise<HealthComponent> {
    const path = group ? `/actuator/health/${group}` : '/actuator/health';
    return firstValueFrom(this.http.get<HealthComponent>(root(service, path)));
  }

  info(service: ServiceName): Promise<Record<string, unknown>> {
    return firstValueFrom(this.http.get<Record<string, unknown>>(root(service, '/actuator/info')));
  }

  metricNames(service: ServiceName): Promise<{ names: string[] }> {
    return firstValueFrom(this.http.get<{ names: string[] }>(root(service, '/actuator/metrics')));
  }

  /** One meter, optionally narrowed by `tag:value` pairs such as `outcome:SERVER_ERROR`. */
  metric(service: ServiceName, name: string, tags: string[] = []): Promise<MetricResponse> {
    let params = queryParams({});
    for (const tag of tags) params = params.append('tag', tag);
    return firstValueFrom(this.http.get<MetricResponse>(root(service, `/actuator/metrics/${name}`), { params }));
  }

  loggers(service: ServiceName): Promise<LoggersResponse> {
    return firstValueFrom(this.http.get<LoggersResponse>(root(service, '/actuator/loggers')));
  }

  setLoggerLevel(service: ServiceName, logger: string, level: string | null): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(root(service, `/actuator/loggers/${logger}`), { configuredLevel: level }),
    );
  }

  caches(service: ServiceName): Promise<CachesResponse> {
    return firstValueFrom(this.http.get<CachesResponse>(root(service, '/actuator/caches')));
  }

  evictCache(service: ServiceName, cache?: string): Promise<void> {
    const path = cache ? `/actuator/caches/${cache}` : '/actuator/caches';
    return firstValueFrom(this.http.delete<void>(root(service, path)));
  }
}
