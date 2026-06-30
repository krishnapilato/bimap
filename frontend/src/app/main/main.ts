import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { LoginResponse } from '../auth/loginresponse';
import { StreetviewComponent } from '../streetview/streetview';
import { ApiService } from './api.service';
import { Tables } from './tables';
import { debounceTime, distinctUntilChanged, Observable, of, switchMap } from 'rxjs';

declare var google: any;

@Component({
  selector: 'main-app',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatIconModule,
    MatAutocompleteModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    MatSidenavModule,
    MatSlideToggleModule,
    RouterModule,
    MatToolbarModule,
    StreetviewComponent,
  ],
  templateUrl: './main.html',
  styleUrls: ['./main.scss'],
})
export class MainComponent implements OnInit, AfterViewInit {
  private apiService = inject(ApiService);
  private snackbar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  currentTime: Date = new Date();
  private timer: any;

  private geocoder = new google.maps.Geocoder();

  public user!: LoginResponse;
  public isShown = signal(false);
  public regionsOptions$!: Observable<string[]>;
  public provincesOptions$!: Observable<string[]>;
  public municipalitiesOptions$!: Observable<string[]>;
  public provinces: string[] = [];

  public latitude: number | null = null;
  public longitude: number | null = null;

  public displayedColumns: string[] = ['id', 'prov', 'comune', 'indirizzo', 'civico'];
  public dataSource = new MatTableDataSource<Tables>();

  private readonly paginator = viewChild.required(MatPaginator);
  private readonly sort = viewChild.required(MatSort);
  private readonly streetView = viewChild(StreetviewComponent);

  public mainForm: FormGroup = this.fb.group({
    searchRegions: ['', Validators.required],
    searchTerm: ['', Validators.required],
    searchMunicipalities: ['', Validators.required],
    address: ['', Validators.required],
    number: ['', Validators.required],
    goodNaming: ['', Validators.required],
    gooodId: ['', Validators.required],
    istatCode: ['', Validators.required],
    ilatitude: [{ value: '', disabled: true }],
    ilongitude: [{ value: '', disabled: true }],
  });

  ngOnInit(): void {
    this.timer = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
    this.user = this.authService.loginResponseValue;

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

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator();
    this.dataSource.sort = this.sort();
  }

  ngOnDestroy() {
    // Clean up the interval when the component is destroyed
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private setupAutocomplete(
    controlName: string,
    apiCall: (term: string) => Observable<string[]>,
  ): Observable<string[]> {
    return this.mainForm.get(controlName)!.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term: string) => {
        if (term?.trim().length > 0) {
          return apiCall(term);
        } else {
          return of<string[]>([]);
        }
      }),
    );
  }

  public applyFilter(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  public onCoordinatesPicked(coords: { lat: number; lng: number }): void {
    this.latitude = coords.lat;
    this.longitude = coords.lng;

    this.mainForm.patchValue({
      ilatitude: coords.lat.toFixed(6),
      ilongitude: coords.lng.toFixed(6),
    });
  }

  public saveData(): void {
    if (
      this.mainForm.valid &&
      this.latitude &&
      this.longitude &&
      confirm('Are you sure you want to save data?')
    ) {
      const formData = {
        ...this.mainForm.getRawValue(),
        latitude: this.latitude,
        longitude: this.longitude,
      };

      this.apiService.save(formData).subscribe({
        next: () => this.snackbar.open('Data saved successfully', 'Close', { duration: 3000 }),
        error: () => this.snackbar.open('Failed to save data', 'Close', { duration: 3000 }),
      });
    } else {
      this.mainForm.markAllAsTouched();
      this.snackbar.open('Please fill out all required fields and pick coordinates.', 'Close', {
        duration: 3000,
      });
    }
  }

  public getRecord(row: any): void {
    this.snackbar.open('Data inserted successfully', 'Close', { duration: 3000 });

    const normalizedAddress = this.normalizeAddress(row.indirizzo);

    this.mainForm.patchValue({
      searchMunicipalities: row.comune,
      address: normalizedAddress,
      number: row.civico === 0 ? '' : row.civico.toString(),
    });

    this.panMapToAddress(
      row.comune,
      normalizedAddress,
      row.civico === 0 ? '' : row.civico.toString(),
    );
  }

  public focusOut(): void {
    const municipality = this.mainForm.get('searchMunicipalities')?.value;
    const address = this.mainForm.get('address')?.value;
    const number = this.mainForm.get('number')?.value;

    if (municipality && address && number) this.panMapToAddress(municipality, address, number);
  }

  private panMapToAddress(municipality: string, address: string, number: string): void {
    //? `https://nominatim.openstreetmap.org/search?format=json&q=`;
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
