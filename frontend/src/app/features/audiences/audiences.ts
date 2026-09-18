import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, input, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { injectQuery, keepPreviousData } from '@tanstack/angular-query-experimental';

import { MailingApi } from '../../core/api/mailing.api';
import { MailingList, MailingListStatus, MailingOverview } from '../../core/api/mailing.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { formatNumber, formatPercent, relativeClause } from '../../core/ui/format';
import { Button } from '../../ui/button/button';
import { CountUp } from '../../ui/charts/count-up';
import { MeterSegment, StackedMeter } from '../../ui/charts/stacked-meter';
import { StatTile } from '../../ui/charts/stat-tile';
import { Paginator } from '../../ui/data/paginator';
import { EmptyState, ErrorState, Skeleton } from '../../ui/feedback/feedback';
import { SearchBox } from '../../ui/form/search-box';
import { Segmented, SegmentOption } from '../../ui/form/segmented';
import { Icon } from '../../ui/icon/icon';
import { Spotlight } from '../../ui/interaction/spotlight';
import { PageHeader, Panel } from '../../ui/layout/page';
import { Dialogs } from '../../ui/overlay/dialog';
import { StatusBadge } from '../../ui/status/status-badge';
import { CAMPAIGN_STATUS, DELIVERY_STATUS } from '../../ui/status/status-tones';
import { ListDialog } from './audience-dialogs';
import { GrowthChart } from './growth-chart';

const PAGE_SIZE = 12;

/**
 * Every audience at a glance: how many people are reachable, how that changed this month, what is
 * being sent, and each list as a card that opens its workspace.
 */
@Component({
  selector: 'bm-audiences',
  imports: [
    RouterLink,
    Icon,
    PageHeader,
    Panel,
    StatTile,
    StackedMeter,
    GrowthChart,
    SearchBox,
    Segmented,
    Paginator,
    Button,
    CountUp,
    StatusBadge,
    EmptyState,
    ErrorState,
    Skeleton,
    Spotlight,
  ],
  templateUrl: './audiences.html',
  styleUrl: './audiences.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Audiences {
  readonly q = input<string>();
  readonly status = input<MailingListStatus>();
  readonly page = input<string>();
  /** `?create=1` from the command palette opens the new-list dialog straight away. */
  readonly create = input<string>();

  private readonly api = inject(MailingApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogs = inject(Dialogs);
  protected readonly sessions = inject(SessionStore);

  protected readonly formatNumber = formatNumber;
  protected readonly relativeClause = relativeClause;

  protected readonly overview = injectQuery(() => ({ queryKey: keys.mailing.overview, queryFn: () => this.api.overview() }));

  protected readonly shown = computed<MailingListStatus>(() => this.status() ?? 'ACTIVE');

  protected readonly lists = injectQuery(() => {
    const query = { q: this.q()?.trim() || undefined, status: this.shown() };
    const request = { page: Math.max(0, Number(this.page() ?? 0) || 0), size: PAGE_SIZE, sort: { field: 'createdAt', direction: 'desc' as const } };
    return {
      queryKey: keys.mailing.lists(query, request),
      queryFn: () => this.api.lists(query, request),
      placeholderData: keepPreviousData,
    };
  });

  protected readonly statusOptions = computed<SegmentOption<MailingListStatus>[]>(() => [
    { value: 'ACTIVE', label: 'Active', icon: 'megaphone', count: this.overview.data()?.activeLists ?? null },
    { value: 'ARCHIVED', label: 'Archived', icon: 'archive', count: this.overview.data()?.archivedLists ?? null },
  ]);

  protected readonly subtitle = computed(() => {
    const data = this.overview.data();
    if (!data) return 'Mailing lists, the people on them, and what is sent to them.';
    return `${formatNumber(data.activeLists)} active ${data.activeLists === 1 ? 'list' : 'lists'} reaching ${formatNumber(data.uniqueSubscribers)} ${data.uniqueSubscribers === 1 ? 'person' : 'people'}.`;
  });

  protected readonly monthDelta = computed(() => {
    const growth = this.overview.data()?.growth;
    return growth ? growth.reduce((sum, point) => sum + point.subscribed - point.unsubscribed, 0) : null;
  });

  protected readonly deliveryRate = computed(() => {
    const deliveries = this.overview.data()?.deliveries;
    if (!deliveries) return null;
    const settled = deliveries.sent + deliveries.failed;
    return settled ? deliveries.sent / settled : null;
  });

  protected readonly campaignSegments = computed<MeterSegment[]>(() => {
    const campaigns = this.overview.data()?.campaigns;
    if (!campaigns) return [];
    return [
      { key: 'DRAFT', label: 'Drafts', value: campaigns.drafts, tone: CAMPAIGN_STATUS.DRAFT.tone, icon: CAMPAIGN_STATUS.DRAFT.icon },
      { key: 'SCHEDULED', label: CAMPAIGN_STATUS.SCHEDULED.label, value: campaigns.scheduled, tone: CAMPAIGN_STATUS.SCHEDULED.tone, icon: CAMPAIGN_STATUS.SCHEDULED.icon },
      { key: 'SENDING', label: CAMPAIGN_STATUS.SENDING.label, value: campaigns.sending, tone: CAMPAIGN_STATUS.SENDING.tone, icon: CAMPAIGN_STATUS.SENDING.icon },
      { key: 'SENT', label: CAMPAIGN_STATUS.SENT.label, value: campaigns.sent, tone: CAMPAIGN_STATUS.SENT.tone, icon: CAMPAIGN_STATUS.SENT.icon },
      { key: 'CANCELLED', label: CAMPAIGN_STATUS.CANCELLED.label, value: campaigns.cancelled, tone: CAMPAIGN_STATUS.CANCELLED.tone, icon: CAMPAIGN_STATUS.CANCELLED.icon },
    ];
  });

  protected readonly deliverySegments = computed<MeterSegment[]>(() => {
    const deliveries = this.overview.data()?.deliveries;
    if (!deliveries) return [];
    return (['SENT', 'FAILED', 'QUEUED'] as const).map((status) => ({
      key: status,
      label: DELIVERY_STATUS[status].label,
      value: deliveries[status.toLowerCase() as 'sent' | 'failed' | 'queued'],
      tone: DELIVERY_STATUS[status].tone,
      icon: DELIVERY_STATUS[status].icon,
    }));
  });

  protected readonly searching = computed(() => !!this.q()?.trim());

  constructor() {
    effect(() => {
      if (this.create() && this.sessions.can('mailing:write')) untracked(() => this.newList());
    });
  }

  protected formatRate(value: number): string {
    return formatPercent(value, value >= 0.995 ? 0 : 1);
  }

  protected rateCaption(data: MailingOverview): string {
    const failed = data.deliveries.failed;
    return failed ? `${formatNumber(failed)} failed in the last 30 days` : 'Nothing failed in the last 30 days';
  }

  protected filter(status: MailingListStatus): void {
    this.navigate({ status: status === 'ACTIVE' ? null : status, page: null });
  }

  protected search(text: string): void {
    this.navigate({ q: text || null, page: null });
  }

  protected goToPage(page: number): void {
    this.navigate({ page: page || null });
  }

  protected newList(): void {
    const ref = this.dialogs.open<MailingList>(ListDialog, { width: '540px', maxWidth: 'calc(100vw - 24px)' });
    ref.closed.subscribe((list) => {
      if (this.create()) this.navigate({ create: null });
      if (list) void this.router.navigate(['/audiences', list.id]);
    });
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
