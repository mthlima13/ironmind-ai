import type { TrainingGoal } from './user';

/** Lifecycle of an AI recommendation (SPEC 12.2). */
export const RECOMMENDATION_STATUSES = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  EDITED: 'EDITED',
  REJECTED: 'REJECTED',
  ERROR: 'ERROR',
} as const;

export type RecommendationStatus =
  (typeof RECOMMENDATION_STATUSES)[keyof typeof RECOMMENDATION_STATUSES];

/** Decisions the user can record during the review (SPEC 12.3). */
export const RECOMMENDATION_DECISIONS = {
  ACCEPTED: 'ACCEPTED',
  EDITED: 'EDITED',
  REJECTED: 'REJECTED',
} as const;

export type RecommendationDecision =
  (typeof RECOMMENDATION_DECISIONS)[keyof typeof RECOMMENDATION_DECISIONS];

/** Exercise of a validated workout proposal. */
export type ProposedExercise = {
  exerciseId: string;
  name: string;
  primaryMuscleGroup: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
};

/** Day of a validated workout proposal. */
export type ProposedDay = {
  name: string;
  exercises: ProposedExercise[];
};

/**
 * Workout proposal returned by the backend (SPEC 12.2).
 *
 * It is only a suggestion: nothing is saved as a program until the user
 * reviews, edits and saves it through the program endpoint.
 */
export type WorkoutProposal = {
  recommendationId: string;
  status: RecommendationStatus;
  model: string;
  name: string;
  goal: TrainingGoal;
  days: ProposedDay[];
  explanation: string;
  warnings: string[];
  disclaimer: string;
};

/** What the user asks on the proposal form. */
export type WorkoutProposalInput = {
  prompt: string;
  trainingDays?: number | null;
  goal?: TrainingGoal | null;
};

/** Decision recorded on a reviewed recommendation. */
export type RecommendationDecisionInput = {
  status: RecommendationDecision;
  programId?: string | null;
};

export type RecommendationDecisionResult = {
  id: string;
  status: RecommendationStatus;
  acceptedAt: string | null;
  savedProgramId: string | null;
};
