import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { ApiError } from '../../core/api/api-error';
import { RegistrationsApi } from '../../core/api/registrations.api';
import { Registration, RegistrationStatus } from '../../core/api/registry.models';
import { keys } from '../../core/query/keys';
import { copyToClipboard } from '../../core/ui/files';
import { dateTime, relativeTime } from '../../core/ui/format';
import { MapMode } from '../../core/ui/preferences';
import { GeoCanvas } from '../../shared/map/geo-canvas';
import { ZOOM, formatPosition, toPosition } from '../../shared/map/geo';
import { Button } from '../../ui/button/button';
import { CopyButton, Property } from '../../ui/data/properties';
import { EmptyState, ErrorState, MessageStrip, Skeleton } from '../../ui/feedback/feedback';
import { Icon } from '../../ui/icon/icon';
import { Panel } from '../../ui/layout/page';
import { PageHeader } from '../../ui/layout/page';
import { StatusBadge } from '../../ui/status/status-badge';
import { REGISTRATION_STATUS } from '../../ui/status/status-tones';
import { ACTIONS, RegistrationAction, RegistrationActions } from './registration-actions';
import { StatusTimeline } from './status-timeline';

/** The lifecycle as a path: where a registration has been and where it can still go. */
const JOURNEY: ReadonlyArray<{ status: RegistrationStatus; label: string }> = [
  { status: 'DRAFT', label: 'Draft' },
  { status: 'SUBMITTED', label: 'In review' },
  { status: 'VERIFIED', label: 'Verified' },
  { status: 'ARCHIVED', label: 'Archived' },
];

/**
 * One registration, as an object page: the place on the map and in Street View, every recorded
 * detail grouped as the survey form groups it, and the review — its history and the actions the
 * person may take now.
 */
@Component({
  selector: 'bm-registry-detail',
  imports: [
    RouterLink,
    Icon,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    PageHeader,
    Panel,
    Property,
    CopyButton,
    Button,
    StatusBadge,
    StatusTimeline,
    GeoCanvas,
    MessageStrip,
    ErrorState,
    EmptyState,
    Skeleton,
  ],
  templateUrl: './registry-detail.html',
  styleUrl: './registry-detail.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistryDetail {
  readonly id = input.required<string>();

  private readonly registrations = inject(RegistrationsApi);
  private readonly actions = inject(RegistrationActions);

  protected readonly statusInfo = REGISTRATION_STATUS;
  protected readonly meta = ACTIONS;
  protected readonly journey = JOURNEY;
  protected readonly relativeTime = relativeTime;
  protected readonly dateTime = dateTime;
  protected readonly formatPosition = formatPosition;

  protected readonly query = injectQuery(() => ({
    queryKey: keys.registrations.detail(this.id()),
    queryFn: () => this.registrations.findOne(this.id()),
  }));

  protected readonly registration = computed(() => this.query.data());
  protected readonly notFound = computed(() => ApiError.from(this.query.error()).status === 404);

  protected readonly position = computed(() => {
    const registration = this.registration();
    return registration ? toPosition(registration.latitude, registration.longitude) : null;
  });

  protected readonly initialView = computed(() => {
    const position = this.position();
    return position ? { center: position, zoom: ZOOM.asset - 1 } : undefined;
  });

  protected readonly mode = signal<MapMode>('split');
  protected readonly running = signal<RegistrationAction | null>(null);

  protected readonly available = computed(() => {
    const registration = this.registration();
    return registration ? this.actions.available(registration) : [];
  });

  /** The two actions most worth a button; the rest wait in the menu. */
  protected readonly primary = computed(() => {
    const order: RegistrationAction[] = ['verify', 'submit', 'reject', 'edit'];
    return order.filter((action) => this.available().includes(action)).slice(0, 2);
  });

  protected readonly secondary = computed(() => this.available().filter((action) => !this.primary().includes(action)));

  protected readonly crumbs = computed(() => [{ label: 'Registry', link: '/registry' }, { label: this.registration()?.assetName ?? 'Registration' }]);

  protected readonly place = computed(() => {
    const r = this.registration();
    if (!r) return '';
    const street = [r.fullAddress, [r.postalCode, r.municipality].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return `${street} (${r.provinceCode}) · ${r.region}`;
  });

  /** How far along the path the registration is; a rejection sits on the review step. */
  protected journeyIndex(status: RegistrationStatus): number {
    return status === 'REJECTED' ? 1 : JOURNEY.findIndex((step) => step.status === status);
  }

  protected async run(action: RegistrationAction): Promise<void> {
    const registration = this.registration();
    if (!registration || this.running()) return;
    this.running.set(action);
    try {
      await this.actions.run(action, registration);
    } finally {
      this.running.set(null);
    }
  }

  protected copyLink(): void {
    void copyToClipboard(location.href, 'Link copied');
  }

  protected openInGoogleMaps(registration: Registration): void {
    const position = this.position();
    const query = position ? `${position.lat},${position.lng}` : encodeURIComponent(`${registration.fullAddress}, ${registration.municipality}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener');
  }
}
