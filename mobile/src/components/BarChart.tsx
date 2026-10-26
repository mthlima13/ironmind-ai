import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles, radii, spacing, typography, type ThemeColors } from '../theme';

export type BarChartPoint = {
  label: string;
  value: number;
  /** Value used on the accessibility label. */
  accessibleValue?: string;
};

export type BarChartProps = {
  points: BarChartPoint[];
  height?: number;
  /** Formats the value shown on the accessibility label. */
  formatValue?: (value: number) => string;
  testID?: string;
};

/**
 * Minimal bar chart drawn with plain views.
 *
 * The values are always exposed as text, so the chart is not conveyed by
 * color alone (SPEC 15.2).
 */
export function BarChart({
  points,
  height = 120,
  formatValue,
  testID,
}: BarChartProps) {
  const styles = useThemedStyles(createStyles);
  const maxValue = points.reduce((max, point) => Math.max(max, point.value), 0);

  return (
    <View style={styles.container} testID={testID}>
      <View style={[styles.chart, { height }]}>
        {points.map((point) => {
          const ratio = maxValue > 0 ? point.value / maxValue : 0;
          const barHeight = Math.max(ratio * (height - spacing.lg), 4);
          const valueText =
            point.accessibleValue ??
            (formatValue ? formatValue(point.value) : String(point.value));

          return (
            <View
              key={point.label}
              accessible
              accessibilityLabel={`${point.label}: ${valueText}`}
              style={styles.barWrapper}
            >
              <View style={[styles.bar, { height: barHeight }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {points.map((point) => (
          <Text key={point.label} style={styles.label}>
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  chart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    width: '100%',
  },
  labels: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
    textAlign: 'center',
  },
});
