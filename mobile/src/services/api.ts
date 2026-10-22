/**
 * HTTP client for the IronMind AI backend.
 *
 * Responsibilities:
 * - point to the API base URL (`EXPO_PUBLIC_API_URL`);
 * - attach the bearer token to every private request (SPEC A.4);
 * - renew the session by itself when the access token expires
 *   (SPEC 7.7 - renovação, SPEC 14.1);
 * - normalize every failure into the single error shape of SPEC A.1.
 */
import {
  create,
  isAxiosError,
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from '../storage/secureToken';
import { setConnectionStatus } from './connection';
import { ENDPOINTS } from './endpoints';
import { emitSessionExpired } from './sessionEvents';
import {
  API_ERROR_CODES,
  type ApiError,
  type ApiErrorCode,
  type ApiErrorResponse,
  type AuthResponse,
  type FieldError,
} from '../types/api';
import { createMockAdapter } from './mockAdapter';

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Internal flag: the request must never trigger the automatic renewal.
     * Used by the refresh call itself, so the client never loops.
     */
    skipAuthRefresh?: boolean;
    /**
     * Internal flag: the automatic renewal already happened for this
     * request, so a new 401 must not start another renewal.
     */
    authRefreshAttempted?: boolean;
    /**
     * Internal: the body before the JSON serialization. It is kept to
     * replay the request after a renewal.
     */
    replayBody?: unknown;
  }
}

export const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_BASE_URL;

/**
 * The mock adapter is used while there is no backend running. It implements
 * the same contracts described in the SPEC, so the app code never changes
 * when the real API is available.
 */
export const USE_MOCK_API =
  (process.env.EXPO_PUBLIC_USE_MOCK_API ?? 'true').toLowerCase() !== 'false';

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: API_ERROR_CODES.VALIDATION_ERROR,
  401: API_ERROR_CODES.UNAUTHENTICATED,
  403: API_ERROR_CODES.FORBIDDEN,
  404: API_ERROR_CODES.NOT_FOUND,
  409: API_ERROR_CODES.CONFLICT,
  422: API_ERROR_CODES.VALIDATION_ERROR,
  429: API_ERROR_CODES.RATE_LIMITED,
  502: API_ERROR_CODES.AI_INVALID_RESPONSE,
  503: API_ERROR_CODES.AI_UNAVAILABLE,
};

/** Default message of every error code, used when the API sends none. */
export const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  [API_ERROR_CODES.VALIDATION_ERROR]: 'Confira os dados informados.',
  [API_ERROR_CODES.UNAUTHENTICATED]: 'Sua sessão expirou. Entre novamente.',
  [API_ERROR_CODES.FORBIDDEN]: 'Você não tem permissão para acessar este recurso.',
  [API_ERROR_CODES.NOT_FOUND]: 'Recurso não encontrado.',
  [API_ERROR_CODES.CONFLICT]: 'Operação conflitante com o estado atual.',
  [API_ERROR_CODES.IDEMPOTENCY_KEY_REUSED]:
    'Esta operação já foi registrada com outro conteúdo.',
  [API_ERROR_CODES.RATE_LIMITED]: 'Muitas requisições. Aguarde alguns instantes.',
  [API_ERROR_CODES.AI_UNAVAILABLE]: 'O serviço de IA está indisponível no momento.',
  [API_ERROR_CODES.AI_INVALID_RESPONSE]:
    'O serviço de IA retornou uma resposta inesperada.',
  [API_ERROR_CODES.EMAIL_ALREADY_IN_USE]: 'Este e-mail já está cadastrado.',
  [API_ERROR_CODES.INVALID_CREDENTIALS]: 'E-mail ou senha inválidos.',
  [API_ERROR_CODES.INVALID_REFRESH_TOKEN]: 'Sua sessão expirou. Entre novamente.',
  [API_ERROR_CODES.INVALID_RESET_TOKEN]:
    'O link de recuperação expirou. Peça um novo.',
  [API_ERROR_CODES.NETWORK_ERROR]:
    'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
  [API_ERROR_CODES.UNKNOWN_ERROR]:
    'Não foi possível concluir a operação. Tente novamente.',
};

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(API_ERROR_CODES, value)
  );
}

function readFieldErrors(value: unknown): FieldError[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is FieldError =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as FieldError).field === 'string' &&
      typeof (entry as FieldError).message === 'string'
  );
}

function isNormalizedApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    isApiErrorCode((value as ApiError).code) &&
    typeof (value as ApiError).isNetworkError === 'boolean'
  );
}

/**
 * Converts any thrown value into the normalized error used by the UI.
 *
 * Backend failures keep the stable `code` and the field level details of
 * SPEC A.1. Network failures are flagged with `isNetworkError`.
 */
export function mapApiError(error: unknown): ApiError {
  if (isNormalizedApiError(error)) {
    return error;
  }

  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<Partial<ApiErrorResponse>>;

    if (!axiosError.response) {
      return {
        code: API_ERROR_CODES.NETWORK_ERROR,
        message: DEFAULT_MESSAGES[API_ERROR_CODES.NETWORK_ERROR],
        fieldErrors: [],
        isNetworkError: true,
      };
    }

    const { status, data } = axiosError.response;
    const body = typeof data === 'object' && data !== null ? data : undefined;
    const code = isApiErrorCode(body?.code)
      ? body.code
      : (STATUS_TO_CODE[status] ?? API_ERROR_CODES.UNKNOWN_ERROR);

    return {
      code,
      message:
        typeof body?.message === 'string' && body.message.trim().length > 0
          ? body.message
          : DEFAULT_MESSAGES[code],
      status,
      fieldErrors: readFieldErrors(body?.fieldErrors),
      traceId: typeof body?.traceId === 'string' ? body.traceId : undefined,
      path: typeof body?.path === 'string' ? body.path : undefined,
      isNetworkError: false,
    };
  }

  return {
    code: API_ERROR_CODES.UNKNOWN_ERROR,
    message: DEFAULT_MESSAGES[API_ERROR_CODES.UNKNOWN_ERROR],
    fieldErrors: [],
    isNetworkError: false,
  };
}

