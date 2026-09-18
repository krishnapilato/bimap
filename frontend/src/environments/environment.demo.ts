import { Environment } from './environment.model';

/**
 * The static GitHub Pages build. There is no backend: an in-browser fake answers every API call
 * with seeded data, while the maps and Street View stay real.
 */
export const environment: Environment = {
  production: true,
  demo: true,
  api: { iam: '/iam', core: '/core' },
  docs: { iam: 'https://github.com/krishnapilato/bimap', core: 'https://github.com/krishnapilato/bimap' },
  googleClientId: '',
  googleMapsApiKey: 'AIzaSyAvQNjK8mukjCu4a5hNE7Sjg1I7g3syYAo',
};
