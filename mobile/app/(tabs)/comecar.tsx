import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { PendingSyncBanner } from '../../src/components/PendingSyncBanner';
import { Screen } from '../../src/components/Screen';
import { useProfile } from '../../src/features/auth/useProfile';
import { usePrograms } from '../../src/features/programs/usePrograms';
import {
  SetLogger,
  type LoggedSet,
} from '../../src/features/workouts/SetLogger';
import { useSessionStore } from '../../src/features/workouts/session.store';
import {
  useCompleteSession,
  useLastSessionSets,
  useRegisterSet,
  useStartSession,
} from '../../src/features/workouts/useWorkoutSession';
import { useOfflineSync } from '../../src/features/workouts/useOfflineSync';
import { ROUTES } from '../../src/navigation/linking';
import { ENDPOINTS } from '../../src/services/endpoints';
import { mapApiError } from '../../src/services/api';
import { colors, radii, spacing, typography } from '../../src/theme';
import { createIdempotencyKey } from '../../src/utils/id';

export default function StartWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    programId?: string;
    programDayId?: string;
  }>();

  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const addSet = useSessionStore((state) => state.addSet);
  const clearSession = useSessionStore((state) => state.clearSession);
  const pendingCount = useSessionStore((state) => state.pendingCount);
  const isOffline = useSessionStore((state) => state.isOffline);

  const { data: profile } = useProfile();
  const { data: programsData, isLoading: isLoadingPrograms } = usePrograms();
  const { enqueue } = useOfflineSync();

  const startMutation = useStartSession();
  const registerMutation = useRegisterSet(session?.id ?? null);
  const completeMutation = useCompleteSession(session?.id ?? null);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
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
      for (const input of inputs) {
        const idempotencyKey = createIdempotencyKey();
        await enqueue({
          method: 'POST',
          endpoint: ENDPOINTS.sessions.addSet(session.id),
          payload: input,
          idempotencyKey,
        });
      }
    }
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

  if (isCompleted) {
    return (
      <Screen title="Treino concluído" testID="start-workout-screen">
        <Card title="Sessão finalizada">
          <Text style={styles.summaryText}>
            As séries registradas já estão no histórico e os recordes foram
            reavaliados pelo servidor.
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
        subtitle="Escolha um dia do programa para iniciar a sessão."
        testID="start-workout-screen"
      >
        <PendingSyncBanner pendingCount={pendingCount} isOffline={isOffline} />

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

  return (
    <Screen
      title="Sessão em andamento"
      subtitle={`Iniciada em ${new Date(session.startedAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`}
      testID="start-workout-screen"
    >
      <PendingSyncBanner pendingCount={pendingCount} isOffline={isOffline} />

      <Card title="Exercícios" subtitle="Toque no exercício para registrar as séries">
        {session.exercises.length === 0 ? (
          <Text style={styles.summaryText}>
            Esta sessão ainda não tem exercícios.
          </Text>
        ) : (
          session.exercises.map((sessionExercise) => {
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
          })
        )}
      </Card>

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

const styles = StyleSheet.create({
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
});
