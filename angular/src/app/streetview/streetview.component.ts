import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import StreetView from 'ol-street-view';
import Map from 'ol/Map';
import View from 'ol/View';
import { defaults as defaultControls, OverviewMap } from 'ol/control';
import TileLayer from 'ol/layer/Tile';
import { fromLonLat } from 'ol/proj';
import XYZ from 'ol/source/XYZ';

@Component({
  selector: 'app-streetview',
  template:
    '<div #mapContainer id="map" class="map-container" oncontextmenu="return false"></div>',
  styleUrls: ['./streetview.component.css'],
})
export class StreetviewComponent implements AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  private initializeMap(): void {
    const overviewMapControl = new OverviewMap({
      className: 'ol-overviewmap ol-custom-overviewmap',
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://mt{0-3}.google.com/vt/lyrs=m@221097413,transit&x={x}&y={y}&z={z}',
          }),
        }),
      ],
      collapseLabel: '\u00BB',
      label: '\u00AB',
      collapsed: false,
    });

    const map = new Map({
      target: this.mapContainer.nativeElement,
      layers: [
        new TileLayer({
          source: new XYZ({
            attributions: `&copy; ${new Date().getFullYear()} Google Maps <a href="https://www.google.com/help/terms_maps/" target="_blank">Terms of Service</a>`,
            url: 'https://mt{0-3}.google.com/vt/lyrs=m@221097413,transit&x={x}&y={y}&z={z}',
          }),
        }),
      ],
      view: new View({
        center: fromLonLat([9.173, 45.481]), // Coordinates for Milan, Italy
        zoom: 13,
        minZoom: 6,
        maxZoom: 19,
        rotation: 0,
        constrainResolution: true,
        constrainOnlyCenter: true,
      }),
      controls: defaultControls().extend([overviewMapControl]),
    });

    const streetView = new StreetView({
      apiKey: '', // Add your Google Maps API key here
      language: 'en',
      size: 'sm',
      resizable: true,
      sizeToggler: true,
      target: this.mapContainer.nativeElement,
    });

    map.addControl(streetView);
  }
}