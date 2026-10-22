import { useCallback, useEffect } from 'react';

import {
  enqueueOperation,
  listPendingOperations,
  type PendingOperation,
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
 * database and the user is told that it is pending.
 */
export function useOfflineSync() {
  const pendingCount = useSessionStore((state) => state.pendingCount);
  const setPendingCount = useSessionStore((state) => state.setPendingCount);
  const setOffline = useSessionStore((state) => state.setOffline);

  const refresh = useCallback(async () => {
    const operations: PendingOperation[] = await listPendingOperations();
    setPendingCount(operations.length);
  }, [setPendingCount]);

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

  return { pendingCount, enqueue, refresh, setOffline };
}
