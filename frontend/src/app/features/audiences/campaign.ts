import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormField, form, maxLength, readonly, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { QueryClient, injectQuery, keepPreviousData } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { MailingApi } from '../../core/api/mailing.api';
import { Campaign, MERGE_TAGS } from '../../core/api/mailing.models';
import { DeliveryStatus, SentEmail } from '../../core/api/notification.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { dateTime, formatNumber, formatPercent, relativeClause, relativeTime } from '../../core/ui/format';
import { Haptics } from '../../core/ui/haptics';
import { bindShortcuts } from '../../core/ui/shortcuts';
import { Viewport } from '../../core/ui/viewport';
import { Button } from '../../ui/button/button';
import { Column, RowCard, Table } from '../../ui/data/table';
import { Paginator } from '../../ui/data/paginator';
import { Property } from '../../ui/data/properties';
import { Timeline, TimelineMoment } from '../../ui/data/timeline';
import { EmptyState, ErrorState, MessageStrip, Skeleton } from '../../ui/feedback/feedback';
import { Field, Input } from '../../ui/form/field';
import { Segmented, SegmentOption } from '../../ui/form/segmented';
import { Icon } from '../../ui/icon/icon';
import { Crumb, PageHeader, Panel } from '../../ui/layout/page';
import { StatusBadge } from '../../ui/status/status-badge';
import { CAMPAIGN_STATUS, DELIVERY_STATUS } from '../../ui/status/status-tones';
import { Tooltip } from '../../ui/tooltip/tooltip';
import { MailFrame } from '../../shared/mail/mail-frame';
import { applyMergeTags, campaignDocument, isMarkup, mergeValues, unknownTags } from '../../shared/mail/mail-render';
import { CAMPAIGN_ACTIONS, CampaignAction, CampaignActions } from './campaign-actions';
import { Unsaved } from './campaign-guard';
import { STARTERS, Starter } from './campaign-starters';

interface Draft {
  subject: string;
  preheader: string;
  body: string;
}

type EditableField = keyof Draft;
type DeliveryFilter = DeliveryStatus | 'ALL';

const EMPTY: Draft = { subject: '', preheader: '', body: '' };
const DELIVERY_PAGE = 20;

/**
 * One campaign, in the shape its state calls for. A draft or a scheduled campaign is an editor with
 * the email rendered beside it exactly as a subscriber will receive it. Once sending starts it
 * becomes a live report: how far it has got, what failed and why, and every delivery on record.
 */
@Component({
  selector: 'bm-campaign',
  imports: [
    RouterLink,
    FormField,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    Icon,
    PageHeader,
    Panel,
    Button,
    Field,
    Input,
    Segmented,
    StatusBadge,
    MessageStrip,
    EmptyState,
    ErrorState,
    Skeleton,
    Table,
    Column,
    RowCard,
    Paginator,
    Property,
    Timeline,
    Tooltip,
    MailFrame,
  ],
  templateUrl: './campaign.html',
  styleUrl: './campaign.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'warnBeforeUnload($event)' },
})
export class CampaignPage implements Unsaved {
  readonly listId = input.required<string>();
  readonly campaignId = input.required<string>();

  private readonly api = inject(MailingApi);
  private readonly queries = inject(QueryClient);
  private readonly router = inject(Router);
  private readonly actions = inject(CampaignActions);
  private readonly haptics = inject(Haptics);
  protected readonly sessions = inject(SessionStore);
  protected readonly viewport = inject(Viewport);

  protected readonly statusInfo = CAMPAIGN_STATUS;
  protected readonly deliveryStatus = DELIVERY_STATUS;
  protected readonly meta = CAMPAIGN_ACTIONS;
  protected readonly mergeTags = MERGE_TAGS;
  protected readonly starters = STARTERS;
  protected readonly formatNumber = formatNumber;
  protected readonly formatPercent = formatPercent;
  protected readonly dateTime = dateTime;
  protected readonly relativeTime = relativeTime;
  protected readonly relativeClause = relativeClause;

  // ── Data ───────────────────────────────────────────────────────────────────

  protected readonly listQuery = injectQuery(() => ({
    queryKey: keys.mailing.list(this.listId()),
    queryFn: () => this.api.list(this.listId()),
  }));

  protected readonly isNew = computed(() => this.campaignId() === 'new');

  protected readonly query = injectQuery(() => ({
    queryKey: keys.mailing.campaign(this.listId(), this.campaignId()),
    queryFn: () => this.api.campaign(this.listId(), this.campaignId()),
    enabled: !this.isNew(),
    refetchInterval: (query: { state: { data?: Campaign } }) => (query.state.data?.status === 'SENDING' ? 1000 : false),
  }));

  protected readonly list = computed(() => this.listQuery.data());
  protected readonly campaign = computed(() => (this.isNew() ? undefined : this.query.data()));
  protected readonly notFound = computed(() => ApiError.from(this.query.error()).status === 404);

