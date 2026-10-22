import { useEffect } from 'react';

import { useSessionStore } from '../features/workouts/session.store';
import { useIsOnline } from '../services/connection';

/**
 * Mirrors the connectivity of the app in the session store, so the offline
 * banner reflects the same signal the requests do (SPEC 15.4).
 */
export function useConnectionSync(): void {
  const isOnline = useIsOnline();
  const setOffline = useSessionStore((state) => state.setOffline);

  useEffect(() => {
    setOffline(!isOnline);
  }, [isOnline, setOffline]);
}
