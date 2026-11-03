import {
  buildSplitExercises,
  splitBlueprintDays,
} from '../src/features/programs/splitBlueprints';
import { dayCountOptions } from '../src/features/programs/splitPlan';
import { MOCK_EXERCISES } from '../src/mocks/exercises';
import { SPLIT_TYPES, type SplitType } from '../src/types/program';

const ALL_SPLITS = Object.values(SPLIT_TYPES) as SplitType[];
const CATALOGUE_IDS = new Set(MOCK_EXERCISES.map((exercise) => exercise.id));

describe('split exercise blueprints', () => {
  it('fills every day of every accepted split except the custom one', () => {
    ALL_SPLITS.forEach((split) => {
      dayCountOptions(split).forEach((dayCount) => {
        const { days, missing } = buildSplitExercises(
          split,
          dayCount,
          MOCK_EXERCISES
        );

        expect(days).toHaveLength(dayCount);
        expect(missing).toEqual([]);

        if (split === 'CUSTOM') {
          // The custom split belongs to the user: nothing is pre-selected.
          days.forEach((day) => expect(day).toEqual([]));
          return;
        }

        days.forEach((day) => {
          // A day with no exercise would recreate the empty program bug.
          expect(day.length).toBeGreaterThan(0);
          day.forEach((exercise) => {
            expect(CATALOGUE_IDS.has(exercise.exerciseId)).toBe(true);
            expect(exercise.targetSets).toBeGreaterThan(0);
            expect(exercise.targetRepsMin).toBeGreaterThan(0);
            expect(exercise.targetRepsMax).toBeGreaterThanOrEqual(
              exercise.targetRepsMin
            );
          });
        });
      });
    });
  });

  it('cycles the full body blueprint across the lettered full body days', () => {
    const threeDays = splitBlueprintDays('FULL_BODY', 3);
    const sixDays = splitBlueprintDays('FULL_BODY', 6);
    expect(threeDays).toHaveLength(3);
    expect(sixDays).toHaveLength(3);

    const { days } = buildSplitExercises('FULL_BODY', 6, MOCK_EXERCISES);
    expect(days).toHaveLength(6);
    // Day 4 repeats the exercises of day 1.
    expect(days[3]!.map((exercise) => exercise.exerciseId)).toEqual(
      days[0]!.map((exercise) => exercise.exerciseId)
    );
  });

  it('never invents ids for exercises missing from the catalogue', () => {
    const { days, missing } = buildSplitExercises('AB', 2, []);

    expect(days).toEqual([[], []]);
    expect(missing).toContain('Supino reto com barra');
  });

  it('reuses the catalogue templates for the splits they already cover', () => {
    // The six-day PPL template has seven exercises per session.
    const { days } = buildSplitExercises('PPL', 6, MOCK_EXERCISES);
    expect(days).toHaveLength(6);
    expect(days[0]).toHaveLength(7);
    expect(days[5]).toHaveLength(7);
  });
});
