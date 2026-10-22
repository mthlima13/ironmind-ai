/**
 * Contract test of the Sprint 3 endpoints: programs, sessions and sets.
 *
 * It talks to a real backend, like `apiContract.integration.test.ts`, and is
 * opt-in through `IT_API_URL`.
 *
 * ```bash
 * IT_API_URL=http://localhost:8080/api/v1 npx jest workoutContract
 * ```
 */
import type { ApiError, AuthResponse } from '../src/types/api';
import type { Exercise } from '../src/types/exercise';
import type { UserProfile } from '../src/types/user';
import type { WorkoutProgram } from '../src/types/program';
import type { ExerciseSet, WorkoutSession } from '../src/types/workout';

const API_URL = process.env.IT_API_URL;

/* eslint-disable @typescript-eslint/no-require-imports */
function loadClient(): typeof import('../src/services/api')['api'] {
  process.env.EXPO_PUBLIC_USE_MOCK_API = 'false';
  process.env.EXPO_PUBLIC_API_URL = API_URL;
  return require('../src/services/api').api;
}

const describeIfApi = API_URL ? describe : describe.skip;

if (!API_URL) {
  // eslint-disable-next-line no-console
  console.info(
    '[workoutContract] pulado: defina IT_API_URL para rodar contra a API real.'
  );
}

