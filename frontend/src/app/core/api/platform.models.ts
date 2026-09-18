/** A point-in-time reading of one service, from `/api/platform/runtime`. */
export interface RuntimeSnapshot {
  service: string;
  version: string;
  status: string;
  components: Array<{ name: string; status: string }>;
  profiles: string[];
  runtime: { java: string; jvm: string; os: string; architecture: string; port: number };
  uptime: { seconds: number; display: string };
  heap: MemoryReading;
  nonHeap: MemoryReading;
  cpu: { process: number; system: number; cores: number };
  threads: { live: number; daemon: number; peak: number };
  http: { requests: number; averageMillis: number; slowestMillis: number; clientErrors: number; serverErrors: number };
  database?: { active: number; idle: number; max: number; pending: number };
  startedAt: string;
  sampledAt: string;
}

export interface MemoryReading {
  used: number;
  committed: number;
  max: number;
  usedRatio: number;
  display: string;
  usedDisplay: string;
  maxDisplay: string;
}

export type HealthStatus = 'UP' | 'DOWN' | 'OUT_OF_SERVICE' | 'UNKNOWN' | string;

/** `/actuator/health`, with details when the caller is allowed to see them. */
export interface HealthComponent {
  status: HealthStatus;
  details?: Record<string, unknown>;
  components?: Record<string, HealthComponent>;
  groups?: string[];
}

export interface MetricResponse {
  name: string;
  description?: string;
  baseUnit?: string;
  measurements: Array<{ statistic: string; value: number }>;
  availableTags: Array<{ tag: string; values: string[] }>;
}

export interface LoggerLevels {
  configuredLevel?: string;
  effectiveLevel?: string;
}

export interface LoggersResponse {
  levels: string[];
  loggers: Record<string, LoggerLevels>;
  groups?: Record<string, { configuredLevel?: string; members: string[] }>;
}

export interface CachesResponse {
  cacheManagers: Record<string, { caches: Record<string, { target: string }> }>;
}

export type ServiceName = 'iam' | 'core';
