import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { Screen } from '../../src/components/Screen';
import { ExerciseList } from '../../src/features/exercises/ExerciseList';
import { ProgramDayEditor } from '../../src/features/programs/ProgramDayEditor';
import { usePrograms } from '../../src/features/programs/usePrograms';
import type { ProgramDay, WorkoutProgram } from '../../src/types/program';
import type { ExerciseFilters } from '../../src/types/exercise';
import { ROUTES } from '../../src/navigation/linking';
import { mapApiError } from '../../src/services/api';
import { colors, radii, spacing, typography } from '../../src/theme';

type Section = 'programas' | 'exercicios';

export default function WorkoutsScreen() {
  const router = useRouter();
  const [section, setSection] = useState<Section>('programas');
  const [filters, setFilters] = useState<ExerciseFilters>({
    search: '',
    muscleGroup: 'ALL',
  });
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [draftDays, setDraftDays] = useState<Record<string, ProgramDay>>({});

  const { data, isLoading, isError, error, refetch } = usePrograms();

  const programs: WorkoutProgram[] = useMemo(() => data?.content ?? [], [data]);

  const dayDrafts = useMemo(() => {
    const result: Record<string, ProgramDay> = {};
    programs.forEach((program) => {
      program.days.forEach((day) => {
        result[day.id] = draftDays[day.id] ?? day;
      });
    });
    return result;
  }, [programs, draftDays]);

  const startSession = (programId: string, programDayId: string) => {
    router.push({
      pathname: ROUTES.comecar,
      params: { programId, programDayId },
    });
  };

  return (
    <Screen
      title="Treinos"
      subtitle="Programas, divisão atual e catálogo de exercícios."
      testID="workouts-screen"
    >
      <View style={styles.segmented}>
        {(
          [
            { key: 'programas', label: 'Programas' },
            { key: 'exercicios', label: 'Exercícios' },
          ] as const
        ).map((item) => {
          const isActive = section === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => setSection(item.key)}
              style={[styles.segment, isActive ? styles.segmentActive : null]}
              testID={`workouts-section-${item.key}`}
            >
              <Text
                style={[
                  styles.segmentText,
                  isActive ? styles.segmentTextActive : null,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {section === 'programas' ? (
        <View style={styles.section}>
          <Button
            label="Coach IA"
            variant="secondary"
            icon={<Ionicons name="chatbubbles-outline" size={18} color={colors.accent} />}
            onPress={() => router.push(ROUTES.coach)}
            testID="workouts-coach-button"
          />

          <Button
            label="Proposta de treino com IA"
            variant="secondary"
            icon={<Ionicons name="sparkles-outline" size={18} color={colors.accent} />}
            onPress={() => router.push(ROUTES.propostas)}
            testID="workouts-proposal-button"
          />

          {isLoading ? <LoadingState label="Carregando programas…" /> : null}

          {isError ? (
            <ErrorState
              message={mapApiError(error).message}
              onRetry={() => {
                void refetch();
              }}
              testID="workouts-error"
            />
          ) : null}

          {!isLoading && !isError && programs.length === 0 ? (
            <EmptyState
              title="Nenhum programa ainda"
              description="Crie seu primeiro programa com dias, exercícios e séries alvo."
              actionLabel="Criar programa"
              onAction={() => setSection('programas')}
              icon={<Ionicons name="calendar-outline" size={26} color={colors.textMuted} />}
              testID="workouts-empty"
            />
          ) : null}

          {programs.map((program) => (
            <Card
              key={program.id}
              title={program.name}
              subtitle={program.description}
              testID={`program-${program.id}`}
            >
              {program.days.map((day) => {
                const draft = dayDrafts[day.id] ?? day;
                const isExpanded = expandedDayId === day.id;
                return (
                  <View key={day.id} style={styles.day}>
                    <View style={styles.dayHeader}>
                      <View style={styles.dayInfo}>
                        <Text style={styles.dayName}>{draft.name}</Text>
                        <Text style={styles.dayMeta}>
                          {draft.exercises.length}{' '}
                          {draft.exercises.length === 1 ? 'exercício' : 'exercícios'}
                        </Text>
                      </View>
                      <Button
                        label="Iniciar"
                        size="md"
                        onPress={() => startSession(program.id, day.id)}
                        testID={`start-day-${day.id}`}
                      />
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                      onPress={() => setExpandedDayId(isExpanded ? null : day.id)}
                      style={styles.editToggle}
                      testID={`toggle-day-editor-${day.id}`}
                    >
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.accent}
                      />
                      <Text style={styles.editToggleText}>
                        {isExpanded ? 'Fechar editor' : 'Editar dia'}
                      </Text>
                    </Pressable>

                    {isExpanded ? (
                      <ProgramDayEditor
                        day={draft}
                        onChange={(updated) =>
                          setDraftDays((current) => ({
                            ...current,
                            [updated.id]: updated,
                          }))
                        }
                      />
                    ) : null}
                  </View>
                );
              })}
            </Card>
          ))}
        </View>
      ) : (
        <ExerciseList
          filters={filters}
          onChangeFilters={setFilters}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  segmented: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  segment: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  segmentActive: {
    backgroundColor: colors.accentSoft,
  },
  segmentText: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.accent,
  },
  day: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  dayHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  dayInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  dayName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  dayMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  editToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
  },
  editToggleText: {
    ...typography.caption,
    color: colors.accent,
  },
});
