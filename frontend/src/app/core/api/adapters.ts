/**
 * The five ports the UI talks to, and the tokens that resolve them.
 *
 * Every feature depends on an interface here, never on an implementation. Which implementation
 * arrives is decided once, in `api.providers.ts`, from the build configuration: the HTTP adapters
 * against the live Spring Boot services, or the mock adapters backed by localStorage for the
 * static GitHub Pages build.
 *
 * The consequence worth having: a component cannot tell which mode it is running in, so there is
 * no `if (demo)` anywhere in the views.
 *
 * @author Khova Krishna Pilato
 */

import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ComposeEmail,
  CreateUser,
  Credentials,
  EmailMessage,
  EntityCode,
  GeoScope,
  Municipality,
  Page,
  Province,
  Region,
  Registration,
  ResolvedAddress,
  RuntimeSnapshot,
  Session,
  UpdateUser,
  UserAccount,
  UserStatistics,
  AccountStatus,
  AssetRegistrationDraft,
  RegistrationOutcome,
} from './models';

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthApi {
  signIn(credentials: Credentials): Observable<Session>;
  signUp(registration: Registration): Observable<UserAccount>;
  /** Confirms the six-digit code from the activation email and opens a session. */
  verifyOtp(email: string, code: string): Observable<Session>;
  resendOtp(email: string): Observable<void>;
  signInWithGoogle(idToken: string): Observable<Session>;
  refresh(refreshToken: string): Observable<Session>;
  signOut(): Observable<void>;
  isEmailAvailable(email: string): Observable<boolean>;
  requestPasswordReset(email: string): Observable<void>;
  currentUser(): Observable<UserAccount>;
}

export const AUTH_API = new InjectionToken<AuthApi>('BiMap AuthApi');

// ── Geography ────────────────────────────────────────────────────────────────

export interface GeoApi {
  regions(query: string, limit?: number): Observable<readonly Region[]>;
  provinces(query: string, scope: GeoScope, limit?: number): Observable<readonly Province[]>;
  municipalities(query: string, scope: GeoScope, limit?: number): Observable<readonly Municipality[]>;
  municipalityByIstat(istatCode: string): Observable<Municipality>;
  addresses(street: string, scope: GeoScope, limit?: number): Observable<readonly ResolvedAddress[]>;
  postalCodes(scope: GeoScope, limit?: number): Observable<readonly string[]>;
  entityCodes(query: string, scope: GeoScope, limit?: number): Observable<readonly EntityCode[]>;
}

export const GEO_API = new InjectionToken<GeoApi>('BiMap GeoApi');

// ── Identity and access management ───────────────────────────────────────────

export interface UserQuery {
  readonly search?: string;
  readonly status?: AccountStatus;
  readonly page?: number;
  readonly size?: number;
}

export interface IamApi {
  search(query: UserQuery): Observable<Page<UserAccount>>;
  statistics(): Observable<UserStatistics>;
  findOne(id: string): Observable<UserAccount>;
  create(request: CreateUser): Observable<UserAccount>;
  update(id: string, request: UpdateUser): Observable<UserAccount>;
  changeStatus(id: string, status: AccountStatus, reason?: string): Observable<UserAccount>;
  remove(id: string): Observable<void>;
}

export const IAM_API = new InjectionToken<IamApi>('BiMap IamApi');

// ── Email ────────────────────────────────────────────────────────────────────

export interface EmailApi {
  history(): Observable<readonly EmailMessage[]>;
  send(message: ComposeEmail): Observable<EmailMessage>;
}

export const EMAIL_API = new InjectionToken<EmailApi>('BiMap EmailApi');

// ── Health ───────────────────────────────────────────────────────────────────

export interface HealthApi {
  /** One snapshot per service, so the dashboard can show both at once. */
  snapshots(): Observable<readonly RuntimeSnapshot[]>;
}

export const HEALTH_API = new InjectionToken<HealthApi>('BiMap HealthApi');

// ── Registrations ────────────────────────────────────────────────────────────

export interface RegistryApi {
  /**
   * Records what the cascade assembled. In demo mode there is nowhere to persist it, so the
   * adapter hands the surveyor a CSV of the same row instead of pretending to have saved it.
   */
  create(draft: AssetRegistrationDraft): Observable<RegistrationOutcome>;
}

export const REGISTRY_API = new InjectionToken<RegistryApi>('BiMap RegistryApi');
