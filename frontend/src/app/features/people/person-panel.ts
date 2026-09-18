import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input, output, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { ApiError } from '../../core/api/api-error';
import { User } from '../../core/api/iam.models';
import { UsersApi } from '../../core/api/users.api';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { dateTime, relativeTime } from '../../core/ui/format';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import { Property } from '../../ui/data/properties';
import { EmptyState, ErrorState, Skeleton } from '../../ui/feedback/feedback';
import { Icon } from '../../ui/icon/icon';
import { Dialogs } from '../../ui/overlay/dialog';
import { StatusBadge } from '../../ui/status/status-badge';
import { ACCOUNT_STATUS, PERMISSION, ROLE } from '../../ui/status/status-tones';
import { ACCOUNT_ACTIONS, AccountAction, AccountActions } from './account-actions';
import { PersonDialog, PersonDialogData } from './person-dialog';

/** One person, beside the directory: who they are, what they may do, and what can be done to the account. */
@Component({
  selector: 'bm-person-panel',
  imports: [Icon, Avatar, Button, Property, StatusBadge, EmptyState, ErrorState, Skeleton],
  template: `
    <article class="person">
      <header class="person__bar">
        <button type="button" bmButton variant="ghost" size="sm" iconOnly aria-label="Close" (click)="closed.emit()">
          <svg lucideIcon="x"></svg>
        </button>
      </header>

      @if (query.isPending()) {
        <div class="person__loading">
          <bm-skeleton shape="circle" width="72px" height="72px" />
          <bm-skeleton width="60%" height="22px" />
          <bm-skeleton width="40%" height="14px" />
        </div>
      } @else if (query.isError()) {
        @if (notFound()) {
          <bm-empty-state icon="user-x" title="This account is gone" description="It may have been deleted." compact />
        } @else {
          <bm-error-state [error]="query.error()" (retry)="query.refetch()" />
        }
      } @else if (query.data(); as user) {
        <section class="person__identity">
          <bm-avatar size="xl" [name]="user.fullName" [src]="user.avatarUrl" />
          <h2 class="person__name">{{ user.fullName }}</h2>
          <a class="person__email" [href]="'mailto:' + user.email">{{ user.email }}</a>
          <div class="person__badges">
            <bm-status [label]="accountStatus[user.status].label" [tone]="accountStatus[user.status].tone" />
            <span class="person__role"><svg [lucideIcon]="roleInfo[user.role].icon" [size]="14"></svg>{{ roleInfo[user.role].label }}</span>
            @if (isSelf(user)) {
              <span class="person__you">You</span>
            }
          </div>
        </section>

        @if (canEdit() || actions(user).length) {
          <div class="person__actions">
            @if (canEdit()) {
              <button type="button" bmButton size="sm" (click)="edit(user)">
                <svg lucideIcon="pencil"></svg>
                Edit
              </button>
            }
            @for (action of actions(user); track action) {
              <button type="button" bmButton size="sm" [variant]="meta[action].danger ? 'ghost' : 'secondary'" [class.is-danger]="meta[action].danger" [loading]="running() === action" (click)="run(action, user)">
                <svg [lucideIcon]="meta[action].icon"></svg>
                {{ meta[action].label }}
              </button>
            }
          </div>
        }

        <section class="person__section">
          <h3>Account</h3>
          <dl class="bm-properties">
            <bm-property label="Signs in with" [value]="user.authProvider === 'GOOGLE' ? 'Google' : 'Email and password'" />
            <bm-property label="Last sign-in" [value]="user.lastLoginAt ? relativeTime(user.lastLoginAt) : 'Never'" />
            <bm-property label="Member since" [value]="dateTime(user.createdAt)" />
            <bm-property label="Reference" [value]="user.id" mono copyable />
          </dl>
        </section>

        <section class="person__section">
          <h3>What {{ user.firstName }} can do</h3>
          <p class="person__role-text">{{ roleInfo[user.role].description }}</p>
          <ul class="person__permissions">
            @for (permission of user.permissions; track permission; let i = $index) {
              <li [style.--bm-i]="i">
                <svg [lucideIcon]="permissions[permission].icon" [size]="15"></svg>
                {{ permissions[permission].label }}
              </li>
            }
          </ul>
        </section>
      }
    </article>
  `,
  styles: `
    .person { display: grid; gap: 18px; padding: 8px 20px 28px; background: var(--bm-surface); border: 1px solid var(--bm-border); border-radius: var(--bm-radius-lg); min-height: 100%; }
    .is-handset .person, .bm-split__detail .person { border-radius: inherit; }
    .person__bar { display: flex; justify-content: flex-end; margin: 0 -12px; }
    .person__loading { display: grid; justify-items: center; gap: 12px; padding: 12px 0; }
    .person__identity { display: grid; justify-items: center; gap: 6px; text-align: center; }
    .person__identity bm-avatar { animation: bm-pop var(--bm-duration-slow) var(--bm-ease-spring) both; }
    .person__name { margin-top: 6px; font: var(--bm-text-title); letter-spacing: var(--bm-tracking-tight); animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) 60ms both; }
    .person__email { font: var(--bm-text-small); color: var(--bm-accent-text); overflow-wrap: anywhere; animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) 100ms both; }
    .person__badges { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 6px; animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) 140ms both; }
    .person__role, .person__you { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 9px; border-radius: 999px; background: var(--bm-surface-3); font: var(--bm-text-caption); font-weight: 650; color: var(--bm-text-2); }
    .person__you { background: var(--bm-signal-soft); color: var(--bm-signal-strong); }
    .person__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; padding-bottom: 18px; border-bottom: 1px solid var(--bm-border-subtle); animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) 180ms both; }
    .person__actions .is-danger { color: var(--bm-negative); }
    .person__section { display: grid; gap: 12px; animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) 220ms both; }
    .person__section h3 { font: var(--bm-text-subheading); }
    .person__role-text { margin-top: -6px; font: var(--bm-text-small); color: var(--bm-text-2); }
    .person__permissions { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
    .person__permissions li {
      display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--bm-radius-sm); background: var(--bm-surface-2);
      font: var(--bm-text-small); animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) both; animation-delay: calc(var(--bm-i, 0) * 40ms + 260ms);
    }
    .person__permissions svg { color: var(--bm-positive); flex-shrink: 0; }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonPanel {
  readonly id = input.required<string>();
  readonly closed = output<void>();

  private readonly users = inject(UsersApi);
  private readonly sessions = inject(SessionStore);
  private readonly dialogs = inject(Dialogs);
  private readonly lifecycle = inject(AccountActions);

  protected readonly accountStatus = ACCOUNT_STATUS;
  protected readonly roleInfo = ROLE;
  protected readonly permissions = PERMISSION;
  protected readonly meta = ACCOUNT_ACTIONS;
  protected readonly relativeTime = relativeTime;
  protected readonly dateTime = dateTime;

  protected readonly query = injectQuery(() => ({
    queryKey: keys.users.detail(this.id()),
    queryFn: () => this.users.findOne(this.id()),
  }));

  protected readonly notFound = computed(() => ApiError.from(this.query.error()).status === 404);
  protected readonly canEdit = computed(() => this.sessions.can('user:write') && this.query.data()?.status !== 'DELETED');
  protected readonly running = signal<AccountAction | null>(null);

  protected isSelf(user: User): boolean {
    return user.id === this.sessions.user()?.id;
  }

  protected actions(user: User): AccountAction[] {
    return this.lifecycle.available(user);
  }

  protected edit(user: User): void {
    this.dialogs.open<User, PersonDialogData>(PersonDialog, { data: { user }, width: '520px', maxWidth: 'calc(100vw - 24px)' });
  }

  protected async run(action: AccountAction, user: User): Promise<void> {
    this.running.set(action);
    try {
      await this.lifecycle.run(action, user);
      if (action === 'delete' && !this.query.isFetching()) this.closed.emit();
    } finally {
      this.running.set(null);
    }
  }
}
