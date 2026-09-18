import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  WritableSignal,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { QueryClient, injectQuery } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { PlatformApi } from '../../core/api/platform.api';
import { HealthComponent, LoggersResponse, RuntimeSnapshot, ServiceName } from '../../core/api/platform.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { dateTime, formatBytes, formatNumber, relativeTime } from '../../core/ui/format';
import { Button } from '../../ui/button/button';
import { EmptyState, ErrorState, MessageStrip, Skeleton } from '../../ui/feedback/feedback';
import { SearchBox } from '../../ui/form/search-box';
import { SegmentOption, Segmented } from '../../ui/form/segmented';
import { Switch } from '../../ui/form/toggles';
import { Icon } from '../../ui/icon/icon';
import { Panel } from '../../ui/layout/page';
import { PageHeader } from '../../ui/layout/page';
import { StatusBadge } from '../../ui/status/status-badge';
import { Tooltip } from '../../ui/tooltip/tooltip';
import { ChartSample, ChartSeries, LiveChart } from './live-chart';

interface ServiceInfo {
  name: ServiceName;
  label: string;
  title: string;
  icon: string;
}

interface Reading {
  at: number;
  runtime: Partial<Record<ServiceName, RuntimeSnapshot>>;
  failures: Partial<Record<ServiceName, string>>;
}

const SERVICES: readonly ServiceInfo[] = [
  { name: 'iam', label: 'IAM', title: 'IAM service', icon: 'shield-check' },
  { name: 'core', label: 'Business', title: 'Business service', icon: 'landmark' },
];

const POLL_MS = 3000;
const HISTORY = 120;
const MB = 1024 * 1024;

const LEVELS = ['OFF', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];

/**
 * Both services, live: whether they are up and for how long, what they are serving, how much
 * memory and CPU they use, and a few minutes of history as it happens. Administrators can also
 * change log levels and clear caches without a restart.
 */
