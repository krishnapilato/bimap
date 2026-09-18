import { QueryClient } from '@tanstack/angular-query-experimental';

import { ApiError } from '../api/api-error';

/**
 * Server state lives here, not in components.
 *
 * Reads stay fresh for thirty seconds and refetch when the window regains focus. Client errors are
 * never retried — a 403 will not become a 200 on the third attempt — while a network blip or a
 * 5xx gets two quiet retries with backoff before anyone sees an error.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          const status = ApiError.from(error).status;
          return (status === 0 || status >= 500) && failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 4_000),
      },
      mutations: {
        retry: false,
      },
    },
  });
}
