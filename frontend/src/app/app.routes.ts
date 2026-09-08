/**
 * Every view is lazy, so the landing page carries none of the module code.
 *
 * @author Khova Krishna Pilato
 */

import { Routes } from '@angular/router';

import { administrator, authenticated } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    title: 'BiMap · Cadastral and heritage asset intelligence',
    loadComponent: () => import('./features/landing/landing').then((m) => m.LandingComponent),
  },
  {
    path: 'hub',
    title: 'Modules · BiMap',
    canActivate: [authenticated],
    loadComponent: () => import('./features/hub/hub').then((m) => m.HubComponent),
  },
  {
    path: 'geo',
    title: 'Geographic asset engine · BiMap',
    canActivate: [authenticated],
    loadComponent: () => import('./features/geo/geo').then((m) => m.GeoComponent),
  },
  {
    path: 'iam',
    title: 'Identity & access · BiMap',
    canActivate: [administrator],
    loadComponent: () => import('./features/iam/iam').then((m) => m.IamComponent),
  },
  {
    path: 'email',
    title: 'Email dispatcher · BiMap',
    canActivate: [authenticated],
    loadComponent: () => import('./features/email/email').then((m) => m.EmailComponent),
  },
  {
    path: 'health',
    title: 'System health · BiMap',
    canActivate: [authenticated],
    loadComponent: () => import('./features/health/health').then((m) => m.HealthComponent),
  },

  { path: '**', redirectTo: '', pathMatch: 'full' },
];
