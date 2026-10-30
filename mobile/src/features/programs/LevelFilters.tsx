import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
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
import {
  PROGRAM_LEVEL_FILTERS,
  PROGRAM_LEVEL_LABELS,
  type ProgramLevelFilter,
} from './trainingTemplates';

const FILTER_LABELS: Record<ProgramLevelFilter, string> = {
  ALL: 'Todos',
  ...PROGRAM_LEVEL_LABELS,
};

export type LevelFiltersProps = {
  value: ProgramLevelFilter;
  onChange: (value: ProgramLevelFilter) => void;
};

/**
 * Level filters of the "Explorar" tab.
 *
 * The selected option carries a check icon besides the accent color, so the
 * state never depends on color alone (SPEC section 11).
 */
export function LevelFilters({ value, onChange }: LevelFiltersProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filters}
      testID="level-filters"
    >
      {PROGRAM_LEVEL_FILTERS.map((level) => {
        const isActive = value === level;
        return (
          <Pressable
            key={level}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(level)}
            style={({ pressed }) => [
              styles.filter,
              isActive ? styles.filterActive : null,
              pressed ? styles.filterPressed : null,
            ]}
            testID={`level-filter-${level}`}
          >
            {isActive ? (
              <Ionicons name="checkmark" size={14} color={colors.accent} />
            ) : null}
            <Text style={[styles.text, isActive ? styles.textActive : null]}>
              {FILTER_LABELS[level]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  filters: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filter: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
  },
  filterActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  filterPressed: {
    backgroundColor: colors.surfacePressed,
  },
  text: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  textActive: {
    color: colors.accent,
  },
});
