import { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { Screen } from '../../components/Screen';
import { ROUTES } from '../../navigation/linking';
import { mapApiError } from '../../services/api';
import { useTheme, useThemedStyles, radii, spacing, typography, type ThemeColors } from '../../theme';
import {
  SPLIT_TYPE_LABELS,
  type ProgramDay,
  type ProgramExercise,
} from '../../types/program';
import { TRAINING_GOAL_LABELS } from '../../types/user';
import { createIdempotencyKey } from '../../utils/id';
import { useExerciseCatalogue } from '../exercises/useExercises';
import { ProgramDayEditor } from './ProgramDayEditor';
import { buildProgramInput } from './programPayload';
import {
  PROGRAM_LEVEL_LABELS,
  buildTemplateProgramInput,
  findProgramTemplate,
  resolveTemplateDay,
  type ProgramTemplate,
} from './trainingTemplates';
import { useCreateProgram, useProgram, useUpdateProgram } from './usePrograms';
import { WorkoutDayCard, type DayExercisePreview } from './WorkoutDayCard';

export type ProgramDetailsSource = 'saved' | 'template';

export type ProgramDetailsScreenProps = {
  programId: string;
  source?: ProgramDetailsSource;
};

type MetaItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

function programMeta(icon: keyof typeof Ionicons.glyphMap, label: string): MetaItem {
  return { icon, label };
}

function formatTarget(sets: number, min: number, max: number, restSeconds: number): string {
  return `${sets} × ${min}–${max} reps • ${restSeconds}s de descanso`;
}

function programExercisePreview(exercise: ProgramExercise): DayExercisePreview {
  return {
    id: exercise.id,
    name: exercise.exercise.name,
    meta: formatTarget(
      exercise.targetSets,
      exercise.targetRepsMin,
      exercise.targetRepsMax,
      exercise.restSeconds
    ),
  };
}

function ProgramMeta({ items }: { items: MetaItem[] }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.badges}>
      {items.map((item) => (
        <View key={item.label} style={styles.badge}>
          <Ionicons name={item.icon} size={14} color={colors.accent} />
          <Text style={styles.badgeText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function ProgramNotFound() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Screen title="Programa" testID="program-details-not-found">
      <EmptyState
        title="Programa não encontrado"
        description="Ele pode ter sido removido ou o endereço está incorreto."
        actionLabel="Voltar para Treinos"
        onAction={() => router.replace(ROUTES.treinos)}
        actionTestID="program-details-back"
        icon={<Ionicons name="alert-circle-outline" size={26} color={colors.textMuted} />}
        testID="program-details-empty"
      />
    </Screen>
  );
}

/**
 * Details of a catalogue template.
 *
 * The template is a read-only model: the only action is to copy it into the
 * user's programs. The copy uses `POST /programs` and the same idempotency key
 * on every retry, so a network failure or a double tap never creates two
 * programs (SPEC section 8).
 */
function TemplateProgramDetails({ template }: { template: ProgramTemplate }) {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const createProgram = useCreateProgram();
  const {
    data: catalogue,
    isLoading: isLoadingCatalogue,
    isError: isCatalogueError,
    error: catalogueError,
    refetch: refetchCatalogue,
  } = useExerciseCatalogue();

  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [createdProgramId, setCreatedProgramId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const idempotencyKey = useRef(createIdempotencyKey());

  const resolvedDays = useMemo(
    () =>
      template.days.map((day) =>
        resolveTemplateDay(day, catalogue?.content ?? [])
      ),
    [template, catalogue]
  );
  const missing = useMemo(
    () => Array.from(new Set(resolvedDays.flatMap((day) => day.missing))),
    [resolvedDays]
  );

  const handleCopy = async () => {
    if (createProgram.isPending || createdProgramId) {
      return;
    }
    if (!catalogue) {
      Alert.alert('Catálogo indisponível', 'Aguarde o catálogo carregar para adicionar o programa.');
      return;
    }
    if (missing.length > 0) {
      Alert.alert(
        'Exercícios indisponíveis',
        `Estes exercícios não estão no catálogo e o programa não pode ser copiado:\n${missing.join(', ')}`
      );
      return;
    }

    setCopyError(null);
    try {
      const { input } = buildTemplateProgramInput(template, catalogue.content);
      const created = await createProgram.mutateAsync({
        input,
        idempotencyKey: idempotencyKey.current,
      });
      setCreatedProgramId(created.id);
      Alert.alert(
        'Programa adicionado',
        'Uma cópia do modelo foi criada em Meus programas.',
        [
          { text: 'Agora não', style: 'cancel' },
          {
            text: 'Abrir programa',
            onPress: () => {
              router.replace({
                pathname: ROUTES.programa,
                params: { id: created.id, source: 'saved' },
              });
            },
          },
        ]
      );
    } catch (error) {
      setCopyError(mapApiError(error).message);
    }
  };

  const copyDisabled =
    createProgram.isPending ||
    isLoadingCatalogue ||
    isCatalogueError ||
    !catalogue ||
    missing.length > 0;

  return (
    <Screen
      title={template.name}
      subtitle={template.description}
      testID="program-details-template"
    >
      <ProgramMeta
        items={[
          programMeta('speedometer-outline', PROGRAM_LEVEL_LABELS[template.level]),
          programMeta('flag-outline', TRAINING_GOAL_LABELS[template.goal]),
          programMeta('calendar-outline', `${template.days.length} dias/semana`),
          programMeta('git-branch-outline', SPLIT_TYPE_LABELS[template.splitType]),
        ]}
      />

      <Card
        title="Modelo do catálogo"
        subtitle="Ao adicionar, você cria uma cópia independente que pode editar sem alterar o modelo original."
      >
        {createdProgramId ? (
          <>
            <Text style={styles.success} testID="template-copy-success">
              Programa adicionado aos seus treinos.
            </Text>
            <Button
              label="Abrir minha cópia"
              onPress={() => {
                router.replace({
                  pathname: ROUTES.programa,
                  params: { id: createdProgramId, source: 'saved' },
                });
              }}
              testID="open-created-program"
            />
          </>
        ) : (
          <Button
            label={
              createProgram.isPending
                ? 'Adicionando…'
                : isLoadingCatalogue
                  ? 'Preparando catálogo…'
                  : 'Adicionar aos meus programas'
            }
            onPress={() => {
              void handleCopy();
            }}
            disabled={copyDisabled}
            loading={createProgram.isPending}
            testID="add-template-to-programs"
          />
        )}

        {isCatalogueError ? (
          <ErrorState
            title="Catálogo indisponível"
            message={mapApiError(catalogueError).message}
            onRetry={() => {
              void refetchCatalogue();
            }}
            testID="template-catalogue-error"
          />
        ) : null}

        {!isCatalogueError && missing.length > 0 ? (
          <Text style={styles.warning} testID="template-missing-exercises">
            Indisponíveis no catálogo: {missing.join(', ')}.
          </Text>
        ) : null}

        {copyError ? (
          <Text style={styles.error} testID="template-copy-error">
            {copyError}
          </Text>
        ) : null}
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dias do programa</Text>

        {template.days.map((day, dayIndex) => {
          const dayKey = `${template.id}-${dayIndex}`;
          const exercises: DayExercisePreview[] = day.exercises.map(
            (exercise, exerciseIndex) => ({
              id: `${dayKey}-exercise-${exerciseIndex}`,
              name: exercise.name,
              meta: formatTarget(
                exercise.targetSets,
                exercise.targetRepsMin,
                exercise.targetRepsMax,
                exercise.restSeconds
              ),
            })
          );

          return (
            <WorkoutDayCard
              key={dayKey}
              dayName={day.name}
              exerciseCount={day.exercises.length}
              exercises={exercises}
              isExpanded={expandedDayId === dayKey}
              onToggle={() =>
                setExpandedDayId((current) => (current === dayKey ? null : dayKey))
              }
              testID={`template-day-${dayIndex}`}
            />
          );
        })}
      </View>
    </Screen>
  );
}

/**
 * Details of a program owned by the user.
 *
 * Starting a day reuses the existing execution flow by pushing the Começar tab
 * with the program and day ids. The day editor is the same component used
 * before the redesign, now isolated in this screen (SPEC sections 5 and 7).
 */
function SavedProgramDetails({ programId }: { programId: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { data: program, isLoading, isError, error, refetch } = useProgram(programId);
  const updateProgram = useUpdateProgram();

  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [draftDay, setDraftDay] = useState<ProgramDay | null>(null);

  const orderedDays = useMemo(
    () =>
      program
        ? [...program.days].sort((left, right) => left.position - right.position)
        : [],
    [program]
  );

  if (isLoading) {
    return (
      <Screen title="Programa" testID="program-details-loading">
        <LoadingState label="Carregando programa…" />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen title="Programa" testID="program-details-error">
        <ErrorState
          message={mapApiError(error).message}
          onRetry={() => {
            void refetch();
          }}
        />
      </Screen>
    );
  }

  if (!program) {
    return <ProgramNotFound />;
  }

  const startDay = (day: ProgramDay) => {
    router.push({
      pathname: ROUTES.comecar,
      params: { programId: program.id, programDayId: day.id },
    });
  };

  const toggleDay = (dayId: string) => {
    if (expandedDayId === dayId) {
      setExpandedDayId(null);
      if (editingDayId === dayId) {
        setEditingDayId(null);
        setDraftDay(null);
      }
      return;
    }
    setExpandedDayId(dayId);
  };

  const beginEdit = (day: ProgramDay) => {
    setDraftDay({
      ...day,
      exercises: day.exercises.map((exercise) => ({ ...exercise })),
    });
    setEditingDayId(day.id);
    setExpandedDayId(day.id);
  };

  const cancelEdit = () => {
    setEditingDayId(null);
    setDraftDay(null);
  };

  const saveDay = async () => {
    if (!draftDay) {
      return;
    }
    try {
      await updateProgram.mutateAsync({
        id: program.id,
        input: buildProgramInput(program, draftDay),
        idempotencyKey: createIdempotencyKey(),
      });
      setEditingDayId(null);
      setDraftDay(null);
      Alert.alert('Programa atualizado', 'As alterações do dia foram salvas.');
    } catch (error) {
      Alert.alert('Erro ao salvar', mapApiError(error).message);
    }
  };

  return (
    <Screen
      title={program.name}
      subtitle={program.description || undefined}
      testID="program-details-saved"
    >
      <ProgramMeta
        items={[
          programMeta('git-branch-outline', SPLIT_TYPE_LABELS[program.splitType]),
          programMeta('flag-outline', TRAINING_GOAL_LABELS[program.goal]),
          programMeta('calendar-outline', `${program.days.length} dias/semana`),
        ]}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dias do programa</Text>

        {orderedDays.map((day) => {
          const isEditing = editingDayId === day.id && draftDay?.id === day.id;
          const source = isEditing && draftDay ? draftDay : day;
          const exercises = source.exercises
            .slice()
            .sort((left, right) => left.position - right.position)
            .map(programExercisePreview);

          return (
            <WorkoutDayCard
              key={day.id}
              dayName={source.name}
              exerciseCount={source.exercises.length}
              exercises={exercises}
              isExpanded={expandedDayId === day.id}
              onToggle={() => toggleDay(day.id)}
              onStart={isEditing ? undefined : () => startDay(day)}
              startTestID={`start-day-${day.id}`}
              testID={`program-day-${day.id}`}
            >
              {isEditing && draftDay ? (
                <View style={styles.editor} testID={`day-editor-${day.id}`}>
                  <ProgramDayEditor day={draftDay} onChange={setDraftDay} />
                  <Button
                    label={updateProgram.isPending ? 'Salvando…' : 'Salvar dia'}
                    onPress={() => {
                      void saveDay();
                    }}
                    disabled={updateProgram.isPending}
                    testID={`save-day-${day.id}`}
                  />
                  <Button
                    label="Cancelar"
                    variant="ghost"
                    onPress={cancelEdit}
                    disabled={updateProgram.isPending}
                    testID={`cancel-day-${day.id}`}
                  />
                </View>
              ) : (
                <Button
                  label="Editar dia"
                  variant="secondary"
                  icon={<Ionicons name="create-outline" size={18} color={colors.accent} />}
                  onPress={() => beginEdit(day)}
                  testID={`edit-day-${day.id}`}
                />
              )}
            </WorkoutDayCard>
          );
        })}
      </View>
    </Screen>
  );
}

/** Details screen entry point, selecting the template or saved program view. */
export function ProgramDetailsScreen({
  programId,
  source = 'saved',
}: ProgramDetailsScreenProps) {
  if (source === 'template') {
    const template = findProgramTemplate(programId);
    return template ? (
      <TemplateProgramDetails template={template} />
    ) : (
      <ProgramNotFound />
    );
  }

  return <SavedProgramDetails programId={programId} />;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  editor: {
    gap: spacing.md,
  },
  warning: {
    ...typography.caption,
    color: colors.warning,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  success: {
    ...typography.bodyStrong,
    color: colors.success,
  },
});
