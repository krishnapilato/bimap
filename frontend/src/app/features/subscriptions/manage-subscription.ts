import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { QueryClient, injectQuery } from '@tanstack/angular-query-experimental';

import { ApiError } from '../../core/api/api-error';
import { Subscription } from '../../core/api/mailing.models';
import { SubscriptionsApi } from '../../core/api/subscriptions.api';
import { shortDate } from '../../core/ui/format';
import { Haptics } from '../../core/ui/haptics';
import { Button } from '../../ui/button/button';
import { MessageStrip, Skeleton } from '../../ui/feedback/feedback';
import { ChoiceCards, ChoiceOption } from '../../ui/form/choice-cards';
import { Icon } from '../../ui/icon/icon';
import { PublicFrame } from './public-frame';

const REASONS: ChoiceOption[] = [
  { value: 'Too many emails', label: 'Too many emails' },
  { value: 'It is no longer relevant to me', label: 'It is no longer relevant to me' },
  { value: 'I never asked to receive it', label: 'I never asked to receive it' },
  { value: 'other', label: 'Something else' },
];

/**
 * Where the unsubscribe link in every campaign leads. Leaving takes one button and no account;
 * saying why is optional; and changing one's mind afterwards is just as easy.
 */
@Component({
  selector: 'bm-manage-subscription',
  imports: [Icon, PublicFrame, Button, MessageStrip, Skeleton, ChoiceCards],
  template: `
    <bm-public-frame>
      @if (!token()) {
        <div class="public-page is-centred" animate.enter="bm-enter-rise">
          <span class="public-page__icon" data-tone="critical"><svg lucideIcon="link" [size]="24"></svg></span>
          <h1 class="public-page__title">This link is incomplete</h1>
          <p class="public-page__text">Open the link at the bottom of the email again, or copy the whole address into the browser.</p>
        </div>
      } @else if (query.isPending()) {
        <div class="public-page" aria-busy="true">
          <bm-skeleton width="52px" height="52px" />
          <bm-skeleton width="70%" height="26px" />
          <bm-skeleton height="60px" />
          <bm-skeleton height="44px" />
        </div>
      } @else if (query.isError()) {
        <div class="public-page is-centred" animate.enter="bm-enter-rise">
          <span class="public-page__icon" data-tone="critical"><svg lucideIcon="hourglass" [size]="24"></svg></span>
          <h1 class="public-page__title">This link no longer works</h1>
          <p class="public-page__text">The subscription it belonged to may have been removed. If emails keep arriving, use the link in the most recent one.</p>
        </div>
      } @else if (subscription(); as s) {
        @for (state of [s.status]; track state) {
          <div class="public-page" [class.is-centred]="s.status !== 'SUBSCRIBED'" animate.enter="bm-enter-rise">
            @if (problem(); as message) {
              <bm-message-strip tone="negative">{{ message }}</bm-message-strip>
            }
            @switch (s.status) {
              @case ('SUBSCRIBED') {
                <span class="public-page__icon" data-tone="positive"><svg lucideIcon="mail-check" [size]="24"></svg></span>
                <div>
                  <h1 class="public-page__title">Your subscription</h1>
                  <p class="public-page__text"><strong>{{ s.email }}</strong> receives <strong>{{ s.listName }}</strong>{{ s.subscribedAt ? ', since ' + shortDate(s.subscribedAt) : '' }}.</p>
                </div>
                @if (s.listDescription) {
                  <div class="public-page__list">
                    <strong>{{ s.listName }}</strong>
                    <span>{{ s.listDescription }}</span>
                  </div>
                }
                <bm-choice-cards legend="Would you tell us why? It is optional." [options]="reasons" [value]="reason()" (valueChange)="reason.set($event)" />
                @if (reason() === 'other') {
                  <textarea
                    class="bm-input public-page__other"
                    rows="3"
                    maxlength="256"
                    placeholder="What should we do differently?"
                    animate.enter="bm-enter-rise"
                    [value]="other()"
                    (input)="other.set($any($event.target).value)"
                  ></textarea>
                }
                <div class="public-page__actions">
                  <button type="button" bmButton variant="danger" size="lg" [loading]="working()" (click)="unsubscribe()">
                    <svg lucideIcon="user-minus"></svg>
                    Unsubscribe
                  </button>
                  <p class="public-page__fine">Nothing else is sent to this address from {{ s.listName }} once you do.</p>
                </div>
              }
              @case ('UNSUBSCRIBED') {
                <span class="public-page__icon" data-tone="neutral"><svg lucideIcon="mail-x" [size]="24"></svg></span>
                <h1 class="public-page__title">You are unsubscribed</h1>
                <p class="public-page__text"><strong>{{ s.email }}</strong> no longer receives <strong>{{ s.listName }}</strong>. Sorry to see you go.</p>
                @if (s.listActive) {
                  <button type="button" bmButton [loading]="working()" (click)="resubscribe()">
                    <svg lucideIcon="rotate-ccw"></svg>
                    Changed your mind? Subscribe again
                  </button>
                } @else {
                  <p class="public-page__fine">This list has been archived, so nothing more will be sent anyway.</p>
                }
              }
              @case ('PENDING') {
                <span class="public-page__icon" data-tone="critical"><svg lucideIcon="mail-question" [size]="24"></svg></span>
                <h1 class="public-page__title">Waiting for your confirmation</h1>
                <p class="public-page__text"><strong>{{ s.email }}</strong> has not confirmed <strong>{{ s.listName }}</strong> yet, so nothing is being sent.</p>
                <div class="public-page__actions">
                  @if (s.listActive) {
                    <button type="button" bmButton variant="primary" [loading]="working()" (click)="resubscribe()">
                      <svg lucideIcon="badge-check"></svg>
                      Confirm the subscription
                    </button>
                  }
                  <button type="button" bmButton variant="ghost" (click)="unsubscribe()">I do not want it</button>
                </div>
              }
            }
          </div>
        }
      }
    </bm-public-frame>
  `,
  styles: `
    .public-page__other { width: 100%; min-height: 84px; border: 1px solid var(--bm-border); border-radius: var(--bm-radius-md); }
    .public-page__other:focus { border-color: var(--bm-accent); box-shadow: 0 0 0 3px var(--bm-accent-glow); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageSubscription {
  readonly token = input<string>();

  private readonly api = inject(SubscriptionsApi);
  private readonly queries = inject(QueryClient);
  private readonly haptics = inject(Haptics);

  protected readonly reasons = REASONS;
  protected readonly shortDate = shortDate;

  protected readonly query = injectQuery(() => ({
    queryKey: ['subscriptions', 'manage', this.token()],
    queryFn: () => this.api.manage(this.token()!),
    enabled: !!this.token(),
    retry: false,
  }));

  protected readonly subscription = computed(() => this.query.data());
  protected readonly reason = signal('');
  protected readonly other = signal('');
  protected readonly working = signal(false);
  protected readonly problem = signal<string | null>(null);

  protected unsubscribe(): Promise<void> {
    const chosen = this.reason() === 'other' ? this.other().trim() : this.reason();
    return this.change(() => this.api.unsubscribe(this.token()!, chosen || undefined));
  }

  protected resubscribe(): Promise<void> {
    return this.change(() => this.api.resubscribe(this.token()!));
  }

  private async change(call: () => Promise<Subscription>): Promise<void> {
    if (this.working()) return;
    this.working.set(true);
    this.problem.set(null);
    try {
      const updated = await call();
      this.queries.setQueryData(['subscriptions', 'manage', this.token()], updated);
      this.haptics.success();
    } catch (error) {
      this.haptics.warning();
      this.problem.set(ApiError.from(error).message);
    } finally {
      this.working.set(false);
    }
  }
}
