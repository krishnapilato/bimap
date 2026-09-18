import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { provideTanStackQuery } from '@tanstack/angular-query-experimental';

import { routes } from './app.routes';
import { AppMode, LIVE_MODE } from './core/app-mode';
import { authInterceptor } from './core/auth/auth.interceptor';
import { SessionKeeper } from './core/auth/session-keeper';
import { createQueryClient } from './core/query/query-client';
import { BimapTitleStrategy } from './core/ui/title-strategy';
import { PreferencesStore } from './core/ui/preferences';
import { routeTransition } from './core/ui/route-transition';

/**
 * The application, assembled. The demo passes its own mode — an in-browser backend and an
 * automatic session — and nothing else in the app knows which one it is running.
 */
export function appConfig(mode: AppMode = LIVE_MODE): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      provideRouter(
        routes,
        withComponentInputBinding(),
        withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
        withViewTransitions({ skipInitialTransition: true, onViewTransitionCreated: routeTransition }),
      ),
      { provide: TitleStrategy, useClass: BimapTitleStrategy },
      provideHttpClient(withFetch(), withInterceptors([authInterceptor, ...mode.interceptors])),
      provideTanStackQuery(createQueryClient()),
      provideAppInitializer(() => {
        inject(PreferencesStore);
        inject(SessionKeeper);
      }),
      ...mode.providers,
    ],
  };
}
