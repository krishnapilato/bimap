import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
import { ActivatedRoute, Router } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { GeoApi } from '../../core/api/geo.api';
import { Address, Municipality, Province, Region } from '../../core/api/geo.models';
import { keys } from '../../core/query/keys';
import { formatCompact, formatNumber } from '../../core/ui/format';
import { Haptics } from '../../core/ui/haptics';
import { Basemap, MapMode, PreferencesStore } from '../../core/ui/preferences';
import { Viewport } from '../../core/ui/viewport';
import { Button } from '../../ui/button/button';
import { EmptyState, ErrorState, Skeleton } from '../../ui/feedback/feedback';
import { Field } from '../../ui/form/field';
import { Lookup, LookupOption, LookupSearch, fold } from '../../ui/form/lookup';
import { Segmented, SegmentOption } from '../../ui/form/segmented';
import { Icon } from '../../ui/icon/icon';
import { Ripple } from '../../ui/interaction/ripple';
import { Sheet, SheetSnap } from '../../ui/overlay/sheet';
import { GeoCanvas } from '../../shared/map/geo-canvas';
import { ITALY, Insets, LatLng, MapPoint, ZOOM, regionView, toPosition } from '../../shared/map/geo';
import { MunicipalityDetail } from './municipality-detail';

type Level = 'italy' | 'region' | 'province' | 'municipality';
type Order = 'name' | 'population';

type Place =
  | { kind: 'region'; region: Region }
  | { kind: 'province'; province: Province }
  | { kind: 'municipality'; municipality: Municipality };

interface Crumb {
  label: string;
  params: Record<string, string | null>;
}

/**
 * Italy as the registry sees it, from the whole country down to one comune: every region, the
 * provinces in it, every comune with its population on the map, and for a comune the codes a
 * registration needs, its streets, postal codes and public bodies. The map follows each step,
 * and each step is in the address, so the back button walks back up.
 */
@Component({
  selector: 'bm-geography',
  imports: [
    NgTemplateOutlet,
    Icon,
    GeoCanvas,
    Sheet,
    Button,
    Field,
    Lookup,
    Segmented,
    Ripple,
    EmptyState,
    ErrorState,
    Skeleton,
    MunicipalityDetail,
  ],
  templateUrl: './geography.html',
  styleUrl: './geography.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-geography bm-bleed' },
})
export class Geography {
  readonly region = input<string>();
  /** Province abbreviation, such as `VA`. */
  readonly province = input<string>();
  readonly istat = input<string>();

