export const MOVEMENT_TYPES = {
  COMPOUND: 'COMPOUND',
  ISOLATION: 'ISOLATION',
  CARDIO: 'CARDIO',
  ISOMETRIC: 'ISOMETRIC',
} as const;

export type MovementType = (typeof MOVEMENT_TYPES)[keyof typeof MOVEMENT_TYPES];

/**
 * Muscle groups known by the backend.
 *
 * The API stores the group as free text and the seeded catalogue uses the
 * labels below, so the app sends exactly the same values it receives
 * (SPEC 10.3).
 */
export const MUSCLE_GROUPS = {
  CHEST: 'Peito',
  BACK: 'Costas',
  SHOULDERS: 'Ombros',
  BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps',
  QUADRICEPS: 'Quadríceps',
  HAMSTRINGS: 'Posteriores de coxa',
  GLUTES: 'Glúteos',
  CALVES: 'Panturrilha',
  ABS: 'Abdômen',
  CARDIO: 'Cardio',
} as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[keyof typeof MUSCLE_GROUPS];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  [MUSCLE_GROUPS.CHEST]: 'Peito',
  [MUSCLE_GROUPS.BACK]: 'Costas',
  [MUSCLE_GROUPS.SHOULDERS]: 'Ombros',
  [MUSCLE_GROUPS.BICEPS]: 'Bíceps',
  [MUSCLE_GROUPS.TRICEPS]: 'Tríceps',
  [MUSCLE_GROUPS.QUADRICEPS]: 'Quadríceps',
  [MUSCLE_GROUPS.HAMSTRINGS]: 'Posteriores de coxa',
  [MUSCLE_GROUPS.GLUTES]: 'Glúteos',
  [MUSCLE_GROUPS.CALVES]: 'Panturrilha',
  [MUSCLE_GROUPS.ABS]: 'Abdômen',
  [MUSCLE_GROUPS.CARDIO]: 'Cardio',
};

/** Exercise catalogue entry (SPEC 10.3). */
export type Exercise = {
  id: string;
  name: string;
  description: string;
  primaryMuscleGroup: MuscleGroup;
  /** Free text groups: the backend keeps the label the catalogue was seeded with. */
  secondaryMuscleGroups: string[];
  equipment: string;
  instructions: string;
  movementType: MovementType;
  /** True for the global catalogue seeded by the backend. */
  isSystem: boolean;
};

export type ExerciseFilters = {
  search?: string;
  muscleGroup?: MuscleGroup | 'ALL';
};

export type CreateExerciseInput = {
  name: string;
  description?: string | null;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups?: string[];
  equipment: string;
  instructions?: string | null;
  movementType: MovementType;
};
