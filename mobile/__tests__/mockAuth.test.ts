import { api } from '../src/services/api';
import { API_ERROR_CODES } from '../src/types/api';

/**
 * The mock backend must follow the same contract of the real API
 * (SPEC 11.1 and A.1), otherwise the app breaks while there is no server.
 */
describe('mock authentication endpoints', () => {
  it('creates the account and answers with the tokens', async () => {
    const response = await api.post(
      '/auth/register',
      {
        name: 'Teste',
        email: 'mock.conta@exemplo.com',
        password: 'abc12345',
      },
      { headers: { 'Idempotency-Key': 'key-create' } }
    );

    expect(response.status).toBe(201);
    expect(response.data.tokenType).toBe('Bearer');
    expect(response.data.accessToken).toEqual(expect.any(String));
    expect(response.data.refreshToken).toEqual(expect.any(String));
    expect(response.data.user.email).toBe('mock.conta@exemplo.com');
  });

  it('does not create the same account twice with the same key', async () => {
    const payload = {
      name: 'Teste',
      email: 'idempotente@exemplo.com',
      password: 'abc12345',
    };

    const first = await api.post('/auth/register', payload, {
      headers: { 'Idempotency-Key': 'key-idempotency' },
    });
    const second = await api.post('/auth/register', payload, {
      headers: { 'Idempotency-Key': 'key-idempotency' },
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.data.user.id).toBe(first.data.user.id);
  });

  it('refuses an e-mail that is already registered', async () => {
    const payload = {
      name: 'Teste',
      email: 'duplicado@exemplo.com',
      password: 'abc12345',
    };

    await api.post('/auth/register', payload);

    await expect(api.post('/auth/register', payload)).rejects.toMatchObject({
      code: API_ERROR_CODES.EMAIL_ALREADY_IN_USE,
      status: 409,
    });
  });

  it('logs in and refuses wrong credentials', async () => {
    const response = await api.post('/auth/login', {
      email: 'duplicado@exemplo.com',
      password: 'abc12345',
    });

    expect(response.status).toBe(200);
    expect(response.data.user.email).toBe('duplicado@exemplo.com');

    await expect(
      api.post('/auth/login', {
        email: 'duplicado@exemplo.com',
        password: 'senha-errada1',
      })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.INVALID_CREDENTIALS,
      status: 401,
    });
  });

  it('renews the session and invalidates the previous refresh token', async () => {
    const login = await api.post('/auth/login', {
      email: 'duplicado@exemplo.com',
      password: 'abc12345',
    });

    const renewed = await api.post('/auth/refresh', {
      refreshToken: login.data.refreshToken,
    });

    expect(renewed.status).toBe(200);
    expect(renewed.data.refreshToken).not.toBe(login.data.refreshToken);

    await expect(
      api.post('/auth/refresh', { refreshToken: login.data.refreshToken })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.INVALID_REFRESH_TOKEN,
      status: 401,
    });
  });

  it('revokes the refresh token on logout', async () => {
    const login = await api.post('/auth/login', {
      email: 'duplicado@exemplo.com',
      password: 'abc12345',
    });

    const logout = await api.post('/auth/logout', {
      refreshToken: login.data.refreshToken,
    });

    expect(logout.status).toBe(204);

    await expect(
      api.post('/auth/refresh', { refreshToken: login.data.refreshToken })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.INVALID_REFRESH_TOKEN,
      status: 401,
    });
  });

  it('always answers the same way on the recovery request', async () => {
    const known = await api.post('/auth/forgot-password', {
      email: 'duplicado@exemplo.com',
    });
    const unknown = await api.post('/auth/forgot-password', {
      email: 'nao.cadastrado@exemplo.com',
    });

    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(unknown.data).toEqual(known.data);
  });

  it('refuses a recovery token that does not exist', async () => {
    await expect(
      api.post('/auth/reset-password', {
        token: 'token-inexistente',
        newPassword: 'abc12345',
      })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.INVALID_RESET_TOKEN,
      status: 401,
    });
  });

  it('validates the new password with the rule of the API', async () => {
    await expect(
      api.post('/auth/reset-password', {
        token: 'token-inexistente',
        newPassword: 'abc',
      })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.VALIDATION_ERROR,
      status: 422,
    });
  });
});
