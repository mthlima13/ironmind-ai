/**
 * In-memory implementation of the IronMind AI API contract.
 *
 * The app ships with this adapter so every screen can be exercised without a
 * running backend. It follows the SPEC contracts: paginated envelopes
 * (A.2), the single error format (A.1), bearer authentication (A.4) and
 * idempotent writes (A.3).
 */
import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import {
  MOCK_DASHBOARD,
  MOCK_EXERCISE_PROGRESS,
  MOCK_RECORDS,
} from '../mocks/analytics';
import { MOCK_EXERCISES } from '../mocks/exercises';
import { MOCK_PROGRAMS } from '../mocks/programs';
import { MOCK_SESSIONS } from '../mocks/sessions';
import { MOCK_RESTRICTIONS, MOCK_USER_PROFILE } from '../mocks/user';
import {
  API_ERROR_CODES,
  type ApiErrorCode,
  type ApiErrorResponse,
  type FieldError,
  type Page,
} from '../types/api';
import type { Exercise } from '../types/exercise';
import type { WorkoutProgram } from '../types/program';
import type { InjuryRestriction, UserProfile } from '../types/user';
import type { ExerciseSet, WorkoutSession } from '../types/workout';

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

class MockHttpError extends Error {
  readonly status: number;

  readonly body: ApiErrorResponse;

  constructor(status: number, body: ApiErrorResponse) {
    super(body.message);
    this.name = 'MockHttpError';
    this.status = status;
    this.body = body;
  }
}

type MockState = {
  tokens: Set<string>;
  profile: UserProfile;
  restrictions: InjuryRestriction[];
  sessions: WorkoutSession[];
  /** Idempotency key -> already created response body. */
  idempotency: Map<string, unknown>;
  sequence: number;
};

type RouteContext = {
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
  path: string;
};

type MockRoute = {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  requiresAuth: boolean;
  handler: (context: RouteContext) => unknown;
};

function createState(): MockState {
  return {
    tokens: new Set<string>(),
    profile: structuredClone(MOCK_USER_PROFILE),
    restrictions: structuredClone(MOCK_RESTRICTIONS),
    sessions: structuredClone(MOCK_SESSIONS),
    idempotency: new Map<string, unknown>(),
    sequence: 1,
  };
}

function nextId(prefix: string, state: MockState): string {
  state.sequence += 1;
  return `${prefix}-${state.sequence}`;
}

