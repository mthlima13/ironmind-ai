import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateExerciseInput, ExerciseFilters } from '../../types/exercise';
import { createIdempotencyKey } from '../../utils/id';
import { createExercise, fetchExercises } from './exercise.service';

export const exerciseQueryKeys = {
  list: (filters: ExerciseFilters) => ['exercises', filters] as const,
  catalogue: ['exercises', 'catalogue'] as const,
  all: ['exercises'] as const,
};

/** Catalogue with the search term and the muscle group filter applied. */
export function useExercises(filters: ExerciseFilters) {
  return useQuery({
    queryKey: exerciseQueryKeys.list(filters),
    queryFn: () => fetchExercises(filters),
    staleTime: 60_000,
  });
}

/**
 * Whole catalogue, independent of the list filters.
 *
 * Used to resolve the exercises of a program template by name without losing
 * entries to the pagination of the listing screen.
 */
export function useExerciseCatalogue() {
  return useQuery({
    queryKey: exerciseQueryKeys.catalogue,
    queryFn: () => fetchExercises({ muscleGroup: 'ALL' }, 0, 200),
    staleTime: 5 * 60_000,
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateExerciseInput; idempotencyKey?: string }) =>
      createExercise(input, idempotencyKey ?? createIdempotencyKey()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.all });
    },
  });
}
