import { Injectable } from '@angular/core';

import { HealthComponent, MetricResponse, RuntimeSnapshot, ServiceName } from '../core/api/platform.models';

interface ServiceState {
  startedAt: number;
  requests: number;
  totalMillis: number;
  slowest: number;
  clientErrors: number;
  serverErrors: number;
  heapUsed: number;
  nonHeapUsed: number;
  cpuProcess: number;
  cpuSystem: number;
  threads: number;
  poolActive: number;
  lastTick: number;
  byUri: Record<string, { count: number; totalMillis: number; max: number }>;
}

const MB = 1024 * 1024;
const HEAP_MAX = 4096 * MB;

const URIS: Record<ServiceName, Array<[uri: string, weight: number, millis: number]>> = {
  iam: [
    ['/api/v1/auth/refresh', 0.26, 34],
    ['/api/v1/users/me', 0.2, 12],
    ['/api/v1/users', 0.16, 28],
    ['/api/v1/auth/login', 0.08, 180],
    ['/api/v1/notifications', 0.1, 41],
    ['/api/v1/mailing-lists', 0.12, 36],
    ['/api/platform/runtime', 0.08, 6],
  ],
  core: [
    ['/api/v1/geo/municipalities', 0.3, 22],
    ['/api/v1/registrations', 0.24, 48],
    ['/api/v1/geo/addresses', 0.14, 210],
    ['/api/v1/geo/provinces', 0.1, 9],
    ['/api/v1/registrations/{id}', 0.12, 17],
    ['/api/v1/geo/entity-codes', 0.05, 320],
    ['/api/platform/runtime', 0.05, 6],
  ],
};

/**
 * Two believable JVMs for the health screen: traffic that accumulates, heap that climbs and drops
 * after a collection, CPU that breathes. Runtime snapshots and Actuator meters read the same state,
 * so the numbers on the dashboard always agree with each other.
 */
@Injectable({ providedIn: 'root' })
export class DemoRuntime {
  private readonly services: Record<ServiceName, ServiceState> = {
    iam: this.initial(9 * 3600 + 1260, 11_842),
    core: this.initial(9 * 3600 + 1140, 27_315),
  };

  snapshot(service: ServiceName): RuntimeSnapshot {
    const s = this.tick(service);
    const uptimeSeconds = Math.floor((Date.now() - s.startedAt) / 1000);
    return {
      service: service === 'iam' ? 'IAM Service' : 'Business Core Service',
      version: '2.0.0',
      status: 'UP',
      components: [
        { name: 'db', status: 'UP' },
        { name: 'diskSpace', status: 'UP' },
        ...(service === 'iam' ? [{ name: 'mail', status: 'UP' }] : []),
        { name: 'ping', status: 'UP' },
        { name: 'ssl', status: 'UP' },
      ],
      profiles: ['demo'],
      runtime: { java: '26.0.2', jvm: 'OpenJDK 64-Bit Server VM 26.0.2+10', os: 'Linux 6.8', architecture: 'amd64', port: service === 'iam' ? 9843 : 9844 },
      uptime: { seconds: uptimeSeconds, display: uptime(uptimeSeconds) },
      heap: memory(s.heapUsed, 1024 * MB, HEAP_MAX),
      nonHeap: memory(s.nonHeapUsed, 210 * MB, 1024 * MB),
      cpu: { process: s.cpuProcess, system: s.cpuSystem, cores: 12 },
      threads: { live: s.threads, daemon: s.threads - 6, peak: 48 },
      http: {
        requests: Math.floor(s.requests),
        averageMillis: round(s.totalMillis / Math.max(s.requests, 1)),
        slowestMillis: round(s.slowest),
        clientErrors: Math.floor(s.clientErrors),
        serverErrors: Math.floor(s.serverErrors),
      },
      database: { active: Math.round(s.poolActive), idle: 10 - Math.round(s.poolActive), max: 10, pending: 0 },
      startedAt: new Date(s.startedAt).toISOString(),
      sampledAt: new Date().toISOString(),
    };
  }

