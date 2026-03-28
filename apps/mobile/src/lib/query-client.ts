import { QueryClient, MutationCache } from '@tanstack/react-query';
import { offlineQueue } from './offline-queue';

// Supported offline mutations — these get queued when offline
const OFFLINE_ENDPOINTS = [
  { pattern: /\/work-orders\/[\w-]+\/status$/, method: 'PATCH' },
  { pattern: /\/work-orders\/[\w-]+\/checklist$/, method: 'POST' },
  { pattern: /\/work-orders\/[\w-]+\/labor$/, method: 'POST' },
  { pattern: /\/assets\/[\w-]+\/meters$/, method: 'POST' },
];

export function isOfflineSupportedMutation(endpoint: string, method: string): boolean {
  return OFFLINE_ENDPOINTS.some(
    (e) => e.pattern.test(endpoint) && e.method === method.toUpperCase(),
  );
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
        // Cache data for offline use — keep unused queries for 30 minutes
        gcTime: 30 * 60 * 1000,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
