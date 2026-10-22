/**
 * API contract types.
 *
 * Shapes follow the "Apêndice A — Contratos de API" of the SPEC:
 * A.1 error format, A.2 pagination and A.4 authentication.
 */
import type { AuthUser } from './user';

export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  IDEMPOTENCY_KEY_REUSED: 'IDEMPOTENCY_KEY_REUSED',
  RATE_LIMITED: 'RATE_LIMITED',
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
  AI_INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
  /** Client side only: the request never reached the server. */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Client side only: the failure could not be classified. */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/** Field level validation detail carried by A.1 error payloads. */
export type FieldError = {
  field: string;
  message: string;
};

/** Raw error body returned by the backend (SPEC A.1). */
export type ApiErrorResponse = {
  timestamp: string;
  status: number;
  error: string;
  code: ApiErrorCode;
  message: string;
  path: string;
  traceId: string;
  fieldErrors?: FieldError[];
};

/** Paginated envelope returned by the backend (SPEC A.2). */
export type Page<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

/** Query parameters accepted by paginated endpoints (SPEC A.2). */
export type PageParams = {
  page?: number;
  size?: number;
  sort?: string;
};

/** Maximum page size accepted by the backend (SPEC A.2). */
export const MAX_PAGE_SIZE = 100;

/** Login/register response (SPEC A.4). */
export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
};

/** Normalized error used across the app. */
export type ApiError = {
  code: ApiErrorCode;
  message: string;
  status?: number;
  fieldErrors: FieldError[];
  traceId?: string;
  path?: string;
  /** True when the request never reached the server. */
  isNetworkError: boolean;
};
