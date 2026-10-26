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

/** WCAG 2.1 relative luminance of an opaque `#rrggbb` color. */
function relativeLuminance(hex: string): number {
  const channels = hex
    .replace('#', '')
    .match(/../g)!
    .map((channel) => parseInt(channel, 16) / 255)
    .map((value) =>
      value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background)
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background)
  );
  return (lighter + 0.05) / (darker + 0.05);
}

const SURFACES = ['background', 'surface', 'surfaceElevated'] as const;
const TEXT_TOKENS = ['text', 'textSecondary', 'textMuted', 'accent'] as const;
const STATUS_TOKENS = ['danger', 'warning', 'success', 'info'] as const;

describe('palette contrast (RNF-005)', () => {
  it.each([
    ['dark', darkColors],
    ['light', lightColors],
  ] as const)(
    '%s keeps text readable and control borders visible',
    (_name, palette) => {
      for (const surface of SURFACES) {
        for (const token of TEXT_TOKENS) {
          // WCAG AA for normal-size text.
          expect(contrastRatio(palette[token], palette[surface])).toBeGreaterThanOrEqual(4.5);
        }
        // WCAG 1.4.11 for the boundary of interactive controls.
        expect(
          contrastRatio(palette.borderStrong, palette[surface])
        ).toBeGreaterThanOrEqual(3);
      }

      for (const token of STATUS_TOKENS) {
        expect(contrastRatio(palette[token], palette.surface)).toBeGreaterThanOrEqual(4.5);
      }

      expect(contrastRatio(palette.onAccent, palette.accent)).toBeGreaterThanOrEqual(4.5);
    }
  );
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
