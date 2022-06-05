import { Component, OnInit } from '@angular/core';
import 'ol/ol.css';
import Map from 'ol/Map';
import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import StreetView from 'ol-street-view';

@Component({
  selector: 'app-streetview',
  template: '<div id="map" oncontextmenu="return false"></div>',
  styleUrls: ['./streetview.component.css']
})
export class StreetviewComponent implements OnInit {

  ngOnInit(): void {
    var map = new Map({
      layers: [
        new TileLayer({
          source: new OSM({
            attributions: `&copy; ${new Date().getFullYear()} Google Maps <a href="https://www.google.com/help/terms_maps/" target="_blank">Terms of Service</a>`,
            maxZoom: 19,
            url: 'https://mt{0-3}.google.com/vt/lyrs=m@221097413,transit&x={x}&y={y}&z={z}'
          })
        })
      ],
      target: 'map',
      view: new View({
        center:[0,0],
        zoom: 1,
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