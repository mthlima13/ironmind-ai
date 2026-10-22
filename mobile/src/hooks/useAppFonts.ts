import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';

/**
 * Loads the typography of the app.
 *
 * The fonts are bundled with the package, so no network request is made at
 * runtime. The app falls back to the system font when the loading fails.
 */
export function useAppFonts() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return {
    loaded: loaded ?? false,
    error: error ?? null,
  };
}
