import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../shared/toast.service';
import { LoginResponse } from './auth.models';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

const session = (seconds = 3600): LoginResponse => ({
  token: `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds }))}.signature`,
  user: { id: 1, name: 'Test', surname: 'User', email: 'test@example.com', role: 'ADMINISTRATOR' },
});

describe('AuthService and interceptor', () => {
  let http: HttpClient;
  let requests: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([]),
      { provide: ToastService, useValue: { show: vi.fn() } },
    ] });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    requests.verify();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('rejects malformed or expired persisted sessions', () => {
    localStorage.setItem('session', JSON.stringify({ token: 'bad', user: null }));
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
  });

  it('does not restore expired tokens', () => {
    localStorage.setItem('session', JSON.stringify(session(-60)));
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
  });

  it('can sign in when browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage disabled'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage disabled'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('Storage disabled'); });
    const auth = TestBed.inject(AuthService);
    const result = firstValueFrom(auth.login({ email: 'test@example.com', password: 'password' }));
    requests.expectOne(`${environment.baseApiUrl}/auth/login`).flush(session());
    await result;
    expect(auth.isAdmin()).toBe(true);
  });

  it('expires a session without waiting for an API request', () => {
    vi.useFakeTimers();
    localStorage.setItem('session', JSON.stringify(session(1)));
    const auth = TestBed.inject(AuthService);
    TestBed.tick();
    vi.advanceTimersByTime(1001);
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('synchronises logout between tabs', () => {
    localStorage.setItem('session', JSON.stringify(session()));
    const auth = TestBed.inject(AuthService);
    localStorage.removeItem('session');
    globalThis.dispatchEvent(new StorageEvent('storage', { key: 'session' }));
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('attaches a token only to the backend and leaves login requests public', async () => {
    localStorage.setItem('session', JSON.stringify(session()));
    for (const url of [`${environment.baseApiUrl}/users`, `${environment.baseApiUrl}/auth/login`, 'https://external.example/users']) {
      const result = firstValueFrom(http.get(url));
      const request = requests.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(url === `${environment.baseApiUrl}/users`);
      request.flush({});
      await result;
    }
  });

  it('does not clear the session for third-party errors or failed sign-ins', async () => {
    localStorage.setItem('session', JSON.stringify(session()));
    const auth = TestBed.inject(AuthService);
    for (const url of ['https://external.example/data', `${environment.baseApiUrl}/auth/login`]) {
      const result = firstValueFrom(http.get(url)).catch(() => undefined);
      requests.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });
      await result;
      expect(auth.isLoggedIn()).toBe(true);
    }
  });

  it('ignores a late 401 from the session that has already been replaced', async () => {
    localStorage.setItem('session', JSON.stringify(session()));
    const auth = TestBed.inject(AuthService);
    const old = firstValueFrom(http.get(`${environment.baseApiUrl}/assets`)).catch(() => undefined);
    const request = requests.expectOne(`${environment.baseApiUrl}/assets`);
    const signIn = firstValueFrom(auth.login({ email: 'test@example.com', password: 'password' }));
    requests.expectOne(`${environment.baseApiUrl}/auth/login`).flush(session(7200));
    await signIn;
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    await old;
    expect(auth.isLoggedIn()).toBe(true);
  });
});
