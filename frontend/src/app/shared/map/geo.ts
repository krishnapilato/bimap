export interface LatLng {
  lat: number;
  lng: number;
}

/** How much of the canvas is covered by floating UI, so the map centres on what is visible. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface MapView {
  center: LatLng;
  zoom: number;
}

/** A registration, or anything else with a place and a state, drawn as a dot. */
export interface MapPoint {
  id: string;
  position: LatLng;
  label: string;
  detail?: string;
  tone: 'positive' | 'critical' | 'negative' | 'info' | 'neutral' | 'special' | 'signal';
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export const ITALY: MapView = { center: { lat: 42.1, lng: 12.6 }, zoom: 6 };

/** The zoom each step of the cascade settles on. */
export const ZOOM = { region: 8, province: 10, municipality: 14, street: 17, asset: 19 } as const;

const EARTH_RADIUS = 6_371_008.8;

/** Great-circle distance in metres. */
export function distance(a: LatLng, b: LatLng): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isValidPosition(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
}

export function toPosition(lat: number | null | undefined, lng: number | null | undefined): LatLng | null {
  return isValidPosition(lat, lng) ? { lat: lat as number, lng: lng as number } : null;
}

/** Six decimals is a tenth of a metre, which is as precise as a façade needs. */
export function formatPosition(position: LatLng, digits = 6): string {
  return `${position.lat.toFixed(digits)}, ${position.lng.toFixed(digits)}`;
}

/** Reads "45.4642, 9.1900" or "45.4642 9.19", as pasted from any map. */
export function parsePosition(text: string): LatLng | null {
  const match = /^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/.exec(text);
  if (!match) return null;
  const lat = Number(match[1].replace(',', '.'));
  const lng = Number(match[2].replace(',', '.'));
  return toPosition(lat, lng);
}

export function formatDistance(metres: number): string {
  if (metres < 1) return 'here';
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(metres < 10_000 ? 1 : 0)} km`;
}

const REGION_VIEWS: Record<string, MapView> = {
  abruzzo: { center: { lat: 42.23, lng: 13.85 }, zoom: 8.5 },
  basilicata: { center: { lat: 40.5, lng: 16.08 }, zoom: 8.5 },
  calabria: { center: { lat: 39.07, lng: 16.35 }, zoom: 8 },
  campania: { center: { lat: 40.86, lng: 14.84 }, zoom: 8.5 },
  emiliaromagna: { center: { lat: 44.53, lng: 11.03 }, zoom: 8 },
  friuliveneziagiulia: { center: { lat: 46.15, lng: 13.05 }, zoom: 8.5 },
  lazio: { center: { lat: 41.98, lng: 12.77 }, zoom: 8 },
  liguria: { center: { lat: 44.32, lng: 8.7 }, zoom: 8.5 },
  lombardia: { center: { lat: 45.62, lng: 9.77 }, zoom: 8 },
  marche: { center: { lat: 43.35, lng: 13.13 }, zoom: 8.5 },
  molise: { center: { lat: 41.68, lng: 14.6 }, zoom: 9 },
  piemonte: { center: { lat: 45.05, lng: 7.92 }, zoom: 8 },
  puglia: { center: { lat: 41.0, lng: 16.6 }, zoom: 7.5 },
  sardegna: { center: { lat: 40.06, lng: 9.03 }, zoom: 7.5 },
  sicilia: { center: { lat: 37.6, lng: 14.15 }, zoom: 7.5 },
  toscana: { center: { lat: 43.45, lng: 11.12 }, zoom: 8 },
  trentinoaltoadige: { center: { lat: 46.43, lng: 11.17 }, zoom: 8.5 },
  umbria: { center: { lat: 42.97, lng: 12.49 }, zoom: 9 },
  valledaosta: { center: { lat: 45.74, lng: 7.38 }, zoom: 9.5 },
  veneto: { center: { lat: 45.65, lng: 11.85 }, zoom: 8 },
};

/** Where a region sits, for the flight that follows choosing it. Names are matched loosely. */
export function regionView(name: string | null | undefined): MapView | null {
  if (!name) return null;
  const key = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/sudtirol.*$/, '');
  return REGION_VIEWS[key] ?? null;
}
