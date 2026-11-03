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
  type ProgramExerciseDraft,
  type SplitType,
} from '../../types/program';
import { TRAINING_GOAL_LABELS, TRAINING_GOALS, type TrainingGoal } from '../../types/user';
import { useExerciseCatalogue } from '../exercises/useExercises';
import { CustomDayExercises } from './CustomDayExercises';
import { useCreateProgram } from './usePrograms';
import { buildSplitExercises } from './splitBlueprints';
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
 * the days with their default names and the exercises that match the focus of
 * each day: AB comes with "Superior" and "Inferior", ABCD with four days, and
 * so on. The blueprint is resolved against the catalogue, so a day only gets
 * exercises whose ids exist (SPEC RF-003); the user can adjust everything
 * afterwards in the day editor. The number of days is limited to what the
 * backend accepts for the split, so a valid form never ends in a `422`.
 */
export function NewProgramForm({ onCreated, onCancel }: NewProgramFormProps) {
  const styles = useThemedStyles(createStyles);
  const createProgram = useCreateProgram();
  const catalogue = useExerciseCatalogue();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<TrainingGoal>(TRAINING_GOALS.HYPERTROPHY);
  const [splitType, setSplitType] = useState<SplitType>('AB');
  const [dayCount, setDayCount] = useState(defaultDayCount('AB'));
  const [customExercises, setCustomExercises] = useState<
    ProgramExerciseDraft[][] | null
  >(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const dayOptions = dayCountOptions(splitType);
  const dayNames = useMemo(
    () => buildProgramDayNames(splitType, dayCount),
    [splitType, dayCount]
  );

  const catalogueContent = catalogue.data?.content;
  const exercises = useMemo(
    () => buildSplitExercises(splitType, dayCount, catalogueContent ?? []),
    [splitType, dayCount, catalogueContent]
  );
  // The custom split has no blueprint: the user selects the exercises of each
  // day in the picker below.
  const dayExercises =
    splitType === 'CUSTOM' ? (customExercises ?? exercises.days) : exercises.days;
  const totalExercises = dayExercises.reduce(
    (total, day) => total + day.length,
    0
  );
  const exerciseSummary =
    splitType === 'CUSTOM'
      ? totalExercises === 0
        ? 'Nenhum exercício adicionado ainda. Abra um dia e adicione os exercícios que quiser.'
        : `${totalExercises} ${
            totalExercises === 1 ? 'exercício escolhido' : 'exercícios escolhidos'
          } para os seus dias. Você pode ajustar depois.`
      : `${totalExercises} ${
          totalExercises === 1 ? 'exercício' : 'exercícios'
        } já distribuídos pelos dias. Você pode trocar, remover ou adicionar depois.`;
  const hasCatalogue = Boolean(catalogue.data);

  const selectSplit = (value: SplitType) => {
    setSplitType(value);
    // The choices of a custom program do not apply to a fixed split.
    if (value !== 'CUSTOM') {
      setCustomExercises(null);
    }
    // The selected count may not fit the new split, e.g. 6 days of PPL.
    setDayCount((current) =>
      dayCountOptions(value).includes(current) ? current : defaultDayCount(value)
    );
  };

  const selectDayCount = (value: number) => {
    if (splitType === 'CUSTOM') {
      setCustomExercises((current) => {
        const base = current ?? exercises.days;
        // Growing keeps the days already edited and fills the new ones with
        // the blueprint of the target count; shrinking drops the removed days.
        const blueprint = buildSplitExercises(
          splitType,
          value,
          catalogueContent ?? []
        ).days;
        return Array.from(
          { length: value },
          (_, index) => base[index] ?? blueprint[index] ?? []
        );
      });
    }
    setDayCount(value);
  };

  const changeCustomDay = (
    dayIndex: number,
    next: ProgramExerciseDraft[]
  ) => {
    setCustomExercises((current) => {
      const base = (current ?? exercises.days).map((day) => [...day]);
      base[dayIndex] = next;
      return base;
    });
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Informe o nome do programa.');
      return;
    }

    setNameError(null);
    setFormError(null);

    if (!hasCatalogue) {
      setFormError(
        catalogue.isError
          ? 'Não foi possível carregar o catálogo de exercícios. Tente novamente.'
          : 'Aguarde o catálogo de exercícios carregar.'
      );
      return;
    }

    const input: CreateProgramInput = {
      name: trimmed,
      description: `${SPLIT_TYPE_LABELS[splitType]} com ${dayCount} ${dayCount === 1 ? 'dia' : 'dias'}.`,
      goal,
      splitType,
      days: dayNames.map((dayName, index) => ({
        name: dayName,
        exercises: dayExercises[index] ?? [],
      })),
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
      subtitle="Escolha a divisão e o número de dias. Os exercícios de cada dia são preenchidos automaticamente e pode ajustá-los depois."
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
                  onPress={() => selectDayCount(value)}
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

      {splitType === 'CUSTOM' ? (
        <CustomDayExercises
          dayNames={dayNames}
          exercises={dayExercises}
          catalogue={catalogueContent ?? []}
          onChangeDay={changeCustomDay}
        />
      ) : null}

      {catalogue.isLoading ? (
        <Text style={styles.preview} testID="new-program-catalogue-loading">
          Carregando exercícios…
        </Text>
      ) : null}

      {catalogue.isError ? (
        <>
          <Text style={styles.error} testID="new-program-catalogue-error">
            Não foi possível carregar o catálogo:{' '}
            {mapApiError(catalogue.error).message}
          </Text>
          <Button
            label="Tentar novamente"
            variant="ghost"
            onPress={() => {
              void catalogue.refetch();
            }}
            testID="new-program-catalogue-retry"
          />
        </>
      ) : null}

      {hasCatalogue ? (
        <Text style={styles.preview} testID="new-program-exercise-count">
          {exerciseSummary}
        </Text>
      ) : null}

      {exercises.missing.length > 0 ? (
        <Text style={styles.warning} testID="new-program-missing-exercises">
          Fora do catálogo (não serão incluídos):{' '}
          {exercises.missing.join(', ')}.
        </Text>
      ) : null}

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
  warning: {
    ...typography.caption,
    color: colors.warning,
  },
});
