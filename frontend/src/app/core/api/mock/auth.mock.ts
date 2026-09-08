/**
 * Identity, in the browser.
 *
 * Any of the seeded addresses signs in with the demo password, and a fresh sign-up walks the real
 * flow: the account is created pending activation, a six-digit code is minted, and the modal has
 * something genuine to verify. The code is deliberately visible in the console — there is no
 * mailbox to deliver it to.
 *
 * @author Khova Krishna Pilato
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthApi } from '../adapters';
import { Credentials, Registration, Session, UserAccount } from '../models';
import { MockKeys, fail, read, respond, saveUsers, users, write } from './mock-store';

/** Published on the landing page, so a visitor can get in without guessing. */
export const DEMO_PASSWORD = 'Cadastr0-Rilievo!';

interface PendingActivation {
  readonly email: string;
  readonly code: string;
  readonly issuedAt: number;
}

@Injectable()
export class MockAuthAdapter implements AuthApi {
  signIn(credentials: Credentials): Observable<Session> {
    const account = users().find(
      (user) => user.email.toLowerCase() === credentials.email.toLowerCase(),
    );

    // Wrong password and unknown address answer identically, exactly as the server does.
    if (!account || credentials.password !== DEMO_PASSWORD) {
      return fail(
        401,
        'Invalid credentials',
        'The email address or password is incorrect',
        'INVALID_CREDENTIALS',
      );
    }
    if (account.status === 'PENDING_ACTIVATION') {
      return fail(
        403,
        'Account is not activated',
        'Confirm your email address before signing in.',
        'ACCOUNT_NOT_ACTIVATED',
      );
    }
    if (account.status !== 'ACTIVE') {
      return fail(
        403,
        'Account is not active',
        'This account is no longer active.',
        'ACCOUNT_DISABLED',
      );
    }

    return respond(this.#open(this.#touch(account)));
  }

  signUp(registration: Registration): Observable<UserAccount> {
    const all = users();
    if (all.some((user) => user.email.toLowerCase() === registration.email.toLowerCase())) {
      return fail(
        409,
        'Email address already registered',
        'An account already exists for this email address.',
        'EMAIL_ALREADY_REGISTERED',
      );
    }

    const nowIso = new Date().toISOString();
    const created: UserAccount = {
      id: crypto.randomUUID(),
      firstName: registration.firstName,
      lastName: registration.lastName,
      fullName: `${registration.firstName} ${registration.lastName}`.trim(),
      email: registration.email.toLowerCase(),
      status: 'PENDING_ACTIVATION',
      role: 'USER',
      authProvider: 'LOCAL',
      permissions: ['registration:read', 'registration:write'],
      locale: 'it-IT',
      lastLoginAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    saveUsers([created, ...all]);
    this.#issueCode(created.email);
    return respond(created);
  }

  verifyOtp(email: string, code: string): Observable<Session> {
    const pending = read<PendingActivation | null>(MockKeys.pendingOtp, null);

    if (!pending || pending.email.toLowerCase() !== email.toLowerCase()) {
      return fail(
        401,
        'Token is not valid',
        'This link is no longer valid. Request a new one.',
        'TOKEN_INVALID',
      );
    }
    if (pending.code !== code.trim()) {
      return fail(401, 'Token is not valid', 'That code is not correct.', 'TOKEN_INVALID');
    }

    const activated = users().map((user) =>
      user.email.toLowerCase() === email.toLowerCase()
        ? { ...user, status: 'ACTIVE' as const, updatedAt: new Date().toISOString() }
        : user,
    );
    saveUsers(activated);
    localStorage.removeItem(MockKeys.pendingOtp);

    const account = activated.find((user) => user.email.toLowerCase() === email.toLowerCase())!;
    return respond(this.#open(this.#touch(account)));
  }

  resendOtp(email: string): Observable<void> {
    this.#issueCode(email);
    return respond(undefined as void);
  }

  signInWithGoogle(): Observable<Session> {
    // Nothing to verify without a server, so the demo signs in as the Google-linked seed account.
    const account = users().find((user) => user.authProvider === 'GOOGLE') ?? users()[0];
    return respond(this.#open(this.#touch(account)));
  }

  refresh(): Observable<Session> {
    const session = read<Session | null>(MockKeys.session, null);
    return session
      ? respond(session)
      : fail(401, 'Token has expired', 'Sign in again.', 'TOKEN_EXPIRED');
  }

  signOut(): Observable<void> {
    localStorage.removeItem(MockKeys.session);
    return respond(undefined as void);
  }

  isEmailAvailable(email: string): Observable<boolean> {
    return respond(!users().some((user) => user.email.toLowerCase() === email.toLowerCase()));
  }

  requestPasswordReset(): Observable<void> {
    // Always reports success: whether the address exists is not the caller's business.
    return respond(undefined as void);
  }

  currentUser(): Observable<UserAccount> {
    const session = read<Session | null>(MockKeys.session, null);
    return session
      ? respond(session.user)
      : fail(401, 'Authentication required', 'Sign in first.', 'AUTHENTICATION_REQUIRED');
  }

  /** Six digits, kept where the modal can reach it and printed for the visitor. */
  #issueCode(email: string): string {
    const code = String(Math.floor(100_000 + Math.random() * 900_000));
    write<PendingActivation>(MockKeys.pendingOtp, { email, code, issuedAt: Date.now() });
    console.info(`[BiMap demo] activation code for ${email}: ${code}`);
    return code;
  }

  #touch(account: UserAccount): UserAccount {
    const updated = { ...account, lastLoginAt: new Date().toISOString() };
    saveUsers(users().map((user) => (user.id === account.id ? updated : user)));
    return updated;
  }

  #open(user: UserAccount): Session {
    const session: Session = {
      accessToken: `demo.${btoa(user.email)}.${Date.now()}`,
      refreshToken: `demo-refresh.${crypto.randomUUID()}`,
      tokenType: 'Bearer',
      expiresIn: 900,
      user,
    };
    return write(MockKeys.session, session);
  }
}

/** The pending code, so the demo can offer to fill it in rather than hiding it in the console. */
export function peekDemoOtp(): string | null {
  return read<PendingActivation | null>(MockKeys.pendingOtp, null)?.code ?? null;
}
