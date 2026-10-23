import type { Exercise } from './exercise';

export const SESSION_STATUSES = {
  IN_PROGRESS: 'IN_PROGRESS',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
} as const;

export type SessionStatus = (typeof SESSION_STATUSES)[keyof typeof SESSION_STATUSES];

/**
 * A registered set (SPEC 10.9).
 *
 * `weightKg` is stored in the canonical unit (kg). The app converts to the
 * user preferred unit only for presentation (SPEC 7.2).
 */
export type ExerciseSet = {
  id: string;
  setNumber: number;
  weightKg: number | null;
  repetitions: number;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
  /** RPE from 1 to 10, optional. */
  perceivedExertion?: number | null;
  restAfterSeconds?: number | null;
  completedAt: string;
};

/**
 * Partial correction of a registered set (SPEC 7.8).
 *
 * An omitted field keeps the current value; `weightKg: null` clears the load
 * for bodyweight movements.
 */
export type UpdateSetInput = {
  weightKg?: number | null;
  repetitions?: number | null;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
  perceivedExertion?: number | null;
  restAfterSeconds?: number | null;
};

/** Exercise performed inside a session (SPEC 10.8). */
export type SessionExercise = {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  position: number;
  notes?: string;
  sets: ExerciseSet[];
};

/** Workout session (SPEC 10.7). */
export type WorkoutSession = {
  id: string;
  programId?: string | null;
  programDayId?: string | null;
  startedAt: string;
  completedAt?: string | null;
  status: SessionStatus;
  notes?: string;
  exercises: SessionExercise[];
};

/**
 * Payload accepted when adding an exercise to a session (SPEC 11.4).
 *
 * The position defines the execution order (SPEC 7.8).
 */
export type AddSessionExerciseInput = {
  exerciseId: string;
  position: number;
  notes?: string | null;
};

/** Payload accepted when registering a set (SPEC 11.4). */
export type RegisterSetInput = {
  sessionExerciseId: string;
  weightKg: number | null;
  repetitions: number;
  perceivedExertion?: number | null;
  restAfterSeconds?: number | null;
};

/** Set values used to pre-fill the logger with the last session values (RF-010). */
export type PreviousSetValues = {
  setNumber: number;
  weightKg: number | null;
  repetitions: number;
  perceivedExertion?: number | null;
};

export type StartSessionInput = {
  programId?: string | null;
  programDayId?: string | null;
};
