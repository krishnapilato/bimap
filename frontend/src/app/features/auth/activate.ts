import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, inject, input, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { AuthApi } from '../../core/api/auth.api';
import { AuthenticatedSession } from '../../core/api/iam.models';
import { SessionStore } from '../../core/auth/session.store';
import { Haptics } from '../../core/ui/haptics';
import { Button } from '../../ui/button/button';
import { Field, Input } from '../../ui/form/field';
import { Icon } from '../../ui/icon/icon';

type Phase = 'working' | 'done' | 'expired' | 'missing' | 'failed';

const REDIRECT_AFTER = 3200;

/**
 * The page an activation link opens. Confirming the address also signs the person in, so the
 * next thing they see is the app, a moment after being told it worked.
 */
@Component({
  selector: 'bm-activate',
  imports: [RouterLink, FormField, Icon, Field, Input, Button],
  template: `
    <div class="auth-page">
      @switch (phase()) {
        @case ('working') {
          <div class="auth-page__done" role="status">
            <span class="auth-page__mark"><svg class="activate__spin" lucideIcon="loader-circle" [size]="28"></svg></span>
            <header class="auth-page__head">
              <h1 class="auth-page__title">Activating your account…</h1>
              <p class="auth-page__lead">This only takes a moment.</p>
            </header>
          </div>
        }
        @case ('done') {
          <div class="auth-page__done">
            <span class="auth-page__mark is-positive"><svg lucideIcon="badge-check" [size]="28"></svg></span>
            <header class="auth-page__head">
              <span class="auth-page__eyebrow">Account active</span>
              <h1 class="auth-page__title">Welcome, {{ firstName() }}</h1>
              <p class="auth-page__lead">Your address is confirmed and you are signed in. Opening BiMap…</p>
            </header>
            <div class="activate__countdown" aria-hidden="true"><span></span></div>
            <button type="button" bmButton variant="primary" size="lg" (click)="enter()">
              Open BiMap now
              <svg lucideIcon="arrow-right"></svg>
            </button>
          </div>
        }
        @case ('missing') {
          <div class="auth-page__done">
            <span class="auth-page__mark is-negative"><svg lucideIcon="link" [size]="28"></svg></span>
            <header class="auth-page__head">
              <h1 class="auth-page__title">This link is incomplete</h1>
              <p class="auth-page__lead">Open the link from the email again, or send yourself a new one below.</p>
            </header>
          </div>
        }
        @case ('failed') {
          <div class="auth-page__done">
            <span class="auth-page__mark is-negative"><svg lucideIcon="circle-alert" [size]="28"></svg></span>
            <header class="auth-page__head">
              <h1 class="auth-page__title">The account could not be activated</h1>
              <p class="auth-page__lead">{{ problem() }}</p>
            </header>
            <a bmButton variant="secondary" routerLink="/auth/sign-in">Back to sign in</a>
          </div>
        }
        @default {
          <div class="auth-page__done">
            <span class="auth-page__mark is-negative"><svg lucideIcon="clock" [size]="28"></svg></span>
            <header class="auth-page__head">
              <h1 class="auth-page__title">This link has expired</h1>
              <p class="auth-page__lead">Links work for a limited time. Send yourself a new one.</p>
            </header>
          </div>
        }
      }

      @if (phase() === 'expired' || phase() === 'missing') {
        <form class="auth-page__form" novalidate (submit)="resend($event)">
          <bm-field label="Email address" [control]="form.email">
            <svg bmPrefix lucideIcon="at-sign"></svg>
            <input bmInput type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" [formField]="form.email" />
          </bm-field>
          <button bmButton variant="primary" type="submit" class="auth-page__submit" [loading]="sending()">Send a new link</button>
        </form>
      }
    </div>
  `,
  styles: `
    .activate__spin { animation: bm-spin 900ms linear infinite; }
    .activate__countdown { width: 100%; height: 4px; border-radius: 99px; background: var(--bm-surface-3); overflow: hidden; }
    .activate__countdown span { display: block; height: 100%; background: var(--bm-positive); transform-origin: left; animation: activate-countdown 3200ms linear both; }
    @keyframes activate-countdown { from { transform: scaleX(0); } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Activate {
  private readonly auth = inject(AuthApi);
  private readonly sessions = inject(SessionStore);
  private readonly queries = inject(QueryClient);
  private readonly router = inject(Router);
  private readonly haptics = inject(Haptics);

  readonly token = input<string>();

  protected readonly phase = signal<Phase>('working');
  protected readonly problem = signal('');
  protected readonly firstName = signal('');
  protected readonly sending = signal(false);

  protected readonly model = signal({ email: '' });
  protected readonly form = form(this.model, (path) => {
    required(path.email, { message: 'Enter the address you signed up with.' });
    email(path.email, { message: 'That does not look like an email address.' });
  });

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    afterNextRender(() => void this.activate());
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected enter(): void {
    clearTimeout(this.timer);
    void this.router.navigateByUrl('/');
  }

  protected async resend(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, async () => {
      this.sending.set(true);
      try {
        const result = await this.auth.resendActivation(this.model().email.trim());
        toast.success('Link sent', { description: result.message });
      } catch (error) {
        toast.error('The link could not be sent', { description: ApiError.from(error).message });
      } finally {
        this.sending.set(false);
      }
      return undefined;
    });
  }

  private async activate(): Promise<void> {
    const token = this.token();
    if (!token) {
      this.phase.set('missing');
      return;
    }
    try {
      const session: AuthenticatedSession = await this.auth.activate(token);
      this.sessions.start(session, true);
      this.queries.clear();
      this.firstName.set(session.user.firstName);
      this.phase.set('done');
      this.haptics.success();
      this.timer = setTimeout(() => this.enter(), REDIRECT_AFTER);
    } catch (error) {
      const failure = ApiError.from(error);
      this.haptics.warning();
      if (failure.code === 'TOKEN_EXPIRED' || failure.code === 'TOKEN_INVALID') {
        this.phase.set('expired');
      } else {
        this.problem.set(failure.message);
        this.phase.set('failed');
      }
    }
  }
}
