import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AdminAuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authenticationService: AuthService,
    private _snackbar: MatSnackBar
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const user = this.authenticationService.loginResponseValue;

    if (user.jwttoken && user.user.applicationRole === 'ADMINISTRATOR') {
      this._snackbar.open('Welcome ' + user.user.name, 'Close', {
        duration: 1000
      });
      return true;
    } else {
      this._snackbar.open('You are not logged in as administrator', 'Close', {
        duration: 2000
      });
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }
  }
}