import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { PendingSyncBanner } from '../../src/components/PendingSyncBanner';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { useProfile } from '../../src/features/auth/useProfile';
import { ExerciseList } from '../../src/features/exercises/ExerciseList';
import { usePrograms } from '../../src/features/programs/usePrograms';
import {
  SetLogger,
  type LoggedSet,
} from '../../src/features/workouts/SetLogger';
import { useSessionStore } from '../../src/features/workouts/session.store';
import {
  useAddSessionExercise,
  useCompleteSession,
  useDeleteSet,
  useLastSessionSets,
  useRegisterSet,
  useStartSession,
  useUpdateSessionStatus,
  useUpdateSet,
} from '../../src/features/workouts/useWorkoutSession';
import { useOfflineSync } from '../../src/features/workouts/useOfflineSync';
import { ROUTES } from '../../src/navigation/linking';
import { ENDPOINTS } from '../../src/services/endpoints';
import { mapApiError } from '../../src/services/api';
import { useTheme, useThemedStyles, radii, spacing, typography, type ThemeColors } from '../../src/theme';
import type { Exercise, ExerciseFilters } from '../../src/types/exercise';
import { SESSION_STATUSES, type ExerciseSet } from '../../src/types/workout';
import { createIdempotencyKey } from '../../src/utils/id';

