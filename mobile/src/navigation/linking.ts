import type { LinkingOptions, NavigatorScreenParams } from '@react-navigation/native';

/**
 * Deep link configuration of the app (SPEC 15.1).
 *
 * Expo Router derives the route tree from the `app/` folder, and the scheme
 * comes from `app.json`. This module is the single source of truth for the
 * paths used by the app and for the deep links shared outside of it.
 */
export const APP_SCHEME = 'ironmind';

/** Parameters of the tabs group. */
export type TabsParamList = {
  index: undefined;
  treinos: undefined;
  comecar: { programId?: string; programDayId?: string } | undefined;
  evolucao: undefined;
  perfil: undefined;
};

/** Parameters of the authentication group. */
export type AuthParamList = {
  login: undefined;
  register: undefined;
  forgotPassword: undefined;
};

/** Parameters of the root navigator. */
export type RootParamList = {
  '(tabs)': NavigatorScreenParams<TabsParamList> | undefined;
  auth: NavigatorScreenParams<AuthParamList> | undefined;
  resetPassword: { token?: string } | undefined;
  coach: undefined;
};

/** Internal routes, used by every navigation call of the app. */
export const ROUTES = {
  inicio: '/(tabs)',
  treinos: '/(tabs)/treinos',
  comecar: '/(tabs)/comecar',
  evolucao: '/(tabs)/evolucao',
  perfil: '/(tabs)/perfil',
  coach: '/coach',
  login: '/auth/login',
  register: '/auth/register',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/reset-password',
} as const;

export type AppRoute = keyof typeof ROUTES;

/** Public path of each route, used to build the deep links. */
export const DEEP_LINK_PATHS: Record<AppRoute, string> = {
  inicio: 'inicio',
  treinos: 'treinos',
  comecar: 'comecar',
  evolucao: 'evolucao',
  perfil: 'perfil',
  coach: 'coach',
  login: 'entrar',
  register: 'cadastrar',
  forgotPassword: 'esqueci-senha',
  resetPassword: 'reset-password',
};

export function buildDeepLink(route: AppRoute): string {
  return `${APP_SCHEME}://${DEEP_LINK_PATHS[route]}`;
}

/**
 * Link used by the e-mail of access recovery.
 *
 * The token travels in the query string and is single use (SPEC 7.7).
 */
export function buildResetPasswordDeepLink(token: string): string {
  return `${APP_SCHEME}://${DEEP_LINK_PATHS.resetPassword}?token=${encodeURIComponent(
    token
  )}`;
}

/** Configuration used by React Navigation when the app is opened by a link. */
export const linking: LinkingOptions<RootParamList> = {
  prefixes: [`${APP_SCHEME}://`],
  config: {
    screens: {
      '(tabs)': {
        screens: {
          index: DEEP_LINK_PATHS.inicio,
          treinos: DEEP_LINK_PATHS.treinos,
          comecar: DEEP_LINK_PATHS.comecar,
          evolucao: DEEP_LINK_PATHS.evolucao,
          perfil: DEEP_LINK_PATHS.perfil,
        },
      },
      auth: {
        screens: {
          login: DEEP_LINK_PATHS.login,
          register: DEEP_LINK_PATHS.register,
          forgotPassword: DEEP_LINK_PATHS.forgotPassword,
        },
      },
      resetPassword: DEEP_LINK_PATHS.resetPassword,
      coach: DEEP_LINK_PATHS.coach,
    },
  },
};
