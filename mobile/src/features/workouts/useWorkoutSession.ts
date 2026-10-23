import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AddSessionExerciseInput,
  ExerciseSet,
  PreviousSetValues,
  RegisterSetInput,
  SessionStatus,
  StartSessionInput,
  UpdateSetInput,
} from '../../types/workout';
import { createIdempotencyKey } from '../../utils/id';
import { deleteSet, updateSet } from '../sets/set.service';
import {
  addSessionExercise,
  completeSession,
  fetchLastSessionSets,
  fetchSessions,
  registerSet,
  startSession,
  updateSessionStatus,
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

/**
 * Set payload with an optional pre-generated idempotency key.
 *
 * The caller generates the key before the first attempt so the same key can be
 * reused if the request is retried through the offline queue (SPEC A.3).
 */
export type RegisterSetMutationInput = RegisterSetInput & {
  idempotencyKey?: string;
};

/** Registers a set inside a running session. */
export function useRegisterSet(sessionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: RegisterSetMutationInput[]) => {
      if (!sessionId) {
        throw new Error('No active session');
      }
      const created: ExerciseSet[] = [];
      for (const input of inputs) {
        created.push(
          await registerSet(
            sessionId,
            input,
            input.idempotencyKey ?? createIdempotencyKey()
          )
        );
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
    },
  });
}

/** Updates session status (pause/resume/abandon). */
export function useUpdateSessionStatus(sessionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ status, notes }: { status: SessionStatus; notes?: string | null }) => {
      if (!sessionId) {
        throw new Error('No active session');
      }
      return updateSessionStatus(sessionId, { status, notes });
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

/** Updates an existing set. */
export function useUpdateSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ setId, input }: { setId: string; input: UpdateSetInput }) =>
      updateSet(setId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/** Deletes an existing set. */
export function useDeleteSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (setId: string) => deleteSet(setId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
