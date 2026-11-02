import { StyleSheet, Text, View } from 'react-native';

import {
  useThemedStyles,
  radii,
  spacing,
  type ThemeColors,
} from '../../theme';

type StepChipsProps = {
  /** The current onboarding step: 1 = access data, 2 = preferences. */
  current: 1 | 2;
};

/**
 * Progress chips of the two-step sign-up flow (SPEC 15.3).
 *
 * The chips mirror the sandbox design: step 1 shows a single active chip,
 * step 2 shows the muted "Etapa 1" chip plus the active "Etapa 2" one.
 */
export function StepChips({ current }: StepChipsProps) {
  const styles = useThemedStyles(createStyles);

  if (current === 1) {
    return (
      <View
        style={styles.steps}
        testID="step-chips"
        accessibilityLabel="Etapa 1 de 2"
      >
        <View style={[styles.dot, styles.dotActive]} testID="step-chip-1-active">
          <Text style={styles.dotTextActive}>Etapa 1 de 2 — Dados de acesso</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.steps}
      testID="step-chips"
      accessibilityLabel="Etapa 2 de 2"
    >
      <View style={styles.dot} testID="step-chip-1-done">
        <Text style={styles.dotText}>Etapa 1 — Dados de acesso</Text>
      </View>
      <View style={[styles.dot, styles.dotActive]} testID="step-chip-2-active">
        <Text style={styles.dotTextActive}>Etapa 2 de 2 — Preferências</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  steps: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dot: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 24,
    paddingVertical: 3,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dotText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  dotTextActive: {
    color: colors.onAccent,
    fontSize: 11,
    fontWeight: '600',
  },
});
