import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { TextField } from '../../components/TextField';
import { useTheme, useThemedStyles, layout, radii, spacing, typography, type ThemeColors } from '../../theme';
import { mapApiError } from '../../services/api';
import {
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  type Exercise,
  type ExerciseFilters,
  type MuscleGroup,
} from '../../types/exercise';
import { useExercises } from './useExercises';

export type ExerciseListProps = {
  filters: ExerciseFilters;
  onChangeFilters: (filters: ExerciseFilters) => void;
  onSelect?: (exercise: Exercise) => void;
};

const FILTER_ORDER: (MuscleGroup | 'ALL')[] = [
  'ALL',
  ...Object.values(MUSCLE_GROUPS),
];

/**
 * Catalogue with the search term and the muscle group filter
 * (SPEC RF-003).
 */
export function ExerciseList({
  filters,
  onChangeFilters,
  onSelect,
}: ExerciseListProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [search, setSearch] = useState(filters.search ?? '');
  const { data, isLoading, isError, error, refetch } = useExercises(filters);

  const applySearch = (value: string) => {
    setSearch(value);
    onChangeFilters({ ...filters, search: value });
  };

  return (
    <View style={styles.container}>
      <TextField
        label="Buscar exercício"
        testID="exercise-search"
        value={search}
        onChangeText={applySearch}
        placeholder="Nome ou equipamento"
        autoCapitalize="none"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTER_ORDER.map((group) => {
          const isActive = (filters.muscleGroup ?? 'ALL') === group;
          const label =
            group === 'ALL' ? 'Todos' : MUSCLE_GROUP_LABELS[group];
          return (
            <Pressable
              key={group}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => onChangeFilters({ ...filters, muscleGroup: group })}
              style={({ pressed }) => [
                styles.filter,
                isActive ? styles.filterActive : null,
                pressed ? styles.filterPressed : null,
              ]}
              testID={`exercise-filter-${group}`}
            >
              <Text style={[styles.filterText, isActive ? styles.filterTextActive : null]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? <LoadingState label="Carregando catálogo…" /> : null}

      {isError ? (
        <ErrorState
          message={mapApiError(error).message}
          onRetry={() => {
            void refetch();
          }}
          testID="exercise-list-error"
        />
      ) : null}

      {!isLoading && !isError && data && data.content.length === 0 ? (
        <EmptyState
          title="Nenhum exercício encontrado"
          description="Ajuste a busca ou troque o filtro de grupo muscular."
          actionLabel="Limpar filtros"
          onAction={() => {
            setSearch('');
            onChangeFilters({ search: '', muscleGroup: 'ALL' });
          }}
          icon={<Ionicons name="search-outline" size={26} color={colors.textMuted} />}
          testID="exercise-list-empty"
        />
      ) : null}

      {!isLoading && !isError && data && data.content.length > 0 ? (
        <View style={styles.list} testID="exercise-list">
          {data.content.map((exercise) => (
            <Pressable
              key={exercise.id}
              accessibilityRole="button"
              onPress={() => onSelect?.(exercise)}
              style={({ pressed }) => [
                styles.item,
                pressed ? styles.itemPressed : null,
              ]}
              testID={`exercise-item-${exercise.id}`}
            >
              <View style={styles.itemText}>
                <Text style={styles.itemName}>{exercise.name}</Text>
                <Text style={styles.itemMeta}>
                  {MUSCLE_GROUP_LABELS[exercise.primaryMuscleGroup] ??
                    exercise.primaryMuscleGroup}{' '}
                  · {exercise.equipment}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  filters: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filter: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
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
  filterText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.accent,
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: layout.minTouchTarget,
    padding: spacing.md,
  },
  itemPressed: {
    backgroundColor: colors.surfacePressed,
  },
  itemText: {
    flex: 1,
    gap: spacing.xs,
  },
  itemName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  itemMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
