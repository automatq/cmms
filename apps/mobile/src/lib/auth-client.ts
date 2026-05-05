import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import { organizationClient } from 'better-auth/client/plugins';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const RAW_API =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
  'http://localhost:4000/api/v1';
const AUTH_BASE = RAW_API.replace(/\/api\/v1\/?$/, '') + '/api/auth';

export const SESSION_TOKEN_KEY = 'maintek.session_token';

export const authClient = createAuthClient({
  baseURL: AUTH_BASE,
  plugins: [
    expoClient({
      scheme: 'maintek',
      storagePrefix: 'maintek',
      storage: SecureStore,
    }),
    organizationClient(),
  ],
});

export const { useSession, signIn, signUp, signOut, organization } = authClient;

/**
 * Get the bearer token to send with requests to /api/v1/* endpoints.
 * The expoClient stores the session token under `${storagePrefix}.session_token`.
 */
export function getBearerToken(): string | null {
  try {
    return SecureStore.getItem(SESSION_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}
