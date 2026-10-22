import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { InjuryRestriction } from '../../types/user';
import { fetchRestrictions, updateRestrictions } from './restriction.service';

export const restrictionQueryKeys = {
  list: ['restrictions'] as const,
};

/** Restrictions and exercises to avoid (SPEC RF-016). */
export function useRestrictions() {
  return useQuery({
    queryKey: restrictionQueryKeys.list,
    queryFn: fetchRestrictions,
    staleTime: 60_000,
  });
}

/** Updates the restrictions of the user. */
export function useUpdateRestrictions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (restrictions: InjuryRestriction[]) =>
      updateRestrictions(restrictions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restrictionQueryKeys.list });
    },
  });
}
