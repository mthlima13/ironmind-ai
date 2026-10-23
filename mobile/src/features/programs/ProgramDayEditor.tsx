import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { Stepper } from '../../components/Stepper';
import { TextField } from '../../components/TextField';
import { colors, layout, radii, spacing, typography } from '../../theme';
import type { ProgramDay, ProgramExercise } from '../../types/program';
import { useExercises } from '../exercises/useExercises';

export type ProgramDayEditorProps = {
  day: ProgramDay;
  /** Called whenever the day changes. */
  onChange: (day: ProgramDay) => void;
};

/**
 * Editor of a program day: exercises, target sets and reps, rest and order
 * (SPEC RF-005).
 */
export function ProgramDayEditor({ day, onChange }: ProgramDayEditorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { data: catalogue } = useExercises({ muscleGroup: 'ALL' });

  const updateExercise = (
    exercise: ProgramExercise,
    patch: Partial<ProgramExercise>
  ) => {
    onChange({
      ...day,
      exercises: day.exercises.map((item) =>
        item.id === exercise.id ? { ...item, ...patch } : item
      ),
    });
  };

  const removeExercise = (exerciseId: string) => {
    onChange({
      ...day,
      exercises: day.exercises
        .filter((item) => item.id !== exerciseId)
        .map((item, index) => ({ ...item, position: index + 1 })),
    });
  };

  const moveExercise = (exerciseId: string, direction: 'up' | 'down') => {
    const index = day.exercises.findIndex((item) => item.id === exerciseId);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= day.exercises.length) {
      return;
    }
    const exercises = [...day.exercises];
    const [moved] = exercises.splice(index, 1);
    exercises.splice(target, 0, moved);
    onChange({
      ...day,
      exercises: exercises.map((item, position) => ({ ...item, position })),
    });
  };

  const addExercise = (exerciseId: string) => {
    const exercise = catalogue?.content.find((item) => item.id === exerciseId);
    if (!exercise) {
      return;
    }
    onChange({
      ...day,
      exercises: [
        ...day.exercises,
        {
          id: `pex-${day.id}-${exercise.id}-${day.exercises.length + 1}`,
          exerciseId: exercise.id,
          exercise,
          position: day.exercises.length + 1,
          targetSets: 3,
          targetRepsMin: 8,
          targetRepsMax: 12,
          restSeconds: 90,
        },
      ],
    });
    setIsPickerOpen(false);
  };

  const availableExercises = useMemo(
    () =>
      (catalogue?.content ?? []).filter(
        (exercise) =>
          !day.exercises.some((item) => item.exerciseId === exercise.id)
      ),
    [catalogue, day.exercises]
  );

  return (
    <View style={styles.container} testID={`program-day-editor-${day.id}`}>
      <TextField
        label="Nome do dia"
        testID={`program-day-name-${day.id}`}
        value={day.name}
        onChangeText={(name) => onChange({ ...day, name })}
        placeholder="Ex.: Peito e tríceps"
        autoCapitalize="words"
      />

      {day.exercises.map((programExercise, index) => (
        <View key={programExercise.id} style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseTitle}>
              <Text style={styles.exerciseName}>{programExercise.exercise.name}</Text>
              <Text style={styles.exerciseEquipment}>
                {programExercise.exercise.equipment}
              </Text>
            </View>
            <View style={styles.orderButtons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mover ${programExercise.exercise.name} para cima`}
                testID={`exercise-move-up-${programExercise.id}`}
                disabled={index === 0}
                onPress={() => moveExercise(programExercise.id, 'up')}
                style={styles.orderButton}
              >
                <Ionicons name="arrow-up" size={16} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mover ${programExercise.exercise.name} para baixo`}
                testID={`exercise-move-down-${programExercise.id}`}
                disabled={index === day.exercises.length - 1}
                onPress={() => moveExercise(programExercise.id, 'down')}
                style={styles.orderButton}
              >
                <Ionicons name="arrow-down" size={16} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover ${programExercise.exercise.name}`}
                testID={`exercise-remove-${programExercise.id}`}
                onPress={() => removeExercise(programExercise.id)}
                style={styles.orderButton}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </Pressable>
            </View>
          </View>

          <View style={styles.steppers}>
            <Stepper
              label="Séries"
              testID={`exercise-sets-${programExercise.id}`}
              value={programExercise.targetSets}
              onChange={(targetSets) => updateExercise(programExercise, { targetSets })}
            />
            <Stepper
              label="Reps mín."
              testID={`exercise-reps-min-${programExercise.id}`}
              value={programExercise.targetRepsMin}
              onChange={(targetRepsMin) =>
                updateExercise(programExercise, { targetRepsMin })
              }
            />
            <Stepper
              label="Reps máx."
              testID={`exercise-reps-max-${programExercise.id}`}
              value={programExercise.targetRepsMax}
              onChange={(targetRepsMax) =>
                updateExercise(programExercise, { targetRepsMax })
              }
            />
            <Stepper
              label="Descanso (s)"
              testID={`exercise-rest-${programExercise.id}`}
              value={programExercise.restSeconds}
              onChange={(restSeconds) =>
                updateExercise(programExercise, { restSeconds })
              }
            />
          </View>
        </View>
      ))}

      <Button
        label={isPickerOpen ? 'Fechar catálogo' : 'Adicionar exercício'}
        onPress={() => setIsPickerOpen((open) => !open)}
        variant="secondary"
        icon={<Ionicons name="add" size={20} color={colors.accent} />}
        testID="toggle-exercise-picker"
      />

      {isPickerOpen ? (
        <View style={styles.picker} testID="exercise-picker">
          {availableExercises.length === 0 ? (
            <Text style={styles.pickerEmpty}>
              Todos os exercícios do catálogo já estão no dia.
            </Text>
          ) : (
            availableExercises.map((exercise) => (
              <Pressable
                key={exercise.id}
                accessibilityRole="button"
                onPress={() => addExercise(exercise.id)}
                style={styles.pickerItem}
                testID={`picker-exercise-${exercise.id}`}
              >
                <Text style={styles.pickerItemName}>{exercise.name}</Text>
                <Text style={styles.pickerItemMeta}>{exercise.equipment}</Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  exerciseHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  exerciseTitle: {
    flex: 1,
    gap: spacing.xs,
  },
  exerciseName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  exerciseEquipment: {
    ...typography.caption,
    color: colors.textMuted,
  },
  orderButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  orderButton: {
    alignItems: 'center',
    height: layout.minTouchTarget,
    justifyContent: 'center',
    width: layout.minTouchTarget,
  },
  steppers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  picker: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  pickerEmpty: {
    ...typography.caption,
    color: colors.textMuted,
    padding: spacing.sm,
  },
  pickerItem: {
    borderRadius: radii.sm,
    gap: spacing.xs,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pickerItemName: {
    ...typography.body,
    color: colors.text,
  },
  pickerItemMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
