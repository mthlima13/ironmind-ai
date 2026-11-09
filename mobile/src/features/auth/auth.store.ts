/**
 * Local onboarding state (SPEC 6.4 and 15.3).
 *
 * There is no server session: the identity of the installation is the UUID
 * sent on the identity header, and the profile lives on the device. The
 * "session" of the old auth flow collapsed to a single question: did the
 * user already finish the first-run onboarding?
 */
import { create } from 'zustand';

import { clearOfflineQueue } from '../../storage/offlineQueue';
import { clearIdentity, loadOrCreateIdentity } from '../../storage/identity';
import {
  clearLocalProfile,
  loadLocalProfile,
  saveLocalProfile,
} from '../../storage/profile';
import type { ApiError } from '../../types/api';
import type {
  UpdateProfileInput,
  UserProfile,
  UserPreferences,
  UserIdentity,
} from '../../types/user';

export type AuthStatus = 'booting' | 'authenticated' | 'unauthenticated';

export type CompleteOnboardingInput = {
  name: string;
  preferences: UserPreferences;
};

type AuthState = {
  status: AuthStatus;
  /** Identity of the installation; `null` only before the boot finishes. */
  user: UserIdentity | null;
  /** Local training preferences; `null` before the onboarding. */
  preferences: UserPreferences | null;
  error: ApiError | null;
  isSubmitting: boolean;
  /** Restores the identity, the profile and the finished-onboarding flag. */
  hydrate: () => Promise<void>;
  /** Persists the first-run profile and enters the app. */
  completeOnboarding: (input: CompleteOnboardingInput) => Promise<void>;
  /** Applies a partial patch to the local profile (name or preferences). */
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  /**
   * Erases every local trace: identity, profile, offline queue and session
   * draft. The user goes back to the welcome screen with a fresh identity,
   * like a brand new installation.
   */
  resetLocalData: () => Promise<void>;
  clearError: () => void;
};

/** Time zone of the device is presentational (the backend never asks it). */
function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'booting',
  user: null,
  preferences: null,
  error: null,
  isSubmitting: false,

  hydrate: async () => {
    const id = await loadOrCreateIdentity();
    const profile = await loadLocalProfile();

    if (!id) {
      // Without a stored identity no private call is possible; the screens
      // degrade to the unauthenticated flow that asks for nothing.
      set({ status: 'unauthenticated', user: null, preferences: null });
      return;
    }

    const identity: UserIdentity = {
      id,
      name: profile?.identity.name ?? '',
    };
    set({
      status: profile ? 'authenticated' : 'unauthenticated',
      user: identity,
      preferences: profile?.preferences ?? null,
      error: null,
    });
  },

  completeOnboarding: async ({ name, preferences }) => {
    set({ isSubmitting: true });
    const id = await loadOrCreateIdentity();
    if (!id) {
      set({ isSubmitting: false, error: null, status: 'unauthenticated' });
      return;
    }
    const profile: UserProfile = {
      identity: { id, name: name.trim() },
      preferences,
      timezone: deviceTimezone(),
    };
    await saveLocalProfile(profile);
    set({
      status: 'authenticated',
      user: profile.identity,
      preferences,
      isSubmitting: false,
      error: null,
    });
  },

  updateProfile: async (input) => {
    const current = get();
    if (current.status !== 'authenticated' || !current.user) {
      return;
    }
    const name = input.name?.trim() ?? current.user.name;
    const preferences: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      ...(current.preferences ?? {}),
      ...(input.preferences ?? {}),
    } as UserPreferences;

    if (current.preferences) {
      preferences.privacySettings = {
        ...current.preferences.privacySettings,
        ...(input.preferences?.privacySettings ?? {}),
      };
    }

    await saveLocalProfile({
      identity: { id: current.user.id, name },
      preferences,
      timezone: deviceTimezone(),
    });
    set({
      user: { id: current.user.id, name },
      preferences,
    });
  },

  resetLocalData: async () => {
    set({ status: 'booting', isSubmitting: true });
    await clearOfflineQueue();
    await clearLocalProfile();
    await clearIdentity();
    set({
      status: 'unauthenticated',
      user: null,
      preferences: null,
      error: null,
      isSubmitting: false,
    });
  },

  clearError: () => {
    if (get().error) {
      set({ error: null });
    }
  },
}));

/**
 * Product defaults of a brand new profile (SPEC 10.2). The onboarding form
 * always shows them when no local preference exists yet.
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  preferredUnits: 'KG',
  trainingExperience: 'BEGINNER',
  goal: 'HYPERTROPHY',
  availableEquipment: [],
  trainingDays: 4,
  privacySettings: {
    publicProfile: false,
    showRecords: true,
    allowSharing: false,
  },
};

export function selectIsAuthenticated(state: AuthState): boolean {
  return state.status === 'authenticated';
}
