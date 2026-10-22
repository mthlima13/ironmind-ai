import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

export type StatCardProps = {
  label: string;
  value: string;
  /** Optional supporting text, e.g. a comparison with the previous week. */
  hint?: string;
  tone?: 'default' | 'accent' | 'positive' | 'negative';
  testID?: string;
};

const TONE_COLOR = {
  default: colors.text,
  accent: colors.accent,
  positive: colors.success,
  negative: colors.danger,
} as const;

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  testID,
}: StatCardProps) {
  return (
    <View style={styles.card} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: TONE_COLOR[tone] }]}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: 150,
    gap: spacing.xs,
    padding: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
  },
  value: {
    ...typography.metric,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
