import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Stepper } from '../../components/Stepper';
import { TextField } from '../../components/TextField';
import { ROUTES } from '../../navigation/linking';
import { mapApiError } from '../../services/api';
import { useTheme, useThemedStyles, radii, spacing, typography, type ThemeColors } from '../../theme';
import type { ProposedDay, WorkoutProposal } from '../../types/ai';
import {
  SPLIT_TYPES,
  SPLIT_TYPE_LABELS,
  type SplitType,
} from '../../types/program';
import { TRAINING_GOAL_LABELS } from '../../types/user';
import { cloneDays, updateExercise } from './proposal';
import {
  useGenerateWorkoutProposal,
  useRejectWorkoutProposal,
  useSaveWorkoutProposal,
} from './useWorkoutProposal';

const DAY_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Preferências' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
];

const PROMPT_EXAMPLES = [
  'Treino de hipertrofia para 4 dias, com foco em peito e costas.',
  'Treino de força para 3 dias, com os exercícios básicos.',
  'Treino full body para 2 dias, em casa e com halteres.',
];

/**
 * Split options of the form. `null` means the AI chooses, which is the only
 * automatic path: there is no random mode. `CUSTOM` is not offered because it
 * is the classification used when no split fits.
 */
const SPLIT_OPTIONS: { value: SplitType | null; label: string }[] = [
  { value: null, label: 'IA escolhe' },
  ...Object.values(SPLIT_TYPES)
    .filter((value) => value !== SPLIT_TYPES.CUSTOM)
    .map((value) => ({ value, label: SPLIT_TYPE_LABELS[value] })),
];

type SplitChipsProps = {
  value: SplitType | null;
  onChange: (value: SplitType | null) => void;
  testIDPrefix: string;
};

