import type { DashboardOverview, ExerciseProgress } from '../types/analytics';
import type { PersonalRecord } from '../types/records';
import { findMockExercise } from './exercises';

export const MOCK_DASHBOARD: DashboardOverview = {
  summary: {
    totalVolumeKg: 24850,
    completedSessions: 4,
    recordsBroken: 2,
    totalSets: 46,
    averageSessionMinutes: 52,
  },
  volumeChangePercent: 12.4,
  lastSessionAt: '2026-10-19T19:35:00.000Z',
  activity: [
    { date: '2026-10-13', volumeKg: 5200, completedSessions: 1 },
    { date: '2026-10-15', volumeKg: 7840, completedSessions: 1 },
    { date: '2026-10-17', volumeKg: 6210, completedSessions: 1 },
    { date: '2026-10-19', volumeKg: 5600, completedSessions: 1 },
  ],
  recentSessions: [
    {
      id: 'ses-0003',
      startedAt: '2026-10-19T18:40:00.000Z',
      completedAt: '2026-10-19T19:35:00.000Z',
      programName: 'Push / Pull / Legs',
      volumeKg: 5600,
      totalSets: 10,
    },
    {
      id: 'ses-0002',
      startedAt: '2026-10-17T18:10:00.000Z',
      completedAt: '2026-10-17T19:05:00.000Z',
      programName: 'Push / Pull / Legs',
      volumeKg: 6210,
      totalSets: 7,
    },
    {
      id: 'ses-0001',
      startedAt: '2026-10-15T19:00:00.000Z',
      completedAt: '2026-10-15T20:05:00.000Z',
      programName: 'Push / Pull / Legs',
      volumeKg: 7840,
      totalSets: 7,
    },
    {
      id: 'ses-0000',
      startedAt: '2026-10-12T18:30:00.000Z',
      completedAt: '2026-10-12T19:20:00.000Z',
      programName: 'Push / Pull / Legs',
      volumeKg: 5200,
      totalSets: 3,
    },
  ],
};

export const MOCK_RECORDS: PersonalRecord[] = [
  {
    id: 'rec-1',
    exerciseId: 'ex-supino-reto',
    exerciseName: 'Supino reto com barra',
    recordType: 'MAX_WEIGHT',
    value: 82.5,
    unit: 'kg',
    achievedAt: '2026-10-19T19:10:00.000Z',
  },
  {
    id: 'rec-2',
    exerciseId: 'ex-supino-reto',
    exerciseName: 'Supino reto com barra',
    recordType: 'BEST_ESTIMATED_1RM',
    value: 96.4,
    unit: 'kg (estimado)',
    achievedAt: '2026-10-19T19:10:00.000Z',
  },
  {
    id: 'rec-3',
    exerciseId: 'ex-puxada-frontal',
    exerciseName: 'Puxada frontal',
    recordType: 'MAX_WEIGHT',
    value: 72.5,
    unit: 'kg',
    achievedAt: '2026-10-17T18:45:00.000Z',
  },
  {
    id: 'rec-4',
    exerciseId: 'ex-agachamento-goblet',
    exerciseName: 'Agachamento goblet',
    recordType: 'MAX_REPS_AT_WEIGHT',
    value: 10,
    unit: 'reps',
    achievedAt: '2026-10-15T19:30:00.000Z',
  },
];

export const MOCK_EXERCISE_PROGRESS: Record<string, ExerciseProgress> = {
  'ex-supino-reto': {
    exercise: findMockExercise('ex-supino-reto')!,
    points: [
      {
        date: '2026-09-28',
        bestWeightKg: 72.5,
        estimatedOneRepMaxKg: 84.4,
        totalVolumeKg: 2140,
        sets: 4,
      },
      {
        date: '2026-10-05',
        bestWeightKg: 75,
        estimatedOneRepMaxKg: 87.2,
        totalVolumeKg: 2250,
        sets: 4,
      },
      {
        date: '2026-10-12',
        bestWeightKg: 80,
        estimatedOneRepMaxKg: 93.1,
        totalVolumeKg: 2360,
        sets: 3,
      },
      {
        date: '2026-10-19',
        bestWeightKg: 82.5,
        estimatedOneRepMaxKg: 96.4,
        totalVolumeKg: 2600,
        sets: 4,
      },
    ],
  },
  'ex-agachamento-goblet': {
    exercise: findMockExercise('ex-agachamento-goblet')!,
    points: [
      {
        date: '2026-10-01',
        bestWeightKg: 45,
        estimatedOneRepMaxKg: 57.9,
        totalVolumeKg: 1800,
        sets: 4,
      },
      {
        date: '2026-10-08',
        bestWeightKg: 50,
        estimatedOneRepMaxKg: 64.3,
        totalVolumeKg: 1950,
        sets: 4,
      },
      {
        date: '2026-10-15',
        bestWeightKg: 55,
        estimatedOneRepMaxKg: 70.8,
        totalVolumeKg: 2100,
        sets: 4,
      },
    ],
  },
};
