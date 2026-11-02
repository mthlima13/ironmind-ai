import { useState } from 'react';
import { Linking, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { LoadingState } from '../../components/LoadingState';
import { OptionRow } from '../../components/OptionRow';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useDeleteAccount, useLogout } from '../auth/useAuth';
import { useProfile, useUpdateProfile } from '../auth/useProfile';
import {
  describeNotificationPermission,
  requestNotificationPermission,
  type PermissionOutcome,
} from '../../services/permissions';
import {
  useTheme,
  useThemedStyles,
  typography,
  type ThemeColors,
  type ThemeMode,
} from '../../theme';

/** Theme choices offered in Configurações (SPEC 15.2). */
const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
];

/**
 * Public addresses of the legal documents (SPEC 14.4).
 *
 * They are empty until the documents are published: the buttons only appear
 * when the build receives the URL, so the app never opens a placeholder page.
 */
const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL?.trim() ?? '';
const TERMS_OF_USE_URL = process.env.EXPO_PUBLIC_TERMS_URL?.trim() ?? '';

/**
 * Settings screen (SPEC 15.3): everything about the app and the account.
 *
 * Split from the Perfil screen ("identity/training" stays in Perfil): theme
 * selection, privacy switches with the legal links, notification permission,
 * logout and the definitive account deletion with password confirmation.
 */
export function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { logout, isSubmitting: isLoggingOut } = useLogout();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [permission, setPermission] = useState<PermissionOutcome | null>(null);
  const {
    deleteAccount,
    isSubmitting: isDeletingAccount,
    error: deleteError,
    clearError: clearDeleteError,
  } = useDeleteAccount();
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);
  const [password, setPassword] = useState('');

  const preferences = profile?.preferences;
  const passwordError = deleteError?.fieldErrors.find(
    (fieldError) => fieldError.field === 'password'
  )?.message;

  const closeDeletion = () => {
    setIsConfirmingDeletion(false);
    setPassword('');
    clearDeleteError();
  };

  const confirmDeletion = async () => {
    const trimmed = password.trim();
    if (trimmed.length === 0) {
      return;
    }
    await deleteAccount(trimmed);
  };

  const savePreferences = (
    patch: Partial<NonNullable<typeof preferences>>
  ) => {
    updateProfile.mutate({ preferences: patch });
  };

  return (
    <Screen
      title="Configurações"
      subtitle="Aparência, privacidade, notificações e conta."
      avoidKeyboard
      testID="settings-screen"
    >
      {isLoading ? <LoadingState label="Carregando preferências…" /> : null}

      <Card title="Aparência">
        <OptionRow<ThemeMode>
          label="Tema"
          testID="settings-theme"
          value={mode}
          options={THEME_OPTIONS}
          onChange={setMode}
        />
        <Text style={styles.accountMeta}>
          O tema escolhido fica salvo neste aparelho.
        </Text>
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
              trackColor={{ true: colors.accent, false: colors.borderStrong }}
              thumbColor={colors.onAccent}
              accessibilityLabel="Perfil público"
              testID="settings-privacy-public"
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
              trackColor={{ true: colors.accent, false: colors.borderStrong }}
              thumbColor={colors.onAccent}
              accessibilityLabel="Mostrar recordes"
              testID="settings-privacy-records"
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
              trackColor={{ true: colors.accent, false: colors.borderStrong }}
              thumbColor={colors.onAccent}
              accessibilityLabel="Permitir compartilhamento"
              testID="settings-privacy-sharing"
            />
          </View>
          {PRIVACY_POLICY_URL ? (
            <Button
              label="Política de privacidade"
              variant="ghost"
              onPress={() => {
                void Linking.openURL(PRIVACY_POLICY_URL);
              }}
              testID="settings-privacy-policy"
            />
          ) : null}
          {TERMS_OF_USE_URL ? (
            <Button
              label="Termos de uso"
              variant="ghost"
              onPress={() => {
                void Linking.openURL(TERMS_OF_USE_URL);
              }}
              testID="settings-terms-of-use"
            />
          ) : null}
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
          testID="settings-notification-permission"
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
        loading={isLoggingOut}
        onPress={() => {
          void logout();
        }}
        testID="settings-logout"
      />

      <Card
        title="Excluir conta"
        subtitle="Exclusão definitiva — exigida pela política do Google Play para apps com conta."
      >
        {!isConfirmingDeletion ? (
          <>
            <Text style={styles.dangerText}>
              Apaga permanentemente sua conta e todo o histórico: programas,
              sessões, séries, recordes, restrições e recomendações de IA. Não é
              possível desfazer.
            </Text>
            <Button
              label="Quero excluir minha conta"
              variant="secondary"
              onPress={() => {
                clearDeleteError();
                setIsConfirmingDeletion(true);
              }}
              testID="settings-delete-account"
            />
          </>
        ) : (
          <>
            <Text style={styles.dangerText}>
              Digite sua senha para confirmar. Esta ação não pode ser desfeita.
            </Text>
            <TextField
              label="Senha atual"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                clearDeleteError();
              }}
              placeholder="Sua senha"
              secureTextEntry
              autoComplete="password"
              error={passwordError}
              editable={!isDeletingAccount}
              testID="settings-delete-password"
            />
            {deleteError && !passwordError ? (
              <Text
                style={styles.errorText}
                accessibilityLiveRegion="polite"
                testID="settings-delete-error"
              >
                {deleteError.message}
              </Text>
            ) : null}
            <Button
              label="Excluir definitivamente"
              variant="danger"
              loading={isDeletingAccount}
              disabled={password.trim().length === 0}
              onPress={() => {
                void confirmDeletion();
              }}
              testID="settings-delete-confirm"
            />
            <Button
              label="Cancelar"
              variant="secondary"
              disabled={isDeletingAccount}
              onPress={closeDeletion}
              testID="settings-delete-cancel"
            />
          </>
        )}
      </Card>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  accountMeta: {
    ...typography.caption,
    color: colors.textMuted,
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
  dangerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
});
