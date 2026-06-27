import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable()
export class SecurityInterceptor implements HttpInterceptor {
  constructor(private authenticationService: AuthService) {}

  public intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const loginResponse = this.authenticationService.loginResponseValue;

    const isLoggedIn = loginResponse && loginResponse.jwtToken;
    const isApiUrl = request.url.startsWith(environment.baseApiUrl);

    if (isLoggedIn && isApiUrl)
      request = request.clone({ setHeaders: { Authorization: `Bearer ${loginResponse.jwtToken}` } });

    return next.handle(request);
  }
}
