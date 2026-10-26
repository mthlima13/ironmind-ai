/**
 * Public surface of the theme module.
 *
 * Components import from here (`../theme` or `../../theme`), never from the
 * palette directly, so the active palette always goes through the provider.
 */
export {
  darkColors,
  layout,
  lightColors,
  radii,
  spacing,
  typography,
  type ThemeColors,
} from './palette';
export {
  DEFAULT_THEME_MODE,
  isThemeMode,
  resolveColorScheme,
  THEME_MODES,
  useThemeStore,
  type ColorScheme,
  type ThemeMode,
} from './theme.store';
export {
  ThemeProvider,
  useTheme,
  useThemedStyles,
  type Theme,
} from './ThemeProvider';
