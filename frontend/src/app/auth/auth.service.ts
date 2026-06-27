import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest } from './loginrequest';
import { LoginResponse } from './loginresponse';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loginUrl: string;
  private loginResponseSubject: BehaviorSubject<LoginResponse>;
  public loginResponse: Observable<LoginResponse>;

  constructor(private router: Router, private http: HttpClient, private _snackbar: MatSnackBar) {
    this.loginUrl = environment.baseApiUrl + '/auth/login';
    this.loginResponseSubject = new BehaviorSubject<LoginResponse>(JSON.parse(localStorage.getItem('LoginResponse') || '{}'));
    this.loginResponse = this.loginResponseSubject.asObservable();
  }

  public get loginResponseValue(): LoginResponse {
    return this.loginResponseSubject.value;
  }

  public get isLogged(): boolean { 
    return this.loginResponseValue.jwtToken != null; 
  }

  public login(loginRequest: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.loginUrl, loginRequest).pipe(
      map((loginResponse: LoginResponse) => {
        localStorage.setItem('LoginResponse', JSON.stringify(loginResponse));
        this.loginResponseSubject.next(loginResponse);
        if (loginResponse) this._snackbar.open('Login successful', 'Close', { duration: 2000 });
        return loginResponse;
      }),
    );
  }

  public logout(): void {
    localStorage.removeItem('LoginResponse');
    this.loginResponseSubject.next(new LoginResponse());
    this.router.navigate(['/login']);
    this._snackbar.open('Logout successful', 'Close', { duration: 2000 });
  }
}
