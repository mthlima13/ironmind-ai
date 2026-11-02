import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BarChart } from '../../src/components/BarChart';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { Screen } from '../../src/components/Screen';
import { StatCard } from '../../src/components/StatCard';
import { useDashboardOverview } from '../../src/features/analytics/useDashboard';
import { useRecords } from '../../src/features/analytics/useRecords';
import { useProfile } from '../../src/features/auth/useProfile';
import { useSessionHistory } from '../../src/features/workouts/useWorkoutSession';
import { ROUTES } from '../../src/navigation/linking';
import { mapApiError } from '../../src/services/api';
import { useTheme, useThemedStyles, spacing, typography, type ThemeColors } from '../../src/theme';
import { RECORD_TYPE_LABELS } from '../../src/types/records';
import { formatWeight } from '../../src/utils/units';

export default function EvolutionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [page, setPage] = useState(0);

  const { data: profile } = useProfile();
  const unit = profile?.preferences.preferredUnits ?? 'KG';

  const overview = useDashboardOverview();
  const records = useRecords();
  const history = useSessionHistory(page);

  // Chart meta line (sandbox design): rolling average and the best day of
  // the same activity window the server already returns.
  const activity = overview.data?.activity ?? [];
  const dayVolumeTotal = activity.reduce(
    (accumulator, point) => accumulator + point.volumeKg,
    0
  );
  const dayVolumeAverage =
    activity.length > 0 ? dayVolumeTotal / activity.length : 0;
  const bestDay = activity.reduce(
    (best, point) => (point.volumeKg > best.volumeKg ? point : best),
    { date: '', volumeKg: 0 }
  );

  return (
    <Screen
      title="Evolução"
      subtitle="Volume, recordes e histórico de treinos."
      testID="evolution-screen"
    >
      {overview.isLoading ? (
        <LoadingState label="Carregando sua evolução…" />
      ) : null}

      {overview.isError ? (
        <ErrorState
          message={mapApiError(overview.error).message}
          onRetry={() => {
            void overview.refetch();
          }}
          testID="evolution-error"
        />
      ) : null}

      {overview.data ? (
        <>
          <View style={styles.cards}>
            <StatCard
              label="Volume no período"
              value={formatWeight(overview.data.summary.totalVolumeKg, unit, {
                withUnit: true,
              })}
              hint="vs. semana anterior"
              icon={<Ionicons name="barbell" size={16} color={colors.accent} />}
              delta={
                overview.data.volumeChangePercent >= 0
                  ? `▲ ${Math.abs(overview.data.volumeChangePercent).toLocaleString('pt-BR')}%`
                  : `▼ ${Math.abs(overview.data.volumeChangePercent).toLocaleString('pt-BR')}%`
              }
              deltaTone={overview.data.volumeChangePercent >= 0 ? 'positive' : 'negative'}
              testID="evolution-volume"
            />
            <StatCard
              label="Recordes"
              value={String(overview.data.summary.recordsBroken)}
              tone="accent"
              icon={<Ionicons name="trophy-outline" size={16} color={colors.accent} />}
              hint="quebrados no período"
              testID="evolution-records-count"
            />
          </View>

          <Card title="Volume por dia">
            {activity.length > 0 ? (
              <View
                style={styles.chartMeta}
                testID="evolution-chart-meta"
                accessibilityLiveRegion="polite"
              >
                <Text style={styles.chartMetaText}>
                  Média{' '}
                  <Text style={styles.chartMetaStrong}>
                    {formatWeight(dayVolumeAverage, unit, { withUnit: true })}
                  </Text>
                  /dia
                </Text>
                <Text style={styles.chartMetaText}>
                  Melhor dia:{' '}
                  <Text style={styles.chartMetaAccent}>
                    {bestDay.date.slice(8, 10)}/{bestDay.date.slice(5, 7)}
                  </Text>
                </Text>
              </View>
            ) : null}
            <BarChart
              points={overview.data.activity.map((point) => ({
                label: point.date.slice(8),
                value: point.volumeKg,
                accessibleValue: formatWeight(point.volumeKg, unit, {
                  withUnit: true,
                }),
              }))}
              formatValue={(value) => formatWeight(value, unit, { withUnit: true })}
              testID="evolution-chart"
            />
          </Card>
        </>
      ) : null}

      <Card title="Recordes pessoais">
        {records.isLoading ? <LoadingState label="Carregando recordes…" /> : null}

        {records.isError ? (
          <ErrorState
            message={mapApiError(records.error).message}
            onRetry={() => {
              void records.refetch();
            }}
            testID="evolution-records-error"
          />
        ) : null}

        {records.data && records.data.content.length === 0 ? (
          <EmptyState
            title="Nenhum recorde ainda"
            description="Seus recordes aparecem aqui depois do primeiro treino concluído."
            testID="evolution-records-empty"
          />
        ) : null}

        {records.data && records.data.content.length > 0 ? (
          <View style={styles.list}>
            {records.data.content.map((record) => (
              <View key={record.id} style={styles.recordRow}>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordExercise}>{record.exerciseName}</Text>
                  <Text style={styles.recordType}>
                    {RECORD_TYPE_LABELS[record.recordType]}
                  </Text>
                </View>
                <Text style={styles.recordValue}>
                  {record.recordType === 'MAX_REPS_AT_WEIGHT'
                    ? `${record.value} reps`
                    : formatWeight(record.value, unit, { withUnit: true })}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      <Card title="Histórico de treinos">
        {history.isLoading ? <LoadingState label="Carregando histórico…" /> : null}

        {history.isError ? (
          <ErrorState
            message={mapApiError(history.error).message}
            onRetry={() => {
              void history.refetch();
            }}
            testID="evolution-history-error"
          />
        ) : null}

        {history.data && history.data.content.length === 0 ? (
          <EmptyState
            title="Histórico vazio"
            description="Conclua o primeiro treino para começar o histórico."
            actionLabel="Começar treino"
            onAction={() => router.push(ROUTES.comecar)}
            testID="evolution-history-empty"
          />
        ) : null}

        {history.data && history.data.content.length > 0 ? (
          <>
            <View style={styles.list}>
              {history.data.content.map((session) => (
                <View key={session.id} style={styles.recordRow}>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordExercise}>
                      {new Date(session.startedAt).toLocaleDateString('pt-BR')}
                    </Text>
                    <Text style={styles.recordType}>
                      {session.exercises.length} exercícios · {session.status}
                    </Text>
                  </View>
                  <Text style={styles.recordValue}>
                    {session.exercises.reduce(
                      (total, sessionExercise) =>
                        total + sessionExercise.sets.length,
                      0
                    )}{' '}
                    séries
                  </Text>
                </View>
              ))}
            </View>

            {history.data.hasNext ? (
              <Button
                label="Carregar mais"
                variant="secondary"
                onPress={() => setPage((current) => current + 1)}
                testID="evolution-history-next"
              />
            ) : null}
          </>
        ) : null}
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
  chartMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
  },
  chartMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chartMetaStrong: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  chartMetaAccent: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  list: {
    gap: spacing.sm,
  },
  recordRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  recordInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  recordExercise: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  recordType: {
    ...typography.caption,
    color: colors.textMuted,
  },
  recordValue: {
    ...typography.bodyStrong,
    color: colors.accent,
  },
});
