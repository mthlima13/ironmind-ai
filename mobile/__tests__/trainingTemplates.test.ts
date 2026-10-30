import { MOCK_EXERCISES } from '../src/mocks/exercises';
import { SPLIT_DAY_COUNTS } from '../src/types/program';
import { TRAINING_EXPERIENCE } from '../src/types/user';
import {
  PROGRAM_LEVELS,
  PROGRAM_TEMPLATES,
  buildTemplateProgramInput,
  filterProgramTemplates,
  findProgramTemplate,
  normalizeExerciseName,
  resolveTemplateDay,
  resolveTemplateExercise,
} from '../src/features/programs/trainingTemplates';

describe('catalogue templates of the Treinos tab', () => {
  it('uses only day counts accepted by the split', () => {
    PROGRAM_TEMPLATES.forEach((template) => {
      // A copy sends these days straight to POST /programs: a count outside
      // the table of the backend would fail with 422.
      expect(SPLIT_DAY_COUNTS[template.splitType]).toContain(
        template.days.length
      );
      expect(template.days.length).toBeGreaterThan(0);
    });
  });

  it('has unique ids and at least one model per level', () => {
    const ids = PROGRAM_TEMPLATES.map((template) => template.id);

    expect(new Set(ids).size).toBe(ids.length);
    PROGRAM_LEVELS.forEach((level) => {
      expect(filterProgramTemplates(level).length).toBeGreaterThan(0);
    });
  });

  it('filters the models by level without losing any of them', () => {
    expect(filterProgramTemplates('ALL')).toEqual(PROGRAM_TEMPLATES);

    const byLevel = PROGRAM_LEVELS.flatMap((level) =>
      filterProgramTemplates(level)
    );
    expect(byLevel.map((template) => template.id).sort()).toEqual(
      PROGRAM_TEMPLATES.map((template) => template.id).sort()
    );
    byLevel.forEach((template) => {
      expect(PROGRAM_LEVELS).toContain(template.level);
    });
  });

  it('finds a model by id', () => {
    const [first] = PROGRAM_TEMPLATES;

    expect(findProgramTemplate(first!.id)).toBe(first);
    expect(findProgramTemplate('missing')).toBeUndefined();
  });
});

describe('training structure of the models', () => {
  it('offers 6 to 8 exercises in every session', () => {
    PROGRAM_TEMPLATES.forEach((template) => {
      template.days.forEach((day) => {
        expect(day.exercises.length).toBeGreaterThanOrEqual(6);
        expect(day.exercises.length).toBeLessThanOrEqual(8);
      });
    });
  });

  it('does not repeat an exercise inside the same session', () => {
    PROGRAM_TEMPLATES.forEach((template) => {
      template.days.forEach((day) => {
        const names = day.exercises.map((exercise) =>
          normalizeExerciseName(exercise.name)
        );

        expect(new Set(names).size).toBe(names.length);
      });
    });
  });

  it('keeps the series and repetitions inside the backend limits', () => {
    PROGRAM_TEMPLATES.forEach((template) => {
      template.days.forEach((day) => {
        day.exercises.forEach((exercise) => {
          expect(exercise.targetSets).toBeGreaterThanOrEqual(1);
          expect(exercise.targetSets).toBeLessThanOrEqual(50);
          expect(exercise.targetRepsMin).toBeGreaterThanOrEqual(1);
          expect(exercise.targetRepsMax).toBeGreaterThanOrEqual(
            exercise.targetRepsMin
          );
          expect(exercise.restSeconds).toBeGreaterThanOrEqual(0);
          expect(exercise.restSeconds).toBeLessThanOrEqual(600);
        });
      });
    });
  });

  it('matches the stated level with the weekly structure', () => {
    PROGRAM_TEMPLATES.filter(
      (template) => template.level === TRAINING_EXPERIENCE.BEGINNER
    ).forEach((template) => {
      // Beginners stay on two to three sets per exercise (ACSM 2026).
      template.days.forEach((day) => {
        day.exercises.forEach((exercise) => {
          expect(exercise.targetSets).toBeLessThanOrEqual(3);
        });
      });
    });

    PROGRAM_TEMPLATES.filter(
      (template) => template.level !== TRAINING_EXPERIENCE.BEGINNER
    ).forEach((template) => {
      const heaviestDay = Math.max(
        ...template.days.map((day) =>
          Math.max(...day.exercises.map((exercise) => exercise.targetSets))
        )
      );

      expect(heaviestDay).toBeGreaterThanOrEqual(4);
    });
  });

  it('keeps the ABC chest and triceps day with three exercises of each', () => {
    const template = findProgramTemplate('template-abc-intermediario');
    const chestAndTriceps = template?.days[0];

    expect(chestAndTriceps).toBeDefined();

    const resolved = resolveTemplateDay(chestAndTriceps!, MOCK_EXERCISES);
    const countByGroup = (group: string) =>
      resolved.exercises.filter(
        ({ exercise }) => exercise.primaryMuscleGroup === group
      ).length;

    expect(resolved.missing).toEqual([]);
    expect(countByGroup('Peito')).toBe(3);
    expect(countByGroup('Tríceps')).toBe(3);
  });
});