function errorBody(
  status: number,
  code: ApiErrorCode,
  message: string,
  path: string,
  fieldErrors?: FieldError[]
): ApiErrorResponse {
  return {
    timestamp: new Date().toISOString(),
    status,
    error: STATUS_TEXT[status] ?? 'Error',
    code,
    message,
    path,
    traceId: `mock-${Math.random().toString(16).slice(2, 10)}`,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

function fail(
  status: number,
  code: ApiErrorCode,
  message: string,
  path: string,
  fieldErrors?: FieldError[]
): never {
  throw new MockHttpError(status, errorBody(status, code, message, path, fieldErrors));
}

function paginate<T>(items: T[], page: number, size: number): Page<T> {
  const safeSize = Math.min(Math.max(size, 1), 100);
  const safePage = Math.max(page, 0);
  const start = safePage * safeSize;
  const content = items.slice(start, start + safeSize);
  const totalElements = items.length;
  const totalPages = Math.ceil(totalElements / safeSize);
  return {
    content,
    page: safePage,
    size: safeSize,
    totalElements,
    totalPages,
    hasNext: safePage + 1 < totalPages,
  };
}

function buildRoute(
  method: string,
  path: string,
  requiresAuth: boolean,
  handler: (context: RouteContext) => unknown
): MockRoute {
  const paramNames: string[] = [];
  const pattern = path.replace(/:([A-Za-z0-9_]+)/g, (_match, name: string) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  return {
    method,
    pattern: new RegExp(`^${pattern}$`),
    paramNames,
    requiresAuth,
    handler,
  };
}

function buildRoutes(state: MockState): MockRoute[] {
  return [
    buildRoute('POST', '/auth/login', false, ({ body, path }) => {
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const fieldErrors: FieldError[] = [];

      if (!email) {
        fieldErrors.push({ field: 'email', message: 'obrigatório' });
      } else if (!email.includes('@')) {
        fieldErrors.push({ field: 'email', message: 'deve conter um e-mail válido' });
      }
      if (password.length < 8) {
        fieldErrors.push({
          field: 'password',
          message: 'deve ter ao menos 8 caracteres',
        });
      }
      if (fieldErrors.length > 0) {
        fail(
          422,
          API_ERROR_CODES.VALIDATION_ERROR,
          'E-mail ou senha inválidos.',
          path,
          fieldErrors
        );
      }

      const accessToken = `mock-access-${nextId('token', state)}`;
      const refreshToken = `mock-refresh-${nextId('token', state)}`;
      state.tokens.add(accessToken);
      state.profile.user.email = email;

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer' as const,
        expiresIn: 900,
        user: state.profile.user,
      };
    }),

    buildRoute('POST', '/auth/register', false, ({ body, path }) => {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const fieldErrors: FieldError[] = [];

      if (name.length < 2) {
        fieldErrors.push({ field: 'name', message: 'deve ter ao menos 2 caracteres' });
      }
      if (!email.includes('@')) {
        fieldErrors.push({ field: 'email', message: 'deve conter um e-mail válido' });
      }
      if (password.length < 8) {
        fieldErrors.push({
          field: 'password',
          message: 'deve ter ao menos 8 caracteres',
        });
      }
      if (fieldErrors.length > 0) {
        fail(
          422,
          API_ERROR_CODES.VALIDATION_ERROR,
          'Não foi possível criar a conta.',
          path,
          fieldErrors
        );
      }

      state.profile.user = { ...state.profile.user, name, email };
      const accessToken = `mock-access-${nextId('token', state)}`;
      const refreshToken = `mock-refresh-${nextId('token', state)}`;
      state.tokens.add(accessToken);

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer' as const,
        expiresIn: 900,
        user: state.profile.user,
      };
    }),

    buildRoute('POST', '/auth/logout', true, ({ body }) => {
      const token = typeof body.accessToken === 'string' ? body.accessToken : '';
      state.tokens.delete(token);
      return { success: true };
    }),

    buildRoute('GET', '/users/me', true, () => state.profile),

    buildRoute('PATCH', '/users/me', true, ({ body }) => {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name) {
        state.profile.user.name = name;
      }
      const preferences = body.preferences;
      if (preferences && typeof preferences === 'object') {
        state.profile.preferences = {
          ...state.profile.preferences,
          ...(preferences as Partial<UserProfile['preferences']>),
        };
      }
      return state.profile;
    }),

    buildRoute('GET', '/exercises', true, ({ query }) => {
      const search = (query.get('search') ?? '').trim().toLowerCase();
      const muscleGroup = query.get('muscleGroup');
      const page = Number(query.get('page') ?? '0');
      const size = Number(query.get('size') ?? '20');

      const filtered = MOCK_EXERCISES.filter((exercise: Exercise) => {
        const matchesSearch =
          search.length === 0 ||
          exercise.name.toLowerCase().includes(search) ||
          exercise.equipment.toLowerCase().includes(search);
        const matchesGroup =
          !muscleGroup ||
          muscleGroup === 'ALL' ||
          exercise.primaryMuscleGroup === muscleGroup;
        return matchesSearch && matchesGroup;
      });

      return paginate(filtered, Number.isNaN(page) ? 0 : page, Number.isNaN(size) ? 20 : size);
    }),

    buildRoute('GET', '/exercises/:id', true, ({ params, path }) => {
      const exercise = MOCK_EXERCISES.find((item) => item.id === params.id);
      if (!exercise) {
        fail(404, API_ERROR_CODES.NOT_FOUND, 'Exercício não encontrado.', path);
      }
      return exercise;
    }),

    buildRoute('GET', '/programs', true, ({ query }) => {
      const page = Number(query.get('page') ?? '0');
      const size = Number(query.get('size') ?? '20');
      return paginate(
        MOCK_PROGRAMS,
        Number.isNaN(page) ? 0 : page,
        Number.isNaN(size) ? 20 : size
      );
    }),

    buildRoute('GET', '/programs/:id', true, ({ params, path }) => {
      const program = MOCK_PROGRAMS.find((item) => item.id === params.id);
      if (!program) {
        fail(404, API_ERROR_CODES.NOT_FOUND, 'Programa não encontrado.', path);
      }
      return program;
    }),

    buildRoute('GET', '/workout-sessions', true, ({ query }) => {
      const page = Number(query.get('page') ?? '0');
      const size = Number(query.get('size') ?? '20');
      return paginate(
        state.sessions,
        Number.isNaN(page) ? 0 : page,
        Number.isNaN(size) ? 20 : size
      );
    }),

    buildRoute('GET', '/workout-sessions/:id', true, ({ params, path }) => {
      const session = state.sessions.find((item) => item.id === params.id);
      if (!session) {
        fail(404, API_ERROR_CODES.NOT_FOUND, 'Sessão não encontrada.', path);
      }
      return session;
    }),

    buildRoute('POST', '/workout-sessions', true, ({ body }) => {
      const programId = typeof body.programId === 'string' ? body.programId : null;
      const programDayId = typeof body.programDayId === 'string' ? body.programDayId : null;
      const program: WorkoutProgram | undefined = MOCK_PROGRAMS.find(
        (item) => item.id === programId
      );
      const day = program?.days.find((item) => item.id === programDayId);

      const session: WorkoutSession = {
        id: nextId('ses', state),
        programId,
        programDayId,
        startedAt: new Date().toISOString(),
        completedAt: null,
        status: 'IN_PROGRESS',
        exercises: (day?.exercises ?? []).map((programExercise, index) => ({
          id: nextId('sex', state),
          exerciseId: programExercise.exerciseId,
          exercise: programExercise.exercise,
          position: index + 1,
          sets: [],
        })),
      };

      state.sessions.unshift(session);
      return session;
    }),

    buildRoute('POST', '/workout-sessions/:id/sets', true, ({ params, body, path }) => {
      const session = state.sessions.find((item) => item.id === params.id);
      if (!session) {
        fail(404, API_ERROR_CODES.NOT_FOUND, 'Sessão não encontrada.', path);
      }
      if (session.status === 'COMPLETED') {
        fail(
          409,
          API_ERROR_CODES.CONFLICT,
          'A sessão já foi finalizada e não aceita novas séries.',
          path
        );
      }

      const sessionExercise = session.exercises.find(
        (item) => item.id === body.sessionExerciseId
      );
      if (!sessionExercise) {
        fail(
          404,
          API_ERROR_CODES.NOT_FOUND,
          'Exercício não encontrado na sessão.',
          path
        );
      }

      const repetitions = Number(body.repetitions ?? 0);
      const rawWeight = body.weightKg;
      const weightKg =
        rawWeight === null || rawWeight === undefined ? null : Number(rawWeight);
      const perceivedExertion =
        body.perceivedExertion === null || body.perceivedExertion === undefined
          ? null
          : Number(body.perceivedExertion);

      const fieldErrors: FieldError[] = [];
      if (!Number.isInteger(repetitions) || repetitions < 1) {
        fieldErrors.push({
          field: 'repetitions',
          message: 'deve ser um número inteiro maior que zero',
        });
      }
      if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) {
        fieldErrors.push({
          field: 'weightKg',
          message: 'deve ser maior ou igual a zero',
        });
      }
      if (
        perceivedExertion !== null &&
        (!Number.isInteger(perceivedExertion) ||
          perceivedExertion < 1 ||
          perceivedExertion > 10)
      ) {
        fieldErrors.push({
          field: 'perceivedExertion',
          message: 'deve estar entre 1 e 10',
        });
      }
      if (fieldErrors.length > 0) {
        fail(
          422,
          API_ERROR_CODES.VALIDATION_ERROR,
          'A série não pode ser registrada.',
          path,
          fieldErrors
        );
      }

      const set: ExerciseSet = {
        id: nextId('set', state),
        setNumber: sessionExercise.sets.length + 1,
        weightKg,
        repetitions,
        perceivedExertion,
        completedAt: new Date().toISOString(),
      };
      sessionExercise.sets.push(set);
      return set;
    }),

    buildRoute('POST', '/workout-sessions/:id/complete', true, ({ params, path }) => {
      const session = state.sessions.find((item) => item.id === params.id);
      if (!session) {
        fail(404, API_ERROR_CODES.NOT_FOUND, 'Sessão não encontrada.', path);
      }
      if (session.status === 'COMPLETED') {
        fail(
          409,
          API_ERROR_CODES.CONFLICT,
          'A sessão já foi finalizada.',
          path
        );
      }
      session.status = 'COMPLETED';
      session.completedAt = new Date().toISOString();
      return session;
    }),

    buildRoute('GET', '/analytics/overview', true, () => MOCK_DASHBOARD),

    buildRoute('GET', '/analytics/exercises/:id', true, ({ params, path }) => {
      const progress = MOCK_EXERCISE_PROGRESS[params.id];
      if (!progress) {
        fail(404, API_ERROR_CODES.NOT_FOUND, 'Exercício não encontrado.', path);
      }
      return progress;
    }),

    buildRoute('GET', '/records', true, () => paginate(MOCK_RECORDS, 0, 20)),

    buildRoute('GET', '/restrictions', true, () => state.restrictions),

    buildRoute('PUT', '/restrictions', true, ({ body }) => {
      const restrictions = Array.isArray(body.restrictions)
        ? (body.restrictions as InjuryRestriction[])
        : [];
      state.restrictions = restrictions;
      return state.restrictions;
    }),
  ];
}

