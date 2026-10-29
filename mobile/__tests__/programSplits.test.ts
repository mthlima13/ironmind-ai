import {
  buildProgramDayNames,
  dayCountOptions,
  defaultDayCount,
  SPLIT_CHOICES,
} from '../src/features/programs/splitPlan';
import {
  SPLIT_DAY_COUNTS,
  SPLIT_DAY_NAMES,
  SPLIT_TYPES,
  type SplitType,
} from '../src/types/program';

const ALL_SPLITS = Object.values(SPLIT_TYPES) as SplitType[];

describe('split catalog of the program form', () => {
  it('offers every split of the contract exactly once', () => {
    expect(new Set(SPLIT_CHOICES).size).toBe(SPLIT_CHOICES.length);
    expect([...SPLIT_CHOICES].sort()).toEqual([...ALL_SPLITS].sort());
  });

  it('mirrors the day counts accepted by the backend', () => {
    // Same table as SplitType.supportedDayCounts() (SPEC 7.3). A divergence
    // here would let the form build a program the API rejects with 422.
    expect(SPLIT_DAY_COUNTS).toEqual({
      PPL: [3, 6],
      UPPER_LOWER: [2, 4],
      FULL_BODY: [1, 2, 3, 4, 5, 6],
      AB: [2],
      ABC: [3],
      ABCD: [4],
      ABCDE: [5],
      ARNOLD_SPLIT: [3],
      PHUL: [4],
      HYBRID_PPL_UPPER_LOWER: [5],
      CUSTOM: [1, 2, 3, 4, 5, 6],
    });
  });

  it('starts with the smallest day count and keeps a choice that fits', () => {
    ALL_SPLITS.forEach((split) => {
      expect(dayCountOptions(split)).toEqual(SPLIT_DAY_COUNTS[split]);
      expect(defaultDayCount(split)).toBe(Math.min(...SPLIT_DAY_COUNTS[split]));
    });
  });

  it('builds the days of the lettered splits', () => {
    expect(buildProgramDayNames('AB', 2)).toEqual(['Superior', 'Inferior']);
    expect(buildProgramDayNames('ABC', 3)).toEqual([
      'Peito e tríceps',
      'Costas e bíceps',
      'Pernas e ombros',
    ]);
    expect(buildProgramDayNames('ABCD', 4)).toEqual([
      'Peito e tríceps',
      'Costas e bíceps',
      'Pernas e glúteos',
      'Ombros e braços',
    ]);
    expect(buildProgramDayNames('ABCDE', 5)).toEqual([
      'Peito',
      'Costas',
      'Pernas',
      'Ombros',
      'Braços',
    ]);
  });

  it('builds the days of the full body and upper/lower splits', () => {
    expect(buildProgramDayNames('FULL_BODY', 1)).toEqual(['Corpo inteiro']);
    expect(buildProgramDayNames('UPPER_LOWER', 2)).toEqual(['Superior', 'Inferior']);
  });

  it('suffixes the repeated blocks with a letter', () => {
    expect(buildProgramDayNames('UPPER_LOWER', 4)).toEqual([
      'Superior A',
      'Inferior A',
      'Superior B',
      'Inferior B',
    ]);
    expect(buildProgramDayNames('FULL_BODY', 3)).toEqual([
      'Corpo inteiro A',
      'Corpo inteiro B',
      'Corpo inteiro C',
    ]);
    expect(buildProgramDayNames('PPL', 6)).toEqual([
      'Push (peito, ombros e tríceps) A',
      'Pull (costas e bíceps) A',
      'Legs (pernas e glúteos) A',
      'Push (peito, ombros e tríceps) B',
      'Pull (costas e bíceps) B',
      'Legs (pernas e glúteos) B',
    ]);
  });

  it('falls back to "Dia N" on the custom split', () => {
    expect(buildProgramDayNames('CUSTOM', 3)).toEqual(['Dia 1', 'Dia 2', 'Dia 3']);
    expect(SPLIT_DAY_NAMES.CUSTOM).toEqual([]);
  });

  it('never repeats a day name inside the same program', () => {
    ALL_SPLITS.forEach((split) => {
      dayCountOptions(split).forEach((dayCount) => {
        const names = buildProgramDayNames(split, dayCount);
        expect(names).toHaveLength(dayCount);
        expect(new Set(names).size).toBe(dayCount);
      });
    });
  });
});