export default function StartWorkoutScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{
    programId?: string;
    programDayId?: string;
  }>();

  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const addSet = useSessionStore((state) => state.addSet);
  const addExercise = useSessionStore((state) => state.addExercise);
  const updateSetInStore = useSessionStore((state) => state.updateSet);
  const removeSetFromStore = useSessionStore((state) => state.removeSet);
  const clearSession = useSessionStore((state) => state.clearSession);
  const pendingCount = useSessionStore((state) => state.pendingCount);
  const failedCount = useSessionStore((state) => state.failedCount);
  const isOffline = useSessionStore((state) => state.isOffline);

  const { data: profile } = useProfile();
  const { data: programsData, isLoading: isLoadingPrograms } = usePrograms();
  const { enqueue, syncNow } = useOfflineSync();

  const startMutation = useStartSession();
  const registerMutation = useRegisterSet(session?.id ?? null);
  const addExerciseMutation = useAddSessionExercise(session?.id ?? null);
  const completeMutation = useCompleteSession(session?.id ?? null);
  const statusMutation = useUpdateSessionStatus(session?.id ?? null);
  const updateSetMutation = useUpdateSet();
  const deleteSetMutation = useDeleteSet();

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [exerciseFilters, setExerciseFilters] = useState<ExerciseFilters>({
    search: '',
    muscleGroup: 'ALL',
  });
  const [pendingExercise, setPendingExercise] = useState<Exercise | null>(null);
  const [editingSet, setEditingSet] = useState<{
    setId: string;
    weightKg: string;
    repetitions: string;
  } | null>(null);
  const autoStartedRef = useRef(false);

  const unit = profile?.preferences.preferredUnits ?? 'KG';
  const programs = useMemo(() => programsData?.content ?? [], [programsData]);

  // Starts the session requested from the Treinos tab.
  useEffect(() => {
    if (
      session ||
      autoStartedRef.current ||
      !params?.programId ||
      !params?.programDayId
    ) {
      return;
    }
    autoStartedRef.current = true;
    startMutation.mutate(
      {
        programId: params.programId,
        programDayId: params.programDayId,
      },
      {
        onSuccess: (created) => setSession(created),
      }
    );
  }, [params, session, setSession, startMutation]);

  const selectedExercise = useMemo(
    () =>
      session?.exercises.find((item) => item.id === selectedExerciseId) ?? null,
    [session, selectedExerciseId]
  );

  const { data: previousSets } = useLastSessionSets(
    selectedExercise?.exerciseId ?? null
  );

  const handleSaveSets = async (sets: LoggedSet[]) => {
    if (!selectedExercise || !session) {
      return;
    }

    const inputs = sets.map((set) => ({
      sessionExerciseId: selectedExercise.id,
      weightKg: set.weightKg,
      repetitions: set.repetitions,
      perceivedExertion: set.perceivedExertion,
      // Generated before the first attempt: if the request fails and goes to
      // the queue, the replay reuses the same key and cannot duplicate the set
      // (SPEC A.3).
      idempotencyKey: createIdempotencyKey(),
    }));

    try {
      const created = await registerMutation.mutateAsync(inputs);
      created.forEach((set) => addSet(selectedExercise.id, set));
    } catch (error) {
      const apiError = mapApiError(error);
      if (!apiError.isNetworkError) {
        return;
      }
      // Without connectivity the write goes to the local queue (SPEC 13).
      // The set is also added to the running session right away, with a
      // temporary id, so the user sees what was recorded instead of watching
      // the set disappear. The server assigns the definitive id when the queue
      // is replayed (SPEC 13).
      const firstSetNumber = selectedExercise.sets.length;
      for (const [index, input] of inputs.entries()) {
        // The key generated for the failed attempt is reused, never replaced.
        const { idempotencyKey, ...payload } = input;
        await enqueue({
          method: 'POST',
          endpoint: ENDPOINTS.sessions.addSet(session.id),
          payload,
          idempotencyKey,
        });
        addSet(selectedExercise.id, {
          id: `local-${idempotencyKey}`,
          setNumber: firstSetNumber + index + 1,
          weightKg: input.weightKg,
          repetitions: input.repetitions,
          perceivedExertion: input.perceivedExertion,
          completedAt: new Date().toISOString(),
        });
      }
    }
  };

  /**
   * Adds an exercise to the running session and selects it, so the user can
   * start logging the sets right away (SPEC RF-007 and 7.8).
   *
   * The new exercise goes to the end of the list: the position defines the
   * execution order.
   */
  const handleAddExercise = async (exercise: Exercise) => {
    if (!session) {
      return;
    }

    setPendingExercise(exercise);

    try {
      const created = await addExerciseMutation.mutateAsync({
        exerciseId: exercise.id,
        position: session.exercises.length + 1,
        notes: null,
      });
      addExercise(created);
      setSelectedExerciseId(created.id);
      setPendingExercise(null);
      setIsPickerOpen(false);
    } catch {
      // The failure is shown by the mutation state, with a retry action.
    }
  };

  const handleRetryAddExercise = () => {
    if (pendingExercise) {
      void handleAddExercise(pendingExercise);
      return;
    }
    addExerciseMutation.reset();
  };

  const handleFinish = async () => {
    if (!session) {
      return;
    }
    await completeMutation.mutateAsync();
    clearSession();
    setSelectedExerciseId(null);
    setIsCompleted(true);
  };

  /** Pauses or resumes the running session (SPEC 7.8). */
  const handleTogglePause = () => {
    if (!session) {
      return;
    }
    const nextStatus =
      session.status === SESSION_STATUSES.PAUSED
        ? SESSION_STATUSES.IN_PROGRESS
        : SESSION_STATUSES.PAUSED;
    statusMutation.mutate(
      { status: nextStatus },
      { onSuccess: (updated) => setSession({ ...session, status: updated.status }) }
    );
  };

  /** Abandons the session after the user confirms (SPEC 7.8). */
  const handleAbandon = () => {
    if (!session) {
      return;
    }
    Alert.alert(
      'Abandonar treino?',
      'A sessão será encerrada e não contará como treino concluído.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Abandonar',
          style: 'destructive',
          onPress: () => {
            statusMutation.mutate(
              { status: SESSION_STATUSES.ABANDONED },
              {
                onSuccess: () => {
                  clearSession();
                  setSelectedExerciseId(null);
                },
              }
            );
          },
        },
      ]
    );
  };

  const beginSetEdit = (set: ExerciseSet) => {
    setEditingSet({
      setId: set.id,
      weightKg: set.weightKg === null ? '' : String(set.weightKg),
      repetitions: String(set.repetitions),
    });
  };

  /** Corrects a set already registered (SPEC 7.8). */
  const handleSaveSetEdit = async () => {
    if (!editingSet || !selectedExercise) {
      return;
    }
    const weight = editingSet.weightKg.trim();
    const repetitions = Number(editingSet.repetitions);
    if (!Number.isFinite(repetitions) || repetitions < 1) {
      Alert.alert('Repetições inválidas', 'Informe um número de repetições maior que zero.');
      return;
    }
    try {
      const updated = await updateSetMutation.mutateAsync({
        setId: editingSet.setId,
        input: {
          weightKg: weight === '' ? null : Number(weight),
          repetitions,
        },
      });
      updateSetInStore(selectedExercise.id, updated);
      setEditingSet(null);
    } catch (error) {
      Alert.alert('Erro ao salvar série', mapApiError(error).message);
    }
  };

  /** Removes a set from the running session (SPEC 7.8). */
  const handleDeleteSet = (set: ExerciseSet) => {
    if (!selectedExercise) {
      return;
    }
    Alert.alert('Excluir série?', `A série ${set.setNumber} será removida da sessão.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteSetMutation.mutate(set.id, {
            onSuccess: () => {
              removeSetFromStore(selectedExercise.id, set.id);
              setEditingSet(null);
            },
            onError: (error) => {
              Alert.alert('Erro ao excluir série', mapApiError(error).message);
            },
          });
        },
      },
    ]);
  };

  if (isCompleted) {
    return (
      <Screen title="Treino concluído" testID="start-workout-screen">
        <Card title="Sessão finalizada">
          <Text style={styles.summaryText}>
            As séries registradas já estão no histórico e podem ser consultadas
            na aba Evolução.
          </Text>
        </Card>
        <Button
          label="Ver evolução"
          onPress={() => router.push(ROUTES.evolucao)}
          testID="workout-go-evolution"
        />
        <Button
          label="Voltar ao início"
          variant="secondary"
          onPress={() => router.push(ROUTES.inicio)}
          testID="workout-go-home"
        />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen
        title="Começar treino"
        subtitle="Escolha um dia do programa ou inicie um treino livre."
        testID="start-workout-screen"
      >
        <PendingSyncBanner
          pendingCount={pendingCount}
          failedCount={failedCount}
          isOffline={isOffline}
          onSync={() => void syncNow()}
        />

        <Button
          label="Treino livre"
          variant="secondary"
          onPress={() =>
            startMutation.mutate(
              { programId: null, programDayId: null },
              { onSuccess: (created) => setSession(created) }
            )
          }
          loading={startMutation.isPending}
          icon={<Ionicons name="flash-outline" size={18} color={colors.accent} />}
          testID="start-free-session-button"
        />

        {isLoadingPrograms ? <LoadingState label="Carregando programas…" /> : null}

        {startMutation.isError ? (
          <ErrorState
            message={mapApiError(startMutation.error).message}
            onRetry={() => startMutation.reset()}
            testID="start-workout-error"
          />
        ) : null}

        {!isLoadingPrograms && programs.length === 0 ? (
          <EmptyState
            title="Nenhum programa disponível"
            description="Crie um programa na aba Treinos para começar a registrar séries."
            actionLabel="Ir para Treinos"
            onAction={() => router.push(ROUTES.treinos)}
            testID="start-workout-empty"
          />
        ) : null}

        {programs.map((program) => (
          <Card key={program.id} title={program.name} subtitle={program.description}>
            {program.days.map((day) => (
              <View key={day.id} style={styles.dayRow}>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayName}>{day.name}</Text>
                  <Text style={styles.dayMeta}>
                    {day.exercises.length} exercícios · {day.exercises.length * 3}{' '}
                    séries alvo
                  </Text>
                </View>
                <Button
                  label="Iniciar"
                  onPress={() =>
                    startMutation.mutate(
                      { programId: program.id, programDayId: day.id },
                      { onSuccess: (created) => setSession(created) }
                    )
                  }
                  loading={startMutation.isPending}
                  testID={`start-session-${day.id}`}
                />
              </View>
            ))}
          </Card>
        ))}
      </Screen>
    );
  }

  const isPaused = session.status === SESSION_STATUSES.PAUSED;

  return (
    <Screen
      title={isPaused ? 'Sessão pausada' : 'Sessão em andamento'}
      subtitle={`Iniciada em ${new Date(session.startedAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`}
      testID="start-workout-screen"
    >
      <PendingSyncBanner
        pendingCount={pendingCount}
        failedCount={failedCount}
        isOffline={isOffline}
        onSync={() => void syncNow()}
      />

      <View style={styles.statusRow}>
        <Button
          label={isPaused ? 'Retomar sessão' : 'Pausar sessão'}
          variant="secondary"
          onPress={handleTogglePause}
          loading={statusMutation.isPending}
          testID="toggle-session-pause"
        />
        <Button
          label="Abandonar"
          variant="ghost"
          onPress={handleAbandon}
          disabled={statusMutation.isPending}
          testID="abandon-session-button"
        />
      </View>

      <Card title="Exercícios" subtitle="Toque no exercício para registrar as séries">
        {session.exercises.length === 0 ? (
          <EmptyState
            title="Nenhum exercício na sessão"
            description="Esta sessão ainda não tem exercícios. Adicione um exercício do catálogo para começar a registrar as séries."
            actionLabel="Adicionar exercício"
            onAction={() => setIsPickerOpen(true)}
            actionTestID="add-exercise-button"
            testID="session-exercises-empty"
          />
        ) : (
          <>
            {session.exercises.map((sessionExercise) => {
              const isSelected = sessionExercise.id === selectedExerciseId;
              return (
                <Pressable
                  key={sessionExercise.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedExerciseId(sessionExercise.id)}
                  style={[styles.exerciseRow, isSelected ? styles.exerciseRowActive : null]}
                  testID={`session-exercise-${sessionExercise.id}`}
                >
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>
                      {sessionExercise.exercise.name}
                    </Text>
                    <Text style={styles.exerciseMeta}>
                      {sessionExercise.sets.length}{' '}
                      {sessionExercise.sets.length === 1 ? 'série registrada' : 'séries registradas'}
                    </Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              );
            })}

            <Button
              label="Adicionar exercício"
              variant="secondary"
              onPress={() => setIsPickerOpen(true)}
              icon={<Ionicons name="add-circle-outline" size={18} color={colors.accent} />}
              testID="add-exercise-button"
            />
          </>
        )}
      </Card>

      {isPickerOpen ? (
        <Card
          title="Adicionar exercício"
          subtitle="Busque no catálogo e toque no exercício para adicioná-lo à sessão"
        >
          <ExerciseList
            filters={exerciseFilters}
            onChangeFilters={setExerciseFilters}
            onSelect={(exercise) => {
              void handleAddExercise(exercise);
            }}
          />

          {addExerciseMutation.isPending ? (
            <LoadingState label="Adicionando exercício…" />
          ) : null}

          {addExerciseMutation.isError ? (
            <ErrorState
              message={mapApiError(addExerciseMutation.error).message}
              onRetry={handleRetryAddExercise}
              testID="add-exercise-error"
            />
          ) : null}

          <Button
            label="Fechar catálogo"
            variant="ghost"
            onPress={() => setIsPickerOpen(false)}
            testID="close-exercise-picker"
          />
        </Card>
      ) : null}

      {selectedExercise ? (
        <Card title="Registrar séries">
          <SetLogger
            key={selectedExercise.id}
            exerciseName={selectedExercise.exercise.name}
            weightUnit={unit}
            previousSets={previousSets}
            onSubmit={handleSaveSets}
            isSubmitting={registerMutation.isPending}
            submitError={
              registerMutation.isError
                ? mapApiError(registerMutation.error).message
                : undefined
            }
          />

          {selectedExercise.sets.length > 0 ? (
            <View style={styles.setsList}>
              <Text style={styles.setsTitle}>Séries registradas</Text>
              {selectedExercise.sets
                .slice()
                .sort((a, b) => a.setNumber - b.setNumber)
                .map((set) => (
                  <View key={set.id} style={styles.setRow}>
                    <View style={styles.setInfo}>
                      <Text style={styles.setText}>
                        Série {set.setNumber}: {set.weightKg === null ? 'Corpo livre' : `${set.weightKg} kg`} × {set.repetitions}
                      </Text>
                    </View>
                    <View style={styles.setActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Corrigir série ${set.setNumber}`}
                        onPress={() => beginSetEdit(set)}
                        style={styles.setAction}
                        testID={`edit-set-${set.id}`}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.accent} />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Excluir série ${set.setNumber}`}
                        onPress={() => handleDeleteSet(set)}
                        style={styles.setAction}
                        testID={`delete-set-${set.id}`}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                ))}
            </View>
          ) : null}

          {editingSet ? (
            <View style={styles.editSetPanel}>
              <Text style={styles.setsTitle}>Corrigir série</Text>
              <TextField
                label="Carga (kg)"
                value={editingSet.weightKg}
                onChangeText={(value) =>
                  setEditingSet((current) =>
                    current ? { ...current, weightKg: value } : current
                  )
                }
                placeholder="Opcional"
                keyboardType="decimal-pad"
              />
              <TextField
                label="Repetições"
                value={editingSet.repetitions}
                onChangeText={(value) =>
                  setEditingSet((current) =>
                    current ? { ...current, repetitions: value } : current
                  )
                }
                keyboardType="number-pad"
              />
              <View style={styles.editSetActions}>
                <Button
                  label={updateSetMutation.isPending ? 'Salvando…' : 'Salvar'}
                  onPress={handleSaveSetEdit}
                  disabled={updateSetMutation.isPending}
                  size="md"
                />
                <Button
                  label="Cancelar"
                  variant="ghost"
                  onPress={() => setEditingSet(null)}
                  size="md"
                />
              </View>
            </View>
          ) : null}
        </Card>
      ) : null}

      <Button
        label="Finalizar sessão"
        onPress={handleFinish}
        loading={completeMutation.isPending}
        testID="finish-session-button"
      />
      {completeMutation.isError ? (
        <ErrorState
          message={mapApiError(completeMutation.error).message}
          onRetry={() => completeMutation.reset()}
          testID="finish-session-error"
        />
      ) : null}
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  dayRow: {
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
  summaryText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  exerciseRow: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.sm,
  },
  exerciseRowActive: {
    backgroundColor: colors.accentSoft,
  },
  exerciseInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  exerciseName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  exerciseMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  setsList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  setsTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  setRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  setInfo: {
    flex: 1,
  },
  setText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  setActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  setAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  editSetPanel: {
    gap: spacing.sm,
    marginTop: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  editSetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
