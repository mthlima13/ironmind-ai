import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { ROUTES } from '../../navigation/linking';
import { mapApiError } from '../../services/api';
import { useTheme, useThemedStyles, radii, spacing, typography, type ThemeColors } from '../../theme';
import { requestPasswordRecovery } from './auth.service';
import {
  hasErrors,
  validateForgotPasswordForm,
  type AuthFieldErrors,
} from './auth.validation';

/**
 * Message shown before and after the request.
 *
 * The API never reveals if the e-mail is registered, so the app does the
 * same: the answer is the same in every case (SPEC 7.7).
 */
export const RECOVERY_MESSAGE =
  'Se o e-mail estiver cadastrado, você receberá as instruções em instantes.';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const onSubmit = async () => {
    const errors = validateForgotPasswordForm({ email });
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      return;
    }

    setIsSubmitting(true);
    setError(undefined);
    try {
      await requestPasswordRecovery(email);
      setIsSent(true);
    } catch (caught) {
      setError(mapApiError(caught).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen
      title="Recuperar acesso"
      subtitle="Informe seu e-mail para receber as instruções de recuperação."
      avoidKeyboard
      testID="forgot-password-screen"
    >
      <TextField
        label="E-mail"
        testID="forgot-password-email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (fieldErrors.email) {
            setFieldErrors((current) => ({ ...current, email: undefined }));
          }
        }}
        placeholder="voce@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!isSent}
        error={fieldErrors.email}
      />

      {isSent ? (
        <View style={styles.success} testID="forgot-password-success">
          <Ionicons name="mail-open-outline" size={22} color={colors.success} />
          <View style={styles.successText}>
            <Text style={styles.successTitle}>Solicitação recebida</Text>
            <Text style={styles.successMessage}>{RECOVERY_MESSAGE}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.note} testID="forgot-password-note">
          {RECOVERY_MESSAGE}
        </Text>
      )}

      {error ? (
        <ErrorState
          title="Não foi possível enviar as instruções"
          message={error}
          testID="forgot-password-error"
        />
      ) : null}

      <Button
        label="Enviar instruções"
        onPress={onSubmit}
        size="lg"
        loading={isSubmitting}
        disabled={isSent}
        fullWidth
        testID="forgot-password-submit"
      />

      <Pressable
        accessibilityRole="link"
        onPress={() => {
          setError(undefined);
          router.push(ROUTES.login);
        }}
        style={styles.link}
        testID="forgot-password-go-login"
      >
        <Text style={styles.linkText}>Voltar para o login</Text>
      </Pressable>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  note: {
    ...typography.caption,
    color: colors.textMuted,
  },
  success: {
    alignItems: 'flex-start',
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  successText: {
    flex: 1,
    gap: spacing.xs,
  },
  successTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  successMessage: {
    ...typography.body,
    color: colors.textSecondary,
  },
  link: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    ...typography.bodyStrong,
    color: colors.accent,
  },
});
