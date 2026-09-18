import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import {
  FormField,
  TreeValidationResult,
  email,
  form,
  maxLength,
  required,
  submit,
  validate,
  validateHttp,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { AuthApi } from '../../core/api/auth.api';
import { iamUrl } from '../../core/api/http-helpers';
import { EmailAvailability, isStrongPassword } from '../../core/api/iam.models';
import { SignInFlow } from '../../core/auth/sign-in-flow';
import { Haptics } from '../../core/ui/haptics';
import { Button } from '../../ui/button/button';
import { MessageStrip } from '../../ui/feedback/feedback';
import { Field, Input } from '../../ui/form/field';
import { PasswordRules } from '../../ui/form/password-rules';
import { Icon } from '../../ui/icon/icon';
import { GoogleButton } from './google-button';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_COOLDOWN = 30;

/**
 * Create an account with Google in one step, or with an email address that is confirmed by link.
 * The address is checked while it is typed, and the password rules tick off as they are met.
 */
@Component({
  selector: 'bm-sign-up',
  imports: [RouterLink, FormField, Icon, Field, Input, Button, MessageStrip, PasswordRules, GoogleButton],
  template: `
    <div class="auth-page">
      @if (created(); as address) {
        <div class="auth-page__done">
          <span class="auth-page__mark"><svg class="is-envelope" lucideIcon="mail" [size]="28"></svg></span>
          <header class="auth-page__head">
            <span class="auth-page__eyebrow">One more step</span>
            <h1 class="auth-page__title">Check your inbox</h1>
            <p class="auth-page__lead">
              We sent a confirmation link to <strong>{{ address }}</strong>. Open it to activate your account; it may take a
              minute to arrive.
            </p>
          </header>
          <div class="auth-page__actions">
            <button type="button" bmButton variant="secondary" [disabled]="cooldown() > 0" [loading]="resending()" (click)="resend()">
              <svg lucideIcon="rotate-ccw"></svg>
              {{ cooldown() > 0 ? 'Send again in ' + cooldown() + 's' : 'Send it again' }}
            </button>
            <a bmButton variant="ghost" routerLink="/auth/sign-in">Back to sign in</a>
          </div>
          <p class="auth-page__switch">
            Wrong address?
            <button type="button" class="auth-page__link" (click)="created.set(null)">Use a different one</button>
          </p>
        </div>
      } @else {
        <header class="auth-page__head">
          <span class="auth-page__eyebrow">Create an account</span>
          <h1 class="auth-page__title">Join the survey</h1>
          <p class="auth-page__lead">Record assets, follow their review, and see every one of them on the map.</p>
        </header>

        @if (problem(); as message) {
          <bm-message-strip tone="negative">{{ message }}</bm-message-strip>
        }

        <bm-google-button text="signup_with" [busy]="exchanging()" (credential)="continueWithGoogle($event)" />

        <div class="auth-page__divider">or with your email</div>

        <form class="auth-page__form" novalidate (submit)="signUp($event)">
          <div class="auth-page__row">
            <bm-field label="First name" [control]="form.firstName">
              <input bmInput autocomplete="given-name" [formField]="form.firstName" />
            </bm-field>
            <bm-field label="Last name" [control]="form.lastName">
              <input bmInput autocomplete="family-name" [formField]="form.lastName" />
            </bm-field>
          </div>

          <bm-field label="Email address" [control]="form.email" [hint]="emailHint()">
            <svg bmPrefix lucideIcon="at-sign"></svg>
            <input
              bmInput
              type="email"
              inputmode="email"
              autocomplete="email"
              autocapitalize="none"
              spellcheck="false"
              placeholder="name@example.com"
              [formField]="form.email"
            />
            @if (available()) {
              <span bmSuffix class="auth-page__status is-ok" animate.enter="bm-enter-pop">
                <svg lucideIcon="circle-check" [size]="15"></svg>
                Available
              </span>
            }
          </bm-field>

          @if (taken()) {
            <p class="auth-page__switch" animate.enter="bm-enter-rise">
              Is it yours?
              <a class="auth-page__link" routerLink="/auth/sign-in">Sign in</a>
              or
              <a class="auth-page__link" routerLink="/auth/forgot-password" [queryParams]="{ email: model().email.trim() }">reset the password</a>.
            </p>
          }

          <bm-field label="Password" [control]="form.password">
            <svg bmPrefix lucideIcon="key-round"></svg>
            <input bmInput autocomplete="new-password" [type]="reveal() ? 'text' : 'password'" [formField]="form.password" />
            <button
              bmSuffix
              type="button"
              class="auth-page__reveal"
              [attr.aria-label]="reveal() ? 'Hide the password' : 'Show the password'"
              [attr.aria-pressed]="reveal()"
              (click)="reveal.set(!reveal())"
            >
              <svg [lucideIcon]="reveal() ? 'eye-off' : 'eye'" [size]="17"></svg>
            </button>
          </bm-field>

          <bm-password-rules [value]="model().password" />

          <button bmButton variant="primary" size="lg" type="submit" class="auth-page__submit" [loading]="submitting()">
            Create account
            <svg lucideIcon="arrow-right"></svg>
          </button>
        </form>

        <p class="auth-page__switch">
          Already have an account?
          <a class="auth-page__link" routerLink="/auth/sign-in">Sign in</a>
        </p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUp {
  private readonly auth = inject(AuthApi);
  private readonly flow = inject(SignInFlow);
  private readonly haptics = inject(Haptics);

  protected readonly model = signal({ firstName: '', lastName: '', email: '', password: '' });
  protected readonly form = form(this.model, (path) => {
    required(path.firstName, { message: 'Enter your first name.' });
    maxLength(path.firstName, 64);
    required(path.lastName, { message: 'Enter your last name.' });
    maxLength(path.lastName, 64);
    required(path.email, { message: 'Enter the email address you will sign in with.' });
    email(path.email, { message: 'That does not look like an email address.' });
    validateHttp(path.email, {
      request: ({ value }) => (EMAIL_SHAPE.test(value().trim()) ? { url: iamUrl('/api/v1/auth/email-availability'), params: { email: value().trim() } } : undefined),
      debounce: 450,
      onSuccess: (result: EmailAvailability) => (result.available ? null : { kind: 'taken', message: 'An account already uses this address.' }),
      onError: () => null,
    });
    required(path.password, { message: 'Choose a password.' });
    validate(path.password, ({ value }) => (value() && !isStrongPassword(value()) ? { kind: 'weak', message: 'Meet every rule below.' } : null));
  });

  protected readonly reveal = signal(false);
  protected readonly submitting = signal(false);
  protected readonly exchanging = signal(false);
  protected readonly resending = signal(false);
  protected readonly problem = signal<string | null>(null);
  protected readonly created = signal<string | null>(null);
  protected readonly cooldown = signal(0);

  protected readonly available = computed(() => {
    const state = this.form.email();
    return EMAIL_SHAPE.test(this.model().email.trim()) && !state.pending() && state.valid();
  });

  protected readonly taken = computed(() => this.form.email().errors().some((error) => error.kind === 'taken'));

  protected readonly emailHint = computed(() => (this.form.email().pending() ? 'Checking the address…' : undefined));

  private cooldownTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.cooldownTimer));
  }

  protected async signUp(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submitting()) return;
    this.submitting.set(true);
    this.problem.set(null);
    try {
      const accepted = await submit(this.form, async () => {
        try {
          const { firstName, lastName, email, password } = this.model();
          const user = await this.auth.register({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password });
          this.haptics.success();
          this.created.set(user.email);
          this.startCooldown();
          return undefined;
        } catch (error) {
          return this.explain(error);
        }
      });
      if (!accepted) this.haptics.warning();
    } finally {
      this.submitting.set(false);
    }
  }

  protected async continueWithGoogle(idToken: string): Promise<void> {
    this.exchanging.set(true);
    this.problem.set(null);
    try {
      const session = await this.auth.google(idToken);
      await this.flow.complete(session, { remember: true, greeting: 'Welcome' });
    } catch (error) {
      this.haptics.warning();
      this.problem.set(ApiError.from(error).message);
    } finally {
      this.exchanging.set(false);
    }
  }

  protected async resend(): Promise<void> {
    const address = this.created();
    if (!address) return;
    this.resending.set(true);
    try {
      const result = await this.auth.resendActivation(address);
      toast.success('Link sent', { description: result.message });
      this.startCooldown();
    } catch (error) {
      toast.error('The link could not be sent', { description: ApiError.from(error).message });
    } finally {
      this.resending.set(false);
    }
  }

  private explain(error: unknown): TreeValidationResult {
    const failure = ApiError.from(error);
    this.haptics.warning();
    if (failure.code === 'EMAIL_ALREADY_REGISTERED') {
      return [{ kind: 'taken', message: 'An account already uses this address.', fieldTree: this.form.email }];
    }
    const fields = { firstName: this.form.firstName, lastName: this.form.lastName, email: this.form.email, password: this.form.password };
    const violations = failure.violations.filter((violation) => violation.field in fields);
    if (violations.length) {
      return violations.map((violation) => ({ kind: 'server', message: violation.message, fieldTree: fields[violation.field as keyof typeof fields] }));
    }
    this.problem.set(failure.message);
    return undefined;
  }

  private startCooldown(): void {
    clearInterval(this.cooldownTimer);
    this.cooldown.set(RESEND_COOLDOWN);
    this.cooldownTimer = setInterval(() => {
      this.cooldown.update((seconds) => Math.max(0, seconds - 1));
      if (this.cooldown() === 0) clearInterval(this.cooldownTimer);
    }, 1000);
  }
}
