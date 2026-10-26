import { afterNextRender, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { loadStreetView } from '../../shared/google-maps';
import { Navbar } from '../../shared/navbar';

const START = L.latLng(45.481, 9.173);
const GOOGLE_TILES = { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] };

@Component({
  selector: 'app-street-view',
  imports: [Navbar],
  template: `
    <main class="mx-auto flex min-h-dvh max-w-7xl flex-col gap-8 px-6 py-8 sm:px-12 lg:py-12">
      <app-navbar />
      <header class="flex flex-col gap-3">
        <h1 class="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Street View</h1>
        <p class="text-base text-base-content/70 sm:text-lg">Click a blue street on the map to look around from there.</p>
      </header>
      <div class="grid flex-1 gap-4 lg:grid-cols-2">
        <div #map class="h-[45svh] overflow-hidden rounded-box bg-base-200 shadow-md lg:h-auto lg:min-h-[28rem]"></div>
        <div class="relative h-[45svh] overflow-hidden rounded-box bg-base-200 shadow-md lg:h-auto lg:min-h-[28rem]">
          <div #panorama class="absolute inset-0"></div>
          @if (missing()) {
            <p class="absolute inset-0 grid place-items-center bg-base-200 px-6 text-center text-base-content/70">
              No Street View here. Try a blue street.
            </p>
          }
        </div>
      </div>
    </main>
  `,
})
export class StreetView {
  private readonly mapElement = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly panoramaElement = viewChild.required<ElementRef<HTMLElement>>('panorama');
  protected readonly missing = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(async () => {
      const map = L.map(this.mapElement().nativeElement, { attributionControl: false, maxZoom: 18, minZoom: 8, maxBounds: [[-90, -180], [90, 180]] }).setView(START, 15);
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', GOOGLE_TILES).addTo(map);
      L.tileLayer('https://{s}.google.com/vt/lyrs=svv|cb_client:apiv3&style=50&x={x}&y={y}&z={z}', GOOGLE_TILES).addTo(map);
      const marker = L.circleMarker(START, { radius: 8, color: '#fff', weight: 3, fillColor: '#18181b', fillOpacity: 1 }).addTo(map);
      destroyRef.onDestroy(() => map.remove());

      const { StreetViewPanorama, StreetViewService } = await loadStreetView();
      const panorama = new StreetViewPanorama(this.panoramaElement().nativeElement, {
        pov: { heading: 165, pitch: 0 },
        addressControl: false,
        motionTracking: false,
        motionTrackingControl: false,
        panControl: false,
        zoomControl: false,
      });
      const streetView = new StreetViewService();
      const show = async (location: google.maps.LatLngLiteral) => {
        try {
          const { data } = await streetView.getPanorama({ location, radius: 50, sources: ['google'] });
          panorama.setPano(data.location!.pano);
          this.missing.set(false);
        } catch {
          this.missing.set(true);
        }
      };
      map.on('click', (event) => show(event.latlng));
      panorama.addListener('position_changed', () => {
        const position = panorama.getPosition();
        if (position) {
          marker.setLatLng([position.lat(), position.lng()]);
          map.panTo([position.lat(), position.lng()]);
        }
      });
      show(START);
    });
  }
}
