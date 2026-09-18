import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';

import { ApplicationRole, Permission } from '../api/iam.models';
import { SessionStore } from './session.store';

/** Signed-in callers only; everyone else goes to sign in and comes back afterwards. */
export const signedIn: CanActivateFn = (_route, state) => {
  const sessions = inject(SessionStore);
  if (sessions.isAuthenticated()) return true;

  return inject(Router).createUrlTree(['/auth/sign-in'], {
    queryParams: state.url && state.url !== '/' ? { returnUrl: state.url } : {},
  });
};

/** Sign-in and sign-up make no sense to someone already signed in. */
export const signedOut: CanActivateFn = () => {
  return inject(SessionStore).isAuthenticated() ? inject(Router).createUrlTree(['/']) : true;
};

/** A section that needs a permission is not even matched without it, so its code never loads. */
export const requires =
  (permission: Permission): CanMatchFn =>
  () =>
    inject(SessionStore).can(permission) || inject(Router).createUrlTree(['/forbidden']);

export const requiresRole =
  (role: ApplicationRole): CanMatchFn =>
  () =>
    inject(SessionStore).isAtLeast(role) || inject(Router).createUrlTree(['/forbidden']);

/** Keeps a return URL on this origin and inside the app. */
export function safeReturnUrl(candidate: string | null | undefined): string {
  return candidate && candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/';
}
