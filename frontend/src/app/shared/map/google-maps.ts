import { Injectable, signal } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

import { environment } from '../../../environments/environment';

export interface StreetViewKit {
  StreetViewPanorama: typeof google.maps.StreetViewPanorama;
  StreetViewService: typeof google.maps.StreetViewService;
  StreetViewPreference: typeof google.maps.StreetViewPreference;
  StreetViewSource: typeof google.maps.StreetViewSource;
  spherical: typeof google.maps.geometry.spherical;
}

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

/**
 * Loads the Maps JavaScript API once, and only when a screen needs Street View. The road and
 * satellite tiles come straight from Google's tile servers and need none of this.
 */
@Injectable({ providedIn: 'root' })
export class GoogleMaps {
  private kit: Promise<StreetViewKit> | null = null;

  /** Google calls back here when the key is refused, for instance from an unlisted domain. */
  readonly refused = signal(false);

  streetView(): Promise<StreetViewKit> {
    this.kit ??= this.load().catch((error: unknown) => {
      this.kit = null;
      throw error;
    });
    return this.kit;
  }

  private async load(): Promise<StreetViewKit> {
    if (!environment.googleMapsApiKey) throw new Error('No Google Maps API key is configured.');
    window.gm_authFailure = () => this.refused.set(true);
    setOptions({ key: environment.googleMapsApiKey, v: 'weekly', region: 'IT', language: 'it' });

    const [streetView, geometry] = await Promise.all([importLibrary('streetView'), importLibrary('geometry')]);
    return {
      StreetViewPanorama: streetView.StreetViewPanorama,
      StreetViewService: streetView.StreetViewService,
      StreetViewPreference: streetView.StreetViewPreference,
      StreetViewSource: streetView.StreetViewSource,
      spherical: geometry.spherical,
    };
  }
}

let leafletStyles: Promise<void> | null = null;

/**
 * Leaflet's stylesheet ships as its own bundle and is linked the first time a map is drawn, so
 * screens without a map never download it.
 */
export function loadLeafletStyles(): Promise<void> {
  leafletStyles ??= new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'leaflet.css';
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
  return leafletStyles;
}
