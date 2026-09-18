import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { format } from 'date-fns';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { PlatformApi } from '../../core/api/platform.api';
import { RegistrationsApi } from '../../core/api/registrations.api';
import { Registration, RegistrationStatus } from '../../core/api/registry.models';
import { UsersApi } from '../../core/api/users.api';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { relativeTime } from '../../core/ui/format';
import { Haptics } from '../../core/ui/haptics';
import { Button } from '../../ui/button/button';
import { BarList } from '../../ui/charts/bar-list';
import { StackedMeter } from '../../ui/charts/stacked-meter';
import { StatTile } from '../../ui/charts/stat-tile';
import { EmptyState, ErrorState, Skeleton } from '../../ui/feedback/feedback';
import { Icon } from '../../ui/icon/icon';
import { Ripple } from '../../ui/interaction/ripple';
import { Spotlight } from '../../ui/interaction/spotlight';
import { Panel } from '../../ui/layout/page';
import { Confirm } from '../../ui/overlay/confirm-dialog';
import { StatusBadge } from '../../ui/status/status-badge';
import { REGISTRATION_STATUS } from '../../ui/status/status-tones';
import { Tooltip } from '../../ui/tooltip/tooltip';
import { STATUS_ORDER, injectRegistrationCounts } from '../registry/registration-counts';

/**
 * The first screen after sign-in answers one question: what needs me today? A surveyor sees their
 * own work and what came back rejected; a manager sees the review queue and how the registry
 * stands; an administrator also sees people and the services.
 */
@Component({
  selector: 'bm-home',
  imports: [
    RouterLink,
    Icon,
    Button,
    StatTile,
    StackedMeter,
    BarList,
    Panel,
    StatusBadge,
    Skeleton,
    EmptyState,
    ErrorState,
    Ripple,
    Spotlight,
    Tooltip,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly sessions = inject(SessionStore);
  private readonly registrations = inject(RegistrationsApi);
  private readonly users = inject(UsersApi);
  private readonly platform = inject(PlatformApi);
  private readonly queries = inject(QueryClient);
  private readonly confirm = inject(Confirm);
  private readonly haptics = inject(Haptics);
  private readonly router = inject(Router);

  protected readonly status = REGISTRATION_STATUS;
  protected readonly relativeTime = relativeTime;

  protected readonly seesEverything = computed(() => this.sessions.can('registration:read-all'));
  protected readonly canWrite = computed(() => this.sessions.can('registration:write'));

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const part = hour < 5 ? 'Good evening' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return `${part}, ${this.sessions.user()?.firstName ?? 'there'}`;
  });

  protected readonly today = format(new Date(), 'EEEE d MMMM');

  protected readonly counts = injectRegistrationCounts();

  protected readonly attention = injectQuery(() => ({
    queryKey: [...keys.registrations.all, 'attention', this.seesEverything()],
    queryFn: () =>
      this.seesEverything()
        ? this.registrations.search({ status: 'SUBMITTED' }, { page: 0, size: 6, sort: { field: 'submittedAt', direction: 'asc' } })
        : this.registrations.search({ status: 'REJECTED' }, { page: 0, size: 6, sort: { field: 'updatedAt', direction: 'desc' } }),
  }));

  protected readonly drafts = injectQuery(() => ({
    queryKey: [...keys.registrations.all, 'drafts'],
    queryFn: () => this.registrations.search({ status: 'DRAFT' }, { page: 0, size: 4, sort: { field: 'updatedAt', direction: 'desc' } }),
    enabled: !this.seesEverything(),
  }));

  protected readonly recent = injectQuery(() => ({
    queryKey: [...keys.registrations.all, 'recent'],
    queryFn: () => this.registrations.search({}, { page: 0, size: 6, sort: { field: 'updatedAt', direction: 'desc' } }),
  }));

  protected readonly people = injectQuery(() => ({
    queryKey: keys.users.statistics,
    queryFn: () => this.users.statistics(),
    enabled: this.sessions.can('user:read'),
  }));

  protected readonly services = injectQuery(() => ({
    queryKey: ['platform', 'home-status'],
    queryFn: async () => {
      const [iam, core] = await Promise.allSettled([this.platform.runtime('iam'), this.platform.runtime('core')]);
      return {
        iam: iam.status === 'fulfilled' ? iam.value.status : 'DOWN',
        core: core.status === 'fulfilled' ? core.value.status : 'DOWN',
      };
    },
    enabled: this.sessions.isAtLeast('MANAGER'),
    refetchInterval: 30_000,
  }));

  protected readonly segments = computed(() => {
    const counts = this.counts.data();
    return STATUS_ORDER.map((key) => ({
      key,
      label: REGISTRATION_STATUS[key].label,
      value: counts?.[key] ?? 0,
      tone: REGISTRATION_STATUS[key].tone,
      icon: REGISTRATION_STATUS[key].icon,
    }));
  });

  protected readonly regions = computed(() =>
    Object.entries(this.counts.data()?.topRegions ?? {}).map(([label, value]) => ({ key: label, label, value })),
  );

  protected readonly summary = computed(() => {
    const counts = this.counts.data();
    if (!counts) return '';
    if (this.seesEverything()) {
      const waiting = counts.SUBMITTED;
      return waiting === 0 ? 'The review queue is empty.' : `${waiting} registration${waiting === 1 ? ' is' : 's are'} waiting for review.`;
    }
    const rejected = counts.REJECTED;
    const drafts = counts.DRAFT;
    if (rejected) return `${rejected} of your registrations came back with notes.`;
    if (drafts) return `You have ${drafts} draft${drafts === 1 ? '' : 's'} to finish.`;
    return 'Nothing is waiting on you.';
  });

  private readonly review = injectMutation(() => ({
    mutationFn: ({ id, status, note }: { id: string; status: RegistrationStatus; note?: string }) =>
      this.registrations.changeStatus(id, { status, note }),
    onSuccess: (registration: Registration) => {
      this.haptics.success();
      toast.success(registration.status === 'VERIFIED' ? 'Registration verified' : 'Sent back to the surveyor', {
        description: registration.assetName,
      });
      void this.queries.invalidateQueries({ queryKey: keys.registrations.all });
    },
    onError: (error: unknown) => {
      this.haptics.warning();
      toast.error('The review could not be saved', { description: ApiError.from(error).message });
    },
  }));

  protected isReviewing(id: string): boolean {
    return this.review.isPending() && this.review.variables()?.id === id;
  }

  protected verify(registration: Registration, event: Event): void {
    event.stopPropagation();
    this.review.mutate({ id: registration.id, status: 'VERIFIED' });
  }

  protected async reject(registration: Registration, event: Event): Promise<void> {
    event.stopPropagation();
    const answer = await this.confirm.ask({
      title: 'Send it back?',
      message: `${registration.assetName} returns to ${registration.createdBy} with your note, and can be corrected and resubmitted.`,
      confirmLabel: 'Send back',
      tone: 'danger',
      icon: 'undo-2',
      reason: { label: 'What needs fixing', placeholder: 'The cadastral reference points at the wrong parcel…', required: true },
    });
    if (answer.confirmed) this.review.mutate({ id: registration.id, status: 'REJECTED', note: answer.reason });
  }

  protected open(registration: Registration): void {
    void this.router.navigate(['/registry', registration.id]);
  }

  protected filterRegistry(status: string): void {
    void this.router.navigate(['/registry'], { queryParams: { status } });
  }

  protected filterRegion(region: string): void {
    void this.router.navigate(['/registry'], { queryParams: { region } });
  }
}
