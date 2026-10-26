import type { ProposedDay, WorkoutProposal } from '../../types/ai';
import type { ProgramDayDraft, SplitType } from '../../types/program';
import type { TrainingGoal } from '../../types/user';

/**
 * Pure helpers of the workout proposal review (SPEC 12.2, step 8).
 *
 * They stay outside of the screen so the conversion from the AI suggestion to
 * the program payload can be tested without rendering anything.
 */

/** Limits of the program endpoint, used to keep the review inside them. */
export const PROPOSAL_LIMITS = {
  minSets: 1,
  maxSets: 50,
  minReps: 0,
  maxReps: 1000,
  minRestSeconds: 0,
  maxRestSeconds: 600,
  maxNameLength: 120,
  maxDescriptionLength: 2000,
} as const;

export type ProgramDraft = {
  name: string;
  description: string;
  goal: TrainingGoal;
  splitType: SplitType;
  days: ProgramDayDraft[];
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Copies the days so editing the review never mutates the answer. */
export function cloneDays(days: ProposedDay[]): ProposedDay[] {
  return days.map((day) => ({
    name: day.name,
    exercises: day.exercises.map((exercise) => ({ ...exercise })),
  }));
}

/**
 * Applies a change to one exercise of the review.
 *
 * The values are clamped to the program limits, so the payload sent on save
 * is always accepted by the backend.
 */
export function updateExercise(
  days: ProposedDay[],
  dayIndex: number,
  exerciseIndex: number,
  patch: Partial<ProposedDay['exercises'][number]>
): ProposedDay[] {
  return days.map((day, currentDayIndex) => {
    if (currentDayIndex !== dayIndex) {
      return day;
    }
    return {
      ...day,
      exercises: day.exercises.map((exercise, currentExerciseIndex) => {
        if (currentExerciseIndex !== exerciseIndex) {
          return exercise;
        }
        const merged = { ...exercise, ...patch };
        const sets = clamp(
          merged.sets,
          PROPOSAL_LIMITS.minSets,
          PROPOSAL_LIMITS.maxSets
        );
        let repsMin = clamp(
          merged.repsMin,
          PROPOSAL_LIMITS.minReps,
          PROPOSAL_LIMITS.maxReps
        );
        let repsMax = clamp(
          merged.repsMax,
          PROPOSAL_LIMITS.minReps,
          PROPOSAL_LIMITS.maxReps
        );
        // The backend refuses a range where the top is below the bottom, so
        // moving one end past the other drags the other end along.
        if (repsMin > repsMax) {
          if (patch.repsMin !== undefined) {
            repsMax = repsMin;
          } else {
            repsMin = repsMax;
          }
        }

        return {
          ...merged,
          sets,
          repsMin,
          repsMax,
          restSeconds: clamp(
            merged.restSeconds,
            PROPOSAL_LIMITS.minRestSeconds,
            PROPOSAL_LIMITS.maxRestSeconds
          ),
        };
      }),
    };
  });
}

/**
 * Tells whether the user changed the suggestion during the review.
 *
 * Any change, including the name, records the decision as `EDITED` instead of
 * `ACCEPTED` (SPEC 12.2, step 8).
 */
export function isProposalEdited(
  proposal: WorkoutProposal,
  name: string,
  days: ProposedDay[],
  splitType?: SplitType
): boolean {
  if (name.trim() !== proposal.name.trim()) {
    return true;
  }
  if (splitType && splitType !== proposal.splitType) {
    return true;
  }
  if (days.length !== proposal.days.length) {
    return true;
  }
  return proposal.days.some((originalDay, dayIndex) => {
    const day = days[dayIndex];
    if (!day || day.name !== originalDay.name) {
      return true;
    }
    if (day.exercises.length !== originalDay.exercises.length) {
      return true;
    }
    return originalDay.exercises.some((originalExercise, exerciseIndex) => {
      const exercise = day.exercises[exerciseIndex];
      return (
        !exercise ||
        exercise.exerciseId !== originalExercise.exerciseId ||
        exercise.sets !== originalExercise.sets ||
        exercise.repsMin !== originalExercise.repsMin ||
        exercise.repsMax !== originalExercise.repsMax ||
        exercise.restSeconds !== originalExercise.restSeconds
      );
    });
  });
}

/**
 * Converts the reviewed proposal into the payload of `POST /programs`.
 *
 * Only data that exists in the proposal travels: no identifier is invented and
 * the backend validates every exercise again before saving.
 */
export function toProgramDraft(
  proposal: WorkoutProposal,
  name: string,
  days: ProposedDay[],
  splitType?: SplitType
): ProgramDraft {
  const description = proposal.explanation
    .trim()
    .slice(0, PROPOSAL_LIMITS.maxDescriptionLength);

  return {
    name: name.trim().slice(0, PROPOSAL_LIMITS.maxNameLength),
    description,
    goal: proposal.goal,
    splitType: splitType ?? proposal.splitType,
    days: days.map((day) => ({
      name: day.name.trim(),
      exercises: day.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        targetSets: clamp(
          exercise.sets,
          PROPOSAL_LIMITS.minSets,
          PROPOSAL_LIMITS.maxSets
        ),
        targetRepsMin: clamp(
          exercise.repsMin,
          PROPOSAL_LIMITS.minReps,
          PROPOSAL_LIMITS.maxReps
        ),
        targetRepsMax: clamp(
          exercise.repsMax,
          PROPOSAL_LIMITS.minReps,
          PROPOSAL_LIMITS.maxReps
        ),
        restSeconds: clamp(
          exercise.restSeconds,
          PROPOSAL_LIMITS.minRestSeconds,
          PROPOSAL_LIMITS.maxRestSeconds
        ),
      })),
    })),
  };
}