  health(service: ServiceName): HealthComponent {
    this.tick(service);
    const components: Record<string, HealthComponent> = {
      db: { status: 'UP', details: { database: 'MySQL', validationQuery: 'isValid()' } },
      diskSpace: { status: 'UP', details: { total: 1_021_873_295_360, free: 872_394_858_496, threshold: 10_485_760, exists: true } },
      livenessState: { status: 'UP' },
      ping: { status: 'UP' },
      readinessState: { status: 'UP' },
      ssl: { status: 'UP', details: { validChains: [], invalidChains: [], expiringChains: [] } },
    };
    if (service === 'iam') {
      components['mail'] = { status: 'UP', details: { location: 'sandbox.smtp.mailtrap.io:587' } };
    }
    return { status: 'UP', components, groups: ['liveness', 'readiness'] };
  }

  metricNames(): string[] {
    return [
      'http.server.requests', 'jvm.memory.used', 'jvm.memory.max', 'jvm.threads.live', 'jvm.gc.pause',
      'process.cpu.usage', 'system.cpu.usage', 'process.uptime', 'hikaricp.connections.active',
      'hikaricp.connections.idle', 'hikaricp.connections.pending', 'hikaricp.connections.max', 'disk.free', 'disk.total',
    ];
  }

  metric(service: ServiceName, name: string, tags: string[]): MetricResponse | undefined {
    const s = this.tick(service);
    const measurement = (statistic: string, value: number) => ({ statistic, value });
    const tagged = (tag: string) => tags.find((t) => t.startsWith(`${tag}:`))?.slice(tag.length + 1);

    switch (name) {
      case 'http.server.requests': {
        const uri = tagged('uri');
        const outcome = tagged('outcome');
        let count = s.requests;
        let total = s.totalMillis;
        let max = s.slowest;
        if (uri && s.byUri[uri]) ({ count, totalMillis: total, max } = s.byUri[uri]);
        if (outcome === 'CLIENT_ERROR') [count, total] = [s.clientErrors, s.clientErrors * 14];
        if (outcome === 'SERVER_ERROR') [count, total] = [s.serverErrors, s.serverErrors * 90];
        return {
          name,
          baseUnit: 'seconds',
          measurements: [measurement('COUNT', Math.floor(count)), measurement('TOTAL_TIME', total / 1000), measurement('MAX', max / 1000)],
          availableTags: [
            { tag: 'uri', values: URIS[service].map(([u]) => u) },
            { tag: 'outcome', values: ['SUCCESS', 'CLIENT_ERROR', 'SERVER_ERROR'] },
            { tag: 'method', values: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
          ],
        };
      }
      case 'jvm.memory.used':
        return { name, baseUnit: 'bytes', measurements: [measurement('VALUE', s.heapUsed + s.nonHeapUsed)], availableTags: [{ tag: 'area', values: ['heap', 'nonheap'] }] };
      case 'jvm.memory.max':
        return { name, baseUnit: 'bytes', measurements: [measurement('VALUE', HEAP_MAX)], availableTags: [] };
      case 'jvm.threads.live':
        return { name, baseUnit: 'threads', measurements: [measurement('VALUE', s.threads)], availableTags: [] };
      case 'process.cpu.usage':
        return { name, measurements: [measurement('VALUE', s.cpuProcess)], availableTags: [] };
      case 'system.cpu.usage':
        return { name, measurements: [measurement('VALUE', s.cpuSystem)], availableTags: [] };
      case 'process.uptime':
        return { name, baseUnit: 'seconds', measurements: [measurement('VALUE', (Date.now() - s.startedAt) / 1000)], availableTags: [] };
      case 'hikaricp.connections.active':
        return { name, measurements: [measurement('VALUE', Math.round(s.poolActive))], availableTags: [{ tag: 'pool', values: [`bimap-${service}-pool`] }] };
      case 'hikaricp.connections.idle':
        return { name, measurements: [measurement('VALUE', 10 - Math.round(s.poolActive))], availableTags: [] };
      case 'hikaricp.connections.pending':
        return { name, measurements: [measurement('VALUE', 0)], availableTags: [] };
      case 'hikaricp.connections.max':
        return { name, measurements: [measurement('VALUE', 10)], availableTags: [] };
      case 'jvm.gc.pause':
        return { name, baseUnit: 'seconds', measurements: [measurement('COUNT', 412), measurement('TOTAL_TIME', 1.84), measurement('MAX', 0.021)], availableTags: [{ tag: 'gc', values: ['G1 Young Generation'] }] };
      case 'disk.free':
        return { name, baseUnit: 'bytes', measurements: [measurement('VALUE', 872_394_858_496)], availableTags: [] };
      case 'disk.total':
        return { name, baseUnit: 'bytes', measurements: [measurement('VALUE', 1_021_873_295_360)], availableTags: [] };
      default:
        return undefined;
    }
  }

  private initial(uptimeSeconds: number, requests: number): ServiceState {
    return {
      startedAt: Date.now() - uptimeSeconds * 1000,
      requests,
      totalMillis: requests * 31,
      slowest: 2386,
      clientErrors: requests * 0.012,
      serverErrors: 3,
      heapUsed: 380 * MB,
      nonHeapUsed: 152 * MB,
      cpuProcess: 0.04,
      cpuSystem: 0.11,
      threads: 31,
      poolActive: 1,
      lastTick: Date.now(),
      byUri: {},
    };
  }

  /** Advances one service by the time that passed since it was last read. */
  private tick(service: ServiceName): ServiceState {
    const s = this.services[service];
    const seconds = Math.min((Date.now() - s.lastTick) / 1000, 60);
    s.lastTick = Date.now();
    if (seconds <= 0) return s;

    const busy = 0.6 + Math.sin(Date.now() / 40_000) * 0.4 + Math.random() * 0.5;
    const arrivals = seconds * (service === 'core' ? 4.2 : 2.6) * busy;

    for (const [uri, weight, millis] of URIS[service]) {
      const count = arrivals * weight;
      const entry = (s.byUri[uri] ??= { count: s.requests * weight, totalMillis: s.requests * weight * millis, max: millis * 6 });
      const latency = millis * (0.7 + Math.random() * 0.8);
      entry.count += count;
      entry.totalMillis += count * latency;
      entry.max = Math.max(entry.max * 0.98, latency * 2.4);
      s.totalMillis += count * latency;
    }

    s.requests += arrivals;
    s.clientErrors += arrivals * 0.011;
    if (Math.random() < 0.012 * seconds) s.serverErrors += 1;
    s.slowest = Math.max(s.slowest * 0.995, 180 + Math.random() * 900);

    s.heapUsed += (busy * 22 + Math.random() * 12) * MB * seconds;
    if (s.heapUsed > 1650 * MB) s.heapUsed = 330 * MB + Math.random() * 60 * MB;
    s.nonHeapUsed = Math.min(s.nonHeapUsed + Math.random() * 0.2 * MB * seconds, 196 * MB);

    s.cpuProcess = clamp(s.cpuProcess + (Math.random() - 0.5) * 0.05 + (busy - 0.8) * 0.01, 0.01, 0.42);
    s.cpuSystem = clamp(s.cpuProcess + 0.06 + Math.random() * 0.08, 0.05, 0.75);
    s.threads = Math.round(clamp(s.threads + (Math.random() - 0.5) * 3, 26, 44));
    s.poolActive = clamp(busy * 1.8 + (Math.random() - 0.5) * 1.5, 0, 6);
    return s;
  }
}

function memory(used: number, committed: number, max: number) {
  return {
    used: Math.round(used),
    committed: Math.max(committed, Math.round(used * 1.3)),
    max,
    usedRatio: round(used / max, 4),
    display: `${Math.round(used / MB)} MB / ${(max / 1024 / MB).toFixed(1)} GB`,
    usedDisplay: `${Math.round(used / MB)} MB`,
    maxDisplay: `${(max / 1024 / MB).toFixed(1)} GB`,
  };
}

function uptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds % 60}s`;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
