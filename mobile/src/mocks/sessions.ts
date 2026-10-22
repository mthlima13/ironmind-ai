import type { ExerciseSet, SessionExercise, WorkoutSession } from '../types/workout';
import { findMockExercise } from './exercises';

function buildSets(
  sessionExerciseId: string,
  weightsKg: (number | null)[],
  repetitions: number[],
  rpe: number[]
): ExerciseSet[] {
  return weightsKg.map((weightKg, index) => ({
    id: `${sessionExerciseId}-set-${index + 1}`,
    setNumber: index + 1,
    weightKg,
    repetitions: repetitions[index] ?? 0,
    perceivedExertion: rpe[index] ?? null,
    completedAt: '2026-10-19T19:30:00.000Z',
  }));
}

function buildSessionExercise(
  id: string,
  exerciseId: string,
  position: number,
  weightsKg: (number | null)[],
  repetitions: number[],
  rpe: number[]
): SessionExercise {
  const exercise = findMockExercise(exerciseId);
  if (!exercise) {
    throw new Error(`Unknown mock exercise: ${exerciseId}`);
  }
  return {
    id,
    exerciseId,
    exercise,
    position,
    sets: buildSets(id, weightsKg, repetitions, rpe),
  };
}

export const MOCK_SESSIONS: WorkoutSession[] = [
  {
    id: 'ses-0003',
    programId: 'prg-ppl',
    programDayId: 'day-push',
    startedAt: '2026-10-19T18:40:00.000Z',
    completedAt: '2026-10-19T19:35:00.000Z',
    status: 'COMPLETED',
    exercises: [
      buildSessionExercise(
        'sex-1',
        'ex-supino-reto',
        1,
        [80, 82.5, 82.5, 80],
        [8, 8, 7, 8],
        [7, 8, 8, 9]
      ),
      buildSessionExercise(
        'sex-2',
        'ex-supino-inclinado',
        2,
        [28, 28, 30],
        [10, 10, 9],
        [8, 8, 9]
      ),
      buildSessionExercise(
        'sex-3',
        'ex-triceps-corda',
        3,
        [25, 25, 25],
        [12, 12, 11],
        [7, 8, 8]
      ),
    ],
  },
  {
    id: 'ses-0002',
    programId: 'prg-ppl',
    programDayId: 'day-pull',
    startedAt: '2026-10-17T18:10:00.000Z',
    completedAt: '2026-10-17T19:05:00.000Z',
    status: 'COMPLETED',
    exercises: [
      buildSessionExercise(
        'sex-4',
        'ex-puxada-frontal',
        1,
        [70, 72.5, 72.5, 70],
        [10, 10, 9, 10],
        [7, 8, 8, 8]
      ),
      buildSessionExercise(
        'sex-5',
        'ex-remo-caverna',
        2,
        [55, 55, 60],
        [12, 12, 10],
        [8, 8, 9]
      ),
    ],
  },
  {
    id: 'ses-0001',
    programId: 'prg-ppl',
    programDayId: 'day-legs',
    startedAt: '2026-10-15T19:00:00.000Z',
    completedAt: '2026-10-15T20:05:00.000Z',
    status: 'COMPLETED',
    exercises: [
      buildSessionExercise(
        'sex-6',
        'ex-agachamento-goblet',
        1,
        [50, 55, 55, 55],
        [10, 10, 10, 8],
        [7, 8, 8, 9]
      ),
      buildSessionExercise(
        'sex-7',
        'ex-levantamento-terra',
        2,
        [80, 85, 85],
        [10, 9, 9],
        [8, 8, 9]
      ),
    ],
  },
  {
    id: 'ses-0000',
    programId: 'prg-ppl',
    programDayId: 'day-push',
    startedAt: '2026-10-12T18:30:00.000Z',
    completedAt: '2026-10-12T19:20:00.000Z',
    status: 'COMPLETED',
    exercises: [
      buildSessionExercise(
        'sex-8',
        'ex-supino-reto',
        1,
        [77.5, 80, 80],
        [8, 8, 7],
        [7, 8, 8]
      ),
    ],
  },
];

/**
 * Values of the last session for each exercise, used by the quick fill
 * shortcut (SPEC RF-010).
 */
export const MOCK_LAST_SESSION_SETS: Record<string, ExerciseSet[]> =
  MOCK_SESSIONS.reduce<Record<string, ExerciseSet[]>>((accumulator, session) => {
    session.exercises.forEach((sessionExercise) => {
      const current = accumulator[sessionExercise.exerciseId];
      if (!current) {
        accumulator[sessionExercise.exerciseId] = sessionExercise.sets;
      }
    });
    return accumulator;
  }, {});
