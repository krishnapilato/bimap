import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, input, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { injectQuery, keepPreviousData } from '@tanstack/angular-query-experimental';

import { AccountStatus, User } from '../../core/api/iam.models';
import { UsersApi } from '../../core/api/users.api';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { formatNumber, relativeTime } from '../../core/ui/format';
import { Viewport } from '../../core/ui/viewport';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import { StatTile } from '../../ui/charts/stat-tile';
import { Column, RowCard, Table } from '../../ui/data/table';
import { Paginator } from '../../ui/data/paginator';
import { EmptyState, ErrorState } from '../../ui/feedback/feedback';
import { SearchBox } from '../../ui/form/search-box';
import { Icon } from '../../ui/icon/icon';
import { PageHeader } from '../../ui/layout/page';
import { Dialogs } from '../../ui/overlay/dialog';
import { StatusBadge } from '../../ui/status/status-badge';
import { ACCOUNT_STATUS, ROLE } from '../../ui/status/status-tones';
import { PersonDialog, PersonDialogData } from './person-dialog';
import { PersonPanel } from './person-panel';

const PAGE_SIZE = 20;

/**
 * The account directory: headline figures that double as filters, a searchable list, and the
 * selected person beside it. The selection lives in the address, so a person's page can be shared.
 */
