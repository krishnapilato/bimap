import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormField, TreeValidationResult, email, form, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { AuthApi } from '../../core/api/auth.api';
import { DEMO_CONTROLS } from '../../core/app-mode';
import { SessionStore } from '../../core/auth/session.store';
import { SignInFlow } from '../../core/auth/sign-in-flow';
import { Haptics } from '../../core/ui/haptics';
import { Button } from '../../ui/button/button';
import { MessageStrip, StripTone } from '../../ui/feedback/feedback';
import { Field, Input } from '../../ui/form/field';
import { Switch } from '../../ui/form/toggles';
import { Icon } from '../../ui/icon/icon';
import { GoogleButton } from './google-button';

interface Notice {
  tone: StripTone;
  icon: string;
  title: string;
  text: string;
  resend?: boolean;
}

/**
 * Sign in with Google or with an email address and password.
 *
 * Every refusal the IAM service can give is said in words that tell the person what to do next:
 * a wrong password marks the password, an unconfirmed account offers to send the link again.
 */
@Component({
  selector: 'bm-sign-in',
  imports: [RouterLink, FormField, Icon, Field, Input, Button, Switch, MessageStrip, GoogleButton],
  template: `
    <div class="auth-page">
      <header class="auth-page__head">
        <span class="auth-page__eyebrow">Welcome back</span>
        <h1 class="auth-page__title">Sign in to BiMap</h1>
        <p class="auth-page__lead">Pick up your survey where you left it.</p>
      </header>

      @if (demo) {
        <bm-message-strip tone="info" icon="sparkles">
          <strong>This is the demo.</strong> Any demo address works with any password, for example
          <span class="bm-mono">elena.ferrari&#64;bimap.local</span>.
          <button bmStripAction type="button" bmButton size="sm" variant="primary" (click)="demo.switchTo('ADMINISTRATOR')">Enter the demo</button>
        </bm-message-strip>
      }

      @if (ended(); as message) {
        <bm-message-strip [tone]="message.tone" [icon]="message.icon">{{ message.text }}</bm-message-strip>
      }

      @if (notice(); as current) {
        <bm-message-strip [tone]="current.tone" [icon]="current.icon">
          <strong>{{ current.title }}</strong> {{ current.text }}
          @if (current.resend) {
            <button bmStripAction type="button" bmButton size="sm" variant="secondary" [loading]="resending()" (click)="resend()">Send it again</button>
          }
        </bm-message-strip>
      }

      <bm-google-button text="signin_with" [busy]="exchanging()" (credential)="continueWithGoogle($event)" />

      <div class="auth-page__divider">or with your email</div>

      <form class="auth-page__form" novalidate [class.bm-shake]="shaking()" (submit)="signIn($event)">
        <bm-field label="Email address" [control]="form.email">
          <svg bmPrefix lucideIcon="at-sign"></svg>
          <input
            bmInput
            type="email"
            inputmode="email"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            placeholder="name@example.com"
            [formField]="form.email"
          />
        </bm-field>

        <bm-field label="Password" [control]="form.password">
          <svg bmPrefix lucideIcon="key-round"></svg>
          <input bmInput autocomplete="current-password" [type]="reveal() ? 'text' : 'password'" [formField]="form.password" />
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

        <div class="auth-page__inline">
          <bm-switch [formField]="form.remember">Keep me signed in</bm-switch>
          <a class="auth-page__link" routerLink="/auth/forgot-password" [queryParams]="{ email: model().email.trim() || null }">Forgot password?</a>
        </div>

        <button bmButton variant="primary" size="lg" type="submit" class="auth-page__submit" [loading]="submitting()">
          Sign in
          <svg lucideIcon="arrow-right"></svg>
        </button>
      </form>

      <p class="auth-page__switch">
        New to BiMap?
        <a class="auth-page__link" routerLink="/auth/sign-up">Create an account</a>
      </p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignIn {
  private readonly auth = inject(AuthApi);
  private readonly flow = inject(SignInFlow);
  private readonly sessions = inject(SessionStore);
  private readonly haptics = inject(Haptics);
  protected readonly demo = inject(DEMO_CONTROLS, { optional: true });

  /** Where to go afterwards, from the address the guard sent us here with. */
  readonly returnUrl = input<string>();

  protected readonly model = signal({ email: '', password: '', remember: true });
  protected readonly form = form(this.model, (path) => {
    required(path.email, { message: 'Enter the email address you sign in with.' });
    email(path.email, { message: 'That does not look like an email address.' });
    required(path.password, { message: 'Enter your password.' });
  });

  protected readonly reveal = signal(false);
  protected readonly submitting = signal(false);
  protected readonly exchanging = signal(false);
  protected readonly resending = signal(false);
  protected readonly shaking = signal(false);
  protected readonly notice = signal<Notice | null>(null);

  protected readonly ended = computed<{ tone: StripTone; icon: string; text: string } | null>(() => {
    switch (this.sessions.endReason()) {
      case 'expired':
        return { tone: 'critical', icon: 'clock', text: 'Your session expired. Sign in again to carry on where you left off.' };
      case 'revoked':
        return { tone: 'critical', icon: 'shield', text: 'Your session was ended from another device. Sign in again to continue.' };
      case 'elsewhere':
        return { tone: 'info', icon: 'log-out', text: 'You signed out in another tab.' };
      case 'signed-out':
        return { tone: 'positive', icon: 'circle-check', text: 'You are signed out. See you soon.' };
      default:
        return null;
    }
  });

  protected async signIn(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submitting()) return;
    this.submitting.set(true);
    this.notice.set(null);
    try {
      const accepted = await submit(this.form, async () => {
        try {
          const { email, password, remember } = this.model();
          const session = await this.auth.login({ email: email.trim(), password });
          await this.flow.complete(session, { remember, returnUrl: this.returnUrl(), greeting: 'Welcome back' });
          return undefined;
        } catch (error) {
          return this.explain(error);
        }
      });
      if (!accepted) this.shake();
    } finally {
      this.submitting.set(false);
    }
  }

  protected async continueWithGoogle(idToken: string): Promise<void> {
    this.exchanging.set(true);
    this.notice.set(null);
    try {
      const session = await this.auth.google(idToken);
      await this.flow.complete(session, { remember: this.model().remember, returnUrl: this.returnUrl(), greeting: 'Welcome back' });
    } catch (error) {
      this.explain(error);
    } finally {
      this.exchanging.set(false);
    }
  }

  protected async resend(): Promise<void> {
    this.resending.set(true);
    try {
      const result = await this.auth.resendActivation(this.model().email.trim());
      toast.success('Link sent', { description: result.message });
      this.notice.set(null);
    } catch (error) {
      toast.error('The link could not be sent', { description: ApiError.from(error).message });
    } finally {
      this.resending.set(false);
    }
  }

  private explain(error: unknown): TreeValidationResult {
    const failure = ApiError.from(error);
    this.haptics.warning();

    switch (failure.code) {
      case 'INVALID_CREDENTIALS':
        this.shake();
        return [{ kind: 'server', message: failure.message, fieldTree: this.form.password }];
      case 'ACCOUNT_NOT_ACTIVATED':
        this.notice.set({
          tone: 'critical',
          icon: 'mail',
          title: 'Confirm your email address first.',
          text: 'We sent a link when you signed up; it may be in your spam folder.',
          resend: true,
        });
        return undefined;
      case 'ACCOUNT_LOCKED':
        this.notice.set({ tone: 'negative', icon: 'lock', title: 'This account is locked.', text: failure.message });
        return undefined;
      case 'ACCOUNT_DISABLED':
        this.notice.set({ tone: 'negative', icon: 'ban', title: 'This account is disabled.', text: 'Ask an administrator to restore access.' });
        return undefined;
      case 'TOO_MANY_REQUESTS':
        this.notice.set({ tone: 'critical', icon: 'timer', title: 'Too many attempts.', text: 'Wait a minute, then try again.' });
        return undefined;
      default:
        this.notice.set({
          tone: 'negative',
          icon: failure.isNetworkFailure ? 'wifi-off' : 'circle-alert',
          title: failure.isNetworkFailure ? 'The server cannot be reached.' : 'Sign-in failed.',
          text: failure.message,
        });
        return undefined;
    }
  }

  private shake(): void {
    this.shaking.set(false);
    requestAnimationFrame(() => {
      this.shaking.set(true);
      setTimeout(() => this.shaking.set(false), 460);
    });
  }
}
