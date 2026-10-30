import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  useTheme,
  useThemedStyles,
  layout,
  radii,
  spacing,
  typography,
  type ThemeColors,
} from '../../theme';

export type ProgramCardProps = {
  name: string;
  /** Short description shown in at most two lines. */
  description?: string;
  /** Weekly frequency and goal, e.g. "3 dias/semana • Hipertrofia". */
  meta: string;
  /** Optional badge, such as the level of a catalogue template. */
  badge?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
};

/**
 * Compact program entry of the Treinos listing.
 *
 * The card shows only the summary of the program: the days and the exercises
 * live in the details screen, so the main listing never grows into a long list
 * of exercises (SPEC section 4.1).
 */
export function ProgramCard({
  name,
  description,
  meta,
  badge,
  icon = 'barbell-outline',
  onPress,
  testID,
}: ProgramCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${meta}`}
      accessibilityHint="Abre os detalhes do programa"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      testID={testID}
    >
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>

        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: layout.minTouchTarget,
    padding: spacing.lg,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  iconWrapper: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  name: {
    ...typography.heading,
    color: colors.text,
    flex: 1,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.label,
    color: colors.accent,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 1,
  },
});
