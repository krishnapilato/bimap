import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { securityInterceptor } from './auth/auth.interceptor';
import { routes } from './app.routes';
import { ThemeService } from './core/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),

    // HttpClient was previously never provided, and `securityInterceptor` was
    // defined but never registered — so no request ever carried the JWT.
    provideHttpClient(withInterceptors([securityInterceptor])),

    provideAppInitializer(() => {
      // Every `<mat-icon>` renders from the Material Symbols Rounded variable
      // font loaded in index.html rather than the legacy Material Icons bitmap.
      inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-rounded');

      // Instantiate eagerly so the resolved colour scheme is applied and kept in
      // sync with the OS setting for the whole session.
      inject(ThemeService);
    }),
  ],
};
