/**
 * The geographic asset engine.
 *
 * A split view: one instant-search box on the left, and on the right the card grid it fills.
 * The search is a cascade — each level narrows the next, and a level stays locked until the one
 * above it is answered, because an unnarrowed lookup would offer impossible options.
 *
 * The grid is not a read-only dump. It carries the two typed fields (asset name, house number) and
 * the save, so the record being assembled and the evidence behind it stay in one place.
 *
 * @author Khova Krishna Pilato
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { GEO_API, REGISTRY_API } from '../../core/api/adapters';
import { MapPanelComponent } from '../../shared/map-panel/map-panel';
import { isDemoMode } from '../../core/api/api.providers';
import {
  AssetRegistrationDraft,
  EntityCode,
  GeoScope,
  Municipality,
  Province,
  Region,
  ResolvedAddress,
} from '../../core/api/models';

export type Step = 'region' | 'province' | 'municipality' | 'address' | 'asset' | 'entity';

interface StepDefinition {
  readonly id: Step;
  readonly index: number;
  readonly label: string;
  readonly icon: string;
  readonly placeholder: string;
  /** The one step with no lookup behind it. */
  readonly manual?: boolean;
}

interface Fact {
  readonly label: string;
  readonly icon: string;
  readonly value: string | null;
}

const STEPS: readonly StepDefinition[] = [
  { id: 'region', index: 1, label: 'Region', icon: 'map', placeholder: 'Lombardia…' },
  { id: 'province', index: 2, label: 'Province', icon: 'account_balance', placeholder: 'Name or code…' },
  {
    id: 'municipality',
    index: 3,
    label: 'Municipality',
    icon: 'location_city',
    placeholder: 'Name, ISTAT or cadastral code…',
  },
  { id: 'address', index: 4, label: 'Address', icon: 'signpost', placeholder: 'Street name…' },
  { id: 'asset', index: 5, label: 'Asset name', icon: 'domain', placeholder: 'Palazzo Estense', manual: true },
  {
    id: 'entity',
    index: 6,
    label: 'Responsible body',
    icon: 'corporate_fare',
    placeholder: 'Archivio di Stato…',
  },
];

@Component({
  selector: 'bm-geo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MapPanelComponent],
  templateUrl: './geo.html',
})
export class GeoComponent {
  readonly #geo = inject(GEO_API);
  readonly #registry = inject(REGISTRY_API);

  protected readonly demo = isDemoMode;
  protected readonly steps = STEPS;

  protected readonly active = signal<Step>('region');
  protected readonly query = signal('');

  // ── What the cascade has settled on ────────────────────────────────────────
  protected readonly region = signal<Region | null>(null);
  protected readonly province = signal<Province | null>(null);
  protected readonly municipality = signal<Municipality | null>(null);
  protected readonly address = signal<ResolvedAddress | null>(null);
  protected readonly assetName = signal('');
  protected readonly entity = signal<EntityCode | null>(null);
  protected readonly houseNumber = signal('');

  protected readonly scope = computed<GeoScope>(() => ({
    region: this.region()?.name,
    province: this.province()?.abbreviation,
    municipality: this.municipality()?.name,
    street: this.address()?.street ?? undefined,
  }));

  protected readonly loading = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal<string | null>(null);

  /** A step is reachable once the one before it has an answer. */
  protected readonly reached = computed<Record<Step, boolean>>(() => ({
    region: true,
    province: this.region() !== null,
    municipality: this.province() !== null,
    address: this.municipality() !== null,
    asset: this.municipality() !== null,
    entity: this.municipality() !== null,
  }));

  protected readonly answers = computed<Record<Step, string | null>>(() => ({
    region: this.region()?.name ?? null,
    province: this.province() ? `${this.province()!.name} (${this.province()!.abbreviation})` : null,
    municipality: this.municipality()?.name ?? null,
    address: this.address() ? `${this.address()!.street ?? ''} ${this.houseNumber()}`.trim() : null,
    asset: this.assetName().trim() || null,
    entity: this.entity()?.name ?? null,
  }));

  protected readonly completed = computed(
    () => Object.values(this.answers()).filter((value) => value !== null).length,
  );
  protected readonly progress = computed(() =>
    Math.round((this.completed() / STEPS.length) * 100),
  );

