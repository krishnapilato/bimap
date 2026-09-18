import * as L from 'leaflet';

import { Basemap } from '../../core/ui/preferences';
import { LatLng } from './geo';

export interface BasemapOption {
  id: Basemap;
  label: string;
  icon: string;
  /** Google's layer code: roads, satellite, hybrid, terrain. */
  code: string;
}

export const BASEMAPS: ReadonlyArray<BasemapOption> = [
  { id: 'road', label: 'Road', icon: 'map', code: 'm' },
  { id: 'satellite', label: 'Satellite', icon: 'satellite', code: 's' },
  { id: 'hybrid', label: 'Hybrid', icon: 'layers', code: 'y' },
  { id: 'terrain', label: 'Terrain', icon: 'mountain', code: 'p' },
];

const SUBDOMAINS = ['mt0', 'mt1', 'mt2', 'mt3'];
const ATTRIBUTION = 'Map data &copy; Google';

const codeOf = (basemap: Basemap): string => BASEMAPS.find((option) => option.id === basemap)?.code ?? 'm';

export function basemapLayer(basemap: Basemap, zIndex: number): L.TileLayer {
  return L.tileLayer(`https://{s}.google.com/vt/lyrs=${codeOf(basemap)}&hl=it&x={x}&y={y}&z={z}`, {
    subdomains: SUBDOMAINS,
    attribution: ATTRIBUTION,
    maxZoom: 21,
    keepBuffer: 4,
    zIndex,
    className: 'bm-tiles',
  });
}

/**
 * The blue lines Google draws wherever Street View imagery exists. Below street level they merge
 * into a wash over whole countries, so they only appear once they can be told apart.
 */
export function coverageLayer(): L.TileLayer {
  return L.tileLayer('https://{s}.google.com/vt/?lyrs=svv|cb_client:apiv3&style=50&x={x}&y={y}&z={z}', {
    subdomains: SUBDOMAINS,
    minZoom: 11,
    maxZoom: 21,
    opacity: 0.38,
    zIndex: 1000,
    className: 'bm-coverage',
  });
}

/** One real tile of the given basemap under the current view, so the picker previews what you get. */
export function basemapPreview(basemap: Basemap, center: LatLng, zoom: number): string {
  const z = Math.max(4, Math.min(17, Math.round(zoom) - 1));
  const n = 2 ** z;
  const latitude = (Math.max(-85, Math.min(85, center.lat)) * Math.PI) / 180;
  const x = Math.floor(((center.lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latitude) + 1 / Math.cos(latitude)) / Math.PI) / 2) * n);
  return `https://mt1.google.com/vt/lyrs=${codeOf(basemap)}&hl=it&x=${x}&y=${y}&z=${z}`;
}
