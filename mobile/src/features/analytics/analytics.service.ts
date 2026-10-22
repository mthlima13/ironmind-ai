import { api } from '../../services/api';
import { ENDPOINTS } from '../../services/endpoints';
import type { DashboardOverview, ExerciseProgress } from '../../types/analytics';
import type { Page } from '../../types/api';
import type { PersonalRecord } from '../../types/records';

/** Summary of the activity period (SPEC RF-015). */
export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const response = await api.get<DashboardOverview>(ENDPOINTS.analytics.overview);
  return response.data;
}

/** Evolution of a single exercise (SPEC RF-017). */
export async function fetchExerciseProgress(
  exerciseId: string
): Promise<ExerciseProgress> {
  const response = await api.get<ExerciseProgress>(
    ENDPOINTS.analytics.exercise(exerciseId)
  );
  return response.data;
}

/** Personal records of the user (SPEC RF-014). */
export async function fetchRecords(
  page = 0,
  size = 20
): Promise<Page<PersonalRecord>> {
  const response = await api.get<Page<PersonalRecord>>(ENDPOINTS.records.list, {
    params: { page, size },
  });
  return response.data;
}
