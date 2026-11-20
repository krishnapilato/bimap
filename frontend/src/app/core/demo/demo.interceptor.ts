import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { delay, from, map, Observable, of, throwError } from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { apiPath } from '../auth/api-path';
import { Asset, AssetForm } from '../../features/assets/asset.models';
import { User, UserRequest } from '../../features/users/user.models';
import { SignupRequest } from '../auth/auth.models';
import { USERS } from './demo-data';

@Injectable({ providedIn: 'root' })
export class DemoStore {
  readonly users = USERS.map((user) => ({ ...user }));
  private catalog?: Promise<Asset[]>;
  readonly forms: AssetForm[] = [];

  get assets(): Promise<Asset[]> {
    this.catalog ??= import('./demo-assets').then(({ ASSETS }) => this.readAssets(ASSETS));
    return this.catalog;
  }

  private readAssets(assets: Asset[]): Asset[] {
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem('bimap-demo-assets:v1') ?? 'null');
      // Reference data is immutable; discard stale or tampered snapshots.
      if (JSON.stringify(stored) === JSON.stringify(assets)) return stored as Asset[];
      sessionStorage.setItem('bimap-demo-assets:v1', JSON.stringify(assets));
    } catch { /* Storage can be unavailable or full; retain the complete catalog in memory. */ }
    return assets.map((asset) => ({ ...asset }));
  }
}

export const demoInterceptor: HttpInterceptorFn = (request, next) => {
  const path = apiPath(request.url);
  return path === null ? next(request) : respond(request, path, inject(DemoStore));
};

function respond(request: HttpRequest<unknown>, path: string, store: DemoStore): Observable<HttpResponse<unknown>> {
  const { users, forms } = store;
  const [, resource, id, action] = path.split('/');
  const user = users.find((user) => user.id === Number(id));
  const route = [`${request.method} /${resource}`, id && ':id', action].filter(Boolean).join('/');

  switch (route) {
    case 'POST /auth/:id':
      return authenticate(id, request.body as SignupRequest, store);
    case 'GET /assets':
      return from(store.assets).pipe(map((body) => new HttpResponse({ body })));
    case 'POST /forms':
      forms.push({ ...(request.body as AssetForm), id: forms.length + 1 });
      return ok(forms.at(-1), 201);
    case 'GET /forms/:id':
      return id === 'export.csv' ? ok(new Blob([csv(forms)], { type: 'text/csv;charset=UTF-8' })) : fail(404);
    case 'GET /users/:id':
      return id === 'exists' ? ok(taken(request.params.get('email') ?? '', store)) : fail(404);
    case 'GET /users':
      return ok(users.map((user) => ({ ...user })));
    case 'POST /users':
      return create(request.body as UserRequest, store);
    case 'PUT /users/:id':
      return user ? update(user, request.body as UserRequest, store) : fail(404);
    case 'DELETE /users/:id':
      return remove(user, users);
    case 'POST /users/:id/welcome-email':
      return user ? ok(null, 204) : fail(404);
    default:
      return fail(404);
  }
}

function authenticate(action: string | undefined, request: SignupRequest, store: DemoStore) {
  if (action === 'login') return login(request, store);
  return action === 'signup' ? signup(request, store) : fail(404);
}

function remove(user: User | undefined, users: User[]) {
  if (!user) return fail(404);
  if (lastAdministrator(user, users)) return fail(409, 'The last active administrator cannot be removed, disabled or demoted.');
  users.splice(users.indexOf(user), 1);
  return ok(null, 204);
}

function login({ email }: SignupRequest, { users }: DemoStore) {
  const user = users.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.enabled,);
  return user ? ok(session(user)) : fail(401);
}

function signup(request: SignupRequest, store: DemoStore) {
  const { users } = store;
  if (taken(request.email, store)) return fail(409);
  const user: User = {
    id: nextId(users),
    name: request.name,
    surname: request.surname,
    email: request.email,
    role: 'USER',
    enabled: true,
  };
  users.push(user);
  return ok(session(user), 201);
}

function create(request: UserRequest, store: DemoStore) {
  const { users } = store;
  if (taken(request.email, store)) return fail(409);
  const user: User = {
    id: nextId(users),
    name: request.name,
    surname: request.surname,
    email: request.email,
    role: request.role,
    enabled: request.enabled ?? true,
  };
  users.push(user);
  return ok({ ...user }, 201);
}

function update(user: User, request: UserRequest, store: DemoStore) {
  if (taken(request.email, store, user.id)) return fail(409, 'This email is already registered.');
  if (lastAdministrator(user, store.users) && (request.role !== 'ADMINISTRATOR' || request.enabled === false)) {
    return fail(409, 'The last active administrator cannot be removed, disabled or demoted.');
  }
  Object.assign(user, {
    name: request.name,
    surname: request.surname,
    email: request.email,
    role: request.role,
    enabled: request.enabled ?? user.enabled,
  });
  return ok({ ...user });
}

function csv(forms: AssetForm[]): string {
  const header = 'id,region,province,municipality,address,name,istatCode,latitude,longitude,number,goodID';
  const rows = forms.map((form) =>
    [
      form.id,
      form.region,
      form.province,
      form.municipality,
      form.address,
      form.goodNaming,
      form.istatCode ?? '',
      form.latitude,
      form.longitude,
      form.number,
      form.goodID,
    ]
      .map((value) => {
        const safe = typeof value === 'string' && /^[=+@\-\t\r\n]/.test(value) ? `'${value}` : String(value);
        return `"${safe.replaceAll('"', '""')}"`;
      })
      .join(','),
  );
  return [header, ...rows].join('\n');
}

const session = ({ enabled, ...user }: User) => ({ token: 'demo', user });
const taken = (email: string, { users }: DemoStore, except?: number) => users.some((user) => user.id !== except && user.email.toLowerCase() === email.toLowerCase());
const nextId = (users: User[]) => Math.max(0, ...users.map((user) => user.id)) + 1;
const ok = (body: unknown, status = 200) => of(new HttpResponse({ status, body })).pipe(delay(250));
const fail = (status: number, detail = 'Demo request failed.') => throwError(() => new HttpErrorResponse({ status, error: { detail } }));
const lastAdministrator = (user: User, users: User[]) => user.role === 'ADMINISTRATOR' && user.enabled && users.filter((account) => account.role === 'ADMINISTRATOR' && account.enabled).length === 1;
