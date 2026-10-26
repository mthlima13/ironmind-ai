import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { SetRow, type SetDraft } from '../../components/SetRow';
import { useTheme, useThemedStyles, radii, spacing, typography, type ThemeColors } from '../../theme';
import type { PreviousSetValues } from '../../types/workout';
import type { WeightUnit } from '../../types/user';
import { fromDisplayWeight, roundKg, toDisplayWeight } from '../../utils/units';

/** A validated set, ready to be sent to the backend. */
export type LoggedSet = {
  setNumber: number;
  /** Canonical unit of the API: kilogram (SPEC 7.2). */
  weightKg: number | null;
  repetitions: number;
  perceivedExertion: number | null;
};

export type SetLoggerProps = {
  exerciseName: string;
  weightUnit: WeightUnit;
  /** Values of the last session for this exercise (SPEC RF-010). */
  previousSets?: PreviousSetValues[];
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  /** Called with the validated sets when the user confirms. */
  onSubmit?: (sets: LoggedSet[]) => void | Promise<void>;
  isSubmitting?: boolean;
  /** Error returned by the backend for the last submission. */
  submitError?: string;
  disabled?: boolean;
};

type DraftErrors = Record<string, string>;

let draftCounter = 0;

function createDraft(): SetDraft {
  draftCounter += 1;
  return {
    id: `draft-${draftCounter}`,
    weight: '',
    repetitions: '',
    rpe: '',
  };
}

function parseNumber(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateDraft(draft: SetDraft): string | undefined {
  const weight = parseNumber(draft.weight);
  if (draft.weight.trim() && (weight === null || weight < 0)) {
    return 'Carga inválida. Use um número maior ou igual a zero.';
  }

  const repetitions = parseNumber(draft.repetitions);
  if (repetitions === null || !Number.isInteger(repetitions) || repetitions < 1) {
    return 'Informe as repetições como um número inteiro maior que zero.';
  }

  const rpe = parseNumber(draft.rpe);
  if (
    draft.rpe.trim() &&
    (rpe === null || !Number.isInteger(rpe) || rpe < 1 || rpe > 10)
  ) {
    return 'RPE deve estar entre 1 e 10.';
  }

  return undefined;
}

function toLoggedSet(draft: SetDraft, index: number, unit: WeightUnit): LoggedSet {
  const weight = parseNumber(draft.weight);
  const rpe = parseNumber(draft.rpe);
  return {
    setNumber: index + 1,
    weightKg:
      weight === null ? null : roundKg(fromDisplayWeight(weight, unit) ?? 0),
    repetitions: parseNumber(draft.repetitions) ?? 0,
    perceivedExertion: rpe === null ? null : rpe,
  };
}

export function SetLogger({
  exerciseName,
  weightUnit,
  previousSets = [],
  targetSets,
  targetRepsMin,
  targetRepsMax,
  onSubmit,
  isSubmitting = false,
  submitError,
  disabled = false,
}: SetLoggerProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [drafts, setDrafts] = useState<SetDraft[]>(() => [createDraft()]);
  const [errors, setErrors] = useState<DraftErrors>({});

  const targetLabel =
    targetSets && targetRepsMin && targetRepsMax
      ? `${targetSets} séries × ${targetRepsMin}-${targetRepsMax} reps`
      : undefined;

  const updateDraft = useCallback((id: string, patch: Partial<SetDraft>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    );
    setErrors((current) => {
      if (!current[id]) {
        return current;
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const addSet = useCallback(() => {
    setDrafts((current) => [...current, createDraft()]);
  }, []);

  const removeSet = useCallback((id: string) => {
    setDrafts((current) =>
      current.length === 1 ? current : current.filter((draft) => draft.id !== id)
    );
  }, []);

  /**
   * Quick fill: copies the values of the last session into the rows
   * (SPEC RF-010). The values are only a starting point and stay editable.
   */
  const usePreviousValues = useCallback(() => {
    if (previousSets.length === 0) {
      return;
    }
    setDrafts((current) => {
      const rows = current.length > 0 ? current : [createDraft()];
      return rows.map((draft, index) => {
        const previous = previousSets[index];
        if (!previous) {
          return draft;
        }
        const weight = toDisplayWeight(previous.weightKg, weightUnit);
        return {
          ...draft,
          weight: weight === null ? '' : String(Math.round(weight * 10) / 10),
          repetitions: String(previous.repetitions),
          rpe:
            previous.perceivedExertion === null ||
            previous.perceivedExertion === undefined
              ? ''
              : String(previous.perceivedExertion),
        };
      });
    });
    setErrors({});
  }, [previousSets, weightUnit]);

  const submit = useCallback(async () => {
    const nextErrors: DraftErrors = {};
    drafts.forEach((draft) => {
      const error = validateDraft(draft);
      if (error) {
        nextErrors[draft.id] = error;
      }
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!onSubmit) {
      return;
    }

    await onSubmit(drafts.map((draft, index) => toLoggedSet(draft, index, weightUnit)));
  }, [drafts, onSubmit, weightUnit]);

  const targetText = useMemo(() => {
    const registered = drafts.length;
    if (targetSets) {
      return `${registered}/${targetSets} séries`;
    }
    return `${registered} ${registered === 1 ? 'série' : 'séries'}`;
  }, [drafts.length, targetSets]);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={insets.top}
      style={styles.container}
      testID="set-logger"
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.exerciseName}>{exerciseName}</Text>
          {targetLabel ? <Text style={styles.target}>{targetLabel}</Text> : null}
        </View>
        <View style={styles.counter} testID="set-counter">
          <Text style={styles.counterText}>{targetText}</Text>
        </View>
      </View>

      {previousSets.length > 0 ? (
        <Button
          label="Usar valores da última sessão"
          onPress={usePreviousValues}
          variant="secondary"
          icon={
            <Ionicons name="time-outline" size={18} color={colors.accent} />
          }
          testID="use-previous-values-button"
        />
      ) : (
        <Text style={styles.noHistory}>
          Sem histórico para este exercício. Registre a primeira série.
        </Text>
      )}

      <View style={styles.rows}>
        {drafts.map((draft, index) => (
          <SetRow
            key={draft.id}
            index={index + 1}
            draft={draft}
            weightUnit={weightUnit}
            error={errors[draft.id]}
            disabled={disabled || isSubmitting}
            onChange={(patch) => updateDraft(draft.id, patch)}
            onRemove={
              drafts.length > 1 ? () => removeSet(draft.id) : undefined
            }
          />
        ))}
      </View>

      {submitError ? (
        <Text style={styles.submitError} testID="set-logger-error">
          {submitError}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Adicionar série"
          onPress={addSet}
          variant="secondary"
          icon={
            <Ionicons name="add" size={20} color={colors.accent} />
          }
          disabled={disabled || isSubmitting}
          testID="add-set-button"
          style={styles.action}
        />
        <Button
          label="Salvar séries"
          onPress={submit}
          loading={isSubmitting}
          disabled={disabled}
          testID="save-sets-button"
          style={styles.action}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  exerciseName: {
    ...typography.heading,
    color: colors.text,
  },
  target: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  counter: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  counterText: {
    ...typography.label,
    color: colors.accent,
  },
  noHistory: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rows: {
    gap: spacing.sm,
  },
  submitError: {
    ...typography.caption,
    color: colors.danger,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  action: {
    flexGrow: 1,
    flexBasis: 140,
  },
});
