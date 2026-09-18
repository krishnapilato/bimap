import { Environment } from './environment.model';

/** Behind nginx, which serves the bundle and proxies both services on the same origin. */
export const environment: Environment = {
  production: true,
  demo: false,
  api: { iam: '/iam', core: '/core' },
  docs: { iam: '/iam', core: '/core' },
  googleClientId: '543470445081-16vr7ola7vh6984uuom30rp7ljv1dl7n.apps.googleusercontent.com',
  googleMapsApiKey: 'AIzaSyAvQNjK8mukjCu4a5hNE7Sjg1I7g3syYAo',
};
