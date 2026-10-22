import type { WorkoutProgram } from '../types/program';
import { findMockExercise } from './exercises';

function programExercise(
  id: string,
  exerciseId: string,
  position: number,
  targetSets: number,
  targetRepsMin: number,
  targetRepsMax: number,
  restSeconds: number
) {
  const exercise = findMockExercise(exerciseId);
  if (!exercise) {
    throw new Error(`Unknown mock exercise: ${exerciseId}`);
  }
  return {
    id,
    exerciseId,
    exercise,
    position,
    targetSets,
    targetRepsMin,
    targetRepsMax,
    restSeconds,
  };
}

export const MOCK_PROGRAMS: WorkoutProgram[] = [
  {
    id: 'prg-ppl',
    name: 'Push / Pull / Legs',
    description: 'Divisão de 4 dias focando em volume e progressão de carga.',
    goal: 'HYPERTROPHY',
    splitType: 'PPL',
    isArchived: false,
    createdAt: '2026-09-01T12:00:00.000Z',
    days: [
      {
        id: 'day-push',
        programId: 'prg-ppl',
        name: 'Peito e tríceps',
        position: 1,
        exercises: [
          programExercise('pex-1', 'ex-supino-reto', 1, 4, 6, 8, 150),
          programExercise('pex-2', 'ex-supino-inclinado', 2, 3, 8, 12, 120),
          programExercise('pex-3', 'ex-triceps-corda', 3, 3, 10, 15, 90),
        ],
      },
      {
        id: 'day-pull',
        programId: 'prg-ppl',
        name: 'Costas e bíceps',
        position: 2,
        exercises: [
          programExercise('pex-4', 'ex-puxada-frontal', 1, 4, 8, 12, 120),
          programExercise('pex-5', 'ex-remo-caverna', 2, 4, 8, 12, 120),
          programExercise('pex-6', 'ex-rosca-barra', 3, 3, 10, 12, 90),
        ],
      },
      {
        id: 'day-legs',
        programId: 'prg-ppl',
        name: 'Pernas',
        position: 3,
        exercises: [
          programExercise('pex-7', 'ex-agachamento-goblet', 1, 4, 8, 12, 150),
          programExercise('pex-8', 'ex-levantamento-terra', 2, 3, 8, 10, 150),
          programExercise('pex-9', 'ex-hip-flexao', 3, 3, 12, 15, 90),
        ],
      },
    ],
  },
  {
    id: 'prg-upper-lower',
    name: 'Upper / Lower',
    description: 'Alternância superior/inferior para 4 dias por semana.',
    goal: 'STRENGTH',
    splitType: 'UPPER_LOWER',
    isArchived: false,
    createdAt: '2026-09-05T12:00:00.000Z',
    days: [
      {
        id: 'day-upper',
        programId: 'prg-upper-lower',
        name: 'Superior',
        position: 1,
        exercises: [
          programExercise('pex-10', 'ex-supino-reto', 1, 5, 5, 6, 180),
          programExercise('pex-11', 'ex-puxada-frontal', 2, 5, 5, 8, 180),
          programExercise('pex-12', 'ex-legacy-press', 3, 3, 6, 10, 120),
        ],
      },
      {
        id: 'day-lower',
        programId: 'prg-upper-lower',
        name: 'Inferior',
        position: 2,
        exercises: [
          programExercise('pex-13', 'ex-agachamento-goblet', 1, 5, 5, 8, 180),
          programExercise('pex-14', 'ex-levantamento-terra', 2, 4, 6, 10, 150),
          programExercise('pex-15', 'ex-prancha', 3, 3, 30, 60, 60),
        ],
      },
    ],
  },
];