describeIfApi('contrato de treinos com a API real', () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = `treino-${suffix}@example.com`;
  const password = 'treino123';

  let api: ReturnType<typeof loadClient>;
  let exerciseId = '';
  let firstAccessToken = '';
  let firstRefreshToken = '';

  beforeAll(async () => {
    api = loadClient();

    const register = await api.post<AuthResponse>('/auth/register', {
      name: 'Contrato Treinos',
      email,
      password,
    });
    expect(register.status).toBe(201);

    /* eslint-disable @typescript-eslint/no-require-imports */
    const { saveAccessToken, saveRefreshToken } = require('../src/storage/secureToken');
    firstAccessToken = register.data.accessToken;
    firstRefreshToken = register.data.refreshToken;
    await saveAccessToken(firstAccessToken);
    await saveRefreshToken(firstRefreshToken);

    const catalog = await api.get<{ content: Exercise[] }>(
      '/exercises?size=1'
    );
    expect(catalog.data.content.length).toBeGreaterThan(0);
    exerciseId = catalog.data.content[0].id;
  });

  it('cria um programa com dias e exercícios', async () => {
    const created = await api.post<WorkoutProgram>('/programs', {
      name: 'Push / Pull / Legs',
      description: 'Divisão de 3 dias',
      goal: 'HYPERTROPHY',
      splitType: 'PPL',
      days: [
        {
          name: 'Peito e tríceps',
          exercises: [
            {
              exerciseId,
              targetSets: 3,
              targetRepsMin: 8,
              targetRepsMax: 12,
              restSeconds: 120,
              notes: null,
            },
          ],
        },
      ],
    });

    expect(created.status).toBe(201);
    expect(created.data.name).toBe('Push / Pull / Legs');
    expect(created.data.days).toHaveLength(1);
    expect(created.data.days[0].position).toBe(1);
    expect(created.data.days[0].exercises[0].position).toBe(1);
    // The exercise comes embedded, exactly as the app expects it.
    expect(created.data.days[0].exercises[0].exercise.id).toBe(exerciseId);
    expect(created.data.days[0].exercises[0].targetSets).toBe(3);
  });

  it('recusa um exercício inexistente com o caminho do campo', async () => {
    const error = await api
      .post('/programs', {
        name: 'Programa inválido',
        goal: 'HYPERTROPHY',
        splitType: 'PPL',
        days: [
          {
            name: 'Dia',
            exercises: [
              {
                exerciseId: '11111111-1111-1111-1111-111111111111',
                targetSets: 3,
                targetRepsMin: 8,
                targetRepsMax: 12,
                restSeconds: 120,
              },
            ],
          },
        ],
      })
      .then(() => null)
      .catch((caught: unknown) => caught as ApiError);

    expect(error?.code).toBe('VALIDATION_ERROR');
    expect(
      error?.fieldErrors.some((field) => field.field.includes('exerciseId'))
    ).toBe(true);
  });

  it('lista apenas os programas do usuário', async () => {
    const page = await api.get<{ content: WorkoutProgram[]; totalElements: number }>(
      '/programs?page=0&size=20'
    );

    expect(page.status).toBe(200);
    expect(page.data.totalElements).toBe(1);
    expect(page.data.content[0].name).toBe('Push / Pull / Legs');
  });

  it('inicia a sessão, registra a série e finaliza', async () => {
    const session = await api.post<WorkoutSession>('/workout-sessions', {
      programId: null,
      programDayId: null,
    });
    expect(session.status).toBe(201);
    expect(session.data.status).toBe('IN_PROGRESS');

    const withExercise = await api.post<{
      id: string;
      exerciseId: string;
      position: number;
      sets: ExerciseSet[];
    }>(`/workout-sessions/${session.data.id}/exercises`, {
      exerciseId,
      position: 1,
      notes: null,
    });
    expect(withExercise.status).toBe(201);
    expect(withExercise.data.exerciseId).toBe(exerciseId);

    const key = `set-${suffix}`;
    const set = await api.post<ExerciseSet>(
      `/workout-sessions/${session.data.id}/sets`,
      {
        sessionExerciseId: withExercise.data.id,
        weightKg: 80,
        repetitions: 10,
        perceivedExertion: 8,
        restAfterSeconds: 90,
      },
      { headers: { 'Idempotency-Key': key } }
    );
    expect(set.status).toBe(201);
    expect(set.data.setNumber).toBe(1);
    expect(set.data.weightKg).toBe(80);

    // The same key with the same body returns the same set.
    const replay = await api.post<ExerciseSet>(
      `/workout-sessions/${session.data.id}/sets`,
      {
        sessionExerciseId: withExercise.data.id,
        weightKg: 80,
        repetitions: 10,
        perceivedExertion: 8,
        restAfterSeconds: 90,
      },
      { headers: { 'Idempotency-Key': key } }
    );
    expect(replay.status).toBe(200);
    expect(replay.data.id).toBe(set.data.id);

    const completed = await api.post<WorkoutSession>(
      `/workout-sessions/${session.data.id}/complete`,
      {}
    );
    expect(completed.status).toBe(200);
    expect(completed.data.status).toBe('COMPLETED');
    expect(completed.data.completedAt).toBeTruthy();

    // A finished session is immutable.
    const rejected = await api
      .post(`/workout-sessions/${session.data.id}/sets`, {
        sessionExerciseId: withExercise.data.id,
        weightKg: 80,
        repetitions: 10,
      })
      .then(() => null)
      .catch((caught: unknown) => caught as ApiError);
    expect(rejected?.code).toBe('CONFLICT');
  });

  it('consulta o histórico com a sessão concluída', async () => {
    const history = await api.get<{
      content: WorkoutSession[];
      totalElements: number;
    }>('/workout-sessions?page=0&size=20');

    expect(history.status).toBe(200);
    expect(history.data.totalElements).toBe(1);
    expect(history.data.content[0].status).toBe('COMPLETED');
    expect(history.data.content[0].exercises[0].sets).toHaveLength(1);
  });

  it('não devolve a sessão de outro usuário', async () => {
    const other = await api.post<AuthResponse>('/auth/register', {
      name: 'Outro Atleta',
      email: `outro-${suffix}@example.com`,
      password,
    });
    expect(other.status).toBe(201);

    // The bearer interceptor always attaches the token of the secure store,
    // so the other account has to take its place there.
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { saveAccessToken, saveRefreshToken } = require('../src/storage/secureToken');
    await saveAccessToken(other.data.accessToken);
    await saveRefreshToken(other.data.refreshToken);

    const history = await api.get<{ content: WorkoutSession[] }>(
      '/workout-sessions?page=0&size=20'
    );
    expect(history.status).toBe(200);
    expect(history.data.content).toHaveLength(0);

    const programs = await api.get<{ content: WorkoutProgram[] }>(
      '/programs?page=0&size=20'
    );
    expect(programs.data.content).toHaveLength(0);
  });

  it('mantém o perfil acessível depois das sessões', async () => {
    // Restores the session of the first account, replaced by the other one.
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { saveAccessToken, saveRefreshToken } = require('../src/storage/secureToken');
    await saveAccessToken(firstAccessToken);
    await saveRefreshToken(firstRefreshToken);

    const profile = await api.get<UserProfile>('/users/me');
    expect(profile.status).toBe(200);
    expect(profile.data.user.email).toBe(email);
  });
});
