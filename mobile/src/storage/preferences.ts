/**
 * Small key/value store for device-local preferences.
 *
 * The only preference kept here today is the color theme: it belongs to the
 * device, not to the account, so it is not sent to the backend.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from './database';

const PREFERENCES_TABLE = 'app_preferences';

/** Creates the table used by the preferences. Safe to call repeatedly. */
async function ensureTable(): Promise<SQLiteDatabase | null> {
  const database = await getDatabase();
  if (!database) {
    return null;
  }
  try {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS ${PREFERENCES_TABLE} (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    return database;
  } catch {
    return null;
  }
}

/** Reads a preference, or `null` when it was never saved. */
export async function loadPreference(key: string): Promise<string | null> {
  const database = await ensureTable();
  if (!database) {
    return null;
  }
  try {
    const row = await database.getFirstAsync<{ value: string }>(
      `SELECT value FROM ${PREFERENCES_TABLE} WHERE key = ?;`,
      key
    );
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/** Saves a preference. Storage failures are ignored on purpose. */
export async function savePreference(key: string, value: string): Promise<void> {
  const database = await ensureTable();
  if (!database) {
    return;
  }
  try {
    await database.runAsync(
      `INSERT OR REPLACE INTO ${PREFERENCES_TABLE} (key, value) VALUES (?, ?);`,
      key,
      value
    );
  } catch {
    // The preference is a convenience: the app keeps the default theme.
  }
}
