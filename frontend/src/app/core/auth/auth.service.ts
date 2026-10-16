import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../shared/toast.service';
import { DEMO_SESSION } from '../demo/demo-data';
import { LoginRequest, LoginResponse, SignupRequest } from './auth.models';

const STORAGE_KEY = 'session';

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

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.start('login', request);
  }

  signup(request: SignupRequest): Observable<LoginResponse> {
    return this.start('signup', request);
  }

  private start(path: 'login' | 'signup', request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.baseApiUrl}/auth/${path}`, request).pipe(
      tap((session) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        this.session.set(session);
        this.toast.show(`Welcome, ${session.user.name}.`);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.router.navigate(['/login']);
    this.toast.show('You are signed out.');
  }
}

function readSession(): LoginResponse | null {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as LoginResponse | null;
    return session?.token ? session : environment.demo ? DEMO_SESSION : null;
  } catch {
    return environment.demo ? DEMO_SESSION : null;
  }
}