  protected readonly mode = computed<'compose' | 'report' | 'loading'>(() => {
    if (this.isNew()) return 'compose';
    const campaign = this.campaign();
    if (!campaign) return 'loading';
    return campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED' ? 'compose' : 'report';
  });

  protected readonly canWrite = computed(() => this.sessions.can('mailing:write'));
  protected readonly available = computed<CampaignAction[]>(() => {
    const campaign = this.campaign();
    return campaign ? this.actions.available(campaign, this.list()) : [];
  });

  protected readonly crumbs = computed<Crumb[]>(() => [
    { label: 'Audiences', link: '/audiences' },
    { label: this.list()?.name ?? 'List', link: ['/audiences', this.listId()] },
    { label: this.isNew() ? 'New campaign' : this.campaign()?.subject ?? 'Campaign' },
  ]);

  // ── Composer ───────────────────────────────────────────────────────────────

  protected readonly model = signal<Draft>(EMPTY);
  private readonly saved = signal<Draft>(EMPTY);
  private loadedId: string | null = null;

  protected readonly editable = computed(() => this.canWrite() && this.mode() === 'compose' && this.list()?.status === 'ACTIVE');

  protected readonly form = form(this.model, (path) => {
    readonly(path, () => !this.editable());
    required(path.subject, { message: 'Write a subject line.' });
    maxLength(path.subject, 255);
    maxLength(path.preheader, 255);
    required(path.body, { message: 'The email needs something to say.' });
    maxLength(path.body, 200_000);
  });

  protected readonly dirty = computed(() => !sameDraft(this.model(), this.saved()));
  protected readonly saving = signal(false);
  protected readonly running = signal<CampaignAction | null>(null);
  protected readonly pane = signal<'write' | 'preview'>('write');
  protected readonly device = signal<'desktop' | 'phone'>('desktop');
  private focused: EditableField = 'body';

  private readonly bodyArea = viewChild<ElementRef<HTMLTextAreaElement>>('bodyArea');
  private readonly subjectInput = viewChild<ElementRef<HTMLInputElement>>('subjectInput');
  private readonly preheaderInput = viewChild<ElementRef<HTMLInputElement>>('preheaderInput');

  protected readonly paneOptions: SegmentOption<'write' | 'preview'>[] = [
    { value: 'write', label: 'Write', icon: 'pencil' },
    { value: 'preview', label: 'Preview', icon: 'eye' },
  ];

  protected readonly deviceOptions: SegmentOption<'desktop' | 'phone'>[] = [
    { value: 'desktop', label: 'Desktop', icon: 'laptop' },
    { value: 'phone', label: 'Phone', icon: 'smartphone' },
  ];

  protected readonly markup = computed(() => isMarkup(this.model().body));
  protected readonly unknown = computed(() => unknownTags(this.model().subject, this.model().preheader, this.model().body));

  /** The preview follows typing a moment later, so a long body is not rendered on every key. */
  protected readonly previewDraft = signal<Draft>(EMPTY);

  protected readonly recipient = computed(() => {
    const user = this.sessions.user();
    return { email: user?.email ?? 'someone@example.com', firstName: user?.firstName ?? 'Giulia', lastName: user?.lastName ?? 'Rossi' };
  });

  protected readonly previewHtml = computed(() => {
    const draft = this.previewDraft();
    return campaignDocument(
      { subject: draft.subject || 'No subject yet', preheader: draft.preheader, body: draft.body || 'Your message appears here as you write it.', listName: this.list()?.name ?? 'Mailing list' },
      this.recipient(),
    );
  });

  private readonly previewValues = computed(() => mergeValues(this.recipient(), this.list()?.name ?? 'Mailing list'));
  protected readonly inboxSubject = computed(() => applyMergeTags(this.previewDraft().subject, this.previewValues(), false) || 'No subject yet');
  protected readonly inboxPreheader = computed(() => applyMergeTags(this.previewDraft().preheader, this.previewValues(), false) || 'Add preview text to say more before it is opened.');

  protected readonly savedLabel = computed(() => {
    if (this.saving()) return 'Saving…';
    if (this.dirty()) return 'Unsaved changes';
    const campaign = this.campaign();
    return campaign ? `Saved ${relativeClause(campaign.updatedAt)}` : 'Not saved yet';
  });

  // ── Report ─────────────────────────────────────────────────────────────────

  protected readonly deliveryFilter = signal<DeliveryFilter>('ALL');
  protected readonly deliveryPage = signal(0);

