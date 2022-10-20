import { Component, OnInit } from '@angular/core';
import StreetView from 'ol-street-view';
import { defaults as overviewControls, OverviewMap } from 'ol/control';
import TileLayer from 'ol/layer/Tile';
import Map from 'ol/Map';
import 'ol/ol.css';
import { fromLonLat } from 'ol/proj';
import XYZ from 'ol/source/XYZ';
import View from 'ol/View';

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
      className: 'ol-overviewmap ol-custom-overviewmap',
      layers: [
        new TileLayer({
          source: new XYZ({
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
          maxZoom: 19,
          source: new XYZ({
            attributions: `&copy; ${new Date().getFullYear()} Google Maps <a href="https://www.google.com/help/terms_maps/" target="_blank">Terms of Service</a>`,
            url:
              'https://mt{0-3}.google.com/vt/lyrs=m@221097413,transit&x={x}&y={y}&z={z}'
          })
        })
      ],
      target: 'map',
      view: new View({
        center: fromLonLat([9.173, 45.481]),
        zoom: 13,
        minZoom: 6,
        maxZoom: 19,
        rotation: 0,
        constrainResolution: true,
        constrainOnlyCenter: true
      })
    });

    var streetView = new StreetView({
      apiKey: '',
      language: 'en',
      size: 'sm',
      resizable: true,
      sizeToggler: false,
      target: 'map'
    });
    map.addControl(streetView);
  }
}