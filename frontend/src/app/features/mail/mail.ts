import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, input, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { injectQuery, keepPreviousData } from '@tanstack/angular-query-experimental';

import { DeliveryStatus, SentEmail, TEMPLATE_LABELS } from '../../core/api/notification.models';
import { NotificationsApi } from '../../core/api/notifications.api';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { formatNumber, relativeTime } from '../../core/ui/format';
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
import { DELIVERY_STATUS } from '../../ui/status/status-tones';
import { ComposerData, ComposerDialog } from './composer-dialog';
import { MailReader } from './mail-reader';

const PAGE_SIZE = 25;

/**
 * The delivery log: every message the platform sent, whether it arrived, and what the mail server
 * said when it did not. Failures are one tap away, and so is the message itself, rendered as sent.
 */
@Component({
  selector: 'bm-mail',
  imports: [Icon, PageHeader, StatTile, SearchBox, Table, Column, RowCard, Paginator, StatusBadge, Button, EmptyState, ErrorState, MailReader],
  template: `
    <div class="bm-page is-wide mail">
      <bm-page-header title="Mail" [subtitle]="subtitle()">
        <div bmActions>
          @if (canSend()) {
            <button type="button" bmButton variant="primary" (click)="compose()">
              <svg lucideIcon="send"></svg>
              Write a message
            </button>
          }
        </div>
      </bm-page-header>

      <section class="mail__kpis bm-grid" aria-label="Messages by delivery status">
        <bm-stat-tile label="Every message" icon="mail" [value]="counts.data()?.all" [loading]="counts.isPending()" selectable [selected]="!status()" (click)="filter(null)" (keydown.enter)="filter(null)" />
        <bm-stat-tile label="Delivered" icon="mail-check" tone="positive" [value]="counts.data()?.sent" [loading]="counts.isPending()" selectable [selected]="status() === 'SENT'" (click)="filter('SENT')" (keydown.enter)="filter('SENT')" />
        <bm-stat-tile label="Failed" icon="mail-x" tone="negative" caption="refused or unreachable" [value]="counts.data()?.failed" [loading]="counts.isPending()" selectable [selected]="status() === 'FAILED'" (click)="filter('FAILED')" (keydown.enter)="filter('FAILED')" />
        <bm-stat-tile label="Waiting to send" icon="clock" tone="critical" [value]="counts.data()?.queued" [loading]="counts.isPending()" selectable [selected]="status() === 'QUEUED'" (click)="filter('QUEUED')" (keydown.enter)="filter('QUEUED')" />
      </section>

      <div class="bm-split" [class.has-detail]="!!id()">
        <div class="mail__list">
          <div class="bm-toolbar">
            <bm-search-box placeholder="Search by recipient" shortcut [value]="recipient() ?? ''" [busy]="list.isFetching() && !list.isPending()" (search)="search($event)" />
          </div>

          @if (list.isError()) {
            <bm-error-state [error]="list.error()" (retry)="list.refetch()" />
          } @else {
            <div class="mail__table">
              <bm-table
                caption="Messages"
                [rows]="list.data()?.content"
                [rowKey]="rowKey"
                [loading]="list.isPending()"
                [refreshing]="list.isPlaceholderData()"
                [selectedKey]="id() ?? null"
                (rowOpen)="open($event)"
              >
                <ng-template bmColumn="subject" header="Message" let-row>
                  <span class="mail__message">
                    <span class="mail__icon" [attr.data-status]="row.status">
                      <svg [lucideIcon]="statusOf(row).icon" [size]="16"></svg>
                    </span>
                    <span class="mail__text">
                      <strong>{{ row.subject }}</strong>
                      <span>{{ row.to }}</span>
                    </span>
                  </span>
                </ng-template>
                <ng-template bmColumn="template" header="Kind" [priority]="2" let-row>
                  <span class="mail__kind">
                    <svg [lucideIcon]="row.template ? 'zap' : 'pencil'" [size]="13"></svg>
                    {{ kind(row) }}
                    @if (row.attachments.length) {
                      <span class="mail__clip" [attr.aria-label]="row.attachments.length + ' attachments'"><svg lucideIcon="paperclip" [size]="13"></svg>{{ row.attachments.length }}</span>
                    }
                  </span>
                </ng-template>
                <ng-template bmColumn="status" header="Status" let-row>
                  <bm-status size="sm" [label]="statusOf(row).label" [tone]="statusOf(row).tone" [live]="row.status === 'QUEUED'" />
                </ng-template>
                <ng-template bmColumn="sentAt" header="When" [priority]="3" let-row>
                  <span class="mail__muted">{{ relativeTime(row.sentAt) }}</span>
                </ng-template>
                <ng-template bmCard let-row>
                  <span class="mail__message">
                    <span class="mail__icon" [attr.data-status]="row.status">
                      <svg [lucideIcon]="statusOf(row).icon" [size]="16"></svg>
                    </span>
                    <span class="mail__text">
                      <strong>{{ row.subject }}</strong>
                      <span>{{ row.to }} · {{ relativeTime(row.sentAt) }}</span>
                    </span>
                  </span>
                </ng-template>
                <div bmEmpty>
                  @if (recipient() || status()) {
                    <bm-empty-state icon="scan-search" title="No message matches" description="Try part of the address, or show every status." compact />
                  } @else {
                    <bm-empty-state icon="inbox" title="Nothing sent yet" description="Activation links, password resets and campaign messages appear here as they go out." compact />
                  }
                </div>
              </bm-table>
              <bm-paginator [page]="list.data()" [sizes]="[]" (pageChange)="goToPage($event)" />
            </div>
          }
        </div>

        @if (id(); as selected) {
          <aside class="bm-split__detail" aria-label="Selected message">
            <bm-mail-reader [id]="selected" (closed)="close()" (resend)="compose($event)" />
          </aside>
        }
      </div>
    </div>
  `,
  styles: `
    .mail__kpis { --bm-grid-min: 190px; }
    .mail__kpis > * { animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) both; }
    .mail__kpis > :nth-child(2) { animation-delay: 50ms; }
    .mail__kpis > :nth-child(3) { animation-delay: 100ms; }
    .mail__kpis > :nth-child(4) { animation-delay: 150ms; }
    .mail__list { display: grid; gap: 12px; min-width: 0; }
    .mail__table { overflow: hidden; border: 1px solid var(--bm-border); border-radius: var(--bm-radius-lg); background: var(--bm-surface); box-shadow: var(--bm-shadow-xs); }
    .mail__message { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .mail__icon {
      display: grid; place-items: center; width: 34px; height: 34px; flex-shrink: 0; border-radius: 10px;
      background: var(--bm-positive-soft); color: var(--bm-positive);
    }
    .mail__icon[data-status='FAILED'] { background: var(--bm-negative-soft); color: var(--bm-negative); }
    .mail__icon[data-status='QUEUED'] { background: var(--bm-critical-soft); color: var(--bm-critical); }
    .mail__text { display: grid; gap: 1px; min-width: 0; }
    .mail__text strong { font: var(--bm-text-subheading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mail__text > span { font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mail__kind { display: inline-flex; align-items: center; gap: 6px; font: var(--bm-text-small); color: var(--bm-text-2); white-space: nowrap; }
    .mail__kind > svg { color: var(--bm-text-3); }
    .mail__clip { display: inline-flex; align-items: center; gap: 2px; margin-left: 4px; padding: 0 6px; height: 20px; border-radius: 999px; background: var(--bm-surface-3); font: var(--bm-text-caption); font-weight: 650; }
    .mail__muted { font: var(--bm-text-small); color: var(--bm-text-3); white-space: nowrap; }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Mail {
  readonly id = input<string>();
  readonly recipient = input<string>();
  readonly status = input<DeliveryStatus>();
  readonly page = input<string>();
  /** `?compose=1` from the command palette opens the composer straight away. */
  readonly compose$ = input<string>(undefined, { alias: 'compose' });

  private readonly api = inject(NotificationsApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogs = inject(Dialogs);
  private readonly sessions = inject(SessionStore);

  protected readonly relativeTime = relativeTime;
  protected readonly canSend = computed(() => this.sessions.isAtLeast('ADMINISTRATOR'));

  protected readonly counts = injectQuery(() => ({
    queryKey: keys.mail.counts,
    queryFn: async () => {
      const one = { page: 0, size: 1 };
      const [all, sent, failed, queued] = await Promise.all([
        this.api.history({}, one),
        this.api.history({ status: 'SENT' }, one),
        this.api.history({ status: 'FAILED' }, one),
        this.api.history({ status: 'QUEUED' }, one),
      ]);
      return { all: all.totalElements, sent: sent.totalElements, failed: failed.totalElements, queued: queued.totalElements };
    },
  }));

  protected readonly list = injectQuery(() => {
    const query = { recipient: this.recipient()?.trim() || undefined, status: this.status() || undefined };
    const request = { page: Math.max(0, Number(this.page() ?? 0) || 0), size: PAGE_SIZE, sort: { field: 'sentAt', direction: 'desc' as const } };
    return {
      queryKey: keys.mail.list(query, request),
      queryFn: () => this.api.history(query, request),
      placeholderData: keepPreviousData,
      refetchInterval: (state: { state: { data?: { content: SentEmail[] } } }) => (state.state.data?.content.some((row) => row.status === 'QUEUED') ? 4000 : false),
    };
  });

  protected readonly subtitle = computed(() => {
    const total = this.list.data()?.totalElements;
    if (total === undefined) return 'Every message the platform sends, and what happened to it.';
    const filtered = !!(this.recipient() || this.status());
    return `${formatNumber(total)} ${total === 1 ? 'message' : 'messages'}${filtered ? ' match' : ' on record'}.`;
  });

  protected readonly rowKey = (row: SentEmail) => row.id;

  constructor() {
    effect(() => {
      if (this.compose$() && this.canSend()) untracked(() => this.compose());
    });
  }

  protected statusOf(row: SentEmail) {
    return DELIVERY_STATUS[row.status];
  }

  protected kind(row: SentEmail): string {
    return row.template ? TEMPLATE_LABELS[row.template] ?? row.template : 'Written by hand';
  }

  protected filter(status: DeliveryStatus | null): void {
    this.navigate({ status, page: null });
  }

  protected search(text: string): void {
    this.navigate({ recipient: text || null, page: null });
  }

  protected goToPage(page: number): void {
    this.navigate({ page: page || null });
  }

  protected open(row: SentEmail): void {
    void this.router.navigate(['/mail', row.id], { queryParamsHandling: 'preserve' });
  }

  protected close(): void {
    void this.router.navigate(['/mail'], { queryParamsHandling: 'preserve' });
  }

  protected compose(draft: ComposerData = {}): void {
    const ref = this.dialogs.open<SentEmail, ComposerData>(ComposerDialog, { data: draft, width: '760px', maxWidth: 'calc(100vw - 24px)' });
    ref.closed.subscribe((sent) => {
      if (this.compose$()) this.navigate({ compose: null });
      if (sent) this.open(sent);
    });
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
