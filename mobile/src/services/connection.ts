import { useSyncExternalStore } from 'react';

/**
 * Tracks the connectivity of the app.
 *
 * The state is derived from the API responses instead of a native network
 * listener, so the offline banner reacts to the same signal the requests do.
 */
type ConnectionSnapshot = {
  isOnline: boolean;
};

let snapshot: ConnectionSnapshot = { isOnline: true };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setConnectionStatus(isOnline: boolean): void {
  if (snapshot.isOnline === isOnline) {
    return;
  }
  snapshot = { isOnline };
  emit();
}

export function getConnectionSnapshot(): ConnectionSnapshot {
  return snapshot;
}

export function subscribeToConnection(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Returns true while the app believes it can reach the backend. */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    subscribeToConnection,
    getConnectionSnapshot,
    getConnectionSnapshot
  ).isOnline;
}
