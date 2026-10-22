import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { useAuthStore } from '../src/features/auth/auth.store';
import { api, createApiClient } from '../src/services/api';
import {
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from '../src/storage/secureToken';
import { API_ERROR_CODES, type ApiErrorCode } from '../src/types/api';

const AUTH_USER = {
  id: 'usr-0001',
  name: 'Alex Morgan',
  email: 'alex@ironmind.ai',
  role: 'USER' as const,
};

type Call = {
  url: string;
  method: string;
  authorization: string | undefined;
  data: unknown;
};

function buildResponse<T>(
  config: InternalAxiosRequestConfig,
  data: T,
  status = 200
): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config,
    request: {},
  };
}

function buildUnauthorized(
  config: InternalAxiosRequestConfig,
  code: ApiErrorCode
): AxiosError {
  const response = {
    data: { code, message: 'Token expirado.' },
    status: 401,
    statusText: 'Unauthorized',
    headers: new AxiosHeaders(),
    config,
  } as AxiosResponse;

  return new AxiosError(
    'Request failed with status code 401',
    'ERR_BAD_RESPONSE',
    config,
    undefined,
    response
  );
}

function readIdempotencyKey(
  config: AxiosRequestConfig | undefined
): string | undefined {
  const headers = config?.headers as unknown as
    | Record<string, unknown>
    | undefined;
  const value = headers?.['Idempotency-Key'];
  return typeof value === 'string' ? value : undefined;
}

/** Reads the body of a request, which axios serializes before the adapter. */
function parseBody(data: unknown): unknown {
  return typeof data === 'string' ? JSON.parse(data) : data;
}

