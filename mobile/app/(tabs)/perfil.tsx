import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Card } from '../../src/components/Card';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { OptionRow } from '../../src/components/OptionRow';
import { Screen } from '../../src/components/Screen';
import { Stepper } from '../../src/components/Stepper';
import { useProfile, useUpdateProfile } from '../../src/features/auth/useProfile';
import { useRestrictions } from '../../src/features/profile/useRestrictions';
import { ROUTES } from '../../src/navigation/linking';
import { mapApiError } from '../../src/services/api';
import {
  useTheme,
  useThemedStyles,
  radii,
  spacing,
  typography,
  type ThemeColors,
} from '../../src/theme';
import {
  TRAINING_EXPERIENCE_LABELS,
  TRAINING_GOAL_LABELS,
  WEIGHT_UNITS,
  type TrainingExperience,
  type TrainingGoal,
  type WeightUnit,
} from '../../src/types/user';

/**
 * Profile screen (SPEC 15.3): the user identity and training data.
 *
 * Theme, privacy, notifications and the account actions (logout, deletion)
 * live in the dedicated Configurações screen — the split keeps this screen
 * focused on what defines the user and feeds the AI.
 */
export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: restrictions } = useRestrictions();

  const preferences = profile?.preferences;

  const savePreferences = (
    patch: Partial<NonNullable<typeof preferences>>
  ) => {
    updateProfile.mutate({ preferences: patch });
  };

  return (
    <Screen
      title="Perfil"
      subtitle="Seus dados e preferências de treino."
      testID="profile-screen"
    >
      {isLoading ? <LoadingState label="Carregando perfil…" /> : null}

      {isError ? (
        <ErrorState
          message={mapApiError(error).message}
          onRetry={() => {
            void refetch();
          }}
          testID="profile-error"
        />
      ) : null}

      {profile ? (
        <Card title="Conta" subtitle={profile.user.email}>
          <Text style={styles.accountName}>{profile.user.name}</Text>
          <Text style={styles.accountMeta}>Fuso horário: {profile.timezone}</Text>
        </Card>
      ) : null}

      {preferences ? (
        <Card title="Preferências de treino">
          <OptionRow<WeightUnit>
            label="Unidade de peso"
            testID="profile-units"
            value={preferences.preferredUnits}
            options={[
              { value: WEIGHT_UNITS.KG, label: 'kg' },
              { value: WEIGHT_UNITS.LB, label: 'lb' },
            ]}
            onChange={(preferredUnits) => savePreferences({ preferredUnits })}
          />

          <OptionRow<TrainingExperience>
            label="Experiência"
            testID="profile-experience"
            value={preferences.trainingExperience}
            options={(
              Object.keys(TRAINING_EXPERIENCE_LABELS) as TrainingExperience[]
            ).map((value) => ({ value, label: TRAINING_EXPERIENCE_LABELS[value] }))}
            onChange={(trainingExperience) => savePreferences({ trainingExperience })}
          />

          <OptionRow<TrainingGoal>
            label="Objetivo"
            testID="profile-goal"
            value={preferences.goal}
            options={(Object.keys(TRAINING_GOAL_LABELS) as TrainingGoal[]).map((value) => ({
              value,
              label: TRAINING_GOAL_LABELS[value],
            }))}
            onChange={(goal) => savePreferences({ goal })}
          />

          <Stepper
            label="Dias por semana"
            value={preferences.trainingDays}
            min={2}
            max={7}
            onChange={(trainingDays) => savePreferences({ trainingDays })}
            testID="profile-days"
            context="Alimentam o volume sugerido pela IA."
          />
        </Card>
      ) : null}

      <Card
        title="Limitações e exercícios a evitar"
        subtitle="Dados sensíveis: ficam visíveis apenas para você."
      >
        {restrictions && restrictions.length > 0 ? (
          <View style={styles.restrictions}>
            {restrictions.map((restriction) => (
              <View key={restriction.id} style={styles.restriction}>
                <View style={styles.restrictionInfo}>
                  <Text style={styles.restrictionRegion}>{restriction.bodyRegion}</Text>
                  <Text style={styles.restrictionDescription}>
                    {restriction.description}
                  </Text>
                </View>
                <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.accountMeta}>
            Nenhuma limitação informada.
          </Text>
        )}
      </Card>

      <Text style={styles.sectionTitle}>Gerais</Text>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.settingsItem,
          pressed && styles.settingsItemPressed,
        ]}
        onPress={() => router.push(ROUTES.configuracoes)}
        testID="profile-open-settings"
      >
        <View style={styles.settingsIcon}>
          <Ionicons name="settings-outline" size={20} color={colors.accent} />
        </View>
        <View style={styles.settingsInfo}>
          <Text style={styles.settingsTitle}>Configurações</Text>
          <Text style={styles.settingsMeta}>
            Aparência, privacidade, notificações, excluir e sair da conta
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  accountName: {
    ...typography.heading,
    color: colors.text,
  },
  accountMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  settingsItem: {
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
  settingsItemPressed: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  settingsIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  settingsInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  settingsTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  settingsMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  restrictions: {
    gap: spacing.sm,
  },
  restriction: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.warning,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  restrictionInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  restrictionRegion: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  restrictionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
