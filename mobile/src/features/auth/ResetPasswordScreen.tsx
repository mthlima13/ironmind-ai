import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { ROUTES } from '../../navigation/linking';
import { DEFAULT_MESSAGES, mapApiError } from '../../services/api';
import { clearTokens } from '../../storage/secureToken';
import { useThemedStyles, typography, type ThemeColors } from '../../theme';
import { API_ERROR_CODES } from '../../types/api';
import { resetPassword } from './auth.service';
import { useAuthStore } from './auth.store';
import {
  hasErrors,
  MIN_PASSWORD_LENGTH,
  validateResetPasswordForm,
  type AuthFieldErrors,
} from './auth.validation';

function readToken(value: string | string[] | undefined): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return (value[0] ?? '').trim();
  }
  return '';
}

export function ResetPasswordScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = readToken(params.token);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  /** A deep link without a token can never be used. */
  const isMissingToken = token.length === 0;

  const clearFieldError = (field: keyof AuthFieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const onSubmit = async () => {
    const errors = validateResetPasswordForm({ password, confirmPassword });
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      return;
    }

    if (isMissingToken) {
      setError(DEFAULT_MESSAGES[API_ERROR_CODES.INVALID_RESET_TOKEN]);
      return;
    }

    setIsSubmitting(true);
    setError(undefined);
    try {
      await resetPassword(token, password);
      // Recovering the password ends every open session (SPEC 7.7).
      await clearTokens();
      useAuthStore.getState().expireSession();
      setIsDone(true);
    } catch (caught) {
      const apiError = mapApiError(caught);
      setError(
        apiError.code === API_ERROR_CODES.INVALID_RESET_TOKEN
          ? DEFAULT_MESSAGES[API_ERROR_CODES.INVALID_RESET_TOKEN]
          : apiError.message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <Screen
        title="Senha alterada"
        subtitle="Entre com a nova senha para continuar."
        testID="reset-password-screen"
      >
        <Text style={styles.hint}>
          Por segurança, as sessões abertas foram encerradas. Entre novamente
          com a senha que você acabou de definir.
        </Text>

        <Button
          label="Ir para o login"
          onPress={() => router.replace(ROUTES.login)}
          size="lg"
          fullWidth
          testID="reset-password-go-login"
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Definir nova senha"
      subtitle="Crie uma senha nova para acessar sua conta."
      avoidKeyboard
      testID="reset-password-screen"
    >
      <Text style={styles.hint}>
        A senha precisa ter ao menos {MIN_PASSWORD_LENGTH} caracteres, com letra
        e número.
      </Text>

      <TextField
        label="Nova senha"
        testID="reset-password-password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          clearFieldError('password');
        }}
        placeholder="Crie uma senha forte"
        secureTextEntry
        autoComplete="new-password"
        error={fieldErrors.password}
      />

      <TextField
        label="Confirmar senha"
        testID="reset-password-confirm-password"
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          clearFieldError('confirmPassword');
        }}
        placeholder="Repita a senha"
        secureTextEntry
        autoComplete="new-password"
        error={fieldErrors.confirmPassword}
      />

      {error || isMissingToken ? (
        <ErrorState
          title="Não foi possível alterar a senha"
          message={error ?? DEFAULT_MESSAGES[API_ERROR_CODES.INVALID_RESET_TOKEN]}
          testID="reset-password-error"
        />
      ) : null}

      <Button
        label="Salvar nova senha"
        onPress={onSubmit}
        size="lg"
        loading={isSubmitting}
        disabled={isMissingToken}
        fullWidth
        testID="reset-password-submit"
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
