import { AsyncPipe, DatePipe } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { gsap } from 'gsap';
import {
  Observable,
  Subject,
  debounceTime,
  distinctUntilChanged,
  interval,
  of,
  switchMap,
} from 'rxjs';

import { CommandService } from '../core/commands/command.service';
import { BM_MOTION, MotionService } from '../core/motion';
import { AppShellComponent } from '../shared/app-shell/app-shell';
import { FloatPanelComponent } from '../shared/float-panel/float-panel';
import { MapViewMode, StreetviewComponent } from '../streetview/streetview';
import { ApiService } from './api.service';
import { Tables } from './tables';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData,
} from '../shared/confirmation-dialog/confirmation-dialog';
import { FormModel } from './formdata';

declare var google: any;

@Component({
  selector: 'main-app',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatIconModule,
    MatAutocompleteModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    MatDialogModule,
    AppShellComponent,
    StreetviewComponent,
    FloatPanelComponent,
    ...BM_MOTION,
  ],
  templateUrl: './main.html',
  styleUrl: './main.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly motion = inject(MotionService);
  private readonly commands = inject(CommandService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly tableFilterChanges = new Subject<string>();

  readonly currentTime = signal(new Date());
  readonly isSaving = signal(false);

  /** Which surfaces the canvas shows; Street View is verification, not the default work surface. */
  readonly viewMode = signal<MapViewMode>('map');

  readonly viewModes: ReadonlyArray<{ value: MapViewMode; label: string; icon: string }> = [
    { value: 'map', label: 'Map', icon: 'map' },
    { value: 'split', label: 'Split', icon: 'splitscreen' },
    { value: 'street', label: 'Street', icon: 'streetview' },
  ];

  /**
   * The register palette's collapsed state.
   *
   * There is no separate "open" concept: the chip in the corner *is* the
   * collapsed panel, so this single flag is the whole of it. Past records are
   * reference material, so it starts parked.
   */
  readonly registerCollapsed = signal(true);

  /**
   * Whether the locality strip is showing its three inputs.
   *
   * An operator works one comune at a time — often for a whole afternoon — so
   * the administrative chain is treated as session context rather than as part
   * of each record: set once, collapsed to a breadcrumb, and deliberately *not*
   * cleared by `clearForm`. That takes three of the eight fields out of the
   * per-record loop.
   */
  readonly localityEditing = signal(true);

  private _geocoder?: any;
  private get geocoder() {
    return (this._geocoder ??= new google.maps.Geocoder());
  }

  regionsOptions$!: Observable<string[]>;
  provincesOptions$!: Observable<string[]>;
  municipalitiesOptions$!: Observable<string[]>;

  readonly latitude = signal<number | null>(null);
  readonly longitude = signal<number | null>(null);
  readonly hasCoordinates = computed(() => this.latitude() !== null && this.longitude() !== null);

  readonly displayedColumns = ['id', 'prov', 'comune', 'indirizzo', 'civico', 'actions'];
  readonly dataSource = new MatTableDataSource<Tables>();

  /** Drives the animated record counter, which a plain getter could not. */
  readonly recordCount = signal(0);

  // Optional: the records table only exists while the drawer is open.
  private readonly paginator = viewChild(MatPaginator);
  private readonly sort = viewChild(MatSort);
  private readonly streetView = viewChild(StreetviewComponent);
  private readonly viewSwitch = viewChild<ElementRef<HTMLElement>>('viewSwitch');
  private readonly switchThumb = viewChild<ElementRef<HTMLElement>>('switchThumb');
  private readonly positionCard = viewChild<ElementRef<HTMLElement>>('positionCard');
  // `#recordsPanel` sits on a component, so the element has to be read
  // explicitly — the default query would hand back the component instance.
  private readonly recordsPanel = viewChild('recordsPanel', { read: ElementRef });

  /** Live marker position, surfaced in the canvas bar. */
  readonly liveCoords = computed(() => this.streetView()?.currentCoords() ?? '—');

  readonly mainForm: FormGroup = this.fb.group({
    searchRegions: ['', Validators.required],
    searchTerm: ['', Validators.required],
    searchMunicipalities: ['', Validators.required],
    address: ['', Validators.required],
    number: ['', Validators.required],
    goodNaming: ['', Validators.required],
    goodID: ['', Validators.required],
    istatCode: ['', Validators.required],
    ilatitude: [{ value: '', disabled: true }],
    ilongitude: [{ value: '', disabled: true }],
  });

  /** Re-evaluated on every keystroke so the locality breadcrumb tracks the form. */
  private readonly formValue = toSignal(this.mainForm.valueChanges, {
    initialValue: this.mainForm.value,
  });

  /** Region › Province › Municipality, for the collapsed breadcrumb. */
  readonly localityPath = computed(() => {
    this.formValue();

    return ['searchRegions', 'searchTerm', 'searchMunicipalities']
      .map((control) => `${this.mainForm.get(control)?.value ?? ''}`.trim())
      .filter(Boolean);
  });

  readonly localityComplete = computed(() => this.localityPath().length === 3);

  /** Complete *and* confirmed — only then does the strip collapse. */
  readonly localitySettled = computed(() => this.localityComplete() && !this.localityEditing());

  ngOnInit(): void {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.currentTime.set(new Date()));

    this.apiService
      .findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.dataSource.data = data;
        this.recordCount.set(data.length);
        this.changeDetector.markForCheck();
      });

    this.tableFilterChanges
      .pipe(debounceTime(160), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((filter) => {
        this.dataSource.filter = filter;
        this.dataSource.paginator?.firstPage();
      });

    this.regionsOptions$ = this.setupAutocomplete('searchRegions', (term) =>
      this.apiService.searchRegions(term),
    );
    this.provincesOptions$ = this.setupAutocomplete('searchTerm', (term) =>
      this.apiService.searchProvinces(term),
    );
    this.municipalitiesOptions$ = this.setupAutocomplete('searchMunicipalities', (term) =>
      this.apiService.searchMunicipalities(term),
    );
  }

  constructor() {
    // Re-attach whenever the drawer mounts the table, rather than once after
    // the first view pass.
    effect(() => {
      const paginator = this.paginator();
      const sort = this.sort();

      if (paginator) this.dataSource.paginator = paginator;
      if (sort) this.dataSource.sort = sort;
    });

    // The mode pills share one sliding thumb, so the selection travels between
    // them instead of blinking out of one and into the next.
    effect(() => {
      this.viewMode();
      requestAnimationFrame(() => this.moveSwitchThumb());
    });

    // Capturing a point is the moment the whole screen exists for; it gets the
    // one genuinely emphatic animation in the workspace.
    effect(() => {
      if (this.hasCoordinates()) this.celebrateCapture();
    });

    effect(() => {
      if (!this.registerCollapsed()) requestAnimationFrame(() => this.revealRecords());
    });

    this.registerCommands();

    afterNextRender(() => {
      this.playEntrance();
      this.moveSwitchThumb();
    });
  }

  /** Everything on this screen is also reachable from ⌘K. */
  private registerCommands(): void {
    const dispose = this.commands.register([
      {
        id: 'main.locate',
        label: 'Locate on map',
        hint: 'Geocode the address currently in the form',
        group: 'Workspace',
        icon: 'travel_explore',
        keywords: 'find geocode search address',
        run: () => this.locateOnMap(),
      },
      {
        id: 'main.view.split',
        label: 'Split map and Street View',
        group: 'Workspace',
        icon: 'splitscreen',
        keywords: 'compare panes side by side',
        run: () => this.setViewMode('split'),
      },
      {
        id: 'main.view.map',
        label: 'Show map only',
        group: 'Workspace',
        icon: 'map',
        run: () => this.setViewMode('map'),
      },
      {
        id: 'main.view.street',
        label: 'Show Street View only',
        group: 'Workspace',
        icon: 'streetview',
        keywords: 'panorama',
        run: () => this.setViewMode('street'),
      },
      {
        id: 'main.recentre',
        label: 'Recentre on marker',
        group: 'Workspace',
        icon: 'my_location',
        run: () => this.recenterMap(),
      },
      {
        id: 'main.records',
        label: 'Toggle the register',
        hint: 'Expand or park the saved records palette',
        group: 'Workspace',
        icon: 'database',
        keywords: 'saved records table register',
        run: () => this.toggleRecords(),
      },
      {
        id: 'main.save',
        label: 'Save record',
        hint: 'Commit the current asset to the register',
        group: 'Workspace',
        icon: 'save',
        run: () => this.saveData(),
      },
      {
        id: 'main.clear',
        label: 'Clear the form',
        group: 'Workspace',
        icon: 'restart_alt',
        keywords: 'reset empty start over',
        run: () => this.clearForm(),
      },
    ]);

    this.destroyRef.onDestroy(dispose);
  }

  private setupAutocomplete(
    controlName: string,
    apiCall: (term: string) => Observable<string[]>,
  ): Observable<string[]> {
    return this.mainForm.get(controlName)!.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term: string) => (term?.trim().length ? apiCall(term) : of<string[]>([]))),
    );
  }

  applyFilter(event: Event): void {
    this.tableFilterChanges.next((event.target as HTMLInputElement).value.trim().toLowerCase());
  }

  setViewMode(mode: MapViewMode): void {
    this.viewMode.set(mode);
  }

  toggleRecords(): void {
    this.registerCollapsed.update((collapsed) => !collapsed);
  }

  recenterMap(): void {
    this.streetView()?.recenterView();
  }

  /** Street and number joined for the inspector recap. */
  addressSummary(): string {
    const street = this.mainForm.get('address')?.value?.trim();
    const number = this.mainForm.get('number')?.value;

    if (!street) return '—';

    return number ? `${street} ${number}` : street;
  }

  /** Enough of an address to be worth geocoding. */
  canLocate(): boolean {
    const municipality = this.mainForm.get('searchMunicipalities')?.value;
    const address = this.mainForm.get('address')?.value;

    return !!(municipality?.trim() && address?.trim());
  }

  /**
   * Explicit "Locate" replaces geocoding silently on blur, so the operator
   * decides when the map moves.
   */
  locateOnMap(): void {
    if (!this.canLocate()) return;

    this.panMapToAddress(
      this.mainForm.get('searchMunicipalities')?.value,
      this.mainForm.get('address')?.value,
      this.mainForm.get('number')?.value ?? '',
    );
  }

  onCoordinatesPicked(coords: { lat: number; lng: number }): void {
    this.latitude.set(coords.lat);
    this.longitude.set(coords.lng);

    this.mainForm.patchValue({
      ilatitude: coords.lat.toFixed(6),
      ilongitude: coords.lng.toFixed(6),
    });
  }

  editLocality(): void {
    this.localityEditing.set(true);
  }

  confirmLocality(): void {
    if (!this.localityComplete()) return;

    this.localityEditing.set(false);
  }

  /**
   * Resets the record — but not the locality.
   *
   * This is the whole point of promoting the administrative chain to session
   * context: saving a record and starting the next one in the same comune
   * should cost nothing. `mainForm.reset()` would have thrown that away every
   * time, which is exactly the repetition the old layout imposed.
   */
  clearForm(): void {
    this.mainForm.patchValue({
      address: '',
      number: '',
      goodNaming: '',
      goodID: '',
      istatCode: '',
      ilatitude: '',
      ilongitude: '',
    });

    for (const control of ['address', 'number', 'goodNaming', 'goodID', 'istatCode']) {
      this.mainForm.get(control)?.markAsPristine();
      this.mainForm.get(control)?.markAsUntouched();
    }

    this.latitude.set(null);
    this.longitude.set(null);
  }

  saveData(): void {
    if (!this.mainForm.valid || !this.hasCoordinates()) {
      this.mainForm.markAllAsTouched();
      this.snackbar.open('Complete every field and capture coordinates first.', 'Close', {
        duration: 3000,
      });
      return;
    }

    const confirmData: ConfirmationDialogData = {
      title: 'Save record',
      message: 'Save this asset record to the register?',
      icon: 'save',
      tone: 'primary',
      confirmText: 'Save record',
      cancelText: 'Cancel',
    };

    this.dialog
      .open(ConfirmationDialogComponent, { data: confirmData })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        const formData: FormModel = {
          region: this.mainForm.get('searchRegions')?.value,
          province: this.mainForm.get('searchTerm')?.value,
          municipality: this.mainForm.get('searchMunicipalities')?.value,
          address: this.mainForm.get('address')?.value,
          number: this.mainForm.get('number')?.value,
          goodNaming: this.mainForm.get('goodNaming')?.value,
          goodID: this.mainForm.get('goodID')?.value,
          istatCode: this.mainForm.get('istatCode')?.value,
          latitude: this.mainForm.get('ilatitude')?.value,
          longitude: this.mainForm.get('ilongitude')?.value,
        };

        this.isSaving.set(true);

        this.apiService.save(formData).subscribe({
          next: () => {
            this.isSaving.set(false);
            this.snackbar.open('Record saved', 'Close', { duration: 3000 });
            this.clearForm();
          },
          error: () => {
            this.isSaving.set(false);
            this.snackbar.open('Could not save the record', 'Close', { duration: 3000 });
          },
        });
      });
  }

  /** Copies a saved record back into the form and pans the map to it. */
  loadRecord(row: Tables): void {
    const normalizedAddress = this.normalizeAddress(row.indirizzo);
    const civico = row.civico === 0 ? '' : row.civico.toString();

    this.mainForm.patchValue({
      searchMunicipalities: row.comune,
      address: normalizedAddress,
      number: civico,
    });

    this.snackbar.open(`Record ${row.id} loaded into the form`, 'Close', { duration: 2500 });

    // Park the register so the map result is immediately visible.
    this.registerCollapsed.set(true);

    this.panMapToAddress(row.comune, normalizedAddress, civico);
  }

  formatIstatCode(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toUpperCase().replace(/\D/g, '');
    this.mainForm.controls['istatCode'].setValue(value, { emitEvent: false });
  }

  // ── Choreography ───────────────────────────────────────────────────────────

  /**
   * The map settles first and the floating chrome arrives on top of it, which
   * is the order the screen is actually stacked.
   */
  private playEntrance(): void {
    if (!this.motion.enabled()) return;

    const context = gsap.context(() => {
      this.motion
        .timeline({ delay: 0.1 })
        .from('.canvas', { opacity: 0, duration: 0.7 })
        .from('.panel', { opacity: 0, x: -22, duration: 0.65, ease: 'bmGlide' }, '-=0.4')
        .from(
          '.chrome, .records',
          { opacity: 0, y: -10, duration: 0.5, stagger: 0.08 },
          '-=0.45',
        );
    }, this.host.nativeElement);

    this.destroyRef.onDestroy(() => context.revert());
  }

  /**
   * Slides the shared selection thumb under the active mode pill. Measuring the
   * button rather than assuming equal widths keeps it aligned when a label is
   * hidden at narrow widths.
   */
  private moveSwitchThumb(): void {
    const container = this.viewSwitch()?.nativeElement;
    const thumb = this.switchThumb()?.nativeElement;
    if (!container || !thumb) return;

    const index = this.viewModes.findIndex((option) => option.value === this.viewMode());
    const target = container.querySelectorAll<HTMLElement>('[data-view-option]')[index];
    if (!target) return;

    const vars = {
      x: target.offsetLeft,
      width: target.offsetWidth,
      duration: this.motion.enabled() ? 0.45 : 0,
      ease: 'bmArrive',
      overwrite: 'auto' as const,
    };

    gsap.to(thumb, vars);
  }

  /**
   * The capture confirmation: the position card lifts, its icon spins into a
   * tick, and a ring expands out of it. Short, but unmistakably a success.
   */
  private celebrateCapture(): void {
    if (!this.motion.enabled()) return;

    requestAnimationFrame(() => {
      const card = this.positionCard()?.nativeElement;
      if (!card) return;

      this.motion
        .timeline()
        .fromTo(card, { scale: 0.96 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' })
        .fromTo(
          card.querySelectorAll('dd'),
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.07 },
          0.05,
        );
    });
  }

  /**
   * The records overlay slides in over the dock and its rows cascade. It covers
   * rather than pushes: the map must not resize to show a list, or every
   * lookup would cost the operator their view.
   */
  private revealRecords(): void {
    if (!this.motion.enabled()) return;

    const panel = this.recordsPanel()?.nativeElement;
    if (!panel) return;

    this.motion
      .timeline()
      .from(panel, { opacity: 0, scale: 0.97, x: -14, duration: 0.4, ease: 'bmArrive' })
      .from(
        panel.querySelectorAll('.mat-mdc-row'),
        { opacity: 0, x: -12, duration: 0.35, stagger: 0.03 },
        '-=0.2',
      );
  }

  // ── Geocoding ──────────────────────────────────────────────────────────────

  private panMapToAddress(municipality: string, address: string, number: string): void {
    const fullAddress = `${address} - ${number}, ${municipality}, Italy`;

    this.geocoder.geocode({ address: fullAddress }, (results: any, status: any) => {
      if (status === 'OK' && results.length > 0) {
        const location = results[0].geometry.location;
        this.streetView()?.panTo(location.lat(), location.lng());
      } else console.error('Geocoding failed:', status);
    });
  }

  private normalizeAddress(indirizzo: string): string {
    if (!indirizzo) return '';

    const streetKeywords = [
      'via',
      'viale',
      'piazza',
      'corso',
      'largo',
      'strada',
      'vicolo',
      'piazzale',
      'trav',
      'borgo',
      'salita',
    ];

    const full = indirizzo.trim();

    const parts = full
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    let street = '';
    let cityLike = '';

    if (parts.length > 1) {
      const [p1, p2] = parts;

      const p1IsStreet = streetKeywords.some((k) => p1.toLowerCase().startsWith(k));
      const p2IsStreet = streetKeywords.some((k) => p2.toLowerCase().startsWith(k));

      if (p1IsStreet && !p2IsStreet) {
        street = p1;
        cityLike = p2;
      } else if (p2IsStreet && !p1IsStreet) {
        street = p2;
        cityLike = p1;
      } else {
        street = p2;
        cityLike = p1;
      }
    } else {
      const isStreet = streetKeywords.some((k) => full.toLowerCase().startsWith(k));

      if (isStreet) street = full;
      else cityLike = full;
    }

    return [street, cityLike].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }
}
