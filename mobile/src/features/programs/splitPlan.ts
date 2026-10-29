import { SPLIT_DAY_COUNTS, SPLIT_DAY_NAMES, type SplitType } from '../../types/program';

/** Suffix used when a split repeats its days, e.g. "Push A" and "Push B". */
const DAY_LETTERS = 'ABCDEF';

/**
 * Splits offered in the program form, in the order they are shown.
 *
 * The letters come first because they are the most used divisions in a gym;
 * `CUSTOM` stays last, as the escape hatch for a structure the user builds by
 * hand.
 */
export const SPLIT_CHOICES: SplitType[] = [
  'AB',
  'ABC',
  'ABCD',
  'ABCDE',
  'FULL_BODY',
  'UPPER_LOWER',
  'PPL',
  'ARNOLD_SPLIT',
  'PHUL',
  'HYBRID_PPL_UPPER_LOWER',
  'CUSTOM',
];

/** Day counts the backend accepts for the split, smallest first (SPEC 7.3). */
export function dayCountOptions(splitType: SplitType): number[] {
  return SPLIT_DAY_COUNTS[splitType];
}

/** Day count selected when the split changes. */
export function defaultDayCount(splitType: SplitType): number {
  return SPLIT_DAY_COUNTS[splitType][0] ?? 1;
}

/**
 * Builds the default day names of a new program.
 *
 * The names come from the split template and cycle when the split has fewer
 * names than days. A repeated block gets a letter suffix, so a six-day PPL
 * becomes "Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B" instead of
 * two days with the same title. `CUSTOM` has no template and falls back to
 * "Dia N".
 */
export function buildProgramDayNames(
  splitType: SplitType,
  dayCount: number
): string[] {
  const template = SPLIT_DAY_NAMES[splitType];
  if (template.length === 0) {
    return Array.from({ length: dayCount }, (_, index) => `Dia ${index + 1}`);
  }

  const isRepeated = template.length < dayCount;
  return Array.from({ length: dayCount }, (_, index) => {
    const name = template[index % template.length] ?? `Dia ${index + 1}`;
    if (!isRepeated) {
      return name;
    }
    const cycle = Math.floor(index / template.length);
    return `${name} ${DAY_LETTERS[cycle] ?? cycle + 1}`;
  });
}
