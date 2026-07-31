import { Routes } from '@angular/router';
import { adminAuthGuard } from './auth/admin.auth.guard';
import { authGuard } from './auth/auth.guard';

/**
 * Routes are lazy so the initial download carries only what the first screen
 * needs — signing in no longer pulls in Leaflet, the Material table, or the
 * admin views.
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · BiMap',
    loadComponent: () => import('./auth/login').then((m) => m.LoginComponent),
  },
  {
    path: 'logout',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/logout').then((m) => m.LogoutComponent),
  },

  {
    path: '',
    title: 'Asset registration · BiMap',
    canActivate: [authGuard],
    loadComponent: () => import('./main/main').then((m) => m.MainComponent),
  },
  {
    path: 'main',
    title: 'Asset registration · BiMap',
    canActivate: [authGuard],
    loadComponent: () => import('./main/main').then((m) => m.MainComponent),
  },

  {
    path: 'adduser',
    title: 'Add user · BiMap',
    canActivate: [adminAuthGuard],
    loadComponent: () => import('./user-form/user-form').then((m) => m.UserFormComponent),
  },
  {
    path: 'listuser',
    title: 'Users · BiMap',
    canActivate: [adminAuthGuard],
    loadComponent: () => import('./user-list/user-list').then((m) => m.UserListComponent),
  },

  { path: '**', redirectTo: '', pathMatch: 'full' },
];
