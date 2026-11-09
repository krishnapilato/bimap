import { HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, FormField, FormRoot, maxLength, min, readonly, required, validate } from '@angular/forms/signals';
import * as L from 'leaflet';
import { firstValueFrom, of } from 'rxjs';
import { googleTiles } from '../../shared/google-tiles';
import { Navbar } from '../../shared/navbar';
import { listOf } from '../../shared/resource';
import { ToastService } from '../../shared/toast.service';
import { Asset } from './asset.models';
import { AssetsService } from './assets.service';
import { apiError } from '../../shared/api-error';
import { pageIndex } from '../../shared/pagination';
import { integerError, PLAIN_TEXT, singleLine, TEXT_MESSAGE, textError } from '../../shared/validation';
import { Autocomplete } from '../../shared/autocomplete';
import { Modal } from '../../shared/modal';
import { CsvPreview, parseCsv, saveCsv } from '../../shared/csv';

const PAGE_SIZE = 5;
const EMPTY = {
  region: '',
  province: '',
  municipality: '',
  istatCode: '',
  address: '',
  number: null as number | null,
  goodNaming: '',
  goodID: null as number | null,
  latitude: null as number | null,
  longitude: null as number | null,
};

const istat = (code?: string) => (code && /^\d{6}$/.test(code) ? code : '');

@Component({
  selector: 'app-assets',
  imports: [FormField, FormRoot, Navbar, Autocomplete, Modal],
  templateUrl: './assets.html',
})
export class Assets {
  private readonly api = inject(AssetsService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private locationVersion = 0;
  private selectionVersion = 0;
  private readonly mapElement = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly road = googleTiles('roads');
  private readonly aerial = googleTiles('satellite');
  private readonly coverage = googleTiles('street-view');
  private readonly marker = L.circleMarker([0, 0], { radius: 8, color: '#fff', weight: 3, fillColor: '#18181b', fillOpacity: 1 });
  private map?: L.Map;

  protected readonly satellite = signal(false);
  protected readonly streetView = signal(false);
  protected readonly error = signal('');
  protected readonly locating = signal(false);
  protected readonly exporting = signal(false);
  protected readonly savingCsv = signal(false);
  protected readonly csvPreview = signal<(CsvPreview & { blob: Blob }) | null>(null);

  private readonly asset = signal({ ...EMPTY });
  protected readonly form = form(
    this.asset,
    (asset) => {
      required(asset.region);
      required(asset.province);
      required(asset.municipality);
      validate(asset.region, ({ value }) => this.fromList(value(), this.regions(), 'region'));
      validate(asset.province, ({ value }) => this.fromList(value(), this.provinces(), 'province'));
      validate(asset.municipality, ({ value }) => this.fromList(value(), this.municipalities().map((place) => place.nome), 'municipality'));
      required(asset.address);
      required(asset.goodNaming);
      for (const field of [asset.region, asset.province, asset.municipality, asset.address, asset.goodNaming]) {
        maxLength(field, 255);
        validate(field, ({ value }) => textError(singleLine(value()), PLAIN_TEXT, TEXT_MESSAGE));
      }
      validate(asset.number, ({ value }) => integerError(value()));
      validate(asset.goodID, ({ value }) => integerError(value()));
      min(asset.number, 0);
      min(asset.goodID, 0);
      required(asset.latitude);
      required(asset.longitude);
      readonly(asset.istatCode);
      readonly(asset.latitude);
      readonly(asset.longitude);
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: () => this.error.set(this.form().errorSummary().find((error) => error.kind === 'characters')?.message ?? 'Choose the place, fill in the address and asset name, then click the map to set the coordinates.'),
      },
    },
  );

