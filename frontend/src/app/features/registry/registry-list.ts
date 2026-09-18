import { CdkMenu, CdkMenuItem, CdkMenuItemCheckbox, CdkMenuTrigger } from '@angular/cdk/menu';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { injectQuery, keepPreviousData } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { Sort } from '../../core/api/common.models';
import { GeoApi } from '../../core/api/geo.api';
import { RegistrationsApi } from '../../core/api/registrations.api';
import { Registration, RegistrationQuery, RegistrationStatus, TableColumn } from '../../core/api/registry.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { saveBlob, today } from '../../core/ui/files';
import { dateTime, formatNumber, relativeTime } from '../../core/ui/format';
import { PreferencesStore } from '../../core/ui/preferences';
import { Viewport } from '../../core/ui/viewport';
import { GeoCanvas } from '../../shared/map/geo-canvas';
import { MapPoint, toPosition } from '../../shared/map/geo';
import { Button } from '../../ui/button/button';
import { Column, RowCard, Table } from '../../ui/data/table';
import { Paginator } from '../../ui/data/paginator';
import { EmptyState, ErrorState, Skeleton } from '../../ui/feedback/feedback';
import { SearchBox } from '../../ui/form/search-box';
import { SegmentOption, Segmented } from '../../ui/form/segmented';
import { Icon } from '../../ui/icon/icon';
import { Spotlight } from '../../ui/interaction/spotlight';
import { PageHeader } from '../../ui/layout/page';
import { StatusBadge } from '../../ui/status/status-badge';
import { REGISTRATION_STATUS } from '../../ui/status/status-tones';
import { Tooltip } from '../../ui/tooltip/tooltip';
import { STATUS_ORDER, injectRegistrationCounts } from './registration-counts';

type Layout = 'table' | 'cards' | 'map';

const TABLE_ID = 'asset-registrations';
const PAGE_SIZE = 25;
const MAP_LIMIT = 500;

/** Which columns stay when the screen narrows: 1 always, 2 from tablets up, 3 on desktops only. */
const PRIORITY: Record<string, 1 | 2 | 3> = { assetName: 1, status: 1, municipality: 1, createdAt: 2, provinceCode: 2 };

/**
 * Every registration the person may see, three ways: a sortable table for working through them,
 * cards with the place from above for recognising them, and the map for seeing where they are.
 * Filters live in the address, so a filtered view can be bookmarked or sent to a colleague.
 */
