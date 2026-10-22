import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { flushOfflineQueue, type OfflineSyncResult } from '../../services/offlineSync';
import {
  countFailedOperations,
  enqueueOperation,
  listPendingOperations,
} from '../../storage/offlineQueue';
import { useSessionStore } from './session.store';

export type EnqueueInput = {
  method: string;
  endpoint: string;
  payload: unknown;
  idempotencyKey: string;
};

/**
 * Offline synchronization of the workout writes (SPEC 13).
 *
 * When the backend cannot be reached, the operation is queued in the local
 * database and the user is told that it is pending. `syncNow` replays the
 * queue and refreshes the counters; the automatic replay is triggered by the
 * {@link useOfflineSyncGate} hook, which watches the connectivity.
 */
export function useOfflineSync() {
  const queryClient = useQueryClient();

  const pendingCount = useSessionStore((state) => state.pendingCount);
  const failedCount = useSessionStore((state) => state.failedCount);
  const setPendingCount = useSessionStore((state) => state.setPendingCount);
  const setFailedCount = useSessionStore((state) => state.setFailedCount);
  const setOffline = useSessionStore((state) => state.setOffline);

  const refresh = useCallback(async () => {
    const [operations, failed] = await Promise.all([
      listPendingOperations(),
      countFailedOperations(),
    ]);
    setPendingCount(operations.length);
    setFailedCount(failed);
  }, [setFailedCount, setPendingCount]);

  const syncNow = useCallback(async (): Promise<OfflineSyncResult> => {
    const result = await flushOfflineQueue();
    await refresh();

    if (result.sent > 0) {
      // The records that reached the backend change the history and the
      // summary, so the screens must not keep the previous snapshot.
      void queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }

    return result;
  }, [queryClient, refresh]);

  const enqueue = useCallback(
    async (input: EnqueueInput) => {
      await enqueueOperation({
        id: input.idempotencyKey,
        method: input.method,
        endpoint: input.endpoint,
        payload: JSON.stringify(input.payload),
        idempotencyKey: input.idempotencyKey,
      });
      await refresh();
    },
    [refresh]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    pendingCount,
    failedCount,
    enqueue,
    refresh,
    syncNow,
    setOffline,
  };
}
