/**
 * Route guards, as functions.
 *
 * @author Khova Krishna Pilato
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionService } from './session.service';

/** Sends an anonymous caller to the landing page, remembering where they were headed. */
export const authenticated: CanActivateFn = (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  return session.isAuthenticated()
    ? true
    : router.createUrlTree(['/'], { queryParams: { next: state.url } });
};

/** For the parts of the directory only an administrator may open. */
export const administrator: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (!session.isAuthenticated()) {
    return router.createUrlTree(['/']);
  }
  return session.isAdministrator() ? true : router.createUrlTree(['/hub']);
};
