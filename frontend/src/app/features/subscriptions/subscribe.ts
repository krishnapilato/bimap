import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormField, TreeValidationResult, email, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { ApiError } from '../../core/api/api-error';
import { SubscriptionsApi } from '../../core/api/subscriptions.api';
import { Haptics } from '../../core/ui/haptics';
import { Button } from '../../ui/button/button';
import { MessageStrip, Skeleton } from '../../ui/feedback/feedback';
import { Field, Input } from '../../ui/form/field';
import { Checkbox } from '../../ui/form/toggles';
import { Icon } from '../../ui/icon/icon';
import { PublicFrame } from './public-frame';

/**
 * The public sign-up page of one list. It asks for as little as it can, says plainly what will be
 * sent, and when the list confirms addresses first, says that nothing arrives until the link is used.
 */
@Component({
  selector: 'bm-subscribe',
  imports: [FormField, Icon, PublicFrame, Button, MessageStrip, Skeleton, Field, Input, Checkbox],
  template: `
    <bm-public-frame>
      @if (list.isPending()) {
        <div class="public-page" aria-busy="true">
          <bm-skeleton width="52px" height="52px" />
          <bm-skeleton width="70%" height="26px" />
          <bm-skeleton height="14px" />
          <bm-skeleton height="44px" />
          <bm-skeleton height="44px" />
        </div>
      } @else if (list.isError()) {
        <div class="public-page is-centred" animate.enter="bm-enter-rise">
          <span class="public-page__icon" data-tone="neutral"><svg lucideIcon="lock" [size]="24"></svg></span>
          <h1 class="public-page__title">This sign-up page is closed</h1>
          <p class="public-page__text">The list may have been archived, or it no longer takes subscribers through this page.</p>
        </div>
      } @else if (done()) {
        <div class="public-page is-centred" animate.enter="bm-enter-rise">
          @if (list.data()!.doubleOptIn) {
            <span class="public-page__icon"><svg lucideIcon="mail-question" [size]="26"></svg></span>
            <h1 class="public-page__title">Check your inbox</h1>
            <p class="public-page__text">A link is on its way to <strong>{{ model().email }}</strong>. Nothing from <strong>{{ list.data()!.name }}</strong> is sent until you click it.</p>
            <p class="public-page__fine">Nothing arrived after a few minutes? Look in the spam folder, or sign up again.</p>
          } @else {
            <div class="public-page__done" aria-hidden="true">
              <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M15 27.5 22.5 35 37.5 19" /></svg>
            </div>
            <h1 class="public-page__title">You're on the list</h1>
            <p class="public-page__text"><strong>{{ list.data()!.name }}</strong> will arrive at <strong>{{ model().email }}</strong>. Every issue has a link to unsubscribe.</p>
          }
          <button type="button" bmButton variant="ghost" size="sm" (click)="again()">Sign up another address</button>
        </div>
      } @else if (list.data(); as l) {
        <form class="public-page" novalidate (submit)="send($event)" animate.enter="bm-enter-rise">
          <span class="public-page__icon"><svg lucideIcon="megaphone" [size]="24"></svg></span>
          <div>
            <h1 class="public-page__title">{{ l.name }}</h1>
            @if (l.description) {
              <p class="public-page__text">{{ l.description }}</p>
            }
          </div>

          @if (problem(); as message) {
            <bm-message-strip tone="negative">{{ message }}</bm-message-strip>
          }

          <div class="public-page__form">
            <bm-field label="Email address" [control]="form.email">
              <svg bmPrefix lucideIcon="at-sign"></svg>
              <input bmInput type="email" autocomplete="email" autocapitalize="none" spellcheck="false" [formField]="form.email" />
            </bm-field>
            <div class="public-page__row">
              <bm-field label="First name" optional [control]="form.firstName">
                <input bmInput autocomplete="given-name" [formField]="form.firstName" />
              </bm-field>
              <bm-field label="Last name" optional [control]="form.lastName">
                <input bmInput autocomplete="family-name" [formField]="form.lastName" />
              </bm-field>
            </div>
            <bm-checkbox [checked]="model().consent" (checkedChange)="setConsent($event)">I want to receive {{ l.name }} by email</bm-checkbox>
            @if (form.consent().touched() && form.consent().invalid()) {
              <p class="public-page__error" animate.enter="bm-enter-fade">Tick the box to confirm you want it.</p>
            }
          </div>

          <div class="public-page__actions">
            <button type="submit" bmButton variant="primary" size="lg" [loading]="sending()">
              <svg lucideIcon="send"></svg>
              {{ l.doubleOptIn ? 'Send me the confirmation link' : 'Subscribe' }}
            </button>
            <p class="public-page__fine">{{ fine() }}</p>
          </div>
        </form>
      }
    </bm-public-frame>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Subscribe {
  readonly listId = input.required<string>();

  private readonly api = inject(SubscriptionsApi);
  private readonly haptics = inject(Haptics);

  protected readonly list = injectQuery(() => ({
    queryKey: ['subscriptions', 'list', this.listId()],
    queryFn: () => this.api.publicList(this.listId()),
    retry: false,
  }));

  protected readonly model = signal({ email: '', firstName: '', lastName: '', consent: false });
  protected readonly form = form(this.model, (path) => {
    required(path.email, { message: 'Enter the address it should go to.' });
    email(path.email, { message: 'That does not look like an email address.' });
    maxLength(path.email, 254);
    maxLength(path.firstName, 80);
    maxLength(path.lastName, 80);
    validate(path.consent, ({ value }) => (value() ? null : { kind: 'consent', message: 'Tick the box to confirm you want it.' }));
  });

  protected readonly sending = signal(false);
  protected readonly done = signal(false);
  protected readonly problem = signal<string | null>(null);

  protected readonly fine = computed(() =>
    this.list.data()?.doubleOptIn
      ? 'You will get one email with a link. Your address is only used for this list, and every issue can be unsubscribed from.'
      : 'Your address is only used for this list, and every issue has a link to unsubscribe.',
  );

  protected setConsent(value: boolean): void {
    this.model.update((model) => ({ ...model, consent: value }));
    this.form.consent().markAsTouched();
  }

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    if (this.sending()) return;
    this.sending.set(true);
    this.problem.set(null);
    try {
      await submit(this.form, async () => {
        try {
          const { email, firstName, lastName } = this.model();
          await this.api.subscribe({ listId: this.listId(), email: email.trim(), firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined });
          this.haptics.success();
          this.done.set(true);
          return undefined;
        } catch (error) {
          return this.explain(error);
        }
      });
    } finally {
      this.sending.set(false);
    }
  }

  protected again(): void {
    this.model.set({ email: '', firstName: '', lastName: '', consent: false });
    this.form().reset();
    this.done.set(false);
  }

  private explain(error: unknown): TreeValidationResult {
    const failure = ApiError.from(error);
    this.haptics.warning();
    if (failure.violations.some((violation) => violation.field === 'email')) {
      return [{ kind: 'server', message: 'That address was refused as invalid.', fieldTree: this.form.email }];
    }
    this.problem.set(failure.status === 429 ? 'Too many attempts from here. Wait a minute and try again.' : failure.message);
    return undefined;
  }
}
