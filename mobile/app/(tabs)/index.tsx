import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { PendingSyncBanner } from '../../src/components/PendingSyncBanner';
import { Screen } from '../../src/components/Screen';
import { useDashboardOverview } from '../../src/features/analytics/useDashboard';
import { useAuthState } from '../../src/features/auth/useAuth';
import { useProfile } from '../../src/features/auth/useProfile';
import { useSessionStore } from '../../src/features/workouts/session.store';
import { useOfflineSync } from '../../src/features/workouts/useOfflineSync';
import { usePrograms } from '../../src/features/programs/usePrograms';
import { ROUTES } from '../../src/navigation/linking';
import { mapApiError } from '../../src/services/api';
import { useTheme, useThemedStyles, layout, radii, spacing, typography, type ThemeColors } from '../../src/theme';
import { TRAINING_GOAL_LABELS } from '../../src/types/user';

const QUICK_LINKS = [
  { label: 'Exercícios', icon: 'barbell-outline' as const, route: ROUTES.exercicios, slug: 'exercises' },
  { label: 'Meus treinos', icon: 'calendar-outline' as const, route: ROUTES.treinos, slug: 'workouts' },
  { label: 'Histórico', icon: 'time-outline' as const, route: ROUTES.evolucao, slug: 'history' },
];

const WEEK_DAY_INITIALS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/**
 * Slot of a date inside the Brazilian week, Monday first.
 *
 * `getDay()` returns 0 on Sunday, so the Monday-first position is
 * `(getDay() + 6) % 7`.
 */
