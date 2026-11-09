/**
 * Local source of the identity sent on every private API call.
 *
 * In the real deployment the authentication is delegated: the gateway
 * authenticates the session and injects the owner UUID in the `X-User-UUID`
 * header (SPEC 7.7). Until that infrastructure exists, the app generates and
 * stores the same kind of identifier once per device and sends it exactly
 * where the gateway would inject it.
 *
 * The identifier never travels in a request body or query string and is never
 * logged. Swapping this module for the real credential flow of the identity
 * provider does not change any other part of the app.
 */
import * as SecureStore from 'expo-secure-store';

import { createUuidV4 } from '../utils/id';

const IDENTITY_KEY = 'ironmind.identityId';

let cached: Promise<string | null> | null = null;

/**
 * Loads the identity of the installation, creating one on the first run.
 *
 * The value is canonical and idempotent: every call returns the same UUID.
 * When the secure store is unavailable (a rare device failure), the result
 * is `null` and every private endpoint answers `401` the same way it does
 * for a missing gateway header.
 */
export function loadOrCreateIdentity(): Promise<string | null> {
  if (!cached) {
    cached = readOrCreate();
  }
  return cached;
}

async function readOrCreate(): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(IDENTITY_KEY);
    if (stored && isCanonicalUuid(stored)) {
      return stored;
    }
    const created = createUuidV4();
    await SecureStore.setItemAsync(IDENTITY_KEY, created);
    return created;
  } catch {
    return null;
  }
}

/**
 * Drops the identity of the installation. Used when the user wipes the local
 * data: the next call to `loadOrCreateIdentity` generates a fresh UUID that
 * sees only empty data, like a brand new account.
 */
export async function clearIdentity(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(IDENTITY_KEY);
  } catch {
    // Nothing to do: without storage the next load simply mints a new one.
  }
  cached = null;
}

function isCanonicalUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
    value
  );
}
