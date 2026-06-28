import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const snackbar = inject(MatSnackBar);

  const user = authService.loginResponseValue;

  if (user?.jwtToken) return true;

  snackbar.open('You must be logged in to view that page', 'Close', { duration: 2000 });

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
