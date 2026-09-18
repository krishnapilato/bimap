import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { injectQuery, keepPreviousData } from '@tanstack/angular-query-experimental';

import { MailingApi } from '../../core/api/mailing.api';
import { MailingList, Subscriber, SubscriptionStatus } from '../../core/api/mailing.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { relativeClause, relativeTime } from '../../core/ui/format';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import { Column, RowCard, Table } from '../../ui/data/table';
import { Paginator } from '../../ui/data/paginator';
import { EmptyState, ErrorState } from '../../ui/feedback/feedback';
import { SearchBox } from '../../ui/form/search-box';
import { Segmented, SegmentOption } from '../../ui/form/segmented';
import { Icon } from '../../ui/icon/icon';
import { StatusBadge } from '../../ui/status/status-badge';
import { SUBSCRIPTION_STATUS } from '../../ui/status/status-tones';
import { SUBSCRIPTION_SOURCE, subscriberName } from './audience-presentation';
import { ListActions } from './list-actions';
import { SubscriberPanel } from './subscriber-panel';

const PAGE_SIZE = 25;

type StatusFilter = SubscriptionStatus | 'ALL';

/** Everyone on a list, filtered by state and searchable, with the chosen person beside the table. */
@Component({
  selector: 'bm-list-subscribers',
  imports: [Icon, Table, Column, RowCard, Paginator, SearchBox, Segmented, Avatar, StatusBadge, Button, EmptyState, ErrorState, SubscriberPanel],
  template: `
    <div class="bm-split" [class.has-detail]="!!selected()">
      <div class="subscribers">
        <div class="subscribers__toolbar">
          <bm-segmented size="sm" ariaLabel="Show subscribers" [options]="filters()" [value]="status() ?? 'ALL'" (valueChange)="filter($event)" />
          <bm-search-box placeholder="Search by name or address" shortcut [value]="q() ?? ''" [busy]="rows.isFetching() && !rows.isPending()" (search)="search($event)" />
          <span class="bm-toolbar__spacer"></span>
          <button type="button" bmButton variant="ghost" size="sm" (click)="export()">
            <svg lucideIcon="download"></svg>
            {{ status() ? 'Export these' : 'Export' }}
          </button>
        </div>

        @if (rows.isError()) {
          <bm-error-state [error]="rows.error()" (retry)="rows.refetch()" />
        } @else {
          <div class="subscribers__table">
            <bm-table
              caption="Subscribers"
              [rows]="rows.data()?.content"
              [rowKey]="rowKey"
              [loading]="rows.isPending()"
              [refreshing]="rows.isPlaceholderData()"
              [selectedKey]="selected() ?? null"
              (rowOpen)="open($event)"
            >
              <ng-template bmColumn="email" header="Person" let-row>
                <span class="subscribers__person">
                  <bm-avatar [name]="name(row)" />
                  <span>
                    <strong>{{ name(row) }}</strong>
                    @if (row.fullName) {
                      <span>{{ row.email }}</span>
                    }
                  </span>
                </span>
              </ng-template>
              <ng-template bmColumn="status" header="Status" let-row>
                <bm-status size="sm" [label]="statusInfo[presented(row).status].label" [tone]="statusInfo[presented(row).status].tone" />
              </ng-template>
              <ng-template bmColumn="source" header="Joined through" [priority]="2" let-row>
                <span class="subscribers__source"><svg [lucideIcon]="sources[presented(row).source].icon" [size]="14"></svg>{{ sources[presented(row).source].label }}</span>
              </ng-template>
              <ng-template bmColumn="createdAt" header="Since" [priority]="3" let-row>
                <span class="subscribers__muted">{{ since(row) }}</span>
              </ng-template>
              <ng-template bmCard let-row>
                <span class="subscribers__person">
                  <bm-avatar [name]="name(row)" />
                  <span>
                    <strong>{{ name(row) }}</strong>
                    <span>{{ statusInfo[presented(row).status].label }} · {{ since(row) }}</span>
                  </span>
                </span>
              </ng-template>
              <div bmEmpty>
                @if (q() || status()) {
                  <bm-empty-state icon="scan-search" title="Nobody matches" description="Try part of a name or an address, or show everyone." compact />
                } @else {
                  <bm-empty-state icon="users-round" title="Nobody on this list yet" description="Add addresses by hand, import a spreadsheet, or open the public sign-up page in the settings." compact />
                }
              </div>
            </bm-table>
            <bm-paginator [page]="rows.data()" [sizes]="[]" (pageChange)="goToPage($event)" />
          </div>
        }
      </div>

      @if (selected(); as id) {
        <aside class="bm-split__detail" aria-label="Selected subscriber">
          <bm-subscriber-panel [list]="list()" [subscriberId]="id" (closed)="close()" />
        </aside>
      }
    </div>
  `,
  styles: `
    .subscribers { display: grid; gap: 12px; min-width: 0; }
    .subscribers__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
    .subscribers__toolbar .bm-search-box { flex: 1 1 240px; max-width: 360px; }
    .subscribers__table { overflow: hidden; border: 1px solid var(--bm-border); border-radius: var(--bm-radius-lg); background: var(--bm-surface); box-shadow: var(--bm-shadow-xs); }
    .subscribers__person { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .subscribers__person > span { display: grid; gap: 1px; min-width: 0; }
    .subscribers__person strong { font: var(--bm-text-subheading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .subscribers__person > span > span { font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .subscribers__source { display: inline-flex; align-items: center; gap: 6px; font: var(--bm-text-small); color: var(--bm-text-2); white-space: nowrap; }
    .subscribers__source svg { color: var(--bm-text-3); }
    .subscribers__muted { font: var(--bm-text-small); color: var(--bm-text-3); white-space: nowrap; }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListSubscribers {
  readonly list = input.required<MailingList>();
  readonly q = input<string>();
  readonly status = input<SubscriptionStatus>();
  readonly page = input<string>();
  readonly selected = input<string>();

  private readonly api = inject(MailingApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly actions = inject(ListActions);
  protected readonly sessions = inject(SessionStore);

  protected readonly statusInfo = SUBSCRIPTION_STATUS;
  protected readonly sources = SUBSCRIPTION_SOURCE;
  protected readonly name = subscriberName;

  protected readonly rows = injectQuery(() => {
    const listId = this.list().id;
    const query = { q: this.q()?.trim() || undefined, status: this.status() || undefined };
    const request = { page: Math.max(0, Number(this.page() ?? 0) || 0), size: PAGE_SIZE, sort: { field: 'createdAt', direction: 'desc' as const } };
    return {
      queryKey: keys.mailing.subscribers(listId, query, request),
      queryFn: () => this.api.subscribers(listId, query, request),
      placeholderData: keepPreviousData,
    };
  });

  protected readonly filters = computed<SegmentOption<StatusFilter>[]>(() => {
    const audience = this.list().audience;
    return [
      { value: 'ALL', label: 'Everyone', count: audience.total },
      { value: 'SUBSCRIBED', label: SUBSCRIPTION_STATUS.SUBSCRIBED.label, count: audience.subscribed },
      { value: 'PENDING', label: SUBSCRIPTION_STATUS.PENDING.label, count: audience.pending },
      { value: 'UNSUBSCRIBED', label: SUBSCRIPTION_STATUS.UNSUBSCRIBED.label, count: audience.unsubscribed },
    ];
  });

  protected readonly rowKey = (subscriber: Subscriber) => subscriber.id;

  /** The row as the template sees it, typed, since `let-row` is not. */
  protected presented(row: Subscriber): Subscriber {
    return row;
  }

  protected since(subscriber: Subscriber): string {
    if (subscriber.status === 'UNSUBSCRIBED' && subscriber.unsubscribedAt) return `Left ${relativeClause(subscriber.unsubscribedAt)}`;
    return relativeTime(subscriber.subscribedAt ?? subscriber.createdAt);
  }

  protected filter(status: StatusFilter): void {
    this.navigate({ status: status === 'ALL' ? null : status, page: null });
  }

  protected search(text: string): void {
    this.navigate({ q: text || null, page: null });
  }

  protected goToPage(page: number): void {
    this.navigate({ page: page || null });
  }

  protected open(subscriber: Subscriber): void {
    this.navigate({ subscriber: subscriber.id });
  }

  protected close(): void {
    this.navigate({ subscriber: null });
  }

  protected export(): void {
    void this.actions.export(this.list(), this.status());
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
