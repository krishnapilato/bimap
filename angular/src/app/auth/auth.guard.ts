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
export class AuthGuard implements CanActivate {
  // Constructor

  constructor(
    private router: Router,
    private authenticationService: AuthService,
    private _snackbar: MatSnackBar
  ) {}

  // Method called when the user wants to access a page that requires authentication

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const user = this.authenticationService.loginResponseValue;

    if (user.jwttoken) {
      return true;
    } else {
      this._snackbar.open('You must be logged in to view that page', 'Close', {
        duration: 2000
      });
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }
  }
}