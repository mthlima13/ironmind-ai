import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Card } from '../../src/components/Card';
import { OptionRow } from '../../src/components/OptionRow';
import { Screen } from '../../src/components/Screen';
import { Stepper } from '../../src/components/Stepper';
import { useAuthState, useUpdateProfile } from '../../src/features/auth/useAuth';
import { useRestrictions } from '../../src/features/profile/useRestrictions';
import { ROUTES } from '../../src/navigation/linking';
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
 * The account has no backend copy: the identity is the UUID of the
 * installation and the preferences live on the device (SPEC 10.1 and 10.2).
 * Theme, privacy, notifications and the local data actions live in the
 * dedicated Configurações screen.
 */
export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { user, preferences } = useAuthState();
  const { updateProfile } = useUpdateProfile();
  const { data: restrictions } = useRestrictions();

  const savePreferences = (
    patch: Partial<NonNullable<typeof preferences>>
  ) => {
    void updateProfile({ preferences: patch });
  };

  return (
    <Screen
      title="Perfil"
      subtitle="Seus dados e preferências de treino."
      testID="profile-screen"
    >
      {user ? (
        <Card title="Perfil" subtitle="Salvo neste aparelho">
          <Text style={styles.accountName}>
            {user.name.trim().length > 0 ? user.name : 'Seu nome'}
          </Text>
          <Text style={styles.accountMeta}>
            Identidade: {user.id.slice(0, 8)}…
          </Text>
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
            Aparência, privacidade, notificações, apagar dados do aparelho
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
