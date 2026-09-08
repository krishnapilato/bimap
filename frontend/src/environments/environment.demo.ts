import { AppEnvironment } from './environment.model';

/**
 * GitHub Pages. There is no backend, so identity, email and health are mocked in the browser.
 * Geography is left pointing at the public APIs, which the adapters call directly.
 */
export const environment: AppEnvironment = {
  production: true,
  appMode: 'demo',
  iamApiUrl: '',
  businessApiUrl: '',
  googleClientId: '543470445081-16vr7ola7vh6984uuom30rp7ljv1dl7n.apps.googleusercontent.com',
  /**
   * A Maps JS browser key. This one is public on purpose: it ships inside the bundle, so anybody
   * who opens the page can read it, and Google's answer to that is an HTTP-referrer restriction in
   * the Cloud console rather than secrecy. Restrict it to the origins that are meant to use it —
   * localhost and the GitHub Pages domain — or the quota is anyone's to spend.
   */
  googleMapsApiKey: 'AIzaSyAvQNjK8mukjCu4a5hNE7Sjg1I7g3syYAo',
};
