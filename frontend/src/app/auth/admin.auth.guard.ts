import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

export const adminAuthGuard: CanActivateFn = (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const snackbar = inject(MatSnackBar);

  const loginResponse = authService.loginResponseValue;

  if (loginResponse?.jwtToken && loginResponse?.user?.applicationRole === 'ADMINISTRATOR') {
    snackbar.open(`Welcome ${loginResponse.user.name}`, 'Close', { duration: 1000 });
    return true;
  }

  snackbar.open('You are not logged in as administrator', 'Close', { duration: 2000 });

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};