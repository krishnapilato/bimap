import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input, output, signal } from '@angular/core';
import { FormField, form, maxLength } from '@angular/forms/signals';
import { QueryClient, injectQuery } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { Page } from '../../core/api/common.models';
import { MailingApi } from '../../core/api/mailing.api';
import { MailingList, Subscriber } from '../../core/api/mailing.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { dateTime } from '../../core/ui/format';
import { Haptics } from '../../core/ui/haptics';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import { Property } from '../../ui/data/properties';
import { Timeline, TimelineMoment } from '../../ui/data/timeline';
import { EmptyState, ErrorState, Skeleton } from '../../ui/feedback/feedback';
import { Field, Input } from '../../ui/form/field';
import { Icon } from '../../ui/icon/icon';
import { StatusBadge } from '../../ui/status/status-badge';
import { SUBSCRIPTION_STATUS } from '../../ui/status/status-tones';
import { SUBSCRIPTION_SOURCE, subscriberName } from './audience-presentation';
import { SUBSCRIBER_ACTIONS, SubscriberAction, SubscriberActions } from './subscriber-actions';

/** One subscription: who it is, how it began, every step since, and what can be done about it. */
@Component({
  selector: 'bm-subscriber-panel',
  imports: [FormField, Icon, Avatar, Button, Property, Timeline, StatusBadge, EmptyState, ErrorState, Skeleton, Field, Input],
  template: `
    <article class="subscriber">
      <header class="subscriber__bar">
        <button type="button" bmButton variant="ghost" size="sm" iconOnly aria-label="Close" (click)="closed.emit()">
          <svg lucideIcon="x"></svg>
        </button>
      </header>

      @if (query.isPending()) {
        <div class="subscriber__loading">
          <bm-skeleton shape="circle" width="72px" height="72px" />
          <bm-skeleton width="60%" height="22px" />
          <bm-skeleton width="40%" height="14px" />
        </div>
      } @else if (query.isError()) {
        @if (notFound()) {
          <bm-empty-state icon="user-x" title="Not on this list any more" description="The address may have been removed." compact />
        } @else {
          <bm-error-state [error]="query.error()" (retry)="query.refetch()" />
        }
      } @else if (query.data(); as s) {
        <section class="subscriber__identity">
          <bm-avatar size="xl" [name]="name(s)" />
          @if (!editing()) {
            <h2 class="subscriber__name">{{ name(s) }}</h2>
            @if (s.fullName) {
              <a class="subscriber__email" [href]="'mailto:' + s.email">{{ s.email }}</a>
            }
          } @else {
            <form class="subscriber__edit" novalidate (submit)="save($event, s)" animate.enter="bm-enter-rise">
              <div class="subscriber__edit-row">
                <bm-field label="First name" [control]="form.firstName">
                  <input bmInput autocomplete="off" [formField]="form.firstName" />
                </bm-field>
                <bm-field label="Last name" [control]="form.lastName">
                  <input bmInput autocomplete="off" [formField]="form.lastName" />
                </bm-field>
              </div>
              <p class="subscriber__edit-note">The address itself cannot change: it is what the consent belongs to.</p>
              <div class="subscriber__edit-actions">
                <button type="button" bmButton size="sm" variant="ghost" (click)="editing.set(false)">Cancel</button>
                <button type="submit" bmButton size="sm" variant="primary" [loading]="saving()">Save names</button>
              </div>
            </form>
          }
          <div class="subscriber__badges">
            <bm-status [label]="statusInfo[s.status].label" [tone]="statusInfo[s.status].tone" />
            <span class="subscriber__source"><svg [lucideIcon]="sources[s.source].icon" [size]="14"></svg>{{ sources[s.source].label }}</span>
          </div>
        </section>

        @if (canWrite() || available(s).length) {
          <div class="subscriber__actions">
            @if (canWrite() && !editing()) {
              <button type="button" bmButton size="sm" (click)="edit(s)">
                <svg lucideIcon="pencil"></svg>
                Edit names
              </button>
            }
            @for (action of available(s); track action) {
              <button
                type="button"
                bmButton
                size="sm"
                [variant]="meta[action].danger ? 'ghost' : 'secondary'"
                [class.is-danger]="meta[action].danger"
                [loading]="running() === action"
                [disabled]="action === 'resend' && cooldown(s) > 0"
                [attr.title]="action === 'resend' && cooldown(s) > 0 ? 'A link went out moments ago. Try again in ' + cooldown(s) + ' min.' : null"
                (click)="run(action, s)"
              >
                <svg [lucideIcon]="meta[action].icon"></svg>
                {{ meta[action].label }}
              </button>
            }
          </div>
        }

        @if (s.status === 'PENDING' && cooldown(s) > 0) {
          <p class="subscriber__hint">A confirmation link went out {{ sinceSent(s) }}. Another can be sent in {{ cooldown(s) }} {{ cooldown(s) === 1 ? 'minute' : 'minutes' }}.</p>
        }

        <section class="subscriber__section">
          <h3>History</h3>
          <bm-timeline [moments]="history(s)" />
        </section>

        <section class="subscriber__section">
          <h3>Record</h3>
          <dl class="bm-properties">
            <bm-property label="Address" [value]="s.email" copyable />
            <bm-property label="Last changed" [value]="dateTime(s.updatedAt)" />
            <bm-property label="Reference" [value]="s.id" mono copyable />
          </dl>
        </section>
      }
    </article>
  `,
  styles: `
    .subscriber { display: grid; align-content: start; gap: 18px; padding: 8px 20px 28px; background: var(--bm-surface); border: 1px solid var(--bm-border); border-radius: var(--bm-radius-lg); min-height: 100%; }
    .bm-split__detail .subscriber { border-radius: inherit; }
    .subscriber__bar { display: flex; justify-content: flex-end; margin: 0 -12px; }
    .subscriber__loading { display: grid; justify-items: center; gap: 12px; padding: 12px 0; }
    .subscriber__identity { display: grid; justify-items: center; gap: 6px; text-align: center; }
    .subscriber__identity bm-avatar { animation: bm-pop var(--bm-duration-slow) var(--bm-ease-spring) both; }
    .subscriber__name { margin-top: 6px; font: var(--bm-text-title); letter-spacing: var(--bm-tracking-tight); overflow-wrap: anywhere; animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) 60ms both; }
    .subscriber__email { font: var(--bm-text-small); color: var(--bm-accent-text); overflow-wrap: anywhere; animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) 100ms both; }
    .subscriber__badges { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 6px; animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) 140ms both; }
    .subscriber__source { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 9px; border-radius: 999px; background: var(--bm-surface-3); font: var(--bm-text-caption); font-weight: 650; color: var(--bm-text-2); }
    .subscriber__edit { display: grid; gap: 10px; width: 100%; margin-top: 8px; text-align: left; }
    .subscriber__edit-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .subscriber__edit-note { font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); }
    .subscriber__edit-actions { display: flex; justify-content: flex-end; gap: 6px; }
    .subscriber__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; padding-bottom: 18px; border-bottom: 1px solid var(--bm-border-subtle); animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) 180ms both; }
    .subscriber__actions .is-danger { color: var(--bm-negative); }
    .subscriber__hint { margin-top: -8px; font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); text-align: center; }
    .subscriber__section { display: grid; gap: 12px; animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) 220ms both; }
    .subscriber__section h3 { font: var(--bm-text-subheading); }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriberPanel {
  readonly list = input.required<MailingList>();
  readonly subscriberId = input.required<string>();
  readonly closed = output<void>();

  private readonly api = inject(MailingApi);
  private readonly queries = inject(QueryClient);
  private readonly sessions = inject(SessionStore);
  private readonly lifecycle = inject(SubscriberActions);
  private readonly haptics = inject(Haptics);

  protected readonly statusInfo = SUBSCRIPTION_STATUS;
  protected readonly sources = SUBSCRIPTION_SOURCE;
  protected readonly meta = SUBSCRIBER_ACTIONS;
  protected readonly name = subscriberName;
  protected readonly dateTime = dateTime;

  protected readonly query = injectQuery(() => {
    const listId = this.list().id;
    const id = this.subscriberId();
    return {
      queryKey: keys.mailing.subscriber(listId, id),
      queryFn: () => this.api.subscriber(listId, id),
      // The row already on screen answers at once; the request only confirms it.
      initialData: () => this.fromTable(listId, id),
      initialDataUpdatedAt: 0,
    };
  });

  protected readonly notFound = computed(() => ApiError.from(this.query.error()).status === 404);
  protected readonly canWrite = computed(() => this.sessions.can('mailing:write'));
  protected readonly running = signal<SubscriberAction | null>(null);

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly names = signal({ firstName: '', lastName: '' });
  protected readonly form = form(this.names, (path) => {
    maxLength(path.firstName, 80);
    maxLength(path.lastName, 80);
  });

  protected available(subscriber: Subscriber): SubscriberAction[] {
    return this.lifecycle.available(subscriber, this.list());
  }

  protected cooldown(subscriber: Subscriber): number {
    return subscriber.status === 'PENDING' ? this.lifecycle.cooldown(subscriber) : 0;
  }

  protected sinceSent(subscriber: Subscriber): string {
    const minutes = Math.max(0, Math.round((Date.now() - Date.parse(subscriber.confirmationSentAt ?? '')) / 60_000));
    return minutes < 1 ? 'just now' : `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  protected history(subscriber: Subscriber): TimelineMoment[] {
    const joined: Record<Subscriber['source'], string> = { ADMIN: 'Added by hand', IMPORT: 'Imported', SIGNUP_FORM: 'Signed up on the public page' };
    const moments: TimelineMoment[] = [{ key: 'created', icon: SUBSCRIPTION_SOURCE[subscriber.source].icon, tone: 'neutral', title: joined[subscriber.source], when: subscriber.createdAt }];
    if (subscriber.confirmationSentAt) moments.push({ key: 'link', icon: 'mail-question', tone: 'info', title: 'Confirmation link sent', when: subscriber.confirmationSentAt });
    if (subscriber.subscribedAt) moments.push({ key: 'subscribed', icon: 'circle-check', tone: 'positive', title: 'Subscribed', when: subscriber.subscribedAt });
    if (subscriber.unsubscribedAt) moments.push({ key: 'left', icon: 'user-minus', tone: 'negative', title: 'Unsubscribed', when: subscriber.unsubscribedAt, note: subscriber.unsubscribeReason });

    const ordered = moments.sort((a, b) => (b.when ?? '').localeCompare(a.when ?? ''));
    if (subscriber.status === 'PENDING') ordered.unshift({ key: 'next', icon: 'hourglass', tone: 'critical', title: 'Waiting for the link to be clicked', pending: true });
    return ordered;
  }

  protected edit(subscriber: Subscriber): void {
    this.names.set({ firstName: subscriber.firstName ?? '', lastName: subscriber.lastName ?? '' });
    this.editing.set(true);
  }

  protected async save(event: Event, subscriber: Subscriber): Promise<void> {
    event.preventDefault();
    if (this.saving() || this.form().invalid()) return;
    this.saving.set(true);
    try {
      const { firstName, lastName } = this.names();
      const updated = await this.api.updateSubscriber(subscriber.listId, subscriber.id, { firstName: firstName.trim(), lastName: lastName.trim() });
      this.queries.setQueryData(keys.mailing.subscriber(updated.listId, updated.id), updated);
      void this.queries.invalidateQueries({ queryKey: keys.mailing.all, predicate: (query) => query.queryKey[1] === 'subscribers' });
      this.haptics.success();
      toast.success('Names saved', { description: updated.email });
      this.editing.set(false);
    } catch (error) {
      this.haptics.warning();
      toast.error('The names were not saved', { description: ApiError.from(error).message });
    } finally {
      this.saving.set(false);
    }
  }

  protected async run(action: SubscriberAction, subscriber: Subscriber): Promise<void> {
    this.running.set(action);
    try {
      const result = await this.lifecycle.run(action, subscriber);
      if (result === 'removed') this.closed.emit();
    } finally {
      this.running.set(null);
    }
  }

  private fromTable(listId: string, id: string): Subscriber | undefined {
    return this.queries
      .getQueriesData<Page<Subscriber>>({ queryKey: ['mailing', 'subscribers', listId] })
      .flatMap(([, page]) => page?.content ?? [])
      .find((subscriber) => subscriber.id === id);
  }
}
