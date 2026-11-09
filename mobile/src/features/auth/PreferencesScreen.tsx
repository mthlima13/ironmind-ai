import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { OptionRow } from '../../components/OptionRow';
import { Screen } from '../../components/Screen';
import { Stepper } from '../../components/Stepper';
import { ROUTES } from '../../navigation/linking';
import { useThemedStyles, spacing, typography, type ThemeColors } from '../../theme';
import { DEFAULT_PREFERENCES } from './auth.store';
import { useCompleteOnboarding } from './useAuth';
import { PersonaBanner } from './PersonaBanner';
import { StepChips } from './StepChips';
import {
  TRAINING_EXPERIENCE_LABELS,
  TRAINING_GOAL_LABELS,
  WEIGHT_UNITS,
  type TrainingExperience,
  type TrainingGoal,
  type WeightUnit,
} from '../../types/user';

/**
 * Step 2 of the first-run flow (SPEC 15.3): "Como você treina?".
 *
 * The values are saved on the device (SPEC 10.1 and 10.2) — there is no
 * profile endpoint — and they feed the AI recommendations afterwards. They
 * can be changed later in the Perfil screen.
 */
export function PreferencesScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  // Name received from step 1 ("Quem é você?").
  const localSearchParams = useLocalSearchParams<{ name?: string }>();
  const completeOnboarding = useCompleteOnboarding();

  const [unitChoice, setUnitChoice] = useState<WeightUnit | null>(null);
  const [experienceChoice, setExperienceChoice] = useState<TrainingExperience | null>(
    null
  );
  const [goalChoice, setGoalChoice] = useState<TrainingGoal | null>(null);
  const [daysChoice, setDaysChoice] = useState<number | null>(null);

  // Product defaults of a brand new profile (SPEC 10.2).
  const unit = unitChoice ?? DEFAULT_PREFERENCES.preferredUnits;
  const experience = experienceChoice ?? DEFAULT_PREFERENCES.trainingExperience;
  const goal = goalChoice ?? DEFAULT_PREFERENCES.goal;
  const days = daysChoice ?? DEFAULT_PREFERENCES.trainingDays;

  const finishOnboarding = async () => {
    const name =
      typeof localSearchParams.name === 'string'
        ? localSearchParams.name
        : '';
    await completeOnboarding.completeOnboarding({
      name,
      preferences: {
        ...DEFAULT_PREFERENCES,
        preferredUnits: unit,
        trainingExperience: experience,
        goal,
        trainingDays: days,
      },
    });
    // The dashboard of a new profile shows empty states on purpose, so the
    // history is replaced instead of stacked (SPEC 15.3).
    router.replace(ROUTES.inicio);
  };

  return (
    <Screen style={styles.content} testID="preferences-screen">
      <StepChips current={2} />
      <Text style={styles.title}>Como você treina?</Text>
      <Text style={styles.caption}>
        Isso guia as recomendações de plano, volume e progressão da IA. Você
        pode mudar depois no Perfil.
      </Text>

      <PersonaBanner text="Sou aluno" />

      <Card>
        <OptionRow<WeightUnit>
          label="Unidade de peso"
          testID="preferences-units"
          value={unit}
          options={[
            { value: WEIGHT_UNITS.KG, label: 'kg' },
            { value: WEIGHT_UNITS.LB, label: 'lb' },
          ]}
          onChange={setUnitChoice}
        />

        <OptionRow<TrainingExperience>
          label="Experiência"
          testID="preferences-experience"
          value={experience}
          options={(
            Object.keys(TRAINING_EXPERIENCE_LABELS) as TrainingExperience[]
          ).map((value) => ({ value, label: TRAINING_EXPERIENCE_LABELS[value] }))}
          onChange={setExperienceChoice}
        />

        <OptionRow<TrainingGoal>
          label="Objetivo"
          testID="preferences-goal"
          value={goal}
          options={(Object.keys(TRAINING_GOAL_LABELS) as TrainingGoal[]).map(
            (value) => ({ value, label: TRAINING_GOAL_LABELS[value] })
          )}
          onChange={setGoalChoice}
        />

        <Stepper
          label="Dias por semana"
          value={days}
          min={2}
          max={7}
          onChange={setDaysChoice}
          testID="preferences-days"
          context="Alimentam o volume sugerido pela IA."
        />
      </Card>

      <Button
        label="Concluir e começar a treinar"
        size="lg"
        fullWidth
        onPress={() => {
          void finishOnboarding();
        }}
        testID="preferences-submit"
      />
    </Screen>
  );
}

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
  title: {
    ...typography.display,
    color: _colors.text,
    marginBottom: 4,
  },
  caption: {
    ...typography.caption,
    color: _colors.textSecondary,
  },
  content: {
    gap: spacing.md,
  },
});
