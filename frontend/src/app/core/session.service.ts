/**
 * Who is signed in, as signals.
 *
 * The session is the one piece of state the whole application reads, so it is a signal rather
 * than a subject: templates bind to it directly with no `async` pipe, no subscription to leak,
 * and no change detection to trigger. Everything else here is `computed` from it.
 *
 * @author Khova Krishna Pilato
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { AUTH_API } from './api/adapters';
import { Credentials, Registration, Session, UserAccount } from './api/models';

const STORAGE_KEY = 'bimap.session';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly #auth = inject(AUTH_API);
  readonly #router = inject(Router);

  readonly #session = signal<Session | null>(restore());

  readonly session = this.#session.asReadonly();
  readonly user = computed<UserAccount | null>(() => this.#session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.#session() !== null);
  readonly accessToken = computed(() => this.#session()?.accessToken ?? null);
  readonly role = computed(() => this.user()?.role ?? null);
  readonly permissions = computed(() => new Set(this.user()?.permissions ?? []));

  /** Two letters, the way every avatar in the product renders a person. */
  readonly initials = computed(() => {
    const account = this.user();
    if (!account) {
      return '··';
    }
    const first = account.firstName?.[0] ?? '';
    const last = account.lastName?.[0] ?? '';
    return (first + last || account.email[0]).toUpperCase();
  });

  readonly isAdministrator = computed(() => this.role() === 'ADMINISTRATOR');
  readonly canManageUsers = computed(() => this.permissions().has('user:read'));

  signIn(credentials: Credentials): Observable<Session> {
    return this.#auth.signIn(credentials).pipe(tap((session) => this.adopt(session)));
  }

  signUp(registration: Registration): Observable<UserAccount> {
    return this.#auth.signUp(registration);
  }

  verifyOtp(email: string, code: string): Observable<Session> {
    return this.#auth.verifyOtp(email, code).pipe(tap((session) => this.adopt(session)));
  }

  signInWithGoogle(idToken: string): Observable<Session> {
    return this.#auth.signInWithGoogle(idToken).pipe(tap((session) => this.adopt(session)));
  }

  adopt(session: Session): void {
    this.#session.set(session);
    persist(session);
  }

  signOut(): void {
    // Fire and forget: the local session goes regardless of what the server says.
    this.#auth.signOut().subscribe({ error: () => undefined });
    this.#session.set(null);
    localStorage.removeItem(STORAGE_KEY);
    void this.#router.navigate(['/']);
  }

  has(permission: string): boolean {
    return this.permissions().has(permission);
  }
}

function restore(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function persist(session: Session): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // A blocked storage quota costs persistence across reloads, nothing more.
  }
}
