import * as L from 'leaflet';

const SCALE = Math.min(2, Math.ceil(globalThis.devicePixelRatio));

export type GoogleLayer = 'roads' | 'satellite' | 'street-view';

const LAYERS: Record<GoogleLayer, string> = {
  roads: 'lyrs=m',
  satellite: 'lyrs=y',
  'street-view': 'lyrs=svv|cb_client:apiv3&style=50',
};

export function googleTiles(layer: GoogleLayer): L.TileLayer {
  return L.tileLayer(`https://{s}.google.com/vt/${LAYERS[layer]}&scale=${SCALE}&x={x}&y={y}&z={z}`, {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  });
}
