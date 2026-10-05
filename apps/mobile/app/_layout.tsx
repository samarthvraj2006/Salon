import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../src/store/auth';
import { colors } from '../src/theme';

const qc = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { hydrated, hydrate, accessToken, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const inAuth = segments[0] === '(auth)' || segments[0] === undefined || segments[0] === 'index';
    if (!accessToken && !inAuth && segments[0] !== 'onboarding') {
      router.replace('/onboarding');
    } else if (accessToken && !user?.city && segments[0] !== 'location') {
      router.replace('/location');
    } else if (accessToken && user?.city && (segments[0] === '(auth)' || segments[0] === 'onboarding' || segments[0] === 'index')) {
      router.replace('/(tabs)/home');
    }
  }, [hydrated, accessToken, user?.city, segments.join('/')]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <QueryClientProvider client={qc}>
        <AuthGate>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
        </AuthGate>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
