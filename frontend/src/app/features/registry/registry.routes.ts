import { Routes } from '@angular/router';

export const REGISTRY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./registry-list').then((m) => m.RegistryList),
  },
  {
    path: ':id',
    title: 'Registration',
    loadComponent: () => import('./registry-detail').then((m) => m.RegistryDetail),
  },
];
