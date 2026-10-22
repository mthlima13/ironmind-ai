import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from '../src/features/auth/auth.store';
import { useAppFonts } from '../src/hooks/useAppFonts';
import { useConnectionSync } from '../src/hooks/useConnectionSync';
import { useOfflineSyncGate } from '../src/hooks/useOfflineSyncGate';
import { useSessionPersistence } from '../src/hooks/useSessionPersistence';
import { BackHandlerProvider } from '../src/navigation/BackHandlerProvider';
import { useDeepLinks } from '../src/navigation/useDeepLinks';
import { colors } from '../src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Replays the offline queue; needs the query client from the provider below. */
function OfflineSyncGate() {
  useOfflineSyncGate();
  return null;
}

export default function RootLayout() {
  const { loaded } = useAppFonts();
  const status = useAuthStore((state) => state.status);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useSessionPersistence();
  useConnectionSync();
  useDeepLinks();

  const isAuthenticated = status === 'authenticated';

  if (!loaded || status === 'booting') {
    return <View style={styles.splash} testID="root-splash" />;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <OfflineSyncGate />
        <StatusBar style="light" />
        <BackHandlerProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.accent,
              headerTitleStyle: { color: colors.text },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Protected guard={isAuthenticated}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Protected guard={!isAuthenticated}>
              <Stack.Screen name="auth" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Screen
              name="coach"
              options={{
                presentation: 'modal',
                title: 'Coach IA',
              }}
            />
            <Stack.Screen
              name="reset-password"
              options={{
                title: 'Definir nova senha',
              }}
            />
          </Stack>
        </BackHandlerProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
