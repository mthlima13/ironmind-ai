import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '../src/features/auth/auth.store';
import { createApiClient } from '../src/services/api';
import { loadOrCreateIdentity } from '../src/storage/identity';
import { API_ERROR_CODES } from '../src/types/api';
import type { AxiosAdapter } from 'axios';

/**
 * The local "session" of the app (SPEC 6.4 and 15.3).
 *
 * There is no server credential anymore: the identity of the installation is
 * a UUID generated once, sent on every call, and the onboarding flag lives
 * with the local profile. These tests pin the state machine of the store and
 * the identity header attached by the HTTP client.
 */

const DEFAULT_PREFERENCES = {
  preferredUnits: 'KG' as const,
  trainingExperience: 'BEGINNER' as const,
  goal: 'HYPERTROPHY' as const,
  availableEquipment: ['Barra'],
  trainingDays: 4,
  privacySettings: {
    publicProfile: false,
    showRecords: true,
    allowSharing: false,
  },
};

function headerOf(config: InternalAxiosRequestConfig): string {
  return String(config.headers.get('X-User-UUID') ?? '');
}

describe('auth store (local onboarding)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: 'booting',
      user: null,
      preferences: null,
      error: null,
      isSubmitting: false,
    });
  });

  it('starts without a profile and reaches authenticated state after the onboarding', async () => {
    const state = useAuthStore.getState();
    await state.hydrate();

    // The test database stores no profile, so the boot answers the same as a
    // brand new installation.
    expect(useAuthStore.getState().status).toBe('unauthenticated');

    await useAuthStore
      .getState()
      .completeOnboarding({ name: 'Alex Morgan', preferences: DEFAULT_PREFERENCES });

    const after = useAuthStore.getState();
    expect(after.status).toBe('authenticated');
    expect(after.user?.name).toBe('Alex Morgan');
    expect(after.preferences?.goal).toBe('HYPERTROPHY');
  });

  it('applies a partial patch to the local profile', async () => {
    await useAuthStore
      .getState()
      .completeOnboarding({ name: 'Alex Morgan', preferences: DEFAULT_PREFERENCES });

    await useAuthStore
      .getState()
      .updateProfile({ name: '  Novo Nome  ', preferences: { goal: 'STRENGTH' } });

    const state = useAuthStore.getState();
    expect(state.user?.name).toBe('Novo Nome');
    expect(state.preferences?.goal).toBe('STRENGTH');
    // Fields not sent keep their value.
    expect(state.preferences?.preferredUnits).toBe('KG');
    expect(state.preferences?.trainingDays).toBe(4);
  });

  it('wipes the local data and mints a fresh identity afterwards', async () => {
    await useAuthStore
      .getState()
      .completeOnboarding({ name: 'Alex Morgan', preferences: DEFAULT_PREFERENCES });

    const before = useAuthStore.getState().user?.id;
    expect(before).toBeTruthy();

    await useAuthStore.getState().resetLocalData();

    const after = useAuthStore.getState();
    expect(after.status).toBe('unauthenticated');
    expect(after.user).toBeNull();
    expect(after.preferences).toBeNull();

    // The identity module lost its cache: the next load is a new UUID, so the
    // private data of the previous scope is out of reach.
    const reloaded = await loadOrCreateIdentity();
    expect(reloaded).toBeTruthy();
    expect(reloaded).not.toBe(before);
  });
});

describe('identity header of the HTTP client', () => {
  it('attaches a canonical UUID to every private request', async () => {
    let seen = '';
    const adapter: AxiosAdapter = async (config) => {
      seen = headerOf(config);
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config,
        request: {},
      };
    };

    const instance = createApiClient({ useMock: false });
    instance.defaults.adapter = adapter;

    await instance.get('/programs');

    expect(seen).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('does not override an identity set by the caller', async () => {
    let seen = '';
    const adapter: AxiosAdapter = async (config) => {
      seen = headerOf(config);
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config,
        request: {},
      };
    };

    const instance = createApiClient({ useMock: false });
    instance.defaults.adapter = adapter;

    await instance.get('/programs', {
      headers: { 'X-User-UUID': '00000000-0000-4000-8000-000000000000' },
    });

    expect(seen).toBe('00000000-0000-4000-8000-000000000000');
  });

  it('normalizes a 401 failure without touching any credential', async () => {
    const adapter: AxiosAdapter = async (config) => {
      throw {
        isAxiosError: true,
        config,
        response: {
          data: {
            code: API_ERROR_CODES.UNAUTHENTICATED,
            message: 'Identidade ausente.',
            status: 401,
          },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
        },
      };
    };

    const instance = createApiClient({ useMock: false });
    instance.defaults.adapter = adapter;

    await expect(instance.get('/workout-sessions')).rejects.toMatchObject({
      code: API_ERROR_CODES.UNAUTHENTICATED,
      status: 401,
    });
  });
});
