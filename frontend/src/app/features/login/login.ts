import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, linkedSignal, signal } from '@angular/core';
import { email, form, FormField, FormRoot, maxLength, minLength, required, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { LandmarkGallery } from '../../shared/landmark-gallery';
import { apiError } from '../../shared/api-error';
import { passwordError } from '../../shared/validation';

const ERRORS: Record<number, string> = {
  0: 'Cannot reach the server.',
  401: 'Wrong email or password.',
  409: 'This email is already registered.',
};

@Component({
  selector: 'app-login',
  imports: [LandmarkGallery, FormField, FormRoot, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly mode = input<string>();
  readonly returnUrl = input<string>();

  protected readonly signup = linkedSignal(() => this.mode() === 'signup');
  protected readonly demo = environment.demo;
  protected readonly error = signal('');
  private readonly account = signal({ name: '', surname: '', email: '', password: '' });

  protected readonly form = form(
    this.account,
    (account) => {
      required(account.name, { when: () => this.signup() });
      required(account.surname, { when: () => this.signup() });
      maxLength(account.name, 100);
      maxLength(account.surname, 100);
      required(account.email);
      email(account.email);
      maxLength(account.email, 256);
      required(account.password);
      minLength(account.password, 8, { when: () => this.signup() });
      validate(account.password, ({ value }) => passwordError(value()));
    },
    {
      submission: {
        action: () => this.send(),
        onInvalid: () => this.error.set('Check the fields below. New passwords need at least 8 characters and at most 72 UTF-8 bytes.'),
      },
    },
  );

  protected select(signup: boolean): void {
    if (this.form().submitting()) return;
    this.signup.set(signup);
    this.error.set('');
  }

  private async send(): Promise<undefined> {
    const { name, surname, email, password } = this.account();
    const session = this.signup()
      ? this.auth.signup({ name, surname, email, password })
      : this.auth.login({ email, password });
    try {
      await firstValueFrom(session);
      const destination = safeReturnUrl(this.returnUrl(), this.auth.isAdmin());
      await this.router.navigateByUrl(destination);
    } catch (error) {
      this.error.set(
        apiError(error, error instanceof HttpErrorResponse ? ERRORS[error.status] ?? 'Something went wrong. Try again.' : 'Something went wrong. Try again.'),
      );
    }
    return undefined;
  }
}

export function safeReturnUrl(value: string | undefined, administrator: boolean): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/assets';
  const path = value.split(/[?#]/, 1)[0];
  return path === '/assets' || path === '/street-view' || (path === '/users' && administrator) ? value : '/assets';
}
