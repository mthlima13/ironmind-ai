/**
 * Setup of the contract test against a real API.
 *
 * The contract suite runs in a plain Node environment: there is no React
 * Native runtime, so only the native module the session actually uses - the
 * secure store - is replaced. The Axios client keeps its Node HTTP adapter,
 * which the browser build of Axios would not provide.
 */

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    isAvailableAsync: jest.fn(async () => true),
    WHEN_UNLOCKED: 'whenUnlocked',
    AFTER_FIRST_UNLOCK: 'afterFirstUnlock',
  };
});
