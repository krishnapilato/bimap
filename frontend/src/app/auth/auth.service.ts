import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest } from './loginrequest';
import { LoginResponse } from './loginresponse';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private snackbar = inject(MatSnackBar);

  private loginUrl = `${environment.baseApiUrl}/auth/login`;

  private getInitialState(): LoginResponse {
    const stored = localStorage.getItem('LoginResponse');
    return stored ? JSON.parse(stored) : ({} as LoginResponse);
  }

  private loginResponseSubject = new BehaviorSubject<LoginResponse>(this.getInitialState());

  public loginResponse$ = this.loginResponseSubject.asObservable();

  public get loginResponseValue(): LoginResponse {
    return this.loginResponseSubject.value;
  }

  public get isLogged(): boolean {
    return !!this.loginResponseValue?.jwtToken;
  }

  public login(loginRequest: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.loginUrl, loginRequest).pipe(
      tap((response: LoginResponse) => {
        if (response?.jwtToken) {
          localStorage.setItem('LoginResponse', JSON.stringify(response));
          this.loginResponseSubject.next(response);
          this.snackbar.open('Login successful', 'Close', { duration: 2000 });
        }
      }),
    );
  }

  public logout(): void {
    localStorage.removeItem('LoginResponse');
    this.loginResponseSubject.next({} as LoginResponse);
    this.router.navigate(['/login']);
    this.snackbar.open('Logout successful', 'Close', { duration: 2000 });
  }
}
