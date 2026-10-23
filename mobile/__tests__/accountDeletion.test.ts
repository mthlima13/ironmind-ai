import { useAuthStore } from '../src/features/auth/auth.store';
import { MOCK_USER_PROFILE } from '../src/mocks/user';
import { api, createApiClient } from '../src/services/api';
import { MOCK_DEMO_PASSWORD } from '../src/services/mockAdapter';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from '../src/storage/secureToken';
import { API_ERROR_CODES } from '../src/types/api';

/**
 * The deletion of the account is demanded by Google Play for every app that
 * creates an account (SPEC 14.3). These tests cover the mock contract and the
 * store behaviour without a server.
 */
describe('account deletion against the mock backend', () => {
  const credentials = {
    email: MOCK_USER_PROFILE.user.email,
    password: MOCK_DEMO_PASSWORD,
  };

  async function signIn() {
    const client = createApiClient({ useMock: true });
    const response = await client.post('/auth/login', credentials);
    return {
      client,
      headers: { Authorization: `Bearer ${response.data.accessToken}` },
    };
  }

  it('keeps the account when the password is wrong', async () => {
    const { client, headers } = await signIn();

    await expect(
      client.delete('/users/me', {
        headers,
        data: { password: 'senha-errada1' },
      })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.VALIDATION_ERROR,
      status: 422,
      fieldErrors: [{ field: 'password', message: 'Senha incorreta.' }],
    });

    // The session and the data remain available.
    const profile = await client.get('/users/me', { headers });
    expect(profile.status).toBe(200);
    expect(profile.data.user.email).toBe(credentials.email);
  });

  it('deletes the account and refuses the old credentials', async () => {
    const { client, headers } = await signIn();

    const deleted = await client.delete('/users/me', {
      headers,
      data: { password: credentials.password },
    });
    expect(deleted.status).toBe(204);

    // The access token and the refresh token of the deleted account are gone.
    await expect(client.get('/users/me', { headers })).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      client.post('/auth/login', credentials)
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.INVALID_CREDENTIALS,
      status: 401,
    });
  });

  it('frees the e-mail so a new account can use it', async () => {
    const { client, headers } = await signIn();

    await client.delete('/users/me', {
      headers,
      data: { password: credentials.password },
    });

    const created = await client.post('/auth/register', {
      name: 'Alex de novo',
      email: credentials.email,
      password: 'outraSenha1',
    });

    expect(created.status).toBe(201);
    expect(created.data.user.email).toBe(credentials.email);
  });
});

describe('account deletion in the auth store', () => {
  beforeEach(async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'usr-0001',
        name: 'Alex Morgan',
        email: MOCK_USER_PROFILE.user.email,
        role: 'USER',
      },
      error: null,
      isSubmitting: false,
    });
    await saveAccessToken('access-1');
    await saveRefreshToken('refresh-1');
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    useAuthStore.setState({
      status: 'booting',
      user: null,
      error: null,
      isSubmitting: false,
    });
    await clearTokens();
  });

  it('sends the password and ends the local session on success', async () => {
    const remove = jest.spyOn(api, 'delete').mockResolvedValue({
      data: null,
      status: 204,
      statusText: 'No Content',
      headers: {},
      config: {},
    } as never);

    const deleted = await useAuthStore.getState().deleteAccount('senha1234');

    expect(deleted).toBe(true);
    expect(remove).toHaveBeenCalledWith('/users/me', {
      data: { password: 'senha1234' },
    });
    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('keeps the session and exposes the field error when the password is wrong', async () => {
    jest.spyOn(api, 'delete').mockRejectedValueOnce({
      code: API_ERROR_CODES.VALIDATION_ERROR,
      message: 'Não foi possível excluir a conta.',
      status: 422,
      fieldErrors: [{ field: 'password', message: 'Senha incorreta.' }],
      isNetworkError: false,
    });

    const deleted = await useAuthStore.getState().deleteAccount('errada123');

    expect(deleted).toBe(false);
    expect(await getAccessToken()).toBe('access-1');
    expect(await getRefreshToken()).toBe('refresh-1');
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().error?.fieldErrors).toEqual([
      { field: 'password', message: 'Senha incorreta.' },
    ]);
  });
});
