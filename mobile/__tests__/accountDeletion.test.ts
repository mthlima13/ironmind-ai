import { DEFAULT_PREFERENCES, useAuthStore } from '../src/features/auth/auth.store';
import { clearIdentity, loadOrCreateIdentity } from '../src/storage/identity';
import { clearLocalProfile } from '../src/storage/profile';
import { clearOfflineQueue } from '../src/storage/offlineQueue';

/**
 * There is no server account to delete (SPEC 11.1): the equivalent action is
 * the local data wipe. These tests pin what the wipe erases and the state
 * after it, with the storage collaborators stood in by mocks.
 */
jest.mock('../src/storage/offlineQueue', () => ({
  clearOfflineQueue: jest.fn(async () => undefined),
}));

jest.mock('../src/storage/profile', () => ({
  clearLocalProfile: jest.fn(async () => undefined),
  loadLocalProfile: jest.fn(async () => null),
  saveLocalProfile: jest.fn(async () => undefined),
}));

jest.mock('../src/storage/identity', () => {
  let stored: string | null = null;
  let minted = 0;
  return {
    loadOrCreateIdentity: jest.fn(async () => {
      if (!stored) {
        stored = `identity-${(minted += 1)}`;
      }
      return stored;
    }),
    clearIdentity: jest.fn(async () => {
      stored = null;
    }),
  };
});

describe('local data wipe (equivalent of account deletion)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: 'booting',
      user: null,
      preferences: null,
      error: null,
      isSubmitting: false,
    });
    jest.mocked(clearOfflineQueue).mockClear();
    jest.mocked(clearLocalProfile).mockClear();
    jest.mocked(clearIdentity).mockClear();
  });

  it('erases the queue, the profile and the identity on the local reset', async () => {
    await useAuthStore.getState().hydrate();
    await useAuthStore
      .getState()
      .completeOnboarding({ name: 'Alex Morgan', preferences: DEFAULT_PREFERENCES });
    expect(useAuthStore.getState().status).toBe('authenticated');

    await useAuthStore.getState().resetLocalData();

    expect(clearOfflineQueue).toHaveBeenCalledTimes(1);
    expect(clearLocalProfile).toHaveBeenCalledTimes(1);
    expect(clearIdentity).toHaveBeenCalledTimes(1);

    const after = useAuthStore.getState();
    expect(after.status).toBe('unauthenticated');
    expect(after.user).toBeNull();
    expect(after.preferences).toBeNull();
  });

  it('mints a fresh identity, so the previous data is out of reach', async () => {
    const before = await loadOrCreateIdentity();
    expect(before).toBeTruthy();

    await clearIdentity();

    const after = await loadOrCreateIdentity();
    expect(after).toBeTruthy();
    expect(after).not.toBe(before);
  });
});
