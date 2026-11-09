/**
 * REST endpoints of the IronFit AI backend (SPEC 11).
 *
 * Every private endpoint expects the identity header injected by the gateway
 * (`X-User-UUID`, SPEC A.4). The backend has no authentication endpoints:
 * sign-up, login, session, profile and account deletion belong to the
 * identity provider (SPEC 11.1).
 */

export const API_PREFIX = '/api/v1';

export const ENDPOINTS = {
  health: '/health',
  exercises: {
    list: '/exercises',
    create: '/exercises',
    detail: (id: string) => `/exercises/${id}`,
    update: (id: string) => `/exercises/${id}`,
  },
  programs: {
    list: '/programs',
    create: '/programs',
    detail: (id: string) => `/programs/${id}`,
    update: (id: string) => `/programs/${id}`,
    archive: (id: string) => `/programs/${id}`,
  },
  sessions: {
    create: '/workout-sessions',
    list: '/workout-sessions',
    detail: (id: string) => `/workout-sessions/${id}`,
    update: (id: string) => `/workout-sessions/${id}`,
    addExercise: (id: string) => `/workout-sessions/${id}/exercises`,
    addSet: (id: string) => `/workout-sessions/${id}/sets`,
    complete: (id: string) => `/workout-sessions/${id}/complete`,
  },
  sets: {
    update: (id: string) => `/sets/${id}`,
    remove: (id: string) => `/sets/${id}`,
  },
  analytics: {
    overview: '/analytics/overview',
    exercise: (id: string) => `/analytics/exercises/${id}`,
  },
  records: {
    list: '/records',
  },
  restrictions: {
    get: '/restrictions',
    put: '/restrictions',
  },
  ai: {
    workoutProposals: '/ai/workout-proposals',
    loadSuggestions: '/ai/load-suggestions',
    coach: '/ai/coach',
    voiceInterpretation: '/ai/voice-interpretation',
    recommendationDecision: (id: string) =>
      `/ai/recommendations/${id}/decision`,
  },
} as const;

/** Header used to keep write operations idempotent (SPEC A.3). */
export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

/** Header that carries the identity of the request (SPEC A.4). */
export const USER_IDENTITY_HEADER = 'X-User-UUID';
