import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, useThemedStyles, layout, radii, spacing, typography, type ThemeColors } from '../theme';

export type StepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  testID: string;
  context?: string;
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
  context,
}: StepperProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const decrease = () => onChange(Math.max(min, value - step));
  const increase = () => {
    const next = value + step;
    onChange(max === undefined ? next : Math.min(max, next));
  };
  const decreaseDisabled = value <= min;
  const increaseDisabled = max !== undefined && value >= max;
  const contextSuffix = context ? ` ${context}` : '';
  const decreaseLabel = `Diminuir ${label.toLowerCase()}${contextSuffix}`;
  const increaseLabel = `Aumentar ${label.toLowerCase()}${contextSuffix}`;

  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={decreaseLabel}
          accessibilityState={{ disabled: decreaseDisabled }}
          disabled={decreaseDisabled}
          testID={`${testID}-decrease`}
          onPress={decrease}
          style={({ pressed }) => [
            styles.stepperButton,
            pressed ? styles.stepperButtonPressed : null,
            decreaseDisabled ? styles.stepperButtonDisabled : null,
          ]}
        >
          <Ionicons name="remove" size={16} color={colors.text} />
        </Pressable>
        <Text
          style={styles.stepperValue}
          testID={testID}
          accessibilityLabel={`${label}${contextSuffix}: ${value}`}
          accessibilityLiveRegion="polite"
          accessibilityValue={{ min, max, now: value }}>
          {value}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={increaseLabel}
          accessibilityState={{ disabled: increaseDisabled }}
          disabled={increaseDisabled}
          testID={`${testID}-increase`}
          onPress={increase}
          style={({ pressed }) => [
            styles.stepperButton,
            pressed ? styles.stepperButtonPressed : null,
            increaseDisabled ? styles.stepperButtonDisabled : null,
          ]}
        >
          <Ionicons name="add" size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    borderColor: colors.borderStrong,
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
    width: layout.minTouchTarget,
  },
  stepperButtonPressed: {
    opacity: 0.6,
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperValue: {
    ...typography.bodyStrong,
    color: colors.text,
  },
});
