import { Component, OnInit } from '@angular/core';
import 'ol/ol.css';
import Map from 'ol/Map';
import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import StreetView from 'ol-street-view';
import { FullScreen, defaults as defaultControls } from 'ol/control';
import {
  DragRotateAndZoom,
  defaults as defaultInteractions
} from 'ol/interaction';
import { OverviewMap, defaults as overviewControls } from 'ol/control';
import { ScaleLine } from 'ol/control';

@Component({
  selector: 'app-streetview',
  template: '<div id="map" oncontextmenu="return false"></div>',
  styleUrls: ['./streetview.component.css']
})
export class StreetviewComponent implements OnInit {
  ngOnInit(): void {
    if (!localStorage.getItem('foo')) {
      localStorage.setItem('foo', 'no reload');
      location.reload();
    } else {
      localStorage.removeItem('foo');
    }

    const overviewMapControl = new OverviewMap({
      // see in overviewmap-custom.html to see the custom CSS used
      className: 'ol-overviewmap ol-custom-overviewmap',
      layers: [
        new TileLayer({
          source: new OSM({
            url:
              'https://mt{0-3}.google.com/vt/lyrs=m@221097413,transit&x={x}&y={y}&z={z}' 
          })
        })
      ],
      collapseLabel: '\u00BB',
      label: '\u00AB',
      collapsed: false
    });

    var map = new Map({
      controls: overviewControls().extend([overviewMapControl]),
      layers: [
        new TileLayer({
          source: new OSM({
            attributions: `&copy; ${new Date().getFullYear()} Google Maps <a href="https://www.google.com/help/terms_maps/" target="_blank">Terms of Service</a>`,
            maxZoom: 19,
            url:
              'https://mt{0-3}.google.com/vt/lyrs=m@221097413,transit&x={x}&y={y}&z={z}'
          })
        })
      ],
      target: 'map',
      view: new View({
        center: [0, 0],
        zoom: 1,
        rotation: 0,
        projection: 'EPSG:900913',
        constrainResolution: true
      })
    });

    var streetView = new StreetView({
      apiKey: '',
      language: 'en',
      size: 'sm',
      resizable: true,
      sizeToggler: false,
      defaultMapSize: 'expanded',
      i18n: {
        dragToInit: 'Drag and drop me'
      },
      target: 'map'
    });
    map.addControl(streetView);
  }
}