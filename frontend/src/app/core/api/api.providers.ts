/**
 * Where live and demo part company — and the only place they do.
 *
 * The Angular counterpart of a React `EnvironmentContext`: one provider set, resolved from
 * `environment.appMode`, which `fileReplacements` swaps at build time. Nothing downstream knows
 * which side it got, so no component contains a mode check.
 *
 * Geography is the deliberate exception. Even in demo mode it calls the real Comuni-ITA,
 * Nominatim and codiceunivoco APIs, because all three send `Access-Control-Allow-Origin: *` and
 * fake municipalities would make the whole cascade a lie.
 *
 * @author Khova Krishna Pilato
 */

import { EnvironmentProviders, Provider, makeEnvironmentProviders } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AUTH_API, EMAIL_API, GEO_API, HEALTH_API, IAM_API, REGISTRY_API } from './adapters';
import { HttpAuthAdapter } from './http/auth.http';
import { HttpEmailAdapter } from './http/email.http';
import { HttpGeoAdapter } from './http/geo.http';
import { HttpHealthAdapter } from './http/health.http';
import { HttpIamAdapter } from './http/iam.http';
import { HttpRegistryAdapter } from './http/registry.http';
import { PublicGeoAdapter } from './http/geo.public';
import { MockAuthAdapter } from './mock/auth.mock';
import { MockEmailAdapter } from './mock/email.mock';
import { MockHealthAdapter } from './mock/health.mock';
import { MockIamAdapter } from './mock/iam.mock';
import { MockRegistryAdapter } from './mock/registry.mock';

export function provideBimapApi(): EnvironmentProviders {
  const demo = environment.appMode === 'demo';

  // Always available: the HTTP email adapter falls back to it when the endpoint is not deployed.
  const shared: Provider[] = [MockEmailAdapter];

  const live: Provider[] = [
    { provide: AUTH_API, useClass: HttpAuthAdapter },
    { provide: GEO_API, useClass: HttpGeoAdapter },
    { provide: IAM_API, useClass: HttpIamAdapter },
    { provide: EMAIL_API, useClass: HttpEmailAdapter },
    { provide: HEALTH_API, useClass: HttpHealthAdapter },
    { provide: REGISTRY_API, useClass: HttpRegistryAdapter },
  ];

  const mocked: Provider[] = [
    { provide: AUTH_API, useClass: MockAuthAdapter },
    { provide: GEO_API, useClass: PublicGeoAdapter },
    { provide: IAM_API, useClass: MockIamAdapter },
    { provide: EMAIL_API, useExisting: MockEmailAdapter },
    { provide: HEALTH_API, useClass: MockHealthAdapter },
    { provide: REGISTRY_API, useClass: MockRegistryAdapter },
  ];

  return makeEnvironmentProviders([...shared, ...(demo ? mocked : live)]);
}

export const isDemoMode = environment.appMode === 'demo';

// Which half of the adapter table won is the single most confusing thing about this application
// from the outside — the two builds look identical until a login silently succeeds against nothing.
// So it says so, once, on the console, along with where it is actually pointing.
if (!environment.production || isDemoMode) {
  const target = isDemoMode
    ? 'mocked in the browser (geography is still live)'
    : `${environment.iamApiUrl} and ${environment.businessApiUrl}`;

  console.info(
    `%cBiMap%c ${environment.appMode.toUpperCase()} — ${target}`,
    'background:#1157e3;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700',
    'color:#47566b',
  );
}
