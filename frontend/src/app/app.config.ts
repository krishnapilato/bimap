/**
 * @author Khova Krishna Pilato
 */

import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { provideBimapApi } from './core/api/api.providers';
import { routes } from './app.routes';
import { securityInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    // Everything is signals, so there is nothing for Zone.js to do.
    provideZonelessChangeDetection(),

    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),

    provideHttpClient(withFetch(), withInterceptors([securityInterceptor])),

    // The one place live and demo diverge.
    provideBimapApi(),
  ],
};
