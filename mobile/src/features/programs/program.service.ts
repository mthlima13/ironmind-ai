import { api } from '../../services/api';
import { ENDPOINTS, IDEMPOTENCY_HEADER } from '../../services/endpoints';
import type { Page } from '../../types/api';
import type { CreateProgramInput, WorkoutProgram } from '../../types/program';
import { createIdempotencyKey } from '../../utils/id';

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

/**
 * Creates a program with its days and exercises (SPEC RF-005).
 *
 * The idempotency key makes a retried save return the same program instead of
 * creating a second one (SPEC A.3).
 */
export async function createProgram(
  input: CreateProgramInput,
  idempotencyKey: string = createIdempotencyKey()
): Promise<WorkoutProgram> {
  const response = await api.post<WorkoutProgram>(
    ENDPOINTS.programs.create,
    input,
    { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } }
  );
  return response.data;
}
