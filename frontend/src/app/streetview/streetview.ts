import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  Output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

declare var google: any;

@Component({
  selector: 'app-streetview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'streetview.html',
  styleUrls: ['streetview.scss'],
})
export class StreetviewComponent implements AfterViewInit, OnDestroy {
  private mapWrapper = viewChild<ElementRef<HTMLDivElement>>('mapWrapper');

  private leafletMap?: L.Map;
  private streetViewPanorama?: any;
  private currentMarker?: L.Marker;

  private initialLat: number = 45.46965468279425;
  private initialLng: number = 9.182206569945924;
  private currentHeading: number = 165;

  leftWidth: any = signal<number>(50);
  isDragging: any = signal<boolean>(false);
  currentCoords: any = signal<string>('45.4697, 9.1822');

  private readonly destroy$: AbortController = new AbortController();
  @Output() mapDoubleClick: EventEmitter<{ lat: number; lng: number }> = new EventEmitter<{
    lat: number;
    lng: number;
  }>();

  ngAfterViewInit(): void {
    this.initLeaflet();
    this.initStreetView();

    setTimeout((): void => {
      this.syncMaps();
      this.updateCurrentCoords(this.initialLat, this.initialLng);
    }, 120);
  }

  ngOnDestroy(): void {
    this.destroy$.abort();
    this.leafletMap?.remove();
  }

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
    if (this.isDragging()) this.isDragging.set(false);
    setTimeout(() => this.leafletMap?.invalidateSize(), 80);
  }

  resetSplit(): void {
    this.leftWidth.set(50);
    setTimeout(() => this.leafletMap?.invalidateSize(), 120);
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
    if (!this.leafletMap) return;

    this.leafletMap.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.updatePosition(lat, lng);
    });

    if (this.streetViewPanorama) {
      google.maps.event.addListener(this.streetViewPanorama, 'position_changed', () => {
        const pos = this.streetViewPanorama!.getPosition();
        if (!pos) return;

        const lat = pos.lat();
        const lng = pos.lng();

        this.currentMarker?.setLatLng([lat, lng]);
        this.leafletMap?.panTo([lat, lng], { animate: true });
        this.updateCurrentCoords(lat, lng);
      });

      google.maps.event.addListener(this.streetViewPanorama, 'pov_changed', () => {
        const pov = this.streetViewPanorama!.getPov();
        this.currentHeading = pov.heading;
        this.updateMarkerRotation(this.currentHeading);
      });
    }
  }

  private updatePosition(lat: number, lng: number): void {
    this.currentMarker?.setLatLng([lat, lng]);

    if (this.streetViewPanorama) this.streetViewPanorama.setPosition({ lat, lng });

    this.updateCurrentCoords(lat, lng);
  }

  private handleMapDoubleClick(): void {
    if (!this.leafletMap) return;

    this.leafletMap.on('dblclick', (e: L.LeafletMouseEvent): void => {
      const { lat, lng } = e.latlng;
      this.updatePosition(lat, lng);

      this.mapDoubleClick.emit({ lat, lng });
    });
  }

  private createFovIcon(heading: number): L.DivIcon {
    const svgHtml = `
      <svg id="fov-svg" width="62" height="62" viewBox="0 0 62 62" style="transform: rotate(${heading}deg); transform-origin: center;">
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
    if (svg) svg.style.transform = `rotate(${heading}deg)`;
    else this.currentMarker?.setIcon(this.createFovIcon(heading));
  }

  public panTo(lat: number, lng: number): void {
    this.updatePosition(lat, lng);
    this.leafletMap?.flyTo([lat, lng], 18, { animate: true, duration: 1.8 });
  }
}
