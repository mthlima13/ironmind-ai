import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { API_BASE_URL, createApiClient, mapApiError } from '../src/services/api';
import { createMockAdapter } from '../src/services/mockAdapter';
import { API_ERROR_CODES } from '../src/types/api';

const IDENTITY_VALID = '11111111-2222-4333-8444-555555555555';
const IDENTITY_OTHER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const IDENTITY_MALFORMED = 'usr-0001';

/**
 * The mock backend must follow the delegated identity contract of the real
 * API (SPEC 11.1 and AUTH-INTEGRATION): the owner comes from the
 * `X-User-UUID` header, private endpoints answer `401` without it, and every
 * scope sees only its own data.
 */

/** Client without the identity interceptor: the header is chosen per test. */
function bareClient(): AxiosInstance {
  const instance = axios.create({ baseURL: API_BASE_URL });
  // Same failure normalization of the app client, without the identity one.
  instance.interceptors.response.use(
    undefined,
    (error) => Promise.reject(mapApiError(error))
  );
  instance.defaults.adapter = createMockAdapter();
  return instance;
}

/** The shared client of the app, which injects the identity by itself. */
function appClient(): AxiosInstance {
  return createApiClient({ useMock: true });
}

function identityOf(config: InternalAxiosRequestConfig): string {
  return String(config.headers.get('X-User-UUID') ?? '');
}

describe('mock identity header contract', () => {
  // One shared adapter: the scope of an identity lives for the whole suite,
  // exactly like the data store of a running backend.
  const bare = bareClient();

  it('answers 401 on a private endpoint without the header', async () => {
    await expect(bare.get('/programs')).rejects.toMatchObject({
      code: API_ERROR_CODES.UNAUTHENTICATED,
      status: 401,
    });
  });

  it('answers 401 on a private endpoint with a malformed header', async () => {
    await expect(
      bare.get('/programs', {
        headers: { 'X-User-UUID': IDENTITY_MALFORMED },
      })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.UNAUTHENTICATED,
      status: 401,
    });
  });

  it('serves the public catalogue without any identity', async () => {
    const response = await bare.get('/exercises');
    expect(response.status).toBe(200);
    expect(response.data.content.length).toBeGreaterThan(0);
  });

  it('injects the identity of the installation on the app client', async () => {
    const client = appClient();
    let seen = '';
    client.defaults.adapter = async (config) => {
      seen = identityOf(config);
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {},
      };
    };

    await client.get('/programs');

    expect(seen).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('keeps the data of one identity invisible to another', async () => {
    const created = await bare.post(
      '/programs',
      {
        name: 'Treino de Beta',
        goal: 'HYPERTROPHY',
        splitType: 'FULL_BODY',
        days: [
          {
            name: 'Dia A',
            exercises: [
              {
                exerciseId: 'ex-agachamento-livre-com-barra',
                targetSets: 3,
                targetRepsMin: 8,
                targetRepsMax: 12,
                restSeconds: 90,
              },
            ],
          },
        ],
      },
      { headers: { 'X-User-UUID': IDENTITY_OTHER } }
    );

    await expect(
      bare.get(`/programs/${created.data.id}`, {
        headers: { 'X-User-UUID': IDENTITY_VALID },
      })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.NOT_FOUND,
      status: 404,
    });

    const listOther = await bare.get('/programs', {
      headers: { 'X-User-UUID': IDENTITY_OTHER },
    });
    const listValid = await bare.get('/programs', {
      headers: { 'X-User-UUID': IDENTITY_VALID },
    });
    expect(listOther.data.content).toHaveLength(1);
    expect(listValid.data.content).toHaveLength(0);
  });

  it('replays the same idempotency key inside one scope only', async () => {
    const payload = {
      name: 'Treino idempotente',
      goal: 'GENERAL',
      splitType: 'FULL_BODY',
      days: [
        {
          name: 'Dia A',
          exercises: [
            {
              exerciseId: 'ex-agachamento-livre-com-barra',
              targetSets: 3,
              targetRepsMin: 8,
              targetRepsMax: 12,
              restSeconds: 90,
            },
          ],
        },
      ],
    };

    const first = await bare.post('/programs', payload, {
      headers: {
        'X-User-UUID': IDENTITY_VALID,
        'Idempotency-Key': 'key-isolated',
      },
    });
    const replay = await bare.post('/programs', payload, {
      headers: {
        'X-User-UUID': IDENTITY_VALID,
        'Idempotency-Key': 'key-isolated',
      },
    });

    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(replay.data.id).toBe(first.data.id);

    // The same key in another scope must not leak the record of the first
    // one: the other identity receives its own new program.
    const other = await bare.post('/programs', payload, {
      headers: {
        'X-User-UUID': IDENTITY_OTHER,
        'Idempotency-Key': 'key-isolated',
      },
    });
    expect(other.status).toBe(201);
    expect(other.data.id).not.toBe(first.data.id);

    // Record identifiers start at 1 in every scope, so the counts pin the
    // isolation instead of the identifiers themselves: the other scope keeps
    // its own programs, with the idempotent replay arriving at the top.
    const listValid = await bare.get('/programs', {
      headers: { 'X-User-UUID': IDENTITY_VALID },
    });
    const listOther = await bare.get('/programs', {
      headers: { 'X-User-UUID': IDENTITY_OTHER },
    });
    expect(listValid.data.content).toHaveLength(1);
    expect(listValid.data.content[0].name).toBe('Treino idempotente');
    expect(listOther.data.content).toHaveLength(2);
    expect(listOther.data.content[0].name).toBe('Treino idempotente');
  });

  it('refuses to reuse the same key with a different payload', async () => {
    const client = bareClient();
    const payload = {
      name: 'Treino com chave fixa',
      goal: 'GENERAL',
      splitType: 'FULL_BODY',
      days: [
        {
          name: 'Dia A',
          exercises: [
            {
              exerciseId: 'ex-agachamento-livre-com-barra',
              targetSets: 3,
              targetRepsMin: 8,
              targetRepsMax: 12,
              restSeconds: 90,
            },
          ],
        },
      ],
    };

    await client.post('/programs', payload, {
      headers: {
        'X-User-UUID': IDENTITY_VALID,
        'Idempotency-Key': 'key-conflict',
      },
    });

    const changed = { ...payload, name: 'Treino alterado' };
    await expect(
      client.post('/programs', changed, {
        headers: {
          'X-User-UUID': IDENTITY_VALID,
          'Idempotency-Key': 'key-conflict',
        },
      })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.IDEMPOTENCY_KEY_REUSED,
      status: 409,
    });
  });
});
