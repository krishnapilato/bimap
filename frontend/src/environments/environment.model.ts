/**
 * The Angular counterpart of a Vite `import.meta.env`: one typed object, swapped at build time by
 * the `fileReplacements` of each configuration in angular.json.
 *
 * @author Khova Krishna Pilato
 */

/**
 * `live` talks to the Spring Boot services. `demo` is the static GitHub Pages build: identity,
 * email and health come from localStorage, while geography still calls the real public APIs,
 * which all send `Access-Control-Allow-Origin: *`.
 */
export type AppMode = 'live' | 'demo';

export interface AppEnvironment {
  readonly production: boolean;
  readonly appMode: AppMode;
  readonly iamApiUrl: string;
  readonly businessApiUrl: string;
  readonly googleClientId: string;
  
  /**
    * Optional. With a key the geo module uses Google Maps and Street View; without one it falls
    * back to OpenStreetMap tiles and offers no panorama. Restrict the key by HTTP referrer — a
    * browser key is visible to anyone who opens the page, which is how Google intends it.
    */
  readonly googleMapsApiKey: string;
}
