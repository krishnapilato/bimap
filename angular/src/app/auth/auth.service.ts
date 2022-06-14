import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LoginRequest } from './loginrequest';
import { LoginResponse } from './loginresponse';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Attributes

  private loginUrl: string;
  private loginResponseSubject: BehaviorSubject<LoginResponse>;
  public loginResponse: Observable<LoginResponse>;

  // Constructor

  constructor(
    private router: Router,
    private http: HttpClient,
    private _snackbar: MatSnackBar
  ) {
    this.loginUrl = environment.baseApiUrl + '/login';
    this.loginResponseSubject = new BehaviorSubject<LoginResponse>(
      JSON.parse(localStorage.getItem('LoginResponse') || '{}')
    );
    this.loginResponse = this.loginResponseSubject.asObservable();
  }

  // Method to get login response value

  public get loginResponseValue(): LoginResponse {
    return this.loginResponseSubject.value;
  }

  // Method to get if user is logged in

  public get isLogged() {
    return this.loginResponseValue.jwttoken != null;
  }

  // Method called when user try to login

  public login(loginRequest: LoginRequest) {
    return this.http.post<LoginResponse>(this.loginUrl, loginRequest).pipe(
      map(loginResponse => {
        localStorage.setItem('LoginResponse', JSON.stringify(loginResponse));
        this.loginResponseSubject.next(loginResponse);
        if (loginResponse) {
          this._snackbar.open('Login successful', 'Close', { duration: 2000 });
        }
        return loginResponse;
      })
    );
  }

  // Method called when the user wants to logout

  public logout() {
    localStorage.removeItem('LoginResponse');
    this.loginResponseSubject.next(new LoginResponse());
    this.router.navigate(['/login']);
    this._snackbar.open('Logout successful', 'Close', { duration: 2000 });
  }
}