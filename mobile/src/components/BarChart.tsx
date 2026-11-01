import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';

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
  /** Formats the value shown on the accessibility label and the value bubble. */
  formatValue?: (value: number) => string;
  testID?: string;
};

/** Headroom above the bars reserved for the permanent peak value bubble. */
const BUBBLE_BAND = 40;

/**
 * Bar chart drawn with plain views.
 *
 * The best day carries a permanent value bubble ("peak"); tapping any other
 * bar shows its value as well. Values are always exposed as text, so the
 * chart is not conveyed by color alone (SPEC 15.2).
 */
export function BarChart({
  points,
  height = 140,
  formatValue,
  testID,
}: BarChartProps) {
  const styles = useThemedStyles(createStyles);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const maxValue = points.reduce((max, point) => Math.max(max, point.value), 0);
  const peakIndex = points.findIndex(
    (point) => maxValue > 0 && point.value === maxValue
  );

  return (
    <View style={[styles.container, { height: height + BUBBLE_BAND }]} testID={testID}>
      <View style={[styles.chart, { height }]}>
        {/* Gridlines: hairlines at 33% and 66% plus a stronger baseline. */}
        <View style={styles.gridline33} />
        <View style={styles.gridline66} />
        <View style={styles.baseline} />

        {points.map((point, index) => {
          const ratio = maxValue > 0 ? point.value / maxValue : 0;
          const barHeight = Math.max(ratio * height, 4);
          const valueText =
            point.accessibleValue ??
            (formatValue ? formatValue(point.value) : String(point.value));
          const isPeak = index === peakIndex;
          const isMuted = !isPeak && point.value !== maxValue;
          const showBubble = isPeak || activeIndex === index;

          return (
            <View key={point.label} style={styles.barWrapper}>
              {showBubble ? (
                <View
                  style={[styles.bubble, { bottom: barHeight + spacing.sm + 4 }]}
                  pointerEvents="none"
                  testID={isPeak ? `${testID}-peak-bubble` : undefined}
                >
                  <Text style={styles.bubbleText}>{valueText}</Text>
                </View>
              ) : null}
              {isPeak ? <View style={[styles.peakRing, { height: barHeight + 6 }]} /> : null}
              <Pressable
                accessible
                accessibilityLabel={`${point.label}: ${valueText}`}
                accessibilityHint={isPeak ? undefined : 'Ativar para ver o valor deste dia'}
                onPress={() => setActiveIndex(activeIndex === index ? null : index)}
                style={[styles.barPress, { height: barHeight }]}
                testID={`${testID}-bar-${point.label}`}
              >
                <ChartBar
                  barHeight={barHeight}
                  isMuted={isMuted}
                  delay={index * 40}
                />
              </Pressable>
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

/**
 * Single animated bar.
 *
 * Starts static and grows only when the OS reports reduce motion OFF, so
 * test environments and accessibility settings never flash animation.
 */
function ChartBar({
  barHeight,
  isMuted,
  delay,
}: {
  barHeight: number;
  isMuted: boolean;
  delay: number;
}) {
  const styles = useThemedStyles(createStyles);
  const scaleY = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      scaleY.setValue(1);
      return;
    }
    scaleY.setValue(0.02);
    const animation = Animated.timing(scaleY, {
      toValue: 1,
      duration: 380,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, delay, scaleY]);

  // Scale from the center and push down half of the shrink so the bottom
  // edge stays anchored while the bar grows.
  const translateY = Animated.multiply(
    Animated.subtract(1, scaleY),
    barHeight * 0.5
  );

  return (
    <Animated.View
      style={[
        styles.bar,
        isMuted && styles.barMuted,
        {
          height: barHeight,
          transform: [{ scaleY }, { translateY }],
        },
      ]}
    >
      {isMuted ? null : <View style={styles.barFade} />}
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  chart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  gridline33: {
    backgroundColor: colors.border,
    bottom: '33%',
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  gridline66: {
    bottom: '66%',
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  baseline: {
    backgroundColor: colors.borderStrong,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  barPress: {
    width: '100%',
  },
  bar: {
    backgroundColor: colors.accent,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
    overflow: 'hidden',
    width: '100%',
  },
  barMuted: {
    backgroundColor: colors.surfacePressed,
    borderColor: colors.border,
    borderWidth: 1,
  },
  barFade: {
    backgroundColor: colors.accentSoft,
    bottom: 0,
    height: '45%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  peakRing: {
    borderColor: colors.accentSoft,
    borderRadius: radii.md,
    borderWidth: 3,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
  },
  bubble: {
    alignSelf: 'center',
    backgroundColor: colors.backgroundElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: 'absolute',
  },
  bubbleText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
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
