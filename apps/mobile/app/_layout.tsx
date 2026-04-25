import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { Auth0Provider, useAuth0 } from 'react-native-auth0';
import { useAuthStore } from '@/lib/auth';
import { createQueryClient } from '@/lib/query-client';
import { NetworkProvider } from '@/lib/network-provider';
import { offlineQueue } from '@/lib/offline-queue';
import { OfflineBanner } from '@/components/offline-banner';
import { MobileThemeProvider } from '@/lib/theme';

const queryClient = createQueryClient();

const auth0Domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || '';
const auth0ClientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || '';

function AuthSync({ children }: { children: React.ReactNode }) {
  const { user: auth0User, getCredentials } = useAuth0();
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    const sync = async () => {
      if (auth0User) {
        try {
          const credentials = await getCredentials();
          if (credentials?.accessToken) {
            const nameParts = (auth0User.name || '').split(' ');
            setAuth({
              user: {
                id: auth0User.sub || '',
                email: auth0User.email || '',
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                username: auth0User.email || '',
                roles: [],
              },
              token: credentials.accessToken,
            });
          }
        } catch {
          clearAuth();
        }
      } else {
        clearAuth();
      }
    };

    sync();

    const interval = setInterval(async () => {
      if (auth0User) {
        try {
          const credentials = await getCredentials();
          if (credentials?.accessToken) {
            const nameParts = (auth0User.name || '').split(' ');
            setAuth({
              user: {
                id: auth0User.sub || '',
                email: auth0User.email || '',
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                username: auth0User.email || '',
                roles: [],
              },
              token: credentials.accessToken,
            });
          }
        } catch {
          // Token refresh failed
        }
      }
    }, 50000);

    return () => clearInterval(interval);
  }, [auth0User]);

  return <>{children}</>;
}

function OfflineInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    offlineQueue.load();
  }, []);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <Auth0Provider domain={auth0Domain} clientId={auth0ClientId}>
      <NetworkProvider>
        <QueryClientProvider client={queryClient}>
          <MobileThemeProvider>
          <AuthSync>
            <OfflineInit>
              <StatusBar style="auto" />
              <OfflineBanner />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="login" />
                <Stack.Screen
                  name="work-orders/[id]"
                  options={{
                    headerShown: true,
                    title: 'Work Order',
                    presentation: 'card',
                  }}
                />
                <Stack.Screen
                  name="assets/[id]"
                  options={{
                    headerShown: true,
                    title: 'Asset',
                    presentation: 'card',
                  }}
                />
                <Stack.Screen
                  name="scanner"
                  options={{
                    headerShown: true,
                    title: 'Scan QR Code',
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen
                  name="active-work"
                  options={{
                    headerShown: true,
                    title: 'Active Work',
                    presentation: 'card',
                    headerBackVisible: false,
                    gestureEnabled: false,
                  }}
                />
                <Stack.Screen
                  name="sync"
                  options={{
                    headerShown: true,
                    title: 'Sync Status',
                    presentation: 'modal',
                  }}
                />
              </Stack>
            </OfflineInit>
          </AuthSync>
          </MobileThemeProvider>
        </QueryClientProvider>
      </NetworkProvider>
    </Auth0Provider>
  );
}
