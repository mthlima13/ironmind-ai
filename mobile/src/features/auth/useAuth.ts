import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from './auth.store';

export function useAuthState() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const preferences = useAuthStore((state) => state.preferences);

  return { status, user, preferences };
}

/**
 * Persists the first-run profile and enters the app.
 *
 * The onboarding only writes to the device: profile and preferences have no
 * endpoint on the backend (SPEC 10.1 and 10.2), so this step cannot fail for
 * network reasons and `isSubmitting` only reflects the storage write.
 */
export function useCompleteOnboarding() {
  const completeOnboarding = useAuthStore(
    (state) => state.completeOnboarding
  );
  const isSubmitting = useAuthStore((state) => state.isSubmitting);

  const execute = useCallback(
    (input: { name: string; preferences: Parameters<typeof completeOnboarding>[0]['preferences'] }) =>
      completeOnboarding(input),
    [completeOnboarding]
  );

  return { completeOnboarding: execute, isSubmitting };
}

/** Applies a partial patch to the local profile. */
export function useUpdateProfile() {
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const execute = useCallback(
    (input: Parameters<typeof updateProfile>[0]) => updateProfile(input),
    [updateProfile]
  );

  return { updateProfile: execute };
}

/**
 * Wipes every local trace of the installation.
 *
 * The query cache is cleared so no screen keeps data of the previous
 * identity; the next requests already carry the fresh identity.
 */
export function useResetLocalData() {
  const resetLocalData = useAuthStore((state) => state.resetLocalData);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const queryClient = useQueryClient();

  const execute = useCallback(async () => {
    await resetLocalData();
    queryClient.clear();
  }, [resetLocalData, queryClient]);

  return { resetLocalData: execute, isSubmitting };
}
