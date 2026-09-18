import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SessionStore } from './session.store';
import { TokenRefresher } from './token-refresher';

/** Auth endpoints that must never carry a bearer token or trigger a refresh. */
const ANONYMOUS = /\/api\/v1\/(auth\/(?!logout|password\/change)|subscriptions)/;

const isApiCall = (url: string): boolean =>
  url.startsWith(environment.api.iam) || url.startsWith(environment.api.core);

const withBearer = (request: HttpRequest<unknown>, token: string) =>
  request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

/**
 * Signs every API call with the access token, and survives its expiry.
 *
 * A 401 on a signed call triggers one refresh and one retry. If the refresh itself is refused, the
 * refresher has already ended the session and the original error travels on.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const sessions = inject(SessionStore);
  const refresher = inject(TokenRefresher);
  const session = sessions.session();

  if (!session || !isApiCall(request.url) || ANONYMOUS.test(request.url)) {
    return next(request);
  }

  return next(withBearer(request, session.accessToken)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return from(refresher.refresh()).pipe(
        catchError(() => throwError(() => error)),
        switchMap((renewed) => next(withBearer(request, renewed.accessToken))),
      );
    }),
  );
};
