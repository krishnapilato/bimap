import { AfterViewInit, Component } from '@angular/core';
import * as L from 'leaflet';
declare var google: any;

@Component({
  selector: 'app-streetview',
  template: `
    <div class="map-wrapper">
      <div id="leafletMap" class="half-screen"></div>
      <div id="streetView" class="half-screen"></div>
    </div>
  `,
  styleUrls: ['./streetview.component.css'],
})
export class StreetviewComponent implements AfterViewInit {
  private leafletMap!: L.Map;
  private streetViewPanorama: any;
  private currentMarker!: L.Marker;

  private initialLat = 45.481;
  private initialLng = 9.173;

  ngAfterViewInit(): void {
    this.initLeaflet();

    setTimeout(() => {
      this.initStreetView();
      this.syncMaps();
    }, 100);
  }

  private initLeaflet(): void {
    let googleTerrain = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m@221097413,transit&x={x}&y={y}&z={z}',
      {
        attribution:
          '<a target="_blank" href="https://cloud.google.com/maps-platform/terms">Map data ©2022 Google</a>',
        maxZoom: 20.25,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      },
    );

    let googleStreetViewLayer = L.tileLayer(
      'https://{s}.google.com/vt/?lyrs=svv|cb_client:apiv3&style=50&x={x}&y={y}&z={z}',
      {
        attribution:
          '<a target="_blank" href="https://cloud.google.com/maps-platform/terms">Map data ©2022 Google</a>',
        maxZoom: 20.25,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      },
    );

    let cities = L.layerGroup([googleTerrain, googleStreetViewLayer]);

    this.leafletMap = L.map('leafletMap').setView([this.initialLat, this.initialLng], 14);
    cities.addTo(this.leafletMap);

    this.currentMarker = L.marker([this.initialLat, this.initialLng]).addTo(this.leafletMap);
  }

  private initStreetView(): void {
    const streetViewElement = document.getElementById('streetView');

    if (streetViewElement && typeof google !== 'undefined') {
      this.streetViewPanorama = new google.maps.StreetViewPanorama(streetViewElement, {
        position: { lat: this.initialLat, lng: this.initialLng },
        pov: { heading: 165, pitch: 0 },
        zoom: 1,
        addressControl: false,
        linksControl: true,
        panControl: true,
        enableCloseButton: false,
      });
    } else {
      console.error('Google Maps API is not loaded yet!');
    }
  }

  private syncMaps(): void {
    this.leafletMap.on('click', (e: L.LeafletMouseEvent) => {
      const newLat = e.latlng.lat;
      const newLng = e.latlng.lng;

      this.currentMarker.setLatLng([newLat, newLng]);

      if (this.streetViewPanorama) {
        this.streetViewPanorama.setPosition({ lat: newLat, lng: newLng });
      }
    });

    if (this.streetViewPanorama) {
      google.maps.event.addListener(this.streetViewPanorama, 'position_changed', () => {
        const svPosition = this.streetViewPanorama.getPosition();
        const newLat = svPosition.lat();
        const newLng = svPosition.lng();

        this.currentMarker.setLatLng([newLat, newLng]);
        this.leafletMap.panTo([newLat, newLng]);
      });
    }
  }
}
