/**
 * Contract test between the mobile client and the real backend.
 *
 * Unlike the rest of the suite, this file talks to a running API instead of
 * the mock adapter: it exercises the production code path of
 * `src/services/api.ts` (axios client, bearer interceptor, error
 * normalization and automatic renewal) against the real server.
 *
 * The suite is opt-in. It only runs when `IT_API_URL` points to a reachable
 * API, so the default `npx jest` stays hermetic:
 *
 * ```bash
 * # backend running on http://localhost:8080
 * IT_API_URL=http://localhost:8080/api/v1 npx jest apiContract
 * ```
 *
 * Every account created here uses a unique e-mail, because the API enforces
 * a unique constraint on `users.email`.
 */
import type { ApiError, AuthResponse, FieldError } from '../src/types/api';
import type { UserProfile } from '../src/types/user';

const API_URL = process.env.IT_API_URL;

/* eslint-disable @typescript-eslint/no-require-imports */
function loadClient(): typeof import('../src/services/api')['api'] {
  // The environment has to be set before the module is loaded: the client
  // decides at import time whether it uses the mock adapter.
  process.env.EXPO_PUBLIC_USE_MOCK_API = 'false';
  process.env.EXPO_PUBLIC_API_URL = API_URL;
  return require('../src/services/api').api;
}

/* eslint-disable @typescript-eslint/no-require-imports */
function loadAuthService(): typeof import('../src/features/auth/auth.service') {
  process.env.EXPO_PUBLIC_USE_MOCK_API = 'false';
  process.env.EXPO_PUBLIC_API_URL = API_URL;
  return require('../src/features/auth/auth.service');
}

const describeIfApi = API_URL ? describe : describe.skip;

/**
 * Stores the session exactly like the application does after a login, so the
 * bearer interceptor finds the access token.
 */
async function persistSession(response: AuthResponse): Promise<void> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { saveAccessToken, saveRefreshToken } = require('../src/storage/secureToken');
  await saveAccessToken(response.accessToken);
  await saveRefreshToken(response.refreshToken);
}

if (!API_URL) {
  // eslint-disable-next-line no-console
  console.info(
    '[apiContract] pulado: defina IT_API_URL para rodar contra a API real.'
  );
}

describeIfApi('contrato com a API real', () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = `contrato-${suffix}@example.com`;
  const password = 'treino123';

  let api: ReturnType<typeof loadClient>;
  let authService: ReturnType<typeof loadAuthService>;
  let refreshToken = '';

  beforeAll(async () => {
    api = loadClient();
    authService = loadAuthService();

    const health = await api.get('/health');
    expect(health.status).toBe(200);
  });

  it('cadastra a conta e devolve os tokens', async () => {
    const response = await api.post<AuthResponse>(
      '/auth/register',
      { name: 'Contrato Mobile', email, password },
      { headers: { 'Idempotency-Key': `contract-${suffix}` } }
    );

    expect(response.status).toBe(201);
    expect(response.data.accessToken).toBeTruthy();
    expect(response.data.refreshToken).toBeTruthy();
    expect(response.data.user.email).toBe(email);

    refreshToken = response.data.refreshToken;
    await persistSession(response.data);
  });

  it('recusa senha fraca com o detalhe por campo', async () => {
    const error = await api
      .post('/auth/register', {
        name: 'Contrato Mobile',
        email: `fraca-${suffix}@example.com`,
        password: 'abc',
      })
      .then(() => null)
      .catch((caught: unknown) => caught as ApiError);

    expect(error).not.toBeNull();
    expect(error?.code).toBe('VALIDATION_ERROR');
    expect(
      error?.fieldErrors.some((field: FieldError) => field.field === 'password')
    ).toBe(true);
  });

  it('faz login e devolve o perfil aninhado', async () => {
    const login = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    expect(login.status).toBe(200);

    refreshToken = login.data.refreshToken;
    await persistSession(login.data);

    const profile = await api.get<UserProfile>('/users/me');
    expect(profile.status).toBe(200);
    expect(profile.data.user.email).toBe(email);
    expect(profile.data.preferences.preferredUnits).toBe('KG');
    expect(profile.data.preferences.privacySettings).toEqual({
      publicProfile: false,
      showRecords: true,
      allowSharing: false,
    });
    expect(Array.isArray(profile.data.preferences.availableEquipment)).toBe(true);
  });

  it('mescla a atualização parcial das preferências', async () => {
    const before = await api.get<UserProfile>('/users/me');
    const equipmentBefore = before.data.preferences.availableEquipment;

    const updated = await api.patch<UserProfile>('/users/me', {
      preferences: { goal: 'STRENGTH' },
    });

    expect(updated.status).toBe(200);
    expect(updated.data.preferences.goal).toBe('STRENGTH');
    // A field that was not sent keeps its value.
    expect(updated.data.preferences.availableEquipment).toEqual(
      equipmentBefore
    );
  });

  it('ignora um userId enviado no corpo', async () => {
    const updated = await api.patch<UserProfile>('/users/me', {
      userId: '11111111-2222-3333-4444-555555555555',
      name: 'Contrato Mobile',
    });

    expect(updated.status).toBe(200);
    expect(updated.data.user.email).toBe(email);
  });

  it('consulta o catálogo paginado', async () => {
    const page = await api.get<{
      content: { id: string; name: string }[];
      totalElements: number;
      totalPages: number;
    }>('/exercises?page=0&size=5');

    expect(page.status).toBe(200);
    expect(page.data.content.length).toBeGreaterThan(0);
    expect(page.data.totalElements).toBeGreaterThanOrEqual(40);
    expect(page.data.totalPages).toBeGreaterThan(1);
  });

  it('renova o token e rejeita o token antigo', async () => {
    const renewed = await api.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    });
    expect(renewed.status).toBe(200);
    expect(renewed.data.refreshToken).not.toBe(refreshToken);

    const reused = await api
      .post('/auth/refresh', { refreshToken })
      .then(() => null)
      .catch((caught: unknown) => caught as ApiError);

    expect(reused?.code).toBe('INVALID_REFRESH_TOKEN');

    // The whole family was revoked by the reuse detection.
    const familyRevoked = await api
      .post('/auth/refresh', { refreshToken: renewed.data.refreshToken })
      .then(() => null)
      .catch((caught: unknown) => caught as ApiError);

    expect(familyRevoked?.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('encerra a sessao no logout', async () => {
    const login = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });

    const logout = await api.post('/auth/logout', {
      refreshToken: login.data.refreshToken,
    });
    expect(logout.status).toBe(204);

    const afterLogout = await api
      .post('/auth/refresh', { refreshToken: login.data.refreshToken })
      .then(() => null)
      .catch((caught: unknown) => caught as ApiError);

    expect(afterLogout?.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('recusa requisição sem token', async () => {
    // The bearer interceptor attaches the stored token, so the credentials have
    // to be dropped before asking for a private endpoint.
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { clearTokens } = require('../src/storage/secureToken');
    await clearTokens();

    const anonymous = await api
      .get('/users/me')
      .then(() => null)
      .catch((caught: unknown) => caught as ApiError);

    expect(anonymous?.code).toBe('UNAUTHENTICATED');
  });

  it('expoe o mesmo servico de autenticacao do app', () => {
    expect(typeof authService.fetchProfile).toBe('function');
    expect(typeof authService.updateProfile).toBe('function');
  });
});