  protected readonly deliveries = injectQuery(() => {
    const status = this.deliveryFilter() === 'ALL' ? undefined : (this.deliveryFilter() as DeliveryStatus);
    const request = { page: this.deliveryPage(), size: DELIVERY_PAGE };
    return {
      queryKey: keys.mailing.deliveries(this.listId(), this.campaignId(), status, request),
      queryFn: () => this.api.deliveries(this.listId(), this.campaignId(), status, request),
      enabled: this.mode() === 'report',
      placeholderData: keepPreviousData,
      refetchInterval: this.campaign()?.status === 'SENDING' ? 1500 : (false as const),
    };
  });

  protected readonly deliveryFilters: SegmentOption<DeliveryFilter>[] = [
    { value: 'ALL', label: 'All' },
    { value: 'SENT', label: DELIVERY_STATUS.SENT.label },
    { value: 'FAILED', label: DELIVERY_STATUS.FAILED.label },
    { value: 'QUEUED', label: DELIVERY_STATUS.QUEUED.label },
  ];

  protected readonly progress = computed(() => {
    const campaign = this.campaign();
    if (!campaign) return null;
    const { sent, failed } = campaign.deliveries;
    const total = Math.max(campaign.recipientCount, sent + failed, 1);
    const done = sent + failed;
    const circumference = 2 * Math.PI * 52;
    const elapsedMinutes = campaign.startedAt ? (Date.parse(campaign.completedAt ?? new Date().toISOString()) - Date.parse(campaign.startedAt)) / 60_000 : 0;
    const perMinute = elapsedMinutes > 0.05 ? done / elapsedMinutes : 0;
    const left = Math.max(campaign.recipientCount - done, 0);
    return {
      sent,
      failed,
      left,
      share: done / total,
      sentArc: (sent / total) * circumference,
      failedArc: (failed / total) * circumference,
      circumference,
      perMinute,
      etaMinutes: perMinute > 0 && campaign.status === 'SENDING' ? left / perMinute : null,
      duration: elapsedMinutes,
      successRate: done ? sent / done : null,
    };
  });

  protected readonly story = computed<TimelineMoment[]>(() => {
    const campaign = this.campaign();
    if (!campaign) return [];
    const moments: TimelineMoment[] = [{ key: 'created', icon: 'file-pen', tone: 'neutral', title: 'Written', when: campaign.createdAt, who: campaign.createdBy }];
    if (campaign.startedAt) moments.push({ key: 'started', icon: 'send', tone: 'info', title: 'Sending started', when: campaign.startedAt, who: `To ${formatNumber(campaign.recipientCount)} subscribed people` });
    if (campaign.completedAt) {
      const stopped = campaign.status === 'CANCELLED';
      moments.push({
        key: 'completed',
        icon: stopped ? 'octagon-x' : 'mail-check',
        tone: stopped ? 'negative' : 'positive',
        title: stopped ? 'Stopped by hand' : 'Every message handed over',
        when: campaign.completedAt,
        who: `${formatNumber(campaign.deliveries.sent)} delivered, ${formatNumber(campaign.deliveries.failed)} failed`,
      });
    }
    const ordered = moments.sort((a, b) => (b.when ?? '').localeCompare(a.when ?? ''));
    if (campaign.status === 'SENDING') ordered.unshift({ key: 'next', icon: 'send', tone: 'info', title: 'Sending a few at a time', pending: true });
    return ordered;
  });

  protected readonly deliveryKey = (row: SentEmail) => row.id;

  constructor() {
    const destroyRef = inject(DestroyRef);

    effect(() => {
      const id = this.campaignId();
      const campaign = this.query.data();
      untracked(() => this.adopt(id, campaign));
    });

    effect((onCleanup) => {
      const draft = this.model();
      const timer = setTimeout(() => this.previewDraft.set(draft), untracked(() => this.previewDraft()) === EMPTY ? 0 : 280);
      onCleanup(() => clearTimeout(timer));
    });

    effect(() => {
      this.campaignId();
      untracked(() => {
        this.deliveryFilter.set('ALL');
        this.deliveryPage.set(0);
      });
    });

    const unbind = bindShortcuts({
      '$mod+KeyS': (event) => {
        event.preventDefault();
        if (this.editable()) void this.save();
      },
    });
    destroyRef.onDestroy(unbind);
  }

  hasUnsavedChanges(): boolean {
    return this.editable() && this.dirty();
  }

  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  // ── Writing ────────────────────────────────────────────────────────────────

  protected focus(field: EditableField): void {
    this.focused = field;
  }