function SplitChips({ value, onChange, testIDPrefix }: SplitChipsProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.chipRow}>
      {SPLIT_OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <Pressable
            key={option.value ?? 'auto'}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.chip,
              isActive ? styles.chipActive : null,
              pressed ? styles.chipPressed : null,
            ]}
            testID={`${testIDPrefix}-${option.value ?? 'auto'}`}
          >
            <Text
              style={[
                styles.chipText,
                isActive ? styles.chipTextActive : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Limits used by the review controls, stricter than the API limits. */
const REVIEW_LIMITS = {
  minSets: 1,
  maxSets: 10,
  maxReps: 30,
  restStepSeconds: 15,
} as const;

type SavedState = {
  programName: string;
  decisionFailed: boolean;
};

/**
 * Review and save of an AI workout proposal (SPEC 12.2, step 8).
 *
 * The AI never writes anything: the proposal only pre-fills this screen. The
 * user reviews every value, edits what they want, and only then the program is
 * created through the regular program endpoint.
 */
export function WorkoutProposalScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [prompt, setPrompt] = useState('');
  const [trainingDays, setTrainingDays] = useState<number | null>(null);
  const [splitChoice, setSplitChoice] = useState<SplitType | null>(null);
  const [proposal, setProposal] = useState<WorkoutProposal | null>(null);
  const [days, setDays] = useState<ProposedDay[]>([]);
  const [reviewSplit, setReviewSplit] = useState<SplitType | null>(null);
  const [programName, setProgramName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedState | null>(null);

  const generate = useGenerateWorkoutProposal();
  const save = useSaveWorkoutProposal();
  const reject = useRejectWorkoutProposal();

  const isBusy = generate.isPending || save.isPending || reject.isPending;

  const reset = () => {
    setProposal(null);
    setDays([]);
    setReviewSplit(null);
    setProgramName('');
    setFormError(null);
    setNotice(null);
    setSaved(null);
  };

  const handleGenerate = () => {
    const trimmed = prompt.trim();
    if (trimmed.length < 10) {
      setFormError('Descreva o treino com pelo menos 10 caracteres.');
      return;
    }
    setFormError(null);
    setNotice(null);
    setSaved(null);
    generate.mutate(
      { prompt: trimmed, trainingDays, splitType: splitChoice },
      {
        onSuccess: (result) => {
          setProposal(result);
          setDays(cloneDays(result.days));
          setReviewSplit(result.splitType);
          setProgramName(result.name);
        },
        onError: (error) => setFormError(mapApiError(error).message),
      }
    );
  };

  const handleExerciseChange = (
    dayIndex: number,
    exerciseIndex: number,
    patch: Partial<ProposedDay['exercises'][number]>
  ) => {
    setDays((current) =>
      updateExercise(current, dayIndex, exerciseIndex, patch)
    );
  };

  const handleSave = () => {
    if (!proposal) {
      return;
    }
    if (!programName.trim()) {
      setFormError('Informe o nome do programa.');
      return;
    }
    setFormError(null);
    save.mutate(
      {
        proposal,
        name: programName,
        days,
        splitType: reviewSplit ?? proposal.splitType,
      },
      {
        onSuccess: (result) =>
          setSaved({
            programName: result.program.name,
            decisionFailed: result.decisionFailed,
          }),
        onError: (error) => setFormError(mapApiError(error).message),
      }
    );
  };

  const handleReject = () => {
    if (!proposal) {
      return;
    }
    setFormError(null);
    reject.mutate(proposal, {
      onSuccess: () => {
        setProposal(null);
        setDays([]);
        setProgramName('');
        setNotice('Proposta descartada. Nenhum programa foi criado.');
      },
      onError: (error) => setFormError(mapApiError(error).message),
    });
  };

  if (saved) {
    return (
      <Screen
        title="Proposta de IA"
        subtitle="Revisão e salvamento do programa."
        testID="proposal-screen"
      >
        <Card
          title="Programa salvo"
          subtitle={saved.programName}
          testID="proposal-saved"
        >
          <Text style={styles.body}>
            O programa foi criado com os valores revisados e já aparece em
            Treinos.
          </Text>
          {saved.decisionFailed ? (
            <Text style={styles.warning}>
              O programa foi salvo, mas não foi possível registrar a revisão da
              proposta.
            </Text>
          ) : null}
          <Button
            label="Ver meus treinos"
            onPress={() => router.replace(ROUTES.treinos)}
            testID="proposal-open-workouts"
          />
          <Button
            label="Gerar outra proposta"
            variant="secondary"
            onPress={reset}
            testID="proposal-new"
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="Proposta de IA"
      subtitle="Descreva o que você quer e revise tudo antes de salvar."
      avoidKeyboard
      testID="proposal-screen"
    >
      <Card title="O que você quer treinar?">
        <TextField
          label="Pedido"
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ex.: treino de hipertrofia para 4 dias"
          helperText="A IA usa suas preferências, seu equipamento e suas restrições ativas."
          multiline
          numberOfLines={4}
          maxLength={1000}
          autoCapitalize="sentences"
          testID="proposal-prompt"
        />

        <View style={styles.examples}>
          {PROMPT_EXAMPLES.map((example) => (
            <Pressable
              key={example}
              accessibilityRole="button"
              onPress={() => setPrompt(example)}
              style={({ pressed }) => [
                styles.example,
                pressed ? styles.examplePressed : null,
              ]}
              testID="proposal-example"
            >
              <Text style={styles.exampleText}>{example}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.chips}>
          <Text style={styles.chipsLabel}>Dias por semana</Text>
          <View style={styles.chipRow}>
            {DAY_OPTIONS.map((option) => {
              const isActive = trainingDays === option.value;
              return (
                <Pressable
                  key={option.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => setTrainingDays(option.value)}
                  style={({ pressed }) => [
                    styles.chip,
                    isActive ? styles.chipActive : null,
                    pressed ? styles.chipPressed : null,
                  ]}
                  testID={`proposal-days-${option.value ?? 'default'}`}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isActive ? styles.chipTextActive : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.chips}>
          <Text style={styles.chipsLabel}>Tipo de treino</Text>
          <Text style={styles.helper}>
            Escolha a divisão do treino ou deixe a IA decidir com base nos seus
            dias, objetivo e histórico.
          </Text>
          <SplitChips
            value={splitChoice}
            onChange={setSplitChoice}
            testIDPrefix="proposal-split"
          />
        </View>

        <Button
          label="Gerar proposta"
          onPress={handleGenerate}
          loading={generate.isPending}
          disabled={isBusy}
          icon={<Ionicons name="sparkles-outline" size={18} color={colors.onAccent} />}
          testID="proposal-generate"
        />

        {formError ? (
          <Text style={styles.error} testID="proposal-error">
            {formError}
          </Text>
        ) : null}
        {notice ? (
          <Text style={styles.notice} testID="proposal-notice">
            {notice}
          </Text>
        ) : null}
      </Card>

      {proposal ? (
        <>
          <Card
            title={proposal.name}
            subtitle={`${TRAINING_GOAL_LABELS[proposal.goal]} · ${SPLIT_TYPE_LABELS[reviewSplit ?? proposal.splitType]} · ${proposal.days.length} dia(s)`}
            testID="proposal-result"
          >
            <Text style={styles.body}>{proposal.explanation}</Text>

            {proposal.warnings.length > 0 ? (
              <View style={styles.warnings} testID="proposal-warnings">
                {proposal.warnings.map((warning) => (
                  <Text key={warning} style={styles.warning}>
                    {warning}
                  </Text>
                ))}
              </View>
            ) : null}

            <View style={styles.days}>
              {days.map((day, dayIndex) => (
                <View
                  key={`${day.name}-${dayIndex}`}
                  style={styles.day}
                  testID={`proposal-day-${dayIndex}`}
                >
                  <Text style={styles.dayName}>{day.name}</Text>

                  {day.exercises.map((exercise, exerciseIndex) => (
                    <View
                      key={`${exercise.exerciseId}-${exerciseIndex}`}
                      style={styles.exercise}
                      testID={`proposal-exercise-${dayIndex}-${exerciseIndex}`}
                    >
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <View style={styles.steppers}>
                        <Stepper
                          label="Séries"
                          value={exercise.sets}
                          min={REVIEW_LIMITS.minSets}
                          max={REVIEW_LIMITS.maxSets}
                          onChange={(sets) =>
                            handleExerciseChange(dayIndex, exerciseIndex, {
                              sets,
                            })
                          }
                          testID={`proposal-sets-${dayIndex}-${exerciseIndex}`}
                        />
                        <Stepper
                          label="Reps mín."
                          value={exercise.repsMin}
                          min={0}
                          max={REVIEW_LIMITS.maxReps}
                          onChange={(repsMin) =>
                            handleExerciseChange(dayIndex, exerciseIndex, {
                              repsMin,
                            })
                          }
                          testID={`proposal-reps-min-${dayIndex}-${exerciseIndex}`}
                        />
                        <Stepper
                          label="Reps máx."
                          value={exercise.repsMax}
                          min={0}
                          max={REVIEW_LIMITS.maxReps}
                          onChange={(repsMax) =>
                            handleExerciseChange(dayIndex, exerciseIndex, {
                              repsMax,
                            })
                          }
                          testID={`proposal-reps-max-${dayIndex}-${exerciseIndex}`}
                        />
                        <Stepper
                          label="Descanso (s)"
                          value={exercise.restSeconds}
                          min={0}
                          max={600}
                          step={REVIEW_LIMITS.restStepSeconds}
                          onChange={(restSeconds) =>
                            handleExerciseChange(dayIndex, exerciseIndex, {
                              restSeconds,
                            })
                          }
                          testID={`proposal-rest-${dayIndex}-${exerciseIndex}`}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>

            <Text style={styles.disclaimer}>{proposal.disclaimer}</Text>
          </Card>

          <Card title="Salvar como programa">
            <View style={styles.chips}>
              <Text style={styles.chipsLabel}>Tipo de treino</Text>
              <SplitChips
                value={reviewSplit}
                onChange={setReviewSplit}
                testIDPrefix="proposal-review-split"
              />
            </View>
            <TextField
              label="Nome do programa"
              value={programName}
              onChangeText={setProgramName}
              autoCapitalize="sentences"
              testID="proposal-program-name"
            />
            <Text style={styles.helper}>
              O programa é criado somente depois desta revisão. Você pode
              editá-lo depois em Treinos.
            </Text>
            <Button
              label="Salvar como programa"
              onPress={handleSave}
              loading={save.isPending}
              disabled={isBusy}
              testID="proposal-save"
            />
            <Button
              label="Rejeitar proposta"
              variant="ghost"
              onPress={handleReject}
              loading={reject.isPending}
              disabled={isBusy}
              testID="proposal-reject"
            />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  helper: {
    ...typography.caption,
    color: colors.textMuted,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  notice: {
    ...typography.caption,
    color: colors.success,
  },
  warning: {
    ...typography.caption,
    color: colors.warning,
  },
  warnings: {
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    gap: spacing.xs,
    padding: spacing.md,
  },
  examples: {
    gap: spacing.xs,
  },
  example: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  examplePressed: {
    backgroundColor: colors.surfacePressed,
  },
  exampleText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chips: {
    gap: spacing.sm,
  },
  chipsLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  chipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipPressed: {
    backgroundColor: colors.surfacePressed,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.accent,
  },
  days: {
    gap: spacing.md,
  },
  day: {
    gap: spacing.sm,
  },
  dayName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  exercise: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  exerciseName: {
    ...typography.body,
    color: colors.text,
  },
  steppers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  disclaimer: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
