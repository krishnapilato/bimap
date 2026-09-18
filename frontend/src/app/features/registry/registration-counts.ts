import { computed, inject } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { RegistrationsApi } from '../../core/api/registrations.api';
import { RegistrationStatus } from '../../core/api/registry.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';

export const STATUS_ORDER: readonly RegistrationStatus[] = ['DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'ARCHIVED'];

export type RegistrationCounts = Record<RegistrationStatus, number> & { total: number; topRegions: Record<string, number> };

/**
 * How many registrations sit in each state, for whoever is asking. Reviewers read the aggregate
 * endpoint; everyone else only sees their own work, counted a status at a time. Shared by every
 * screen that shows the numbers, so they agree and are fetched once.
 */
export function injectRegistrationCounts() {
  const registrations = inject(RegistrationsApi);
  const sessions = inject(SessionStore);
  const seesEverything = computed(() => sessions.can('registration:read-all'));

  return injectQuery(() => ({
    queryKey: keys.registrations.counts(seesEverything() ? 'all' : (sessions.user()?.id ?? 'me')),
    queryFn: async (): Promise<RegistrationCounts> => {
      if (seesEverything()) {
        const statistics = await registrations.statistics();
        const byStatus = Object.fromEntries(STATUS_ORDER.map((status) => [status, statistics.byStatus[status] ?? 0])) as Record<RegistrationStatus, number>;
        return { ...byStatus, total: statistics.total, topRegions: statistics.topRegions };
      }
      const pages = await Promise.all(STATUS_ORDER.map((status) => registrations.search({ status }, { page: 0, size: 1 })));
      const byStatus = Object.fromEntries(STATUS_ORDER.map((status, index) => [status, pages[index].totalElements])) as Record<RegistrationStatus, number>;
      return { ...byStatus, total: pages.reduce((sum, page) => sum + page.totalElements, 0), topRegions: {} };
    },
  }));
}
