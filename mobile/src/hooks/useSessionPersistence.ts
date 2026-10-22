import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { saveSessionDraft } from '../storage/offlineQueue';
import { useSessionStore } from '../features/workouts/session.store';

/**
 * Keeps the running session safe when the app goes to the background
 * (SPEC 16.5 - lifecycle and persistence).
 *
 * The draft is written to the local database, so closing the app never loses
 * a workout in progress.
 */
export function useSessionPersistence(): void {
  const session = useSessionStore((state) => state.session);

  useEffect(() => {
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
  }, [session]);
}