function readRequestBody(data: unknown): string | undefined {
  if (typeof data !== 'string') {
    return undefined;
  }
  return data;
}

/** Endpoints of the authentication group: they are public (SPEC 11.1). */
const PUBLIC_AUTH_PATHS = [
  ENDPOINTS.auth.login,
  ENDPOINTS.auth.register,
  ENDPOINTS.auth.refresh,
  ENDPOINTS.auth.logout,
  ENDPOINTS.auth.forgotPassword,
  ENDPOINTS.auth.resetPassword,
];

/**
 * Tells if the request goes to a public endpoint of the authentication
 * group. The bearer token is not sent to them: an expired token must never
 * break a public call.
 */
function isPublicAuthRequest(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  const path = (url.split('?')[0] ?? '').replace(/\/$/, '');
  return PUBLIC_AUTH_PATHS.some(
    (candidate) => path === candidate || path.endsWith(candidate)
  );
}

/** Attaches the bearer token to private requests (SPEC A.4). */
async function authRequestInterceptor(
  config: InternalAxiosRequestConfig
): Promise<InternalAxiosRequestConfig> {
  // The body is kept before the serialization, so the request can be
  // replayed after a renewal.
  config.replayBody = config.data;

  if (!isPublicAuthRequest(config.url)) {
    const token = await getAccessToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return config;
}

/** Result of an attempt to renew the access token. */
type RenewalResult =
  | { status: 'renewed'; accessToken: string }
  | { status: 'expired' }
  | { status: 'failed'; error: ApiError };

function isSessionRejection(error: ApiError): boolean {
  return (
    error.code === API_ERROR_CODES.INVALID_REFRESH_TOKEN ||
    error.code === API_ERROR_CODES.UNAUTHENTICATED
  );
}

/**
 * Renews the access token with the rotating refresh token (SPEC 7.7).
 *
 * The refresh token is stored in the secure store and is replaced by the new
 * one on every renewal. When the server rejects the token the session is
 * over: the credentials are dropped and the app is told to go back to the
 * login screen.
 */
async function renewAccessToken(instance: AxiosInstance): Promise<RenewalResult> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    await clearTokens();
    emitSessionExpired();
    return { status: 'expired' };
  }

  try {
    const response = await instance.post<AuthResponse>(
      ENDPOINTS.auth.refresh,
      { refreshToken },
      { skipAuthRefresh: true }
    );

    await saveAccessToken(response.data.accessToken);
    await saveRefreshToken(response.data.refreshToken);

    return { status: 'renewed', accessToken: response.data.accessToken };
  } catch (error) {
    const apiError = mapApiError(error);

    if (isSessionRejection(apiError)) {
      await clearTokens();
      emitSessionExpired();
      return { status: 'expired' };
    }

    return { status: 'failed', error: apiError };
  }
}

/**
 * Normalizes every failure so the UI only deals with `ApiError` and renews
 * the session when the access token expired.
 *
 * The renewal never happens on the public endpoints of the authentication
 * group: there a `401` is a domain answer (invalid credentials, invalid
 * recovery token), not an expired access token.
 */
async function errorResponseInterceptor(
  instance: AxiosInstance,
  error: unknown
): Promise<never> {
  const axiosError = error as AxiosError<Partial<ApiErrorResponse>>;
  const config = axiosError.config;
  const status = axiosError.response?.status;

  if (
    status === 401 &&
    config &&
    !config.skipAuthRefresh &&
    !isPublicAuthRequest(config.url)
  ) {
    if (config.authRefreshAttempted) {
      // The renewed token was refused as well: the session is over.
      await clearTokens();
      emitSessionExpired();
    } else {
      const renewal = await renewAccessToken(instance);

      if (renewal.status === 'renewed') {
        config.authRefreshAttempted = true;
        config.headers.set('Authorization', `Bearer ${renewal.accessToken}`);
        if (config.replayBody !== undefined) {
          config.data = config.replayBody;
        }
        return instance.request(config);
      }

      if (renewal.status === 'failed') {
        setConnectionStatus(!renewal.error.isNetworkError);
        return Promise.reject(renewal.error);
      }
    }
  }

  const apiError = mapApiError(error);
  setConnectionStatus(!apiError.isNetworkError);
  return Promise.reject(apiError);
}

export type ApiClientOptions = {
  baseURL?: string;
  useMock?: boolean;
};

export function createApiClient(options: ApiClientOptions = {}): AxiosInstance {
  const instance = create({
    baseURL: options.baseURL ?? API_BASE_URL,
    timeout: 15000,
    headers: { Accept: 'application/json' },
  });

  instance.interceptors.request.use(authRequestInterceptor);
  instance.interceptors.response.use(
    (response) => {
      setConnectionStatus(true);
      return response;
    },
    (error: unknown) => errorResponseInterceptor(instance, error)
  );

  const useMock = options.useMock ?? USE_MOCK_API;
  if (useMock) {
    instance.defaults.adapter = createMockAdapter();
  }

  return instance;
}

/** Shared client used by every feature service. */
export const api = createApiClient();

export type RequestOptions = AxiosRequestConfig;

/** Reads the raw body of a request, used by the mock backend. */
export { readRequestBody };
