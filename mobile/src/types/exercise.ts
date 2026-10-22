export const MOVEMENT_TYPES = {
  COMPOUND: 'COMPOUND',
  ISOLATION: 'ISOLATION',
  CARDIO: 'CARDIO',
  ISOMETRIC: 'ISOMETRIC',
} as const;

export type MovementType = (typeof MOVEMENT_TYPES)[keyof typeof MOVEMENT_TYPES];

export const MUSCLE_GROUPS = {
  CHEST: 'CHEST',
  BACK: 'BACK',
  SHOULDERS: 'SHOULDERS',
  ARMS: 'ARMS',
  LEGS: 'LEGS',
  CORE: 'CORE',
  CARDIO: 'CARDIO',
  FULL_BODY: 'FULL_BODY',
} as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[keyof typeof MUSCLE_GROUPS];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  CHEST: 'Peito',
  BACK: 'Costas',
  SHOULDERS: 'Ombros',
  ARMS: 'Braços',
  LEGS: 'Pernas',
  CORE: 'Core',
  CARDIO: 'Cardio',
  FULL_BODY: 'Corpo inteiro',
};

/** Exercise catalogue entry (SPEC 10.3). */
export type Exercise = {
  id: string;
  name: string;
  description: string;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
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
  description?: string;
  primaryMuscleGroup: MuscleGroup;
  equipment?: string;
  movementType?: MovementType;
};
