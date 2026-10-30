/**
 * Durability of the session in progress (SPEC 16.5).
 *
 * The progress marked during the workout must survive navigation and an app
 * restart, but a finished session must never come back from the draft.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useSessionPersistence } from '../src/hooks/useSessionPersistence';
import { useSessionStore } from '../src/features/workouts/session.store';
import type { Exercise } from '../src/types/exercise';
import type { SessionExercise, WorkoutSession } from '../src/types/workout';

jest.mock('../src/storage/offlineQueue', () => ({
  clearSessionDraft: jest.fn(async () => undefined),
  loadSessionDraft: jest.fn(async () => null),
  saveSessionDraft: jest.fn(async () => undefined),
}));

const offlineQueue = jest.requireMock<
  typeof import('../src/storage/offlineQueue')
>('../src/storage/offlineQueue');

const exercise: Exercise = {
  id: 'ex-supino-reto',
  name: 'Supino reto com barra',
  description: 'Movimento compound para peitoral, tríceps e deltoide anterior.',
  primaryMuscleGroup: 'Peito',
  secondaryMuscleGroups: ['Tríceps', 'Ombros'],
  equipment: 'Barra',
  instructions: 'Deitado no banco, desça a barra até o peito e empurre.',
  movementType: 'COMPOUND',
  isSystem: true,
};

const sessionExercise: SessionExercise = {
  id: 'sex-1',
  exerciseId: exercise.id,
  exercise,
  position: 1,
  completedAt: '2026-02-01T12:10:00.000Z',
  sets: [
    {
      id: 'set-1',
      setNumber: 1,
      weightKg: 80,
      repetitions: 10,
      completedAt: '2026-02-01T12:05:00.000Z',
    },
  ],
};

function createSession(): WorkoutSession {
  return {
    id: 'session-1',
    programId: null,
    programDayId: null,
    startedAt: '2026-02-01T12:00:00.000Z',
    completedAt: null,
    status: 'IN_PROGRESS',
    exercises: [sessionExercise],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.setState({
    session: null,
    pendingCount: 0,
    failedCount: 0,
    isOffline: false,
  });
});

afterEach(() => {
  useSessionStore.setState({
    session: null,
    pendingCount: 0,
    failedCount: 0,
    isOffline: false,
  });
});

describe('useSessionPersistence', () => {
  it('restores the running draft with the marked exercises and their sets', async () => {
    const draft = createSession();
    jest.mocked(offlineQueue.loadSessionDraft).mockResolvedValue(draft);

    const { unmount } = await renderHook(() => useSessionPersistence(true));

    await waitFor(() => {
      expect(useSessionStore.getState().session).toEqual(draft);
    });
    expect(
      useSessionStore.getState().session?.exercises[0]?.completedAt
    ).toBe('2026-02-01T12:10:00.000Z');
    expect(useSessionStore.getState().session?.exercises[0]?.sets).toHaveLength(1);
    expect(offlineQueue.clearSessionDraft).not.toHaveBeenCalled();

    unmount();
  });

  it('discards a draft of a session that already ended', async () => {
    jest.mocked(offlineQueue.loadSessionDraft).mockResolvedValue({
      ...createSession(),
      status: 'COMPLETED',
      completedAt: '2026-02-01T12:30:00.000Z',
    });

    const { unmount } = await renderHook(() => useSessionPersistence(true));

    await waitFor(() => {
      expect(offlineQueue.clearSessionDraft).toHaveBeenCalled();
    });
    expect(useSessionStore.getState().session).toBeNull();

    unmount();
  });

  it('saves the session again when an exercise is marked as done', async () => {
    useSessionStore.setState({ session: createSession() });

    const { unmount } = await renderHook(() => useSessionPersistence(true));

    await waitFor(() => {
      expect(offlineQueue.saveSessionDraft).toHaveBeenCalled();
    });
    jest.mocked(offlineQueue.saveSessionDraft).mockClear();

    act(() => {
      useSessionStore.getState().setExerciseCompleted('sex-1', false);
    });

    await waitFor(() => {
      expect(offlineQueue.saveSessionDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          exercises: [
            expect.objectContaining({
              id: 'sex-1',
              completedAt: null,
              sets: sessionExercise.sets,
            }),
          ],
        })
      );
    });

    unmount();
  });

  it('does not touch the draft before authentication is ready', async () => {
    jest.mocked(offlineQueue.loadSessionDraft).mockResolvedValue(createSession());

    const { unmount } = await renderHook(() => useSessionPersistence(false));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(offlineQueue.loadSessionDraft).not.toHaveBeenCalled();
    expect(useSessionStore.getState().session).toBeNull();

    unmount();
  });
});
