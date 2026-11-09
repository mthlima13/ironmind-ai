import { useState } from 'react';
import { Linking, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { OptionRow } from '../../components/OptionRow';
import { Screen } from '../../components/Screen';
import { useAuthState, useResetLocalData, useUpdateProfile } from '../auth/useAuth';
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
 * Settings screen (SPEC 15.3): everything about the app and the local data.
 *
 * Split from the Perfil screen ("identity/training" stays in Perfil): theme
 * selection, privacy switches with the legal links, notification permission
 * and the local data wipe. There is no logout and no account deletion: the
 * account belongs to the identity provider (SPEC 11.1); what this screen can
 * erase is the whole data of the installation, returning to the welcome
 * screen with a fresh identity.
 */
export function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { preferences } = useAuthState();
  const { updateProfile } = useUpdateProfile();
  const { resetLocalData, isSubmitting: isResetting } = useResetLocalData();
  const [permission, setPermission] = useState<PermissionOutcome | null>(null);
  const [isConfirmingWipe, setIsConfirmingWipe] = useState(false);

  const savePreferences = (
    patch: Partial<NonNullable<typeof preferences>>
  ) => {
    void updateProfile({ preferences: patch });
  };

  return (
    <Screen
      title="Configurações"
      subtitle="Aparência, privacidade, notificações e dados."
      testID="settings-screen"
    >
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

      <Card
        title="Dados deste aparelho"
        subtitle="Tudo o que você treinou por aqui fica salvo neste aparelho."
      >
        {!isConfirmingWipe ? (
          <>
            <Text style={styles.dangerText}>
              Apaga todo o conteúdo local: nome, preferências, programas,
              sessões, séries, restrições e a fila offline, e gera uma nova
              identidade, como uma instalação nova. Não é possível desfazer.
            </Text>
            <Button
              label="Apagar dados deste aparelho"
              variant="secondary"
              onPress={() => setIsConfirmingWipe(true)}
              testID="settings-wipe-data"
            />
          </>
        ) : (
          <>
            <Text style={styles.dangerText}>
              Você volta para a tela de boas-vindas e começa do zero. Esta ação
              não pode ser desfeita.
            </Text>
            <Button
              label="Apagar tudo"
              variant="danger"
              loading={isResetting}
              onPress={() => {
                setIsConfirmingWipe(false);
                void resetLocalData();
              }}
              testID="settings-wipe-confirm"
            />
            <Button
              label="Cancelar"
              variant="secondary"
              disabled={isResetting}
              onPress={() => setIsConfirmingWipe(false)}
              testID="settings-wipe-cancel"
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
