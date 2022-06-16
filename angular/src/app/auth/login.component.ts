import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { LoginRequest } from './loginrequest';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
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
    this.authService.login(this.loginRequest).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: err => {
        this._snackbar.open(err.message, 'Close', { duration: 3000 });
      }
    });
  }
}