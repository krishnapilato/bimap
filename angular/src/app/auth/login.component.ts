import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { LoginRequest } from './loginrequest';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent {
  loginRequest: LoginRequest;

  constructor(
    private router: Router,
    private authService: AuthService,
    private _snackbar: MatSnackBar
  ) {
    this.loginRequest = new LoginRequest();
  }

  onSubmit(): void {
    this.authService.login(this.loginRequest).subscribe({
      next: () => {
        this.router.navigate(['']);
      },
      error: err => {
        this._snackbar.open(err.message, 'Close', { duration: 3000 });
      }
    });
  }
}