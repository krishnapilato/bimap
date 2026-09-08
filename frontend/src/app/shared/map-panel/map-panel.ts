/**
 * The map, and every control that belongs to it.
 *
 * Two providers behind one surface:
 *
 * - **Google Maps**, when a browser key is configured — on a hand-built light style, with a Street
 *   View panorama and a map / split / street switch. Street View is the reason to bother: a
 *   surveyor standing in front of a building wants to see the building.
 * - **Leaflet on OpenStreetMap**, when there is no key *or when Google refuses one* — a rejected
 *   key, a disabled API and an unpaid bill all look identical from the browser, and none of them is
 *   a reason to leave a dead grey rectangle on the page. The reason is logged rather than swallowed.
 *
 * Both providers' own control chrome is switched off and replaced with one cluster, so the buttons
 * do not move or restyle themselves when the provider changes underneath. Pan, zoom, recentre and
 * basemap all work the same either way.
 *
 * The wheel does not zoom. On a page where scrolling means something, a map that swallows the wheel
 * is a trap; the visitor gets buttons, drag, pinch and ctrl+wheel instead.
 *
 * The Google key ships inside the bundle because a Maps JS browser key has to: it is restricted by
 * HTTP referrer in the Cloud console, not by secrecy. Note also that with `loading=async` the
 * constructors and enums arrive with their libraries, not with the script — reaching for
 * `google.maps.Map` straight after `onload` throws.
 *
 * @author Khova Krishna Pilato
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type * as Leaflet from 'leaflet';

import { environment } from '../../../environments/environment';
import { prefersReducedMotion } from '../../core/motion/motion';

export type MapView = 'map' | 'split' | 'street';

/** Somewhere over central Italy: what the map shows before anything has been chosen. */
const ITALY = { lat: 41.8955, lng: 12.4823 } as const;

/** How far one press of a pan arrow moves the map, in pixels. */
const PAN_STEP = 120;

