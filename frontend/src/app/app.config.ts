import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { demoInterceptor } from './core/demo/demo.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    environment.demo
      ? provideRouter(routes, withComponentInputBinding(), withHashLocation())
      : provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([environment.demo ? demoInterceptor : authInterceptor])),
  ]
};
