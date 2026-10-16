import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./hero.component').then((m) => m.HeroComponent) },
  { path: 'login', loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent) },
  { path: 'main', loadComponent: () => import('./main/main.component').then((m) => m.MainComponent), canActivate: [authGuard] },
  { path: 'streetview', loadComponent: () => import('./streetview/streetview.component').then((m) => m.StreetviewComponent), canActivate: [authGuard] },
  { path: 'logout', loadComponent: () => import('./auth/logout.component').then((m) => m.LogoutComponent), canActivate: [authGuard] },
  { path: 'listuser', loadComponent: () => import('./user-list/user-list.component').then((m) => m.UserListComponent), canActivate: [adminGuard] },
  { path: '**', redirectTo: '' },
];
