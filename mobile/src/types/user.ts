export const USER_ROLES = {
  USER: 'USER',
  CREATOR: 'CREATOR',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const WEIGHT_UNITS = {
  KG: 'KG',
  LB: 'LB',
} as const;

export type WeightUnit = (typeof WEIGHT_UNITS)[keyof typeof WEIGHT_UNITS];

export const TRAINING_EXPERIENCE = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
} as const;

export type TrainingExperience =
  (typeof TRAINING_EXPERIENCE)[keyof typeof TRAINING_EXPERIENCE];

export const TRAINING_GOALS = {
  HYPERTROPHY: 'HYPERTROPHY',
  STRENGTH: 'STRENGTH',
  ENDURANCE: 'ENDURANCE',
  GENERAL: 'GENERAL',
} as const;

export type TrainingGoal = (typeof TRAINING_GOALS)[keyof typeof TRAINING_GOALS];

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type UserPreferences = {
  preferredUnits: WeightUnit;
  trainingExperience: TrainingExperience;
  goal: TrainingGoal;
  availableEquipment: string[];
  trainingDays: number;
  privacySettings: PrivacySettings;
};

export type PrivacySettings = {
  /** Profile visible to other users (SPEC RF-023, phase 3). */
  publicProfile: boolean;
  /** Personal records visible to other users. */
  showRecords: boolean;
  /** Allow sharing workout summaries. */
  allowSharing: boolean;
};

export type UserProfile = {
  user: AuthUser;
  preferences: UserPreferences;
  timezone: string;
};

/** Sensitive health data (SPEC 10.11 and RF-016). */
export type InjuryRestriction = {
  id: string;
  bodyRegion: string;
  description: string;
  isActive: boolean;
  /** Exercises the user asked to avoid. */
  exerciseIds: string[];
};

export type UpdateProfileInput = Partial<{
  name: string;
  preferences: Partial<UserPreferences>;
}>;