@Component({
  selector: 'bm-registry-list',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    Icon,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    CdkMenuItemCheckbox,
    PageHeader,
    Button,
    Table,
    Column,
    RowCard,
    Paginator,
    SearchBox,
    Segmented,
    StatusBadge,
    EmptyState,
    ErrorState,
    Skeleton,
    GeoCanvas,
    Spotlight,
    Tooltip,
  ],
  templateUrl: './registry-list.html',
  styleUrl: './registry-list.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistryList {
  // Filters, straight from the query string.
  readonly q = input<string>();
  readonly status = input<RegistrationStatus>();
  readonly region = input<string>();
  /** One municipality, by ISTAT code, as the geography explorer links to it. */
  readonly istat = input<string>();
  readonly view = input<Layout>();
  readonly page = input<string>();
  readonly sort = input<string>();

  private readonly registrations = inject(RegistrationsApi);
  private readonly geo = inject(GeoApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly preferences = inject(PreferencesStore);
  protected readonly sessions = inject(SessionStore);
  protected readonly viewport = inject(Viewport);

  private readonly canvas = viewChild(GeoCanvas);

  protected readonly statusInfo = REGISTRATION_STATUS;
  protected readonly relativeTime = relativeTime;
  protected readonly dateTime = dateTime;

  protected readonly counts = injectRegistrationCounts();

  protected readonly schema = injectQuery(() => ({
    queryKey: keys.registrations.tableSchema,
    queryFn: () => this.registrations.tableSchema(),
    staleTime: Infinity,
  }));

  protected readonly regions = injectQuery(() => ({
    queryKey: keys.geo.regions(''),
    queryFn: () => this.geo.regions('', 30),
    staleTime: Infinity,
  }));

  protected readonly place = injectQuery(() => ({
    queryKey: keys.geo.municipality(this.istat() ?? ''),
    queryFn: () => this.geo.municipality(this.istat()!),
    enabled: !!this.istat(),
    staleTime: Infinity,
  }));

  protected readonly query = computed<RegistrationQuery>(() => ({
    q: this.q()?.trim() || undefined,
    status: this.status() || undefined,
    region: this.region() || undefined,
    istatCode: this.istat() || undefined,
  }));

  protected readonly layout = computed<Layout>(() => this.view() ?? (this.viewport.isHandset() ? 'cards' : 'table'));
  protected readonly pageIndex = computed(() => Math.max(0, Number(this.page() ?? 0) || 0));

  protected readonly sortState = computed<Sort>(() => {
    const [field, direction] = (this.sort() ?? '').split(',');
    if (field) return { field, direction: direction === 'asc' ? 'asc' : 'desc' };
    const schema = this.schema.data();
    return { field: schema?.defaultSort ?? 'createdAt', direction: schema?.defaultDirection ?? 'desc' };
  });

  protected readonly list = injectQuery(() => {
    const request = { page: this.pageIndex(), size: PAGE_SIZE, sort: this.sortState() };
    return {
      queryKey: keys.registrations.list(this.query(), request),
      queryFn: () => this.registrations.search(this.query(), request),
      placeholderData: keepPreviousData,
      enabled: this.layout() !== 'map',
    };
  });

  protected readonly mapped = injectQuery(() => {
    const request = { page: 0, size: MAP_LIMIT, sort: this.sortState() };
    return {
      queryKey: keys.registrations.list(this.query(), request),
      queryFn: () => this.registrations.search(this.query(), request),
      placeholderData: keepPreviousData,
      enabled: this.layout() === 'map',
    };
  });

  protected readonly visibleFields = computed(() => {
    const columns = this.schema.data()?.columns ?? [];
    return new Set(this.preferences.columnsFor(TABLE_ID) ?? columns.filter((column) => column.visibleByDefault).map((column) => column.field));
  });

  protected readonly columns = computed<TableColumn[]>(() => (this.schema.data()?.columns ?? []).filter((column) => this.visibleFields().has(column.field)));

  protected readonly statusOptions = computed<SegmentOption<string>[]>(() => {
    const counts = this.counts.data();
    return [
      { value: '', label: 'All', count: counts?.total ?? null },
      ...STATUS_ORDER.map((status) => ({ value: status, label: REGISTRATION_STATUS[status].label, count: counts?.[status] ?? null })),
    ];
  });

  protected readonly layouts: SegmentOption<Layout>[] = [
    { value: 'table', label: 'Table', icon: 'rows-3' },
    { value: 'cards', label: 'Cards', icon: 'layout-grid' },
    { value: 'map', label: 'Map', icon: 'map' },
  ];

  protected readonly points = computed<MapPoint[]>(() =>
    (this.mapped.data()?.content ?? []).flatMap((registration) => {
      const position = toPosition(registration.latitude, registration.longitude);
      if (!position) return [];
      const presentation = REGISTRATION_STATUS[registration.status];
      return [{ id: registration.id, position, label: registration.assetName, detail: `${presentation.label} · ${registration.municipality}`, tone: presentation.tone }];
    }),
  );

  protected readonly unmapped = computed(() => (this.mapped.data()?.content.length ?? 0) - this.points().length);
  protected readonly selectedPoint = signal<MapPoint | null>(null);
  protected readonly exporting = signal(false);

  protected readonly summary = computed(() => {
    const page = this.layout() === 'map' ? this.mapped.data() : this.list.data();
    if (!page) return 'Loading the registry…';
    const total = page.totalElements;
    const noun = total === 1 ? 'registration' : 'registrations';
    const scope = this.sessions.can('registration:read-all') ? '' : ' of yours';
    return `${formatNumber(total)} ${noun}${scope}${this.hasFilters() ? ' match these filters' : ''}.`;
  });

  protected readonly hasFilters = computed(() => !!(this.q() || this.status() || this.region() || this.istat()));

  constructor() {
    // The map frames whatever the filters leave, each time they change.
    effect(() => {
      const positions = this.points().map((point) => point.position);
      const canvas = this.canvas();
      if (!canvas || !positions.length) return;
      untracked(() => canvas.fitTo(positions, 16));
    });
  }

  // ── Filters ────────────────────────────────────────────────────────────────

  protected setQuery(text: string): void {
    this.navigate({ q: text || null, page: null });
  }

  protected setStatus(status: string): void {
    this.navigate({ status: status || null, page: null });
  }

  protected setRegion(event: Event): void {
    this.navigate({ region: (event.target as HTMLSelectElement).value || null, page: null });
  }

  protected clearPlace(): void {
    this.navigate({ istat: null, page: null });
  }

  protected setView(view: Layout): void {
    this.selectedPoint.set(null);
    this.navigate({ view });
  }

  protected setSort(sort: Sort): void {
    this.navigate({ sort: `${sort.field},${sort.direction}`, page: null });
  }

  protected setPage(page: number): void {
    this.navigate({ page: page || null });
    document.querySelector('.bm-shell__main')?.scrollIntoView({ block: 'start', behavior: this.preferences.reducedMotion() ? 'auto' : 'smooth' });
  }

  protected clearFilters(): void {
    this.navigate({ q: null, status: null, region: null, istat: null, page: null });
  }

  protected toggleColumn(field: string): void {
    const next = new Set(this.visibleFields());
    if (next.has(field)) {
      if (next.size > 2) next.delete(field);
    } else {
      next.add(field);
    }
    const order = (this.schema.data()?.columns ?? []).map((column) => column.field);
    this.preferences.setColumns(TABLE_ID, order.filter((column) => next.has(column)));
  }

  protected resetColumns(): void {
    const defaults = (this.schema.data()?.columns ?? []).filter((column) => column.visibleByDefault).map((column) => column.field);
    this.preferences.setColumns(TABLE_ID, defaults);
  }

  // ── Rows ───────────────────────────────────────────────────────────────────

  protected readonly rowKey = (row: Registration) => row.id;

  protected open(registration: Registration | MapPoint): void {
    void this.router.navigate(['/registry', registration.id]);
  }

  /** Rows reach column templates untyped; this puts the type back for the status cell. */
  protected presentation(row: Registration) {
    return REGISTRATION_STATUS[row.status];
  }

  protected priorityOf(field: string): 1 | 2 | 3 {
    return PRIORITY[field] ?? 3;
  }

  /** A 3×2 patch of satellite tiles around the asset, positioned so the asset is in the middle. */
  protected thumbnail(registration: Registration): { tiles: string[]; x: number; y: number } | null {
    const position = toPosition(registration.latitude, registration.longitude);
    if (!position) return null;
    const zoom = 17;
    const n = 2 ** zoom;
    const x = ((position.lng + 180) / 360) * n;
    const latitude = (position.lat * Math.PI) / 180;
    const y = ((1 - Math.log(Math.tan(latitude) + 1 / Math.cos(latitude)) / Math.PI) / 2) * n;
    const left = Math.floor(x) - 1;
    const top = Math.floor(y - 0.5);
    const tiles: string[] = [];
    for (let row = 0; row < 2; row++) {
      for (let column = 0; column < 3; column++) {
        tiles.push(`https://mt${(row + column) % 4}.google.com/vt/lyrs=y&hl=it&x=${left + column}&y=${top + row}&z=${zoom}`);
      }
    }
    return { tiles, x: (x - left) * 256, y: (y - top) * 256 };
  }

  protected async export(): Promise<void> {
    this.exporting.set(true);
    try {
      const blob = await this.registrations.exportCsv(this.query());
      saveBlob(blob, `bimap-registrations-${today()}.csv`);
      toast.success('Export ready', { description: 'The CSV follows the filters on screen.' });
    } catch (error) {
      toast.error('The export failed', { description: ApiError.from(error).message });
    } finally {
      this.exporting.set(false);
    }
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
