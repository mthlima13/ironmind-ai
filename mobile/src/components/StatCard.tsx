import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme, useThemedStyles, radii, spacing, typography, type ThemeColors } from '../theme';

/** Extra visual variants. `hero` spans the grid row and may show a sparkline. */
type StatCardVariant = 'default' | 'hero' | 'wide';

export type StatCardProps = {
  label: string;
  value: string;
  /** Optional supporting text, e.g. a comparison with the previous week. */
  hint?: string;
  tone?: 'default' | 'accent' | 'positive' | 'negative';
  /** Icon rendered in a soft accent badge next to the label (decorative). */
  icon?: ReactNode;
  /** Optional comparison chip rendered next to the value, e.g. "+8,4%". */
  delta?: string;
  /** Chip color: positive uses success, negative uses danger. */
  deltaTone?: 'positive' | 'negative';
  /** Full-width variants: hero may render `spark`, wide is plain. */
  variant?: StatCardVariant;
  /**
   * Sparkline values in 0..1 (relative volume per day). Decorative only:
   * the number is always available as text next to or below the chart.
   */
  spark?: number[];
  testID?: string;
};

const TONE_PALETTE = {
  default: 'text',
  accent: 'accent',
  positive: 'success',
  negative: 'danger',
} as const;

const DELTA_PALETTE = {
  positive: 'success',
  negative: 'danger',
} as const;

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  icon,
  delta,
  deltaTone = 'positive',
  variant = 'default',
  spark,
  testID,
}: StatCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isWide = variant !== 'default';

  return (
    <View
      style={[styles.card, isWide && styles.cardWide, variant === 'hero' && styles.cardHero]}
      testID={testID}
    >
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        {icon ? (
          <View style={styles.iconBadge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {icon}
          </View>
        ) : null}
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colors[TONE_PALETTE[tone]] }]}>{value}</Text>
        {delta ? (
          <Text
            style={[styles.delta, { color: colors[DELTA_PALETTE[deltaTone]] }]}
            accessibilityLabel={`${delta} ${label}`}
          >
            {delta}
          </Text>
        ) : null}
      </View>

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {variant === 'hero' && spark && spark.length > 0 ? (
        <View
          style={styles.spark}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID={testID ? `${testID}-spark` : undefined}
        >
          {spark.map((ratio, index) => (
            <View
              key={index}
              style={[styles.sparkBar, { height: `${Math.max(8, Math.min(100, ratio * 100))}%` }]}
              testID={testID ? `${testID}-spark-${index}` : undefined}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  cardWide: {
    flexBasis: '100%',
  },
  cardHero: {
    padding: spacing.lg,
  },
  head: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    flex: 1,
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  valueRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  value: {
    ...typography.metric,
  },
  delta: {
    ...typography.caption,
    fontWeight: '700',
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  spark: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 3,
    height: 34,
    marginTop: spacing.xs,
  },
  sparkBar: {
    backgroundColor: colors.accentSoft,
    borderRadius: 3,
    flex: 1,
    minHeight: 3,
  },
});
