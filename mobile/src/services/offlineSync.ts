/**
 * Replay of the writes queued while the backend was unreachable (SPEC 13).
 *
 * The queue stores one operation per local write, each one with its own
 * `Idempotency-Key` (SPEC A.3). Replaying an operation that already reached
 * the backend is therefore safe: the server answers with the original record
 * instead of creating a duplicate (durable idempotency, SPEC 7.8).
 *
 * The flush is sequential and stops at the first transient failure: sending
 * the next operations after a connectivity loss would only produce more
 * failures. Definitive rejections (4xx) are marked as `ERROR` instead of
 * blocking the queue forever.
 */
import type { PendingOperation } from '../storage/offlineQueue';
import {
  listPendingOperations,
  markOperationFailed,
  removeOperation,
} from '../storage/offlineQueue';
import { API_ERROR_CODES } from '../types/api';
import { api, mapApiError } from './api';
import { IDEMPOTENCY_HEADER } from './endpoints';

/** Why the flush stopped before reaching the end of the queue. */
export type OfflineSyncStop = 'none' | 'connectivity' | 'server' | 'session';

export type OfflineSyncResult = {
  /** Operations accepted by the backend and removed from the queue. */
  sent: number;
  /** Operations permanently rejected and marked as `ERROR`. */
  rejected: number;
  /** Operations still waiting to be sent. */
  remaining: number;
  stoppedBy: OfflineSyncStop;
};

/** Storage and transport used by the flush, replaceable in tests. */
export type OfflineSyncDependencies = {
  list?: () => Promise<PendingOperation[]>;
  remove?: (id: string) => Promise<void>;
  fail?: (id: string) => Promise<void>;
  send?: (operation: PendingOperation) => Promise<void>;
};

/** Statuses that mean "try again later", never "reject the operation". */
const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

let running: Promise<OfflineSyncResult> | null = null;

/**
 * Sends every queued operation to the backend, oldest first.
 *
 * Concurrent calls share the same execution: a second call while the flush is
 * running returns the promise of the first one, so an operation is never sent
 * twice by the app.
 */
export function flushOfflineQueue(
  dependencies: OfflineSyncDependencies = {}
): Promise<OfflineSyncResult> {
  if (running) {
    return running;
  }
  running = runFlush(dependencies).finally(() => {
    running = null;
  });
  return running;
}

async function runFlush(
  dependencies: OfflineSyncDependencies
): Promise<OfflineSyncResult> {
  const list = dependencies.list ?? listPendingOperations;
  const remove = dependencies.remove ?? removeOperation;
  const fail = dependencies.fail ?? markOperationFailed;
  const send = dependencies.send ?? sendQueuedOperation;

  const operations = await list();

  let sent = 0;
  let rejected = 0;

  for (const operation of operations) {
    try {
      await send(operation);
      await remove(operation.id);
      sent += 1;
    } catch (error) {
      const apiError = mapApiError(error);

      if (apiError.isNetworkError) {
        return result(sent, rejected, operations.length, 'connectivity');
      }

      if (
        apiError.code === API_ERROR_CODES.UNAUTHENTICATED ||
        apiError.code === API_ERROR_CODES.INVALID_REFRESH_TOKEN
      ) {
        return result(sent, rejected, operations.length, 'session');
      }

      if (isTransient(apiError.status)) {
        return result(sent, rejected, operations.length, 'server');
      }

      // A definitive rejection: retrying would fail again, so the operation
      // leaves the pending work and stays visible as an error.
      await fail(operation.id);
      rejected += 1;
    }
  }

  return result(sent, rejected, operations.length, 'none');
}

function result(
  sent: number,
  rejected: number,
  total: number,
  stoppedBy: OfflineSyncStop
): OfflineSyncResult {
  return {
    sent,
    rejected,
    remaining: Math.max(total - sent - rejected, 0),
    stoppedBy,
  };
}

function isTransient(status: number | undefined): boolean {
  // Without an HTTP status the failure is unknown, so the operation is kept
  // for a later attempt instead of being discarded.
  if (status === undefined) {
    return true;
  }
  return TRANSIENT_STATUSES.has(status) || status >= 500;
}

/**
 * Builds the request replayed for a queued operation.
 *
 * The body was serialized when the operation was queued, so the values are
 * exactly the ones the user recorded.
 */
export function queuedRequestConfig(operation: PendingOperation): {
  url: string;
  method: string;
  data: unknown;
  headers: Record<string, string>;
} {
  return {
    url: operation.endpoint,
    method: operation.method,
    data: operation.payload ? (JSON.parse(operation.payload) as unknown) : undefined,
    headers: { [IDEMPOTENCY_HEADER]: operation.idempotencyKey },
  };
}

/** Sends a single queued operation to the real API. */
export async function sendQueuedOperation(
  operation: PendingOperation
): Promise<void> {
  await api.request(queuedRequestConfig(operation));
}