@Component({
  selector: 'bm-health',
  imports: [
    Icon,
    PageHeader,
    Panel,
    Button,
    StatusBadge,
    LiveChart,
    Segmented,
    SearchBox,
    Switch,
    MessageStrip,
    EmptyState,
    ErrorState,
    Skeleton,
    Tooltip,
  ],
  templateUrl: './health.html',
  styleUrl: './health.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Health {
  private readonly platform = inject(PlatformApi);
  private readonly sessions = inject(SessionStore);
  private readonly queries = inject(QueryClient);

  protected readonly services = SERVICES;
  protected readonly levels = LEVELS;
  protected readonly formatNumber = formatNumber;
  protected readonly formatBytes = formatBytes;
  protected readonly dateTime = dateTime;
  protected readonly relativeTime = relativeTime;

  protected readonly series: ChartSeries[] = [
    { key: 'iam', label: 'IAM', color: 1 },
    { key: 'core', label: 'Business', color: 2 },
  ];
  protected readonly serviceOptions: SegmentOption<ServiceName>[] = SERVICES.map((service) => ({ value: service.name, label: service.label }));

  protected readonly paused = signal(false);
  protected readonly isAdmin = computed(() => this.sessions.isAtLeast('ADMINISTRATOR'));
  private readonly now = signal(Date.now());

  // ── Live readings ──────────────────────────────────────────────────────────

  protected readonly reading = injectQuery(() => ({
    queryKey: ['platform', 'runtime', 'both'],
    queryFn: async (): Promise<Reading> => {
      const settled = await Promise.allSettled(SERVICES.map((service) => this.platform.runtime(service.name)));
      const reading: Reading = { at: Date.now(), runtime: {}, failures: {} };
      settled.forEach((result, index) => {
        const name = SERVICES[index].name;
        if (result.status === 'fulfilled') reading.runtime[name] = result.value;
        else reading.failures[name] = ApiError.from(result.reason).message;
      });
      return reading;
    },
    refetchInterval: this.paused() ? false : POLL_MS,
    refetchIntervalInBackground: false,
  }));

  private readonly lastSeen = signal<Partial<Record<ServiceName, RuntimeSnapshot>>>({});
  protected readonly heap = signal<ChartSample[]>([]);
  protected readonly cpu = signal<ChartSample[]>([]);
  protected readonly throughput = signal<ChartSample[]>([]);
  protected readonly threads = signal<ChartSample[]>([]);
  private recordedAt = 0;
  private previous: Reading | null = null;

  protected readonly probes = injectQuery(() => ({
    queryKey: ['platform', 'probes'],
    queryFn: async () => {
      const groups = ['liveness', 'readiness'] as const;
      const results = await Promise.allSettled(SERVICES.flatMap((service) => groups.map((group) => this.platform.health(service.name, group))));
      const probes: Record<string, string> = {};
      results.forEach((result, index) => {
        const service = SERVICES[Math.floor(index / groups.length)].name;
        probes[`${service}:${groups[index % groups.length]}`] = result.status === 'fulfilled' ? result.value.status : 'DOWN';
      });
      return probes;
    },
    refetchInterval: this.paused() ? false : 15_000,
  }));

  // ── Administration ─────────────────────────────────────────────────────────

  protected readonly detailsService = signal<ServiceName>('iam');
  protected readonly details = injectQuery(() => ({
    queryKey: keys.platform.health(this.detailsService()),
    queryFn: () => this.platform.health(this.detailsService()),
    enabled: this.isAdmin(),
    refetchInterval: this.paused() ? false : 15_000,
  }));

  protected readonly components = computed(() =>
    Object.entries(this.details.data()?.components ?? {}).map(([name, component]) => ({ name, component, facts: facts(component) })),
  );

  protected readonly loggerService = signal<ServiceName>('iam');
  protected readonly loggerSearch = signal('');
  protected readonly configuredOnly = signal(true);

  protected readonly loggers = injectQuery(() => ({
    queryKey: keys.platform.loggers(this.loggerService()),
    queryFn: () => this.platform.loggers(this.loggerService()),
    enabled: this.isAdmin(),
    retry: false,
  }));

  protected readonly loggerRows = computed(() => {
    const data = this.loggers.data();
    if (!data) return [];
    const term = this.loggerSearch().trim().toLowerCase();
    return Object.entries(data.loggers)
      .filter(([name, levels]) => (!this.configuredOnly() || !!levels.configuredLevel || name === 'ROOT') && (!term || name.toLowerCase().includes(term)))
      .sort(([a], [b]) => (a === 'ROOT' ? -1 : b === 'ROOT' ? 1 : a.localeCompare(b)))
      .slice(0, 200)
      .map(([name, levels]) => ({ name, ...levels }));
  });

  protected readonly cacheService = signal<ServiceName>('core');
  protected readonly caches = injectQuery(() => ({
    queryKey: keys.platform.caches(this.cacheService()),
    queryFn: () => this.platform.caches(this.cacheService()),
    enabled: this.isAdmin(),
    retry: false,
  }));

  protected readonly cacheRows = computed(() =>
    Object.entries(this.caches.data()?.cacheManagers ?? {}).flatMap(([manager, entry]) =>
      Object.entries(entry.caches).map(([name, cache]) => ({ manager, name, target: cache.target.split('.').pop() ?? cache.target })),
    ),
  );

  protected readonly evicting = signal<string | null>(null);

  protected readonly subtitle = computed(() => {
    const reading = this.reading.data();
    if (!reading) return 'Reading both services…';
    const down = SERVICES.filter((service) => reading.failures[service.name] || reading.runtime[service.name]?.status !== 'UP');
    if (!down.length) return `Both services are up. Last read ${relativeTime(new Date(reading.at).toISOString()).toLowerCase()}.`;
    return `${down.map((service) => service.title).join(' and ')} ${down.length === 1 ? 'needs' : 'need'} attention.`;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    const clock = setInterval(() => this.now.set(Date.now()), 1000);
    destroyRef.onDestroy(() => clearInterval(clock));

    effect(() => {
      const reading = this.reading.data();
      if (reading) untracked(() => this.record(reading));
    });
  }

  // ── Template helpers ───────────────────────────────────────────────────────

  protected snapshotOf(service: ServiceName): RuntimeSnapshot | undefined {
    return this.reading.data()?.runtime[service] ?? this.lastSeen()[service];
  }

  protected failureOf(service: ServiceName): string | undefined {
    return this.reading.data()?.failures[service];
  }

  protected uptime(snapshot: RuntimeSnapshot): string {
    const seconds = Math.max(0, Math.floor((this.now() - Date.parse(snapshot.startedAt)) / 1000));
    const days = Math.floor(seconds / 86_400);
    const hours = Math.floor((seconds % 86_400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    const pad = (value: number) => String(value).padStart(2, '0');
    return days ? `${days}d ${pad(hours)}h ${pad(minutes)}m` : `${hours}h ${pad(minutes)}m ${pad(rest)}s`;
  }

  protected probe(service: ServiceName, group: 'liveness' | 'readiness'): string | undefined {
    return this.probes.data()?.[`${service}:${group}`];
  }

  protected percent(ratio: number): string {
    return `${(ratio * 100).toFixed(ratio < 0.1 ? 1 : 0)}%`;
  }

  protected readonly formatWhole = (value: number) => formatNumber(Math.round(value));
  protected readonly formatOneDecimal = (value: number) => value.toFixed(1);

  protected unexposed(error: unknown): 'hidden' | 'forbidden' | null {
    const status = ApiError.from(error).status;
    return status === 404 ? 'hidden' : status === 403 ? 'forbidden' : null;
  }

  // ── Administration actions ─────────────────────────────────────────────────

  protected async setLevel(logger: string, level: string): Promise<void> {
    const service = this.loggerService();
    const key = keys.platform.loggers(service);
    const before = this.queries.getQueryData<LoggersResponse>(key);
    const configured = level === 'INHERIT' ? null : level;

    if (before) {
      const parent = before.loggers['ROOT']?.effectiveLevel ?? 'INFO';
      this.queries.setQueryData<LoggersResponse>(key, {
        ...before,
        loggers: { ...before.loggers, [logger]: { configuredLevel: configured ?? undefined, effectiveLevel: configured ?? parent } },
      });
    }
    try {
      await this.platform.setLoggerLevel(service, logger, configured);
      toast.success(configured ? `${shortName(logger)} now logs at ${configured}` : `${shortName(logger)} inherits its level again`);
    } catch (error) {
      if (before) this.queries.setQueryData(key, before);
      toast.error('The level could not be changed', { description: ApiError.from(error).message });
    }
  }

  protected async evict(cache?: string): Promise<void> {
    const service = this.cacheService();
    this.evicting.set(cache ?? '*');
    try {
      await this.platform.evictCache(service, cache);
      toast.success(cache ? `${cache} cleared` : 'Every cache cleared', { description: 'The next lookups read from the source again.' });
      void this.caches.refetch();
    } catch (error) {
      toast.error('The cache could not be cleared', { description: ApiError.from(error).message });
    } finally {
      this.evicting.set(null);
    }
  }

  protected shortName(logger: string): string {
    return shortName(logger);
  }

  // ── History ────────────────────────────────────────────────────────────────

  private record(reading: Reading): void {
    if (reading.at === this.recordedAt) return;
    this.recordedAt = reading.at;
    this.lastSeen.update((seen) => ({ ...seen, ...reading.runtime }));

    const at = reading.at / 1000;
    const value = (read: (snapshot: RuntimeSnapshot) => number) => (service: ServiceName) => {
      const snapshot = reading.runtime[service];
      return snapshot ? read(snapshot) : null;
    };
    const both = (read: (service: ServiceName) => number | null): ChartSample => ({ at, values: { iam: read('iam'), core: read('core') } });

    const perMinute = (service: ServiceName) => {
      const current = reading.runtime[service];
      const earlier = this.previous?.runtime[service];
      if (!current || !earlier || !this.previous) return null;
      const seconds = (reading.at - this.previous.at) / 1000;
      return seconds > 0 ? Math.max(0, ((current.http.requests - earlier.http.requests) / seconds) * 60) : null;
    };

    push(this.heap, both(value((snapshot) => snapshot.heap.used / MB)));
    push(this.cpu, both(value((snapshot) => snapshot.cpu.process * 100)));
    push(this.threads, both(value((snapshot) => snapshot.threads.live)));
    if (this.previous) push(this.throughput, both(perMinute));
    this.previous = reading;
  }
}

function push(history: WritableSignal<ChartSample[]>, sample: ChartSample): void {
  history.update((samples) => [...samples.slice(-(HISTORY - 1)), sample]);
}

function shortName(logger: string): string {
  const parts = logger.split('.');
  return parts.length > 2 ? `${parts.slice(0, -1).map((part) => part[0]).join('.')}.${parts.at(-1)}` : logger;
}

/** The details a health component reports, made readable: sizes in bytes become megabytes and gigabytes. */
function facts(component: HealthComponent): Array<{ label: string; value: string }> {
  return Object.entries(component.details ?? {})
    .filter(([, value]) => !Array.isArray(value) && typeof value !== 'object')
    .map(([label, value]) => ({
      label: label.replace(/([A-Z])/g, ' $1').toLowerCase(),
      value: typeof value === 'number' && value > 1_000_000 ? formatBytes(value) : String(value),
    }));
}
