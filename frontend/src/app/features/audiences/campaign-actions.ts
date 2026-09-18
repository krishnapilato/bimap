import { Injectable, inject } from '@angular/core';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { MailingApi } from '../../core/api/mailing.api';
import { Campaign, MailingList } from '../../core/api/mailing.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { dateTime } from '../../core/ui/format';
import { Haptics } from '../../core/ui/haptics';
import { Confirm } from '../../ui/overlay/confirm-dialog';
import { Dialogs } from '../../ui/overlay/dialog';
import { people } from './audience-presentation';
import { ScheduleDialog, ScheduleDialogData, TestSendDialog } from './campaign-dialogs';

export type CampaignAction = 'send' | 'schedule' | 'unschedule' | 'test' | 'cancel' | 'duplicate' | 'delete';

export const CAMPAIGN_ACTIONS: Record<CampaignAction, { label: string; icon: string; danger?: boolean }> = {
  send: { label: 'Send now', icon: 'send' },
  schedule: { label: 'Schedule', icon: 'calendar-clock' },
  unschedule: { label: 'Back to drafts', icon: 'calendar-x' },
  test: { label: 'Send a test', icon: 'mail-check' },
  cancel: { label: 'Stop sending', icon: 'octagon-x', danger: true },
  duplicate: { label: 'Duplicate', icon: 'copy-plus' },
  delete: { label: 'Delete', icon: 'trash', danger: true },
};

/**
 * A campaign's life: drafted, maybe scheduled, sent in paced batches that can be stopped, and kept
 * on record once anything has gone out. The same rules the IAM service enforces decide what is
 * offered, so a button is never shown only to be refused.
 */
@Injectable({ providedIn: 'root' })
export class CampaignActions {
  private readonly api = inject(MailingApi);
  private readonly sessions = inject(SessionStore);
  private readonly queries = inject(QueryClient);
  private readonly dialogs = inject(Dialogs);
  private readonly confirm = inject(Confirm);
  private readonly haptics = inject(Haptics);

  available(campaign: Campaign, list: MailingList | undefined): CampaignAction[] {
    if (!this.sessions.can('mailing:write')) return [];
    const active = list?.status === 'ACTIVE';
    switch (campaign.status) {
      case 'DRAFT':
        return [...(active ? (['send', 'schedule'] as const) : []), 'test', 'duplicate', 'delete'];
      case 'SCHEDULED':
        return [...(active ? (['send', 'schedule'] as const) : []), 'unschedule', 'test', 'duplicate', 'delete'];
      case 'SENDING':
        return ['cancel', 'duplicate'];
      case 'SENT':
      case 'CANCELLED':
        return active ? ['duplicate'] : [];
    }
  }

  /** Resolves to the campaign as it is now, a new draft for `duplicate`, `'deleted'`, or null. */
  async run(action: CampaignAction, campaign: Campaign, list: MailingList): Promise<Campaign | 'deleted' | null> {
    switch (action) {
      case 'send':
        return this.send(campaign, list);
      case 'schedule': {
        const updated = await this.dialogs.result<Campaign, ScheduleDialogData>(ScheduleDialog, {
          data: { campaign, recipients: list.audience.subscribed },
          width: '560px',
          maxWidth: 'calc(100vw - 24px)',
        });
        if (!updated) return null;
        this.done(updated, 'Scheduled', `Goes out ${dateTime(updated.scheduledAt)}`);
        return updated;
      }
      case 'unschedule':
        return this.attempt(() => this.api.unscheduleCampaign(campaign.listId, campaign.id), 'Back to drafts', 'Nothing goes out until it is scheduled or sent again.');
      case 'test': {
        const to = await this.dialogs.result<string>(TestSendDialog, { data: { campaign }, width: '460px', maxWidth: 'calc(100vw - 24px)' });
        if (to) {
          this.haptics.success();
          toast.success('Test sent', { description: `Check ${to} in a moment.` });
          void this.queries.invalidateQueries({ queryKey: keys.mail.all });
        }
        return null;
      }
      case 'cancel': {
        const sent = campaign.deliveries.sent + campaign.deliveries.failed;
        const answer = await this.confirm.ask({
          title: 'Stop sending?',
          message: `Nobody else receives it. The ${sent} ${sent === 1 ? 'message' : 'messages'} already on their way stay sent.`,
          confirmLabel: 'Stop sending',
          tone: 'danger',
          icon: 'octagon-x',
        });
        return answer.confirmed ? this.attempt(() => this.api.cancelCampaign(campaign.listId, campaign.id), 'Sending stopped') : null;
      }
      case 'duplicate':
        return this.attempt(() => this.api.duplicateCampaign(campaign.listId, campaign.id), 'Copied as a new draft', campaign.subject);
      case 'delete': {
        const answer = await this.confirm.ask({
          title: 'Delete this campaign?',
          message: `“${campaign.subject}” is deleted for good. Nothing was sent, so there is no history to keep.`,
          confirmLabel: 'Delete',
          tone: 'danger',
          icon: 'trash',
        });
        if (!answer.confirmed) return null;
        try {
          await this.api.deleteCampaign(campaign.listId, campaign.id);
          this.haptics.success();
          toast.success('Campaign deleted', { description: campaign.subject });
          this.queries.removeQueries({ queryKey: keys.mailing.campaign(campaign.listId, campaign.id) });
          void this.queries.invalidateQueries({ queryKey: keys.mailing.all });
          return 'deleted';
        } catch (error) {
          this.fail('The campaign could not be deleted', error);
          return null;
        }
      }
    }
  }

  private async send(campaign: Campaign, list: MailingList): Promise<Campaign | null> {
    const recipients = list.audience.subscribed;
    if (recipients === 0) {
      this.haptics.warning();
      toast.error('Nobody to send it to yet', { description: 'Nobody on this list has confirmed a subscription.' });
      return null;
    }
    const answer = await this.confirm.ask({
      title: `Send “${campaign.subject}” now?`,
      message: `It goes to ${people(recipients)} on ${list.name}, a few at a time. Sending can be stopped, but messages already delivered cannot be called back.`,
      confirmLabel: `Send to ${people(recipients)}`,
      icon: 'send',
    });
    return answer.confirmed ? this.attempt(() => this.api.sendCampaign(campaign.listId, campaign.id), 'Sending has started', `To ${people(recipients)}`) : null;
  }

  private async attempt(call: () => Promise<Campaign>, title: string, description?: string): Promise<Campaign | null> {
    try {
      const updated = await call();
      this.done(updated, title, description);
      return updated;
    } catch (error) {
      this.fail('That did not go through', error);
      return null;
    }
  }

  private done(updated: Campaign, title: string, description?: string): void {
    this.haptics.success();
    toast.success(title, { description });
    this.queries.setQueryData(keys.mailing.campaign(updated.listId, updated.id), updated);
    void this.queries.invalidateQueries({ queryKey: keys.mailing.all, predicate: (query) => query.queryKey[1] !== 'campaign' });
  }

  private fail(title: string, error: unknown): void {
    this.haptics.warning();
    toast.error(title, { description: ApiError.from(error).message });
  }
}
