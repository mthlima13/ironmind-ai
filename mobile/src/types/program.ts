import type { Exercise } from './exercise';
import type { TrainingGoal } from './user';

export const SPLIT_TYPES = {
  PPL: 'PPL',
  UPPER_LOWER: 'UPPER_LOWER',
  FULL_BODY: 'FULL_BODY',
  CUSTOM: 'CUSTOM',
  ABCDE: 'ABCDE',
  ABC: 'ABC',
  ARNOLD_SPLIT: 'ARNOLD_SPLIT',
  PHUL: 'PHUL',
  HYBRID_PPL_UPPER_LOWER: 'HYBRID_PPL_UPPER_LOWER',
} as const;

export type SplitType = (typeof SPLIT_TYPES)[keyof typeof SPLIT_TYPES];

export const SPLIT_TYPE_LABELS: Record<SplitType, string> = {
  PPL: 'Push / Pull / Legs',
  UPPER_LOWER: 'Upper / Lower',
  FULL_BODY: 'Full Body',
  CUSTOM: 'Personalizado',
  ABCDE: 'Divisão por Músculo (ABCDE)',
  ABC: 'Divisão Antagonista / Sinergista (ABC)',
  ARNOLD_SPLIT: 'Arnold Split',
  PHUL: 'PHUL (Força e Hipertrofia)',
  HYBRID_PPL_UPPER_LOWER: 'Híbrido 5 Dias (PPL + Upper/Lower)',
};

/** Program exercise entry (SPEC 10.6). */
export type ProgramExercise = {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  position: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
  notes?: string;
};

/** Program day (SPEC 10.5). */
export type ProgramDay = {
  id: string;
  programId: string;
  name: string;
  position: number;
  exercises: ProgramExercise[];
};

/** Workout program (SPEC 10.4). */
export type WorkoutProgram = {
  id: string;
  name: string;
  description: string;
  goal: TrainingGoal;
  splitType: SplitType;
  isArchived: boolean;
  days: ProgramDay[];
  createdAt: string;
};

export type ProgramExerciseDraft = {
  exerciseId: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
  notes?: string;
};

export type ProgramDayDraft = {
  id?: string;
  name: string;
  exercises: ProgramExerciseDraft[];
};

/** Payload used to create a program (SPEC RF-005). */
export type CreateProgramInput = {
  name: string;
  description: string;
  goal: TrainingGoal;
  splitType: SplitType;
  days: ProgramDayDraft[];
};
