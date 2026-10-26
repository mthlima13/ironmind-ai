import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, View } from 'react-native';

import {
  darkColors,
  DEFAULT_THEME_MODE,
  isThemeMode,
  lightColors,
  resolveColorScheme,
  ThemeProvider,
  useTheme,
  useThemedStyles,
  useThemeStore,
  type ThemeColors,
} from '../src/theme';
import { loadPreference, savePreference } from '../src/storage/preferences';

jest.mock('../src/storage/preferences', () => ({
  loadPreference: jest.fn(async () => null),
  savePreference: jest.fn(async () => undefined),
}));

const loadPreferenceMock = loadPreference as jest.MockedFunction<typeof loadPreference>;
const savePreferenceMock = savePreference as jest.MockedFunction<typeof savePreference>;

beforeEach(() => {
  jest.clearAllMocks();
  loadPreferenceMock.mockResolvedValue(null);
  useThemeStore.setState({ mode: DEFAULT_THEME_MODE, hydrated: false });
});

describe('resolveColorScheme', () => {
  it('uses the chosen theme when it is explicit', () => {
    expect(resolveColorScheme('light', 'dark')).toBe('light');
    expect(resolveColorScheme('dark', 'light')).toBe('dark');
  });

  it('follows the system theme when the user picks system', () => {
    expect(resolveColorScheme('system', 'light')).toBe('light');
    expect(resolveColorScheme('system', 'dark')).toBe('dark');
  });

  it('falls back to dark when the system does not report a scheme', () => {
    expect(resolveColorScheme('system', null)).toBe('dark');
    expect(resolveColorScheme('system', undefined)).toBe('dark');
  });
});

describe('isThemeMode', () => {
  it('accepts the offered modes and rejects anything else', () => {
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('system')).toBe(true);
    expect(isThemeMode('purple')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });
});

describe('useThemeStore', () => {
  it('restores the saved mode when hydrating', async () => {
    loadPreferenceMock.mockResolvedValue('light');

    await useThemeStore.getState().hydrate();

    expect(loadPreferenceMock).toHaveBeenCalledWith('theme.mode');
    expect(useThemeStore.getState()).toMatchObject({ mode: 'light', hydrated: true });
  });

  it('keeps the default mode when there is no saved choice', async () => {
    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().mode).toBe(DEFAULT_THEME_MODE);
    expect(useThemeStore.getState().hydrated).toBe(true);
  });

  it('ignores a corrupted saved value instead of breaking the theme', async () => {
    loadPreferenceMock.mockResolvedValue('neon');

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().mode).toBe(DEFAULT_THEME_MODE);
  });

  it('persists the mode chosen by the user', () => {
    useThemeStore.getState().setMode('light');

    expect(useThemeStore.getState().mode).toBe('light');
    expect(savePreferenceMock).toHaveBeenCalledWith('theme.mode', 'light');
  });
});

const createProbeStyles = (colors: ThemeColors) => ({
  surface: { backgroundColor: colors.background },
});

function ThemeProbe() {
  const { colorScheme, setMode } = useTheme();
  const styles = useThemedStyles(createProbeStyles);

  return (
    <View
      testID="theme-probe"
      accessibilityLabel={colorScheme}
      style={styles.surface}
    >
      <Pressable testID="theme-switch-light" onPress={() => setMode('light')} />
    </View>
  );
}

describe('ThemeProvider', () => {
  it('renders the dark palette by default', async () => {
    await render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-probe').props.accessibilityLabel).toBe('dark');
    expect(screen.getByTestId('theme-probe')).toHaveStyle({
      backgroundColor: darkColors.background,
    });
  });

  it('re-renders the styles with the light palette after the switch', async () => {
    await render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    await fireEvent.press(screen.getByTestId('theme-switch-light'));

    expect(screen.getByTestId('theme-probe').props.accessibilityLabel).toBe('light');
    expect(screen.getByTestId('theme-probe')).toHaveStyle({
      backgroundColor: lightColors.background,
    });
  });
});
