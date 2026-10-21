import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { delay, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssetForm } from '../../features/assets/asset.models';
import { User, UserRequest } from '../../features/users/user.models';
import { SignupRequest } from '../auth/auth.models';
import { ASSETS, USERS } from './demo-data';

const users = [...USERS];
const forms: AssetForm[] = [];

export const demoInterceptor: HttpInterceptorFn = (request, next) => request.url.startsWith(environment.baseApiUrl) ? respond(request) : next(request);

function respond(request: HttpRequest<unknown>): Observable<HttpResponse<unknown>> {
  const path = request.url.slice(environment.baseApiUrl.length);
  const [, resource, id, action] = path.split('/');
  const user = users.find((user) => user.id === Number(id));
  const route = `${request.method} /${resource}${id ? '/:id' : ''}${action ? `/${action}` : ''}`;

  switch (route) {
    case 'POST /auth/:id':
      return id === 'login'
        ? login(request.body as SignupRequest)
        : signup(request.body as SignupRequest);
    case 'GET /assets':
      return ok(ASSETS);
    case 'POST /forms':
      forms.push({ ...(request.body as AssetForm), id: forms.length + 1 });
      return ok(forms.at(-1), 201);
    case 'GET /forms/:id':
      return ok(new Blob([csv()], { type: 'text/csv' }));
    case 'GET /users':
      return ok(users.map((user) => ({ ...user })));
    case 'POST /users':
      return create(request.body as UserRequest);
    case 'PUT /users/:id':
      return user ? update(user, request.body as UserRequest) : fail(404);
    case 'DELETE /users/:id':
      return user ? ok(users.splice(users.indexOf(user), 1) && null, 204) : fail(404);
    case 'POST /users/:id/welcome-email':
      return user ? ok(null, 204) : fail(404);
    default:
      return fail(404);
  }
}

function login({ email }: SignupRequest) {
  const user = users.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.enabled,);
  return user ? ok(session(user)) : fail(401);
}

function signup(request: SignupRequest) {
  if (taken(request.email)) return fail(409);
  const user: User = {
    id: nextId(),
    name: request.name,
    surname: request.surname,
    email: request.email,
    role: 'USER',
    enabled: true,
  };
  users.push(user);
  return ok(session(user), 201);
}

function create(request: UserRequest) {
  if (taken(request.email)) return fail(409);
  const user: User = {
    id: nextId(),
    name: request.name,
    surname: request.surname,
    email: request.email,
    role: request.role,
    enabled: request.enabled ?? true,
  };
  users.push(user);
  return ok({ ...user }, 201);
}

function update(user: User, request: UserRequest) {
  if (request.email !== user.email && taken(request.email)) return fail(409);
  Object.assign(user, {
    name: request.name,
    surname: request.surname,
    email: request.email,
    role: request.role,
    enabled: request.enabled ?? user.enabled,
  });
  return ok({ ...user });
}

function csv(): string {
  const header = 'id,region,province,municipality,address,name,istatCode,latitude,longitude';
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
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(','),
  );
  return [header, ...rows].join('\n');
}

const session = ({ enabled, ...user }: User) => ({ token: 'demo', user });
const taken = (email: string) => users.some((user) => user.email.toLowerCase() === email.toLowerCase());
const nextId = () => Math.max(0, ...users.map((user) => user.id)) + 1;
const ok = (body: unknown, status = 200) => of(new HttpResponse({ status, body })).pipe(delay(250));
const fail = (status: number) => throwError(() => new HttpErrorResponse({ status })).pipe(delay(250));
