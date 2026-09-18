import { bootstrapApplication } from '@angular/platform-browser';

import { environment } from './environments/environment';
import { App } from './app/app';
import { appConfig } from './app/app.config';

/**
 * The demo build pulls in its in-browser backend with a dynamic import, so the live bundle never
 * carries it. Switching between the two is `environment.demo` and nothing else.
 */
async function start(): Promise<void> {
  const mode = environment.demo ? (await import('./app/demo/demo-mode')).demoMode : undefined;
  await bootstrapApplication(App, appConfig(mode));
}

start().catch((error: unknown) => console.error(error));
