import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormField, TreeValidationResult, form, required, submit, validate } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';

import { ApiError } from '../../core/api/api-error';
import { AuthApi } from '../../core/api/auth.api';
import { isStrongPassword } from '../../core/api/iam.models';
import { Haptics } from '../../core/ui/haptics';
import { Button } from '../../ui/button/button';
import { MessageStrip } from '../../ui/feedback/feedback';
import { Field, Input } from '../../ui/form/field';
import { PasswordRules } from '../../ui/form/password-rules';
import { Icon } from '../../ui/icon/icon';

/** The page a reset link opens: a new password, checked against the policy as it is typed. */
@Component({
  selector: 'bm-reset-password',
  imports: [RouterLink, FormField, Icon, Field, Input, Button, MessageStrip, PasswordRules],
  template: `
    <div class="auth-page">
      @if (!token()) {
        <div class="auth-page__done">
          <span class="auth-page__mark is-negative"><svg lucideIcon="link" [size]="28"></svg></span>
          <header class="auth-page__head">
            <h1 class="auth-page__title">This link is incomplete</h1>
            <p class="auth-page__lead">Open the link from the email again, or ask for a new one.</p>
          </header>
          <a bmButton variant="primary" routerLink="/auth/forgot-password">Ask for a new link</a>
        </div>
      } @else if (done()) {
        <div class="auth-page__done">
          <span class="auth-page__mark is-positive"><svg lucideIcon="shield-check" [size]="28"></svg></span>
          <header class="auth-page__head">
            <span class="auth-page__eyebrow">All set</span>
            <h1 class="auth-page__title">Password changed</h1>
            <p class="auth-page__lead">Every other session was signed out. Sign in with the new password to continue.</p>
          </header>
          <a bmButton variant="primary" size="lg" routerLink="/auth/sign-in">
            Sign in
            <svg lucideIcon="arrow-right"></svg>
          </a>
        </div>
      } @else {
        <header class="auth-page__head">
          <span class="auth-page__eyebrow">Reset your password</span>
          <h1 class="auth-page__title">Choose a new password</h1>
          <p class="auth-page__lead">Pick something you have not used here before.</p>
        </header>

        @if (expired()) {
          <bm-message-strip tone="critical" icon="clock">
            <strong>This link has expired.</strong> Links only work for a short while.
            <a bmStripAction bmButton size="sm" variant="secondary" routerLink="/auth/forgot-password">Get a new link</a>
          </bm-message-strip>
        } @else if (problem(); as message) {
          <bm-message-strip tone="negative">{{ message }}</bm-message-strip>
        }

        <form class="auth-page__form" novalidate (submit)="save($event)">
          <input type="email" autocomplete="username" hidden />
          <bm-field label="New password" [control]="form.password">
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

          <button bmButton variant="primary" size="lg" type="submit" class="auth-page__submit" [loading]="saving()">
            Save the new password
          </button>
        </form>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword {
  private readonly auth = inject(AuthApi);
  private readonly haptics = inject(Haptics);

  readonly token = input<string>();

  protected readonly model = signal({ password: '' });
  protected readonly form = form(this.model, (path) => {
    required(path.password, { message: 'Choose a password.' });
    validate(path.password, ({ value }) => (value() && !isStrongPassword(value()) ? { kind: 'weak', message: 'Meet every rule below.' } : null));
  });

  protected readonly reveal = signal(false);
  protected readonly saving = signal(false);
  protected readonly done = signal(false);
  protected readonly expired = signal(false);
  protected readonly problem = signal<string | null>(null);

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving()) return;
    this.saving.set(true);
    this.problem.set(null);
    this.expired.set(false);
    try {
      await submit(this.form, async () => {
        try {
          await this.auth.resetPassword({ token: this.token()!, newPassword: this.model().password });
          this.haptics.success();
          this.done.set(true);
          return undefined;
        } catch (error) {
          return this.explain(error);
        }
      });
    } finally {
      this.saving.set(false);
    }
  }

  private explain(error: unknown): TreeValidationResult {
    const failure = ApiError.from(error);
    this.haptics.warning();
    if (failure.code === 'TOKEN_EXPIRED' || failure.code === 'TOKEN_INVALID') {
      this.expired.set(true);
      return undefined;
    }
    const violation = failure.violations.find((candidate) => candidate.field === 'newPassword');
    if (violation) return [{ kind: 'server', message: violation.message, fieldTree: this.form.password }];
    this.problem.set(failure.message);
    return undefined;
  }
}
