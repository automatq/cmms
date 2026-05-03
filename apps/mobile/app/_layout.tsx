import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth';
import { useSession } from '@/lib/auth-client';
import { createQueryClient } from '@/lib/query-client';
import { NetworkProvider } from '@/lib/network-provider';
import { offlineQueue } from '@/lib/offline-queue';
import { OfflineBanner } from '@/components/offline-banner';
import { MobileThemeProvider } from '@/lib/theme';

const queryClient = createQueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const { setAuth, clearAuth } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  // Mirror Better Auth session into the existing zustand store so
  // existing screens that read `useAuthStore().user` keep working.
  useEffect(() => {
    if (isPending) return;
    if (session?.user) {
      const u: any = session.user;
      const nameParts = (u.name || '').split(' ');
      setAuth({
        user: {
          id: u.id,
          email: u.email,
          firstName: u.firstName || nameParts[0] || '',
          lastName: u.lastName || nameParts.slice(1).join(' ') || '',
          username: u.username || u.email,
          roles: ['member'],
        },
        token: '',
      });
    } else {
      clearAuth();
    }
  }, [session, isPending, setAuth, clearAuth]);

  // Route gating: redirect signed-out users to /sign-in
  useEffect(() => {
    if (isPending) return;
    const onAuthScreen = segments[0] === 'sign-in';
    if (!session && !onAuthScreen) {
      router.replace('/sign-in');
    } else if (session && onAuthScreen) {
      router.replace('/(tabs)');
    }
  }, [session, isPending, segments, router]);

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
          <AuthGate>
            <OfflineInit>
              <StatusBar style="auto" />
              <OfflineBanner />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="sign-in" />
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
          </AuthGate>
        </MobileThemeProvider>
      </QueryClientProvider>
    </NetworkProvider>
  );
}
