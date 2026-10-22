/**
 * Creates a random identifier used as idempotency key (SPEC A.3).
 *
 * It is not a security token: it only has to be unique enough to avoid
 * duplicated records when a request is retried.
 */
export function createIdempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = (Math.random() * 16) | 0;
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
