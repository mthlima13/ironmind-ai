import { flushOfflineQueue, queuedRequestConfig } from '../src/services/offlineSync';
import type { PendingOperation } from '../src/storage/offlineQueue';
import type { ApiError } from '../src/types/api';

function operation(id: string): PendingOperation {
  return {
    id,
    method: 'POST',
    endpoint: '/workout-sessions/ses-1/sets',
    payload: JSON.stringify({ weightKg: 40, repetitions: 10 }),
    idempotencyKey: `key-${id}`,
    status: 'PENDING',
    createdAt: `2026-01-01T00:00:0${id}Z`,
  };
}

function apiError(overrides: Partial<ApiError>): ApiError {
  return {
    code: 'UNKNOWN_ERROR',
    message: 'error',
    fieldErrors: [],
    isNetworkError: false,
    ...overrides,
  };
}

describe('flushOfflineQueue', () => {
  it('sends the queued operations in the order they were recorded', async () => {
    const operations = [operation('1'), operation('2'), operation('3')];
    const sent: string[] = [];
    const removed: string[] = [];

    const result = await flushOfflineQueue({
      list: async () => operations,
      send: async (queued) => {
        sent.push(queued.id);
      },
      remove: async (id) => {
        removed.push(id);
      },
      fail: async () => {
        throw new Error('no operation should be rejected');
      },
    });

    expect(sent).toEqual(['1', '2', '3']);
    expect(removed).toEqual(['1', '2', '3']);
    expect(result).toEqual({
      sent: 3,
      rejected: 0,
      remaining: 0,
      stoppedBy: 'none',
    });
  });

  it('stops at the first connectivity failure and keeps the rest pending', async () => {
    const operations = [operation('1'), operation('2'), operation('3')];
    const sent: string[] = [];

    const result = await flushOfflineQueue({
      list: async () => operations,
      send: async (queued) => {
        if (queued.id === '2') {
          throw apiError({ code: 'NETWORK_ERROR', isNetworkError: true });
        }
        sent.push(queued.id);
      },
      remove: async () => undefined,
      fail: async () => undefined,
    });

    expect(sent).toEqual(['1']);
    expect(result).toEqual({
      sent: 1,
      rejected: 0,
      remaining: 2,
      stoppedBy: 'connectivity',
    });
  });

  it('marks a definitively rejected operation and keeps sending the others', async () => {
    const operations = [operation('1'), operation('2'), operation('3')];
    const rejected: string[] = [];
    const sent: string[] = [];

    const result = await flushOfflineQueue({
      list: async () => operations,
      send: async (queued) => {
        if (queued.id === '2') {
          throw apiError({
            code: 'CONFLICT',
            status: 409,
            message: 'session already completed',
          });
        }
        sent.push(queued.id);
      },
      remove: async () => undefined,
      fail: async (id) => {
        rejected.push(id);
      },
    });

    expect(sent).toEqual(['1', '3']);
    expect(rejected).toEqual(['2']);
    expect(result).toEqual({
      sent: 2,
      rejected: 1,
      remaining: 0,
      stoppedBy: 'none',
    });
  });

  it('stops on a transient server failure instead of rejecting the operation', async () => {
    const operations = [operation('1'), operation('2')];
    const rejected: string[] = [];

    const result = await flushOfflineQueue({
      list: async () => operations,
      send: async (queued) => {
        if (queued.id === '2') {
          throw apiError({ code: 'UNKNOWN_ERROR', status: 503 });
        }
      },
      remove: async () => undefined,
      fail: async (id) => {
        rejected.push(id);
      },
    });

    expect(rejected).toEqual([]);
    expect(result).toEqual({
      sent: 1,
      rejected: 0,
      remaining: 1,
      stoppedBy: 'server',
    });
  });

  it('stops when the session cannot be renewed, so nothing is lost', async () => {
    const operations = [operation('1')];
    const rejected: string[] = [];

    const result = await flushOfflineQueue({
      list: async () => operations,
      send: async () => {
        throw apiError({ code: 'UNAUTHENTICATED', status: 401 });
      },
      remove: async () => undefined,
      fail: async (id) => {
        rejected.push(id);
      },
    });

    expect(rejected).toEqual([]);
    expect(result).toEqual({
      sent: 0,
      rejected: 0,
      remaining: 1,
      stoppedBy: 'session',
    });
  });

  it('never sends the same operation twice when called concurrently', async () => {
    const operations = [operation('1'), operation('2')];
    const send = jest.fn(async () => undefined);

    const dependencies = {
      list: async () => operations,
      send,
      remove: async () => undefined,
      fail: async () => undefined,
    };

    const [first, second] = await Promise.all([
      flushOfflineQueue(dependencies),
      flushOfflineQueue(dependencies),
    ]);

    expect(send).toHaveBeenCalledTimes(2);
    expect(first).toBe(second);
  });
});

describe('queuedRequestConfig', () => {
  it('replays the recorded body with the original idempotency key', () => {
    const config = queuedRequestConfig(operation('1'));

    expect(config.url).toBe('/workout-sessions/ses-1/sets');
    expect(config.method).toBe('POST');
    expect(config.data).toEqual({ weightKg: 40, repetitions: 10 });
    expect(config.headers).toEqual({ 'Idempotency-Key': 'key-1' });
  });
});
