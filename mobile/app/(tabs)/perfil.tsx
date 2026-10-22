import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { Screen } from '../../src/components/Screen';
import { useLogout } from '../../src/features/auth/useAuth';
import { useProfile, useUpdateProfile } from '../../src/features/auth/useProfile';
import { useRestrictions } from '../../src/features/profile/useRestrictions';
import { mapApiError } from '../../src/services/api';
import {
  describeNotificationPermission,
  requestNotificationPermission,
  type PermissionOutcome,
} from '../../src/services/permissions';
import { colors, radii, spacing, typography } from '../../src/theme';
import {
  WEIGHT_UNITS,
  type TrainingExperience,
  type TrainingGoal,
  type WeightUnit,
} from '../../src/types/user';

const EXPERIENCE_LABELS: Record<TrainingExperience, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
};

const GOAL_LABELS: Record<TrainingGoal, string> = {
  HYPERTROPHY: 'Hipertrofia',
  STRENGTH: 'Força',
  ENDURANCE: 'Resistência',
  GENERAL: 'Geral',
};

function OptionRow<T extends string>({
  label,
  options,
  value,
  onChange,
  testID,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  testID: string;
}) {
  return (
    <View style={styles.optionGroup} testID={testID}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <Button
              key={option.value}
              label={option.label}
              variant={isActive ? 'primary' : 'secondary'}
              onPress={() => onChange(option.value)}
              testID={`${testID}-${option.value}`}
              style={styles.optionButton}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { logout } = useLogout();
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: restrictions } = useRestrictions();
  const [permission, setPermission] = useState<PermissionOutcome | null>(null);

  const preferences = profile?.preferences;

  const savePreferences = (
    patch: Partial<NonNullable<typeof preferences>>
  ) => {
    updateProfile.mutate({ preferences: patch });
  };

  return (
    <Screen
      title="Perfil"
      subtitle="Preferências, restrições e privacidade."
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
              Object.keys(EXPERIENCE_LABELS) as TrainingExperience[]
            ).map((value) => ({ value, label: EXPERIENCE_LABELS[value] }))}
            onChange={(trainingExperience) => savePreferences({ trainingExperience })}
          />

          <OptionRow<TrainingGoal>
            label="Objetivo"
            testID="profile-goal"
            value={preferences.goal}
            options={(Object.keys(GOAL_LABELS) as TrainingGoal[]).map((value) => ({
              value,
              label: GOAL_LABELS[value],
            }))}
            onChange={(goal) => savePreferences({ goal })}
          />

          <Text style={styles.daysLabel}>Dias por semana</Text>
          <Text style={styles.daysValue}>{preferences.trainingDays}</Text>
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

      {preferences ? (
        <Card title="Privacidade">
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Perfil público</Text>
            <Switch
              value={preferences.privacySettings.publicProfile}
              onValueChange={(publicProfile) =>
                savePreferences({
                  privacySettings: {
                    ...preferences.privacySettings,
                    publicProfile,
                  },
                })
              }
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor={colors.text}
              testID="profile-privacy-public"
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Mostrar recordes</Text>
            <Switch
              value={preferences.privacySettings.showRecords}
              onValueChange={(showRecords) =>
                savePreferences({
                  privacySettings: {
                    ...preferences.privacySettings,
                    showRecords,
                  },
                })
              }
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor={colors.text}
              testID="profile-privacy-records"
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Permitir compartilhamento</Text>
            <Switch
              value={preferences.privacySettings.allowSharing}
              onValueChange={(allowSharing) =>
                savePreferences({
                  privacySettings: {
                    ...preferences.privacySettings,
                    allowSharing,
                  },
                })
              }
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor={colors.text}
              testID="profile-privacy-sharing"
            />
          </View>
        </Card>
      ) : null}

      <Card title="Notificações" subtitle="Permissão solicitada no momento do uso.">
        <Button
          label={
            permission ? 'Verificar permissão' : 'Permitir notificações'
          }
          variant="secondary"
          onPress={async () => {
            const outcome = await requestNotificationPermission();
            setPermission(outcome);
          }}
          testID="profile-notification-permission"
        />
        {permission ? (
          <Text style={styles.accountMeta}>
            {describeNotificationPermission(permission)}
          </Text>
        ) : null}
      </Card>

      <Button
        label="Sair da conta"
        variant="danger"
        onPress={() => {
          void logout();
        }}
        testID="profile-logout"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountName: {
    ...typography.heading,
    color: colors.text,
  },
  accountMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  optionGroup: {
    gap: spacing.sm,
  },
  optionLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    flexGrow: 1,
    flexBasis: 96,
  },
  daysLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  daysValue: {
    ...typography.metric,
    color: colors.text,
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
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  switchLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
});
