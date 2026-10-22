import { useQuery } from '@tanstack/react-query';

import { fetchExerciseProgress } from './analytics.service';
import { analyticsQueryKeys } from './queryKeys';

/** Evolution chart of a single exercise (SPEC RF-017). */
export function useExerciseProgress(exerciseId: string | null) {
  return useQuery({
    queryKey: analyticsQueryKeys.exercise(exerciseId ?? ''),
    queryFn: () => fetchExerciseProgress(exerciseId as string),
    enabled: Boolean(exerciseId),
    staleTime: 60_000,
  });
}