describe('exercise resolution of a template', () => {
  it('matches the catalogue ignoring case and accents', () => {
    expect(normalizeExerciseName('  Tríceps na CORDA ')).toBe('triceps na corda');

    const exercise = resolveTemplateExercise(
      'TRÍCEPS NA CORDA',
      MOCK_EXERCISES
    );
    expect(exercise?.id).toBe('ex-triceps-corda');
  });

  it('falls back to the aliases of the mock catalogue', () => {
    expect(resolveTemplateExercise('Agachamento goblin', MOCK_EXERCISES)?.id).toBe(
      'ex-agachamento-goblet'
    );
    expect(resolveTemplateExercise('Prancha', MOCK_EXERCISES)?.id).toBe(
      'ex-prancha'
    );
    expect(resolveTemplateExercise('Esteira', MOCK_EXERCISES)?.id).toBe(
      'ex-corrida-banda'
    );
  });

  it('reports an unknown exercise instead of inventing an id', () => {
    expect(resolveTemplateExercise('Exercício inventado', MOCK_EXERCISES)).toBeNull();
    expect(resolveTemplateExercise('Agachamento goblin', [])).toBeNull();
  });
});

describe('copy payload of a template', () => {
  it('resolves every template against the mock catalogue', () => {
    PROGRAM_TEMPLATES.forEach((template) => {
      const { input, missing } = buildTemplateProgramInput(
        template,
        MOCK_EXERCISES
      );

      expect(missing).toEqual([]);
      expect(input.name).toBe(template.name);
      expect(input.splitType).toBe(template.splitType);
      expect(input.days).toHaveLength(template.days.length);

      input.days.forEach((day, dayIndex) => {
        const source = template.days[dayIndex]!;
        expect(day.name).toBe(source.name);
        expect(day.exercises).toHaveLength(source.exercises.length);
        day.exercises.forEach((exercise, exerciseIndex) => {
          // The id must come from the catalogue, never from the template.
          expect(
            MOCK_EXERCISES.some((item) => item.id === exercise.exerciseId)
          ).toBe(true);
          expect(exercise.targetSets).toBe(
            source.exercises[exerciseIndex]!.targetSets
          );
        });
      });
    });
  });

  it('reports the names that are missing instead of silently dropping them', () => {
    const template = PROGRAM_TEMPLATES[0]!;
    const exerciseCount = template.days.reduce(
      (total, day) => total + day.exercises.length,
      0
    );

    const { input, missing } = buildTemplateProgramInput(template, []);

    expect(missing).toHaveLength(exerciseCount);
    expect(input.days.every((day) => day.exercises.length === 0)).toBe(true);
  });
});
