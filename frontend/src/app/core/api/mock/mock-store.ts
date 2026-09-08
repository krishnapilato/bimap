/**
 * The browser-side database behind demo mode.
 *
 * Everything the mock adapters read and write lives in localStorage under one namespaced key per
 * collection, so a demo survives a reload and a visitor can lock a user, send an email and come
 * back to find it still there. Nothing is shared between visitors: the whole point of the GitHub
 * Pages build is that it has no server.
 *
 * @author Khova Krishna Pilato
 */

import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import { EmailMessage, ProblemDetail, UserAccount } from '../models';

const NAMESPACE = 'bimap.demo';

/** Enough latency that spinners and optimistic states are actually exercised. */
const MIN_LATENCY_MS = 180;
const MAX_LATENCY_MS = 420;

export const MockKeys = {
  users: `${NAMESPACE}.users`,
  emails: `${NAMESPACE}.emails`,
  session: `${NAMESPACE}.session`,
  pendingOtp: `${NAMESPACE}.pendingOtp`,
  seed: `${NAMESPACE}.seed`,
} as const;

/**
 * Bump this whenever the seed data below changes shape or membership.
 *
 * The store is written to localStorage on first use, so a visitor who came back after a deploy was
 * still running last week's accounts against this week's code — which is how removing one seeded
 * user turned every sign-in into "something went wrong". A version stamp makes the stale copy
 * announce itself, and the data is simply re-seeded.
 */
const SEED_VERSION = '2';

/** Discards a store written by an older seed, before anything has a chance to read it. */
function ensureCurrentSeed(): void {
  try {
    if (localStorage.getItem(MockKeys.seed) === SEED_VERSION) {
      return;
    }
    for (const key of [MockKeys.users, MockKeys.emails, MockKeys.session, MockKeys.pendingOtp]) {
      localStorage.removeItem(key);
    }
    localStorage.setItem(MockKeys.seed, SEED_VERSION);
  } catch {
    // Storage blocked entirely: everything falls back to the seed arrays anyway.
  }
}

/** Wraps a value in an observable that behaves like a network call. */
export function respond<T>(value: T): Observable<T> {
  return of(value).pipe(delay(latency()));
}

/** Fails the way the real backend fails, so error handling is exercised identically. */
export function fail<T>(status: number, title: string, detail: string, code: string): Observable<T> {
  const problem: ProblemDetail = {
    type: `urn:bimap:error:${code.toLowerCase().replace(/_/g, '-')}`,
    title,
    status,
    detail,
    code,
    correlationId: crypto.randomUUID(),
  };
  return throwError(() => ({ status, error: problem })).pipe(delay(latency()));
}

function latency(): number {
  return MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
}

export function read<T>(key: string, fallback: T): T {
  try {
    ensureCurrentSeed();
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T): T {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A full or blocked storage quota must not take the demo down.
  }
  return value;
}

export function resetDemoData(): void {
  Object.values(MockKeys).forEach((key) => localStorage.removeItem(key));
}

/**
 * A stored record that no longer parses into the shape the code expects is indistinguishable, from
 * the outside, from a broken application. Anything that survives the version check but still fails
 * to answer is thrown away rather than served.
 */
export function readValid<T>(key: string, fallback: T, valid: (value: T) => boolean): T {
  const stored = read<T>(key, fallback);
  if (valid(stored)) {
    return stored;
  }
  write(key, fallback);
  return fallback;
}

// ── Seed data ────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysAgo = (days: number) => new Date(now - days * DAY).toISOString();

