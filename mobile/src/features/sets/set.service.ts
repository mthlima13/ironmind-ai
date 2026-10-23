import { api } from '../../services/api';
import { ENDPOINTS } from '../../services/endpoints';
import type { ExerciseSet, UpdateSetInput } from '../../types/workout';

/**
 * Corrects a set already registered (SPEC 7.8).
 *
 * The update is partial: an omitted field keeps the current value. The
 * identifier and the number of the set never change, so the correction keeps
 * the link with the history.
 */
export async function updateSet(
  setId: string,
  input: UpdateSetInput
): Promise<ExerciseSet> {
  const payload: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(input, 'weightKg')) {
    payload.weightKg = input.weightKg ?? null;
  }
  if (input.repetitions !== undefined && input.repetitions !== null) {
    payload.repetitions = input.repetitions;
  }
  if (input.durationSeconds !== undefined && input.durationSeconds !== null) {
    payload.durationSeconds = input.durationSeconds;
  }
  if (input.distanceMeters !== undefined && input.distanceMeters !== null) {
    payload.distanceMeters = input.distanceMeters;
  }
  if (
    input.perceivedExertion !== undefined &&
    input.perceivedExertion !== null
  ) {
    payload.perceivedExertion = input.perceivedExertion;
  }
  if (input.restAfterSeconds !== undefined && input.restAfterSeconds !== null) {
    payload.restAfterSeconds = input.restAfterSeconds;
  }

  const response = await api.patch<ExerciseSet>(
    ENDPOINTS.sets.update(setId),
    payload
  );
  return response.data;
}

/** Removes a set from the history (SPEC 7.8). */
export async function deleteSet(setId: string): Promise<void> {
  await api.delete(ENDPOINTS.sets.remove(setId));
}
