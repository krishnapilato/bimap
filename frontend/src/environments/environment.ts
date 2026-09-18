import { Environment } from './environment.model';

/** Local development: the dev server proxies `/iam` and `/core` to the two services. */
export const environment: Environment = {
  production: true,
  demo: false,
  api: { iam: '/iam', core: '/core' },
  docs: { iam: 'http://localhost:9843', core: 'http://localhost:9844' },
  googleClientId: '543470445081-16vr7ola7vh6984uuom30rp7ljv1dl7n.apps.googleusercontent.com',
  googleMapsApiKey: 'AIzaSyAvQNjK8mukjCu4a5hNE7Sjg1I7g3syYAo',
};
