export interface Environment {
  production: boolean;
  /** When true, an in-browser fake backend answers every API call. */
  demo: boolean;
  /** Where each service is reached from the browser. */
  api: { iam: string; core: string };
  /** Service roots whose `/swagger-ui.html` the health screen links to. */
  docs: { iam: string; core: string };
  /** OAuth client id for Google sign-in; empty hides the Google button. */
  googleClientId: string;
  googleMapsApiKey: string;
}
