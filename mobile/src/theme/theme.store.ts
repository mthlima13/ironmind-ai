import { create } from 'zustand';

import { loadPreference, savePreference } from '../storage/preferences';

/** Options offered to the user. `system` follows the Android setting. */
export const THEME_MODES = ['light', 'dark', 'system'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

/** Palette actually rendered on screen. */
export type ColorScheme = 'light' | 'dark';

const THEME_PREFERENCE_KEY = 'theme.mode';

/**
 * Dark remains the default so the app keeps its original identity on the first
 * launch and for users that never open the setting.
 */
export const DEFAULT_THEME_MODE: ThemeMode = 'dark';

export function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && (THEME_MODES as readonly string[]).includes(value);
}

/**
 * Resolves the palette for the chosen mode.
 *
 * An unknown system value falls back to dark, which is the app default and the
 * safe choice on devices that do not report a scheme.
 */
export function resolveColorScheme(
  mode: ThemeMode,
  systemScheme: ColorScheme | null | undefined
): ColorScheme {
  if (mode === 'system') {
    return systemScheme === 'light' ? 'light' : 'dark';
  }
  return mode;
}

type ThemeState = {
  /** Choice made by the user. */
  mode: ThemeMode;
  /** False until the saved choice was read from the device. */
  hydrated: boolean;
  /** Reads the saved choice; safe to call more than once. */
  hydrate: () => Promise<void>;
  /** Applies a choice and saves it for the next launches. */
  setMode: (mode: ThemeMode) => void;
};

export const useThemeStore = create<ThemeState>()((set) => ({
  mode: DEFAULT_THEME_MODE,
  hydrated: false,

  hydrate: async () => {
    const stored = await loadPreference(THEME_PREFERENCE_KEY);
    set({
      mode: isThemeMode(stored) ? stored : DEFAULT_THEME_MODE,
      hydrated: true,
    });
  },

  setMode: (mode) => {
    set({ mode });
    void savePreference(THEME_PREFERENCE_KEY, mode);
  },
}));
