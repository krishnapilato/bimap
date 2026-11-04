import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse } from '../auth/auth.models';
import { User } from '../../features/users/user.models';
import { demoInterceptor, DemoStore } from './demo.interceptor';
import { Asset } from '../../features/assets/asset.models';

describe('demoInterceptor', () => {
  const api = environment.baseApiUrl;
  let http: HttpClient;

  const statusOf = (request: Promise<unknown>) =>
    request.then(() => 200).catch((error: unknown) => (error instanceof HttpErrorResponse ? error.status : 0));

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([demoInterceptor]))] });
    http = TestBed.inject(HttpClient);
  });

  it('loads all 687 reference assets and restores the session snapshot', async () => {
    const assets = await firstValueFrom(http.get<Asset[]>(`${api}/assets`));
    expect(assets).toHaveLength(687);
    expect(new Set(assets.map((asset) => asset.id)).size).toBe(687);
    expect(assets.at(-1)?.denominazione).toBe('Palazzo Spinola');
    expect(JSON.parse(sessionStorage.getItem('bimap-demo-assets:v1') ?? 'null')).toEqual(assets);
    expect(await new DemoStore().assets).toEqual(assets);
  });

  it('repairs a corrupt session snapshot and works when storage is blocked', async () => {
    sessionStorage.setItem('bimap-demo-assets:v1', '{broken');
    expect(await new DemoStore().assets).toHaveLength(687);
    const storage = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    expect(await new DemoStore().assets).toHaveLength(687);
    storage.mockRestore();
  });

  it('signs in an enabled demo user with any password', async () => {
    const session = await firstValueFrom(http.post<LoginResponse>(`${api}/auth/login`, { email: 'giulia.rossi@example.com', password: 'anything' }));
    expect(session.token).toBe('demo');
    expect(session.user.role).toBe('ADMINISTRATOR');
  });

  it('refuses a disabled user', async () => {
    const status = await statusOf(firstValueFrom(http.post(`${api}/auth/login`, { email: 'arjun.sharma@example.com', password: 'anything' })));
    expect(status).toBe(401);
  });

  it('rejects a sign-up with an email that is already registered', async () => {
    const request = { name: 'Giulia', surname: 'Rossi', email: 'giulia.rossi@example.com', password: 'password1' };
    expect(await statusOf(firstValueFrom(http.post(`${api}/auth/signup`, request)))).toBe(409);
  });

  it('deletes a user', async () => {
    await firstValueFrom(http.delete(`${api}/users/4`));
    const users = await firstValueFrom(http.get<User[]>(`${api}/users`));
    expect(users.some((user) => user.id === 4)).toBe(false);
  });
});
