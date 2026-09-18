import { EnvironmentProviders, InjectionToken, Provider } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

import { ApplicationRole } from './api/iam.models';

/** What differs between the live application and the demo: extra interceptors and providers. */
export interface AppMode {
  interceptors: HttpInterceptorFn[];
  providers: Array<Provider | EnvironmentProviders>;
}

export const LIVE_MODE: AppMode = { interceptors: [], providers: [] };

/** The demo's own controls, present only in the demo build. */
export interface DemoControlsApi {
  switchTo(role: ApplicationRole): Promise<void>;
  /** Signs out without ending the demo, so the sign-in screens can be seen. */
  previewSignIn(): Promise<void>;
  reset(): void;
}

export const DEMO_CONTROLS = new InjectionToken<DemoControlsApi>('DEMO_CONTROLS');
