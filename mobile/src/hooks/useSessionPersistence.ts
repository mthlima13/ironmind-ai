import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  clearSessionDraft,
  loadSessionDraft,
  saveSessionDraft,
} from '../storage/offlineQueue';
import { useSessionStore } from '../features/workouts/session.store';
import { SESSION_STATUSES, type WorkoutSession } from '../types/workout';

/** Drafts of finished or abandoned sessions must not come back. */
function isRunning(draft: WorkoutSession): boolean {
  return (
    (draft.status === SESSION_STATUSES.IN_PROGRESS ||
      draft.status === SESSION_STATUSES.PAUSED) &&
    Array.isArray(draft.exercises)
  );
}

/**
 * Keeps the running session safe across navigation and app restarts
 * (SPEC 16.5 - lifecycle and persistence).
 *
 * The draft is written to the local database whenever the session changes, not
 * only when the app goes to the background, so the progress marked by the user
 * survives a crash. The first authenticated frame restores the draft when the
 * in-memory store is empty.
 */
export function useSessionPersistence(enabled = true): void {
  const session = useSessionStore((state) => state.session);

  // Restores a draft saved by a previous run of the app.
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;

    const restore = async () => {
      if (useSessionStore.getState().session) {
        return;
      }
      const draft = await loadSessionDraft();
      if (cancelled || !draft) {
        return;
      }
      if (!isRunning(draft)) {
        await clearSessionDraft();
        return;
      }
      // A session may have been started while the draft was being read.
      if (!useSessionStore.getState().session) {
        useSessionStore.getState().setSession(draft);
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Saves every change, so marking an exercise is not lost on a crash.
  useEffect(() => {
    if (!enabled || !session) {
      return;
    }
    void saveSessionDraft(session);
  }, [enabled, session]);

  // Writing on the way to the background keeps the last frame too.
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handleChange = (status: AppStateStatus) => {
      if (status === 'background' || status === 'inactive') {
        const current = useSessionStore.getState().session;
        if (current) {
          void saveSessionDraft(current);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, [enabled]);
}
