import { Injectable, inject } from '@angular/core';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { ACCOUNT_TRANSITIONS, AccountStatus, User } from '../../core/api/iam.models';
import { UsersApi } from '../../core/api/users.api';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { Haptics } from '../../core/ui/haptics';
import { Confirm } from '../../ui/overlay/confirm-dialog';

export type AccountAction = 'activate' | 'unlock' | 'lock' | 'disable' | 'enable' | 'delete';

export const ACCOUNT_ACTIONS: Record<AccountAction, { label: string; icon: string; danger?: boolean }> = {
  activate: { label: 'Activate', icon: 'user-check' },
  unlock: { label: 'Unlock', icon: 'lock-open' },
  lock: { label: 'Lock', icon: 'lock' },
  enable: { label: 'Enable', icon: 'circle-check' },
  disable: { label: 'Disable', icon: 'ban', danger: true },
  delete: { label: 'Delete', icon: 'trash', danger: true },
};

/**
 * The account lifecycle, with the IAM service's rules: pending accounts can be activated, active
 * ones locked or disabled, and nobody can do any of it to themselves.
 */
@Injectable({ providedIn: 'root' })
export class AccountActions {
  private readonly users = inject(UsersApi);
  private readonly sessions = inject(SessionStore);
  private readonly queries = inject(QueryClient);
  private readonly confirm = inject(Confirm);
  private readonly haptics = inject(Haptics);

  available(user: User): AccountAction[] {
    if (!this.sessions.can('user:lifecycle') || user.id === this.sessions.user()?.id) return [];
    const next = ACCOUNT_TRANSITIONS[user.status];
    const actions: AccountAction[] = [];
    if (next.includes('ACTIVE')) actions.push(user.status === 'PENDING_ACTIVATION' ? 'activate' : user.status === 'LOCKED' ? 'unlock' : 'enable');
    if (next.includes('LOCKED')) actions.push('lock');
    if (next.includes('DISABLED')) actions.push('disable');
    if (next.includes('DELETED')) actions.push('delete');
    return actions;
  }

  async run(action: AccountAction, user: User): Promise<User | null> {
    switch (action) {
      case 'activate':
        return this.move(user, 'ACTIVE', undefined, `${user.firstName} can sign in now`);
      case 'unlock':
      case 'enable':
        return this.move(user, 'ACTIVE', undefined, `${user.firstName} can sign in again`);
      case 'lock': {
        const answer = await this.confirm.ask({
          title: `Lock ${user.fullName}?`,
          message: 'They are signed out everywhere and cannot sign in until the account is unlocked.',
          confirmLabel: 'Lock the account',
          tone: 'danger',
          icon: 'lock',
          reason: { label: 'Reason', placeholder: 'Unusual sign-in activity…' },
        });
        return answer.confirmed ? this.move(user, 'LOCKED', answer.reason, 'Account locked') : null;
      }
      case 'disable': {
        const answer = await this.confirm.ask({
          title: `Disable ${user.fullName}?`,
          message: 'The account stops working but is kept, with everything it recorded. It can be enabled again later.',
          confirmLabel: 'Disable the account',
          tone: 'danger',
          icon: 'ban',
          reason: { label: 'Reason', placeholder: 'Left the survey team…' },
        });
        return answer.confirmed ? this.move(user, 'DISABLED', answer.reason, 'Account disabled') : null;
      }
      case 'delete': {
        const answer = await this.confirm.ask({
          title: `Delete ${user.fullName}?`,
          message: 'The account is closed for good. Registrations they recorded keep their name as the author.',
          confirmLabel: 'Delete the account',
          tone: 'danger',
          icon: 'trash',
        });
        if (!answer.confirmed) return null;
        try {
          await this.users.delete(user.id);
          this.haptics.success();
          toast.success('Account deleted', { description: user.email });
          void this.queries.invalidateQueries({ queryKey: keys.users.all });
        } catch (error) {
          this.fail(error);
        }
        return null;
      }
    }
  }

  private async move(user: User, status: AccountStatus, reason: string | undefined, done: string): Promise<User | null> {
    try {
      const updated = await this.users.changeStatus(user.id, { status, reason });
      this.haptics.success();
      toast.success(done, { description: updated.email });
      this.queries.setQueryData(keys.users.detail(updated.id), updated);
      void this.queries.invalidateQueries({ queryKey: keys.users.all, predicate: (query) => query.queryKey[1] !== 'detail' });
      return updated;
    } catch (error) {
      this.fail(error);
      return null;
    }
  }

  private fail(error: unknown): void {
    this.haptics.warning();
    toast.error('That did not go through', { description: ApiError.from(error).message });
  }
}
