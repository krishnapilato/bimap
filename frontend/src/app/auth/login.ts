import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ThemeService } from '../core/theme.service';
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
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly hidePassword = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  readonly isDark = computed(() => this.theme.resolved() === 'dark');

  loginRequest = new LoginRequest();

  togglePassword(): void {
    this.hidePassword.update((hidden) => !hidden);
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService
      .login(this.loginRequest)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        // Both guards redirect here with a `returnUrl`, so send people back to
        // the page they were actually trying to reach.
        next: () => this.router.navigateByUrl(this.returnUrl()),
        error: () =>
          this.errorMessage.set('Those credentials were not recognised. Please try again.'),
      });
  }

  private returnUrl(): string {
    const requested = this.route.snapshot.queryParamMap.get('returnUrl');

    // Only ever follow same-origin, in-app paths — never an absolute URL from
    // the query string.
    return requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/main';
  }
}
