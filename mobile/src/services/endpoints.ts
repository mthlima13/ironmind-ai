/**
 * REST endpoints of the IronMind AI backend (SPEC 11).
 *
 * Every private endpoint expects an `Authorization: Bearer <token>` header
 * (SPEC A.4).
 */
export const API_PREFIX = '/api/v1';

export const ENDPOINTS = {
  health: '/health',
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  users: {
    me: '/users/me',
  },
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
  },
} as const;

/** Header used to keep write operations idempotent (SPEC A.3). */
export const IDEMPOTENCY_HEADER = 'Idempotency-Key';
