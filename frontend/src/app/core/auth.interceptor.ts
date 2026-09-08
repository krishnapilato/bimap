/**
 * Attaches the bearer token, and lets an expired one end the session cleanly.
 *
 * Calls to the public geography APIs must go out bare: sending a BiMap token to Nominatim would
 * leak it to a third party for no benefit.
 *
 * @author Khova Krishna Pilato
 */

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { SessionService } from './session.service';

const THIRD_PARTY = [
  'comuni-ita.nicolorebaioli.dev',
  'nominatim.openstreetmap.org',
  'codiceunivoco.it',
  'accounts.google.com',
];

export const securityInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const token = session.accessToken();

  const outbound =
    token && !THIRD_PARTY.some((host) => request.url.includes(host))
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(outbound).pipe(
    catchError((error: unknown) => {
      const unauthorised = error instanceof HttpErrorResponse && error.status === 401;
      const ours = !THIRD_PARTY.some((host) => request.url.includes(host));

      if (unauthorised && ours && session.isAuthenticated()) {
        session.signOut();
      }
      return throwError(() => error);
    }),
  );
};

/** Only meaningful in live mode; the demo build has no origin to reach. */
export const apiOrigins = {
  iam: environment.iamApiUrl,
  business: environment.businessApiUrl,
} as const;
