import type { Exercise } from './exercise';
import type { TrainingGoal } from './user';

export const SPLIT_TYPES = {
  PPL: 'PPL',
  UPPER_LOWER: 'UPPER_LOWER',
  FULL_BODY: 'FULL_BODY',
  AB: 'AB',
  ABC: 'ABC',
  ABCD: 'ABCD',
  ABCDE: 'ABCDE',
  CUSTOM: 'CUSTOM',
  ARNOLD_SPLIT: 'ARNOLD_SPLIT',
  PHUL: 'PHUL',
  HYBRID_PPL_UPPER_LOWER: 'HYBRID_PPL_UPPER_LOWER',
} as const;

export type SplitType = (typeof SPLIT_TYPES)[keyof typeof SPLIT_TYPES];

export const SPLIT_TYPE_LABELS: Record<SplitType, string> = {
  PPL: 'Push / Pull / Legs',
  UPPER_LOWER: 'Upper / Lower',
  FULL_BODY: 'Full Body',
  AB: 'AB (Superior / Inferior)',
  ABC: 'Divisão Antagonista / Sinergista (ABC)',
  ABCD: 'ABCD (4 Dias)',
  ABCDE: 'Divisão por Músculo (ABCDE)',
  CUSTOM: 'Personalizado',
  ARNOLD_SPLIT: 'Arnold Split',
  PHUL: 'PHUL (Força e Hipertrofia)',
  HYBRID_PPL_UPPER_LOWER: 'Híbrido 5 Dias (PPL + Upper/Lower)',
};

/**
 * Number of days each split accepts, smallest first (SPEC 7.3).
 *
 * The list mirrors `SplitType.supportedDayCounts()` of the backend: a program
 * whose day count does not fit the split is rejected with `422`, so the form
 * only offers the counts listed here. `CUSTOM` accepts any count; the form
 * offers one to six days for it.
 */
export const SPLIT_DAY_COUNTS: Record<SplitType, number[]> = {
  PPL: [3, 6],
  UPPER_LOWER: [2, 4],
  FULL_BODY: [1, 2, 3, 4, 5, 6],
  AB: [2],
  ABC: [3],
  ABCD: [4],
  ABCDE: [5],
  ARNOLD_SPLIT: [3],
  PHUL: [4],
  HYBRID_PPL_UPPER_LOWER: [5],
  CUSTOM: [1, 2, 3, 4, 5, 6],
};

/**
 * Focus of each day of the split, in the order the days cycle. `CUSTOM` has no
 * plan, so the day names fall back to "Dia N".
 *
 * The names are the default used both by the mock proposal and by the manual
 * creation of a program; the user can rename any day afterwards.
 */
export const SPLIT_DAY_NAMES: Record<SplitType, string[]> = {
  PPL: [
    'Push (peito, ombros e tríceps)',
    'Pull (costas e bíceps)',
    'Legs (pernas e glúteos)',
  ],
  UPPER_LOWER: ['Superior', 'Inferior'],
  FULL_BODY: ['Corpo inteiro'],
  AB: ['Superior', 'Inferior'],
  ABC: ['Peito e tríceps', 'Costas e bíceps', 'Pernas e ombros'],
  ABCD: ['Peito e tríceps', 'Costas e bíceps', 'Pernas e glúteos', 'Ombros e braços'],
  ABCDE: ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços'],
  ARNOLD_SPLIT: ['Peito e costas', 'Ombros e braços', 'Pernas'],
  PHUL: [
    'Superior (força)',
    'Inferior (força)',
    'Superior (hipertrofia)',
    'Inferior (hipertrofia)',
  ],
  HYBRID_PPL_UPPER_LOWER: ['Push', 'Pull', 'Pernas', 'Superior', 'Inferior'],
  CUSTOM: [],
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
