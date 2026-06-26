import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';
import { LoginRequest } from './loginrequest';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loginRequest = new LoginRequest();

  private router = inject(Router);
  private authService = inject(AuthService);
  private snackbar = inject(MatSnackBar);

  hidePassword = true;

  onSubmit(): void {
    this.authService.login(this.loginRequest).subscribe({
      next: () => {
        this.router.navigate(['main']);
      },
      error: (err) => {
        console.error(err);
        this.snackbar.open('Unauthorized. Please login again', 'Close', { duration: 3000 });
      },
    });
  }
}
