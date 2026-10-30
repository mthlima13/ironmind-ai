import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { Screen } from '../../src/components/Screen';
import { LevelFilters } from '../../src/features/programs/LevelFilters';
import { ProgramCard } from '../../src/features/programs/ProgramCard';
import { NewProgramForm } from '../../src/features/programs/NewProgramForm';
import {
  PROGRAM_LEVEL_LABELS,
  filterProgramTemplates,
  type ProgramLevelFilter,
} from '../../src/features/programs/trainingTemplates';
import { usePrograms } from '../../src/features/programs/usePrograms';
import { ROUTES } from '../../src/navigation/linking';
import { mapApiError } from '../../src/services/api';
import { useTheme, useThemedStyles, layout, radii, spacing, typography, type ThemeColors } from '../../src/theme';
import { TRAINING_GOAL_LABELS } from '../../src/types/user';
import type { WorkoutProgram } from '../../src/types/program';

type TrainingTab = 'mine' | 'explore';

const TABS: { key: TrainingTab; label: string }[] = [
  { key: 'mine', label: 'Meus programas' },
  { key: 'explore', label: 'Explorar' },
];

function weekDaysLabel(count: number): string {
  return `${count} ${count === 1 ? 'dia' : 'dias'}/semana`;
}

/**
 * Treinos listing (SPEC sections 3 and 4).
 *
 * "Meus programas" lists the programs owned by the user and keeps the manual
 * creation form; "Explorar" lists the read-only catalogue models with the level
 * filters. The long day and exercise lists moved to the details screen, so this
 * tab only shows compact cards.
 */
export default function WorkoutsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [tab, setTab] = useState<TrainingTab>('mine');
  const [level, setLevel] = useState<ProgramLevelFilter>('ALL');
  const [isCreateProgramOpen, setIsCreateProgramOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = usePrograms();

  const programs: WorkoutProgram[] = useMemo(() => data?.content ?? [], [data]);
  const templates = filterProgramTemplates(level);

  const openSavedProgram = (programId: string) => {
    router.push({
      pathname: ROUTES.programa,
      params: { id: programId, source: 'saved' },
    });
  };

  const openTemplate = (templateId: string) => {
    router.push({
      pathname: ROUTES.programa,
      params: { id: templateId, source: 'template' },
    });
  };

  return (
    <Screen
      title="Treinos"
      subtitle="Seus programas e modelos prontos para começar."
      headerAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Catálogo de exercícios"
          onPress={() => router.push(ROUTES.exercicios)}
          style={({ pressed }) => [
            styles.headerButton,
            pressed ? styles.headerButtonPressed : null,
          ]}
          testID="open-exercise-catalogue"
        >
          <Ionicons name="barbell-outline" size={22} color={colors.accent} />
        </Pressable>
      }
      testID="workouts-screen"
    >
      <View style={styles.segmented}>
        {TABS.map((item) => {
          const isActive = tab === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => setTab(item.key)}
              style={({ pressed }) => [
                styles.segment,
                isActive ? styles.segmentActive : null,
                pressed ? styles.segmentPressed : null,
              ]}
              testID={`training-tab-${item.key}`}
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

      {tab === 'mine' ? (
        <View style={styles.section}>
          <Button
            label={isCreateProgramOpen ? 'Fechar formulário' : 'Novo programa'}
            variant="secondary"
            icon={
              <Ionicons
                name={isCreateProgramOpen ? 'close' : 'add-circle-outline'}
                size={18}
                color={colors.accent}
              />
            }
            onPress={() => setIsCreateProgramOpen((current) => !current)}
            testID="toggle-new-program"
          />

          {isCreateProgramOpen ? (
            <NewProgramForm
              onCreated={() => {
                setIsCreateProgramOpen(false);
                Alert.alert(
                  'Programa criado',
                  'Abra o programa para adicionar os exercícios em cada dia.'
                );
              }}
              onCancel={() => setIsCreateProgramOpen(false)}
            />
          ) : null}

          {isLoading ? (
            <LoadingState
              label="Carregando seus programas…"
              testID="workouts-loading"
            />
          ) : null}

          {isError ? (
            <ErrorState
              message={mapApiError(error).message}
              onRetry={() => {
                void refetch();
              }}
              testID="workouts-error"
            />
          ) : null}

          {!isLoading && !isError && !isCreateProgramOpen && programs.length === 0 ? (
            <EmptyState
              title="Você ainda não tem programas"
              description="Crie um programa do zero ou adicione um modelo pronto do catálogo."
              actionLabel="Explorar programas"
              onAction={() => setTab('explore')}
              actionTestID="workouts-empty-action"
              icon={<Ionicons name="calendar-outline" size={26} color={colors.textMuted} />}
              testID="workouts-empty"
            />
          ) : null}

          {!isLoading && !isError
            ? programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  name={program.name}
                  description={program.description || undefined}
                  meta={`${weekDaysLabel(program.days.length)} • ${TRAINING_GOAL_LABELS[program.goal]}`}
                  onPress={() => openSavedProgram(program.id)}
                  testID={`program-card-${program.id}`}
                />
              ))
            : null}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.exploreHint}>
            Modelos prontos. Ao adicionar, você cria uma cópia independente que
            pode personalizar.
          </Text>

          <LevelFilters value={level} onChange={setLevel} />

          <Text style={styles.resultCount} testID="template-count">
            {templates.length}{' '}
            {templates.length === 1 ? 'programa' : 'programas'}
            {level === 'ALL' ? '' : ` • ${PROGRAM_LEVEL_LABELS[level]}`}
          </Text>

          {templates.length === 0 ? (
            <EmptyState
              title="Nenhum programa neste nível"
              description="Ajuste o filtro para ver os modelos dos outros níveis."
              actionLabel="Ver todos"
              onAction={() => setLevel('ALL')}
              actionTestID="explore-empty-action"
              icon={<Ionicons name="funnel-outline" size={26} color={colors.textMuted} />}
              testID="explore-empty"
            />
          ) : (
            templates.map((template) => (
              <ProgramCard
                key={template.id}
                name={template.name}
                description={template.description}
                meta={`${weekDaysLabel(template.days.length)} • ${TRAINING_GOAL_LABELS[template.goal]}`}
                badge={PROGRAM_LEVEL_LABELS[template.level]}
                icon="library-outline"
                onPress={() => openTemplate(template.id)}
                testID={`template-card-${template.id}`}
              />
            ))
          )}
        </View>
      )}
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  headerButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    width: layout.minTouchTarget,
  },
  headerButtonPressed: {
    backgroundColor: colors.surfacePressed,
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
    minHeight: layout.minTouchTarget,
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
  section: {
    gap: spacing.md,
  },
  exploreHint: {
    ...typography.body,
    color: colors.textSecondary,
  },
  resultCount: {
    ...typography.label,
    color: colors.textMuted,
  },
});
