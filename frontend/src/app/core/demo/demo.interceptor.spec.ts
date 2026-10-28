import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse } from '../auth/auth.models';
import { User } from '../../features/users/user.models';
import { demoInterceptor } from './demo.interceptor';

describe('demoInterceptor', () => {
  const api = environment.baseApiUrl;
  let http: HttpClient;

  const statusOf = (request: Promise<unknown>) =>
    request.then(() => 200).catch((error: unknown) => (error instanceof HttpErrorResponse ? error.status : 0));

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([demoInterceptor]))] });
    http = TestBed.inject(HttpClient);
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