/** The same cobalt dot both providers drop, drawn once so they cannot drift apart. */
const PIN = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">' +
    '<circle cx="11" cy="11" r="7" fill="#1157e3" stroke="#ffffff" stroke-width="3"/></svg>',
)}`;

/**
 * A light basemap with the chrome turned down: no business pins, no transit clutter, roads in white
 * and water in the same cool tone the rest of the product uses. Applied as `styles` rather than a
 * cloud-configured `mapId`, because a style that travels with the code cannot drift from it.
 */
const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f7f8fb' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7a90' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#dfe5ee' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e9f0e6' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e6ebf2' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fdf4e8' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#f0dcc2' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dce6f2' }] },
];

/**
 * Leaflet is CommonJS, so a dynamic import hands back a namespace whose entire API sits under
 * `default` — `leaflet.map` is undefined, the call throws inside a promise nobody awaits, and the
 * panel spins forever with no error anywhere. Unwrap it once, here.
 */
let leafletLoading: Promise<typeof Leaflet> | null = null;

function leafletModule(): Promise<typeof Leaflet> {
  leafletLoading ??= import('leaflet').then((module) => {
    const candidate = (module as { default?: typeof Leaflet }).default ?? module;
    return (typeof candidate.map === 'function' ? candidate : module) as typeof Leaflet;
  });

  return leafletLoading;
}

interface GoogleApi {
  readonly maps: typeof google.maps;
  readonly mapsLibrary: google.maps.MapsLibrary;
  readonly markers: google.maps.MarkerLibrary;
  readonly streetView: google.maps.StreetViewLibrary;
}

/** One script tag for the whole application, however many maps ask for it. */
let googleLoading: Promise<GoogleApi> | null = null;

function googleApi(key: string): Promise<GoogleApi> {
  googleLoading ??= new Promise<typeof google.maps>((resolve, reject) => {
    const global = globalThis as {
      google?: { maps?: typeof google.maps };
      gm_authFailure?: () => void;
    };

    // Google reports a rejected key by calling this, not by failing the request.
    global.gm_authFailure = () => reject(new Error('Google Maps rejected the API key'));

    if (global.google?.maps) {
      resolve(global.google.maps);
      return;
    }

    const script = document.createElement('script');
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
      '&loading=async&v=weekly';
    script.async = true;
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    script.onload = () => {
      const maps = global.google?.maps;
      maps ? resolve(maps) : reject(new Error('Google Maps loaded without an API'));
    };

    document.head.append(script);
  }).then(async (maps) => {
    const [mapsLibrary, markers, streetView] = await Promise.all([
      maps.importLibrary('maps') as Promise<google.maps.MapsLibrary>,
      maps.importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
      maps.importLibrary('streetView') as Promise<google.maps.StreetViewLibrary>,
    ]);

    return { maps, mapsLibrary, markers, streetView };
  });

  return googleLoading;
}

@Component({
  selector: 'bm-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative h-full w-full overflow-hidden">
      <div
        class="grid h-full w-full"
        [class.grid-rows-2]="view() === 'split'"
        [class.gap-px]="view() === 'split'"
        [class.bg-hairline]="view() === 'split'"
      >
        <div #canvas class="min-h-0 w-full" [class.hidden]="view() === 'street'"></div>
        @if (streetCapable()) {
          <div #pano class="min-h-0 w-full" [class.hidden]="view() === 'map'"></div>
        }
      </div>

      @if (failed()) {
        <div class="absolute inset-0 grid place-items-center bg-base-200/70 px-4 text-center">
          <span class="text-label font-semibold text-ink-3">
            <span class="material-symbols-rounded block text-[1.5rem]">map</span>
            The basemap could not load. Everything else still works.
          </span>
        </div>
      } @else if (!ready()) {
        <div class="absolute inset-0 grid place-items-center bg-base-200/60">
          <span class="flex items-center gap-2 text-label font-semibold text-ink-3">
            <span class="loading loading-spinner loading-xs"></span>
            Loading the basemap
          </span>
        </div>
      }

      <!-- Chrome sits in a layer that ignores the pointer, so the map keeps its drag. -->
      <div class="bm-overlay">
        @if (ready()) {
          <!-- Zoom, recentre, basemap, and what to look at -->
          <div class="pointer-events-auto absolute right-3 top-3 grid gap-2 justify-items-end">
            @if (streetCapable()) {
              <div class="bm-map-cluster flex">
                @for (option of views; track option.id) {
                  <span class="tooltip tooltip-left" [attr.data-tip]="option.label">
                    <button
                      type="button"
                      class="bm-map-btn"
                      [class.bg-primary]="view() === option.id"
                      [class.text-primary-content]="view() === option.id"
                      [disabled]="option.id !== 'map' && !streetAvailable()"
                      [attr.aria-label]="option.label"
                      [attr.aria-pressed]="view() === option.id"
                      (click)="view.set(option.id)"
                    >
                      <span class="material-symbols-rounded text-[1.05rem]">{{ option.icon }}</span>
                    </button>
                  </span>
                }
              </div>
            }

            <div class="bm-map-cluster grid">
              <button type="button" class="bm-map-btn border-b border-hairline" aria-label="Zoom in" (click)="zoomBy(1)">
                <span class="material-symbols-rounded text-[1.05rem]">add</span>
              </button>
              <button type="button" class="bm-map-btn" aria-label="Zoom out" (click)="zoomBy(-1)">
                <span class="material-symbols-rounded text-[1.05rem]">remove</span>
              </button>
            </div>

            <span class="tooltip tooltip-left" data-tip="Centre on the selection">
              <button
                type="button"
                class="bm-map-cluster bm-map-btn"
                [disabled]="!hasPosition()"
                aria-label="Centre on the selection"
                (click)="recentre()"
              >
                <span class="material-symbols-rounded text-[1.05rem]">my_location</span>
              </button>
            </span>

            <span class="tooltip tooltip-left" [attr.data-tip]="satellite() ? 'Plain basemap' : 'Satellite'">
              <button
                type="button"
                class="bm-map-cluster bm-map-btn"
                [class.text-primary]="satellite()"
                [attr.aria-pressed]="satellite()"
                aria-label="Switch basemap"
                (click)="toggleBasemap()"
              >
                <span class="material-symbols-rounded text-[1.05rem]">layers</span>
              </button>
            </span>
          </div>

          <!--
            Pan, for anyone who would rather press than drag. Top right with the rest of the
            controls, not bottom left, because bottom left is where the record floats — and a
            control a panel sits on top of is a control nobody can press.
          -->
          <div
            class="pointer-events-auto absolute right-3 top-[10.5rem] grid grid-cols-3 grid-rows-3 gap-px"
            role="group"
            aria-label="Pan the map"
          >
            <span></span>
            <button type="button" class="bm-map-cluster bm-map-btn" aria-label="Pan north" (click)="panBy(0, -1)">
              <span class="material-symbols-rounded text-[1rem]">keyboard_arrow_up</span>
            </button>
            <span></span>
            <button type="button" class="bm-map-cluster bm-map-btn" aria-label="Pan west" (click)="panBy(-1, 0)">
              <span class="material-symbols-rounded text-[1rem]">keyboard_arrow_left</span>
            </button>
            <span></span>
            <button type="button" class="bm-map-cluster bm-map-btn" aria-label="Pan east" (click)="panBy(1, 0)">
              <span class="material-symbols-rounded text-[1rem]">keyboard_arrow_right</span>
            </button>
            <span></span>
            <button type="button" class="bm-map-cluster bm-map-btn" aria-label="Pan south" (click)="panBy(0, 1)">
              <span class="material-symbols-rounded text-[1rem]">keyboard_arrow_down</span>
            </button>
            <span></span>
          </div>
        }

        @if (streetCapable() && view() !== 'map' && !streetAvailable() && ready()) {
          <p
            class="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-field
                   bg-base-100/92 px-3 py-1 text-label font-medium text-ink-3"
          >
            No street imagery within 50 m of this point.
          </p>
        }
      </div>
    </div>
  `,
})
export class MapPanelComponent {
  readonly latitude = input<number | null>(null);
  readonly longitude = input<number | null>(null);
  readonly zoom = input(14);

