import { afterNextRender, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { loadStreetView } from '../../shared/google-maps';
import { googleTiles } from '../../shared/google-tiles';
import { Navbar } from '../../shared/navbar';

const START = L.latLng(45.481, 9.173);

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
        <div #map role="region" aria-label="Street View location map" class="h-[45svh] overflow-hidden rounded-box bg-base-200 shadow-md lg:h-auto lg:min-h-[28rem]"></div>
        <div class="relative h-[45svh] overflow-hidden rounded-box bg-base-200 shadow-md lg:h-auto lg:min-h-[28rem]">
          <div #panorama class="absolute inset-0"></div>
          @if (loading()) {
            <p role="status" class="absolute inset-0 grid place-items-center bg-base-200 px-6 text-center text-base-content/70">Loading Street View…</p>
          }
          @if (error()) {
            <div role="alert" class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-base-200 px-6 text-center text-base-content/70">
              <p>{{ error() }}</p>
              <button class="btn btn-outline btn-sm" (click)="start()">Try again</button>
            </div>
          }
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
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  private map?: L.Map;
  private marker?: L.CircleMarker;
  private panorama?: google.maps.StreetViewPanorama;
  private requestVersion = 0;

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      void this.start();
    });
    this.destroyRef.onDestroy(() => {
      this.map?.remove();
      if (this.panorama) {
        this.panorama.setVisible(false);
        google.maps.event.clearInstanceListeners(this.panorama);
      }
    });
  }

  protected async start(): Promise<void> {
    this.error.set('');
    this.missing.set(false);
    this.loading.set(true);
    try {
      await this.setUp();
    } catch (error) {
      if (!this.destroyRef.destroyed) this.error.set(error instanceof Error ? error.message : 'Street View could not load. Try again.');
    } finally {
      if (!this.destroyRef.destroyed) this.loading.set(false);
    }
  }

  private async setUp(): Promise<void> {
    if (!this.map) {
      this.map = L.map(this.mapElement().nativeElement, { attributionControl: false, maxZoom: 18, minZoom: 8, maxBounds: [[-90, -180], [90, 180]] }).setView(START, 15);
      googleTiles('roads').addTo(this.map);
      googleTiles('street-view').addTo(this.map);
    }
    const map = this.map;
    const marker = this.marker ??= L.circleMarker(START, { radius: 8, color: '#fff', weight: 3, fillColor: '#18181b', fillOpacity: 1 }).addTo(map);

    const { StreetViewPanorama, StreetViewService } = await loadStreetView();
    if (this.destroyRef.destroyed) return;
    const panorama = new StreetViewPanorama(this.panoramaElement().nativeElement, {
      pov: { heading: 165, pitch: 0 },
      addressControl: false,
      motionTracking: false,
      motionTrackingControl: false,
      panControl: false,
      zoomControl: false,
    });
    this.panorama = panorama;
    const streetView = new StreetViewService();
    const show = async (location: google.maps.LatLngLiteral) => {
      const version = ++this.requestVersion;
      this.loading.set(true);
      try {
        const { data } = await streetView.getPanorama({ location, radius: 50, sources: ['google'] });
        if (this.destroyRef.destroyed || version !== this.requestVersion) return;
        if (!data.location?.pano) throw new Error('No panorama');
        panorama.setPano(data.location.pano);
        this.missing.set(false);
      } catch {
        if (!this.destroyRef.destroyed && version === this.requestVersion) this.missing.set(true);
      } finally {
        if (!this.destroyRef.destroyed && version === this.requestVersion) this.loading.set(false);
      }
    };
    map.off('click').on('click', (event) => void show(event.latlng));
    panorama.addListener('position_changed', () => {
      const position = panorama.getPosition();
      if (position) {
        marker.setLatLng([position.lat(), position.lng()]);
        map.panTo([position.lat(), position.lng()]);
      }
    });
    await show(START);
  }
}
