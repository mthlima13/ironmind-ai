import { api } from '../src/services/api';
import { MOCK_DEMO_EMAIL, MOCK_DEMO_PASSWORD } from '../src/services/mockAdapter';
import { saveAccessToken } from '../src/storage/secureToken';
import { API_ERROR_CODES, type AuthResponse, type Page } from '../src/types/api';
import { MUSCLE_GROUPS, type Exercise } from '../src/types/exercise';
import type { WorkoutProgram } from '../src/types/program';
import type {
  ExerciseSet,
  SessionExercise,
  WorkoutSession,
} from '../src/types/workout';

/**
 * The mock backend must follow the real API contract for the operations wired
 * in Sprint 6: session state, set corrections, personal exercises and program
 * replacement (SPEC 7.8, RF-003 and RF-005).
 */
describe('mock session controls', () => {
  beforeAll(async () => {
    const login = await api.post<AuthResponse>('/auth/login', {
      email: MOCK_DEMO_EMAIL,
      password: MOCK_DEMO_PASSWORD,
    });
    await saveAccessToken(login.data.accessToken);
  });

  const startFreeSession = async () =>
    (await api.post<WorkoutSession>('/workout-sessions', {
      programId: null,
      programDayId: null,
    })).data;

  const addExercise = async (sessionId: string) =>
    (await api.post<SessionExercise>(
      `/workout-sessions/${sessionId}/exercises`,
      { exerciseId: 'ex-supino-reto', position: 1, notes: null }
    )).data;

  const registerSet = async (sessionId: string, sessionExerciseId: string) =>
    (await api.post<ExerciseSet>(`/workout-sessions/${sessionId}/sets`, {
      sessionExerciseId,
      weightKg: 40,
      repetitions: 10,
      perceivedExertion: null,
      restAfterSeconds: null,
    })).data;

  it('pauses, resumes and abandons a running session', async () => {
    const session = await startFreeSession();

    const paused = await api.patch<WorkoutSession>(
      `/workout-sessions/${session.id}`,
      { status: 'PAUSED', notes: null }
    );
    expect(paused.data.status).toBe('PAUSED');

    const resumed = await api.patch<WorkoutSession>(
      `/workout-sessions/${session.id}`,
      { status: 'IN_PROGRESS', notes: null }
    );
    expect(resumed.data.status).toBe('IN_PROGRESS');

    const abandoned = await api.patch<WorkoutSession>(
      `/workout-sessions/${session.id}`,
      { status: 'ABANDONED', notes: null }
    );
    expect(abandoned.data.status).toBe('ABANDONED');

    // A finalized session is immutable (SPEC 7.8).
    await expect(
      api.post(`/workout-sessions/${session.id}/complete`, {})
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.CONFLICT,
      status: 409,
    });
    await expect(
      api.patch(`/workout-sessions/${session.id}`, {
        status: 'IN_PROGRESS',
        notes: null,
      })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.CONFLICT,
      status: 409,
    });
  });

  it('refuses a state change after the session is completed', async () => {
    const session = await startFreeSession();
    await api.post(`/workout-sessions/${session.id}/complete`, {});

    await expect(
      api.patch(`/workout-sessions/${session.id}`, {
        status: 'PAUSED',
        notes: null,
      })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.CONFLICT,
      status: 409,
    });
  });

  it('corrects a set and clears the load with an explicit null', async () => {
    const session = await startFreeSession();
    const exercise = await addExercise(session.id);
    const set = await registerSet(session.id, exercise.id);

    const corrected = await api.patch<ExerciseSet>(`/sets/${set.id}`, {
      weightKg: 45,
      repetitions: 8,
    });
    expect(corrected.data.weightKg).toBe(45);
    expect(corrected.data.repetitions).toBe(8);
    expect(corrected.data.setNumber).toBe(set.setNumber);

    const bodyweight = await api.patch<ExerciseSet>(`/sets/${set.id}`, {
      weightKg: null,
    });
    expect(bodyweight.data.weightKg).toBeNull();
    expect(bodyweight.data.repetitions).toBe(8);
  });

  it('removes a set from the running session', async () => {
    const session = await startFreeSession();
    const exercise = await addExercise(session.id);
    const set = await registerSet(session.id, exercise.id);

    await api.delete(`/sets/${set.id}`);

    const reloaded = await api.get<WorkoutSession>(
      `/workout-sessions/${session.id}`
    );
    expect(reloaded.data.exercises[0]?.sets).toHaveLength(0);
    await expect(api.delete(`/sets/${set.id}`)).rejects.toMatchObject({
      code: API_ERROR_CODES.NOT_FOUND,
      status: 404,
    });
  });

  it('creates a personal exercise and uses it in a programme', async () => {
    const created = await api.post<Exercise>('/exercises', {
      name: 'Remada máquina unilateral',
      description: 'Execução controlada',
      primaryMuscleGroup: MUSCLE_GROUPS.BACK,
      equipment: 'Máquina',
      movementType: 'ISOLATION',
    });

    expect(created.status).toBe(201);
    expect(created.data.isSystem).toBe(false);

    const catalogue = await api.get<Page<Exercise>>('/exercises', {
      params: { search: 'Remada máquina unilateral' },
    });
    expect(catalogue.data.content.map((item) => item.id)).toContain(
      created.data.id
    );

    // The filter uses the same label stored by the real backend (SPEC 10.3).
    const filtered = await api.get<Page<Exercise>>('/exercises', {
      params: { muscleGroup: MUSCLE_GROUPS.BACK },
    });
    expect(filtered.data.content.map((item) => item.id)).toContain(
      created.data.id
    );

    const program = await api.post<WorkoutProgram>('/programs', {
      name: 'Programa personalizado',
      description: 'Um dia',
      goal: 'HYPERTROPHY',
      splitType: 'CUSTOM',
      days: [
        {
          name: 'Costas',
          exercises: [
            {
              exerciseId: created.data.id,
              targetSets: 3,
              targetRepsMin: 8,
              targetRepsMax: 12,
              restSeconds: 90,
            },
          ],
        },
      ],
    });
    expect(program.status).toBe(201);
    expect(program.data.days[0]?.exercises[0]?.exerciseId).toBe(
      created.data.id
    );
  });

  it('replaces the structure of a programme', async () => {
    const created = await api.post<WorkoutProgram>('/programs', {
      name: 'Programa original',
      description: 'Antes',
      goal: 'HYPERTROPHY',
      splitType: 'CUSTOM',
      days: [
        {
          name: 'Dia A',
          exercises: [
            {
              exerciseId: 'ex-supino-reto',
              targetSets: 3,
              targetRepsMin: 8,
              targetRepsMax: 12,
              restSeconds: 90,
            },
          ],
        },
      ],
    });

    const updated = await api.put<WorkoutProgram>(
      `/programs/${created.data.id}`,
      {
        name: 'Programa revisado',
        description: 'Depois',
        goal: 'STRENGTH',
        splitType: 'CUSTOM',
        days: [
          {
            name: 'Dia A revisado',
            exercises: [
              {
                exerciseId: 'ex-supino-reto',
                targetSets: 5,
                targetRepsMin: 3,
                targetRepsMax: 5,
                restSeconds: 120,
              },
            ],
          },
        ],
      }
    );

    expect(updated.data.name).toBe('Programa revisado');
    expect(updated.data.days).toHaveLength(1);
    expect(updated.data.days[0]?.name).toBe('Dia A revisado');
    expect(updated.data.days[0]?.exercises[0]?.targetSets).toBe(5);

    const reloaded = await api.get<WorkoutProgram>(
      `/programs/${created.data.id}`
    );
    expect(reloaded.data.days[0]?.exercises[0]?.restSeconds).toBe(120);
  });
});
