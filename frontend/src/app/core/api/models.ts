/**
 * The shapes every feature speaks in.
 *
 * These mirror the BiMap backend contract, so the HTTP adapters pass responses through untouched
 * and the mock adapters have something concrete to fabricate. Nothing in the UI imports a backend
 * DTO directly; it imports from here.
 *
 * @author Khova Krishna Pilato
 */

// ── Identity ─────────────────────────────────────────────────────────────────

export type AccountStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'LOCKED' | 'DISABLED' | 'DELETED';
export type ApplicationRole = 'USER' | 'MANAGER' | 'ADMINISTRATOR';
export type AuthProvider = 'LOCAL' | 'GOOGLE';

export interface UserAccount {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly email: string;
  readonly status: AccountStatus;
  readonly role: ApplicationRole;
  readonly authProvider: AuthProvider;
  readonly permissions: readonly string[];
  readonly avatarUrl?: string | null;
  readonly locale?: string | null;
  readonly lastLoginAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Session {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: string;
  readonly expiresIn: number;
  readonly user: UserAccount;
}

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

export interface Registration {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly password: string;
}

export interface UserStatistics {
  readonly total: number;
  readonly active: number;
  readonly pendingActivation: number;
  readonly locked: number;
  readonly disabled: number;
}

export interface CreateUser {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly password?: string;
  readonly role: ApplicationRole;
}

export interface UpdateUser {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly email?: string;
  readonly role?: ApplicationRole;
  readonly locale?: string;
}

// ── Geography ────────────────────────────────────────────────────────────────

export interface Region {
  readonly name: string;
}

export interface Province {
  readonly code: string;
  readonly name: string;
  readonly abbreviation: string;
  readonly region: string;
}

export interface Municipality {
  readonly istatCode: string;
  readonly name: string;
  readonly cadastralCode: string | null;
  readonly postalCode: string | null;
  readonly province: string | null;
  readonly provinceCode: string | null;
  readonly region: string | null;
  readonly population: number | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

export interface ResolvedAddress {
  readonly label: string;
  readonly street: string | null;
  readonly houseNumber: string | null;
  readonly postalCode: string | null;
  readonly municipality: string | null;
  readonly province: string | null;
  readonly region: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

export interface EntityCode {
  readonly name: string;
  readonly billingCode: string | null;
  readonly ipaCode: string | null;
  readonly taxCode: string | null;
  readonly category: string | null;
  readonly municipality: string | null;
  readonly province: string | null;
  readonly region: string | null;
  readonly offices: number | null;
  readonly reference: string | null;
}

/** Everything the guided cascade has settled on so far. Each member narrows the next lookup. */
export interface GeoScope {
  readonly region?: string;
  readonly province?: string;
  readonly municipality?: string;
  readonly street?: string;
}

// ── Email ────────────────────────────────────────────────────────────────────

export type DispatchStatus = 'QUEUED' | 'SENT' | 'FAILED';
export type DispatchFormat = 'HTML' | 'TEXT';

export interface EmailAttachment {
  readonly filename: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  /** Base64, only on the way out. The log stores names and sizes, never the payload. */
  readonly content?: string;
}

export interface EmailMessage {
  readonly id: string;
  readonly to: string;
  readonly subject: string;
  /** The transactional template that produced it, or null when it was written by hand. */
  readonly template?: string | null;
  readonly format: DispatchFormat;
  readonly body: string;
  readonly attachments: readonly EmailAttachment[];
  readonly status: DispatchStatus;
  readonly failureReason?: string | null;
  readonly sentAt: string;
}

/**
 * No `format`: the server derives it from the body, and a sender who declares it separately has a
 * second chance to be wrong about their own message.
 */
export interface ComposeEmail {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
  readonly attachments: readonly EmailAttachment[];
}

// ── Health ───────────────────────────────────────────────────────────────────

export interface HealthComponent {
  readonly name: string;
  readonly status: string;
}

export interface RuntimeSnapshot {
  readonly service: string;
  readonly version: string;
  readonly status: string;
  readonly components: readonly HealthComponent[];
  readonly profiles: readonly string[];
  readonly runtime: {
    readonly java: string;
    readonly jvm: string;
    readonly os: string;
    readonly architecture: string;
    readonly port: number;
  };
  readonly uptime: { readonly seconds: number; readonly display: string };
  readonly heap: Memory;
  readonly nonHeap: Memory;
  readonly cpu: { readonly process: number; readonly system: number; readonly cores: number };
  readonly threads: { readonly live: number; readonly daemon: number; readonly peak: number };
  readonly http: {
    readonly requests: number;
    readonly averageMillis: number;
    readonly slowestMillis: number;
    readonly clientErrors: number;
    readonly serverErrors: number;
  };
  readonly database: {
    readonly active: number;
    readonly idle: number;
    readonly max: number;
    readonly pending: number;
  };
  readonly startedAt: string;
  readonly sampledAt: string;
}

export interface Memory {
  readonly used: number;
  readonly committed: number;
  readonly max: number;
  readonly usedRatio: number;
  readonly display: string;
  readonly usedDisplay: string;
  readonly maxDisplay: string;
}

// ── Shared ───────────────────────────────────────────────────────────────────

export interface Page<T> {
  readonly content: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
  readonly first: boolean;
  readonly last: boolean;
}

/** RFC 7807, exactly as both services emit it. */
export interface ProblemDetail {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance?: string;
  readonly code?: string;
  readonly correlationId?: string;
  readonly violations?: readonly FieldViolation[];
}

export interface FieldViolation {
  readonly field: string;
  readonly message: string;
  readonly rejectedValue?: unknown;
}

// ── Registrations ────────────────────────────────────────────────────────────

/** Everything the guided cascade assembles, ready to be recorded. */
export interface AssetRegistrationDraft {
  readonly region: string;
  readonly provinceName: string;
  readonly provinceCode: string;
  readonly municipality: string;
  readonly istatCode: string;
  readonly cadastralCode?: string | null;
  readonly postalCode?: string | null;
  readonly address: string;
  readonly houseNumber?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly assetName: string;
  readonly entityName?: string | null;
  readonly entityBillingCode?: string | null;
}

/** How the draft was dealt with, so the view can say something true about it. */
export interface RegistrationOutcome {
  readonly id: string;
  readonly persisted: boolean;
  readonly downloadedAs?: string;
}
