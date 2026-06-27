import {
  AfterViewInit,
  Component,
  HostListener,
  ElementRef,
  viewChild,
  signal,
  effect,
  OnDestroy,
  inject,
} from '@angular/core';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';

declare var google: any;

@Component({
  selector: 'app-streetview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-container" #mapWrapper>
      <!-- Left Panel: Leaflet Map -->
      <div class="map-panel" [style.width.%]="leftWidth()">
        <div id="leafletMap" class="map-canvas"></div>

        @if (isDragging()) {
          <div class="drag-overlay"></div>
        }

        <!-- Map Info Overlay -->
        <div class="map-info">
          <div class="info-pill">
            <span class="label">Map View</span>
            <span class="coords">{{ currentCoords() }}</span>
          </div>
        </div>
      </div>

      <!-- Resizer -->
      <div 
        class="resizer" 
        (mousedown)="onMouseDown($event)"
        (dblclick)="resetSplit()">
      </div>

      <!-- Right Panel: Street View -->
      <div class="map-panel" [style.width.%]="100 - leftWidth()">
        <div id="streetView" class="map-canvas"></div>

        @if (isDragging()) {
          <div class="drag-overlay"></div>
        }

        <!-- Street View Info Overlay -->
        <div class="map-info right">
          <div class="info-pill">
            <span class="label">Street View</span>
            <span class="coords">{{ currentCoords() }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100vw;
        height: 100vh;
        background: #0a0a0a;
        overflow: hidden;
      }

      .map-container {
        display: flex;
        flex-direction: row;
        width: 94vw;
        height: 92vh;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 
          0 25px 70px -10px rgba(0, 0, 0, 0.8),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.06);
        border: 1px solid #1f1f1f;
        background: #111;
      }

      .map-panel {
        height: 100%;
        position: relative;
        transition: width 0.1s linear;
      }

      .map-canvas {
        width: 100%;
        height: 100%;
        background: #1a1a1a;
      }

      /* Professional Dark Resizer */
      .resizer {
        width: 8px;
        background: linear-gradient(90deg, #1f1f1f, #2a2a2a, #1f1f1f);
        border-left: 1px solid #111;
        border-right: 1px solid #333;
        cursor: col-resize;
        z-index: 1000;
        position: relative;
        transition: background 0.2s ease, width 0.2s ease;
        box-shadow: 0 0 12px rgba(0, 0, 0, 0.5);
      }

      .resizer:hover,
      .resizer:active {
        background: linear-gradient(90deg, #3a3a3a, #4a4a4a, #3a3a3a);
        width: 12px;
      }

      .resizer::after {
        content: '⋮';
        color: #666;
        font-size: 22px;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        opacity: 0.6;
        transition: opacity 0.2s;
      }

      .resizer:hover::after {
        opacity: 0.9;
      }

      .drag-overlay {
        position: absolute;
        inset: 0;
        z-index: 9999;
        cursor: col-resize;
        background: rgba(66, 133, 244, 0.08);
        pointer-events: none;
      }

      /* Info Overlays */
      .map-info {
        position: absolute;
        top: 16px;
        left: 16px;
        z-index: 500;
        pointer-events: none;
      }

      .map-info.right {
        left: auto;
        right: 16px;
      }

      .info-pill {
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(12px);
        color: #e0e0e0;
        font-size: 13px;
        padding: 6px 14px;
        border-radius: 9999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      }

      .label {
        color: #888;
        font-weight: 500;
        letter-spacing: 0.5px;
      }

      .coords {
        font-family: ui-monospace, monospace;
        color: #aaa;
      }

      /* Google Tiles Dark Mode */
      .google-dark-tiles {
        filter: 
          invert(95%) 
          hue-rotate(180deg) 
          brightness(85%) 
          contrast(92%) 
          saturate(110%);
      }

      /* Leaflet Adjustments */
      :host ::ng-deep .leaflet-container {
        background: #1a1a1a;
      }

      :host ::ng-deep .leaflet-control-attribution {
        background: rgba(0, 0, 0, 0.7) !important;
        color: #777 !important;
        font-size: 10px;
      }
    `,
  ],
})
export class StreetviewComponent implements AfterViewInit, OnDestroy {
  private mapWrapper = viewChild<ElementRef<HTMLDivElement>>('mapWrapper');

  private leafletMap?: L.Map;
  private streetViewPanorama?: any;
  private currentMarker?: L.Marker;

  private initialLat = 45.481;
  private initialLng = 9.173;
  private currentHeading = 165;

  // Signals
  leftWidth = signal<number>(50);
  isDragging = signal<boolean>(false);
  currentCoords = signal<string>('45.481, 9.173');

  private readonly destroy$ = new AbortController();

  ngAfterViewInit(): void {
    this.initLeaflet();
    this.initStreetView();

    // Slight delay to ensure DOM is ready
    setTimeout(() => {
      this.syncMaps();
      this.updateCurrentCoords(this.initialLat, this.initialLng);
    }, 120);
  }

  ngOnDestroy(): void {
    this.destroy$.abort();
    this.leafletMap?.remove();
  }

  // ====================== SPLIT VIEW LOGIC ======================
  onMouseDown(event: MouseEvent): void {
    this.isDragging.set(true);
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging()) return;

    const wrapper = this.mapWrapper();
    if (!wrapper) return;

    const rect = wrapper.nativeElement.getBoundingClientRect();
    let percentage = ((event.clientX - rect.left) / rect.width) * 100;

    percentage = Math.max(8, Math.min(92, percentage));
    this.leftWidth.set(percentage);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.isDragging()) {
      this.isDragging.set(false);

      // Refresh map size after drag ends
      setTimeout(() => this.leafletMap?.invalidateSize(), 80);
    }
  }

  resetSplit(): void {
    this.leftWidth.set(50);
    setTimeout(() => this.leafletMap?.invalidateSize(), 120);
  }

  private updateCurrentCoords(lat: number, lng: number): void {
    this.currentCoords.set(
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    );
  }

  // ====================== MAP INITIALIZATION ======================
  private initLeaflet(): void {
    const googleRoad = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      {
        attribution: '© Google',
        maxZoom: 21,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        className: 'google-dark-tiles',
      }
    );

    const streetViewCoverage = L.tileLayer(
      'https://{s}.google.com/vt/?lyrs=svv|cb_client:apiv3&style=50&x={x}&y={y}&z={z}',
      {
        maxZoom: 21,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        opacity: 0.35,
      }
    );

    this.leafletMap = L.map('leafletMap', {
      zoomControl: true,
      attributionControl: true,
    }).setView([this.initialLat, this.initialLng], 16);

    L.layerGroup([googleRoad, streetViewCoverage]).addTo(this.leafletMap);

    // Custom FOV Marker
    this.currentMarker = L.marker([this.initialLat, this.initialLng], {
      icon: this.createFovIcon(this.currentHeading),
      zIndexOffset: 1000,
    }).addTo(this.leafletMap);
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
      linksControl: true,
      panControl: true,
      enableCloseButton: false,
      motionTracking: true,
      clickToGo: true,
      panControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
    });
  }

  // ====================== SYNCHRONIZATION ======================
  private syncMaps(): void {
    if (!this.leafletMap) return;

    // Leaflet click → Update Street View
    this.leafletMap.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.updatePosition(lat, lng);
    });

    // Street View changes → Sync Leaflet
    if (this.streetViewPanorama) {
      google.maps.event.addListener(
        this.streetViewPanorama,
        'position_changed',
        () => {
          const pos = this.streetViewPanorama!.getPosition();
          if (!pos) return;

          const lat = pos.lat();
          const lng = pos.lng();

          this.currentMarker?.setLatLng([lat, lng]);
          this.leafletMap?.panTo([lat, lng], { animate: true });
          this.updateCurrentCoords(lat, lng);
        }
      );

      google.maps.event.addListener(
        this.streetViewPanorama,
        'pov_changed',
        () => {
          const pov = this.streetViewPanorama!.getPov();
          this.currentHeading = pov.heading;
          this.updateMarkerRotation(this.currentHeading);
        }
      );
    }
  }

  private updatePosition(lat: number, lng: number): void {
    this.currentMarker?.setLatLng([lat, lng]);

    if (this.streetViewPanorama) {
      this.streetViewPanorama.setPosition({ lat, lng });
    }

    this.updateCurrentCoords(lat, lng);
  }

  // ====================== FOV MARKER ======================
  private createFovIcon(heading: number): L.DivIcon {
    const svgHtml = `
      <svg width="62" height="62" viewBox="0 0 62 62" style="transform: rotate(${heading}deg); transform-origin: center;">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path 
          d="M31 31 L12 12 A30 30 0 0 1 50 12 Z" 
          fill="rgba(66, 133, 244, 0.45)" 
          stroke="#4285f4" 
          stroke-width="2.5"
          filter="url(#glow)"
        />
        <circle cx="31" cy="31" r="6" fill="#1a73e8" stroke="#ffffff" stroke-width="2.5"/>
        <circle cx="31" cy="31" r="2.5" fill="#ffffff"/>
      </svg>
    `;

    return L.divIcon({
      html: svgHtml,
      className: 'fov-marker-container',
      iconSize: [62, 62],
      iconAnchor: [31, 31],
    });
  }

  private updateMarkerRotation(heading: number): void {
    const svg = document.getElementById('fov-svg') as SVGElement | null;
    if (svg) {
      svg.style.transform = `rotate(${heading}deg)`;
    } else {
      // Fallback: re-create marker if needed
      if (this.currentMarker) {
        this.currentMarker.setIcon(this.createFovIcon(heading));
      }
    }
  }
}