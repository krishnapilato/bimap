import { HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export const securityInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const loginResponse = authService.loginResponseValue;

  const isLoggedIn = !!loginResponse?.jwtToken;
  const isApiUrl = req.url.startsWith(environment.baseApiUrl);

  if (isLoggedIn && isApiUrl) {
    const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${loginResponse.jwtToken}` } });
    return next(authReq);
  }
  return next(req);
};
