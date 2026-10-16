import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) =>
  environment.demo || inject(AuthService).isLoggedIn() || redirectToLogin(state, 'You must be logged in to view that page');

export const adminGuard: CanActivateFn = (_route, state) =>
  environment.demo || inject(AuthService).isAdmin() || redirectToLogin(state, 'You are not logged in as administrator');

function redirectToLogin(state: RouterStateSnapshot, message: string) {
  inject(MatSnackBar).open(message, 'Close', { duration: 2000 });
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
}
