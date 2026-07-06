import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  NgZone,
  OnDestroy,
  Output,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import * as L from 'leaflet';

declare var google: any;

@Component({
  selector: 'app-streetview',
  standalone: true,
  imports: [CommonModule, MatTooltip, MatIconModule],
  templateUrl: 'streetview.html',
  styleUrls: ['streetview.scss'],
})
export class StreetviewComponent implements AfterViewInit, OnDestroy {
  private mapWrapper = viewChild<ElementRef<HTMLDivElement>>('mapWrapper');

  private zone = inject(NgZone);

  private leafletMap?: L.Map;
  private streetViewPanorama?: any;
  private currentMarker?: L.Marker;
  private cachedMarkerShell?: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private streetViewResizeObserver?: ResizeObserver;
  private mouseMoveRafPending = false;
  private wasMobileViewport = false;

  private readonly initialLat = 45.46965468279425;
  private readonly initialLng = 9.182206569945924;
  private currentHeading = 165;
  private focusPulseTimeout?: number;

  leftWidth = signal(50);
  isDragging = signal(false);
  isMobileViewport = signal(false);
  currentCoords = signal('45.4697, 9.1822');

  @Output() mapDoubleClick = new EventEmitter<{ lat: number; lng: number }>();

  private boundMouseMove = this.onMouseMove.bind(this);
  private boundMouseUp = this.onMouseUp.bind(this);

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
    if (this.focusPulseTimeout) {
      window.clearTimeout(this.focusPulseTimeout);
    }
    this.resizeObserver?.disconnect();
    this.streetViewResizeObserver?.disconnect();
    this.leafletMap?.remove();
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging.set(true);

    this.zone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.boundMouseMove);
      document.addEventListener('mouseup', this.boundMouseUp);
    });
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging() || this.mouseMoveRafPending) return;

    const clientX = event.clientX;
    const clientY = event.clientY;
    this.mouseMoveRafPending = true;

    requestAnimationFrame(() => {
      this.mouseMoveRafPending = false;
      if (!this.isDragging()) return;

      const wrapper = this.mapWrapper()?.nativeElement;
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      const isMobile = this.isMobileViewport();
      let percentage = isMobile
        ? ((clientY - rect.top) / rect.height) * 100
        : ((clientX - rect.left) / rect.width) * 100;

      percentage = Math.max(20, Math.min(80, percentage));

      this.zone.run(() => this.leftWidth.set(percentage));
    });
  }

  private onMouseUp(): void {
    if (this.isDragging()) {
      this.zone.run(() => this.isDragging.set(false));
    }
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  resetSplit(): void {
    this.leftWidth.set(50);
    this.queueMapResize();
    this.recenterLeaflet();
  }

  private updateViewportMode(): void {
    const mobile = window.innerWidth <= 768;

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

    this.resizeObserver = new ResizeObserver(() => {
      this.queueMapResize();
    });

    if (leafletContainer) this.resizeObserver.observe(leafletContainer);

    this.streetViewResizeObserver = new ResizeObserver(() => {
      if (!this.streetViewPanorama) return;

      requestAnimationFrame(() => {
        google.maps.event.trigger(this.streetViewPanorama, 'resize');
      });
    });

    if (streetViewContainer) this.streetViewResizeObserver.observe(streetViewContainer);
  }

  private updateCurrentCoords(lat: number, lng: number): void {
    this.currentCoords.set(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  }

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

    this.leafletMap.on('click', (e: L.LeafletMouseEvent) => {
      this.updatePosition(e.latlng.lat, e.latlng.lng);
    });

    google.maps.event.addListener(this.streetViewPanorama, 'position_changed', () => {
      const pos = this.streetViewPanorama!.getPosition();
      if (!pos) return;

      const lat = pos.lat();
      const lng = pos.lng();

      this.moveMarker(lat, lng, true);
    });

    google.maps.event.addListener(this.streetViewPanorama, 'pov_changed', () => {
      const pov = this.streetViewPanorama!.getPov();
      this.currentHeading = pov.heading;
      this.updateMarkerRotation(this.currentHeading);
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

  public recenterView(): void {
    this.recenterLeaflet();
  }

  private handleMapDoubleClick(): void {
    this.leafletMap?.on('dblclick', (e: L.LeafletMouseEvent): void => {
      this.updatePosition(e.latlng.lat, e.latlng.lng);
      this.mapDoubleClick.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }

  private createFovIcon(heading: number): L.DivIcon {
    const svgHtml = `
      <div class="fov-marker-shell" style="--marker-heading:${heading}deg;">
        <div class="fov-glass-disc"></div>
        <div class="fov-cone"></div>
        <div class="fov-tick"></div>
        <div class="fov-pin"></div>
        <div class="fov-pulse-ring"></div>
      </div>
    `;

    return L.divIcon({
      html: svgHtml,
      className: 'fov-marker-container',
      iconSize: [62, 62],
      iconAnchor: [31, 31],
    });
  }

  private getMarkerShell(): HTMLElement | null {
    if (!this.cachedMarkerShell) {
      const shell = this.currentMarker?.getElement()?.querySelector('.fov-marker-shell') as HTMLElement | null;
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

    if (keepInView) {
      this.keepMarkerInView(lat, lng);
    }
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

    if (!markerShell) {
      return;
    }

    markerShell.classList.remove('is-active');
    void markerShell.offsetWidth;
    markerShell.classList.add('is-active');

    if (this.focusPulseTimeout) {
      window.clearTimeout(this.focusPulseTimeout);
    }

    this.focusPulseTimeout = window.setTimeout(() => {
      markerShell.classList.remove('is-active');
    }, 720);
  }

  public panTo(lat: number, lng: number): void {
    this.updatePosition(lat, lng);
    this.leafletMap?.flyTo([lat, lng], 18, { animate: true, duration: 1.5 });
  }
}