  private readonly geo = inject(GeoApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly preferences = inject(PreferencesStore);
  private readonly haptics = inject(Haptics);
  protected readonly viewport = inject(Viewport);

  protected readonly formatNumber = formatNumber;
  protected readonly formatCompact = formatCompact;

  protected readonly canvas = viewChild.required(GeoCanvas);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  /** Always the map first: there is nothing to see in Street View until a street is chosen. */
  protected readonly mode = signal<MapMode>('map');
  protected readonly basemap = signal<Basemap>(this.preferences.basemap());
  protected readonly coverage = signal(false);

  // ── Data ───────────────────────────────────────────────────────────────────

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

  protected readonly level = computed<Level>(() => (this.istat() ? 'municipality' : this.province() ? 'province' : this.region() ? 'region' : 'italy'));

  /** The region and province in force, from the address or, for a comune, from the comune itself. */
  protected readonly regionName = computed(() => this.region() ?? this.place.data()?.region ?? null);
  protected readonly provinceCode = computed(() => this.province() ?? this.place.data()?.provinceCode ?? null);

  protected readonly provinces = injectQuery(() => {
    const region = this.regionName();
    return {
      queryKey: keys.geo.provinces('', region ?? undefined),
      queryFn: () => this.geo.provinces('', region ?? undefined, 200),
      enabled: !!region,
      staleTime: Infinity,
    };
  });

  /** One comune per province, the capital, so each province can be pointed at on the map. */
  protected readonly capitals = injectQuery(() => {
    const region = this.regionName();
    const provinces = this.provinces.data();
    return {
      queryKey: keys.geo.capitals(region ?? ''),
      queryFn: () => Promise.all((provinces ?? []).map((province) => this.capitalOf(province))),
      enabled: this.level() === 'region' && !!provinces?.length,
      staleTime: Infinity,
    };
  });

  protected readonly municipalities = injectQuery(() => {
    const province = this.provinceCode();
    return {
      queryKey: keys.geo.municipalities('', undefined, province ?? undefined, 1000),
      queryFn: () => this.geo.municipalities('', { province: province ?? undefined }, 1000),
      enabled: !!province && this.level() !== 'region',
      staleTime: Infinity,
    };
  });

  protected readonly currentProvince = computed(() => {
    const code = this.provinceCode();
    return this.provinces.data()?.find((province) => province.abbreviation === code) ?? null;
  });

  // ── Lists ──────────────────────────────────────────────────────────────────

  protected readonly query = signal('');
  protected readonly filter = signal('');
  protected readonly order = signal<Order>('name');
  protected readonly orders: SegmentOption<Order>[] = [
    { value: 'name', label: 'A to Z', icon: 'list-filter' },
    { value: 'population', label: 'Largest', icon: 'users' },
  ];

  protected readonly shownMunicipalities = computed(() => {
    const term = fold(this.filter());
    const rows = (this.municipalities.data() ?? []).filter((m) => !term || fold(m.name).includes(term) || m.istatCode.includes(term));
    return this.order() === 'population'
      ? [...rows].sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
      : [...rows].sort((a, b) => a.name.localeCompare(b.name, 'it'));
  });

  protected readonly provincePopulation = computed(() => (this.municipalities.data() ?? []).reduce((sum, m) => sum + (m.population ?? 0), 0));

  // ── Map ────────────────────────────────────────────────────────────────────

  protected readonly street = signal<Address | null>(null);
  protected readonly streetPin = computed<LatLng | null>(() => {
    const address = this.street();
    return address ? toPosition(address.latitude, address.longitude) : null;
  });

  protected readonly points = computed<MapPoint[]>(() => {
    switch (this.level()) {
      case 'italy':
        return (this.regions.data() ?? []).flatMap((region) => {
          const view = regionView(region.name);
          return view ? [{ id: region.name, position: view.center, label: region.name, detail: 'Region', tone: 'info' as const }] : [];
        });
      case 'region':
        return (this.capitals.data() ?? []).flatMap((capital) => {
          const at = capital && toPosition(capital.municipality.latitude, capital.municipality.longitude);
          return at ? [{ id: capital.province.abbreviation, position: at, label: `${capital.province.name} (${capital.province.abbreviation})`, detail: 'Province', tone: 'info' as const }] : [];
        });
      default: {
        const selected = this.istat();
        return (this.municipalities.data() ?? []).flatMap((m) => {
          const at = toPosition(m.latitude, m.longitude);
          if (!at) return [];
          return [
            {
              id: m.istatCode,
              position: at,
              label: m.name,
              detail: m.population != null ? `${formatNumber(m.population)} people` : undefined,
              tone: m.istatCode === selected ? ('signal' as const) : ('info' as const),
            },
          ];
        });
      }
    }
  });

  // ── Layout ─────────────────────────────────────────────────────────────────

  protected readonly panelOpen = signal(true);
  private readonly panelWidth = signal(400);
  protected readonly sheetSnap = signal<SheetSnap>('half');
  private readonly sheetHeight = signal(0);

  protected readonly insets = computed<Insets>(() =>
    this.viewport.isHandset()
      ? { top: 0, right: 0, bottom: this.sheetHeight(), left: 0 }
      : { top: 0, right: 0, bottom: 0, left: this.panelOpen() ? this.panelWidth() + 24 : 0 },
  );

  protected readonly crumbs = computed<Crumb[]>(() => {
    const trail: Crumb[] = [{ label: 'Italy', params: { region: null, province: null, istat: null } }];
    const region = this.regionName();
    if (region) trail.push({ label: region, params: { region, province: null, istat: null } });
    const province = this.provinceCode();
    if (province) trail.push({ label: this.currentProvince()?.name ?? province, params: { region, province, istat: null } });
    const municipality = this.place.data();
    if (this.istat() && municipality) trail.push({ label: municipality.name, params: {} });
    return trail;
  });

  /** Changes whenever the step changes, so the heading can animate in afresh. */
  protected readonly step = computed(() => `${this.level()}:${this.region() ?? ''}:${this.province() ?? ''}:${this.istat() ?? ''}`);

  protected readonly levelIcon = computed(() => ({ italy: 'earth', region: 'map', province: 'map-pinned', municipality: 'landmark' })[this.level()]);

  protected readonly title = computed(() => {
    switch (this.level()) {
      case 'italy':
        return 'Italy';
      case 'region':
        return this.region() ?? '';
      case 'province':
        return this.currentProvince() ? `Province of ${this.currentProvince()!.name}` : this.province() ?? '';
      case 'municipality':
        return this.place.data()?.name ?? '';
    }
  });

  protected readonly subtitle = computed(() => {
    switch (this.level()) {
      case 'italy':
        return 'Choose a region, or search for any comune, province or region.';
      case 'region': {
        const count = this.provinces.data()?.length;
        return count ? `${count} ${count === 1 ? 'province' : 'provinces'}` : 'Loading provinces…';
      }
      case 'province': {
        const count = this.municipalities.data()?.length;
        return count ? `${formatNumber(count)} comuni · ${formatCompact(this.provincePopulation())} people · ${this.regionName() ?? ''}` : 'Loading comuni…';
      }
      case 'municipality': {
        const m = this.place.data();
        return m ? [m.province && `Province of ${m.province} (${m.provinceCode})`, m.region].filter(Boolean).join(', ') : '';
      }
    }
  });

  protected readonly search: LookupSearch<Place> = async (text) => {
    const [regions, provinces, municipalities] = await Promise.all([
      this.geo.regions(text, 3),
      this.geo.provinces(text, undefined, 3),
      this.geo.municipalities(text, {}, 8),
    ]);
    return [
      ...municipalities.map((municipality): LookupOption<Place> => ({
        value: { kind: 'municipality', municipality },
        label: municipality.name,
        detail: [municipality.province && `${municipality.province} (${municipality.provinceCode})`, municipality.region].filter(Boolean).join(' · '),
        badge: municipality.istatCode,
      })),
      ...provinces.map((province): LookupOption<Place> => ({
        value: { kind: 'province', province },
        label: `Province of ${province.name}`,
        detail: province.region,
        badge: province.abbreviation,
      })),
      ...regions.map((region): LookupOption<Place> => ({ value: { kind: 'region', region }, label: region.name, detail: 'Region' })),
    ];
  };

  constructor() {
    // The map follows each step once its data arrives, and then leaves the view to the person.
    let framed = '';
    effect(() => {
      const level = this.level();
      const region = this.regionName();
      const capitals = this.capitals.data();
      const municipalities = this.municipalities.data();
      const place = this.place.data();
      const ready =
        level === 'italy' ? 'all'
        : level === 'region' ? `${region}:${capitals ? 'capitals' : 'view'}`
        : level === 'province' ? `${this.province()}:${municipalities ? 'comuni' : ''}`
        : `${this.istat()}:${place ? 'place' : ''}`;
      const key = `${level}:${ready}`;
      if (key === framed || ready.endsWith(':')) return;
      framed = key;
      untracked(() => this.frame(level, region, capitals, municipalities, place));
    });

    // Each step starts with an empty filter and its list scrolled to the top.
    effect(() => {
      this.level();
      this.provinceCode();
      untracked(() => {
        this.filter.set('');
        this.panel()?.nativeElement.querySelector('.geography__body')?.scrollTo({ top: 0 });
      });
    });

    effect((onCleanup) => {
      const panel = this.panel()?.nativeElement;
      if (!panel) return;
      const observer = new ResizeObserver(() => this.panelWidth.set(panel.offsetWidth));
      observer.observe(panel);
      onCleanup(() => observer.disconnect());
    });

    effect(() => this.preferences.set('basemap', this.basemap()));
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  protected go(params: Record<string, string | null>): void {
    this.street.set(null);
    this.haptics.tap();
    void this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge' });
    if (this.viewport.isHandset() && this.sheetSnap() === 'peek') this.sheetSnap.set('half');
  }

  protected openRegion(region: string): void {
    this.go({ region, province: null, istat: null });
  }

  protected openProvince(province: Province): void {
    this.go({ region: province.region, province: province.abbreviation, istat: null });
  }

  protected openMunicipality(municipality: Municipality): void {
    this.go({ region: municipality.region ?? this.regionName(), province: municipality.provinceCode ?? this.provinceCode(), istat: municipality.istatCode });
  }

  protected onPicked(option: LookupOption<Place>): void {
    const place = option.value;
    this.query.set('');
    if (place.kind === 'region') this.openRegion(place.region.name);
    else if (place.kind === 'province') this.openProvince(place.province);
    else this.openMunicipality(place.municipality);
  }

  protected onPointSelected(point: MapPoint): void {
    switch (this.level()) {
      case 'italy':
        return this.openRegion(point.id);
      case 'region': {
        const province = this.provinces.data()?.find((candidate) => candidate.abbreviation === point.id);
        if (province) this.openProvince(province);
        return;
      }
      default: {
        const municipality = this.municipalities.data()?.find((candidate) => candidate.istatCode === point.id);
        if (municipality) this.openMunicipality(municipality);
      }
    }
  }

  protected onStreet(address: Address | null): void {
    this.street.set(address);
    const at = address && toPosition(address.latitude, address.longitude);
    if (at) this.canvas().flyTo(at, ZOOM.street);
  }

  protected async lookFrom(position: LatLng): Promise<void> {
    if (this.canvas().mode() === 'map') this.canvas().setMode('split');
    const found = await this.canvas().look(position, position);
    if (!found) this.haptics.warning();
  }

  protected togglePanel(): void {
    this.panelOpen.update((open) => !open);
  }

  protected onSheetHeight(height: number): void {
    this.sheetHeight.set(height);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private frame(level: Level, region: string | null, capitals: Array<{ municipality: Municipality } | null> | undefined, municipalities: Municipality[] | undefined, place: Municipality | undefined): void {
    const canvas = this.canvas();
    switch (level) {
      case 'italy':
        canvas.flyTo(ITALY.center, ITALY.zoom);
        return;
      case 'region': {
        const positions = (capitals ?? []).flatMap((capital) => {
          const at = capital && toPosition(capital.municipality.latitude, capital.municipality.longitude);
          return at ? [at] : [];
        });
        if (positions.length > 1) canvas.fitTo(positions, 9);
        else {
          const view = regionView(region);
          if (view) canvas.flyTo(view.center, view.zoom);
        }
        return;
      }
      case 'province': {
        const positions = (municipalities ?? []).flatMap((m) => {
          const at = toPosition(m.latitude, m.longitude);
          return at ? [at] : [];
        });
        if (positions.length) canvas.fitTo(positions, 11);
        return;
      }
      case 'municipality': {
        const at = place && toPosition(place.latitude, place.longitude);
        if (at && !this.street()) canvas.flyTo(at, ZOOM.municipality - 1);
      }
    }
  }

  private async capitalOf(province: Province): Promise<{ province: Province; municipality: Municipality } | null> {
    try {
      const name = province.name.split(/[\s/-]/)[0];
      const [byName] = await this.geo.municipalities(name, { province: province.abbreviation }, 1);
      const municipality = byName ?? (await this.geo.municipalities('', { province: province.abbreviation }, 1))[0];
      return municipality ? { province, municipality } : null;
    } catch {
      return null;
    }
  }
}