describe('automatic token renewal', () => {
  it('renews the session and replays the original request', async () => {
    const calls: Call[] = [];
    let privateAttempts = 0;

    const adapter: AxiosAdapter = async (config) => {
      const url = config.url ?? '';
      const authorization = AxiosHeaders.from(config.headers).get('Authorization');
      calls.push({
        url,
        method: (config.method ?? 'get').toUpperCase(),
        authorization:
          typeof authorization === 'string' ? authorization : undefined,
        data: config.data,
      });

      if (url.endsWith('/auth/refresh')) {
        return buildResponse(config, {
          accessToken: 'access-2',
          refreshToken: 'refresh-2',
          tokenType: 'Bearer',
          expiresIn: 900,
          user: AUTH_USER,
        });
      }

      privateAttempts += 1;
      if (privateAttempts === 1) {
        throw buildUnauthorized(config, API_ERROR_CODES.UNAUTHENTICATED);
      }

      return buildResponse(config, { ok: true });
    };

    const instance = createApiClient({ useMock: false });
    instance.defaults.adapter = adapter;

    await saveAccessToken('access-1');
    await saveRefreshToken('refresh-1');

    const response = await instance.get('/users/me');

    expect(response.data).toEqual({ ok: true });
    expect(calls.map((call) => call.url)).toEqual([
      '/users/me',
      '/auth/refresh',
      '/users/me',
    ]);
    expect(parseBody(calls[1].data)).toEqual({ refreshToken: 'refresh-1' });
    expect(calls[1].authorization).toBeUndefined();
    expect(calls[2].authorization).toBe('Bearer access-2');
    expect(await getAccessToken()).toBe('access-2');
    expect(await getRefreshToken()).toBe('refresh-2');
  });

  it('replays the original body of the request', async () => {
    const bodies: unknown[] = [];
    let privateAttempts = 0;

    const adapter: AxiosAdapter = async (config) => {
      const url = config.url ?? '';
      if (url.endsWith('/auth/refresh')) {
        return buildResponse(config, {
          accessToken: 'access-2',
          refreshToken: 'refresh-2',
          tokenType: 'Bearer',
          expiresIn: 900,
          user: AUTH_USER,
        });
      }

      privateAttempts += 1;
      bodies.push(config.data);
      if (privateAttempts === 1) {
        throw buildUnauthorized(config, API_ERROR_CODES.UNAUTHENTICATED);
      }

      return buildResponse(config, { ok: true });
    };

    const instance = createApiClient({ useMock: false });
    instance.defaults.adapter = adapter;

    await saveAccessToken('access-1');
    await saveRefreshToken('refresh-1');

    await instance.post('/workout-sessions', { programId: 'prg-1' });

    expect(bodies.map((body) => parseBody(body))).toEqual([
      { programId: 'prg-1' },
      { programId: 'prg-1' },
    ]);
  });

  it('clears the tokens and ends the session when the renewal is refused', async () => {
    const adapter: AxiosAdapter = async (config) => {
      if ((config.url ?? '').endsWith('/auth/refresh')) {
        throw buildUnauthorized(config, API_ERROR_CODES.INVALID_REFRESH_TOKEN);
      }
      throw buildUnauthorized(config, API_ERROR_CODES.UNAUTHENTICATED);
    };

    const instance = createApiClient({ useMock: false });
    instance.defaults.adapter = adapter;

    await saveAccessToken('access-1');
    await saveRefreshToken('refresh-1');

    await expect(instance.get('/users/me')).rejects.toMatchObject({
      code: API_ERROR_CODES.UNAUTHENTICATED,
    });

    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('does not renew the session twice for the same request', async () => {    let refreshCalls = 0;

    const adapter: AxiosAdapter = async (config) => {
      if ((config.url ?? '').endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return buildResponse(config, {
          accessToken: 'access-2',
          refreshToken: 'refresh-2',
          tokenType: 'Bearer',
          expiresIn: 900,
          user: AUTH_USER,
        });
      }
      throw buildUnauthorized(config, API_ERROR_CODES.UNAUTHENTICATED);
    };

    const instance = createApiClient({ useMock: false });
    instance.defaults.adapter = adapter;

    await saveAccessToken('access-1');
    await saveRefreshToken('refresh-1');

    await expect(instance.get('/users/me')).rejects.toMatchObject({
      code: API_ERROR_CODES.UNAUTHENTICATED,
    });

    expect(refreshCalls).toBe(1);
  });

  it('does not renew the session for the public authentication endpoints', async () => {
    let refreshCalls = 0;

    const adapter: AxiosAdapter = async (config) => {
      if ((config.url ?? '').endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return buildResponse(config, {
          accessToken: 'access-2',
          refreshToken: 'refresh-2',
          tokenType: 'Bearer',
          expiresIn: 900,
          user: AUTH_USER,
        });
      }
      throw buildUnauthorized(config, API_ERROR_CODES.INVALID_CREDENTIALS);
    };

    const instance = createApiClient({ useMock: false });
    instance.defaults.adapter = adapter;

    await saveAccessToken('access-1');
    await saveRefreshToken('refresh-1');

    await expect(
      instance.post('/auth/login', {
        email: 'alex@ironmind.ai',
        password: 'senha-errada1',
      })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.INVALID_CREDENTIALS,
    });

    expect(refreshCalls).toBe(0);
  });
});

describe('registration idempotency', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends the Idempotency-Key header', async () => {
    const post = jest.spyOn(api, 'post');

    const created = await useAuthStore.getState().register({
      name: 'Teste',
      email: 'novo.conta@exemplo.com',
      password: 'abc12345',
    });

    expect(created).toBe(true);
    expect(post).toHaveBeenCalledWith(
      '/auth/register',
      expect.objectContaining({ email: 'novo.conta@exemplo.com' }),
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(readIdempotencyKey(post.mock.calls[0][2])).toEqual(
      expect.any(String)
    );
  });

  it('reuses the same key when the registration is retried', async () => {
    const post = jest.spyOn(api, 'post');
    post.mockRejectedValueOnce({
      code: API_ERROR_CODES.NETWORK_ERROR,
      message: 'Sem conexão com o servidor.',
      fieldErrors: [],
      isNetworkError: true,
    });

    const first = await useAuthStore.getState().register({
      name: 'Teste',
      email: 'retry.conta@exemplo.com',
      password: 'abc12345',
    });
    const second = await useAuthStore.getState().register({
      name: 'Teste',
      email: 'retry.conta@exemplo.com',
      password: 'abc12345',
    });

    expect(first).toBe(false);
    expect(second).toBe(true);
    expect(readIdempotencyKey(post.mock.calls[0][2])).toBe(
      readIdempotencyKey(post.mock.calls[1][2])
    );
  });
});

describe('logout', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('revokes the refresh token on the server', async () => {
    const post = jest.spyOn(api, 'post');

    await saveAccessToken('access-1');
    await saveRefreshToken('refresh-1');

    await useAuthStore.getState().logout();

    expect(post).toHaveBeenCalledWith(
      '/auth/logout',
      { refreshToken: 'refresh-1' },
      expect.any(Object)
    );
    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('ends the local session even when the server call fails', async () => {
    const post = jest.spyOn(api, 'post');
    post.mockRejectedValueOnce(new Error('network down'));

    await saveAccessToken('access-1');
    await saveRefreshToken('refresh-1');

    await useAuthStore.getState().logout();

    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});
