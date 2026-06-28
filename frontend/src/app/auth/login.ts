import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { delay, finalize } from 'rxjs';

import { AuthService } from './auth.service';
import { LoginRequest } from './loginrequest';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatIconModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private snackbar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  hidePassword = signal(true);
  isSubmitting = signal(false);

  public loginRequest: LoginRequest = new LoginRequest();

  public togglePassword(): void {
    this.hidePassword.update((hide) => !hide);
  }

  public onSubmit(): void {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);

    this.authService
      .login(this.loginRequest)
      .pipe(
        delay(1000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
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
