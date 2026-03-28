import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, ClerkLoaded, useAuth, useUser } from '@clerk/clerk-expo';
import { tokenCache, useAuthStore } from '@/lib/auth';
import { createQueryClient } from '@/lib/query-client';
import { NetworkProvider } from '@/lib/network-provider';
import { offlineQueue } from '@/lib/offline-queue';
import { OfflineBanner } from '@/components/offline-banner';
import { MobileThemeProvider } from '@/lib/theme';

const queryClient = createQueryClient();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

function AuthSync({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const { setAuth, clearAuth, setLoading } = useAuthStore();

  useEffect(() => {
    const sync = async () => {
      if (!isLoaded) return;

      if (isSignedIn && clerkUser) {
        try {
          const token = await getToken();
          if (token) {
            setAuth({
              user: {
                id: clerkUser.id,
                email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
                firstName: clerkUser.firstName || '',
                lastName: clerkUser.lastName || '',
                username: clerkUser.username || clerkUser.emailAddresses?.[0]?.emailAddress || '',
                roles: [],
              },
              token,
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

    // Refresh token periodically
    const interval = setInterval(async () => {
      if (isSignedIn) {
        try {
          const token = await getToken();
          if (token && clerkUser) {
            setAuth({
              user: {
                id: clerkUser.id,
                email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
                firstName: clerkUser.firstName || '',
                lastName: clerkUser.lastName || '',
                username: clerkUser.username || '',
                roles: [],
              },
              token,
            });
          }
        } catch {
          // Token refresh failed
        }
      }
    }, 50000);

    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn, clerkUser]);

  return <>{children}</>;
}

function OfflineInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Load offline mutation queue from storage on app start
    offlineQueue.load();
  }, []);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
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
      </ClerkLoaded>
    </ClerkProvider>
  );
}