  private readonly regionsResource = rxResource({ stream: () => this.api.regions(), defaultValue: [] });
  protected readonly regions = listOf(this.regionsResource);
  private readonly provincesResource = rxResource({
    params: () => (this.regions().includes(this.asset().region) ? this.asset().region : undefined),
    stream: ({ params }) => this.api.provinces(params),
    defaultValue: [],
  });
  protected readonly provinces = listOf(this.provincesResource);
  private readonly municipalitiesResource = rxResource({
    params: () => (this.provinces().includes(this.asset().province) ? this.asset().province : undefined),
    stream: ({ params }) => this.api.municipalities(params),
    defaultValue: [],
  });
  protected readonly municipalities = listOf(this.municipalitiesResource);
  protected readonly municipalityNames = computed(() => this.municipalities().map((place) => place.nome));
  protected readonly placesLoading = computed(() => this.regionsResource.isLoading() || this.provincesResource.isLoading() || this.municipalitiesResource.isLoading());
  protected readonly placesError = computed(() => [this.regionsResource.error(), this.provincesResource.error(), this.municipalitiesResource.error()].some((error) => error !== undefined));

  protected readonly assets = rxResource({ stream: () => this.api.findAll(), defaultValue: [] });
  private readonly register = listOf(this.assets);
  protected readonly query = signal('');
  private readonly matches = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.register().filter((asset) => `${asset.denominazione} ${asset.comune} ${asset.indirizzo}`.toLowerCase().includes(query));
  });
  protected readonly total = computed(() => this.matches().length);
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly page = pageIndex(this.query, this.pages);
  protected readonly visible = computed(() => this.matches().slice(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE));

  constructor() {
    afterNextRender(() => {
      const map = L.map(this.mapElement().nativeElement, { attributionControl: false, maxZoom: 18, minZoom: 8, maxBounds: [[-90, -180], [90, 180]], layers: [this.road] }).setView([45.481, 9.173], 15);
      L.control.scale({ imperial: false }).addTo(map);
      map.on('click', ({ latlng }) => {
        if (this.streetView()) window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latlng.lat},${latlng.lng}`, '_blank', 'noopener');
        else this.pick(latlng);
      });
      this.map = map;
      this.destroyRef.onDestroy(() => map.remove());
    });
  }

  private fromList(value: string, list: string[], field: string) {
    return value && !list.includes(value) ? { kind: 'unknown', message: `Pick a ${field} from the list` } : null;
  }

  protected selectRegion(region: string): void {
    this.selectionVersion++;
    this.resetLocation();
    this.asset.update((form) => ({ ...form, region, province: '', municipality: '', istatCode: '' }));
  }

  protected selectProvince(province: string): void {
    this.selectionVersion++;
    this.resetLocation();
    this.asset.update((form) => ({ ...form, province, municipality: '', istatCode: '' }));
  }

  protected selectMunicipality(name: string): void {
    this.selectionVersion++;
    this.resetLocation();
    const place = this.municipalities().find((municipality) => municipality.nome === name);
    this.asset.update((form) => ({ ...form, municipality: name, istatCode: istat(place?.codice) }));
    if (place) this.map?.flyTo(place.coordinate, 13);
  }

  protected toggleStreetView(): void {
    const on = !this.streetView();
    this.streetView.set(on);
    if (on) this.map?.addLayer(this.coverage);
    else this.coverage.remove();
    this.toast.show(on ? 'Click a blue street to open it in Street View.' : 'Street View mode is off.');
  }

  protected setSatellite(satellite: boolean): void {
    this.satellite.set(satellite);
    (satellite ? this.road : this.aerial).remove();
    this.map?.addLayer(satellite ? this.aerial : this.road);
  }

  protected async locateAddress(): Promise<void> {
    const { address, number, municipality } = this.asset();
    if (address && municipality) await this.locate(address, number, municipality);
    else this.resetLocation();
  }

  protected async useAsset(asset: Asset): Promise<void> {
    if (this.form().submitting()) return;
    const selection = ++this.selectionVersion;
    this.resetLocation();
    this.error.set('');
    const address = singleLine(asset.indirizzo);
    const goodNaming = singleLine(asset.denominazione);
    this.asset.set({ ...EMPTY, address, number: asset.civico || null, goodNaming, goodID: asset.idbene });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const place = await firstValueFrom(asset.prov ? this.api.findMunicipality(asset.comune, asset.prov) : of(undefined)).catch(() => undefined);
    if (selection !== this.selectionVersion || this.destroyRef.destroyed) return;
    this.asset.update((form) => ({
      ...form,
      region: place?.provincia.regione ?? '',
      province: place?.provincia.nome ?? '',
      municipality: place?.nome ?? '',
      istatCode: istat(place?.codice),
      address,
      number: asset.civico || null,
      goodNaming,
      goodID: asset.idbene,
    }));
    await this.locate(address, asset.civico, place?.nome ?? asset.comune);
  }

  protected retryPlaces(): void {
    this.regionsResource.reload();
    this.provincesResource.reload();
    this.municipalitiesResource.reload();
  }

  protected useMapCentre(): void {
    if (this.map) this.pick(this.map.getCenter());
  }

  protected async exportCsv(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      const csv = await firstValueFrom(this.api.exportForms());
      const text = await csv.slice(0, 65_536).text();
      this.csvPreview.set({ ...parseCsv(text, 10, csv.size <= 65_536), blob: csv });
      this.error.set('');
    } catch (error) {
      this.error.set(apiError(error, 'Could not download the CSV. Try again.'));
    } finally {
      this.exporting.set(false);
    }
  }

  protected closeCsv(event?: Event): void {
    event?.preventDefault();
    if (!this.savingCsv()) this.csvPreview.set(null);
  }

  protected async confirmCsv(): Promise<void> {
    const preview = this.csvPreview();
    if (!preview || this.savingCsv()) return;
    this.savingCsv.set(true);
    try {
      if (await saveCsv(preview.blob)) { this.csvPreview.set(null); this.toast.show('CSV saved or passed to your browser for download.'); }
    } catch (error) { this.error.set(apiError(error, 'Could not save the CSV. Try again.')); }
    finally { this.savingCsv.set(false); }
  }

  private resetLocation(): void {
    this.locationVersion++;
    this.locating.set(false);
    this.marker.remove();
    this.asset.update((asset) => ({ ...asset, latitude: null, longitude: null }));
  }

  private async locate(street: string, number: number | null, city: string): Promise<void> {
    this.resetLocation();
    const version = this.locationVersion;
    this.locating.set(true);
    const find = (street: string) => firstValueFrom(this.api.geocode(street, city)).catch(() => undefined);
    const place = (number ? await find(`${number} ${street}`) : undefined) ?? (await find(street));
    if (version !== this.locationVersion || this.destroyRef.destroyed) return;
    this.locating.set(false);
    if (place) {
      this.pick(L.latLng(place.lat, place.lng));
      this.map?.flyTo(place, 17);
    } else this.error.set('Address not found. Click the map or use its centre to choose a location.');
  }

  private pick(position: L.LatLng): void {
    this.selectionVersion++;
    this.locationVersion++;
    this.locating.set(false);
    this.error.set('');
    if (this.map) this.marker.setLatLng(position).addTo(this.map);
    this.asset.update((form) => ({ ...form, latitude: +position.lat.toFixed(6), longitude: +position.lng.toFixed(6) }));
  }

  private async save(): Promise<undefined> {
    if (this.locating() || this.placesLoading()) return undefined;
    const { number, goodID, istatCode, latitude, longitude, ...fields } = this.asset();
    if (latitude === null || longitude === null) return undefined;
    const asset = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, singleLine(value)])) as typeof fields;
    try {
      await firstValueFrom(
        this.api.save({ ...asset, number: number ?? 0, goodID: goodID ?? 0, istatCode: istatCode || null, latitude, longitude }),
      );
      this.asset.set({ ...EMPTY });
      this.form().reset();
      this.marker.remove();
      this.error.set('');
      this.toast.show(`${asset.goodNaming} was saved.`);
    } catch (error) {
      this.error.set(apiError(error, error instanceof HttpErrorResponse && error.status === 400 ? 'Some fields are not valid. Check them and try again.' : 'Could not save the asset. Try again.'));
    }
    return undefined;
  }
}