function weekSlot(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** "TERÇA-FEIRA, 03 DE NOVEMBRO" strip of the header (inicio.html). */
function formatToday(): string {
  return new Date()
    .toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    })
    .toUpperCase();
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
  // Program of the day = first non-archived program of the user (no status
  // field exists on WorkoutProgram, so the wording stays honest).
  const currentProgram =
    programsData?.content.find((program) => !program.isArchived) ?? null;

  if (isLoading) {
    return (
      <Screen testID="dashboard-screen">
        <LoadingState label="Carregando seu resumo…" />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen testID="dashboard-screen">
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
      <Screen testID="dashboard-screen">
        <EmptyState
          title="Sem dados por enquanto"
          description="Finalize um treino para ver seu progresso semanal aqui."
          actionLabel="Começar treino"
          onAction={() => router.push(ROUTES.comecar)}
          testID="dashboard-empty"
        />
      </Screen>
    );
  }

  // Days of the period with at least one completed session, by weekday slot.
  const trainedSlots = new Set(
    data.activity
      .filter((point) => point.completedSessions > 0)
      .map((point) => weekSlot(new Date(`${point.date}T12:00:00`)))
  );

  // Weekly goal comes from the profile preference ("dias por semana").
  const goal = profile?.preferences.trainingDays ?? null;
  const completed = data.summary.completedSessions;
  const remaining = goal !== null ? Math.max(goal - completed, 0) : null;
  const progress = goal !== null ? Math.min(completed / goal, 1) : 0;

  // Day of the program bound to the running session, if any.
  const activeDay =
    session?.programDayId && currentProgram
      ? currentProgram.days.find((day) => day.id === session.programDayId) ?? null
      : null;
  const activeDayIndex = currentProgram && activeDay
    ? currentProgram.days.findIndex((day) => day.id === activeDay.id)
    : -1;
  /** Pill next to "Treino de hoje": day position or the split size. */
  const todayPill = activeDay && currentProgram
    ? `Dia ${activeDayIndex + 1} de ${currentProgram.days.length}`
    : currentProgram
      ? `${currentProgram.days.length} dias`
      : null;

  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <Screen testID="dashboard-screen">
      <PendingSyncBanner
        pendingCount={pendingCount}
        failedCount={failedCount}
        isOffline={isOffline}
        onSync={() => void syncNow()}
      />

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.dateText} testID="dashboard-date">
            {formatToday()}
          </Text>
          <Text style={styles.title}>
            Olá, {firstName}! 👋
          </Text>
          <Text style={styles.subtitle}>Pronto para mais um treino?</Text>
        </View>
        <View style={styles.avatar}>
          <Ionicons name="person" size={22} color={colors.accent} />
        </View>
      </View>

      <View style={styles.card} testID="dashboard-week-progress">
        <View style={styles.weekHeader}>
          <Text style={styles.cardTitle}>Sua semana</Text>
          {goal !== null ? (
            <Text style={styles.weekCounter} testID="dashboard-week-counter">
              {completed} de {goal} treinos
            </Text>
          ) : null}
        </View>
        <View style={styles.weekDays}>
          {WEEK_DAY_INITIALS.map((initial, slot) => {
            const isTrained = trainedSlots.has(slot);
            const isToday = slot === weekSlot(new Date());
            const dayNumber = slot + 1;
            return (
              <View
                key={slot}
                style={[
                  styles.dayCircle,
                  isTrained ? styles.dayCircleTrained : null,
                  isToday && !isTrained ? styles.dayCircleCurrent : null,
                ]}
                testID={`dashboard-week-day-${slot}`}
                accessibilityLabel={
                  isTrained
                    ? `Dia ${dayNumber} da semana: treino concluído`
                    : `Dia ${dayNumber} da semana`
                }
              >
                {isTrained ? (
                  <Ionicons name="checkmark" size={16} color={colors.onAccent} />
                ) : (
                  <Text
                    style={[
                      styles.dayInitial,
                      isToday ? styles.dayInitialCurrent : null,
                    ]}
                  >
                    {initial}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { borderRadius: radii.pill, width: `${Math.round(progress * 100)}%` }]}
            testID="dashboard-week-bar"
            accessibilityLabel={`Progresso semanal: ${completed} de ${goal ?? 0} treinos`}
          />
        </View>
        {remaining !== null ? (
          <Text style={styles.weekHint}>
            {remaining === 0
              ? 'Meta semanal alcançada! 🎉'
              : remaining === 1
                ? 'Falta apenas 1 treino para sua meta semanal.'
                : `Faltam ${remaining} treinos para sua meta semanal.`}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Treino de hoje</Text>
          {todayPill ? (
            <View style={styles.todayPill}>
              <Text style={styles.todayPillText}>{todayPill}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          {hasActiveSession && session ? (
            <View style={styles.todayCard}>
              <View style={styles.todayImage} accessibilityElementsHidden>
                <Ionicons name="barbell" size={32} color={colors.onAccent} />
              </View>
              <Text style={styles.todayTitle}>
                {activeDay?.name ?? currentProgram?.name ?? 'Treino livre'}
              </Text>
              <Text style={styles.todayMeta}>
                {currentProgram
                  ? `${TRAINING_GOAL_LABELS[currentProgram.goal]} ${
                      currentProgram.days.length
                    }x • ${
                      activeDay
                        ? `${activeDay.exercises.length} exercícios no dia`
                        : `${
                            currentProgram.days.reduce(
                              (total, day) => total + day.exercises.length,
                              0
                            )
                          } exercícios no programa`
                    }`
                  : session.exercises.length === 0
                    ? 'Nenhum exercício adicionado ainda'
                    : `${session.exercises.length} exercícios`}
              </Text>
              <Button
                label="Continuar treino"
                onPress={() => router.push(ROUTES.comecar)}
                size="lg"
                icon={<Ionicons name="time-outline" size={20} color={colors.onAccent} />}
                testID="dashboard-start-workout"
              />
            </View>
          ) : currentProgram ? (
            <View style={styles.todayCard}>
              <View style={styles.todayImage} accessibilityElementsHidden>
                <Ionicons name="barbell" size={32} color={colors.onAccent} />
              </View>
              <Text style={styles.todayTitle}>{currentProgram.name}</Text>
              <Text style={styles.todayMeta}>
                {TRAINING_GOAL_LABELS[currentProgram.goal]}{' '}
                {currentProgram.days.length}x •{' '}
                {currentProgram.days.reduce(
                  (total, day) => total + day.exercises.length,
                  0
                )}{' '}
                exercícios
              </Text>
              <Button
                label="Começar treino"
                onPress={() =>
                  router.push({
                    pathname: ROUTES.comecar,
                    params: { programId: currentProgram.id },
                  })
                }
                size="lg"
                icon={<Ionicons name="play" size={20} color={colors.onAccent} />}
                testID="dashboard-start-workout"
              />
            </View>
          ) : (
            <View style={styles.todayEmpty}>
              <Text style={styles.todayMeta}>
                Nenhum programa ativo. Monte um programa na aba Treinos para
                começar.
              </Text>
              <Button
                label="Ir para Treinos"
                variant="secondary"
                onPress={() => router.push(ROUTES.treinos)}
                testID="dashboard-program"
              />
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Acesso rápido</Text>
        <View style={styles.quickRow}>
        {QUICK_LINKS.map((link) => (
          <Pressable
            key={link.label}
            accessibilityRole="button"
            accessibilityLabel={link.label}
            style={({ pressed }) => [
              styles.quickTile,
              pressed ? styles.quickTilePressed : null,
            ]}
            onPress={() => router.push(link.route)}
            testID={`dashboard-quick-${link.slug}`}
          >
            <Ionicons name={link.icon} size={22} color={colors.accent} />
            <Text style={styles.quickLabel}>{link.label}</Text>
          </Pressable>
        ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.tipHeader}>
          <Ionicons name="bulb-outline" size={18} color={colors.accent} />
          <Text style={styles.cardTitle}>Dica do dia</Text>
        </View>
        <Text style={styles.tipText} testID="dashboard-tip">
          Priorize a execução correta dos movimentos antes de aumentar a carga.
        </Text>
      </View>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  sectionLabel: {
    ...typography.bodyStrong,
    color: colors.text,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  weekHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  weekCounter: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  dateText: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    width: layout.minTouchTarget,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  weekDays: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  dayCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    height: 36,
    justifyContent: 'center',
  },
  dayCircleTrained: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayCircleCurrent: {
    borderColor: colors.accent,
  },
  dayInitial: {
    ...typography.caption,
    color: colors.textMuted,
  },
  dayInitialCurrent: {
    color: colors.accent,
  },
  progressTrack: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    height: 8,
  },
  weekHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  todayPill: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  todayPillText: {
    ...typography.label,
    color: colors.accent,
  },
  todayCard: {
    gap: spacing.sm,
  },
  todayImage: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    height: 96,
    justifyContent: 'center',
  },
  todayTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  todayMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  todayEmpty: {
    gap: spacing.sm,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickTile: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minHeight: layout.minTouchTarget,
    padding: spacing.md,
  },
  quickTilePressed: {
    backgroundColor: colors.surfacePressed,
  },
  quickLabel: {
    ...typography.caption,
    color: colors.text,
  },
  tipHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tipText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