@Component({
  selector: 'bm-people',
  imports: [Icon, PageHeader, StatTile, SearchBox, Table, Column, RowCard, Paginator, Avatar, StatusBadge, Button, EmptyState, ErrorState, PersonPanel],
  template: `
    <div class="bm-page is-wide people">
      <bm-page-header title="People" [subtitle]="subtitle()">
        <div bmActions>
          @if (sessions.can('user:write')) {
            <button type="button" bmButton variant="primary" (click)="invite()">
              <svg lucideIcon="user-plus"></svg>
              Invite someone
            </button>
          }
        </div>
      </bm-page-header>

      <section class="people__kpis bm-grid" aria-label="Accounts by status">
        <bm-stat-tile label="Everyone" icon="users" [value]="stats.data()?.total" [loading]="stats.isPending()" selectable [selected]="!status()" (click)="filter(null)" (keydown.enter)="filter(null)" />
        <bm-stat-tile label="Active" icon="circle-check" tone="positive" [value]="stats.data()?.active" [loading]="stats.isPending()" selectable [selected]="status() === 'ACTIVE'" (click)="filter('ACTIVE')" (keydown.enter)="filter('ACTIVE')" />
        <bm-stat-tile label="Waiting to activate" icon="hourglass" tone="critical" [value]="stats.data()?.pendingActivation" [loading]="stats.isPending()" selectable [selected]="status() === 'PENDING_ACTIVATION'" (click)="filter('PENDING_ACTIVATION')" (keydown.enter)="filter('PENDING_ACTIVATION')" />
        <bm-stat-tile label="Locked" icon="lock" tone="negative" [value]="stats.data()?.locked" [loading]="stats.isPending()" selectable [selected]="status() === 'LOCKED'" (click)="filter('LOCKED')" (keydown.enter)="filter('LOCKED')" />
        <bm-stat-tile label="Disabled" icon="ban" tone="neutral" [value]="stats.data()?.disabled" [loading]="stats.isPending()" selectable [selected]="status() === 'DISABLED'" (click)="filter('DISABLED')" (keydown.enter)="filter('DISABLED')" />
      </section>

      <div class="bm-split" [class.has-detail]="!!id()">
        <div class="people__list">
          <div class="bm-toolbar">
            <bm-search-box placeholder="Search by name or email" shortcut [value]="q() ?? ''" [busy]="list.isFetching() && !list.isPending()" (search)="search($event)" />
          </div>

          @if (list.isError()) {
            <bm-error-state [error]="list.error()" (retry)="list.refetch()" />
          } @else {
            <div class="people__table">
              <bm-table
                caption="People"
                [rows]="list.data()?.content"
                [rowKey]="rowKey"
                [loading]="list.isPending()"
                [refreshing]="list.isPlaceholderData()"
                [selectedKey]="id() ?? null"
                (rowOpen)="open($event)"
              >
                <ng-template bmColumn="fullName" header="Person" let-row>
                  <span class="people__person">
                    <bm-avatar [name]="row.fullName" [src]="row.avatarUrl" />
                    <span>
                      <strong>{{ row.fullName }}</strong>
                      <span>{{ row.email }}</span>
                    </span>
                  </span>
                </ng-template>
                <ng-template bmColumn="role" header="Role" [priority]="2" let-row>
                  <span class="people__role"><svg [lucideIcon]="roleOf(row).icon" [size]="14"></svg>{{ roleOf(row).label }}</span>
                </ng-template>
                <ng-template bmColumn="status" header="Status" let-row>
                  <bm-status size="sm" [label]="statusOf(row).label" [tone]="statusOf(row).tone" />
                </ng-template>
                <ng-template bmColumn="lastLoginAt" header="Last sign-in" [priority]="3" let-row>
                  <span class="people__muted">{{ row.lastLoginAt ? relativeTime(row.lastLoginAt) : 'Never' }}</span>
                </ng-template>
                <ng-template bmCard let-row>
                  <span class="people__person">
                    <bm-avatar [name]="row.fullName" [src]="row.avatarUrl" />
                    <span>
                      <strong>{{ row.fullName }}</strong>
                      <span>{{ roleOf(row).label }} · {{ statusOf(row).label }}</span>
                    </span>
                  </span>
                </ng-template>
                <div bmEmpty>
                  <bm-empty-state icon="users" title="Nobody matches" description="Try part of a name or an email address." compact />
                </div>
              </bm-table>
              <bm-paginator [page]="list.data()" [sizes]="[]" (pageChange)="goToPage($event)" />
            </div>
          }
        </div>

        @if (id(); as selected) {
          <aside class="bm-split__detail" aria-label="Selected person">
            <bm-person-panel [id]="selected" (closed)="close()" />
          </aside>
        }
      </div>
    </div>
  `,
  styles: `
    .people__kpis { --bm-grid-min: 170px; }
    .people__kpis > * { animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) both; }
    .people__kpis > :nth-child(2) { animation-delay: 50ms; }
    .people__kpis > :nth-child(3) { animation-delay: 100ms; }
    .people__kpis > :nth-child(4) { animation-delay: 150ms; }
    .people__kpis > :nth-child(5) { animation-delay: 200ms; }
    .people__list { display: grid; gap: 12px; min-width: 0; }
    .people__table { overflow: hidden; border: 1px solid var(--bm-border); border-radius: var(--bm-radius-lg); background: var(--bm-surface); box-shadow: var(--bm-shadow-xs); }
    .people__person { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .people__person > span { display: grid; gap: 1px; min-width: 0; }
    .people__person strong { font: var(--bm-text-subheading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .people__person > span > span { font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .people__role { display: inline-flex; align-items: center; gap: 6px; font: var(--bm-text-small); font-weight: 600; color: var(--bm-text-2); }
    .people__role svg { color: var(--bm-accent); }
    .people__muted { font: var(--bm-text-small); color: var(--bm-text-3); }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class People {
  readonly id = input<string>();
  readonly q = input<string>();
  readonly status = input<AccountStatus>();
  readonly page = input<string>();

  /** `?invite=1` from the command palette opens the invitation straight away. */
  readonly invite$ = input<string>(undefined, { alias: 'invite' });

  private readonly users = inject(UsersApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogs = inject(Dialogs);
  protected readonly sessions = inject(SessionStore);
  protected readonly viewport = inject(Viewport);

  protected readonly relativeTime = relativeTime;

  protected readonly stats = injectQuery(() => ({ queryKey: keys.users.statistics, queryFn: () => this.users.statistics() }));

  protected readonly list = injectQuery(() => {
    const query = { q: this.q()?.trim() || undefined, status: this.status() || undefined };
    const request = { page: Math.max(0, Number(this.page() ?? 0) || 0), size: PAGE_SIZE, sort: { field: 'lastName', direction: 'asc' as const } };
    return {
      queryKey: keys.users.list(query, request),
      queryFn: () => this.users.search(query, request),
      placeholderData: keepPreviousData,
    };
  });

  protected readonly subtitle = computed(() => {
    const total = this.list.data()?.totalElements;
    if (total === undefined) return 'Accounts, roles and what each can do.';
    return `${formatNumber(total)} ${total === 1 ? 'account' : 'accounts'}${this.q() || this.status() ? ' match' : ''}.`;
  });

  protected readonly rowKey = (user: User) => user.id;

  constructor() {
    effect(() => {
      if (this.invite$() && this.sessions.can('user:write')) untracked(() => this.invite());
    });
  }

  protected roleOf(user: User) {
    return ROLE[user.role];
  }

  protected statusOf(user: User) {
    return ACCOUNT_STATUS[user.status];
  }

  protected filter(status: AccountStatus | null): void {
    this.navigate({ status, page: null });
  }

  protected search(text: string): void {
    this.navigate({ q: text || null, page: null });
  }

  protected goToPage(page: number): void {
    this.navigate({ page: page || null });
  }

  protected open(user: User): void {
    void this.router.navigate(['/people', user.id], { queryParamsHandling: 'preserve' });
  }

  protected close(): void {
    void this.router.navigate(['/people'], { queryParamsHandling: 'preserve' });
  }

  protected invite(): void {
    const ref = this.dialogs.open<User, PersonDialogData>(PersonDialog, { data: {}, width: '520px', maxWidth: 'calc(100vw - 24px)' });
    ref.closed.subscribe((user) => {
      if (this.invite$()) this.navigate({ invite: null });
      if (user) this.open(user);
    });
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
