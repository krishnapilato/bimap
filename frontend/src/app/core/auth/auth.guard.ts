import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../shared/toast.service';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) =>
  environment.demo || inject(AuthService).isLoggedIn() || redirectToLogin(state, 'You must be logged in to view that page');

export const adminGuard: CanActivateFn = (_route, state) =>
  environment.demo || inject(AuthService).isAdmin() || redirectToLogin(state, 'You are not logged in as administrator');

function redirectToLogin(state: RouterStateSnapshot, message: string) {
  inject(ToastService).show(message);
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
}
