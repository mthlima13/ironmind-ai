import { StyleSheet, Text, View } from 'react-native';
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
import { ROUTES } from '../../src/navigation/linking';
import { mapApiError } from '../../src/services/api';
import { colors, spacing, typography } from '../../src/theme';
import { formatWeight } from '../../src/utils/units';

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthState();
  const { data: profile } = useProfile();
  const { data, isLoading, isError, error, refetch } = useDashboardOverview();

  const { pendingCount, failedCount, syncNow } = useOfflineSync();
  const isOffline = useSessionStore((state) => state.isOffline);
  const hasActiveSession = useSessionStore((state) => state.session !== null);

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
          hint={
            data.volumeChangePercent >= 0
              ? `+${data.volumeChangePercent}% vs. semana anterior`
              : `${data.volumeChangePercent}% vs. semana anterior`
          }
          tone={data.volumeChangePercent >= 0 ? 'positive' : 'negative'}
          testID="dashboard-volume"
        />
        <StatCard
          label="Sessões"
          value={String(summary.completedSessions)}
          hint={`${summary.totalSets} séries registradas`}
          testID="dashboard-sessions"
        />
        <StatCard
          label="Recordes"
          value={String(summary.recordsBroken)}
          hint="pessoais neste período"
          tone="accent"
          testID="dashboard-records"
        />
        <StatCard
          label="Tempo médio"
          value={formatDuration(summary.averageSessionMinutes)}
          hint="por sessão"
          testID="dashboard-duration"
        />
      </View>

      <Button
        label={hasActiveSession ? 'Continuar treino em andamento' : 'Começar treino'}
        onPress={() => router.push(ROUTES.comecar)}
        size="lg"
        icon={<Ionicons name="play" size={20} color={colors.onAccent} />}
        testID="dashboard-start-workout"
      />

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

const styles = StyleSheet.create({
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
