import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { ApiError } from '../../core/api/api-error';
import { SubscriptionsApi } from '../../core/api/subscriptions.api';
import { Skeleton } from '../../ui/feedback/feedback';
import { Icon } from '../../ui/icon/icon';
import { PublicFrame } from './public-frame';

/** Where the confirmation link lands: the subscription is confirmed on arrival, and it says so. */
@Component({
  selector: 'bm-confirm-subscription',
  imports: [Icon, PublicFrame, Skeleton],
  template: `
    <bm-public-frame>
      @if (!token()) {
        <div class="public-page is-centred" animate.enter="bm-enter-rise">
          <span class="public-page__icon" data-tone="critical"><svg lucideIcon="link" [size]="24"></svg></span>
          <h1 class="public-page__title">This link is incomplete</h1>
          <p class="public-page__text">Open the link from the email again. If it was split over two lines, copy the whole address into the browser.</p>
        </div>
      } @else if (confirmation.isPending()) {
        <div class="public-page is-centred" aria-busy="true">
          <bm-skeleton width="72px" height="72px" shape="circle" />
          <bm-skeleton width="60%" height="26px" />
          <bm-skeleton width="85%" height="14px" />
        </div>
      } @else if (confirmation.isError()) {
        <div class="public-page is-centred" animate.enter="bm-enter-rise">
          <span class="public-page__icon" data-tone="critical"><svg lucideIcon="hourglass" [size]="24"></svg></span>
          <h1 class="public-page__title">{{ archived() ? 'This list is closed' : 'This link no longer works' }}</h1>
          <p class="public-page__text">
            @if (archived()) {
              The list has been archived and no longer takes subscribers.
            } @else {
              It may have expired, or the subscription was removed. Sign up again from the page where you found the list.
            }
          </p>
        </div>
      } @else if (confirmation.data(); as s) {
        <div class="public-page is-centred" animate.enter="bm-enter-rise">
          <div class="public-page__done" aria-hidden="true">
            <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M15 27.5 22.5 35 37.5 19" /></svg>
          </div>
          <h1 class="public-page__title">{{ s.firstName ? 'Thank you, ' + s.firstName : 'You are subscribed' }}</h1>
          <p class="public-page__text"><strong>{{ s.listName }}</strong> will arrive at <strong>{{ s.email }}</strong>.</p>
          @if (s.listDescription) {
            <div class="public-page__list">
              <strong>What to expect</strong>
              <span>{{ s.listDescription }}</span>
            </div>
          }
          <p class="public-page__fine">Every issue ends with a link to change your mind. You can close this page.</p>
        </div>
      }
    </bm-public-frame>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmSubscription {
  readonly token = input<string>();

  private readonly api = inject(SubscriptionsApi);

  protected readonly confirmation = injectQuery(() => ({
    queryKey: ['subscriptions', 'confirm', this.token()],
    queryFn: () => this.api.confirm(this.token()!),
    enabled: !!this.token(),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  }));

  protected readonly archived = computed(() => ApiError.from(this.confirmation.error()).status === 422);
}
