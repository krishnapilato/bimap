import { PageRequest } from '../api/common.models';
import { UserQuery } from '../api/iam.models';
import { DeliveryQuery } from '../api/notification.models';
import { RegistrationQuery } from '../api/registry.models';
import { ServiceName } from '../api/platform.models';

/**
 * Every query key in one place, so an invalidation after a mutation names exactly what it stales.
 * Keys are arrays from general to specific: invalidating `registrations.all` covers every page.
 */
export const keys = {
  me: ['me'] as const,

  registrations: {
    all: ['registrations'] as const,
    list: (query: RegistrationQuery, page: PageRequest) => ['registrations', 'list', query, page] as const,
    detail: (id: string) => ['registrations', 'detail', id] as const,
    statistics: ['registrations', 'statistics'] as const,
    counts: (scope: string) => ['registrations', 'counts', scope] as const,
    formSchema: ['registrations', 'schema', 'form'] as const,
    tableSchema: ['registrations', 'schema', 'table'] as const,
  },

  users: {
    all: ['users'] as const,
    list: (query: UserQuery, page: PageRequest) => ['users', 'list', query, page] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
    statistics: ['users', 'statistics'] as const,
  },

  mail: {
    all: ['mail'] as const,
    list: (query: DeliveryQuery, page: PageRequest) => ['mail', 'list', query, page] as const,
    detail: (id: string) => ['mail', 'detail', id] as const,
    counts: ['mail', 'counts'] as const,
  },

  mailing: {
    all: ['mailing'] as const,
    overview: ['mailing', 'overview'] as const,
    lists: (query: object, page: PageRequest) => ['mailing', 'lists', query, page] as const,
    list: (listId: string) => ['mailing', 'list', listId] as const,
    growth: (listId: string) => ['mailing', 'growth', listId] as const,
    subscribers: (listId: string, query: object, page: PageRequest) =>
      ['mailing', 'subscribers', listId, query, page] as const,
    subscriber: (listId: string, subscriberId: string) => ['mailing', 'subscriber', listId, subscriberId] as const,
    campaigns: (listId: string, status: string | undefined, page: PageRequest) =>
      ['mailing', 'campaigns', listId, status, page] as const,
    campaign: (listId: string, campaignId: string) => ['mailing', 'campaign', listId, campaignId] as const,
    deliveries: (listId: string, campaignId: string, status: string | undefined, page: PageRequest) =>
      ['mailing', 'deliveries', listId, campaignId, status, page] as const,
  },

  geo: {
    regions: (q: string) => ['geo', 'regions', q] as const,
    provinces: (q: string, region?: string) => ['geo', 'provinces', q, region] as const,
    municipalities: (q: string, region?: string, province?: string, limit?: number) =>
      ['geo', 'municipalities', q, region, province, limit] as const,
    municipality: (istatCode: string) => ['geo', 'municipality', istatCode] as const,
    capitals: (region: string) => ['geo', 'capitals', region] as const,
    postalCodes: (municipality: string, province?: string) => ['geo', 'postal-codes', municipality, province] as const,
    addresses: (query: object) => ['geo', 'addresses', query] as const,
    entities: (q: string, filters: object) => ['geo', 'entities', q, filters] as const,
  },

  platform: {
    runtime: (service: ServiceName) => ['platform', 'runtime', service] as const,
    health: (service: ServiceName) => ['platform', 'health', service] as const,
    probe: (service: ServiceName, group: string) => ['platform', 'probe', service, group] as const,
    info: (service: ServiceName) => ['platform', 'info', service] as const,
    metric: (service: ServiceName, name: string, tags: string[]) => ['platform', 'metric', service, name, tags] as const,
    loggers: (service: ServiceName) => ['platform', 'loggers', service] as const,
    caches: (service: ServiceName) => ['platform', 'caches', service] as const,
  },
};
