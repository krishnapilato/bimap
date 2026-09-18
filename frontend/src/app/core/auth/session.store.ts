import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { ApplicationRole, AuthenticatedSession, Permission, User } from '../api/iam.models';

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds at which the access token stops being accepted. */
  expiresAt: number;
  user: User;
  /** Kept across browser restarts, or only for this browsing session. */
  remember: boolean;
}

/** Why a session ended, so the sign-in screen can say the right thing. */
export type SessionEnd = 'signed-out' | 'expired' | 'revoked' | 'elsewhere';

const STORAGE_KEY = 'bimap.session';

const ROLE_RANK: Record<ApplicationRole, number> = { USER: 0, MANAGER: 1, ADMINISTRATOR: 2 };

/**
 * Who is signed in, as signals.
 *
 * "Keep me signed in" decides the storage: local storage survives a restart, session storage does
 * not. Changes made in another tab arrive through the `storage` event, so signing out in one tab
 * signs out all of them, and a token another tab rotated is adopted rather than reused.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly state = signal<Session | null>(readStoredSession());
  private readonly lastEnd = signal<SessionEnd | null>(null);

  readonly session = this.state.asReadonly();
  readonly user = computed(() => this.state()?.user ?? null);
  readonly isAuthenticated = computed(() => this.state() !== null);
  readonly role = computed(() => this.state()?.user.role ?? null);
  readonly endReason = this.lastEnd.asReadonly();

  private readonly permissionSet = computed(() => new Set(this.state()?.user.permissions ?? []));

  constructor() {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = readStoredSession();
      if (!next && this.state()) this.lastEnd.set('elsewhere');
      this.state.set(next);
    };
    window.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
  }

  can(permission: Permission): boolean {
    return this.permissionSet().has(permission);
  }

  isAtLeast(role: ApplicationRole): boolean {
    const current = this.role();
    return current !== null && ROLE_RANK[current] >= ROLE_RANK[role];
  }

  start(authenticated: AuthenticatedSession, remember: boolean): Session {
    this.lastEnd.set(null);
    return this.store(toSession(authenticated, remember));
  }

  /** A refreshed token pair, stored wherever the session already lives. */
  renew(authenticated: AuthenticatedSession): Session {
    return this.store(toSession(authenticated, this.state()?.remember ?? true));
  }

  /** A session another tab already rotated. */
  adopt(session: Session): void {
    this.state.set(session);
  }

  updateUser(user: User): void {
    const current = this.state();
    if (current) this.store({ ...current, user });
  }

  end(reason: SessionEnd): void {
    this.lastEnd.set(reason);
    this.state.set(null);
    removeStoredSession();
  }

  /** The session as it stands in storage right now, which another tab may have changed. */
  stored(): Session | null {
    return readStoredSession();
  }

  private store(session: Session): Session {
    removeStoredSession();
    try {
      (session.remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage can be unavailable in private modes; the session still lives for this page.
    }
    this.state.set(session);
    return session;
  }
}

function toSession(authenticated: AuthenticatedSession, remember: boolean): Session {
  return {
    accessToken: authenticated.accessToken,
    refreshToken: authenticated.refreshToken,
    expiresAt: Date.now() + authenticated.expiresIn * 1000,
    user: authenticated.user,
    remember,
  };
}

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function removeStoredSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}
