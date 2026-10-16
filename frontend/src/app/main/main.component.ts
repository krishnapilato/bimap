import { HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, FormField, FormRoot, readonly, required, validate } from '@angular/forms/signals';
import * as L from 'leaflet';
import { firstValueFrom, of } from 'rxjs';
import { NavbarComponent } from '../navbar.component';
import { ApiService } from './api.service';
import { Tables } from './tables';

const PAGE_SIZE = 5;
const TILES = { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] };
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

@Component({
  selector: 'app-main',
  imports: [FormField, FormRoot, NavbarComponent],
  templateUrl: './main.component.html',
})
export class MainComponent {
  private readonly api = inject(ApiService);
  private readonly mapElement = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly road = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', TILES);
  private readonly aerial = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', TILES);
  private readonly coverage = L.tileLayer('https://{s}.google.com/vt/lyrs=svv|cb_client:apiv3&style=50&x={x}&y={y}&z={z}', TILES);
  private readonly marker = L.circleMarker([0, 0], { radius: 8, color: '#fff', weight: 3, fillColor: '#18181b', fillOpacity: 1 });
  private map?: L.Map;

  protected readonly satellite = signal(false);
  protected readonly streetView = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  private readonly asset = signal({ ...EMPTY });
  protected readonly form = form(
    this.asset,
    (asset) => {
      required(asset.region);
      required(asset.province);
      required(asset.municipality);
      validate(asset.region, ({ value }) => this.fromList(value(), this.regions.value(), 'region'));
      validate(asset.province, ({ value }) => this.fromList(value(), this.provinces.value(), 'province'));
      validate(asset.municipality, ({ value }) => this.fromList(value(), this.municipalities.value().map((place) => place.nome), 'municipality'));
      required(asset.address);
      required(asset.goodNaming);
      required(asset.latitude);
      required(asset.longitude);
      readonly(asset.istatCode);
      readonly(asset.latitude);
      readonly(asset.longitude);
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: () => this.error.set('Choose the place, fill in the address and asset name, then click the map to set the coordinates.'),
      },
    },
  );

  protected readonly regions = rxResource({ stream: () => this.api.regions(), defaultValue: [] });
  protected readonly provinces = rxResource({
    params: () => (this.regions.value().includes(this.asset().region) ? this.asset().region : undefined),
    stream: ({ params }) => this.api.provinces(params),
    defaultValue: [],
  });
  protected readonly municipalities = rxResource({
    params: () => (this.provinces.value().includes(this.asset().province) ? this.asset().province : undefined),
    stream: ({ params }) => this.api.municipalities(params),
    defaultValue: [],
  });

  protected readonly assets = rxResource({ stream: () => this.api.findAll(), defaultValue: [] });
  protected readonly query = signal('');
  protected readonly page = linkedSignal({ source: this.query, computation: () => 0 });
  private readonly matches = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.assets.value().filter((asset) => `${asset.denominazione} ${asset.comune} ${asset.indirizzo}`.toLowerCase().includes(query));
  });
  protected readonly total = computed(() => this.matches().length);
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly visible = computed(() => this.matches().slice(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE));

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const map = L.map(this.mapElement().nativeElement, { attributionControl: false, layers: [this.road] }).setView([42.5, 12.5], 6);
      L.control.scale({ imperial: false }).addTo(map);
      map.on('click', ({ latlng }) =>
        this.streetView()
          ? window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latlng.lat},${latlng.lng}`, '_blank', 'noopener')
          : this.pick(latlng),
      );
      this.map = map;
      destroyRef.onDestroy(() => map.remove());
    });
  }

  private fromList(value: string, list: string[], field: string) {
    return value && list.length && !list.includes(value) ? { kind: 'unknown', message: `Pick a ${field} from the list` } : null;
  }

  protected selectRegion(region: string): void {
    if (region === this.asset().region && !this.asset().province) return;
    this.asset.update((form) => ({ ...form, region, province: '', municipality: '', istatCode: '' }));
  }

  protected selectProvince(province: string): void {
    if (province === this.asset().province && !this.asset().municipality) return;
    this.asset.update((form) => ({ ...form, province, municipality: '', istatCode: '' }));
  }

  protected selectMunicipality(name: string): void {
    const place = this.municipalities.value().find((municipality) => municipality.nome === name);
    this.asset.update((form) => ({ ...form, municipality: name, istatCode: place?.codice ?? '' }));
    if (place) this.map?.flyTo(place.coordinate, 13);
  }

  protected toggleStreetView(): void {
    const on = !this.streetView();
    this.streetView.set(on);
    if (on) this.map?.addLayer(this.coverage);
    else this.coverage.remove();
    this.show(on ? 'Click a blue street to open it in Street View.' : 'Street View mode is off.');
  }

  protected setSatellite(satellite: boolean): void {
    this.satellite.set(satellite);
    (satellite ? this.road : this.aerial).remove();
    this.map?.addLayer(satellite ? this.aerial : this.road);
  }

  protected async locateAddress(): Promise<void> {
    const { address, number, municipality } = this.asset();
    if (address && municipality) await this.locate(address, number, municipality);
  }

  protected async useAsset(asset: Tables): Promise<void> {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const place = await firstValueFrom(asset.prov ? this.api.findMunicipality(asset.comune, asset.prov) : of(undefined)).catch(() => undefined);
    this.asset.update((form) => ({
      ...form,
      region: place?.provincia.regione ?? '',
      province: place?.provincia.nome ?? '',
      municipality: place?.nome ?? '',
      istatCode: place?.codice ?? '',
      address: asset.indirizzo,
      number: asset.civico || null,
      goodNaming: asset.denominazione,
      goodID: asset.idbene,
    }));
    await this.locate(asset.indirizzo, asset.civico, place?.nome ?? asset.comune);
  }

  protected async exportCsv(): Promise<void> {
    const csv = await firstValueFrom(this.api.exportForms());
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(csv), download: 'forms.csv' });
    link.click();
    URL.revokeObjectURL(link.href);
  }

  private async locate(street: string, number: number | null, city: string): Promise<void> {
    const find = (street: string) => firstValueFrom(this.api.geocode(street, city)).catch(() => undefined);
    const place = (number && (await find(`${number} ${street}`))) || (await find(street));
    if (place) {
      this.pick(L.latLng(place.lat, place.lng));
      this.map?.flyTo(place, 17);
    }
  }

  private pick(position: L.LatLng): void {
    if (this.map) this.marker.setLatLng(position).addTo(this.map);
    this.asset.update((form) => ({ ...form, latitude: +position.lat.toFixed(6), longitude: +position.lng.toFixed(6) }));
  }

  private async save(): Promise<undefined> {
    const { number, goodID, istatCode, latitude, longitude, ...asset } = this.asset();
    try {
      await firstValueFrom(
        this.api.save({ ...asset, number: number ?? 0, goodID: goodID ?? 0, istatCode: istatCode || null, latitude: latitude!, longitude: longitude! }),
      );
      this.asset.set({ ...EMPTY });
      this.form().reset();
      this.marker.remove();
      this.error.set('');
      this.show(`${asset.goodNaming} was saved.`);
    } catch (error) {
      this.error.set((error as HttpErrorResponse).status === 400 ? 'Some fields are not valid. Check them and try again.' : 'Could not save the asset. Try again.');
    }
    return undefined;
  }

  private noticeTimer?: ReturnType<typeof setTimeout>;

  private show(notice: string): void {
    clearTimeout(this.noticeTimer);
    this.notice.set(notice);
    this.noticeTimer = setTimeout(() => this.notice.set(''), 3000);
  }
}
