import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  NgZone,
  OnDestroy,
  Output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { MatTooltip } from "@angular/material/tooltip";

declare var google: any;

@Component({
  selector: 'app-streetview',
  standalone: true,
  imports: [CommonModule, MatTooltip],
  templateUrl: 'streetview.html',
  styleUrls: ['streetview.scss'],
})
export class StreetviewComponent implements AfterViewInit, OnDestroy {
  private mapWrapper = viewChild<ElementRef<HTMLDivElement>>('mapWrapper');

  private zone = inject(NgZone);

  private leafletMap?: L.Map;
  private streetViewPanorama?: any;
  private currentMarker?: L.Marker;
  private resizeObserver?: ResizeObserver;

  private readonly initialLat = 45.46965468279425;
  private readonly initialLng = 9.182206569945924;
  private currentHeading = 165;

  leftWidth = signal(50);
  isDragging = signal(false);
  currentCoords = signal('45.4697, 9.1822');

  @Output() mapDoubleClick = new EventEmitter<{ lat: number; lng: number }>();

  private boundMouseMove = this.onMouseMove.bind(this);
  private boundMouseUp = this.onMouseUp.bind(this);

  ngAfterViewInit(): void {
    this.initLeaflet();
    this.initStreetView();
    this.setupResizeObserver();

    setTimeout(() => {this.syncMaps(); this.updatePosition(this.initialLat, this.initialLng);}, 100);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
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
    if (!this.isDragging()) return;

    const wrapper = this.mapWrapper()?.nativeElement;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    let percentage = ((event.clientX - rect.left) / rect.width) * 100;
    percentage = Math.max(8, Math.min(92, percentage));

    this.zone.run(() => this.leftWidth.set(percentage));
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
  }

  private setupResizeObserver(): void {
    const wrapper = this.mapWrapper()?.nativeElement;
    if (!wrapper) return;

    this.resizeObserver = new ResizeObserver(() => {
      if (this.leafletMap) this.leafletMap.invalidateSize();
    });
    this.resizeObserver.observe(wrapper);
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
      minZoom: 8,
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

      this.currentMarker?.setLatLng([lat, lng]);
      this.leafletMap?.panTo([lat, lng], { animate: true, duration: 0.5 });
      this.updateCurrentCoords(lat, lng);
    });

    google.maps.event.addListener(this.streetViewPanorama, 'pov_changed', () => {
      const pov = this.streetViewPanorama!.getPov();
      this.currentHeading = pov.heading;
      this.updateMarkerRotation(this.currentHeading);
    });
  }

  private updatePosition(lat: number, lng: number): void {
    this.currentMarker?.setLatLng([lat, lng]);
    this.streetViewPanorama?.setPosition({ lat, lng });
    this.updateCurrentCoords(lat, lng);
  }

  private handleMapDoubleClick(): void {
    this.leafletMap?.on('dblclick', (e: L.LeafletMouseEvent): void => {
      this.updatePosition(e.latlng.lat, e.latlng.lng);
      this.mapDoubleClick.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }

  private createFovIcon(heading: number): L.DivIcon {
    const uniqueId = `glow-${Math.random().toString(36).substring(2, 9)}`;
    const svgHtml = `
      <svg class="fov-svg-element" width="62" height="62" viewBox="0 0 62 62" 
           style="transform: rotate(${heading}deg); transform-origin: center; transition: transform 0.15s ease-out;">
        <defs>
          <filter id="${uniqueId}" x="-50%" y="-50%" width="200%" height="200%">
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
          filter="url(#${uniqueId})"
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
    if (!this.currentMarker) return;

    const markerElement = this.currentMarker.getElement();
    const svg = markerElement?.querySelector('.fov-svg-element') as SVGElement | null;

    if (svg) {
      svg.style.transform = `rotate(${heading}deg)`;
    } else {
      this.currentMarker.setIcon(this.createFovIcon(heading));
    }
  }

  public panTo(lat: number, lng: number): void {
    this.updatePosition(lat, lng);
    this.leafletMap?.flyTo([lat, lng], 18, { animate: true, duration: 1.5 });
  }
}
