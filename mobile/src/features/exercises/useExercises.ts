import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateExerciseInput, ExerciseFilters } from '../../types/exercise';
import { createIdempotencyKey } from '../../utils/id';
import { createExercise, fetchExercises } from './exercise.service';

export const exerciseQueryKeys = {
  list: (filters: ExerciseFilters) => ['exercises', filters] as const,
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
