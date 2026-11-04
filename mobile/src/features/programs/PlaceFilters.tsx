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
  PROGRAM_PLACE_FILTERS,
  PROGRAM_PLACE_LABELS,
  type ProgramPlaceFilter,
} from './trainingTemplates';

const FILTER_LABELS: Record<ProgramPlaceFilter, string> = {
  ALL: 'Todos os locais',
  ...PROGRAM_PLACE_LABELS,
};

export type PlaceFiltersProps = {
  value: ProgramPlaceFilter;
  onChange: (value: ProgramPlaceFilter) => void;
};

/**
 * Place filters of the "Explorar" tab.
 *
 * Keeps the gym models apart from the home models, which only use dumbbells
 * and body weight. The selected option carries a check icon besides the accent
 * color, so the state never depends on color alone (SPEC section 11).
 */
export function PlaceFilters({ value, onChange }: PlaceFiltersProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filters}
      testID="place-filters"
    >
      {PROGRAM_PLACE_FILTERS.map((place) => {
        const isActive = value === place;
        return (
          <Pressable
            key={place}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(place)}
            style={({ pressed }) => [
              styles.filter,
              isActive ? styles.filterActive : null,
              pressed ? styles.filterPressed : null,
            ]}
            testID={`place-filter-${place}`}
          >
            {isActive ? (
              <Ionicons name="checkmark" size={14} color={colors.accent} />
            ) : null}
            <Text style={[styles.text, isActive ? styles.textActive : null]}>
              {FILTER_LABELS[place]}
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
