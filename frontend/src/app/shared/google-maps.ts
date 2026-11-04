declare const GOOGLE_MAPS_KEY: string;

let streetView: Promise<google.maps.StreetViewLibrary> | undefined;

export function loadStreetView(): Promise<google.maps.StreetViewLibrary> {
  if (!GOOGLE_MAPS_KEY.trim()) return Promise.reject(new Error('Street View needs a configured Google Maps API key.'));
  streetView ??= new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => fail(), 15_000);
    const cleanup = () => {
      clearTimeout(timer);
      Reflect.deleteProperty(window, 'onGoogleMapsLoaded');
    };
    const fail = () => {
      cleanup();
      script.remove();
      reject(new Error('Google Maps could not load. Check your connection or API key.'));
    };
    Object.assign(window, { onGoogleMapsLoaded: () => { cleanup(); resolve(); } });
    const params = new URLSearchParams({ key: GOOGLE_MAPS_KEY, loading: 'async', callback: 'onGoogleMapsLoaded' });
    const script = Object.assign(document.createElement('script'), {
      src: `https://maps.googleapis.com/maps/api/js?${params}`,
      onerror: fail,
    });
    document.head.append(script);
  }).then(() => google.maps.importLibrary('streetView')).catch((error: unknown) => {
    streetView = undefined;
    throw error;
  });
  return streetView;
}
