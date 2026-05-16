import { QueryClient } from '@tanstack/react-query';

/**
 * Enterprise defaults — not aggressive (DEC-FE-007, DEC-DATA-002).
 * - staleTime: data considered fresh; avoids refetch storms on navigation.
 * - gcTime: cache retention after unmount.
 * - retry: only transient failures; no retry on 4xx.
 * - refetchOnWindowFocus: off by default (dashboards use explicit invalidation).
 */
function buildQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error) => {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        networkMode: 'online',
      },
      mutations: {
        retry: 0,
        networkMode: 'online',
      },
    },
  });
}

/** Singleton used by QueryProvider and Zustand bridges. */
export const appQueryClient = buildQueryClient();

export function createAppQueryClient(): QueryClient {
  return appQueryClient;
}

/** Longer stale times for taxonomy / home rails. */
export const STALE_TIMES = {
  categories: 5 * 60 * 1000,
  homeRails: 2 * 60 * 1000,
  catalog: 45 * 1000,
  productDetail: 60 * 1000,
  cart: 30 * 1000,
  merchantDashboard: 90 * 1000,
  merchantAnalytics: 2 * 60 * 1000,
  orders: 45 * 1000,
  profile: 2 * 60 * 1000,
} as const;
