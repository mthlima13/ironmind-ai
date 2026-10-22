import { create } from 'zustand';

import type { ExerciseSet, SessionExercise, WorkoutSession } from '../../types/workout';

export type SessionSyncState = 'synced' | 'pending' | 'offline';

type SessionState = {
  /** The workout session currently in progress, if any. */
  session: WorkoutSession | null;
  /** Number of write operations waiting to be synchronized. */
  pendingCount: number;
  /** True when the last request failed because of connectivity. */
  isOffline: boolean;
  setSession: (session: WorkoutSession | null) => void;
  setPendingCount: (count: number) => void;
  setOffline: (isOffline: boolean) => void;
  addSet: (sessionExerciseId: string, set: ExerciseSet) => void;
  /** Keeps an exercise added during the workout inside the running session. */
  addExercise: (sessionExercise: SessionExercise) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>()((set) => ({
  session: null,
  pendingCount: 0,
  isOffline: false,
  setSession: (session) => set({ session }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setOffline: (isOffline) => set({ isOffline }),
  addSet: (sessionExerciseId, exerciseSet) =>
    set((state) => {
      if (!state.session) {
        return state;
      }
      return {
        session: {
          ...state.session,
          exercises: state.session.exercises.map((sessionExercise) =>
            sessionExercise.id === sessionExerciseId
              ? { ...sessionExercise, sets: [...sessionExercise.sets, exerciseSet] }
              : sessionExercise
          ),
        },
      };
    }),
  addExercise: (sessionExercise) =>
    set((state) => {
      if (!state.session) {
        return state;
      }
      return {
        session: {
          ...state.session,
          // The position defines the execution order (SPEC 7.8).
          exercises: [...state.session.exercises, sessionExercise].sort(
            (first, second) => first.position - second.position
          ),
        },
      };
    }),
  clearSession: () => set({ session: null, pendingCount: 0 }),
}));

/** True while a session is running and was not finished nor abandoned. */
export function selectHasActiveSession(state: SessionState): boolean {
  const status = state.session?.status;
  return status === 'IN_PROGRESS' || status === 'PAUSED';
}
