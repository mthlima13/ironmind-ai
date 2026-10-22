import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { colors, typography } from '../../theme';
import { useAuthStore } from './auth.store';
import {
  hasErrors,
  MIN_PASSWORD_LENGTH,
  validateRegisterForm,
  type AuthFieldErrors,
} from './auth.validation';
import { useRegister } from './useAuth';

export function RegisterScreen() {
  const router = useRouter();
  const { register, isSubmitting } = useRegister();
  const apiError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  const clearFieldError = (field: keyof AuthFieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const onSubmit = async () => {
    const errors = validateRegisterForm({ name, email, password, confirmPassword });
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      return;
    }
    await register({ name, email, password });
  };

  return (
    <Screen
      title="Criar conta"
      subtitle="Comece a registrar seus treinos em poucos toques."
      avoidKeyboard
      testID="register-screen"
    >
      <Text style={styles.hint}>
        A senha precisa ter ao menos {MIN_PASSWORD_LENGTH} caracteres, com letra e
        número.
      </Text>

      <TextField
        label="Nome"
        testID="register-name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          clearFieldError('name');
        }}
        placeholder="Como te chamamos?"
        autoCapitalize="words"
        autoComplete="name"
        error={fieldErrors.name}
      />

      <TextField
        label="E-mail"
        testID="register-email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          clearFieldError('email');
        }}
        placeholder="voce@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={fieldErrors.email}
      />

      <TextField
        label="Senha"
        testID="register-password"
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
        testID="register-confirm-password"
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

      {apiError ? (
        <ErrorState
          title="Não foi possível criar a conta"
          message={apiError.message}
          testID="register-error"
        />
      ) : null}

      <Button
        label="Criar conta"
        onPress={onSubmit}
        size="lg"
        loading={isSubmitting}
        fullWidth
        testID="register-submit"
      />

      <Pressable
        accessibilityRole="link"
        onPress={() => {
          clearError();
          router.push('/auth/login');
        }}
        style={styles.link}
        testID="register-go-login"
      >
        <Text style={styles.linkText}>Já tem conta? Entrar</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.caption,
    color: colors.textMuted,
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
