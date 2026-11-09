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

/** Parameters of the first-run onboarding group. */
export type AuthParamList = {
  boasvindas: undefined;
  funcao: undefined;
  embreve: undefined;
  register: undefined;
};

/** Parameters of the root navigator. */
export type RootParamList = {
  '(tabs)': NavigatorScreenParams<TabsParamList> | undefined;
  auth: NavigatorScreenParams<AuthParamList> | undefined;
  propostas: undefined;
  'programa/[id]': { id: string; source?: 'saved' | 'template' } | undefined;
  exercicios: undefined;
  configuracoes: undefined;
  /** Step 2 of the onboarding; receives the name from step 1. */
  preferencias: { name?: string } | undefined;
};

/** Internal routes, used by every navigation call of the app. */
export const ROUTES = {
  inicio: '/(tabs)',
  treinos: '/(tabs)/treinos',
  comecar: '/(tabs)/comecar',
  evolucao: '/(tabs)/evolucao',
  perfil: '/(tabs)/perfil',
  propostas: '/propostas',
  programa: '/programa/[id]',
  exercicios: '/exercicios',
  configuracoes: '/configuracoes',
  preferencias: '/preferencias',
  register: '/auth/register',
  boasvindas: '/auth/boasvindas',
  funcao: '/auth/funcao',
  embreve: '/auth/embreve',
} as const;

export type AppRoute = keyof typeof ROUTES;

/** Public path of each route, used to build the deep links. */
export const DEEP_LINK_PATHS: Record<AppRoute, string> = {
  inicio: 'inicio',
  treinos: 'treinos',
  comecar: 'comecar',
  evolucao: 'evolucao',
  perfil: 'perfil',
  register: 'cadastrar',
  boasvindas: 'boas-vindas',
  funcao: 'quem-e-voce',
  embreve: 'em-breve',
  propostas: 'propostas',
  programa: 'programa/:id',
  exercicios: 'exercicios',
  configuracoes: 'configuracoes',
  preferencias: 'preferencias',
};

export function buildDeepLink(route: AppRoute): string {
  return `${APP_SCHEME}://${DEEP_LINK_PATHS[route]}`;
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
          boasvindas: DEEP_LINK_PATHS.boasvindas,
          funcao: DEEP_LINK_PATHS.funcao,
          embreve: DEEP_LINK_PATHS.embreve,
          register: DEEP_LINK_PATHS.register,
        },
      },
      propostas: DEEP_LINK_PATHS.propostas,
      'programa/[id]': DEEP_LINK_PATHS.programa,
      exercicios: DEEP_LINK_PATHS.exercicios,
      configuracoes: DEEP_LINK_PATHS.configuracoes,
      preferencias: DEEP_LINK_PATHS.preferencias,
    },
  },
};
