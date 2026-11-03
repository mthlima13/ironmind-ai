import type { Exercise } from '../../types/exercise';
import type { ProgramExerciseDraft, SplitType } from '../../types/program';
import {
  PROGRAM_TEMPLATES,
  resolveTemplateExercise,
  type TemplateDay,
} from './trainingTemplates';

/**
 * Exercises pre-filled when a program is created from a split (SPEC RF-005).
 *
 * The manual form used to create every day empty, which made the new program
 * useless until the user filled four to six days by hand. The blueprints below
 * give each modality the exercises that match its focus, always resolved
 * against the canonical catalogue: the app never invents an exercise id.
 *
 * Whenever a catalogue template already covers the split and day count, it is
 * reused as the blueprint so the two creation paths stay consistent. The
 * remaining combinations get a local blueprint, and the splits without a fixed
 * focus (`FULL_BODY` with other counts and `CUSTOM`) cycle the full body days.
 */

/** Exercises of a template, looked up once at module load. */
function templateDays(templateId: string): TemplateDay[] {
  return PROGRAM_TEMPLATES.find((template) => template.id === templateId)?.days ?? [];
}

/** Templates that already match a split and day count exactly. */
const TEMPLATE_BY_PAIR: Partial<Record<string, string>> = {
  'FULL_BODY:3': 'template-full-body-iniciante',
  'AB:2': 'template-ab-iniciante',
  'ABC:3': 'template-abc-intermediario',
  'UPPER_LOWER:4': 'template-upper-lower-intermediario',
  'PPL:3': 'template-ppl-intermediario',
  'PPL:6': 'template-ppl6-avancado',
  'ARNOLD_SPLIT:3': 'template-arnold-avancado',
  'PHUL:4': 'template-phul-avancado',
  'ABCDE:5': 'template-abcde-avancado',
};

/** Full body days used by the splits without a fixed focus. */
const FULL_BODY_DAYS = templateDays('template-full-body-iniciante');

/** Blueprints for the pairs the templates above do not cover. */
const EXTRA_BLUEPRINTS: Partial<Record<string, TemplateDay[]>> = {
  'UPPER_LOWER:2': [
    {
      name: 'Superior',
      exercises: [
        { name: 'Supino reto com barra', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 },
        { name: 'Puxada frontal', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 },
        { name: 'Remada baixa na polia', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 90 },
        { name: 'Desenvolvimento com halteres sentado', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 },
        { name: 'Elevação lateral com halteres', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
        { name: 'Rosca direta com barra', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 60 },
        { name: 'Tríceps na polia com corda', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, restSeconds: 60 },
      ],
    },
    {
      name: 'Inferior',
      exercises: [
        { name: 'Agachamento livre com barra', targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, restSeconds: 120 },
        { name: 'Levantamento terra romeno', targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120 },
        { name: 'Leg press 45 graus', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 120 },
        { name: 'Cadeira extensora', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
        { name: 'Mesa flexora', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, restSeconds: 60 },
        { name: 'Panturrilha em pé na máquina', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
        { name: 'Abdominal na máquina', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 45 },
      ],
    },
  ],
  'ABCD:4': [
    {
      name: 'Peito e tríceps',
      exercises: [
        { name: 'Supino reto com barra', targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, restSeconds: 120 },
        { name: 'Supino inclinado com halteres', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 },
        { name: 'Crucifixo na polia', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
        { name: 'Tríceps na polia com corda', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, restSeconds: 60 },
        { name: 'Tríceps testa com barra', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 },
        { name: 'Tríceps na polia baixa', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 45 },
      ],
    },
    {
      name: 'Costas e bíceps',
      exercises: [
        { name: 'Puxada frontal', targetSets: 4, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 },
        { name: 'Remada curvada', targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, restSeconds: 120 },
        { name: 'Remada baixa na polia', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 90 },
        { name: 'Pullover na polia', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
        { name: 'Rosca direta com barra', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 60 },
        { name: 'Rosca alternada com halteres', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 60 },
        { name: 'Rosca martelo', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 45 },
      ],
    },
    {
      name: 'Pernas e glúteos',
      exercises: [
        { name: 'Agachamento livre com barra', targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, restSeconds: 120 },
        { name: 'Leg press 45 graus', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 120 },
        { name: 'Levantamento terra romeno', targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120 },
        { name: 'Cadeira extensora', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
        { name: 'Mesa flexora', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, restSeconds: 60 },
        { name: 'Elevação pélvica com barra', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 60 },
        { name: 'Panturrilha em pé na máquina', targetSets: 4, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
        { name: 'Panturrilha sentado', targetSets: 3, targetRepsMin: 12, targetRepsMax: 20, restSeconds: 60 },
      ],
    },
    {
      name: 'Ombros e braços',
      exercises: [
        { name: 'Desenvolvimento com barra em pé', targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, restSeconds: 120 },
        { name: 'Elevação lateral com halteres', targetSets: 4, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
        { name: 'Elevação lateral na polia', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
        { name: 'Face pull na polia', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
        { name: 'Rosca direta com barra', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 60 },
        { name: 'Rosca alternada com halteres', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 60 },
        { name: 'Tríceps testa com barra', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 },
        { name: 'Tríceps na polia com corda', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, restSeconds: 60 },
      ],
    },
  ],
  'HYBRID_PPL_UPPER_LOWER:5': [
    ...templateDays('template-ppl-intermediario'),
    ...templateDays('template-upper-lower-intermediario').slice(2),
  ],
};

/** Blueprint days of a split and day count, cycling when the blueprint is shorter. */
export function splitBlueprintDays(
  splitType: SplitType,
  dayCount: number
): TemplateDay[] {
  const key = `${splitType}:${dayCount}`;
  const templateId = TEMPLATE_BY_PAIR[key];
  if (templateId) {
    return templateDays(templateId);
  }

  const extra = EXTRA_BLUEPRINTS[key];
  if (extra) {
    return extra;
  }

  // Full body accepts one to six days: cycling the three sessions keeps every
  // day filled. CUSTOM has no focus of its own and starts empty, so the user
  // chooses every exercise.
  if (splitType === 'FULL_BODY') {
    return FULL_BODY_DAYS;
  }

  return [];
}

export type SplitExercises = {
  /** One entry per day, in the same order as `buildProgramDayNames`. */
  days: ProgramExerciseDraft[][];
  /** Template names that are not in the catalogue and were left out. */
  missing: string[];
};

/**
 * Builds the exercises of every day of a new program.
 *
 * Exercises absent from the catalogue are reported in `missing` instead of
 * being invented: a day keeps only the entries with a real id.
 */
export function buildSplitExercises(
  splitType: SplitType,
  dayCount: number,
  catalogue: Exercise[]
): SplitExercises {
  const blueprint = splitBlueprintDays(splitType, dayCount);
  const missing = new Set<string>();

  if (blueprint.length === 0) {
    return { days: Array.from({ length: dayCount }, () => []), missing: [] };
  }

  const days = Array.from({ length: dayCount }, (_, index) => {
    const day = blueprint[index % blueprint.length];
    if (!day) {
      return [];
    }

    return day.exercises.flatMap((template) => {
      const exercise = resolveTemplateExercise(template.name, catalogue);
      if (!exercise) {
        missing.add(template.name);
        return [];
      }

      return [
        {
          exerciseId: exercise.id,
          targetSets: template.targetSets,
          targetRepsMin: template.targetRepsMin,
          targetRepsMax: template.targetRepsMax,
          restSeconds: template.restSeconds,
        },
      ];
    });
  });

  return { days, missing: Array.from(missing) };
}
