import { useQuery } from '@tanstack/react-query';

import type { ExerciseFilters } from '../../types/exercise';
import { fetchExercises } from './exercise.service';

export const exerciseQueryKeys = {
  list: (filters: ExerciseFilters) => ['exercises', filters] as const,
};

/** Catalogue with the search term and the muscle group filter applied. */
export function useExercises(filters: ExerciseFilters) {
  return useQuery({
    queryKey: exerciseQueryKeys.list(filters),
    queryFn: () => fetchExercises(filters),
    staleTime: 60_000,
  });
}
