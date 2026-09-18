import { EnvironmentProviders, Injectable, inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { Router } from '@angular/router';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { AppMode, DEMO_CONTROLS, DemoControlsApi } from '../core/app-mode';
import { ApplicationRole } from '../core/api/iam.models';
import { SessionStore } from '../core/auth/session.store';
import { demoBackend } from './demo-backend';
import { DemoDb } from './demo-db';
import { issueSession } from './handlers/demo-context';

/** What a visitor can do to the demo itself: look through another role, or start over. */
@Injectable({ providedIn: 'root' })
export class DemoControls implements DemoControlsApi {
  private readonly db = inject(DemoDb);
  private readonly sessions = inject(SessionStore);
  private readonly queries = inject(QueryClient);
  private readonly router = inject(Router);

  /** Signs in as one of the demo people without asking for anything. */
  enterAs(role: ApplicationRole): void {
    this.sessions.start(issueSession(this.db.persona(role)), true);
  }

  async switchTo(role: ApplicationRole): Promise<void> {
    this.enterAs(role);
    this.queries.clear();
    await this.router.navigateByUrl('/');
    toast.success(`Viewing as ${this.db.persona(role).fullName}`, {
      description: ROLE_DESCRIPTIONS[role],
    });
  }

  async previewSignIn(): Promise<void> {
    this.sessions.end('signed-out');
    this.queries.clear();
    await this.router.navigateByUrl('/auth/sign-in');
  }

  reset(): void {
    this.db.reset();
    this.enterAs('ADMINISTRATOR');
    location.assign(document.baseURI);
  }
}

const ROLE_DESCRIPTIONS: Record<ApplicationRole, string> = {
  ADMINISTRATOR: 'Administrator — everything, including people, mail and system health.',
  MANAGER: 'Manager — every registration, reviews, exports, and read access to people and lists.',
  USER: 'Surveyor — records assets and follows their own registrations.',
};

function provideDemoSession(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      if (!inject(SessionStore).isAuthenticated()) inject(DemoControls).enterAs('ADMINISTRATOR');
    }),
  ]);
}

/**
 * Turns the build into the demo: the in-browser backend answers every call, and nobody is ever
 * asked to sign in — the visitor starts as the administrator and can switch roles at will.
 *
 * Loaded with a dynamic import only when `environment.demo` is true, so the live bundle never
 * downloads a byte of it.
 */
export const demoMode: AppMode = {
  interceptors: [demoBackend],
  providers: [provideDemoSession(), { provide: DEMO_CONTROLS, useExisting: DemoControls }],
};
