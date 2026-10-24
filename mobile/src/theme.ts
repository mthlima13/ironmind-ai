/**
 * IronMind AI visual language.
 *
 * Dark graphite surfaces with a lime accent, as defined in SPEC 15.2.
 * Touch targets are never smaller than 44pt so the set logger stays usable
 * mid-workout (SPEC 15.2).
 */

export const colors = {
  /** App background. */
  background: '#0B0E10',
  /** Slightly lifted background used behind cards. */
  backgroundElevated: '#111619',
  /** Default card surface. */
  surface: '#161C20',
  /** Surface used for inputs and nested elements. */
  surfaceElevated: '#1E262B',
  /** Surface pressed state. */
  surfacePressed: '#263137',
  /** Hairline borders. */
  border: '#5F6F78',
  /** Emphasised borders. */
  borderStrong: '#6F7C78',

  /** Primary text. */
  text: '#F4F7F5',
  /** Secondary text. */
  textSecondary: '#AAB5B0',
  /** Muted text, used for hints and metadata. */
  textMuted: '#87948F',

  /** Lime accent. */
  accent: '#C8F751',
  /** Accent pressed state. */
  accentPressed: '#B2E33A',
  /** Transparent accent fill. */
  accentSoft: 'rgba(200, 247, 81, 0.14)',
  /** Text/icon color on top of the accent. */
  onAccent: '#0B0E10',

  danger: '#FF6B5E',
  dangerSoft: 'rgba(255, 107, 94, 0.14)',
  warning: '#FFB547',
  warningSoft: 'rgba(255, 181, 71, 0.14)',
  success: '#6FE08B',
  successSoft: 'rgba(111, 224, 139, 0.14)',
  info: '#6BB7FF',
  infoSoft: 'rgba(107, 183, 255, 0.14)',

  /** Modal / scrim color. */
  overlay: 'rgba(0, 0, 0, 0.65)',
} as const;

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
    textTransform: 'uppercase',
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

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  layout,
} as const;

export type Theme = typeof theme;
