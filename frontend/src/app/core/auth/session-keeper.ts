import { DestroyRef, Injectable, effect, inject } from '@angular/core';

import { SessionStore } from './session.store';
import { TokenRefresher } from './token-refresher';

/** How long before expiry the access token is renewed. */
const LEAD_TIME_MS = 60_000;

/**
 * Renews the access token shortly before it expires, so a request rarely meets a 401 at all.
 *
 * A hidden tab lets its timer lapse; when it becomes visible again it renews immediately if the
 * token is about to go, instead of every background tab rotating tokens all day.
 */
@Injectable({ providedIn: 'root' })
export class SessionKeeper {
  private readonly sessions = inject(SessionStore);
  private readonly refresher = inject(TokenRefresher);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const session = this.sessions.session();
      clearTimeout(this.timer);
      if (!session) return;

      const due = Math.max(session.expiresAt - Date.now() - LEAD_TIME_MS, 5_000);
      this.timer = setTimeout(() => this.renewIfVisible(), due);
    });

    const onVisibility = () => {
      const session = this.sessions.session();
      if (document.visibilityState === 'visible' && session && session.expiresAt - Date.now() < LEAD_TIME_MS) {
        this.renew();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      document.removeEventListener('visibilitychange', onVisibility);
    });
  }

  private renewIfVisible(): void {
    if (document.visibilityState === 'visible') this.renew();
  }

  private renew(): void {
    this.refresher.refresh().catch(() => {
      // The refresher ends the session when the server refuses; a network blip simply waits for the next try.
    });
  }
}
