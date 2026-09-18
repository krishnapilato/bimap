import { Injectable, inject } from '@angular/core';

import { AuthApi } from '../api/auth.api';
import { ApiError } from '../api/api-error';
import { Session, SessionStore } from './session.store';

const LOCK_NAME = 'bimap.token-refresh';

/**
 * Exchanges the refresh token for a new pair, exactly once at a time.
 *
 * The backend treats a refresh token presented twice as stolen and ends every session on the
 * account. Two requests failing at the same moment, or two tabs, would do exactly that — so
 * refreshes are single-flight within a tab and serialised across tabs with the Web Locks API, and
 * a tab that waited re-reads storage before spending a token another tab already rotated.
 */
@Injectable({ providedIn: 'root' })
export class TokenRefresher {
  private readonly sessions = inject(SessionStore);
  private readonly auth = inject(AuthApi);
  private inFlight: Promise<Session> | null = null;

  refresh(): Promise<Session> {
    this.inFlight ??= this.rotate().finally(() => (this.inFlight = null));
    return this.inFlight;
  }

  private rotate(): Promise<Session> {
    return withLock(async () => {
      const current = this.sessions.session();
      if (!current) throw new ApiError(401, null);

      const stored = this.sessions.stored();
      if (stored && stored.refreshToken !== current.refreshToken && stored.expiresAt > Date.now() + 5_000) {
        this.sessions.adopt(stored);
        return stored;
      }

      try {
        return this.sessions.renew(await this.auth.refresh(current.refreshToken));
      } catch (error) {
        const failure = ApiError.from(error);
        if (failure.status === 401 || failure.status === 403) {
          this.sessions.end(failure.code === 'TOKEN_INVALID' ? 'revoked' : 'expired');
        }
        throw failure;
      }
    });
  }
}

async function withLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return locks ? locks.request(LOCK_NAME, task) : task();
}
