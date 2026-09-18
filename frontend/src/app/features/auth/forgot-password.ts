import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';

import { ApiError } from '../../core/api/api-error';
import { AuthApi } from '../../core/api/auth.api';
import { Haptics } from '../../core/ui/haptics';
import { Button } from '../../ui/button/button';
import { MessageStrip } from '../../ui/feedback/feedback';
import { Field, Input } from '../../ui/form/field';
import { Icon } from '../../ui/icon/icon';

const RESEND_COOLDOWN = 30;

/**
 * Asks for a reset link. The answer is the same whether or not the address has an account, so
 * the page cannot be used to find out who is registered.
 */
@Component({
  selector: 'bm-forgot-password',
  imports: [RouterLink, FormField, Icon, Field, Input, Button, MessageStrip],
  template: `
    <div class="auth-page">
      @if (sentTo(); as address) {
        <div class="auth-page__done">
          <span class="auth-page__mark"><svg class="is-envelope" lucideIcon="mail" [size]="28"></svg></span>
          <header class="auth-page__head">
            <span class="auth-page__eyebrow">Link on its way</span>
            <h1 class="auth-page__title">Check your inbox</h1>
            <p class="auth-page__lead">
              If an account exists for <strong>{{ address }}</strong>, it will get a link to choose a new password. The link
              only works for a short while.
            </p>
          </header>
          <div class="auth-page__actions">
            <button type="button" bmButton variant="secondary" [disabled]="cooldown() > 0" [loading]="sending()" (click)="send()">
              <svg lucideIcon="rotate-ccw"></svg>
              {{ cooldown() > 0 ? 'Send again in ' + cooldown() + 's' : 'Send it again' }}
            </button>
            <a bmButton variant="ghost" routerLink="/auth/sign-in">Back to sign in</a>
          </div>
        </div>
      } @else {
        <header class="auth-page__head">
          <span class="auth-page__eyebrow">Forgotten password</span>
          <h1 class="auth-page__title">Choose a new one</h1>
          <p class="auth-page__lead">Enter the address you sign in with and we will email you a link to set a new password.</p>
        </header>

        @if (problem(); as message) {
          <bm-message-strip tone="negative">{{ message }}</bm-message-strip>
        }

        <form class="auth-page__form" novalidate (submit)="request($event)">
          <bm-field label="Email address" [control]="form.email">
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
          </bm-field>

          <button bmButton variant="primary" size="lg" type="submit" class="auth-page__submit" [loading]="sending()">
            Send the link
            <svg lucideIcon="send"></svg>
          </button>
        </form>

        <p class="auth-page__switch">
          Remembered it?
          <a class="auth-page__link" routerLink="/auth/sign-in">Back to sign in</a>
        </p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  private readonly auth = inject(AuthApi);
  private readonly haptics = inject(Haptics);

  /** Prefilled from sign-in, so nobody types their address twice. */
  readonly email = input<string>();

  protected readonly model = signal({ email: '' });
  protected readonly form = form(this.model, (path) => {
    required(path.email, { message: 'Enter the email address you sign in with.' });
    email(path.email, { message: 'That does not look like an email address.' });
  });

  protected readonly sending = signal(false);
  protected readonly sentTo = signal<string | null>(null);
  protected readonly problem = signal<string | null>(null);
  protected readonly cooldown = signal(0);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    effect(() => {
      const prefill = this.email();
      if (prefill) untracked(() => this.model.update((model) => ({ ...model, email: prefill })));
    });
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
  }

  protected async request(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, async () => {
      await this.send();
      return undefined;
    });
  }

  protected async send(): Promise<void> {
    if (this.sending()) return;
    this.sending.set(true);
    this.problem.set(null);
    try {
      const address = this.model().email.trim();
      await this.auth.forgotPassword(address);
      this.haptics.success();
      this.sentTo.set(address);
      this.startCooldown();
    } catch (error) {
      this.haptics.warning();
      this.problem.set(ApiError.from(error).message);
    } finally {
      this.sending.set(false);
    }
  }

  private startCooldown(): void {
    clearInterval(this.timer);
    this.cooldown.set(RESEND_COOLDOWN);
    this.timer = setInterval(() => {
      this.cooldown.update((seconds) => Math.max(0, seconds - 1));
      if (this.cooldown() === 0) clearInterval(this.timer);
    }, 1000);
  }
}
