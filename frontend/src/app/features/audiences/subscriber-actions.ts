import { Injectable, inject } from '@angular/core';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { MailingApi } from '../../core/api/mailing.api';
import { MailingList, Subscriber, SubscriptionStatus } from '../../core/api/mailing.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { Haptics } from '../../core/ui/haptics';
import { Confirm } from '../../ui/overlay/confirm-dialog';
import { subscriberName } from './audience-presentation';

export type SubscriberAction = 'resend' | 'subscribe' | 'confirm-again' | 'unsubscribe' | 'remove';

export const SUBSCRIBER_ACTIONS: Record<SubscriberAction, { label: string; icon: string; danger?: boolean }> = {
  resend: { label: 'Send the link again', icon: 'mail-plus' },
  subscribe: { label: 'Mark as subscribed', icon: 'badge-check' },
  'confirm-again': { label: 'Ask to confirm again', icon: 'mail-question' },
  unsubscribe: { label: 'Unsubscribe', icon: 'user-minus', danger: true },
  remove: { label: 'Remove', icon: 'trash', danger: true },
};

/** How long the IAM service waits before it sends another confirmation to the same address. */
export const CONFIRMATION_COOLDOWN_MS = 5 * 60_000;

/**
 * Moving one address by hand. Consent is the point of every rule here: marking someone subscribed
 * asserts they agreed elsewhere, and an address that opted out is only ever asked again, never
 * silently put back.
 */
@Injectable({ providedIn: 'root' })
export class SubscriberActions {
  private readonly api = inject(MailingApi);
  private readonly sessions = inject(SessionStore);
  private readonly queries = inject(QueryClient);
  private readonly confirm = inject(Confirm);
  private readonly haptics = inject(Haptics);

  available(subscriber: Subscriber, list: MailingList): SubscriberAction[] {
    if (!this.sessions.can('mailing:write')) return [];
    const active = list.status === 'ACTIVE';
    switch (subscriber.status) {
      case 'PENDING':
        return [...(active ? (['resend', 'subscribe'] as const) : []), 'unsubscribe', 'remove'];
      case 'SUBSCRIBED':
        return ['unsubscribe', 'remove'];
      case 'UNSUBSCRIBED':
        return [...(active ? (['confirm-again', 'subscribe'] as const) : []), 'remove'];
    }
  }

  /** Minutes left before another confirmation can go out, or zero. */
  cooldown(subscriber: Subscriber): number {
    if (!subscriber.confirmationSentAt) return 0;
    const left = Math.min(CONFIRMATION_COOLDOWN_MS, CONFIRMATION_COOLDOWN_MS - (Date.now() - Date.parse(subscriber.confirmationSentAt)));
    return left > 0 ? Math.ceil(left / 60_000) : 0;
  }

  async run(action: SubscriberAction, subscriber: Subscriber): Promise<Subscriber | 'removed' | null> {
    const name = subscriberName(subscriber);
    switch (action) {
      case 'resend':
        return this.resend(subscriber);
      case 'subscribe': {
        const answer = await this.confirm.ask({
          title: `Mark ${name} as subscribed?`,
          message: 'Only do this if they agreed to receive this list somewhere else, such as on a paper form. They get every campaign from now on.',
          confirmLabel: 'They agreed',
          icon: 'badge-check',
        });
        return answer.confirmed ? this.move(subscriber, 'SUBSCRIBED', undefined, 'Subscribed') : null;
      }
      case 'confirm-again': {
        const answer = await this.confirm.ask({
          title: `Ask ${name} to confirm again?`,
          message: `A new confirmation link goes to ${subscriber.email}. Nothing else is sent until they click it.`,
          confirmLabel: 'Send the link',
          icon: 'mail-question',
        });
        return answer.confirmed ? this.move(subscriber, 'PENDING', undefined, 'Confirmation link sent') : null;
      }
      case 'unsubscribe': {
        const answer = await this.confirm.ask({
          title: `Unsubscribe ${name}?`,
          message: 'They stop receiving campaigns from this list. The record stays, so they are not added back by a later import.',
          confirmLabel: 'Unsubscribe',
          tone: 'danger',
          icon: 'user-minus',
          reason: { label: 'Why', placeholder: 'Asked by phone to stop receiving it…' },
        });
        return answer.confirmed ? this.move(subscriber, 'UNSUBSCRIBED', answer.reason, 'Unsubscribed') : null;
      }
      case 'remove':
        return this.remove(subscriber);
    }
  }

  private async resend(subscriber: Subscriber): Promise<Subscriber | null> {
    try {
      await this.api.resendConfirmation(subscriber.listId, subscriber.id);
      this.haptics.success();
      toast.success('Confirmation link sent', { description: subscriber.email });
      const updated = { ...subscriber, confirmationSentAt: new Date().toISOString() };
      this.settle(updated);
      return updated;
    } catch (error) {
      this.fail('The link was not sent', error);
      return null;
    }
  }

  private async move(subscriber: Subscriber, status: SubscriptionStatus, reason: string | undefined, done: string): Promise<Subscriber | null> {
    try {
      const updated = await this.api.changeSubscriberStatus(subscriber.listId, subscriber.id, status, reason);
      this.haptics.success();
      toast.success(done, { description: updated.email });
      this.settle(updated);
      return updated;
    } catch (error) {
      this.fail('That did not go through', error);
      return null;
    }
  }

  private async remove(subscriber: Subscriber): Promise<'removed' | null> {
    const answer = await this.confirm.ask({
      title: `Remove ${subscriberName(subscriber)} from the list?`,
      message: 'The subscription and its history are deleted. To stop sending to them but keep the record, unsubscribe them instead.',
      confirmLabel: 'Remove',
      tone: 'danger',
      icon: 'trash',
    });
    if (!answer.confirmed) return null;
    try {
      await this.api.removeSubscriber(subscriber.listId, subscriber.id);
      this.haptics.success();
      toast.success('Removed from the list', { description: subscriber.email });
      this.queries.removeQueries({ queryKey: keys.mailing.subscriber(subscriber.listId, subscriber.id) });
      void this.queries.invalidateQueries({ queryKey: keys.mailing.all });
      return 'removed';
    } catch (error) {
      this.fail('The address could not be removed', error);
      return null;
    }
  }

  private settle(updated: Subscriber): void {
    this.queries.setQueryData(keys.mailing.subscriber(updated.listId, updated.id), updated);
    void this.queries.invalidateQueries({ queryKey: keys.mailing.all, predicate: (query) => query.queryKey[1] !== 'subscriber' });
  }

  private fail(title: string, error: unknown): void {
    this.haptics.warning();
    toast.error(title, { description: ApiError.from(error).message });
  }
}