function resolvePath(config: InternalAxiosRequestConfig): string {
  const raw = config.url ?? '';
  const withoutQuery = raw.split('?')[0] ?? '';
  const base = config.baseURL ?? '';
  let path = withoutQuery;
  if (base && path.startsWith(base)) {
    path = path.slice(base.length);
  }
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return path.length > 1 ? path.replace(/\/$/, '') : path;
}

function resolveQuery(config: InternalAxiosRequestConfig): URLSearchParams {
  const query = new URLSearchParams();
  const [inline] = (config.url ?? '').split('?');
  if (inline !== undefined) {
    const raw = (config.url ?? '').slice(inline.length + 1);
    new URLSearchParams(raw).forEach((value, key) => query.append(key, value));
  }
  const params = config.params;
  if (params && typeof params === 'object') {
    Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
  }
  return query;
}

function resolveBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  const data = config.data;
  if (typeof data === 'string') {
    try {
      const parsed: unknown = JSON.parse(data);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (data && typeof data === 'object') {
    return data as Record<string, unknown>;
  }
  return {};
}

function buildResponse<T>(
  config: InternalAxiosRequestConfig,
  data: T,
  status: number
): AxiosResponse<T> {
  const response: AxiosResponse<T> = {
    data,
    status,
    statusText: STATUS_TEXT[status] ?? '',
    headers: {},
    config,
    request: { mock: true },
  };

  // Axios expects the adapter to reject on the statuses rejected by
  // `validateStatus`, exactly like the native adapters do.
  const validateStatus = config.validateStatus ?? defaultValidateStatus;
  if (!validateStatus(status)) {
    throw new AxiosError(
      `Request failed with status code ${status}`,
      status >= 400 && status < 500
        ? AxiosError.ERR_BAD_REQUEST
        : AxiosError.ERR_BAD_RESPONSE,
      config,
      response.request,
      response
    );
  }

  return response;
}

function defaultValidateStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/** Creates the axios adapter that emulates the IronMind AI backend. */
export function createMockAdapter(): AxiosAdapter {
  const state = createState();
  const routes = buildRoutes(state);

  return async (config) => {
    const method = (config.method ?? 'get').toUpperCase();
    const path = resolvePath(config);
    const query = resolveQuery(config);
    const body = resolveBody(config);

    const route = routes.find(
      (item) => item.method === method && item.pattern.test(path)
    );

    if (!route) {
      return buildResponse(
        config,
        errorBody(
          404,
          API_ERROR_CODES.NOT_FOUND,
          `Endpoint não encontrado: ${method} ${path}`,
          path
        ),
        404
      );
    }

    const headers = AxiosHeaders.from(config.headers);
    const authorization = headers.get('Authorization');
    const token =
      typeof authorization === 'string'
        ? authorization.replace('Bearer ', '')
        : '';

    if (route.requiresAuth && !state.tokens.has(token)) {
      return buildResponse(
        config,
        errorBody(
          401,
          API_ERROR_CODES.UNAUTHENTICATED,
          'Token ausente, expirado ou inválido.',
          path
        ),
        401
      );
    }

    const match = route.pattern.exec(path);
    const params: Record<string, string> = {};
    route.paramNames.forEach((name, index) => {
      params[name] = decodeURIComponent(match?.[index + 1] ?? '');
    });

    try {
      const data = route.handler({ params, query, body, path });
      return buildResponse(config, data, 200);
    } catch (error) {
      if (error instanceof MockHttpError) {
        return buildResponse(config, error.body, error.status);
      }
      return buildResponse(
        config,
        errorBody(
          500,
          API_ERROR_CODES.UNKNOWN_ERROR,
          'Não foi possível concluir a operação.',
          path
        ),
        500
      );
    }
  };
}
