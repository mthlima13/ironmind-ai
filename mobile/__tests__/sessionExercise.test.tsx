/**
 * Free workout flow: adding an exercise to the running session
 * (SPEC RF-007 and 7.8).
 */
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { AxiosResponse } from 'axios';

import { api } from '../src/services/api';
import { useSessionStore } from '../src/features/workouts/session.store';
import { useAddSessionExercise } from '../src/features/workouts/useWorkoutSession';
import { addSessionExercise } from '../src/features/workouts/workout.service';
import type { Exercise } from '../src/types/exercise';
import type { SessionExercise, WorkoutSession } from '../src/types/workout';

const exercise: Exercise = {
  id: 'ex-supino-reto',
  name: 'Supino reto com barra',
  description: 'Movimento compound para peitoral, tríceps e deltoide anterior.',
  primaryMuscleGroup: 'CHEST',
  secondaryMuscleGroups: ['ARMS', 'SHOULDERS'],
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
  sets: [],
};

function createSession(exercises: SessionExercise[] = []): WorkoutSession {
  return {
    id: 'session-1',
    programId: null,
    programDayId: null,
    startedAt: '2026-02-01T12:00:00.000Z',
    completedAt: null,
    status: 'IN_PROGRESS',
    exercises,
  };
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

/** Waits for the notification of the query client inside the act scope. */
function flushNotifications(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('addSessionExercise', () => {
  it('posts the exercise in the session endpoint and returns it', async () => {
    const postSpy = jest.spyOn(api, 'post').mockResolvedValue({
      data: sessionExercise,
    } as AxiosResponse<SessionExercise>);

    const created = await addSessionExercise('session-1', {
      exerciseId: exercise.id,
      position: 1,
      notes: null,
    });

    expect(postSpy).toHaveBeenCalledWith('/workout-sessions/session-1/exercises', {
      exerciseId: exercise.id,
      position: 1,
      notes: null,
    });
    expect(created).toEqual(sessionExercise);
  });

  it('sends the notes as null when they are not informed', async () => {
    const postSpy = jest.spyOn(api, 'post').mockResolvedValue({
      data: sessionExercise,
    } as AxiosResponse<SessionExercise>);

    await addSessionExercise('session-1', {
      exerciseId: exercise.id,
      position: 2,
    });

    expect(postSpy).toHaveBeenCalledWith('/workout-sessions/session-1/exercises', {
      exerciseId: exercise.id,
      position: 2,
      notes: null,
    });
  });
});

describe('session store', () => {
  beforeEach(() => {
    useSessionStore.setState({
      session: createSession(),
      pendingCount: 0,
      failedCount: 0,
      isOffline: false,
    });
  });

  it('keeps the exercise added during the workout inside the running session', () => {
    useSessionStore.getState().addExercise(sessionExercise);

    const session = useSessionStore.getState().session;
    expect(session?.exercises).toHaveLength(1);
    expect(session?.exercises[0]?.id).toBe('sex-1');
    expect(session?.exercises[0]?.exerciseId).toBe(exercise.id);
  });

  it('keeps the exercises ordered by position', () => {
    useSessionStore.getState().addExercise(sessionExercise);
    useSessionStore.getState().addExercise({
      ...sessionExercise,
      id: 'sex-2',
      position: 2,
    });

    expect(
      useSessionStore.getState().session?.exercises.map((item) => item.id)
    ).toEqual(['sex-1', 'sex-2']);
  });

  it('does nothing when there is no running session', () => {
    useSessionStore.setState({ session: null });

    useSessionStore.getState().addExercise(sessionExercise);

    expect(useSessionStore.getState().session).toBeNull();
  });
});

describe('useAddSessionExercise', () => {
  it('adds the exercise to the running session and refreshes the sessions', async () => {
    const postSpy = jest.spyOn(api, 'post').mockResolvedValue({
      data: sessionExercise,
    } as AxiosResponse<SessionExercise>);

    const queryClient = createQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = await renderHook(() => useAddSessionExercise('session-1'), {
      wrapper,
    });

    let created: SessionExercise | undefined;
    await act(async () => {
      created = await result.current.mutateAsync({
        exerciseId: exercise.id,
        position: 1,
        notes: null,
      });
      await flushNotifications();
    });

    expect(created).toEqual(sessionExercise);
    expect(postSpy).toHaveBeenCalledWith('/workout-sessions/session-1/exercises', {
      exerciseId: exercise.id,
      position: 1,
      notes: null,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['workout-sessions'] });
  });

  it('refuses to add an exercise without a running session', async () => {
    const postSpy = jest.spyOn(api, 'post');

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = await renderHook(() => useAddSessionExercise(null), {
      wrapper,
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ exerciseId: exercise.id, position: 1 })
      ).rejects.toThrow('No active session');
      await flushNotifications();
    });

    expect(postSpy).not.toHaveBeenCalled();
  });
});
