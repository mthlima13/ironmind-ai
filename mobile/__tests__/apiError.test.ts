import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

import { api, mapApiError } from '../src/services/api';
import { API_ERROR_CODES } from '../src/types/api';

function buildAxiosError(
  data: unknown,
  status: number
): AxiosError<Record<string, unknown>> {
  const response = {
    data,
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse<Record<string, unknown>>;

  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_RESPONSE',
    { headers: new AxiosHeaders() } as never,
    undefined,
    response
  );
}

describe('mapApiError', () => {
  it('keeps the stable code and the field errors of the SPEC A.1 format', () => {
    const error = buildAxiosError(
      {
        timestamp: '2026-10-21T19:43:06Z',
        status: 422,
        error: 'Validation Failed',
        code: 'VALIDATION_ERROR',
        message: "O campo 'weightKg' deve ser maior ou igual a zero.",
        path: '/api/v1/workout-sessions/{id}/sets',
        traceId: '8f2c1a90-6c1e-4f2b-9a7d-3c5e8b1f0a44',
        fieldErrors: [
          { field: 'weightKg', message: 'deve ser maior ou igual a zero' },
        ],
      },
      422
    );

    const result = mapApiError(error);

    expect(result.code).toBe(API_ERROR_CODES.VALIDATION_ERROR);
    expect(result.status).toBe(422);
    expect(result.message).toBe(
      "O campo 'weightKg' deve ser maior ou igual a zero."
    );
    expect(result.traceId).toBe('8f2c1a90-6c1e-4f2b-9a7d-3c5e8b1f0a44');
    expect(result.path).toBe('/api/v1/workout-sessions/{id}/sets');
    expect(result.fieldErrors).toEqual([
      { field: 'weightKg', message: 'deve ser maior ou igual a zero' },
    ]);
    expect(result.isNetworkError).toBe(false);
  });

  it('derives the code from the status when the body has no code', () => {
    const error = buildAxiosError({ message: 'Recurso não encontrado.' }, 404);

    const result = mapApiError(error);

    expect(result.code).toBe(API_ERROR_CODES.NOT_FOUND);
    expect(result.status).toBe(404);
    expect(result.message).toBe('Recurso não encontrado.');
  });

  it('maps every domain code of the SPEC A.5 table', () => {
    const cases: [number, string][] = [
      [401, API_ERROR_CODES.UNAUTHENTICATED],
      [403, API_ERROR_CODES.FORBIDDEN],
      [404, API_ERROR_CODES.NOT_FOUND],
      [409, API_ERROR_CODES.CONFLICT],
      [422, API_ERROR_CODES.VALIDATION_ERROR],
      [429, API_ERROR_CODES.RATE_LIMITED],
      [502, API_ERROR_CODES.AI_INVALID_RESPONSE],
      [503, API_ERROR_CODES.AI_UNAVAILABLE],
    ];

    cases.forEach(([status, code]) => {
      const result = mapApiError(buildAxiosError({}, status));
      expect(result.code).toBe(code);
    });
  });

  it('flags the failures that never reached the server', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK');

    const result = mapApiError(error);

    expect(result.code).toBe(API_ERROR_CODES.NETWORK_ERROR);
    expect(result.isNetworkError).toBe(true);
    expect(result.fieldErrors).toEqual([]);
  });

  it('never leaks internal details of an unknown failure', () => {
    const result = mapApiError(new Error('stack trace at src/index.ts:42'));

    expect(result.code).toBe(API_ERROR_CODES.UNKNOWN_ERROR);
    expect(result.isNetworkError).toBe(false);
    expect(result.message).not.toContain('src/index.ts');
  });

  it('is idempotent for an already normalized error', () => {
    const first = mapApiError(buildAxiosError({ code: 'CONFLICT' }, 409));
    const second = mapApiError(first);

    expect(second).toBe(first);
  });
});

describe('api client', () => {
  it('rejects with the normalized error when the backend answers 422', async () => {
    await expect(
      api.post('/auth/login', { email: 'not-an-email', password: '123' })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.VALIDATION_ERROR,
      status: 422,
      isNetworkError: false,
    });
  });

  it('keeps the field errors returned by the backend', async () => {
    try {
      await api.post('/auth/login', { email: 'not-an-email', password: '123' });
      throw new Error('The request should have been rejected');
    } catch (error) {
      const apiError = mapApiError(error);
      expect(apiError.code).toBe(API_ERROR_CODES.VALIDATION_ERROR);
      expect(apiError.fieldErrors.length).toBeGreaterThan(0);
      expect(apiError.fieldErrors[0].field).toBeDefined();
    }
  });
});
