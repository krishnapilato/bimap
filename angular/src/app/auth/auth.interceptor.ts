import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';

@Injectable()
export class SecurityInterceptor implements HttpInterceptor {
    constructor(private authenticationService: AuthService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const loginResponse = this.authenticationService.loginResponseValue;

        const isLoggedIn = loginResponse && loginResponse.jwttoken;
        console.log("intercepted");
        const isApiUrl = request.url.startsWith(environment.baseApiUrl);

        if (isLoggedIn && isApiUrl) {
            request = request.clone({setHeaders: {Authorization: `Bearer ${loginResponse.jwttoken}`}});
        }
        
        return next.handle(request);
    }
}