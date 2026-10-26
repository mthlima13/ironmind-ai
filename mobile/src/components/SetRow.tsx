import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, useThemedStyles, layout, radii, spacing, typography, type ThemeColors } from '../theme';
import type { WeightUnit } from '../types/user';

/** Editable draft of a single set, kept as text while the user types. */
export type SetDraft = {
  id: string;
  /** Weight typed by the user, in the display unit. Empty means bodyweight. */
  weight: string;
  repetitions: string;
  /** RPE from 1 to 10, optional. */
  rpe: string;
};

export type SetRowProps = {
  /** 1-based position of the set inside the exercise. */
  index: number;
  draft: SetDraft;
  onChange: (patch: Partial<SetDraft>) => void;
  onRemove?: () => void;
  error?: string;
  weightUnit: WeightUnit;
  disabled?: boolean;
};

export function SetRow({
  index,
  draft,
  onChange,
  onRemove,
  error,
  weightUnit,
  disabled = false,
}: SetRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const unitLabel = weightUnit.toLowerCase();

  return (
    <View style={styles.container} testID={`set-row-${index}`}>
      <View style={styles.header}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{index}</Text>
        </View>
        {onRemove ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remover série ${index}`}
            testID={`set-remove-${index}`}
            onPress={onRemove}
            style={styles.removeButton}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.inputs}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{unitLabel}</Text>
          <TextInput
            accessibilityLabel={`Carga da série ${index} em ${unitLabel}`}
            testID={`set-weight-input-${index}`}
            value={draft.weight}
            onChangeText={(value) => onChange({ weight: value })}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            editable={!disabled}
            style={[styles.input, disabled ? styles.inputDisabled : null]}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>reps</Text>
          <TextInput
            accessibilityLabel={`Repetições da série ${index}`}
            testID={`set-reps-input-${index}`}
            value={draft.repetitions}
            onChangeText={(value) => onChange({ repetitions: value })}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            editable={!disabled}
            style={[styles.input, disabled ? styles.inputDisabled : null]}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>RPE</Text>
          <TextInput
            accessibilityLabel={`Esforço percebido da série ${index}`}
            testID={`set-rpe-input-${index}`}
            value={draft.rpe}
            onChangeText={(value) => onChange({ rpe: value })}
            placeholder="—"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            editable={!disabled}
            style={[styles.input, disabled ? styles.inputDisabled : null]}
          />
        </View>
      </View>

      {error ? (
        <Text style={styles.error} testID={`set-error-${index}`}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  indexBadge: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  indexText: {
    ...typography.label,
    color: colors.accent,
  },
  removeButton: {
    alignItems: 'center',
    height: layout.minTouchTarget,
    justifyContent: 'center',
    width: layout.minTouchTarget,
  },
  inputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  field: {
    flex: 1,
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  input: {
    ...typography.bodyStrong,
    backgroundColor: colors.backgroundElevated,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  inputDisabled: {
    opacity: 0.5,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
