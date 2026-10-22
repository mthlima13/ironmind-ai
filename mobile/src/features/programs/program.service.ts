import { api } from '../../services/api';
import { ENDPOINTS } from '../../services/endpoints';
import type { Page } from '../../types/api';
import type { WorkoutProgram } from '../../types/program';

/** Programs owned by the user (SPEC RF-005). */
export async function fetchPrograms(
  page = 0,
  size = 20
): Promise<Page<WorkoutProgram>> {
  const response = await api.get<Page<WorkoutProgram>>(ENDPOINTS.programs.list, {
    params: { page, size },
  });
  return response.data;
}

/** Program with its days and exercises. */
export async function fetchProgram(id: string): Promise<WorkoutProgram> {
  const response = await api.get<WorkoutProgram>(ENDPOINTS.programs.detail(id));
  return response.data;
}
