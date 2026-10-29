import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { TextField } from '../../components/TextField';
import { mapApiError } from '../../services/api';
import { useThemedStyles, radii, spacing, typography, type ThemeColors } from '../../theme';
import {
  SPLIT_TYPE_LABELS,
  type CreateProgramInput,
  type SplitType,
} from '../../types/program';
import { TRAINING_GOAL_LABELS, TRAINING_GOALS, type TrainingGoal } from '../../types/user';
import { useCreateProgram } from './usePrograms';
import {
  buildProgramDayNames,
  dayCountOptions,
  defaultDayCount,
  SPLIT_CHOICES,
} from './splitPlan';

export type NewProgramFormProps = {
  /** Called after the program is created by the backend. */
  onCreated: () => void;
  onCancel: () => void;
};

/**
 * Manual creation of a program (SPEC RF-005).
 *
 * The split is the structure of the program, so choosing it already creates
 * the days with their default names: AB comes with "Superior" and "Inferior",
 * ABCD with four days, and so on. The days start empty, and the exercises are
 * added afterwards in the day editor. The number of days is limited to what the
 * backend accepts for the split, so a valid form never ends in a `422`.
 */
export function NewProgramForm({ onCreated, onCancel }: NewProgramFormProps) {
  const styles = useThemedStyles(createStyles);
  const createProgram = useCreateProgram();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<TrainingGoal>(TRAINING_GOALS.HYPERTROPHY);
  const [splitType, setSplitType] = useState<SplitType>('AB');
  const [dayCount, setDayCount] = useState(defaultDayCount('AB'));
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const dayOptions = dayCountOptions(splitType);
  const dayNames = useMemo(
    () => buildProgramDayNames(splitType, dayCount),
    [splitType, dayCount]
  );

  const selectSplit = (value: SplitType) => {
    setSplitType(value);
    // The selected count may not fit the new split, e.g. 6 days of PPL.
    setDayCount((current) =>
      dayCountOptions(value).includes(current) ? current : defaultDayCount(value)
    );
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Informe o nome do programa.');
      return;
    }

    setNameError(null);
    setFormError(null);

    const input: CreateProgramInput = {
      name: trimmed,
      description: `${SPLIT_TYPE_LABELS[splitType]} com ${dayCount} ${dayCount === 1 ? 'dia' : 'dias'}.`,
      goal,
      splitType,
      days: dayNames.map((dayName) => ({ name: dayName, exercises: [] })),
    };

    try {
      await createProgram.mutateAsync({ input });
      onCreated();
    } catch (error) {
      setFormError(mapApiError(error).message);
    }
  };

  return (
    <Card
      title="Novo programa"
      subtitle="Escolha a divisão e o número de dias. Os exercícios entram depois, em cada dia."
      testID="new-program-form"
    >
      <TextField
        label="Nome do programa"
        testID="new-program-name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (nameError) {
            setNameError(null);
          }
        }}
        placeholder="Ex.: AB — Superior / Inferior"
        autoCapitalize="sentences"
        maxLength={120}
        error={nameError ?? undefined}
      />

      <View style={styles.group}>
        <Text style={styles.groupLabel}>Objetivo</Text>
        <View style={styles.chipRow}>
          {(Object.values(TRAINING_GOALS) as TrainingGoal[]).map((value) => {
            const isActive = goal === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => setGoal(value)}
                style={({ pressed }) => [
                  styles.chip,
                  isActive ? styles.chipActive : null,
                  pressed ? styles.chipPressed : null,
                ]}
                testID={`program-goal-${value}`}
              >
                <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>
                  {TRAINING_GOAL_LABELS[value]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>Divisão do treino</Text>
        <View style={styles.chipRow}>
          {SPLIT_CHOICES.map((value) => {
            const isActive = splitType === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => selectSplit(value)}
                style={({ pressed }) => [
                  styles.chip,
                  isActive ? styles.chipActive : null,
                  pressed ? styles.chipPressed : null,
                ]}
                testID={`program-split-${value}`}
              >
                <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>
                  {SPLIT_TYPE_LABELS[value]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {dayOptions.length > 1 ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Dias de treino</Text>
          <View style={styles.chipRow}>
            {dayOptions.map((value) => {
              const isActive = dayCount === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => setDayCount(value)}
                  style={({ pressed }) => [
                    styles.chip,
                    isActive ? styles.chipActive : null,
                    pressed ? styles.chipPressed : null,
                  ]}
                  testID={`program-days-${value}`}
                >
                  <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>
                    {value}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <Text style={styles.preview} testID="new-program-days">
        {dayNames.length} {dayNames.length === 1 ? 'dia' : 'dias'}: {dayNames.join(' • ')}
      </Text>

      {formError ? (
        <Text style={styles.error} testID="new-program-error">
          {formError}
        </Text>
      ) : null}

      <Button
        label={createProgram.isPending ? 'Criando…' : 'Criar programa'}
        onPress={() => {
          void submit();
        }}
        disabled={createProgram.isPending}
        testID="create-program-submit"
      />

      <Button
        label="Cancelar"
        variant="ghost"
        onPress={onCancel}
        disabled={createProgram.isPending}
        testID="create-program-cancel"
      />
    </Card>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  groupLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  chipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipPressed: {
    backgroundColor: colors.surfacePressed,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.accent,
  },
  preview: {
    ...typography.caption,
    color: colors.textMuted,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
