import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, layout, radii, spacing, typography } from '../theme';

export type StepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  testID: string;
};

/**
 * Small numeric control used by the program editors.
 *
 * The touch targets are never smaller than 44pt, so the control stays usable
 * mid-workout (SPEC 15.2). The value never leaves the informed range.
 */
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  testID,
}: StepperProps) {
  const decrease = () => onChange(Math.max(min, value - step));
  const increase = () => {
    const next = value + step;
    onChange(max === undefined ? next : Math.min(max, next));
  };

  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Diminuir ${label}`}
          accessibilityState={{ disabled: value <= min }}
          testID={`${testID}-decrease`}
          onPress={decrease}
          style={styles.stepperButton}
        >
          <Ionicons name="remove" size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.stepperValue} testID={testID}>
          {value}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Aumentar ${label}`}
          accessibilityState={{ disabled: max !== undefined && value >= max }}
          testID={`${testID}-increase`}
          onPress={increase}
          style={styles.stepperButton}
        >
          <Ionicons name="add" size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    gap: spacing.xs,
    minWidth: 88,
  },
  stepperLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  stepperControls: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: layout.minTouchTarget,
  },
  stepperButton: {
    alignItems: 'center',
    height: layout.minTouchTarget,
    justifyContent: 'center',
    width: 36,
  },
  stepperValue: {
    ...typography.bodyStrong,
    color: colors.text,
  },
});
