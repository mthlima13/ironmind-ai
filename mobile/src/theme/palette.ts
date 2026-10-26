/**
 * IronMind AI visual language (SPEC 15.2).
 *
 * The app ships two palettes: the dark graphite theme with the lime accent and
 * a light theme with the same accent family darkened for contrast on white.
 * Touch targets are never smaller than 44pt so the set logger stays usable
 * mid-workout (SPEC 15.2).
 *
 * The palettes are plain objects: components never read these values at module
 * scope, they consume the active palette through `useTheme()` so switching the
 * theme re-renders the whole app.
 */

export type ThemeColors = {
  /** App background. */
  background: string;
  /** Slightly lifted background used behind cards. */
  backgroundElevated: string;
  /** Default card surface. */
  surface: string;
  /** Surface used for inputs and nested elements. */
  surfaceElevated: string;
  /** Surface pressed state. */
  surfacePressed: string;
  /** Hairline borders. */
  border: string;
  /** Emphasised borders. */
  borderStrong: string;

  /** Primary text. */
  text: string;
  /** Secondary text. */
  textSecondary: string;
  /** Muted text, used for hints and metadata. */
  textMuted: string;

  /** Accent color. */
  accent: string;
  /** Accent pressed state. */
  accentPressed: string;
  /** Transparent accent fill. */
  accentSoft: string;
  /** Text/icon color on top of the accent. */
  onAccent: string;

  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  success: string;
  successSoft: string;
  info: string;
  infoSoft: string;

  /** Modal / scrim color. */
  overlay: string;
};

export const darkColors: ThemeColors = {
  background: '#0B0E10',
  backgroundElevated: '#111619',
  surface: '#161C20',
  surfaceElevated: '#1E262B',
  surfacePressed: '#263137',
  border: '#5F6F78',
  borderStrong: '#6F7C78',

  text: '#F4F7F5',
  textSecondary: '#AAB5B0',
  textMuted: '#87948F',

  accent: '#C8F751',
  accentPressed: '#B2E33A',
  accentSoft: 'rgba(200, 247, 81, 0.14)',
  onAccent: '#0B0E10',

  danger: '#FF6B5E',
  dangerSoft: 'rgba(255, 107, 94, 0.14)',
  warning: '#FFB547',
  warningSoft: 'rgba(255, 181, 71, 0.14)',
  success: '#6FE08B',
  successSoft: 'rgba(111, 224, 139, 0.14)',
  info: '#6BB7FF',
  infoSoft: 'rgba(107, 183, 255, 0.14)',

  overlay: 'rgba(0, 0, 0, 0.65)',
};

/**
 * Light palette.
 *
 * The lime accent is too bright for text on white, so the light theme uses a
 * darker olive shade of the same hue. Primary buttons invert to that shade
 * with white text, keeping the contrast above WCAG AA.
 */
export const lightColors: ThemeColors = {
  background: '#F7F8F5',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F2EC',
  surfacePressed: '#E3E7DD',
  border: '#C4CBC0',
  borderStrong: '#9BA495',

  text: '#141A16',
  textSecondary: '#46514A',
  textMuted: '#5F6A62',

  accent: '#4F6B00',
  accentPressed: '#3D5400',
  accentSoft: 'rgba(79, 107, 0, 0.12)',
  onAccent: '#FFFFFF',

  danger: '#B3261E',
  dangerSoft: 'rgba(179, 38, 30, 0.10)',
  warning: '#8A5A00',
  warningSoft: 'rgba(138, 90, 0, 0.12)',
  success: '#1B6E37',
  successSoft: 'rgba(27, 110, 55, 0.10)',
  info: '#0B5FA5',
  infoSoft: 'rgba(11, 95, 165, 0.10)',

  overlay: 'rgba(0, 0, 0, 0.45)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  heading: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  metric: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    lineHeight: 28,
  },
} as const;

export const layout = {
  /** Minimum touch target, in points (SPEC 15.2). */
  minTouchTarget: 44,
  /** Horizontal padding used by every screen. */
  screenPadding: 20,
  /** Bottom tab bar height. */
  tabBarHeight: 64,
} as const;
