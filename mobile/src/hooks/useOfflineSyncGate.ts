import { useEffect } from 'react';

import { useAuthStore } from '../features/auth/auth.store';
import { useOfflineSync } from '../features/workouts/useOfflineSync';
import { api } from '../services/api';
import { useIsOnline } from '../services/connection';
import { ENDPOINTS } from '../services/endpoints';

/**
 * How often the app pings the backend while it is offline and still has
 * queued writes.
 *
 * The connectivity is derived from the API responses (SPEC 15.4), so without
 * a ping the app would only learn that the network is back on the next user
 * action. The interval is deliberately long: it is a recovery signal, not a
 * heartbeat of a live connection.
 */
export const OFFLINE_RETRY_INTERVAL_MS = 15_000;

/**
 * How often a queue stopped by a transient server failure (5xx/429) is
 * retried while the backend is reachable.
 *
 * Longer than the connectivity ping: the network is fine, so retrying fast
 * would only add load to a server that is already failing.
 */
export const PENDING_RETRY_INTERVAL_MS = 30_000;

/**
 * Replays the offline queue when the backend becomes reachable (SPEC 13).
 *
 * Must be mounted inside the `QueryClientProvider`, because a successful
 * replay invalidates the cached history and analytics.
 */
export function useOfflineSyncGate(): void {
  const isOnline = useIsOnline();
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  const { pendingCount, syncNow } = useOfflineSync();

  useEffect(() => {
    if (!isAuthenticated || !isOnline || pendingCount === 0) {
      return;
    }
    void syncNow();
  }, [isAuthenticated, isOnline, pendingCount, syncNow]);

  useEffect(() => {
    if (!isAuthenticated || !isOnline || pendingCount === 0) {
      return;
    }

    // A transient 5xx stops the replay but leaves the connection up; without
    // this interval the queue would only move again on the next user action.
    const timer = setInterval(() => {
      void syncNow();
    }, PENDING_RETRY_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isAuthenticated, isOnline, pendingCount, syncNow]);

  useEffect(() => {
    if (!isAuthenticated || isOnline || pendingCount === 0) {
      return;
    }

    const timer = setInterval(() => {
      // A successful ping flips the connection store to online, which runs
      // the first effect and sends the queue.
      void api.get(ENDPOINTS.health).catch(() => undefined);
    }, OFFLINE_RETRY_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isAuthenticated, isOnline, pendingCount]);
}
