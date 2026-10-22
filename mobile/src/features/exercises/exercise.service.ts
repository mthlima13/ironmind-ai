import { api } from '../../services/api';
import { ENDPOINTS } from '../../services/endpoints';
import type { Page } from '../../types/api';
import type { Exercise, ExerciseFilters } from '../../types/exercise';

/** Searches the exercise catalogue (SPEC RF-003). */
export async function fetchExercises(
  filters: ExerciseFilters,
  page = 0,
  size = 50
): Promise<Page<Exercise>> {
  const response = await api.get<Page<Exercise>>(ENDPOINTS.exercises.list, {
    params: {
      search: filters.search?.trim() || undefined,
      muscleGroup:
        filters.muscleGroup && filters.muscleGroup !== 'ALL'
          ? filters.muscleGroup
          : undefined,
      page,
      size,
    },
  });
  return response.data;
}

/** Details of a single exercise. */
export async function fetchExercise(id: string): Promise<Exercise> {
  const response = await api.get<Exercise>(ENDPOINTS.exercises.detail(id));
  return response.data;
}
