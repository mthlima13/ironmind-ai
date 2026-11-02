import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BarChart } from '../../src/components/BarChart';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { PendingSyncBanner } from '../../src/components/PendingSyncBanner';
import { Screen } from '../../src/components/Screen';
import { StatCard } from '../../src/components/StatCard';
import { useDashboardOverview } from '../../src/features/analytics/useDashboard';
import { useAuthState } from '../../src/features/auth/useAuth';
import { useProfile } from '../../src/features/auth/useProfile';
import { useSessionStore } from '../../src/features/workouts/session.store';
import { useOfflineSync } from '../../src/features/workouts/useOfflineSync';
import { usePrograms } from '../../src/features/programs/usePrograms';
import { ROUTES } from '../../src/navigation/linking';
import { mapApiError } from '../../src/services/api';
import { useTheme, useThemedStyles, radii, spacing, typography, type ThemeColors } from '../../src/theme';
import { formatWeight } from '../../src/utils/units';

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`;
}

/** "Iniciado às HH:mm" of the running session. */
function formatStartedTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuthState();
  const { data: profile } = useProfile();
  const { data, isLoading, isError, error, refetch } = useDashboardOverview();

  const { pendingCount, failedCount, syncNow } = useOfflineSync();
  const session = useSessionStore((state) => state.session);
  const hasActiveSession = session !== null;
  const isOffline = useSessionStore((state) => state.isOffline);
  const { data: programsData } = usePrograms();
  // "Programa atual" = the first non-archived program of the user (no status
  // field exists on WorkoutProgram, so the wording stays honest).
  const currentProgram =
    programsData?.content.find((program) => !program.isArchived) ?? null;

  const unit = profile?.preferences.preferredUnits ?? 'KG';

  if (isLoading) {
    return (
      <Screen title="Início" testID="dashboard-screen">
        <LoadingState label="Carregando seu resumo…" />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen title="Início" testID="dashboard-screen">
        <ErrorState
          message={mapApiError(error).message}
          onRetry={() => {
            void refetch();
          }}
          testID="dashboard-error"
        />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen title="Início" testID="dashboard-screen">
        <EmptyState
          title="Sem dados por enquanto"
          description="Finalize um treino para ver seu volume, sessões e recordes aqui."
          actionLabel="Começar treino"
          onAction={() => router.push(ROUTES.comecar)}
          testID="dashboard-empty"
        />
      </Screen>
    );
  }

  const { summary } = data;

  const maxVolume = data.activity.reduce(
    (max, point) => Math.max(max, point.volumeKg),
    0
  );
  const spark = data.activity.map((point) =>
    maxVolume > 0 ? point.volumeKg / maxVolume : 0
  );
  const volumeChange = data.volumeChangePercent;
  const deltaLabel = `${volumeChange >= 0 ? '▲' : '▼'} ${Math.abs(
    volumeChange
  ).toLocaleString('pt-BR')}%`;

  return (
    <Screen
      title={`Olá, ${user?.name.split(' ')[0] ?? ''}`.trim() || 'Início'}
      subtitle="Treine com inteligência. Evolua com dados."
      testID="dashboard-screen"
    >
      <PendingSyncBanner
        pendingCount={pendingCount}
        failedCount={failedCount}
        isOffline={isOffline}
        onSync={() => void syncNow()}
      />

      <View style={styles.cards}>
        <StatCard
          label="Volume da semana"
          value={formatWeight(summary.totalVolumeKg, unit, { withUnit: true })}
          hint="vs. semana anterior"
          icon={<Ionicons name="barbell" size={16} color={colors.accent} />}
          delta={deltaLabel}
          deltaTone={volumeChange >= 0 ? 'positive' : 'negative'}
          variant="hero"
          spark={spark}
          testID="dashboard-volume"
        />
        <StatCard
          label="Sessões"
          value={String(summary.completedSessions)}
          hint={`${summary.totalSets} séries registradas`}
          icon={<Ionicons name="calendar-outline" size={16} color={colors.accent} />}
          testID="dashboard-sessions"
        />
        <StatCard
          label="Recordes"
          value={String(summary.recordsBroken)}
          hint="pessoais neste período"
          tone="accent"
          icon={<Ionicons name="trophy-outline" size={16} color={colors.accent} />}
          testID="dashboard-records"
        />
        <StatCard
          label="Tempo médio"
          value={formatDuration(summary.averageSessionMinutes)}
          hint="por sessão"
          icon={<Ionicons name="time-outline" size={16} color={colors.accent} />}
          variant="wide"
          testID="dashboard-duration"
        />
      </View>

        {hasActiveSession && session ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Treino em andamento</Text>
            <Card testID="dashboard-active-session">
              <Text style={styles.sessionTitle}>Na ativa desde as {formatStartedTime(session.startedAt)}</Text>
              <Text style={styles.sessionMeta}>
                {session.exercises.length === 0
                  ? 'Nenhum exercício adicionado.'
                  : `${session.exercises.length} exercícios · ${session.exercises.reduce(
                      (total, exercise) => total + exercise.sets.length,
                      0
                    )} séries registradas`}
              </Text>
              <Button
                label="Continuar treino"
                onPress={() => router.push(ROUTES.comecar)}
                size="lg"
                icon={<Ionicons name="play" size={20} color={colors.onAccent} />}
                testID="dashboard-start-workout"
              />
            </Card>
          </View>
        ) : (
          <Button
            label="Começar treino"
            onPress={() => router.push(ROUTES.comecar)}
            size="lg"
            icon={<Ionicons name="play" size={20} color={colors.onAccent} />}
            testID="dashboard-start-workout"
          />
        )}

        {currentProgram ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Programa atual</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${currentProgram.name}`}
              style={styles.listItem}
              onPress={() =>
                router.push({
                  pathname: ROUTES.programa,
                  params: { id: currentProgram.id, source: 'saved' },
                })
              }
              testID="dashboard-program"
            >
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionTitle}>{currentProgram.name}</Text>
                <Text style={styles.sessionMeta}>
                  {currentProgram.days.length} dias ·{' '}
                  {currentProgram.days.reduce(
                    (total, day) => total + day.exercises.length,
                    0
                  )}{' '}
                  exercícios
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.accent} />
            </Pressable>
            <Button
              label="Ver histórico"
              variant="secondary"
              onPress={() => router.push(ROUTES.evolucao)}
              testID="dashboard-view-history"
            />
          </View>
        ) : null}

        <Card title="Atividade recente" subtitle="Volume por dia, calculado pelo servidor">
        {data.activity.length === 0 ? (
          <Text style={styles.emptyActivity}>
            Nenhuma atividade registrada no período.
          </Text>
        ) : (
          <BarChart
            points={data.activity.map((point) => ({
              label: point.date.slice(8),
              value: point.volumeKg,
              accessibleValue: formatWeight(point.volumeKg, unit, { withUnit: true }),
            }))}
            formatValue={(value) => formatWeight(value, unit, { withUnit: true })}
            testID="dashboard-activity-chart"
          />
        )}
      </Card>

      <Card title="Últimas sessões">
        {data.recentSessions.length === 0 ? (
          <Text style={styles.emptyActivity}>Nenhuma sessão concluída ainda.</Text>
        ) : (
          <View style={styles.sessions}>
            {data.recentSessions.map((session) => (
              <View key={session.id} style={styles.sessionRow}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionTitle}>
                    {session.programName ?? 'Treino livre'}
                  </Text>
                  <Text style={styles.sessionMeta}>
                    {new Date(session.startedAt).toLocaleDateString('pt-BR')} ·{' '}
                    {session.totalSets} séries
                  </Text>
                </View>
                <Text style={styles.sessionVolume}>
                  {formatWeight(session.volumeKg, unit, { withUnit: true })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
  },
  listItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.md,
  },
  emptyActivity: {
    ...typography.caption,
    color: colors.textMuted,
  },
  sessions: {
    gap: spacing.sm,
  },
  sessionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  sessionInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  sessionTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  sessionMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  sessionVolume: {
    ...typography.bodyStrong,
    color: colors.accent,
  },
});
