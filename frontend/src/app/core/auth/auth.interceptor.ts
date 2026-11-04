import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { apiPath } from './api-path';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const token = authService.token();
  const path = apiPath(request.url);
  const protectedRequest = path !== null && path !== '/auth/login' && path !== '/auth/signup';

  if (token && protectedRequest) {
    request = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && protectedRequest) authService.expire(token);
      if (error instanceof HttpErrorResponse && error.status === 403 && path?.startsWith('/users') && authService.isAdmin() && authService.token() === token) {
        authService.logout('Your permissions changed. Sign in again.', true);
      }
      return throwError(() => error);
    }),
  );
};
