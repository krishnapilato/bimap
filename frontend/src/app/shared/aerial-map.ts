import { afterNextRender, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import * as L from 'leaflet';

const ITALY = L.latLngBounds([36.6, 6.6], [47.1, 18.5]);

@Component({
  selector: 'app-aerial-map',
  template: '',
  host: { class: 'absolute inset-0' },
})
export class AerialMap {
  constructor() {
    const element = inject(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const map = L.map(element, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomSnap: 0,
        attributionControl: false,
      }).fitBounds(ITALY);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(map);
      const resize = new ResizeObserver(() => map.invalidateSize().fitBounds(ITALY));
      resize.observe(element);
      destroyRef.onDestroy(() => {
        resize.disconnect();
        map.remove();
      });
    });
  }
}
