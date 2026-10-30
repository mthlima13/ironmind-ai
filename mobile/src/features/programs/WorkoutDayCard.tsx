import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import {
  useTheme,
  useThemedStyles,
  layout,
  radii,
  spacing,
  typography,
  type ThemeColors,
} from '../../theme';

export type DayExercisePreview = {
  id: string;
  name: string;
  /** Target sets, reps and rest, already formatted. */
  meta: string;
};

export type WorkoutDayCardProps = {
  dayName: string;
  exerciseCount: number;
  exercises: DayExercisePreview[];
  isExpanded: boolean;
  onToggle: () => void;
  /** Omitted for catalogue templates, which must be copied before starting. */
  onStart?: () => void;
  startTestID?: string;
  /** Editing controls rendered after the exercise preview. */
  children?: ReactNode;
  testID?: string;
};

/**
 * Collapsed day card of the program details screen.
 *
 * The header shows the day name, the number of exercises and the start action;
 * the exercises are only rendered when the card is expanded (SPEC section 5).
 */
export function WorkoutDayCard({
  dayName,
  exerciseCount,
  exercises,
  isExpanded,
  onToggle,
  onStart,
  startTestID,
  children,
  testID,
}: WorkoutDayCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.dayName}>{dayName}</Text>
          <Text style={styles.dayMeta}>
            {exerciseCount} {exerciseCount === 1 ? 'exercício' : 'exercícios'}
          </Text>
        </View>
        {onStart ? (
          <Button
            label="Iniciar"
            size="md"
            onPress={onStart}
            testID={startTestID}
            accessibilityLabel={`Iniciar ${dayName}`}
          />
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={
          isExpanded
            ? `Ocultar exercícios de ${dayName}`
            : `Ver exercícios de ${dayName}`
        }
        onPress={onToggle}
        style={({ pressed }) => [styles.toggle, pressed ? styles.pressed : null]}
        testID={testID ? `${testID}-toggle` : undefined}
      >
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.accent}
        />
        <Text style={styles.toggleText}>
          {isExpanded ? 'Ocultar exercícios' : 'Ver exercícios'}
        </Text>
      </Pressable>

      {isExpanded ? (
        <View style={styles.expanded} testID={testID ? `${testID}-exercises` : undefined}>
          {exercises.length === 0 ? (
            <Text style={styles.empty}>
              Nenhum exercício neste dia. Abra a edição para adicionar.
            </Text>
          ) : (
            exercises.map((exercise, index) => (
              <View
                key={exercise.id}
                style={styles.exerciseRow}
                testID={testID ? `${testID}-exercise-${exercise.id}` : undefined}
              >
                <View style={styles.position}>
                  <Text style={styles.positionText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseText}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>{exercise.meta}</Text>
                </View>
              </View>
            ))
          )}

          {children}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  dayName: {
    ...typography.heading,
    color: colors.text,
  },
  dayMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  toggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: layout.minTouchTarget,
  },
  toggleText: {
    ...typography.caption,
    color: colors.accent,
  },
  pressed: {
    opacity: 0.6,
  },
  expanded: {
    gap: spacing.sm,
  },
  exerciseRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  position: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  positionText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  exerciseText: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    ...typography.body,
    color: colors.text,
  },
  exerciseMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
