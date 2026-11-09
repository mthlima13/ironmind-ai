/**
 * Device-local storage of the training profile.
 *
 * The backend has no account, profile or preferences collection: name and
 * training preferences belong to the device (SPEC 10.1 and 10.2). When the
 * identity provider takes over the account, this local copy keeps working as
 * the default values filled into every form and AI request.
 *
 * Storage failures degrade to a missing profile instead of breaking the app,
 * following the same policy as the theme preferences.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from './database';
import type { UserProfile } from '../types/user';

const PROFILE_TABLE = 'app_preferences';
/** Key of the single JSON blob holding the profile. */
const PROFILE_ROW_KEY = 'profile.v1';

/**
 * Reads the saved profile, or `null` when the onboarding never finished.
 */
export async function loadLocalProfile(): Promise<UserProfile | null> {
  const database = await ensureTable();
  if (!database) {
    return null;
  }
  try {
    const row = await database.getFirstAsync<{ value: string }>(
      `SELECT value FROM ${PROFILE_TABLE} WHERE key = ?;`,
      PROFILE_ROW_KEY
    );
    if (!row?.value) {
      return null;
    }
    return JSON.parse(row.value) as UserProfile;
  } catch {
    return null;
  }
}

/** Persists the profile. Storage failures are ignored on purpose. */
export async function saveLocalProfile(profile: UserProfile): Promise<void> {
  const database = await ensureTable();
  if (!database) {
    return;
  }
  try {
    await database.runAsync(
      `INSERT OR REPLACE INTO ${PROFILE_TABLE} (key, value) VALUES (?, ?);`,
      PROFILE_ROW_KEY,
      JSON.stringify(profile)
    );
  } catch {
    // The profile is a convenience: the app keeps the product defaults.
  }
}

/** Erases the saved profile, used when the user wipes the local data. */
export async function clearLocalProfile(): Promise<void> {
  const database = await ensureTable();
  if (!database) {
    return;
  }
  try {
    await database.runAsync(
      `DELETE FROM ${PROFILE_TABLE} WHERE key = ?;`,
      PROFILE_ROW_KEY
    );
  } catch {
    // Nothing to do: the wipe only leaves a profile behind.
  }
}

async function ensureTable(): Promise<SQLiteDatabase | null> {
  const database = await getDatabase();
  if (!database) {
    return null;
  }
  try {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS ${PROFILE_TABLE} (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    return database;
  } catch {
    return null;
  }
}
