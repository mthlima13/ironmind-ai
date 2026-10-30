import type { CreateProgramInput, ProgramDay, WorkoutProgram } from '../../types/program';

/**
 * Builds the `PUT /programs/{id}` payload from a saved program.
 *
 * The backend replaces the whole structure and derives the positions from the
 * order of the lists (SPEC RF-005), so the payload always carries every day of
 * the program in the current order. When a day was edited, its draft replaces
 * the stored day with the same id; the other days are sent untouched.
 */
export function buildProgramInput(
  program: WorkoutProgram,
  updatedDay?: ProgramDay
): CreateProgramInput {
  return {
    name: program.name,
    description: program.description ?? '',
    goal: program.goal,
    splitType: program.splitType,
    days: program.days.map((currentDay) => {
      const source =
        updatedDay && currentDay.id === updatedDay.id ? updatedDay : currentDay;
      return {
        name: source.name,
        exercises: source.exercises
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((exercise) => ({
            exerciseId: exercise.exerciseId,
            targetSets: exercise.targetSets,
            targetRepsMin: exercise.targetRepsMin,
            targetRepsMax: exercise.targetRepsMax,
            restSeconds: exercise.restSeconds,
            notes: exercise.notes ?? undefined,
          })),
      };
    }),
  };
}
