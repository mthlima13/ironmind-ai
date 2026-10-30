import { buildProgramInput } from '../src/features/programs/programPayload';
import type {
  ProgramDay,
  ProgramExercise,
  WorkoutProgram,
} from '../src/types/program';
import type { Exercise } from '../src/types/exercise';

const exercise: Exercise = {
  id: 'ex-1',
  name: 'Supino reto com barra',
  description: '',
  primaryMuscleGroup: 'Peito',
  secondaryMuscleGroups: [],
  equipment: 'Barra',
  instructions: '',
  movementType: 'COMPOUND',
  isSystem: true,
};

function programExercise(
  id: string,
  position: number,
  overrides: Partial<ProgramExercise> = {}
): ProgramExercise {
  return {
    id,
    exerciseId: `exercise-${id}`,
    exercise,
    position,
    targetSets: 3,
    targetRepsMin: 8,
    targetRepsMax: 12,
    restSeconds: 90,
    ...overrides,
  };
}

function programDay(id: string, position: number, exercises: ProgramExercise[]): ProgramDay {
  return {
    id,
    programId: 'program-1',
    name: `Dia ${position}`,
    position,
    exercises,
  };
}

function savedProgram(days: ProgramDay[]): WorkoutProgram {
  return {
    id: 'program-1',
    name: 'Meu programa',
    description: 'Descrição',
    goal: 'HYPERTROPHY',
    splitType: 'AB',
    isArchived: false,
    days,
    createdAt: '2026-10-01T12:00:00.000Z',
  };
}

describe('buildProgramInput', () => {
  it('sends every day of the program in the stored order', () => {
    const program = savedProgram([
      programDay('day-b', 2, [programExercise('b1', 1)]),
      programDay('day-a', 1, [programExercise('a1', 1)]),
    ]);

    const input = buildProgramInput(program);

    expect(input.name).toBe('Meu programa');
    expect(input.splitType).toBe('AB');
    // The backend replaces the whole structure and derives the positions from
    // the order of the payload, so nothing may be omitted.
    expect(input.days.map((day) => day.name)).toEqual(['Dia 2', 'Dia 1']);
  });

  it('replaces only the edited day and keeps the others untouched', () => {
    const program = savedProgram([
      programDay('day-a', 1, [programExercise('a1', 1)]),
      programDay('day-b', 2, [programExercise('b1', 1)]),
    ]);
    const edited: ProgramDay = {
      ...program.days[1]!,
      name: 'Novo nome',
      exercises: [programExercise('b2', 1, { targetSets: 5 })],
    };

    const input = buildProgramInput(program, edited);

    expect(input.days[0]!.name).toBe('Dia 1');
    expect(input.days[1]!).toEqual({
      name: 'Novo nome',
      exercises: [
        {
          exerciseId: 'exercise-b2',
          targetSets: 5,
          targetRepsMin: 8,
          targetRepsMax: 12,
          restSeconds: 90,
          notes: undefined,
        },
      ],
    });
  });

  it('orders the exercises by position and keeps the notes', () => {
    const program = savedProgram([
      programDay('day-a', 1, [
        programExercise('second', 2, { notes: 'Última série leve' }),
        programExercise('first', 1),
      ]),
    ]);

    const [day] = buildProgramInput(program).days;

    expect(day!.exercises.map((exercise) => exercise.exerciseId)).toEqual([
      'exercise-first',
      'exercise-second',
    ]);
    expect(day!.exercises[1]!.notes).toBe('Última série leve');
  });

  it('uses an empty description when the program has none', () => {
    const program = { ...savedProgram([]), description: undefined as unknown as string };

    expect(buildProgramInput(program).description).toBe('');
  });
});
