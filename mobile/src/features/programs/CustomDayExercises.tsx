import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import {
  useTheme,
  useThemedStyles,
  radii,
  spacing,
  typography,
  type ThemeColors,
} from '../../theme';
import type { Exercise } from '../../types/exercise';
import type { ProgramExerciseDraft } from '../../types/program';
import { normalizeExerciseName } from './trainingTemplates';

/** Target used when the user adds an exercise to a custom day. */
const DEFAULT_TARGET = {
  targetSets: 3,
  targetRepsMin: 8,
  targetRepsMax: 12,
  restSeconds: 90,
};

/** The picker shows the first matches; typing narrows the catalogue. */
const MAX_RESULTS = 12;

export type CustomDayExercisesProps = {
  dayNames: string[];
  /** One entry per day, aligned with `dayNames`. */
  exercises: ProgramExerciseDraft[][];
  catalogue: Exercise[];
  onChangeDay: (dayIndex: number, exercises: ProgramExerciseDraft[]) => void;
};

/**
 * Exercise selection for the days of a custom program.
 *
 * The custom split has no fixed focus, so instead of only the full body
 * blueprint the user picks the exercises of each day. Entries are stored as
 * drafts with a real catalogue id (SPEC RF-003); the target sets, reps and rest
 * come from the default and can be changed later in the day editor.
 */
export function CustomDayExercises({
  dayNames,
  exercises,
  catalogue,
  onChangeDay,
}: CustomDayExercisesProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [openDayIndex, setOpenDayIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const exerciseById = useMemo(
    () => new Map(catalogue.map((exercise) => [exercise.id, exercise])),
    [catalogue]
  );

  const results = useMemo(() => {
    if (openDayIndex === null) {
      return [];
    }

    const selected = new Set(
      (exercises[openDayIndex] ?? []).map((draft) => draft.exerciseId)
    );
    const term = normalizeExerciseName(search);

    return catalogue
      .filter((exercise) => !selected.has(exercise.id))
      .filter(
        (exercise) =>
          term.length === 0 ||
          normalizeExerciseName(exercise.name).includes(term)
      )
      .slice(0, MAX_RESULTS);
  }, [catalogue, exercises, openDayIndex, search]);

  const togglePicker = (dayIndex: number) => {
    setOpenDayIndex((current) => (current === dayIndex ? null : dayIndex));
    setSearch('');
  };

  const addExercise = (dayIndex: number, exercise: Exercise) => {
    onChangeDay(dayIndex, [
      ...(exercises[dayIndex] ?? []),
      { exerciseId: exercise.id, ...DEFAULT_TARGET },
    ]);
    setSearch('');
  };

  const removeExercise = (dayIndex: number, exerciseId: string) => {
    onChangeDay(
      dayIndex,
      (exercises[dayIndex] ?? []).filter(
        (draft) => draft.exerciseId !== exerciseId
      )
    );
  };

  return (
    <View style={styles.container} testID="custom-day-exercises">
      <Text style={styles.sectionLabel}>Exercícios de cada dia</Text>
      <Text style={styles.hint}>
        Monte os dias com os exercícios de sua preferência. Você pode ajustar
        séries, repetições e descanso depois, no editor do dia.
      </Text>

      {dayNames.map((dayName, dayIndex) => {
        const dayExercises = exercises[dayIndex] ?? [];
        const isOpen = openDayIndex === dayIndex;

        return (
          <View key={dayName} style={styles.day} testID={`custom-day-${dayIndex}`}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{dayName}</Text>
              <Text style={styles.dayCount}>
                {dayExercises.length}{' '}
                {dayExercises.length === 1 ? 'exercício' : 'exercícios'}
              </Text>
            </View>

            {dayExercises.length === 0 ? (
              <Text style={styles.emptyDay}>
                Nenhum exercício selecionado para este dia.
              </Text>
            ) : (
              dayExercises.map((draft) => {
                const exercise = exerciseById.get(draft.exerciseId);
                const name = exercise?.name ?? 'Exercício indisponível';

                return (
                  <View
                    key={draft.exerciseId}
                    style={styles.exerciseRow}
                    testID={`custom-day-${dayIndex}-exercise-${draft.exerciseId}`}
                  >
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{name}</Text>
                      <Text style={styles.exerciseMeta}>
                        {draft.targetSets} séries · {draft.targetRepsMin}–
                        {draft.targetRepsMax} reps · {draft.restSeconds}s
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remover ${name}`}
                      onPress={() =>
                        removeExercise(dayIndex, draft.exerciseId)
                      }
                      style={({ pressed }) => [
                        styles.removeButton,
                        pressed ? styles.pressed : null,
                      ]}
                      testID={`remove-custom-exercise-${dayIndex}-${draft.exerciseId}`}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colors.danger}
                      />
                    </Pressable>
                  </View>
                );
              })
            )}

            <Button
              label={isOpen ? 'Fechar seleção' : 'Adicionar exercício'}
              variant="secondary"
              icon={
                <Ionicons
                  name={isOpen ? 'close' : 'add-circle-outline'}
                  size={18}
                  color={colors.accent}
                />
              }
              onPress={() => togglePicker(dayIndex)}
              testID={`toggle-custom-day-${dayIndex}`}
            />

            {isOpen ? (
              <View style={styles.picker}>
                <TextField
                  label="Buscar exercício"
                  testID="custom-exercise-search"
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Nome do exercício"
                  autoCapitalize="none"
                />

                {results.length === 0 ? (
                  <Text style={styles.emptyDay} testID="custom-exercise-no-results">
                    Nenhum exercício encontrado fora dos já selecionados.
                  </Text>
                ) : (
                  results.map((exercise) => (
                    <Pressable
                      key={exercise.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Adicionar ${exercise.name} ao ${dayName}`}
                      onPress={() => addExercise(dayIndex, exercise)}
                      style={({ pressed }) => [
                        styles.option,
                        pressed ? styles.pressed : null,
                      ]}
                      testID={`custom-exercise-option-${exercise.id}`}
                    >
                      <Text style={styles.optionName}>{exercise.name}</Text>
                      <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color={colors.accent}
                      />
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      gap: spacing.md,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
    },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
    },
    day: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    dayHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dayName: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    dayCount: {
      ...typography.caption,
      color: colors.textMuted,
    },
    emptyDay: {
      ...typography.caption,
      color: colors.textMuted,
    },
    exerciseRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    exerciseInfo: {
      flex: 1,
      gap: 2,
    },
    exerciseName: {
      ...typography.body,
      color: colors.text,
    },
    exerciseMeta: {
      ...typography.caption,
      color: colors.textMuted,
    },
    removeButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 44,
    },
    pressed: {
      opacity: 0.6,
    },
    picker: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    option: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: radii.sm,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
      minHeight: 44,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    optionName: {
      ...typography.body,
      color: colors.text,
      flex: 1,
    },
  });
