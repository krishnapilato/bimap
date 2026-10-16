import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, linkedSignal, signal } from '@angular/core';
import { email, form, FormField, FormRoot, minLength, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AerialMapComponent } from '../aerial-map.component';
import { AuthService } from './auth.service';

const ERRORS: Record<number, string> = {
  0: 'Cannot reach the server.',
  401: 'Wrong email or password.',
  409: 'This email is already registered.',
};

@Component({
  selector: 'app-login',
  imports: [AerialMapComponent, FormField, FormRoot, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
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
      required(account.email);
      email(account.email);
      minLength(account.password, 8);
    },
    {
      submission: {
        action: () => this.send(),
        onInvalid: () => this.error.set('Fill in every field. The password needs at least 8 characters.'),
      },
    },
  );

  protected select(signup: boolean): void {
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
      await this.router.navigateByUrl(this.returnUrl() ?? '/main');
    } catch (error) {
      this.error.set(
        ERRORS[(error as HttpErrorResponse).status] ?? 'Something went wrong. Try again.',
      );
    }
    return undefined;
  }
}
