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

/** Labels of the training experiences, used by every form of the app. */
export const TRAINING_EXPERIENCE_LABELS: Record<TrainingExperience, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
};

/** Labels of the training goals, used by every form of the app. */
export const TRAINING_GOAL_LABELS: Record<TrainingGoal, string> = {
  HYPERTROPHY: 'Hipertrofia',
  STRENGTH: 'Força',
  ENDURANCE: 'Resistência',
  GENERAL: 'Geral',
};

/**
 * Local identity of the user (SPEC 7.7).
 *
 * The backend has no account: the owner is the UUID sent on the identity
 * header. The name lives only in this app, as the label used by greetings
 * and forms; the account itself belongs to the future identity provider.
 */
export type UserIdentity = {
  id: string;
  name: string;
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

/**
 * Device-local profile (SPEC 10.1 and 10.2).
 *
 * It is never sent to the API: there is no profile endpoint. The values feed
 * the app forms and the AI request parameters sent explicitly by the client.
 */
export type UserProfile = {
  identity: UserIdentity;
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