/** Mirrors backend/iam-service/src/main/resources/seed/users.json, so both modes look alike. */
export const SEED_USERS: UserAccount[] = [
  {
    id: 'b1a7f5c2-1f2e-4a3b-9c8d-0e1f2a3b4c5d',
    firstName: 'Khova Krishna',
    lastName: 'Pilato',
    fullName: 'Khova Krishna Pilato',
    email: 'krishnak.pilato@gmail.com',
    status: 'ACTIVE',
    role: 'ADMINISTRATOR',
    authProvider: 'LOCAL',
    permissions: [
      'registration:read',
      'registration:write',
      'registration:read-all',
      'registration:export',
      'user:read',
      'user:write',
      'user:lifecycle',
    ],
    locale: 'it-IT',
    lastLoginAt: daysAgo(0),
    createdAt: daysAgo(90),
    updatedAt: daysAgo(0),
  },
  {
    id: 'd3c9f7e4-3b4a-4c6d-9e0f-2a3b4c5d6e7f',
    firstName: 'Marco',
    lastName: 'Bianchi',
    fullName: 'Marco Bianchi',
    email: 'marco.bianchi@bimap.local',
    status: 'ACTIVE',
    role: 'MANAGER',
    authProvider: 'LOCAL',
    permissions: [
      'registration:read',
      'registration:write',
      'registration:read-all',
      'registration:export',
      'user:read',
    ],
    locale: 'it-IT',
    lastLoginAt: daysAgo(3),
    createdAt: daysAgo(61),
    updatedAt: daysAgo(3),
  },
  {
    id: 'e4d0a8f5-4c5b-4d7e-a01f-3b4c5d6e7f80',
    firstName: 'Giulia',
    lastName: 'Rossi',
    fullName: 'Giulia Rossi',
    email: 'giulia.rossi@bimap.local',
    status: 'ACTIVE',
    role: 'USER',
    authProvider: 'LOCAL',
    permissions: ['registration:read', 'registration:write'],
    locale: 'it-IT',
    lastLoginAt: daysAgo(6),
    createdAt: daysAgo(45),
    updatedAt: daysAgo(6),
  },
  {
    id: 'f5e1b906-5d6c-4e8f-b120-4c5d6e7f8091',
    firstName: 'Luca',
    lastName: 'Conti',
    fullName: 'Luca Conti',
    email: 'luca.conti@bimap.local',
    status: 'LOCKED',
    role: 'USER',
    authProvider: 'LOCAL',
    permissions: ['registration:read', 'registration:write'],
    locale: 'it-IT',
    lastLoginAt: daysAgo(21),
    createdAt: daysAgo(38),
    updatedAt: daysAgo(4),
  },
  {
    id: 'a6f2ca17-6e7d-4f90-c231-5d6e7f809102',
    firstName: 'Sofia',
    lastName: 'Greco',
    fullName: 'Sofia Greco',
    email: 'sofia.greco@bimap.local',
    status: 'PENDING_ACTIVATION',
    role: 'USER',
    authProvider: 'LOCAL',
    permissions: ['registration:read', 'registration:write'],
    locale: 'it-IT',
    lastLoginAt: null,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: 'b703db28-7f8e-40a1-d342-6e7f80910213',
    firstName: 'Antonio',
    lastName: 'Moretti',
    fullName: 'Antonio Moretti',
    email: 'antonio.moretti@bimap.local',
    status: 'DISABLED',
    role: 'MANAGER',
    authProvider: 'LOCAL',
    permissions: [
      'registration:read',
      'registration:write',
      'registration:read-all',
      'registration:export',
      'user:read',
    ],
    locale: 'it-IT',
    lastLoginAt: daysAgo(52),
    createdAt: daysAgo(120),
    updatedAt: daysAgo(30),
  },
];

export const SEED_EMAILS: EmailMessage[] = [
  {
    id: 'm-1001',
    to: 'sofia.greco@bimap.local',
    subject: 'Confirm your email address',
    format: 'HTML',
    body: '<h1>Confirm your email address</h1><p>One click and your BiMap account is ready.</p>',
    attachments: [],
    status: 'SENT',
    sentAt: daysAgo(2),
  },
  {
    id: 'm-1002',
    to: 'luca.conti@bimap.local',
    subject: 'Your account is temporarily locked',
    format: 'HTML',
    body: '<h1>Account locked</h1><p>Too many failed sign-in attempts. It unlocks in 15 minutes.</p>',
    attachments: [],
    status: 'SENT',
    sentAt: daysAgo(4),
  },
  {
    id: 'm-1003',
    to: 'marco.bianchi@bimap.local',
    subject: 'Registrations export — September',
    format: 'HTML',
    body: '<h1>Export ready</h1><p>The registrations you asked for are attached.</p>',
    attachments: [
      { filename: 'bimap-registrations-2026-09.csv', contentType: 'text/csv', sizeBytes: 184320 },
    ],
    status: 'SENT',
    sentAt: daysAgo(5),
  },
  {
    id: 'm-1004',
    to: 'no-such-mailbox@bimap.local',
    subject: 'Reset your password',
    format: 'HTML',
    body: '<h1>Reset your password</h1><p>This link works for 60 minutes.</p>',
    attachments: [],
    status: 'FAILED',
    failureReason: '550 5.1.1 Recipient address rejected: User unknown',
    sentAt: daysAgo(7),
  },
  {
    id: 'm-1005',
    to: 'elena.ferrari@bimap.local',
    subject: 'Welcome to BiMap',
    format: 'TEXT',
    body: 'Your address is confirmed and you can sign in.',
    attachments: [],
    status: 'SENT',
    sentAt: daysAgo(9),
  },
];

export function users(): UserAccount[] {
  return readValid<UserAccount[]>(
    MockKeys.users,
    SEED_USERS,
    (stored) => Array.isArray(stored) && stored.length > 0 && stored.every((user) => !!user?.email),
  );
}

export function saveUsers(next: UserAccount[]): UserAccount[] {
  return write(MockKeys.users, next);
}

export function emails(): EmailMessage[] {
  return readValid<EmailMessage[]>(
    MockKeys.emails,
    SEED_EMAILS,
    (stored) => Array.isArray(stored) && stored.every((message) => !!message?.id),
  );
}

export function saveEmails(next: EmailMessage[]): EmailMessage[] {
  return write(MockKeys.emails, next);
}
