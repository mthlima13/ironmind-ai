import type { SessionExercise } from '../../types/workout';

/** True when the user explicitly marked the exercise as done. */
export function isExerciseCompleted(sessionExercise: SessionExercise): boolean {
  return (
    typeof sessionExercise.completedAt === 'string' &&
    sessionExercise.completedAt.length > 0
  );
}

export type SessionProgress = {
  completed: number;
  total: number;
  pending: number;
  /** Completed percentage from 0 to 100, rounded for presentation. */
  percent: number;
};

/**
 * Progress of the running session.
 *
 * The count comes only from the explicit marks of the user, never from the
 * registered sets: an exercise with sets may still be pending and an exercise
 * without sets may already be marked as done.
 */
export function getSessionProgress(
  exercises: SessionExercise[]
): SessionProgress {
  const total = exercises.length;
  const completed = exercises.filter(isExerciseCompleted).length;

  return {
    completed,
    total,
    pending: total - completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}
