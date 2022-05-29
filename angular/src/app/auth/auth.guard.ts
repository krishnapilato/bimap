import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from "@angular/router";
import { AuthService } from "./auth.service";

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    constructor(
        private router: Router,
        private authenticationService: AuthService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        const user = this.authenticationService.loginResponseValue;

        if (user.jwttoken) {
            // User found, auth ok
            console.log('AuthGuard: logged');
            return true;
        } else {
            // User not found redirect to login
            console.log('AuthGuard: not logged');
            this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
            return false;
        }
    }
}