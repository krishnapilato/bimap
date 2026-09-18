import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { AuthenticatedSession } from '../api/iam.models';
import { Haptics } from '../ui/haptics';
import { safeReturnUrl } from './guards';
import { SessionStore } from './session.store';

/**
 * What happens after any successful authentication — a password, Google, or an activation link:
 * the session is stored, anything cached for a previous person is dropped, and the app opens
 * where the person was trying to go.
 */
@Injectable({ providedIn: 'root' })
export class SignInFlow {
  private readonly sessions = inject(SessionStore);
  private readonly queries = inject(QueryClient);
  private readonly router = inject(Router);
  private readonly haptics = inject(Haptics);

  async complete(session: AuthenticatedSession, options: { remember: boolean; returnUrl?: string | null; greeting: string }): Promise<void> {
    this.sessions.start(session, options.remember);
    this.queries.clear();
    this.haptics.success();
    toast.success(`${options.greeting}, ${session.user.firstName}`);
    await this.router.navigateByUrl(safeReturnUrl(options.returnUrl));
  }
}
