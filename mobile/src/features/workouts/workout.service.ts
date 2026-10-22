import { api } from '../../services/api';
import { ENDPOINTS, IDEMPOTENCY_HEADER } from '../../services/endpoints';
import type { Page } from '../../types/api';
import type {
  ExerciseSet,
  PreviousSetValues,
  RegisterSetInput,
  StartSessionInput,
  WorkoutSession,
} from '../../types/workout';

/** Paginated session history (SPEC RF-011). */
export async function fetchSessions(
  page = 0,
  size = 20
): Promise<Page<WorkoutSession>> {
  const response = await api.get<Page<WorkoutSession>>(ENDPOINTS.sessions.list, {
    params: { page, size, sort: 'startedAt,desc' },
  });
  return response.data;
}

/** Starts a workout session (SPEC RF-006). */
export async function startSession(
  input: StartSessionInput
): Promise<WorkoutSession> {
  const response = await api.post<WorkoutSession>(ENDPOINTS.sessions.create, {
    programId: input.programId ?? null,
    programDayId: input.programDayId ?? null,
  });
  return response.data;
}

/**
 * Registers a set in a session.
 *
 * The idempotency key makes the retry of a failed request safe: the backend
 * returns the same set instead of creating a duplicate (SPEC A.3 and RNF-012).
 */
export async function registerSet(
  sessionId: string,
  input: RegisterSetInput,
  idempotencyKey: string
): Promise<ExerciseSet> {
  const response = await api.post<ExerciseSet>(
    ENDPOINTS.sessions.addSet(sessionId),
    {
      sessionExerciseId: input.sessionExerciseId,
      weightKg: input.weightKg,
      repetitions: input.repetitions,
      perceivedExertion: input.perceivedExertion ?? null,
      restAfterSeconds: input.restAfterSeconds ?? null,
    },
    { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } }
  );
  return response.data;
}

/** Finishes a workout session (SPEC RF-006). */
export async function completeSession(sessionId: string): Promise<WorkoutSession> {
  const response = await api.post<WorkoutSession>(
    ENDPOINTS.sessions.complete(sessionId),
    {}
  );
  return response.data;
}

/**
 * Values used by the quick fill shortcut (SPEC RF-010).
 *
 * The lookup uses the session history endpoint: the first session that
 * contains the exercise is the last one performed.
 */
export async function fetchLastSessionSets(
  exerciseId: string
): Promise<PreviousSetValues[]> {
  const history = await fetchSessions(0, 20);

  for (const session of history.content) {
    const sessionExercise = session.exercises.find(
      (item) => item.exerciseId === exerciseId
    );
    if (sessionExercise && sessionExercise.sets.length > 0) {
      return sessionExercise.sets.map((set) => ({
        setNumber: set.setNumber,
        weightKg: set.weightKg,
        repetitions: set.repetitions,
        perceivedExertion: set.perceivedExertion ?? null,
      }));
    }
  }

  return [];
}
