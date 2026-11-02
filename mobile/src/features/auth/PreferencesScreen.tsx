import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { OptionRow } from '../../components/OptionRow';
import { Screen } from '../../components/Screen';
import { Stepper } from '../../components/Stepper';
import { ROUTES } from '../../navigation/linking';
import { useThemedStyles, spacing, typography, type ThemeColors } from '../../theme';
import { useProfile, useUpdateProfile } from './useProfile';
import { PersonaBanner } from './PersonaBanner';
import { StepChips } from './StepChips';
import {
  TRAINING_EXPERIENCE,
  TRAINING_EXPERIENCE_LABELS,
  TRAINING_GOAL_LABELS,
  TRAINING_GOALS,
  WEIGHT_UNITS,
  type TrainingExperience,
  type TrainingGoal,
  type WeightUnit,
} from '../../types/user';

/**
 * Step 2 of the sign-up flow (SPEC 15.3): training preferences of the student.
 *
 * These values feed the AI recommendations (plan, volume, progression) and
 * can be changed later in the Perfil screen. The card uses the same OptionRow
 * controls as the Perfil screen so both places stay visually identical.
 */
export function PreferencesScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const profilePreferences = profile?.preferences;
  const [unitChoice, setUnitChoice] = useState<WeightUnit | null>(null);
  const [experienceChoice, setExperienceChoice] = useState<TrainingExperience | null>(
    null
  );
  const [goalChoice, setGoalChoice] = useState<TrainingGoal | null>(null);
  const [daysChoice, setDaysChoice] = useState<number | null>(null);

  // Defaults follow the profile when it arrives and fall back to the product
  // defaults of a brand new account (SPEC 6.4: empty account, no fake data).
  const unit = unitChoice ?? profilePreferences?.preferredUnits ?? WEIGHT_UNITS.KG;
  const experience =
    experienceChoice ??
    profilePreferences?.trainingExperience ??
    TRAINING_EXPERIENCE.BEGINNER;
  const goal = goalChoice ?? profilePreferences?.goal ?? TRAINING_GOALS.HYPERTROPHY;
  const days = daysChoice ?? profilePreferences?.trainingDays ?? 4;

  const finishOnboarding = () => {
    updateProfile.mutate({
      preferences: {
        preferredUnits: unit,
        trainingExperience: experience,
        goal,
        trainingDays: days,
      },
    });
    // The dashboard of a new account shows empty states on purpose.
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
        onPress={finishOnboarding}
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
