import { HttpParams } from '@angular/common/http';

import { Page } from '../core/api/common.models';
import { User } from '../core/api/iam.models';
import { ServiceName } from '../core/api/platform.models';

export interface DemoRequest {
  method: string;
  service: ServiceName;
  path: string;
  params: Record<string, string>;
  query: HttpParams;
  body: any;
  caller: User | null;
}

/** A response other than a plain 200 with a JSON body. */
export class DemoReply {
  constructor(
    readonly status: number,
    readonly body: unknown = null,
    readonly headers: Record<string, string> = {},
  ) {}

  static created(body: unknown): DemoReply {
    return new DemoReply(201, body);
  }

  static accepted(body: unknown = null): DemoReply {
    return new DemoReply(202, body);
  }

  static noContent(): DemoReply {
    return new DemoReply(204);
  }

  static csv(content: string, filename: string): DemoReply {
    return new DemoReply(200, new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' }), {
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
  }
}

/** A refusal, turned into the same RFC 7807 document the real services send. */
export class DemoProblem extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(detail);
  }

  static notFound(detail: string): DemoProblem {
    return new DemoProblem(404, 'RESOURCE_NOT_FOUND', detail);
  }

  static conflict(detail: string, extra: Record<string, unknown> = {}): DemoProblem {
    return new DemoProblem(409, 'RESOURCE_CONFLICT', detail, extra);
  }

  static rule(detail: string): DemoProblem {
    return new DemoProblem(422, 'BUSINESS_RULE_VIOLATED', detail);
  }

  static forbidden(): DemoProblem {
    return new DemoProblem(403, 'ACCESS_DENIED', 'You do not have permission to perform this action');
  }

  static invalid(field: string, message: string, rejectedValue: unknown = null): DemoProblem {
    return new DemoProblem(400, 'VALIDATION_FAILED', '1 field(s) failed validation', {
      violations: [{ field, message, rejectedValue }],
    });
  }
}

export type DemoHandler = (request: DemoRequest) => unknown | Promise<unknown>;

interface Route {
  method: string;
  service: ServiceName;
  pattern: RegExp;
  keys: string[];
  handler: DemoHandler;
}

/** A small route table: `/api/v1/users/:id` style paths, matched in registration order. */
export class DemoRoutes {
  private readonly routes: Route[] = [];

  get(service: ServiceName, path: string, handler: DemoHandler): this {
    return this.add('GET', service, path, handler);
  }

  post(service: ServiceName, path: string, handler: DemoHandler): this {
    return this.add('POST', service, path, handler);
  }

  put(service: ServiceName, path: string, handler: DemoHandler): this {
    return this.add('PUT', service, path, handler);
  }

  patch(service: ServiceName, path: string, handler: DemoHandler): this {
    return this.add('PATCH', service, path, handler);
  }

  delete(service: ServiceName, path: string, handler: DemoHandler): this {
    return this.add('DELETE', service, path, handler);
  }

  match(method: string, service: ServiceName, path: string): { handler: DemoHandler; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method || route.service !== service) continue;
      const found = route.pattern.exec(path);
      if (!found) continue;
      const params = Object.fromEntries(route.keys.map((key, index) => [key, decodeURIComponent(found[index + 1])]));
      return { handler: route.handler, params };
    }
    return null;
  }

  private add(method: string, service: ServiceName, path: string, handler: DemoHandler): this {
    const keys: string[] = [];
    const source = path.replace(/:([a-zA-Z]+)/g, (_match, key: string) => {
      keys.push(key);
      return '([^/]+)';
    });
    this.routes.push({ method, service, pattern: new RegExp(`^${source}$`), keys, handler });
    return this;
  }
}

// ── Request helpers ──────────────────────────────────────────────────────────

export function text(request: DemoRequest, name: string): string | undefined {
  const value = request.query.get(name);
  return value === null || value.trim() === '' ? undefined : value.trim();
}

export function integer(request: DemoRequest, name: string, fallback: number): number {
  const value = Number(request.query.get(name));
  return Number.isFinite(value) && request.query.has(name) ? value : fallback;
}

export function requireCaller(request: DemoRequest): User {
  if (!request.caller) {
    throw new DemoProblem(401, 'AUTHENTICATION_REQUIRED', 'This endpoint requires a valid bearer token.');
  }
  return request.caller;
}

export function requireAuthority(request: DemoRequest, authority: string): User {
  const caller = requireCaller(request);
  if (!caller.permissions.includes(authority as never)) throw DemoProblem.forbidden();
  return caller;
}

export function requireRole(request: DemoRequest, ...roles: string[]): User {
  const caller = requireCaller(request);
  if (!roles.includes(caller.role)) throw DemoProblem.forbidden();
  return caller;
}

/** Folds accents and punctuation away, exactly as the business service does before matching. */
export function fold(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/['\-\s]+/g, ' ')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .trim();
}

/** 0 for a prefix, 1 for a word start, 2 for anywhere, null for no match. */
export function rank(candidate: string | null | undefined, foldedQuery: string): number | null {
  if (!foldedQuery) return 0;
  const folded = fold(candidate);
  if (folded.startsWith(foldedQuery)) return 0;
  if (folded.includes(` ${foldedQuery}`)) return 1;
  return folded.includes(foldedQuery) ? 2 : null;
}

/** Spring Data paging over an in-memory collection, including `sort=field,direction`. */
export function paginate<T>(items: T[], request: DemoRequest, defaults: { size: number; sort?: string }): Page<T> {
  const size = Math.max(1, Math.min(integer(request, 'size', defaults.size), 2000));
  const page = Math.max(0, integer(request, 'page', 0));
  const sort = request.query.get('sort') ?? defaults.sort;

  const sorted = sort ? [...items].sort(comparator(sort)) : items;
  const totalElements = sorted.length;
  const totalPages = Math.ceil(totalElements / size);

  return {
    content: sorted.slice(page * size, page * size + size),
    page,
    size,
    totalElements,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1,
  };
}

function comparator<T>(sort: string): (a: T, b: T) => number {
  const [field, direction = 'asc'] = sort.split(',');
  const sign = direction.toLowerCase() === 'desc' ? -1 : 1;
  return (a, b) => {
    const left = (a as Record<string, unknown>)[field];
    const right = (b as Record<string, unknown>)[field];
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * sign;
    return String(left).localeCompare(String(right), 'it', { sensitivity: 'base' }) * sign;
  };
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

export function daysAgo(days: number, hour = 10, minute = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, minute, 0, 0);
  if (days < 0) return date.toISOString();
  // A moment seeded for today never lands later than now, so nothing past reads "in 6 hours".
  const latest = Date.now() - (days * 7 + hour + minute) * 60_000;
  return new Date(Math.min(date.getTime(), latest)).toISOString();
}

/** A deterministic pseudo-random generator, so seeded data is the same on every reset. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let content = String(value);
  if (/^[=+\-@\t\r]/.test(content)) content = `'${content}`;
  return `"${content.replace(/"/g, '""')}"`;
}
