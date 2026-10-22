import type { Exercise } from './exercise';

export type WeeklySummary = {
  /** Total volume in kg, calculated by the backend. */
  totalVolumeKg: number;
  /** Number of completed sessions in the period. */
  completedSessions: number;
  /** Number of personal records broken in the period. */
  recordsBroken: number;
  /** Total working sets in the period. */
  totalSets: number;
  /** Average session duration in minutes. */
  averageSessionMinutes: number;
};

export type ActivityPoint = {
  /** ISO date (yyyy-MM-dd). */
  date: string;
  /** Volume in kg for that day, calculated by the backend. */
  volumeKg: number;
  completedSessions: number;
};

export type DashboardOverview = {
  summary: WeeklySummary;
  /** Volume of the current week compared to the previous one. */
  volumeChangePercent: number;
  activity: ActivityPoint[];
  lastSessionAt?: string;
  /** Sessions performed in the period, newest first. */
  recentSessions: {
    id: string;
    startedAt: string;
    completedAt?: string | null;
    programName?: string;
    volumeKg: number;
    totalSets: number;
  }[];
};

/** Evolution of a single exercise (SPEC RF-017). */
export type ExerciseProgressPoint = {
  date: string;
  /** Best working weight of the day, in kg. */
  bestWeightKg: number | null;
  /** Estimated 1RM for the day, in kg. */
  estimatedOneRepMaxKg: number | null;
  totalVolumeKg: number;
  sets: number;
};

export type ExerciseProgress = {
  exercise: Exercise;
  points: ExerciseProgressPoint[];
};
