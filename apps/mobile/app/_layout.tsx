import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen 
          name="work-orders/[id]" 
          options={{ 
            headerShown: true,
            title: 'Work Order',
            presentation: 'card'
          }} 
        />
        <Stack.Screen 
          name="assets/[id]" 
          options={{ 
            headerShown: true,
            title: 'Asset',
            presentation: 'card'
          }} 
        />
        <Stack.Screen
          name="scanner"
          options={{
            headerShown: true,
            title: 'Scan QR Code',
            presentation: 'modal'
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
      </Stack>
    </QueryClientProvider>
  );
}
