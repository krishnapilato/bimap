import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { gsap } from 'gsap';
import * as L from 'leaflet';

import { MotionService } from '../core/motion';

declare var google: any;

const MIN_SPLIT = 20;
const MAX_SPLIT = 80;
const KEY_STEP = 2;

/** Which surfaces the canvas is showing. */
export type MapViewMode = 'map' | 'split' | 'street';

@Component({
  selector: 'app-streetview',
  standalone: true,
  imports: [MatTooltipModule, MatIconModule],
  templateUrl: 'streetview.html',
  styleUrl: 'streetview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreetviewComponent implements AfterViewInit, OnDestroy {
  private readonly mapWrapper = viewChild<ElementRef<HTMLDivElement>>('mapWrapper');
  private readonly zone = inject(NgZone);
  private readonly motion = inject(MotionService);

  private leafletMap?: L.Map;
  private streetViewPanorama?: any;
  private currentMarker?: L.Marker;
  private cachedMarkerShell?: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private streetViewResizeObserver?: ResizeObserver;
  private streetViewResizeFrame?: number;
  private panoramaPositionFrame?: number;
  private panoramaPovFrame?: number;
  private movePending = false;
  private wasMobileViewport = false;

  private readonly initialLat = 45.46965468279425;
  private readonly initialLng = 9.182206569945924;
  private currentHeading = 165;
  private focusPulseTimeout?: number;

  /** Map only, both panes, or Street View only. */
  readonly mode = input<MapViewMode>('split');

  readonly leftWidth = signal(50);
  readonly isDragging = signal(false);
  readonly isMobileViewport = signal(false);
  readonly currentCoords = signal('45.4697, 9.1822');

  readonly mapDoubleClick = output<{ lat: number; lng: number }>();

  /** Pane sizes for the current mode; a hidden pane collapses to nothing. */
  readonly mapBasis = computed(() => {
    const mode = this.mode();

    if (mode === 'map') return 100;
    if (mode === 'street') return 0;

    return this.leftWidth();
  });

  readonly streetBasis = computed(() => 100 - this.mapBasis());

  constructor() {
    // Both APIs cache their container size, so a mode change has to be
    // followed by an explicit resize or the newly revealed pane renders stale.
    // Neither pane is ever collapsed to zero — see the stacking rules in the
    // stylesheet for why.
    effect(() => {
      this.mode();

      this.queueMapResize();
      this.queueStreetViewResize();
      this.revealActivePane();
    });
  }

  /**
   * Softens the mode switch.
   *
   * Panes are layered rather than collapsed (see the stacking rules in the
   * stylesheet), so without this the incoming surface simply blinks into
   * existence. A short scale-and-fade on the pane coming forward makes the
   * switch read as one camera moving rather than two images swapping.
   */
  private revealActivePane(): void {
    if (!this.motion.enabled()) return;

    requestAnimationFrame(() => {
      const front = this.mapWrapper()?.nativeElement.querySelector('.map-pane.is-front');
      if (!front) return;

      gsap.fromTo(
        front,
        { opacity: 0.55, scale: 1.015 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'bmGlide', overwrite: 'auto' },
      );
    });
  }

  ngAfterViewInit(): void {
    this.updateViewportMode();

    this.initLeaflet();
    this.initStreetView();
    this.setupResizeObserver();

    setTimeout(() => {
      this.syncMaps();
      this.updatePosition(this.initialLat, this.initialLng);
      this.recenterLeaflet();
    }, 100);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportMode();
  }

  ngOnDestroy(): void {
    if (this.focusPulseTimeout) window.clearTimeout(this.focusPulseTimeout);
    if (this.streetViewResizeFrame) cancelAnimationFrame(this.streetViewResizeFrame);
    if (this.panoramaPositionFrame) cancelAnimationFrame(this.panoramaPositionFrame);
    if (this.panoramaPovFrame) cancelAnimationFrame(this.panoramaPovFrame);

    this.resizeObserver?.disconnect();
    this.streetViewResizeObserver?.disconnect();
    if (this.streetViewPanorama && typeof google !== 'undefined') {
      google.maps.event.clearInstanceListeners(this.streetViewPanorama);
    }
    this.leafletMap?.remove();
  }

  // ── Split handle ───────────────────────────────────────────────────────────
  //  Pointer events cover mouse, touch and pen with one code path, and pointer
  //  capture keeps the drag alive when the pointer leaves the handle — so no
  //  document-level listeners are needed.

  onPointerDown(event: PointerEvent): void {
    event.preventDefault();

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.isDragging.set(true);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging() || this.movePending) return;

    const { clientX, clientY } = event;
    this.movePending = true;

    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.movePending = false;
        if (!this.isDragging()) return;

        const wrapper = this.mapWrapper()?.nativeElement;
        if (!wrapper) return;

        const rect = wrapper.getBoundingClientRect();
        const raw = this.isMobileViewport()
          ? ((clientY - rect.top) / rect.height) * 100
          : ((clientX - rect.left) / rect.width) * 100;

        this.zone.run(() => this.leftWidth.set(this.clampSplit(raw)));
      });
    });
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.isDragging()) return;

    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
    this.isDragging.set(false);
    this.queueMapResize();
  }

  /** Keyboard equivalent of dragging, so the split is operable without a pointer. */
  onSeparatorKeydown(event: KeyboardEvent): void {
    const mobile = this.isMobileViewport();
    const decreaseKey = mobile ? 'ArrowUp' : 'ArrowLeft';
    const increaseKey = mobile ? 'ArrowDown' : 'ArrowRight';

    let next: number | null = null;

    switch (event.key) {
      case decreaseKey:
        next = this.leftWidth() - KEY_STEP;
        break;
      case increaseKey:
        next = this.leftWidth() + KEY_STEP;
        break;
      case 'Home':
        next = MIN_SPLIT;
        break;
      case 'End':
        next = MAX_SPLIT;
        break;
      case 'Enter':
      case ' ':
        next = 50;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.leftWidth.set(this.clampSplit(next));
    this.queueMapResize();
  }

  resetSplit(): void {
    this.leftWidth.set(50);
    this.queueMapResize();
    this.recenterLeaflet();
  }

  private clampSplit(value: number): number {
    return Math.round(Math.max(MIN_SPLIT, Math.min(MAX_SPLIT, value)));
  }

  // ── Viewport ───────────────────────────────────────────────────────────────

  private updateViewportMode(): void {
    const mobile = window.innerWidth <= 900;

    if (mobile !== this.wasMobileViewport) {
      this.leftWidth.set(50);
      this.queueMapResize();
    }

    this.wasMobileViewport = mobile;
    this.isMobileViewport.set(mobile);
  }

  private setupResizeObserver(): void {
    const leafletContainer = document.getElementById('leafletMap');
    const streetViewContainer = document.getElementById('streetView');
    if (!leafletContainer && !streetViewContainer) return;

    this.resizeObserver = new ResizeObserver(() => this.queueMapResize());
    if (leafletContainer) this.resizeObserver.observe(leafletContainer);

    this.streetViewResizeObserver = new ResizeObserver(() => {
      this.queueStreetViewResize();
    });

    if (streetViewContainer) this.streetViewResizeObserver.observe(streetViewContainer);
  }

  private updateCurrentCoords(lat: number, lng: number): void {
    this.currentCoords.set(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  }

  // ── Maps ───────────────────────────────────────────────────────────────────

  private initLeaflet(): void {
    const googleRoad = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '© Google',
      maxZoom: 21,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      noWrap: true,
    });

    const streetViewCoverage = L.tileLayer(
      'https://{s}.google.com/vt/?lyrs=svv|cb_client:apiv3&style=50&x={x}&y={y}&z={z}',
      {
        maxZoom: 21,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        opacity: 0.5,
        noWrap: true,
      },
    );

    this.leafletMap = L.map('leafletMap', {
      zoomControl: false,
      attributionControl: false,
      doubleClickZoom: false,
      minZoom: 3,
      maxZoom: 21,
      maxBounds: [
        [-90, -180],
        [90, 180],
      ],
      maxBoundsViscosity: 1.0,
    }).setView([this.initialLat, this.initialLng], 16);

    this.handleMapDoubleClick();
    L.layerGroup([googleRoad, streetViewCoverage]).addTo(this.leafletMap);

    this.currentMarker = L.marker([this.initialLat, this.initialLng], {
      icon: this.createFovIcon(this.currentHeading),
      zIndexOffset: 1000,
    }).addTo(this.leafletMap);

    this.currentMarker.on('click', () => this.recenterLeaflet());
    this.currentMarker.on('add', () => this.updateMarkerRotation(this.currentHeading));
  }

  private initStreetView(): void {
    const container = document.getElementById('streetView');
    if (!container || typeof google === 'undefined') {
      console.warn('Google Maps API not available');
      return;
    }

    this.streetViewPanorama = new google.maps.StreetViewPanorama(container, {
      position: { lat: this.initialLat, lng: this.initialLng },
      pov: { heading: this.currentHeading, pitch: 0 },
      zoom: 1.2,
      addressControl: false,
      gyroscopeControl: false,
      linksControl: true,
      enableCloseButton: false,
      motionTracking: true,
      clickToGo: true,
      fullscreenControl: true,
      disableDefaultUI: true,
      panControl: false,
      zoomControl: false,
      motionTrackingControl: false,
    });
  }

  private syncMaps(): void {
    if (!this.leafletMap || !this.streetViewPanorama) return;

    this.leafletMap.on('click', (e: L.LeafletMouseEvent) =>
      this.updatePosition(e.latlng.lat, e.latlng.lng),
    );

    this.zone.runOutsideAngular(() => {
      google.maps.event.addListener(this.streetViewPanorama, 'position_changed', () => {
        if (this.panoramaPositionFrame) cancelAnimationFrame(this.panoramaPositionFrame);
        this.panoramaPositionFrame = requestAnimationFrame(() => {
          this.panoramaPositionFrame = undefined;
          const pos = this.streetViewPanorama!.getPosition();
          if (!pos) return;

          this.moveMarker(pos.lat(), pos.lng(), true);
        });
      });

      google.maps.event.addListener(this.streetViewPanorama, 'pov_changed', () => {
        if (this.panoramaPovFrame) cancelAnimationFrame(this.panoramaPovFrame);
        this.panoramaPovFrame = requestAnimationFrame(() => {
          this.panoramaPovFrame = undefined;
          this.currentHeading = this.streetViewPanorama!.getPov().heading;
          this.updateMarkerRotation(this.currentHeading);
        });
      });
    });
  }

  private updatePosition(lat: number, lng: number): void {
    this.moveMarker(lat, lng, false);
    this.streetViewPanorama?.setPosition({ lat, lng });
  }

  private queueMapResize(): void {
    if (!this.leafletMap) return;

    requestAnimationFrame(() => this.leafletMap?.invalidateSize());
  }

  private queueStreetViewResize(): void {
    const panorama = this.streetViewPanorama;
    if (!panorama || typeof google === 'undefined') return;

    if (this.streetViewResizeFrame) cancelAnimationFrame(this.streetViewResizeFrame);

    this.streetViewResizeFrame = requestAnimationFrame(() => {
      google.maps.event.trigger(panorama, 'resize');

      // Google's renderer can retain the previous viewport after a panel grows.
      // Repaint once more after its internal layout has crossed two frame boundaries.
      this.streetViewResizeFrame = requestAnimationFrame(() => {
        this.streetViewResizeFrame = requestAnimationFrame(() => {
          this.streetViewResizeFrame = undefined;
          google.maps.event.trigger(panorama, 'resize');
        });
      });
    });
  }


  private recenterLeaflet(): void {
    const markerLatLng = this.currentMarker?.getLatLng();
    if (!markerLatLng) return;

    this.queueMapResize();

    const nextZoom = this.leafletMap?.getZoom() ?? 16;
    this.leafletMap?.flyTo([markerLatLng.lat, markerLatLng.lng], nextZoom, {
      animate: true,
      duration: 0.5,
    });
  }

  recenterView(): void {
    this.recenterLeaflet();
  }

  private handleMapDoubleClick(): void {
    this.leafletMap?.on('dblclick', (e: L.LeafletMouseEvent): void => {
      this.updatePosition(e.latlng.lat, e.latlng.lng);
      this.mapDoubleClick.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }

  // ── Marker ─────────────────────────────────────────────────────────────────

  private createFovIcon(heading: number): L.DivIcon {
    return L.divIcon({
      html: `
        <div class="fov-marker-shell" style="--marker-heading:${heading}deg;">
          <div class="fov-glass-disc"></div>
          <div class="fov-cone"></div>
          <div class="fov-tick"></div>
          <div class="fov-pin"></div>
          <div class="fov-pulse-ring"></div>
        </div>
      `,
      className: 'fov-marker-container',
      iconSize: [62, 62],
      iconAnchor: [31, 31],
    });
  }

  private getMarkerShell(): HTMLElement | null {
    if (!this.cachedMarkerShell) {
      const shell = this.currentMarker
        ?.getElement()
        ?.querySelector('.fov-marker-shell') as HTMLElement | null;

      if (shell) this.cachedMarkerShell = shell;
    }

    return this.cachedMarkerShell ?? null;
  }

  private updateMarkerRotation(heading: number): void {
    if (!this.currentMarker) return;

    const markerShell = this.getMarkerShell();

    if (markerShell) {
      markerShell.style.setProperty('--marker-heading', `${heading}deg`);
    } else {
      this.cachedMarkerShell = undefined;
      this.currentMarker.setIcon(this.createFovIcon(heading));
    }
  }

  private moveMarker(lat: number, lng: number, keepInView: boolean): void {
    this.cachedMarkerShell = undefined;
    this.currentMarker?.setLatLng([lat, lng]);
    this.updateCurrentCoords(lat, lng);
    this.pulseMarker();

    if (keepInView) this.keepMarkerInView(lat, lng);
  }

  private keepMarkerInView(lat: number, lng: number): void {
    const map = this.leafletMap;
    if (!map) return;

    const nextPoint = L.latLng(lat, lng);
    const paddedBounds = map.getBounds().pad(-0.25);

    if (!paddedBounds.isValid() || !paddedBounds.contains(nextPoint)) {
      map.panTo(nextPoint, { animate: true, duration: 0.45 });
    }
  }

  private pulseMarker(): void {
    const markerShell = this.getMarkerShell();
    if (!markerShell) return;

    markerShell.classList.remove('is-active');
    void markerShell.offsetWidth;
    markerShell.classList.add('is-active');

    if (this.focusPulseTimeout) window.clearTimeout(this.focusPulseTimeout);

    this.focusPulseTimeout = window.setTimeout(
      () => markerShell.classList.remove('is-active'),
      720,
    );
  }

  panTo(lat: number, lng: number): void {
    this.updatePosition(lat, lng);
    this.leafletMap?.flyTo([lat, lng], 18, { animate: true, duration: 1.5 });
  }
}
