import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { Screen } from '../../src/components/Screen';
import { CustomExerciseForm } from '../../src/features/exercises/CustomExerciseForm';
import { ExerciseList } from '../../src/features/exercises/ExerciseList';
import { ProgramDayEditor } from '../../src/features/programs/ProgramDayEditor';
import { usePrograms, useUpdateProgram } from '../../src/features/programs/usePrograms';
import { SPLIT_TYPE_LABELS, type CreateProgramInput, type ProgramDay, type WorkoutProgram } from '../../src/types/program';
import type { ExerciseFilters } from '../../src/types/exercise';
import { ROUTES } from '../../src/navigation/linking';
import { mapApiError } from '../../src/services/api';
import { createIdempotencyKey } from '../../src/utils/id';
import { useTheme, useThemedStyles, radii, spacing, typography, type ThemeColors } from '../../src/theme';

type Section = 'programas' | 'exercicios';

export default function WorkoutsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [section, setSection] = useState<Section>('programas');
  const [filters, setFilters] = useState<ExerciseFilters>({
    search: '',
    muscleGroup: 'ALL',
  });
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [draftDays, setDraftDays] = useState<Record<string, ProgramDay>>({});
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = usePrograms();
  const updateProgram = useUpdateProgram();

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

  const saveDay = async (program: WorkoutProgram, day: ProgramDay) => {
    // The backend replaces the whole structure and derives the positions from
    // the order of the lists (SPEC RF-005).
    const payload: CreateProgramInput = {
      name: program.name,
      description: program.description ?? '',
      goal: program.goal,
      splitType: program.splitType,
      days: program.days.map((currentDay) => {
        const source = currentDay.id === day.id ? day : currentDay;
        return {
          name: source.name,
          exercises: source.exercises
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((ex) => ({
              exerciseId: ex.exerciseId,
              targetSets: ex.targetSets,
              targetRepsMin: ex.targetRepsMin,
              targetRepsMax: ex.targetRepsMax,
              restSeconds: ex.restSeconds,
              notes: ex.notes ?? undefined,
            })),
        };
      }),
    };

    try {
      await updateProgram.mutateAsync({
        id: program.id,
        input: payload,
        idempotencyKey: createIdempotencyKey(),
      });
      setDraftDays((current) => {
        const next = { ...current };
        delete next[day.id];
        return next;
      });
      Alert.alert('Programa atualizado', 'As alterações do dia foram salvas.');
    } catch (err) {
      Alert.alert('Erro ao salvar', mapApiError(err).message);
    }
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
              style={({ pressed }) => [
                styles.segment,
                isActive ? styles.segmentActive : null,
                pressed ? styles.segmentPressed : null,
              ]}
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
              onAction={() => router.push(ROUTES.propostas)}
              icon={<Ionicons name="calendar-outline" size={26} color={colors.textMuted} />}
              testID="workouts-empty"
            />
          ) : null}

          {programs.map((program) => (
            <Card
              key={program.id}
              title={program.name}
              subtitle={`${SPLIT_TYPE_LABELS[program.splitType]}${program.description ? ` • ${program.description}` : ''}`}
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
                      style={({ pressed }) => [
                        styles.editToggle,
                        pressed ? styles.editTogglePressed : null,
                      ]}
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
                      <View style={styles.editorContainer}>
                        <ProgramDayEditor
                          day={draft}
                          onChange={(updated) =>
                            setDraftDays((current) => ({
                              ...current,
                              [updated.id]: updated,
                            }))
                          }
                        />
                        <Button
                          label={updateProgram.isPending ? 'Salvando…' : 'Salvar dia'}
                          onPress={() => saveDay(program, draft)}
                          disabled={updateProgram.isPending}
                          testID={`save-day-${day.id}`}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </Card>
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <Button
            label={isCreateExerciseOpen ? 'Fechar formulário' : 'Criar exercício personalizado'}
            variant="secondary"
            icon={<Ionicons name="add-circle-outline" size={18} color={colors.accent} />}
            onPress={() => setIsCreateExerciseOpen((current) => !current)}
            testID="toggle-custom-exercise-form"
          />

          {isCreateExerciseOpen ? (
            <Card
              title="Novo exercício"
              subtitle="O exercício fica disponível apenas para a sua conta."
            >
              <CustomExerciseForm onCreated={() => setIsCreateExerciseOpen(false)} />
            </Card>
          ) : null}

          <ExerciseList
            filters={filters}
            onChangeFilters={setFilters}
          />
        </View>
      )}
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  segmented: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
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
  segmentPressed: {
    backgroundColor: colors.surfacePressed,
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
  editTogglePressed: {
    opacity: 0.6,
  },
  editToggleText: {
    ...typography.caption,
    color: colors.accent,
  },
  editorContainer: {
    gap: spacing.sm,
  },
});
