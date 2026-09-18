import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { ApiError } from '../../core/api/api-error';
import { MailingApi } from '../../core/api/mailing.api';
import { Campaign, CampaignStatus, MailingList, Subscriber, SubscriberImportReport, SubscriptionStatus } from '../../core/api/mailing.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { copyToClipboard } from '../../core/ui/files';
import { formatNumber, shortDate } from '../../core/ui/format';
import { Button } from '../../ui/button/button';
import { StatTile } from '../../ui/charts/stat-tile';
import { EmptyState, ErrorState, MessageStrip, Skeleton } from '../../ui/feedback/feedback';
import { Icon } from '../../ui/icon/icon';
import { Crumb, PageHeader, Panel } from '../../ui/layout/page';
import { TabOption, Tabs } from '../../ui/layout/tabs';
import { Dialogs } from '../../ui/overlay/dialog';
import { StatusBadge } from '../../ui/status/status-badge';
import { CAMPAIGN_STATUS } from '../../ui/status/status-tones';
import { campaignProgress, campaignSummary } from './audience-presentation';
import { SubscriberDialog, SubscriberDialogData } from './audience-dialogs';
import { GrowthChart } from './growth-chart';
import { ImportDialog } from './import-dialog';
import { ListActions } from './list-actions';
import { ListCampaigns } from './list-campaigns';
import { ListSettings } from './list-settings';
import { ListSubscribers } from './list-subscribers';

export type ListTab = 'overview' | 'subscribers' | 'campaigns' | 'settings';

/**
 * One mailing list: an overview of who is on it and what was sent, the subscribers, the campaigns
 * and the settings, each a tab kept in the address so a view can be shared or returned to.
 */
@Component({
  selector: 'bm-list-workspace',
  imports: [
    RouterLink,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    Icon,
    PageHeader,
    Panel,
    Tabs,
    StatTile,
    StatusBadge,
    Button,
    MessageStrip,
    EmptyState,
    ErrorState,
    Skeleton,
    GrowthChart,
    ListSubscribers,
    ListCampaigns,
    ListSettings,
  ],
  templateUrl: './list-workspace.html',
  styleUrl: './list-workspace.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListWorkspace {
  readonly listId = input.required<string>();
  readonly tab = input<ListTab>();
  readonly q = input<string>();
  readonly status = input<SubscriptionStatus>();
  readonly page = input<string>();
  readonly subscriber = input<string>();
  readonly campaignStatus = input<CampaignStatus>(undefined, { alias: 'campaigns' });

  private readonly api = inject(MailingApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogs = inject(Dialogs);
  private readonly actions = inject(ListActions);
  protected readonly sessions = inject(SessionStore);

  protected readonly formatNumber = formatNumber;
  protected readonly shortDate = shortDate;
  protected readonly campaignStatusInfo = CAMPAIGN_STATUS;
  protected readonly campaignSummary = campaignSummary;
  protected readonly campaignProgress = campaignProgress;

  protected readonly query = injectQuery(() => ({
    queryKey: keys.mailing.list(this.listId()),
    queryFn: () => this.api.list(this.listId()),
  }));

  protected readonly current = computed<ListTab>(() => this.tab() ?? 'overview');

  protected readonly growth = injectQuery(() => ({
    queryKey: keys.mailing.growth(this.listId()),
    queryFn: () => this.api.growth(this.listId(), 30),
    enabled: this.current() === 'overview',
  }));

  protected readonly latest = injectQuery(() => {
    const request = { page: 0, size: 4, sort: { field: 'createdAt', direction: 'desc' as const } };
    return {
      queryKey: keys.mailing.campaigns(this.listId(), undefined, request),
      queryFn: () => this.api.campaigns(this.listId(), undefined, request),
      enabled: this.current() === 'overview',
      refetchInterval: (query: { state: { data?: { content: Campaign[] } } }) => (query.state.data?.content.some((campaign) => campaign.status === 'SENDING') ? 2000 : false),
    };
  });

  protected readonly list = computed(() => this.query.data());
  protected readonly notFound = computed(() => ApiError.from(this.query.error()).status === 404);
  protected readonly writable = computed(() => this.sessions.can('mailing:write') && this.list()?.status === 'ACTIVE');

  protected readonly crumbs = computed<Crumb[]>(() => [{ label: 'Audiences', link: '/audiences' }, { label: this.list()?.name ?? 'List' }]);

  protected readonly tabs = computed<TabOption<ListTab>[]>(() => [
    { value: 'overview', label: 'Overview', icon: 'layout-grid' },
    { value: 'subscribers', label: 'Subscribers', icon: 'users-round', count: this.list()?.audience.total ?? null },
    { value: 'campaigns', label: 'Campaigns', icon: 'send', count: this.list()?.campaignCount ?? null },
    { value: 'settings', label: 'Settings', icon: 'settings' },
  ]);

  protected select(tab: ListTab): void {
    this.navigate({ tab: tab === 'overview' ? null : tab, q: null, status: null, page: null, subscriber: null, campaigns: null });
  }

  protected showSubscribers(status: SubscriptionStatus | null): void {
    this.navigate({ tab: 'subscribers', status, q: null, page: null, subscriber: null });
  }

  protected newCampaign(list: MailingList): void {
    void this.router.navigate(['/audiences', list.id, 'campaigns', 'new']);
  }

  protected addSubscriber(list: MailingList): void {
    const ref = this.dialogs.open<Subscriber, SubscriberDialogData>(SubscriberDialog, { data: { list }, width: '540px', maxWidth: 'calc(100vw - 24px)' });
    ref.closed.subscribe((subscriber) => {
      if (subscriber) this.navigate({ tab: 'subscribers', subscriber: subscriber.id, status: null, q: null, page: null });
    });
  }

  protected importSubscribers(list: MailingList): void {
    const ref = this.dialogs.open<SubscriberImportReport>(ImportDialog, { data: { list }, width: '720px', maxWidth: 'calc(100vw - 24px)' });
    ref.closed.subscribe((report) => {
      if (report && report.created + report.updated > 0) this.navigate({ tab: 'subscribers', status: null, q: null, page: null, subscriber: null });
    });
  }

  protected copySignup(list: MailingList): void {
    if (list.signupUrl) void copyToClipboard(list.signupUrl, 'Sign-up link copied');
  }

  protected export(list: MailingList): void {
    void this.actions.export(list);
  }

  protected archive(list: MailingList): void {
    void this.actions.archive(list);
  }

  protected restore(list: MailingList): void {
    void this.actions.restore(list);
  }

  protected async remove(list: MailingList): Promise<void> {
    if (await this.actions.remove(list)) void this.router.navigate(['/audiences'], { queryParams: { status: 'ARCHIVED' } });
  }

  private navigate(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' });
  }
}
