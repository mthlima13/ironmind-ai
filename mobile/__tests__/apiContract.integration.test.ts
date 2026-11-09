/**
 * Contract test between the mobile client and the real backend.
 *
 * Unlike the rest of the suite, this file talks to a running API instead of
 * the mock adapter: it exercises the production code path of
 * `src/services/api.ts` (axios client, identity interceptor and error
 * normalization) against the real server.
 *
 * The suite is opt-in. It only runs when `IT_API_URL` points to a reachable
 * API, so the default `npx jest` stays hermetic:
 *
 * ```bash
 * # backend running on http://localhost:8080
 * IT_API_URL=http://localhost:8080/api/v1 npx jest apiContract
 * ```
 */
import axios from 'axios';

import type { Page } from '../src/types/api';
import type { WorkoutProgram } from '../src/types/program';

const API_URL = process.env.IT_API_URL;

/* eslint-disable @typescript-eslint/no-require-imports */
function loadClient(): typeof import('../src/services/api')['api'] {
  // The environment has to be set before the module is loaded: the client
  // decides at import time whether it uses the mock adapter.
  process.env.EXPO_PUBLIC_USE_MOCK_API = 'false';
  process.env.EXPO_PUBLIC_API_URL = API_URL;
  return require('../src/services/api').api;
}

const describeIfApi = API_URL ? describe : describe.skip;

if (!API_URL) {
  // eslint-disable-next-line no-console
  console.info(
    '[apiContract] pulado: defina IT_API_URL para rodar contra a API real.'
  );
}

describeIfApi('contrato com a API real', () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  let api: ReturnType<typeof loadClient>;

  beforeAll(async () => {
    api = loadClient();

    const health = await api.get('/health');
    expect(health.status).toBe(200);
  });

  it('consulta o catálogo paginado sem identidade', async () => {
    const page = await api.get<{
      content: { id: string; name: string }[];
      totalElements: number;
      totalPages: number;
    }>('/exercises?page=0&size=5');

    expect(page.status).toBe(200);
    expect(page.data.content.length).toBeGreaterThan(0);
    expect(page.data.totalElements).toBeGreaterThanOrEqual(40);
  });

  it('recusa recurso privado sem o header de identidade', async () => {
    // Plain axios without the instance interceptor: no `X-User-UUID` travels.
    const anonymous = await axios
      .get(`${API_URL}/programs`)
      .then(() => null)
      .catch((caught: unknown) => {
        const response = axios.isAxiosError(caught)
          ? caught.response
          : undefined;
        return response ?? null;
      });

    expect(anonymous?.status).toBe(401);
  });

  it('cria um programa dentro do escopo do UUID e devolve o mesmo registro na repetição da chave', async () => {
    const identity = `11111111-1111-4111-8111-${suffix.replace(/\D/g, '').slice(0, 12).padStart(12, '0')}`;

    // The catalogue is system-wide: the first exercise is a legal reference.
    const catalogue = await api.get<{ content: { id: string }[] }>(
      '/exercises?page=0&size=1'
    );
    const exerciseId = catalogue.data.content[0]?.id;
    expect(exerciseId).toBeTruthy();

    const programBody = {
      name: 'Contrato Mobile',
      description: 'Criado pelo teste de contrato.',
      goal: 'GENERAL',
      splitType: 'FULL_BODY',
      days: [
        {
          name: 'Dia A',
          exercises: [
            {
              exerciseId: exerciseId as string,
              targetSets: 3,
              targetRepsMin: 8,
              targetRepsMax: 12,
              restSeconds: 90,
            },
          ],
        },
      ],
    };

    const created = await api.post<WorkoutProgram>('/programs', programBody, {
      headers: {
        'X-User-UUID': identity,
        'Idempotency-Key': `contract-${suffix}`,
      },
    });
    expect(created.status).toBe(201);
    expect(created.data.id).toBeTruthy();

    const replay = await api.post<WorkoutProgram>('/programs', programBody, {
      headers: {
        'X-User-UUID': identity,
        'Idempotency-Key': `contract-${suffix}`,
      },
    });
    expect(replay.status).toBe(200);
    expect(replay.data.id).toBe(created.data.id);

    const list = await api.get<Page<WorkoutProgram>>('/programs', {
      headers: { 'X-User-UUID': identity },
    });
    expect(list.data.content.some((item) => item.id === created.data.id)).toBe(
      true
    );
  });
});
