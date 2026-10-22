import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UserProfile } from '../../types/user';
import { fetchProfile, updateProfile } from './auth.service';

export const profileQueryKeys = {
  me: ['users', 'me'] as const,
};

/** Profile and preferences of the signed user. */
export function useProfile() {
  return useQuery({
    queryKey: profileQueryKeys.me,
    queryFn: fetchProfile,
    staleTime: 60_000,
  });
}

/** Updates the profile and the preferences. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      name?: string;
      preferences?: Partial<UserProfile['preferences']>;
    }) => updateProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.me });
    },
  });
}