  /** The address is optional for a valid record; the place and the asset are not. */
  protected readonly canSave = computed(
    () =>
      this.municipality() !== null &&
      this.province() !== null &&
      this.assetName().trim().length > 0 &&
      (this.address() !== null || false),
  );

  protected readonly activeStep = computed(
    () => STEPS.find((step) => step.id === this.active()) ?? STEPS[0],
  );

  /** What has been settled, in cascade order. Clicking one undoes it and everything under it. */
  protected readonly breadcrumbs = computed(() =>
    Object.entries(this.answers())
      .filter(([, value]) => value !== null)
      .map(([step, value]) => ({ step: step as Step, label: value as string })),
  );

  /** Nominatim and the public-body directory are too broad to query on one or two letters. */
  protected readonly needsMoreTyping = computed(() => {
    const step = this.active();
    return (step === 'address' || step === 'entity') && this.query().trim().length < 3;
  });

  /** The identifiers a comune carries, as one strip of values rather than a scatter of tiles. */
  protected readonly facts = computed<readonly Fact[]>(() => {
    const comune = this.municipality();
    if (!comune) {
      return [];
    }

    return [
      { label: 'ISTAT', icon: 'tag', value: comune.istatCode },
      { label: 'Cadastral', icon: 'grid_on', value: comune.cadastralCode },
      {
        label: 'Postal code',
        icon: 'markunread_mailbox',
        // A street CAP is narrower than the comune's, so it wins wherever one was resolved.
        value: this.address()?.postalCode ?? comune.postalCode,
      },
      {
        label: 'Population',
        icon: 'groups',
        value: comune.population?.toLocaleString('it-IT') ?? null,
      },
    ];
  });

  protected readonly coordinates = computed(() => {
    const latitude = this.address()?.latitude ?? this.municipality()?.latitude;
    const longitude = this.address()?.longitude ?? this.municipality()?.longitude;

    return latitude != null && longitude != null
      ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
      : null;
  });

  /** The record floats over the map, and can be put away when the map is what matters. */
  protected readonly recordOpen = signal(true);

  /** Below the split breakpoint the two panes take turns rather than squeezing together. */
  protected readonly pane = signal<'search' | 'record'>('search');

