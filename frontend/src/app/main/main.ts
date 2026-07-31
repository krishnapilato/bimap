import { AsyncPipe, DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { Observable, debounceTime, distinctUntilChanged, interval, of, switchMap } from 'rxjs';

import { AppShellComponent } from '../shared/app-shell/app-shell';
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
  ],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class MainComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentTime = signal(new Date());
  readonly isSaving = signal(false);

  /** Which surfaces the canvas shows; Street View is verification, not the default work surface. */
  readonly viewMode = signal<MapViewMode>('split');

  readonly viewModes: ReadonlyArray<{ value: MapViewMode; label: string; icon: string }> = [
    { value: 'map', label: 'Map', icon: 'map' },
    { value: 'split', label: 'Split', icon: 'splitscreen' },
    { value: 'street', label: 'Street', icon: 'streetview' },
  ];

  /** Past records are reference material, so the drawer starts closed. */
  readonly recordsOpen = signal(false);

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

  // Optional: the records table only exists while the drawer is open.
  private readonly paginator = viewChild(MatPaginator);
  private readonly sort = viewChild(MatSort);
  private readonly streetView = viewChild(StreetviewComponent);

  /** Live marker position, surfaced in the canvas bar. */
  readonly liveCoords = computed(() => this.streetView()?.currentCoords() ?? '—');

  get recordCount(): number {
    return this.dataSource.data.length;
  }

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

  ngOnInit(): void {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.currentTime.set(new Date()));

    this.apiService
      .findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => (this.dataSource.data = data));

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
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  setViewMode(mode: MapViewMode): void {
    this.viewMode.set(mode);
  }

  toggleRecords(): void {
    this.recordsOpen.update((open) => !open);
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

  clearForm(): void {
    this.mainForm.reset();
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

    // Get out of the way so the map result is immediately visible.
    this.recordsOpen.set(false);

    this.panMapToAddress(row.comune, normalizedAddress, civico);
  }

  formatIstatCode(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toUpperCase().replace(/\D/g, '');
    this.mainForm.controls['istatCode'].setValue(value, { emitEvent: false });
  }

  focusOut(): void {
    const municipality = this.mainForm.get('searchMunicipalities')?.value;
    const address = this.mainForm.get('address')?.value;
    const number = this.mainForm.get('number')?.value;

    if (municipality && address && number) this.panMapToAddress(municipality, address, number);
  }

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
