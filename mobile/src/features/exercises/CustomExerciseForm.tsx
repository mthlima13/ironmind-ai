import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { mapApiError } from '../../services/api';
import { useThemedStyles, layout, radii, spacing, typography, type ThemeColors } from '../../theme';
import {
  MOVEMENT_TYPES,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  type MuscleGroup,
} from '../../types/exercise';
import { useCreateExercise } from './useExercises';

export type CustomExerciseFormProps = {
  /** Called after the exercise is created. */
  onCreated?: () => void;
};

const MOVEMENT_TYPE_LABELS: Record<(typeof MOVEMENT_TYPES)[keyof typeof MOVEMENT_TYPES], string> = {
  COMPOUND: 'Composto',
  ISOLATION: 'Isolado',
  CARDIO: 'Cardio',
  ISOMETRIC: 'Isométrico',
};

/**
 * Form used to create a personal exercise (SPEC RF-003).
 *
 * The backend owns the catalogue: the app only sends the values the user
 * typed and never invents an exercise identifier.
 */
export function CustomExerciseForm({ onCreated }: CustomExerciseFormProps) {
  const styles = useThemedStyles(createStyles);
  const createMutation = useCreateExercise();
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState('');
  const [description, setDescription] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(
    MUSCLE_GROUPS.CHEST
  );
  const [movementType, setMovementType] = useState<
    (typeof MOVEMENT_TYPES)[keyof typeof MOVEMENT_TYPES]
  >('COMPOUND');

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório', 'Informe o nome do exercício.');
      return;
    }
    if (!equipment.trim()) {
      Alert.alert('Equipamento obrigatório', 'Informe o equipamento utilizado.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        input: {
          name: name.trim(),
          description: description.trim() || null,
          primaryMuscleGroup: muscleGroup,
          equipment: equipment.trim(),
          movementType,
        },
      });
      setName('');
      setEquipment('');
      setDescription('');
      Alert.alert('Exercício criado', 'O exercício já está disponível no catálogo.');
      onCreated?.();
    } catch (error) {
      Alert.alert('Erro ao criar exercício', mapApiError(error).message);
    }
  };

  return (
    <View style={styles.container}>
      <TextField
        label="Nome do exercício"
        value={name}
        onChangeText={setName}
        placeholder="Ex.: Supino inclinado com halteres"
        autoCapitalize="sentences"
        testID="custom-exercise-name"
      />

      <TextField
        label="Equipamento"
        value={equipment}
        onChangeText={setEquipment}
        placeholder="Ex.: Halteres"
        autoCapitalize="sentences"
        testID="custom-exercise-equipment"
      />

      <TextField
        label="Descrição (opcional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Observações sobre a execução"
        autoCapitalize="sentences"
        multiline
        numberOfLines={3}
        testID="custom-exercise-description"
      />

      <Text style={styles.label}>Grupo muscular principal</Text>
      <View style={styles.pills}>
        {Object.values(MUSCLE_GROUPS).map((group) => {
          const isActive = muscleGroup === group;
          return (
            <Pressable
              key={group}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => setMuscleGroup(group)}
              style={({ pressed }) => [
                styles.pill,
                isActive ? styles.pillActive : null,
                pressed ? styles.pillPressed : null,
              ]}
              testID={`custom-exercise-muscle-${group}`}
            >
              <Text style={[styles.pillText, isActive ? styles.pillTextActive : null]}>
                {MUSCLE_GROUP_LABELS[group]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Tipo de movimento</Text>
      <View style={styles.pills}>
        {Object.values(MOVEMENT_TYPES).map((type) => {
          const isActive = movementType === type;
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => setMovementType(type)}
              style={({ pressed }) => [
                styles.pill,
                isActive ? styles.pillActive : null,
                pressed ? styles.pillPressed : null,
              ]}
              testID={`custom-exercise-movement-${type}`}
            >
              <Text style={[styles.pillText, isActive ? styles.pillTextActive : null]}>
                {MOVEMENT_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        label={createMutation.isPending ? 'Criando…' : 'Criar exercício'}
        onPress={handleSubmit}
        loading={createMutation.isPending}
        testID="create-custom-exercise"
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
  },
  pillActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  pillPressed: {
    backgroundColor: colors.surfacePressed,
  },
  pillText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.accent,
  },
});
