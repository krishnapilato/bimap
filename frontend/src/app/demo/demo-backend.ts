import {
  HttpErrorResponse,
  HttpEvent,
  HttpHeaders,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ServiceName } from '../core/api/platform.models';
import { DemoDb } from './demo-db';
import { DemoGeography } from './demo-geography';
import { DemoProblem, DemoReply, DemoRoutes } from './demo-http';
import { DemoRuntime } from './demo-runtime';
import { DemoContext, userFromAccessToken } from './handlers/demo-context';
import { registerCoreHandlers } from './handlers/core.handlers';
import { registerIamHandlers } from './handlers/iam.handlers';
import { registerMailingHandlers } from './handlers/mailing.handlers';
import { registerPlatformHandlers } from './handlers/platform.handlers';

let routes: DemoRoutes | null = null;

function routeTable(context: DemoContext): DemoRoutes {
  if (!routes) {
    routes = new DemoRoutes();
    registerIamHandlers(routes, context);
    registerMailingHandlers(routes, context);
    registerCoreHandlers(routes, context);
    registerPlatformHandlers(routes, context);
  }
  return routes;
}

/**
 * The whole backend, in the browser.
 *
 * Registered last in the interceptor chain, so requests reach it exactly as they would leave for
 * the network — bearer token attached, refresh logic in front — and every component talks to the
 * same API clients in both modes. Answers arrive after a short, realistic delay so loading states
 * are seen rather than skipped.
 */
export const demoBackend: HttpInterceptorFn = (request, next) => {
  const service = serviceOf(request.url);
  if (!service) return next(request);

  const context: DemoContext = { db: inject(DemoDb), geography: inject(DemoGeography), runtime: inject(DemoRuntime) };
  const path = new URL(request.urlWithParams, location.origin).pathname.slice(environment.api[service].length);

  return new Observable<HttpEvent<unknown>>((subscriber) => {
    const live = path.startsWith('/api/platform') || path.startsWith('/actuator');
    const delay = live ? 40 + Math.random() * 80 : 160 + Math.random() * 320;
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const reply = await dispatch(context, service, path, request);
        if (cancelled) return;
        subscriber.next(
          new HttpResponse({
            status: reply.status,
            body: reply.body instanceof Blob ? reply.body : structuredClone(reply.body),
            headers: new HttpHeaders(reply.headers),
            url: request.url,
          }),
        );
        subscriber.complete();
      } catch (error) {
        if (cancelled) return;
        subscriber.error(toHttpError(error, request, path));
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  });
};

async function dispatch(context: DemoContext, service: ServiceName, path: string, request: HttpRequest<unknown>): Promise<DemoReply> {
  const match = routeTable(context).match(request.method, service, path);
  if (!match) {
    throw new DemoProblem(404, 'RESOURCE_NOT_FOUND', `No endpoint is mapped to ${request.method} ${path}`);
  }

  const result = await match.handler({
    method: request.method,
    service,
    path,
    params: match.params,
    query: request.params,
    body: request.body,
    caller: userFromAccessToken(context.db, request.headers.get('Authorization')),
  });
  return result instanceof DemoReply ? result : new DemoReply(200, result);
}

function serviceOf(url: string): ServiceName | null {
  if (url.startsWith(`${environment.api.iam}/`)) return 'iam';
  if (url.startsWith(`${environment.api.core}/`)) return 'core';
  return null;
}

function toHttpError(error: unknown, request: HttpRequest<unknown>, path: string): HttpErrorResponse {
  const problem =
    error instanceof DemoProblem
      ? error
      : new DemoProblem(500, 'INTERNAL_ERROR', 'Something went wrong on our side. Quote the correlation id when reporting this.');

  if (!(error instanceof DemoProblem)) console.error('Demo backend failure', error);

  return new HttpErrorResponse({
    status: problem.status,
    url: request.url,
    error: {
      type: `urn:bimap:error:${problem.code.toLowerCase().replace(/_/g, '-')}`,
      title: problem.code.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
      status: problem.status,
      detail: problem.detail,
      instance: path,
      code: problem.code,
      timestamp: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
      ...problem.extra,
    },
  });
}
