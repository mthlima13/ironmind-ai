import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './palette';
import {
  resolveColorScheme,
  useThemeStore,
  type ColorScheme,
  type ThemeMode,
} from './theme.store';

export type Theme = {
  /** Choice made by the user. */
  mode: ThemeMode;
  /** Palette being rendered. */
  colorScheme: ColorScheme;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
};

/**
 * Dark theme used when a component is rendered outside the provider.
 *
 * The shared primitives are rendered standalone in the test suite, and the app
 * is dark by default, so a missing provider must not throw nor change the look.
 */
const fallbackTheme: Theme = {
  mode: 'dark',
  colorScheme: 'dark',
  isDark: true,
  colors: darkColors,
  setMode: () => undefined,
};

const ThemeContext = createContext<Theme>(fallbackTheme);

/** Provides the active palette to every screen and component. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const systemScheme = useColorScheme();

  const value = useMemo<Theme>(() => {
    const colorScheme = resolveColorScheme(mode, systemScheme);
    return {
      mode,
      colorScheme,
      isDark: colorScheme === 'dark',
      colors: colorScheme === 'light' ? lightColors : darkColors,
      setMode,
    };
  }, [mode, setMode, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Active theme. Re-renders the caller whenever the user changes it. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Builds a stylesheet for the active palette.
 *
 * `StyleSheet.create` snapshots the values it receives, so a module-level
 * stylesheet can never change with the theme. Declare the factory at module
 * scope (stable reference) and call this hook inside the component:
 *
 * ```ts
 * const createStyles = (colors: ThemeColors) => StyleSheet.create({ ... });
 * // inside the component
 * const styles = useThemedStyles(createStyles);
 * ```
 */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
