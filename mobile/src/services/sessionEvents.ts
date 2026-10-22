/**
 * Session events shared between the HTTP client and the auth store.
 *
 * The client cannot import the store (the store already depends on the
 * client), so the "the session is over" signal travels through this tiny
 * event bus instead of a circular import.
 */

export type SessionExpiredListener = () => void;

const listeners = new Set<SessionExpiredListener>();

/** Subscribes to the end of the session and returns the unsubscribe function. */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notifies the app that the stored credentials are no longer valid.
 *
 * A failing listener never breaks the request that is being handled: the
 * session state is a UI concern and must not turn into a crash.
 */
export function emitSessionExpired(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A broken listener must not break the app.
    }
  });
}
