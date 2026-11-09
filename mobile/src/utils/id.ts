/**
 * Creates a random UUID v4 (canonical 8-4-4-4-12 shape).
 *
 * It is not a security token: it only has to be unique enough to avoid
 * duplicated records when a request is retried and to pass the canonical
 * UUID validation performed by the backend identity filter (AUTH-INTEGRATION 2.2).
 */
export function createUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = (Math.random() * 16) | 0;
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
