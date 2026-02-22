import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { api } from './api';

WebBrowser.maybeCompleteAuthSession();

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  roles: string[];
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const KEYCLOAK_URL = process.env.EXPO_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.EXPO_PUBLIC_KEYCLOAK_REALM || 'cmms';
const KEYCLOAK_CLIENT_ID = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID || 'cmms-mobile';

const discovery = {
  authorizationEndpoint: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`,
  tokenEndpoint: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
  revocationEndpoint: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/revoke`,
  endSessionEndpoint: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`,
  userInfoEndpoint: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        api.setToken(token);
        // Verify token is still valid by fetching user info
        const userInfo = await SecureStore.getItemAsync('user_info');
        if (userInfo) {
          set({
            isAuthenticated: true,
            token,
            user: JSON.parse(userInfo),
            isLoading: false,
          });
          return;
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
    set({ isLoading: false });
  },

  login: async () => {
    try {
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'cmms' });
      
      const request = new AuthSession.AuthRequest({
        clientId: KEYCLOAK_CLIENT_ID,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'success' && result.params.code) {
        // Exchange code for token
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: KEYCLOAK_CLIENT_ID,
            code: result.params.code,
            redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier!,
            },
          },
          discovery
        );

        if (tokenResponse.accessToken) {
          await api.setToken(tokenResponse.accessToken);

          // Fetch user info
          const userInfoResponse = await fetch(discovery.userInfoEndpoint, {
            headers: { Authorization: `Bearer ${tokenResponse.accessToken}` },
          });
          const userInfo = await userInfoResponse.json();

          const user: User = {
            id: userInfo.sub,
            email: userInfo.email,
            firstName: userInfo.given_name,
            lastName: userInfo.family_name,
            username: userInfo.preferred_username,
            roles: userInfo.realm_access?.roles || [],
          };

          await SecureStore.setItemAsync('user_info', JSON.stringify(user));
          if (tokenResponse.refreshToken) {
            await SecureStore.setItemAsync('refresh_token', tokenResponse.refreshToken);
          }

          set({
            isAuthenticated: true,
            token: tokenResponse.accessToken,
            user,
          });
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('user_info');
      await api.setToken(null);

      set({
        isAuthenticated: false,
        token: null,
        user: null,
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },
}));
