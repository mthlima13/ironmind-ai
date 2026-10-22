import { api } from '../src/services/api';
import { MOCK_DEMO_EMAIL, MOCK_DEMO_PASSWORD } from '../src/services/mockAdapter';
import { saveAccessToken } from '../src/storage/secureToken';
import { API_ERROR_CODES, type AuthResponse } from '../src/types/api';
import type { SessionExercise, WorkoutSession } from '../src/types/workout';

/**
 * The mock backend must follow the same contract of the real API for the
 * session exercises (SPEC 7.8 and 11.4), otherwise the free workout breaks
 * while there is no server.
 */
describe('mock session exercise endpoint', () => {
  beforeAll(async () => {
    const login = await api.post<AuthResponse>('/auth/login', {
      email: MOCK_DEMO_EMAIL,
      password: MOCK_DEMO_PASSWORD,
    });
    await saveAccessToken(login.data.accessToken);
  });

  it('starts a free session without exercises', async () => {
    const session = await api.post<WorkoutSession>('/workout-sessions', {
      programId: null,
      programDayId: null,
    });

    expect(session.data.status).toBe('IN_PROGRESS');
    expect(session.data.exercises).toHaveLength(0);
  });

  it('adds an exercise of the catalogue to the session', async () => {
    const session = await api.post<WorkoutSession>('/workout-sessions', {
      programId: null,
      programDayId: null,
    });

    const created = await api.post<SessionExercise>(
      `/workout-sessions/${session.data.id}/exercises`,
      { exerciseId: 'ex-supino-reto', position: 1, notes: null }
    );

    expect(created.status).toBe(200);
    expect(created.data.exerciseId).toBe('ex-supino-reto');
    expect(created.data.exercise.name).toBe('Supino reto com barra');
    expect(created.data.position).toBe(1);
    expect(created.data.sets).toHaveLength(0);
  });

  it('refuses the same exercise twice in the same session', async () => {
    const session = await api.post<WorkoutSession>('/workout-sessions', {
      programId: null,
      programDayId: null,
    });

    await api.post(`/workout-sessions/${session.data.id}/exercises`, {
      exerciseId: 'ex-supino-reto',
      position: 1,
      notes: null,
    });

    await expect(
      api.post(`/workout-sessions/${session.data.id}/exercises`, {
        exerciseId: 'ex-supino-reto',
        position: 2,
        notes: null,
      })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.CONFLICT,
      status: 409,
    });
  });

  it('refuses an exercise that is not in the catalogue', async () => {
    const session = await api.post<WorkoutSession>('/workout-sessions', {
      programId: null,
      programDayId: null,
    });

    await expect(
      api.post(`/workout-sessions/${session.data.id}/exercises`, {
        exerciseId: 'ex-inexistente',
        position: 1,
        notes: null,
      })
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.VALIDATION_ERROR,
      status: 422,
    });
  });
});
