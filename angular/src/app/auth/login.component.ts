import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { LoginRequest } from './loginrequest';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent {
  // Attribute

  loginRequest: LoginRequest;

  // Constructor

  constructor(
    private router: Router,
    private authService: AuthService,
    private _snackbar: MatSnackBar
  ) {
    this.loginRequest = new LoginRequest();
  }

  // On submit event

  onSubmit() {
    this.authService.login(this.loginRequest).subscribe(
      () => {
        this.router.navigate(['/main']);
      },
      () => {
        this._snackbar.open('Wrong credentials', 'Close', { duration: 2000 });
      }
    );
  }
}