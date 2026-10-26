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
import {
  ThemeProvider,
  useTheme,
  useThemedStyles,
  useThemeStore,
  type ThemeColors,
} from '../src/theme';

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

/** First frame, before the fonts, the session and the theme are ready. */
function Splash() {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.splash} testID="root-splash" />;
}

/** Navigation tree; reads the active palette to paint bars and headers. */
function AppNavigator({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { colors, isDark } = useTheme();

  return (
    <>
      <OfflineSyncGate />
      <StatusBar style={isDark ? 'light' : 'dark'} />
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
            name="propostas"
            options={{
              presentation: 'modal',
              title: 'Proposta de IA',
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
    </>
  );
}

export default function RootLayout() {
  const { loaded } = useAppFonts();
  const status = useAuthStore((state) => state.status);
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const themeHydrated = useThemeStore((state) => state.hydrated);

  useEffect(() => {
    void hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    // Reads the saved choice before the first screen, so no screen is drawn
    // with the default palette and then repainted in the chosen one.
    void hydrateTheme();
  }, [hydrateTheme]);

  useSessionPersistence();
  useConnectionSync();
  useDeepLinks();

  const isAuthenticated = status === 'authenticated';
  const isReady = loaded && status !== 'booting' && themeHydrated;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {isReady ? <AppNavigator isAuthenticated={isAuthenticated} /> : <Splash />}
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  splash: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
