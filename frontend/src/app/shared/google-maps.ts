import { environment } from '../../environments/environment';

let streetView: Promise<google.maps.StreetViewLibrary> | undefined;

export function loadStreetView(): Promise<google.maps.StreetViewLibrary> {
  streetView ??= new Promise<void>((resolve, reject) => {
    Object.assign(window, { onGoogleMapsLoaded: resolve });
    const script = Object.assign(document.createElement('script'), {
      src: `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsKey}&loading=async&callback=onGoogleMapsLoaded`,
      onerror: reject,
    });
    document.head.append(script);
  }).then(() => google.maps.importLibrary('streetView'));
  return streetView;
}