  protected insertTag(tag: string): void {
    const element = this.fieldElement(this.focused);
    const current = this.model()[this.focused];
    const start = element?.selectionStart ?? current.length;
    const end = element?.selectionEnd ?? current.length;
    const next = current.slice(0, start) + tag + current.slice(end);
    this.model.update((draft) => ({ ...draft, [this.focused]: next }));
    this.haptics.tap();
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  protected start(starter: Starter): void {
    this.model.update((draft) => ({
      subject: draft.subject || starter.subject,
      preheader: draft.preheader || starter.preheader,
      body: starter.body,
    }));
    this.haptics.tap();
    requestAnimationFrame(() => this.bodyArea()?.nativeElement.focus());
  }

  /** Saves the draft; resolves to the saved campaign, or null when it could not be saved. */
  protected async save(quiet = false): Promise<Campaign | null> {
    if (this.saving()) return null;
    const state = this.form();
    if (state.invalid()) {
      state.markAsTouched();
      this.haptics.warning();
      toast.error('Not saved yet', { description: this.form.subject().invalid() ? 'Write a subject line first.' : 'The email needs something to say.' });
      return null;
    }
    if (!this.isNew() && !this.dirty()) return this.campaign() ?? null;

    this.saving.set(true);
    const draft = this.model();
    const request = { subject: draft.subject.trim(), preheader: draft.preheader.trim() || undefined, body: draft.body };
    try {
      const listId = this.listId();
      const saved = this.isNew() ? await this.api.createCampaign(listId, request) : await this.api.updateCampaign(listId, this.campaignId(), request);
      this.saved.set(toDraft(saved));
      this.queries.setQueryData(keys.mailing.campaign(listId, saved.id), saved);
      void this.queries.invalidateQueries({ queryKey: keys.mailing.all, predicate: (query) => query.queryKey[1] !== 'campaign' });
      if (!quiet) {
        this.haptics.success();
        toast.success(this.isNew() ? 'Draft saved' : 'Changes saved', { description: saved.subject });
      }
      if (this.isNew()) {
        this.loadedId = saved.id;
        await this.router.navigate(['/audiences', listId, 'campaigns', saved.id], { replaceUrl: true });
      }
      return saved;
    } catch (error) {
      this.haptics.warning();
      toast.error('The draft was not saved', { description: ApiError.from(error).message });
      return null;
    } finally {
      this.saving.set(false);
    }
  }

  protected async run(action: CampaignAction): Promise<void> {
    const list = this.list();
    if (!list || this.running()) return;
    this.running.set(action);
    try {
      // Tests, schedules and sends use the saved version, so unsaved edits are saved first.
      let campaign = this.campaign();
      if (['send', 'schedule', 'test'].includes(action) && (this.dirty() || !campaign)) {
        campaign = (await this.save(true)) ?? undefined;
      }
      if (!campaign) return;
      const result = await this.actions.run(action, campaign, list);
      if (result === 'deleted') {
        this.saved.set(this.model());
        await this.router.navigate(['/audiences', list.id], { queryParams: { tab: 'campaigns' } });
      } else if (action === 'duplicate' && result) {
        await this.router.navigate(['/audiences', list.id, 'campaigns', result.id]);
      }
    } finally {
      this.running.set(null);
    }
  }

  // ── Report ─────────────────────────────────────────────────────────────────

  protected filterDeliveries(filter: DeliveryFilter): void {
    this.deliveryFilter.set(filter);
    this.deliveryPage.set(0);
  }

  protected openDelivery(row: SentEmail): void {
    if (this.sessions.isAtLeast('MANAGER')) void this.router.navigate(['/mail', row.id]);
  }

  protected presented(row: SentEmail): SentEmail {
    return row;
  }

  protected minutes(value: number): string {
    if (value < 1) return 'under a minute';
    if (value < 90) return `${Math.round(value)} ${Math.round(value) === 1 ? 'minute' : 'minutes'}`;
    return `${(value / 60).toFixed(1)} hours`;
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /** Takes the server's version of the campaign into the editor, without trampling edits. */
  private adopt(id: string, campaign: Campaign | undefined): void {
    if (id === 'new') {
      if (this.loadedId !== 'new') {
        this.loadedId = 'new';
        this.model.set(EMPTY);
        this.saved.set(EMPTY);
      }
      return;
    }
    if (!campaign || campaign.id !== id) return;
    const incoming = toDraft(campaign);
    if (this.loadedId !== id) {
      this.loadedId = id;
      this.model.set(incoming);
      this.saved.set(incoming);
    } else if (!this.dirty() && !this.saving() && !sameDraft(incoming, this.saved())) {
      this.model.set(incoming);
      this.saved.set(incoming);
    }
  }

  private fieldElement(field: EditableField): HTMLInputElement | HTMLTextAreaElement | undefined {
    return (field === 'body' ? this.bodyArea() : field === 'subject' ? this.subjectInput() : this.preheaderInput())?.nativeElement;
  }
}

function toDraft(campaign: Campaign): Draft {
  return { subject: campaign.subject, preheader: campaign.preheader ?? '', body: campaign.body };
}

function sameDraft(a: Draft, b: Draft): boolean {
  return a.subject.trim() === b.subject.trim() && a.preheader.trim() === b.preheader.trim() && a.body === b.body;
}
