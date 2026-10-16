import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home').then((m) => m.Home) },
  { path: 'login', loadComponent: () => import('./features/login/login').then((m) => m.Login) },
  { path: 'logout', loadComponent: () => import('./features/login/logout').then((m) => m.Logout), canActivate: [authGuard] },
  { path: 'assets', loadComponent: () => import('./features/assets/assets').then((m) => m.Assets), canActivate: [authGuard] },
  { path: 'street-view', loadComponent: () => import('./features/street-view/street-view').then((m) => m.StreetView), canActivate: [authGuard] },
  { path: 'users', loadComponent: () => import('./features/users/users').then((m) => m.Users), canActivate: [adminGuard] },
  { path: 'main', redirectTo: 'assets' },
  { path: 'streetview', redirectTo: 'street-view' },
  { path: 'listuser', redirectTo: 'users' },
  { path: '**', redirectTo: '' },
];