  readonly #rows = toSignal(
    toObservable(
      computed(() => ({ step: this.active(), query: this.query(), scope: this.scope() })),
    ).pipe(
      debounceTime(220),
      distinctUntilChanged(
        (a, b) => a.step === b.step && a.query === b.query && sameScope(a.scope, b.scope),
      ),
      switchMap(({ step, query, scope }) => {
        this.loading.set(true);
        this.failure.set(null);

        return this.#lookup(step, query, scope).pipe(
          catchError((error) => {
            this.failure.set(reason(error));
            return of([] as readonly unknown[]);
          }),
        );
      }),
    ),
    { initialValue: [] as readonly unknown[] },
  );

  protected readonly results = computed(() => {
    const rows = this.#rows();
    queueMicrotask(() => this.loading.set(false));
    return rows;
  });

  protected readonly regions = computed(() =>
    this.active() === 'region' ? (this.results() as Region[]) : [],
  );
  protected readonly provinces = computed(() =>
    this.active() === 'province' ? (this.results() as Province[]) : [],
  );
  protected readonly municipalities = computed(() =>
    this.active() === 'municipality' ? (this.results() as Municipality[]) : [],
  );
  protected readonly addresses = computed(() =>
    this.active() === 'address' ? (this.results() as ResolvedAddress[]) : [],
  );
  protected readonly entities = computed(() =>
    this.active() === 'entity' ? (this.results() as EntityCode[]) : [],
  );

  #lookup(step: Step, query: string, scope: GeoScope): Observable<readonly unknown[]> {
    switch (step) {
      case 'region':
        return this.#geo.regions(query, 10);
      case 'province':
        return this.#geo.provinces(query, scope, 10);
      case 'municipality':
        return this.#geo.municipalities(query, scope, 10);
      case 'address':
        return query.trim().length < 3 ? of([]) : this.#geo.addresses(query, scope, 6);
      case 'entity':
        return query.trim().length < 3 ? of([]) : this.#geo.entityCodes(query, scope, 6);
      case 'asset':
        return of([]);
    }
  }

  /** Sends the visitor back to the search side at a given level — the phone layout needs it. */
  protected jumpTo(step: Step): void {
    this.pane.set('search');
    this.open(step);
  }

  protected open(step: Step): void {
    if (!this.reached()[step]) {
      return;
    }
    this.active.set(step);
    this.query.set('');
  }

  protected pickRegion(value: Region): void {
    this.region.set(value);
    this.province.set(null);
    this.municipality.set(null);
    this.address.set(null);
    this.entity.set(null);
    this.open('province');
  }

  protected pickProvince(value: Province): void {
    this.province.set(value);
    // Choosing a province implies its region, so the two can never disagree.
    this.region.set({ name: value.region });
    this.municipality.set(null);
    this.address.set(null);
    this.entity.set(null);
    this.open('municipality');
  }

  protected pickMunicipality(value: Municipality): void {
    this.municipality.set(value);
    this.pane.set('record');
    this.address.set(null);
    this.entity.set(null);
    this.open('address');
  }

  protected pickAddress(value: ResolvedAddress): void {
    this.address.set(value);
    if (value.houseNumber) {
      this.houseNumber.set(value.houseNumber);
    }
    this.open('asset');
  }

  protected pickEntity(value: EntityCode): void {
    this.entity.set(value);
  }

  protected clear(step: Step): void {
    switch (step) {
      case 'region':
        this.region.set(null);
        this.province.set(null);
        this.municipality.set(null);
        this.address.set(null);
        this.entity.set(null);
        break;
      case 'province':
        this.province.set(null);
        this.municipality.set(null);
        this.address.set(null);
        this.entity.set(null);
        break;
      case 'municipality':
        this.municipality.set(null);
        this.address.set(null);
        this.entity.set(null);
        break;
      case 'address':
        this.address.set(null);
        this.houseNumber.set('');
        break;
      case 'asset':
        this.assetName.set('');
        break;
      case 'entity':
        this.entity.set(null);
        break;
    }
    this.open(step);
  }

  protected resetAll(): void {
    this.clear('region');
    this.assetName.set('');
    this.saved.set(null);
  }

  protected save(): void {
    if (!this.canSave() || this.saving()) {
      return;
    }
    const comune = this.municipality()!;
    const resolved = this.address();

    const draft: AssetRegistrationDraft = {
      region: this.region()?.name ?? comune.region ?? '',
      provinceName: this.province()?.name ?? comune.province ?? '',
      provinceCode: this.province()?.abbreviation ?? comune.provinceCode ?? '',
      municipality: comune.name,
      istatCode: comune.istatCode,
      cadastralCode: comune.cadastralCode,
      postalCode: resolved?.postalCode ?? comune.postalCode,
      address: resolved?.street ?? '',
      houseNumber: this.houseNumber() || null,
      latitude: resolved?.latitude ?? comune.latitude,
      longitude: resolved?.longitude ?? comune.longitude,
      assetName: this.assetName().trim(),
      entityName: this.entity()?.name ?? null,
      entityBillingCode: this.entity()?.billingCode ?? null,
    };

    this.saving.set(true);
    this.failure.set(null);

    this.#registry.create(draft).subscribe({
      next: (outcome) => {
        this.saving.set(false);
        this.saved.set(
          outcome.persisted
            ? 'Registration recorded as a draft.'
            : `No backend in demo mode, so it was exported as ${outcome.downloadedAs}.`,
        );
      },
      error: (error) => {
        this.saving.set(false);
        this.failure.set(reason(error));
      },
    });
  }

  protected mapLink(): string | null {
    const latitude = this.address()?.latitude ?? this.municipality()?.latitude;
    const longitude = this.address()?.longitude ?? this.municipality()?.longitude;

    return latitude && longitude
      ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`
      : null;
  }
}

function sameScope(a: GeoScope, b: GeoScope): boolean {
  return (
    a.region === b.region &&
    a.province === b.province &&
    a.municipality === b.municipality &&
    a.street === b.street
  );
}

function reason(error: unknown): string {
  const problem = (error as { error?: { detail?: string; violations?: { message: string }[] } })
    ?.error;
  return (
    problem?.violations?.[0]?.message ??
    problem?.detail ??
    'That lookup did not answer. The upstream registry may be busy.'
  );
}
