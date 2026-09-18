import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';

import { requires, requiresRole, signedIn, signedOut } from './core/auth/guards';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./layout/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
      {
        path: 'sign-in',
        title: 'Sign in',
        canActivate: [signedOut],
        loadComponent: () => import('./features/auth/sign-in').then((m) => m.SignIn),
      },
      {
        path: 'sign-up',
        title: 'Create an account',
        canActivate: [signedOut],
        loadComponent: () => import('./features/auth/sign-up').then((m) => m.SignUp),
      },
      {
        path: 'forgot-password',
        title: 'Forgotten password',
        loadComponent: () => import('./features/auth/forgot-password').then((m) => m.ForgotPassword),
      },
      {
        path: 'reset-password',
        title: 'Choose a new password',
        loadComponent: () => import('./features/auth/reset-password').then((m) => m.ResetPassword),
      },
      {
        path: 'activate',
        title: 'Activate your account',
        loadComponent: () => import('./features/auth/activate').then((m) => m.Activate),
      },
    ],
  },
  {
    path: 'subscribe/:listId',
    title: 'Subscribe',
    loadComponent: () => import('./features/subscriptions/subscribe').then((m) => m.Subscribe),
  },
  {
    path: 'subscriptions/confirm',
    title: 'Confirm your subscription',
    loadComponent: () => import('./features/subscriptions/confirm-subscription').then((m) => m.ConfirmSubscription),
  },
  {
    path: 'subscriptions/manage',
    title: 'Your subscription',
    loadComponent: () => import('./features/subscriptions/manage-subscription').then((m) => m.ManageSubscription),
  },
  {
    path: '',
    canActivate: [signedIn],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Home',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
      },
      {
        // One route for a new registration and an existing one, so saving a new record can move
        // the address to its id without the map being torn down and drawn again.
        matcher: surveyMatcher,
        title: 'Survey',
        canMatch: [requires('registration:write')],
        loadComponent: () => import('./features/survey/survey').then((m) => m.Survey),
      },
      {
        path: 'registry',
        title: 'Registry',
        canMatch: [requires('registration:read')],
        loadChildren: () => import('./features/registry/registry.routes').then((m) => m.REGISTRY_ROUTES),
      },
      {
        path: 'geography',
        title: 'Geography',
        loadComponent: () => import('./features/geography/geography').then((m) => m.Geography),
      },
      {
        path: 'people',
        title: 'People',
        canMatch: [requires('user:read')],
        loadChildren: () => import('./features/people/people.routes').then((m) => m.PEOPLE_ROUTES),
      },
      {
        path: 'mail',
        title: 'Mail',
        canMatch: [requiresRole('MANAGER')],
        loadChildren: () => import('./features/mail/mail.routes').then((m) => m.MAIL_ROUTES),
      },
      {
        path: 'audiences',
        title: 'Audiences',
        canMatch: [requires('mailing:read')],
        loadChildren: () => import('./features/audiences/audiences.routes').then((m) => m.AUDIENCE_ROUTES),
      },
      {
        path: 'health',
        title: 'System health',
        canMatch: [requiresRole('MANAGER')],
        loadComponent: () => import('./features/health/health').then((m) => m.Health),
      },
      {
        path: 'account',
        title: 'Account',
        loadComponent: () => import('./features/account/account').then((m) => m.Account),
      },
      {
        path: 'forbidden',
        title: 'Not allowed',
        loadComponent: () => import('./features/errors/errors').then((m) => m.Forbidden),
      },
      {
        path: '**',
        title: 'Not found',
        loadComponent: () => import('./features/errors/errors').then((m) => m.NotFound),
      },
    ],
  },
];

/** `survey` and `survey/:id`. */
export function surveyMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments[0]?.path !== 'survey' || segments.length > 2) return null;
  return { consumed: segments, posParams: segments[1] ? { id: segments[1] } : {} };
}
