export type AccountStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'LOCKED' | 'DISABLED' | 'DELETED';

export type ApplicationRole = 'USER' | 'MANAGER' | 'ADMINISTRATOR';

export type AuthProvider = 'LOCAL' | 'GOOGLE';

export type Permission =
  | 'registration:read'
  | 'registration:write'
  | 'registration:read-all'
  | 'registration:export'
  | 'user:read'
  | 'user:write'
  | 'user:lifecycle'
  | 'mailing:read'
  | 'mailing:write';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  status: AccountStatus;
  role: ApplicationRole;
  authProvider: AuthProvider;
  passwordSet: boolean;
  permissions: Permission[];
  avatarUrl?: string;
  locale?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegistrationRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface EmailAvailability {
  email: string;
  available: boolean;
}

export interface UserStatistics {
  total: number;
  active: number;
  pendingActivation: number;
  locked: number;
  disabled: number;
}

export interface UserQuery {
  q?: string;
  status?: AccountStatus;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  /** Omit to send an invitation and let the person choose their own. */
  password?: string;
  role: ApplicationRole;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: ApplicationRole;
  locale?: string;
}

export interface AccountStatusChange {
  status: AccountStatus;
  reason?: string;
}

/** Which lifecycle moves the backend accepts from each state. */
export const ACCOUNT_TRANSITIONS: Record<AccountStatus, readonly AccountStatus[]> = {
  PENDING_ACTIVATION: ['ACTIVE', 'DISABLED', 'DELETED'],
  ACTIVE: ['LOCKED', 'DISABLED', 'DELETED'],
  LOCKED: ['ACTIVE', 'DISABLED', 'DELETED'],
  DISABLED: ['ACTIVE', 'DELETED'],
  DELETED: [],
};

/** Mirrors the backend policy so the checklist can be shown before anything is submitted. */
export const PASSWORD_RULES: ReadonlyArray<{ label: string; test: (value: string) => boolean }> = [
  { label: 'At least 12 characters', test: (v) => v.length >= 12 },
  { label: 'An uppercase letter', test: (v) => /\p{Lu}/u.test(v) },
  { label: 'A lowercase letter', test: (v) => /\p{Ll}/u.test(v) },
  { label: 'A digit', test: (v) => /\p{Nd}/u.test(v) },
  { label: 'A symbol', test: (v) => /[^\p{L}\p{N}\s]/u.test(v) },
  { label: 'No spaces', test: (v) => v.length > 0 && !/\s/.test(v) },
];

export const isStrongPassword = (value: string): boolean =>
  value.length <= 128 && PASSWORD_RULES.every((rule) => rule.test(value));
