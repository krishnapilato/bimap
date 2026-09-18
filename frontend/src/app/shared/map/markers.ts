import * as L from 'leaflet';

/**
 * The marks drawn on the map. Each is plain markup styled by `geo-canvas.scss`, so their motion
 * lives in CSS and a heading change is one custom property rather than a new icon.
 */

/** Where Street View stands, with a cone for the way it is looking. */
export function cameraIcon(): L.DivIcon {
  return L.divIcon({
    className: 'bm-marker',
    html: `
      <div class="bm-camera">
        <span class="bm-camera__cone"></span>
        <span class="bm-camera__disc"></span>
        <span class="bm-camera__tick"></span>
        <span class="bm-camera__eye"></span>
      </div>`,
    iconSize: [64, 64],
    iconAnchor: [32, 32],
  });
}

/** The asset being registered: a pin that drops in and can be dragged to the exact façade. */
export function assetIcon(): L.DivIcon {
  return L.divIcon({
    className: 'bm-marker',
    html: `
      <div class="bm-pin">
        <span class="bm-pin__ground"></span>
        <span class="bm-pin__ring"></span>
        <svg class="bm-pin__shape" viewBox="0 0 32 42" aria-hidden="true">
          <path d="M16 1.5C8 1.5 1.5 7.9 1.5 15.8c0 10.4 12.1 23 13.4 24.3a1.5 1.5 0 0 0 2.2 0c1.3-1.3 13.4-13.9 13.4-24.3C30.5 7.9 24 1.5 16 1.5Z"/>
          <circle cx="16" cy="15.6" r="5.4"/>
        </svg>
      </div>`,
    iconSize: [32, 42],
    iconAnchor: [16, 41],
  });
}

/** You, from the browser's location. */
export function selfIcon(): L.DivIcon {
  return L.divIcon({
    className: 'bm-marker',
    html: '<div class="bm-self"><span class="bm-self__halo"></span><span class="bm-self__dot"></span></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}
