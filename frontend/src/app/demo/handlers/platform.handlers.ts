import { ServiceName } from '../../core/api/platform.models';
import { DemoProblem, DemoReply, DemoRoutes, requireRole } from '../demo-http';
import { DemoContext } from './demo-context';

const SERVICES: ServiceName[] = ['iam', 'core'];

const CACHES: Record<ServiceName, string[]> = {
  iam: [],
  core: ['geo-regions', 'geo-provinces', 'geo-municipalities', 'nominatim-addresses', 'codice-univoco'],
};

/** The runtime feed and the Actuator endpoints of both services, fed by the runtime simulator. */
export function registerPlatformHandlers(routes: DemoRoutes, context: DemoContext): void {
  const { runtime, db } = context;
  const evicted: Record<ServiceName, Set<string>> = { iam: new Set(), core: new Set() };

  for (const service of SERVICES) {
    routes
      .get(service, '/api/platform/runtime', () => runtime.snapshot(service))
      .get(service, '/actuator/health', (request) => {
        const health = runtime.health(service);
        return request.caller ? health : { status: health.status, groups: health.groups };
      })
      .get(service, '/actuator/health/:group', () => ({ status: 'UP' }))
      .get(service, '/actuator/info', () => ({
        app: { name: service === 'iam' ? 'bimap-iam-service' : 'bimap-business-service', version: '2.0.0' },
        java: { version: '26.0.2', vendor: { name: 'Oracle Corporation' } },
        build: { artifact: service === 'iam' ? 'iam-service' : 'business-service', group: 'com.bimap' },
      }))
      .get(service, '/actuator/metrics', (request) => {
        requireRole(request, 'ADMINISTRATOR');
        return { names: runtime.metricNames() };
      })
      .get(service, '/actuator/metrics/:name', (request) => {
        requireRole(request, 'ADMINISTRATOR');
        const metric = runtime.metric(service, request.params['name'], request.query.getAll('tag') ?? []);
        if (!metric) throw DemoProblem.notFound(`No endpoint is mapped to GET /actuator/metrics/${request.params['name']}`);
        return metric;
      })
      .get(service, '/actuator/loggers', (request) => {
        requireRole(request, 'ADMINISTRATOR');
        return {
          levels: ['OFF', 'FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'],
          loggers: db.state.loggers[service],
          groups: { web: { members: ['org.springframework.web'] }, sql: { members: ['org.hibernate.SQL'] } },
        };
      })
      .post(service, '/actuator/loggers/:name', (request) => {
        requireRole(request, 'ADMINISTRATOR');
        const loggers = db.state.loggers[service];
        const name = request.params['name'];
        const level = request.body?.configuredLevel ?? undefined;
        const parent = loggers['ROOT']?.effectiveLevel ?? 'INFO';
        loggers[name] = { configuredLevel: level, effectiveLevel: level ?? parent };
        db.touch();
        return DemoReply.noContent();
      })
      .get(service, '/actuator/caches', (request) => {
        requireRole(request, 'ADMINISTRATOR');
        const caches = Object.fromEntries(
          CACHES[service].map((name) => [name, { target: evicted[service].has(name) ? 'java.util.concurrent.ConcurrentHashMap (empty)' : 'com.github.benmanes.caffeine.cache.BoundedLocalCache' }]),
        );
        return { cacheManagers: CACHES[service].length ? { cacheManager: { caches } } : {} };
      })
      .delete(service, '/actuator/caches', (request) => {
        requireRole(request, 'ADMINISTRATOR');
        CACHES[service].forEach((name) => evicted[service].add(name));
        return DemoReply.noContent();
      })
      .delete(service, '/actuator/caches/:name', (request) => {
        requireRole(request, 'ADMINISTRATOR');
        if (!CACHES[service].includes(request.params['name'])) throw DemoProblem.notFound(`No cache named ${request.params['name']}`);
        evicted[service].add(request.params['name']);
        return DemoReply.noContent();
      });
  }
}
