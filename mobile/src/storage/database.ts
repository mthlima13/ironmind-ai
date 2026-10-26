/**
 * Single SQLite connection used by the local storage modules.
 *
 * `expo-sqlite` is loaded lazily and its absence degrades every caller to a
 * no-op instead of breaking the app at start up: Expo Go ships the version of
 * the package built into it, and a release that needs newer native code fails
 * to load. A static import would throw while the module is evaluated and take
 * the whole app down, even though the local data is only a convenience.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_NAME = 'ironmind.db';

let databasePromise: Promise<SQLiteDatabase> | null = null;
let sqlitePromise: Promise<typeof import('expo-sqlite') | null> | null = null;

function loadSqlite(): Promise<typeof import('expo-sqlite') | null> {
  if (!sqlitePromise) {
    sqlitePromise = import('expo-sqlite').catch(() => null);
  }
  return sqlitePromise;
}

/** Opens the app database, or returns `null` when SQLite is unavailable. */
export async function getDatabase(): Promise<SQLiteDatabase | null> {
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
