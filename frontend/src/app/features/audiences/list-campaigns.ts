import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { injectQuery, keepPreviousData } from '@tanstack/angular-query-experimental';

import { MailingApi } from '../../core/api/mailing.api';
import { Campaign, CampaignStatus, MailingList } from '../../core/api/mailing.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { formatNumber } from '../../core/ui/format';
import { Button } from '../../ui/button/button';
import { Paginator } from '../../ui/data/paginator';
import { EmptyState, ErrorState, Skeleton } from '../../ui/feedback/feedback';
import { Segmented, SegmentOption } from '../../ui/form/segmented';
import { Icon } from '../../ui/icon/icon';
import { StatusBadge } from '../../ui/status/status-badge';
import { CAMPAIGN_STATUS } from '../../ui/status/status-tones';
import { campaignSummary } from './audience-presentation';

const PAGE_SIZE = 10;

type StatusFilter = CampaignStatus | 'ALL';

/**
 * Every campaign written for a list, newest first. Each row says where the campaign stands in
 * words and, once it has started, how far it got; the page refreshes itself while one is sending.
 */
@Component({
  selector: 'bm-list-campaigns',
  imports: [RouterLink, Icon, Button, Paginator, Segmented, StatusBadge, EmptyState, ErrorState, Skeleton],
  template: `
    <div class="campaigns">
      <div class="campaigns__toolbar">
        <bm-segmented size="sm" ariaLabel="Show campaigns" [options]="filters" [value]="status() ?? 'ALL'" (valueChange)="filter($event)" />
        <span class="bm-toolbar__spacer"></span>
        @if (writable()) {
          <a bmButton variant="primary" size="sm" [routerLink]="['/audiences', list().id, 'campaigns', 'new']">
            <svg lucideIcon="plus"></svg>
            New campaign
          </a>
        }
      </div>

      @if (rows.isError()) {
        <bm-error-state [error]="rows.error()" (retry)="rows.refetch()" />
      } @else if (rows.isPending()) {
        <div class="campaigns__list">
          @for (placeholder of [0, 1, 2]; track placeholder) {
            <div class="campaigns__row is-placeholder">
              <bm-skeleton width="40px" height="40px" />
              <div class="campaigns__placeholder-text">
                <bm-skeleton width="50%" height="16px" />
                <bm-skeleton width="75%" height="12px" />
              </div>
            </div>
          }
        </div>
      } @else if (rows.data()?.content?.length) {
        <div class="campaigns__list" [class.is-refreshing]="rows.isPlaceholderData()">
          @for (campaign of rows.data()!.content; track campaign.id; let i = $index) {
            <a class="campaigns__row" [routerLink]="['/audiences', list().id, 'campaigns', campaign.id]" [style.--bm-i]="i">
              <span class="campaigns__icon" [attr.data-tone]="statusInfo[campaign.status].tone">
                <svg [lucideIcon]="statusInfo[campaign.status].icon" [size]="18"></svg>
              </span>
              <span class="campaigns__text">
                <strong>{{ campaign.subject }}</strong>
                <span class="campaigns__preheader">{{ campaign.preheader || 'No preview text' }}</span>
                <span class="campaigns__summary">{{ summary(campaign) }}</span>
              </span>
              <span class="campaigns__side">
                <bm-status size="sm" [label]="statusInfo[campaign.status].label" [tone]="statusInfo[campaign.status].tone" [live]="campaign.status === 'SENDING'" />
                @if (started(campaign)) {
                  <span class="campaigns__delivery">
                    <span class="campaigns__bar" [class.is-live]="campaign.status === 'SENDING'" aria-hidden="true">
                      <span class="is-sent" [style.flex-grow]="campaign.deliveries.sent"></span>
                      <span class="is-failed" [style.flex-grow]="campaign.deliveries.failed"></span>
                      <span class="is-left" [style.flex-grow]="remaining(campaign)"></span>
                    </span>
                    <span class="campaigns__figures">
                      <strong>{{ formatNumber(campaign.deliveries.sent) }}</strong> delivered
                      @if (campaign.deliveries.failed) {
                        · <strong class="is-failed-text">{{ formatNumber(campaign.deliveries.failed) }}</strong> failed
                      }
                    </span>
                  </span>
                }
              </span>
              <svg class="campaigns__go" lucideIcon="chevron-right" [size]="18" aria-hidden="true"></svg>
            </a>
          }
        </div>
        @if ((rows.data()?.totalPages ?? 0) > 1) {
          <bm-paginator class="campaigns__paginator" [page]="rows.data()" [sizes]="[]" (pageChange)="goToPage($event)" />
        }
      } @else if (status()) {
        <bm-empty-state icon="scan-search" title="No campaign in this state" description="Show every campaign to see the rest." compact />
      } @else {
        <bm-empty-state icon="send" title="No campaigns yet" description="Write one, send a test to yourself, then send it or schedule it for later.">
          @if (writable()) {
            <a bmButton variant="primary" [routerLink]="['/audiences', list().id, 'campaigns', 'new']">
              <svg lucideIcon="plus"></svg>
              Write the first campaign
            </a>
          }
        </bm-empty-state>
      }
    </div>
  `,
  styles: `
    .campaigns { display: grid; gap: 12px; }
    .campaigns__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
    .campaigns__list { display: grid; gap: 8px; transition: opacity var(--bm-duration-base) var(--bm-ease-standard); }
    .campaigns__list.is-refreshing { opacity: 0.6; }
    .campaigns__row {
      display: grid; grid-template-columns: auto minmax(0, 1fr) minmax(180px, auto) auto; align-items: center; gap: 14px; padding: 14px 16px;
      border: 1px solid var(--bm-border); border-radius: var(--bm-radius-lg); background: var(--bm-surface); box-shadow: var(--bm-shadow-xs);
      color: inherit; text-decoration: none;
      animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) both; animation-delay: calc(var(--bm-i, 0) * 45ms);
      transition: transform var(--bm-duration-base) var(--bm-ease-emphasized), box-shadow var(--bm-duration-base) var(--bm-ease-standard), border-color var(--bm-duration-base) var(--bm-ease-standard);
    }
    @media (hover: hover) and (pointer: fine) {
      .campaigns__row:not(.is-placeholder):hover { transform: translateY(calc(-1px * var(--bm-motion))); border-color: var(--bm-accent-border); box-shadow: var(--bm-shadow-sm); }
      .campaigns__row:hover .campaigns__go { color: var(--bm-accent); transform: translateX(calc(2px * var(--bm-motion))); }
    }
    .campaigns__row:active { transform: scale(0.995); }
    .campaigns__row:focus-visible { outline: none; box-shadow: var(--bm-focus-ring); }
    .campaigns__row.is-placeholder { grid-template-columns: auto minmax(0, 1fr); }
    .campaigns__placeholder-text { display: grid; gap: 8px; }
    .campaigns__icon {
      --tone: var(--bm-neutral); --tone-soft: var(--bm-neutral-soft);
      display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--tone-soft); color: var(--tone);
    }
    .campaigns__icon[data-tone='info'] { --tone: var(--bm-accent); --tone-soft: var(--bm-accent-soft); }
    .campaigns__icon[data-tone='signal'] { --tone: var(--bm-signal); --tone-soft: var(--bm-signal-soft); }
    .campaigns__icon[data-tone='positive'] { --tone: var(--bm-positive); --tone-soft: var(--bm-positive-soft); }
    .campaigns__icon[data-tone='negative'] { --tone: var(--bm-negative); --tone-soft: var(--bm-negative-soft); }
    .campaigns__text { display: grid; gap: 1px; min-width: 0; }
    .campaigns__text strong { font: var(--bm-text-heading); font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .campaigns__preheader { font: var(--bm-text-small); color: var(--bm-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .campaigns__summary { margin-top: 2px; font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); }
    .campaigns__side { display: grid; justify-items: end; gap: 8px; }
    .campaigns__delivery { display: grid; justify-items: end; gap: 4px; width: 180px; }
    .campaigns__bar { display: flex; gap: 2px; width: 100%; height: 6px; overflow: hidden; border-radius: 3px; background: var(--bm-chart-track); }
    .campaigns__bar > span { flex-basis: 0; transition: flex-grow var(--bm-duration-slow) var(--bm-ease-emphasized); }
    .campaigns__bar .is-sent { background: var(--bm-positive); }
    .campaigns__bar .is-failed { background: var(--bm-negative); }
    .campaigns__bar .is-left { background: transparent; }
    .campaigns__bar.is-live .is-sent { background: linear-gradient(90deg, var(--bm-positive), #34b886, var(--bm-positive)); background-size: 200% 100%; animation: bm-shimmer 1.4s linear infinite; }
    .bm-reduced-motion .campaigns__bar.is-live .is-sent { animation: none; }
    .campaigns__figures { font: var(--bm-text-caption); color: var(--bm-text-3); font-variant-numeric: tabular-nums; }
    .campaigns__figures strong { font-weight: 700; color: var(--bm-text); }
    .campaigns__figures .is-failed-text { color: var(--bm-negative); }
    .campaigns__go { color: var(--bm-text-3); transition: color var(--bm-duration-fast) var(--bm-ease-standard), transform var(--bm-duration-base) var(--bm-ease-emphasized); }
    .campaigns__paginator { border: 1px solid var(--bm-border); border-radius: var(--bm-radius-lg); background: var(--bm-surface); }
    @media (max-width: 904.98px) {
      .campaigns__row { grid-template-columns: auto minmax(0, 1fr) auto; }
      .campaigns__side { grid-column: 2 / 4; justify-items: start; }
      .campaigns__delivery { justify-items: start; width: min(240px, 100%); }
      .campaigns__go { grid-row: 1; grid-column: 3; }
    }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListCampaigns {
  readonly list = input.required<MailingList>();
  readonly status = input<CampaignStatus>();
  readonly page = input<string>();

  private readonly api = inject(MailingApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sessions = inject(SessionStore);

  protected readonly statusInfo = CAMPAIGN_STATUS;
  protected readonly formatNumber = formatNumber;
  protected readonly summary = campaignSummary;

  protected readonly filters: SegmentOption<StatusFilter>[] = [
    { value: 'ALL', label: 'All' },
    { value: 'DRAFT', label: 'Drafts' },
    { value: 'SCHEDULED', label: CAMPAIGN_STATUS.SCHEDULED.label },
    { value: 'SENDING', label: CAMPAIGN_STATUS.SENDING.label },
    { value: 'SENT', label: CAMPAIGN_STATUS.SENT.label },
    { value: 'CANCELLED', label: CAMPAIGN_STATUS.CANCELLED.label },
  ];

  protected readonly writable = computed(() => this.sessions.can('mailing:write') && this.list().status === 'ACTIVE');

  protected readonly rows = injectQuery(() => {
    const listId = this.list().id;
    const status = this.status() || undefined;
    const request = { page: Math.max(0, Number(this.page() ?? 0) || 0), size: PAGE_SIZE, sort: { field: 'createdAt', direction: 'desc' as const } };
    return {
      queryKey: keys.mailing.campaigns(listId, status, request),
      queryFn: () => this.api.campaigns(listId, status, request),
      placeholderData: keepPreviousData,
      refetchInterval: (query: { state: { data?: { content: Campaign[] } } }) => (query.state.data?.content.some((campaign) => campaign.status === 'SENDING') ? 1500 : false),
    };
  });

  protected started(campaign: Campaign): boolean {
    return campaign.status === 'SENDING' || campaign.status === 'SENT' || campaign.status === 'CANCELLED';
  }

  protected remaining(campaign: Campaign): number {
    return Math.max(0, campaign.recipientCount - campaign.deliveries.sent - campaign.deliveries.failed);
  }

  protected filter(status: StatusFilter): void {
    this.navigate({ campaigns: status === 'ALL' ? null : status, page: null });
  }

  protected goToPage(page: number): void {
    this.navigate({ page: page || null });
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
