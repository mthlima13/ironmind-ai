import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AddSessionExerciseInput,
  ExerciseSet,
  PreviousSetValues,
  RegisterSetInput,
  StartSessionInput,
} from '../../types/workout';
import { createIdempotencyKey } from '../../utils/id';
import {
  addSessionExercise,
  completeSession,
  fetchLastSessionSets,
  fetchSessions,
  registerSet,
  startSession,
} from './workout.service';

export const workoutQueryKeys = {
  sessions: (page: number, size: number) => ['workout-sessions', page, size] as const,
  lastSets: (exerciseId: string) => ['workout-sessions', 'last-sets', exerciseId] as const,
};

/** Paginated history of the sessions performed by the user. */
export function useSessionHistory(page = 0, size = 20) {
  return useQuery({
    queryKey: workoutQueryKeys.sessions(page, size),
    queryFn: () => fetchSessions(page, size),
    staleTime: 30_000,
  });
}

/** Values of the last session for a given exercise (quick fill). */
export function useLastSessionSets(exerciseId: string | null) {
  return useQuery<PreviousSetValues[]>({
    queryKey: workoutQueryKeys.lastSets(exerciseId ?? ''),
    queryFn: () => fetchLastSessionSets(exerciseId as string),
    enabled: Boolean(exerciseId),
    staleTime: 5 * 60_000,
  });
}

/** Starts a session and puts it in the local store. */
export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StartSessionInput) => startSession(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
    },
  });
}

/**
 * Adds an exercise to the running session (SPEC RF-007).
 *
 * It is the only way to fill a free session: it starts without exercises and
 * the user adds them one by one while the workout happens.
 */
export function useAddSessionExercise(sessionId: string | null = null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddSessionExerciseInput) => {
      if (!sessionId) {
        throw new Error('No active session');
      }
      return addSessionExercise(sessionId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
    },
  });
}

/** Registers a set inside a running session. */
export function useRegisterSet(sessionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: RegisterSetInput[]) => {
      if (!sessionId) {
        throw new Error('No active session');
      }
      const created: ExerciseSet[] = [];
      for (const input of inputs) {
        created.push(await registerSet(sessionId, input, createIdempotencyKey()));
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
    },
  });
}

/** Finishes the running session. */
export function useCompleteSession(sessionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!sessionId) {
        throw new Error('No active session');
      }
      return completeSession(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
