import { Injectable, inject } from '@angular/core';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { MailingApi } from '../../core/api/mailing.api';
import { MailingList, MailingListStatus, MailingListUpdate, SubscriptionStatus } from '../../core/api/mailing.models';
import { keys } from '../../core/query/keys';
import { saveBlob } from '../../core/ui/files';
import { Haptics } from '../../core/ui/haptics';
import { Confirm } from '../../ui/overlay/confirm-dialog';
import { listSlug, people } from './audience-presentation';

/**
 * What can happen to a list as a whole. The IAM service's rules apply: a list is archived before
 * it can be deleted, and archiving waits for any campaign that is still sending.
 */
@Injectable({ providedIn: 'root' })
export class ListActions {
  private readonly api = inject(MailingApi);
  private readonly queries = inject(QueryClient);
  private readonly confirm = inject(Confirm);
  private readonly haptics = inject(Haptics);

  /** Saves settings at once. The cached list changes first, so switches never lag behind a tap. */
  async update(list: MailingList, change: MailingListUpdate, done?: string): Promise<MailingList | null> {
    const key = keys.mailing.list(list.id);
    const before = this.queries.getQueryData<MailingList>(key);
    this.queries.setQueryData<MailingList>(key, { ...list, ...change });
    try {
      const updated = await this.api.updateList(list.id, change);
      this.settle(updated);
      if (done) toast.success(done, { description: updated.name });
      return updated;
    } catch (error) {
      if (before) this.queries.setQueryData(key, before);
      this.fail('The change was not saved', error);
      return null;
    }
  }

  async archive(list: MailingList): Promise<MailingList | null> {
    const answer = await this.confirm.ask({
      title: `Archive ${list.name}?`,
      message: 'Nobody can join it and nothing can be sent to it, and scheduled campaigns go back to drafts. Subscribers and history are kept, and the list can be restored at any time.',
      confirmLabel: 'Archive the list',
      icon: 'archive',
    });
    return answer.confirmed ? this.move(list, 'ARCHIVED', 'List archived') : null;
  }

  restore(list: MailingList): Promise<MailingList | null> {
    return this.move(list, 'ACTIVE', 'List restored');
  }

  async remove(list: MailingList): Promise<boolean> {
    const answer = await this.confirm.ask({
      title: `Delete ${list.name} for good?`,
      message: `${people(list.audience.total)} and ${list.campaignCount} ${list.campaignCount === 1 ? 'campaign' : 'campaigns'} are deleted with it. This cannot be undone.`,
      confirmLabel: 'Delete the list',
      tone: 'danger',
      icon: 'trash',
    });
    if (!answer.confirmed) return false;
    try {
      await this.api.deleteList(list.id);
      this.haptics.success();
      toast.success('List deleted', { description: list.name });
      this.queries.removeQueries({ queryKey: keys.mailing.list(list.id) });
      void this.queries.invalidateQueries({ queryKey: keys.mailing.all });
      return true;
    } catch (error) {
      this.fail('The list could not be deleted', error);
      return false;
    }
  }

  async export(list: MailingList, status?: SubscriptionStatus): Promise<void> {
    try {
      const blob = await this.api.exportSubscribers(list.id, status);
      saveBlob(blob, `bimap-${listSlug(list)}-${status ? status.toLowerCase() : 'subscribers'}.csv`);
      toast.success('Export ready', { description: 'The spreadsheet is in your downloads.' });
    } catch (error) {
      this.fail('The export failed', error);
    }
  }

  private async move(list: MailingList, status: MailingListStatus, done: string): Promise<MailingList | null> {
    try {
      const updated = await this.api.changeListStatus(list.id, status);
      this.haptics.success();
      toast.success(done, { description: updated.name });
      this.settle(updated);
      return updated;
    } catch (error) {
      this.fail('That did not go through', error);
      return null;
    }
  }

  private settle(updated: MailingList): void {
    this.queries.setQueryData(keys.mailing.list(updated.id), updated);
    void this.queries.invalidateQueries({
      queryKey: keys.mailing.all,
      predicate: (query) => !(query.queryKey[1] === 'list' && query.queryKey[2] === updated.id),
    });
  }

  private fail(title: string, error: unknown): void {
    this.haptics.warning();
    toast.error(title, { description: ApiError.from(error).message });
  }
}
