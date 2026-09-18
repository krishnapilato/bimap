import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { QueryClient } from '@tanstack/angular-query-experimental';

import { AuthApi } from '../api/auth.api';
import { SessionStore } from './session.store';

/** Ends the session everywhere: the server revokes every refresh token, the client forgets it all. */
@Injectable({ providedIn: 'root' })
export class SignOut {
  private readonly auth = inject(AuthApi);
  private readonly sessions = inject(SessionStore);
  private readonly queries = inject(QueryClient);
  private readonly router = inject(Router);

  async run(): Promise<void> {
    try {
      await this.auth.logout();
    } catch {
      // Signing out locally must work even when the server cannot be reached.
    }
    this.sessions.end('signed-out');
    this.queries.clear();
    await this.router.navigate(['/auth/sign-in']);
  }
}
