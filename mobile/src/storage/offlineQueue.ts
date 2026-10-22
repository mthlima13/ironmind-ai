/**
 * Local storage used while the backend is unreachable (SPEC 13).
 *
 * Two responsibilities:
 * - the queue of write operations waiting to be synchronized;
 * - the draft of the workout session in progress, so closing the app never
 *   loses a session (SPEC 16.5 - persistence).
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import type { WorkoutSession } from '../types/workout';

const DATABASE_NAME = 'ironmind.db';
const PENDING_OPERATIONS_TABLE = 'pending_operations';
const SESSION_DRAFT_TABLE = 'session_draft';

export type PendingOperationStatus = 'PENDING' | 'SYNCED' | 'ERROR';

export type PendingOperation = {
  id: string;
  method: string;
  endpoint: string;
  payload: string;
  /** Key that prevents duplicated records on the backend (SPEC A.3). */
  idempotencyKey: string;
  status: PendingOperationStatus;
  createdAt: string;
};

let databasePromise: Promise<SQLiteDatabase> | null = null;
let sqlitePromise: Promise<typeof import('expo-sqlite') | null> | null = null;

/**
 * Loads the SQLite module without making it a hard requirement.
 *
 * The native module is not always present: Expo Go ships the version of
 * `expo-sqlite` built into it, and a release of the package that needs a newer
 * native code fails to load. A static import would throw while the module is
 * evaluated and take the whole app down at start up, even though the offline
 * queue is only a convenience.
 *
 * The module is therefore loaded lazily and its absence degrades the queue to a
 * no-op instead of breaking the app.
 */
function loadSqlite(): Promise<typeof import('expo-sqlite') | null> {
  if (!sqlitePromise) {
    sqlitePromise = import('expo-sqlite').catch(() => null);
  }
  return sqlitePromise;
}

async function getDatabase(): Promise<SQLiteDatabase | null> {
  try {
    const sqlite = await loadSqlite();
    if (!sqlite) {
      return null;
    }
    if (!databasePromise) {
      databasePromise = sqlite.openDatabaseAsync(DATABASE_NAME);
    }
    return await databasePromise;
  } catch {
    return null;
  }
}

/** Creates the tables used by the offline queue. Safe to call repeatedly. */
export async function initOfflineQueue(): Promise<void> {
  const database = await getDatabase();
  if (!database) {
    return;
  }
  try {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS ${PENDING_OPERATIONS_TABLE} (
        id TEXT PRIMARY KEY NOT NULL,
        method TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        payload TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${SESSION_DRAFT_TABLE} (
        id TEXT PRIMARY KEY NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  } catch {
    // The queue is a best effort: the workout must keep working without it.
  }
}

/** Adds a write operation to the synchronization queue. */
export async function enqueueOperation(
  operation: Omit<PendingOperation, 'status' | 'createdAt'>
): Promise<void> {
  const database = await getDatabase();
  if (!database) {
    return;
  }
  try {
    await initOfflineQueue();
    await database.runAsync(
      `INSERT OR REPLACE INTO ${PENDING_OPERATIONS_TABLE}
        (id, method, endpoint, payload, idempotency_key, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      operation.id,
      operation.method,
      operation.endpoint,
      operation.payload,
      operation.idempotencyKey,
      'PENDING',
      new Date().toISOString()
    );
  } catch {
    // Ignore storage failures: the operation can be retried by the user.
  }
}

/** Lists the operations that still need to be sent to the backend. */
export async function listPendingOperations(): Promise<PendingOperation[]> {
  const database = await getDatabase();
  if (!database) {
    return [];
  }
  try {
    await initOfflineQueue();
    const rows = await database.getAllAsync<{
      id: string;
      method: string;
      endpoint: string;
      payload: string;
      idempotency_key: string;
      status: PendingOperationStatus;
      created_at: string;
    }>(
      `SELECT * FROM ${PENDING_OPERATIONS_TABLE} WHERE status = 'PENDING' ORDER BY created_at ASC;`
    );
    return rows.map((row) => ({
      id: row.id,
      method: row.method,
      endpoint: row.endpoint,
      payload: row.payload,
      idempotencyKey: row.idempotency_key,
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

/** Removes an operation from the queue once it is confirmed by the backend. */
export async function removeOperation(id: string): Promise<void> {
  const database = await getDatabase();
  if (!database) {
    return;
  }
  try {
    await database.runAsync(
      `DELETE FROM ${PENDING_OPERATIONS_TABLE} WHERE id = ?;`,
      id
    );
  } catch {
    // Nothing to do: the operation will be retried later.
  }
}

/** Removes every pending operation. Used when the user logs out. */
export async function clearOfflineQueue(): Promise<void> {
  const database = await getDatabase();
  if (!database) {
    return;
  }
  try {
    await database.runAsync(`DELETE FROM ${PENDING_OPERATIONS_TABLE};`);
    await database.runAsync(`DELETE FROM ${SESSION_DRAFT_TABLE};`);
  } catch {
    // Nothing to do.
  }
}

/** Persists the session in progress so it survives an app restart. */
export async function saveSessionDraft(session: WorkoutSession): Promise<void> {
  const database = await getDatabase();
  if (!database) {
    return;
  }
  try {
    await initOfflineQueue();
    await database.runAsync(
      `INSERT OR REPLACE INTO ${SESSION_DRAFT_TABLE} (id, payload, updated_at)
       VALUES (?, ?, ?);`,
      session.id,
      JSON.stringify(session),
      new Date().toISOString()
    );
  } catch {
    // The draft is a convenience, not a source of truth.
  }
}

/** Reads the session draft saved by the last run of the app. */
export async function loadSessionDraft(): Promise<WorkoutSession | null> {
  const database = await getDatabase();
  if (!database) {
    return null;
  }
  try {
    await initOfflineQueue();
    const row = await database.getFirstAsync<{ id: string; payload: string }>(
      `SELECT id, payload FROM ${SESSION_DRAFT_TABLE} ORDER BY updated_at DESC LIMIT 1;`
    );
    if (!row) {
      return null;
    }
    return JSON.parse(row.payload) as WorkoutSession;
  } catch {
    return null;
  }
}

/** Removes the session draft, e.g. after the session is completed. */
export async function clearSessionDraft(): Promise<void> {
  const database = await getDatabase();
  if (!database) {
    return;
  }
  try {
    await database.runAsync(`DELETE FROM ${SESSION_DRAFT_TABLE};`);
  } catch {
    // Nothing to do.
  }
}