  protected readonly view = signal<MapView>('map');
  protected readonly ready = signal(false);
  protected readonly failed = signal(false);
  protected readonly satellite = signal(false);
  protected readonly streetAvailable = signal(false);
  /** Only true once Google is actually running — a refused key sets it back to false. */
  protected readonly streetCapable = signal(false);

  protected readonly views = [
    { id: 'map' as const, icon: 'map', label: 'Map' },
    { id: 'split' as const, icon: 'vertical_split', label: 'Split view' },
    { id: 'street' as const, icon: 'streetview', label: 'Street View' },
  ];

  private readonly canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');
  private readonly pano = viewChild<ElementRef<HTMLElement>>('pano');

  readonly #destroyRef = inject(DestroyRef);
  readonly #position = computed<google.maps.LatLngLiteral | null>(() => {
    const latitude = this.latitude();
    const longitude = this.longitude();
    return latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null;
  });

  protected readonly hasPosition = computed(() => this.#position() !== null);

  #api: GoogleApi | null = null;
  #googleMap: google.maps.Map | null = null;
  #googleMarker: google.maps.Marker | null = null;
  #panorama: google.maps.StreetViewPanorama | null = null;
  #streetService: google.maps.StreetViewService | null = null;

  #leaflet: typeof Leaflet | null = null;
  #leafletMap: Leaflet.Map | null = null;
  #leafletMarker: Leaflet.Marker | null = null;
  #leafletTiles: Leaflet.TileLayer | null = null;

  constructor() {
    afterNextRender(() => void this.#start());

    effect(() => {
      // Read both so the effect re-runs whenever the selection moves.
      this.#position();
      this.zoom();
      this.#place();
    });

    effect(() => {
      // Neither provider draws into a container that was display:none when it was created, and the
      // panorama only exists once somebody asks to see it.
      const view = this.view();
      queueMicrotask(() => {
        this.#resize();
        if (view !== 'map') {
          this.#showPanorama();
        }
      });
    });
  }

  // ── Controls, provider-agnostic ────────────────────────────────────────────

  protected zoomBy(delta: number): void {
    if (this.#googleMap) {
      this.#googleMap.setZoom((this.#googleMap.getZoom() ?? 5) + delta);
      return;
    }
    delta > 0 ? this.#leafletMap?.zoomIn() : this.#leafletMap?.zoomOut();
  }

  protected panBy(x: number, y: number): void {
    this.#googleMap?.panBy(x * PAN_STEP, y * PAN_STEP);
    this.#leafletMap?.panBy([x * PAN_STEP, y * PAN_STEP]);
  }

  protected recentre(): void {
    const position = this.#position();
    if (!position) {
      return;
    }
    this.#googleMap?.panTo(position);
    this.#leafletMap?.panTo([position.lat, position.lng]);
  }

  protected toggleBasemap(): void {
    const next = !this.satellite();
    this.satellite.set(next);

    if (this.#googleMap && this.#api) {
      this.#googleMap.setMapTypeId(next ? 'hybrid' : 'roadmap');
      // The hand-built style only applies to the plain basemap; over imagery it does nothing good.
      this.#googleMap.setOptions({ styles: next ? [] : LIGHT_STYLE });
      return;
    }

    if (this.#leafletMap && this.#leaflet) {
      this.#leafletTiles?.remove();
      this.canvas().nativeElement.classList.toggle('bm-basemap', !next);
      this.#leafletTiles = this.#leaflet
        .tileLayer(
          next
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            maxZoom: 19,
            attribution: next ? '&copy; Esri, Maxar, Earthstar Geographics' : '&copy; OpenStreetMap contributors',
          },
        )
        .addTo(this.#leafletMap);
    }
  }

  // ── Start-up ───────────────────────────────────────────────────────────────

  async #start(): Promise<void> {
    if (environment.googleMapsApiKey.length > 0) {
      try {
        await this.#startGoogle();
        return;
      } catch (failure) {
        // A refused key, a disabled API and an unpaid bill are indistinguishable from here, and
        // none of them is a reason to show a dead rectangle — so the keyless provider takes over.
        // The reason is still printed: a silent fallback is how a one-line mistake in this file
        // spends an afternoon masquerading as a billing problem.
        console.warn('[BiMap] Google Maps unavailable, falling back to OpenStreetMap:', failure);
      }
    }

    try {
      await this.#startLeaflet();
    } catch {
      this.failed.set(true);
    }
  }

  async #startGoogle(): Promise<void> {
    const api = await googleApi(environment.googleMapsApiKey);
    const position = this.#position();

    this.#api = api;
    this.#googleMap = new api.mapsLibrary.Map(this.canvas().nativeElement, {
      center: position ?? { ...ITALY },
      zoom: position ? this.zoom() : 5,
      styles: LIGHT_STYLE,
      // Every control is ours, so none of Google's are drawn.
      disableDefaultUI: true,
      gestureHandling: 'cooperative',
      clickableIcons: false,
      keyboardShortcuts: false,
    });

    this.#streetService = new api.streetView.StreetViewService();
    this.streetCapable.set(true);
    this.ready.set(true);
    this.#place();

    const observer = new ResizeObserver(() => this.#resize());
    observer.observe(this.canvas().nativeElement);

    this.#destroyRef.onDestroy(() => {
      observer.disconnect();
      this.#googleMap = null;
      this.#panorama = null;
      this.#api = null;
    });
  }

  async #startLeaflet(): Promise<void> {
    const leaflet = await leafletModule();

    const map = leaflet.map(this.canvas().nativeElement, {
      center: [ITALY.lat, ITALY.lng],
      zoom: 5,
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    this.#leaflet = leaflet;
    this.#leafletTiles = leaflet
      .tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      })
      .addTo(map);

    map.attributionControl.setPrefix('');

    // OSM's own tiles are drawn for a page that is all map; behind a light product UI they read as
    // loud and slightly green, and toning them down costs nothing and keeps the basemap keyless.
    this.canvas().nativeElement.classList.add('bm-basemap');

    this.#leafletMap = map;
    this.streetCapable.set(false);
    this.view.set('map');
    this.ready.set(true);
    this.#place();

    // Leaflet caches the container size at construction, and here the container is a flex child
    // still settling — it lands on whatever it measured first and draws one band of tiles into a
    // pane it thinks is tiny. Telling it to look again once the layout has run is the whole fix.
    const resize = () => map.invalidateSize({ animate: false });
    map.whenReady(resize);
    requestAnimationFrame(resize);
    const settle = setTimeout(resize, 300);

    const observer = new ResizeObserver(resize);
    observer.observe(this.canvas().nativeElement);

    this.#destroyRef.onDestroy(() => {
      clearTimeout(settle);
      observer.disconnect();
      map.remove();
      this.#leafletMap = null;
      this.#leafletMarker = null;
    });
  }

  #resize(): void {
    if (this.#api && this.#googleMap) {
      this.#api.maps.event.trigger(this.#googleMap, 'resize');
    }
    this.#leafletMap?.invalidateSize({ animate: false });
  }

  // ── Where the pin goes ─────────────────────────────────────────────────────

  #place(): void {
    const position = this.#position();

    if (this.#api && this.#googleMap) {
      this.#placeOnGoogle(this.#api, this.#googleMap, position);
      return;
    }

    if (this.#leafletMap) {
      void leafletModule().then((leaflet) => this.#placeOnLeaflet(leaflet, position));
    }
  }

  #placeOnGoogle(
    api: GoogleApi,
    map: google.maps.Map,
    position: google.maps.LatLngLiteral | null,
  ): void {
    if (!position) {
      this.#googleMarker?.setMap(null);
      this.#googleMarker = null;
      this.streetAvailable.set(false);
      map.setCenter({ ...ITALY });
      map.setZoom(5);
      return;
    }

    if (this.#googleMarker) {
      this.#googleMarker.setPosition(position);
    } else {
      this.#googleMarker = new api.markers.Marker({
        map,
        position,
        icon: {
          url: PIN,
          scaledSize: new api.maps.Size(22, 22),
          anchor: new api.maps.Point(11, 11),
        },
      });
    }

    prefersReducedMotion() ? map.setCenter(position) : map.panTo(position);
    map.setZoom(this.zoom());

    // Whether there is anything to look at decides whether the switch offers the panorama at all.
    this.#streetService?.getPanorama({ location: position, radius: 50 }, (_data, status) => {
      const found = status === api.maps.StreetViewStatus.OK;
      this.streetAvailable.set(found);

      if (!found && this.view() !== 'map') {
        this.view.set('map');
      } else if (found && this.view() !== 'map') {
        this.#showPanorama();
      }
    });
  }

  #placeOnLeaflet(leaflet: typeof Leaflet, position: google.maps.LatLngLiteral | null): void {
    const map = this.#leafletMap;
    if (!map) {
      return;
    }

    if (!position) {
      this.#leafletMarker?.remove();
      this.#leafletMarker = null;
      map.setView([ITALY.lat, ITALY.lng], 5);
      return;
    }

    const point: [number, number] = [position.lat, position.lng];

    if (this.#leafletMarker) {
      this.#leafletMarker.setLatLng(point);
    } else {
      this.#leafletMarker = leaflet
        .marker(point, {
          keyboard: false,
          icon: leaflet.divIcon({
            className: '',
            html: '<span class="bm-pin"></span>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        })
        .addTo(map);
    }

    prefersReducedMotion()
      ? map.setView(point, this.zoom())
      : map.flyTo(point, this.zoom(), { duration: 1 });
  }

  /** Built the first time it is asked for, then only moved. */
  #showPanorama(): void {
    const host = this.pano()?.nativeElement;
    const position = this.#position();
    const api = this.#api;

    if (!host || !position || !api || !this.streetAvailable()) {
      return;
    }

    if (this.#panorama) {
      this.#panorama.setPosition(position);
      api.maps.event.trigger(this.#panorama, 'resize');
      return;
    }

    this.#panorama = new api.streetView.StreetViewPanorama(host, {
      position,
      pov: { heading: 0, pitch: 0 },
      zoom: 0,
      addressControl: false,
      fullscreenControl: false,
      motionTracking: false,
      motionTrackingControl: false,
      linksControl: true,
      panControl: true,
      enableCloseButton: false,
    });
  }
}
