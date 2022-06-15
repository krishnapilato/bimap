import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';

@Injectable()
export class SecurityInterceptor implements HttpInterceptor {
  // Constructor

  constructor(private authenticationService: AuthService) {}

  // Intercept the user requests when the user try to access to restricted services
  // and add authorization header with jwt token if available

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const loginResponse = this.authenticationService.loginResponseValue;

    const isLoggedIn = loginResponse && loginResponse.jwttoken;
    const isApiUrl = request.url.startsWith(environment.baseApiUrl);

    if (isLoggedIn && isApiUrl) {
      request = request.clone({
        setHeaders: { Authorization: `Bearer ${loginResponse.jwttoken}` }
      });
    }

    return next.handle(request);
  }
}