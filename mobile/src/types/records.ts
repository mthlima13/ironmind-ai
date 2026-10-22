export const RECORD_TYPES = {
  MAX_WEIGHT: 'MAX_WEIGHT',
  MAX_REPS_AT_WEIGHT: 'MAX_REPS_AT_WEIGHT',
  BEST_ESTIMATED_1RM: 'BEST_ESTIMATED_1RM',
} as const;

export type PersonalRecordType =
  (typeof RECORD_TYPES)[keyof typeof RECORD_TYPES];

export const RECORD_TYPE_LABELS: Record<PersonalRecordType, string> = {
  MAX_WEIGHT: 'Maior carga',
  MAX_REPS_AT_WEIGHT: 'Mais reps na mesma carga',
  BEST_ESTIMATED_1RM: 'Melhor 1RM estimado',
};

export type RecordUnit = 'kg' | 'reps' | 'kg (estimado)';

/** Personal record (SPEC 10.10). */
export type PersonalRecord = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  recordType: PersonalRecordType;
  /** Value in the canonical unit of the record type. */
  value: number;
  unit: RecordUnit;
  achievedAt: string;
};
