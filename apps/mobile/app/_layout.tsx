import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth';
import { createQueryClient } from '@/lib/query-client';
import { NetworkProvider } from '@/lib/network-provider';
import { offlineQueue } from '@/lib/offline-queue';
import { OfflineBanner } from '@/components/offline-banner';
import { MobileThemeProvider } from '@/lib/theme';

const queryClient = createQueryClient();

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000002';

function AuthInit({ children }: { children: React.ReactNode }) {
  const { setAuth } = useAuthStore();

  useEffect(() => {
    setAuth({
      user: {
        id: DEFAULT_USER_ID,
        email: 'admin@local',
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        roles: ['admin'],
      },
      token: '',
    });
  }, [setAuth]);

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
    <NetworkProvider>
      <QueryClientProvider client={queryClient}>
        <MobileThemeProvider>
          <AuthInit>
            <OfflineInit>
              <StatusBar style="auto" />
              <OfflineBanner />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
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
          </AuthInit>
        </MobileThemeProvider>
      </QueryClientProvider>
    </NetworkProvider>
  );
}
