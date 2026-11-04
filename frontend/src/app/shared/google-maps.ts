declare const GOOGLE_MAPS_KEY: string;

let streetView: Promise<google.maps.StreetViewLibrary> | undefined;

export function loadStreetView(): Promise<google.maps.StreetViewLibrary> {
  streetView ??= new Promise<void>((resolve, reject) => {
    Object.assign(window, { onGoogleMapsLoaded: resolve });
    const params = new URLSearchParams({ key: GOOGLE_MAPS_KEY, loading: 'async', callback: 'onGoogleMapsLoaded' });
    const script = Object.assign(document.createElement('script'), {
      src: `https://maps.googleapis.com/maps/api/js?${params}`,
      onerror: reject,
    });
    document.head.append(script);
  }).then(() => google.maps.importLibrary('streetView'));
  return streetView;
}
