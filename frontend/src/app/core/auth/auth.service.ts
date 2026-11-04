import { HttpClient } from '@angular/common/http';
import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../shared/toast.service';
import { DEMO_SESSION } from '../demo/demo-data';
import { LoginRequest, LoginResponse, SignupRequest } from './auth.models';
import { ROLES } from '../../features/users/user.models';
import { SessionUser } from './auth.models';

const STORAGE_KEY = environment.demo ? 'demo-session' : 'session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  private readonly session = signal<LoginResponse | null>(readSession());

  readonly token = computed(() => this.session()?.token ?? null);
  readonly user = computed(() => this.session()?.user ?? null);
  readonly isLoggedIn = computed(() => this.token() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'ADMINISTRATOR');

  constructor() {
    effect((onCleanup) => {
      const token = this.token();
      const expires = token && !environment.demo ? tokenExpiry(token) : null;
      if (expires !== null) {
        const timer = setTimeout(() => this.expire(token), Math.max(0, expires - Date.now()));
        onCleanup(() => clearTimeout(timer));
      }
    });
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const previous = this.token();
      const session = readSession(false);
      this.session.set(session);
      if (previous && !session) this.redirectToLogin('You were signed out in another tab.');
    };
    globalThis.addEventListener('storage', sync);
    inject(DestroyRef).onDestroy(() => globalThis.removeEventListener('storage', sync));
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.start('login', request);
  }

  signup(request: SignupRequest): Observable<LoginResponse> {
    return this.start('signup', request);
  }

  private start(path: 'login' | 'signup', request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.baseApiUrl}/auth/${path}`, request).pipe(
      tap((session) => {
        if (!isSession(session)) throw new Error('Invalid sign-in response.');
        persist(session);
        this.session.set(session);
        this.toast.show(`Welcome, ${session.user.name}.`);
      }),
    );
  }

  updateUser(user: SessionUser): void {
    const current = this.session();
    if (current?.user.id !== user.id) return;
    const session = { ...current, user };
    persist(session);
    this.session.set(session);
  }

  expire(token: string | null): void {
    if (token && this.token() === token) this.logout('Your session expired. Sign in again.', true);
  }

  logout(message = 'You are signed out.', preserveRoute = false): void {
    persist(null);
    this.session.set(null);
    this.redirectToLogin(message, preserveRoute);
  }

  private redirectToLogin(message: string, preserveRoute = false): void {
    const returnUrl = preserveRoute && !this.router.url.startsWith('/login') ? this.router.url : undefined;
    void this.router.navigate(['/login'], { queryParams: { returnUrl } });
    this.toast.show(message);
  }
}

function persist(session: LoginResponse | null): void {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable; the current tab can still use its in-memory session.
  }
}

export function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const claims: unknown = JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/')));
    return claims && typeof claims === 'object' && 'exp' in claims && typeof claims.exp === 'number' && Number.isFinite(claims.exp)
      ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isSession(value: unknown): value is LoginResponse {
  if (!value || typeof value !== 'object' || !('token' in value) || typeof value.token !== 'string' || !('user' in value)) return false;
  const user = value.user;
  if (!user || typeof user !== 'object') return false;
  const validUser = 'id' in user && typeof user.id === 'number' && Number.isSafeInteger(user.id) && user.id > 0
    && 'name' in user && typeof user.name === 'string' && 'surname' in user && typeof user.surname === 'string'
    && 'email' in user && typeof user.email === 'string' && 'role' in user && ROLES.some((role) => role === user.role);
  const expires = tokenExpiry(value.token);
  return validUser && (environment.demo ? value.token === 'demo' : expires !== null && expires > Date.now());
}

function readSession(defaultDemo = true): LoginResponse | null {
  try {
    const session: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (isSession(session)) return session;
  } catch {
    // Invalid JSON or restricted storage is treated as a signed-out session.
  }
  persist(null);
  return environment.demo && defaultDemo ? structuredClone(DEMO_SESSION) : null;
}
