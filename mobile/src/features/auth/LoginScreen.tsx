import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { ROUTES } from '../../navigation/linking';
import { colors, radii, spacing, typography } from '../../theme';
import { useAuthStore } from './auth.store';
import {
  hasErrors,
  validateLoginForm,
  type AuthFieldErrors,
} from './auth.validation';
import { useLogin } from './useAuth';

export function LoginScreen() {
  const router = useRouter();
  const { login, isSubmitting } = useLogin();
  const apiError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  const onSubmit = async () => {
    const errors = validateLoginForm({ email, password });
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      return;
    }
    await login(email, password);
  };

  return (
    <Screen
      title="IronMind AI"
      subtitle="Treine com inteligência. Evolua com dados."
      avoidKeyboard
      testID="login-screen"
    >
      <View style={styles.badge}>
        <Ionicons name="barbell" size={22} color={colors.accent} />
        <Text style={styles.badgeText}>Acesso à sua conta</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="E-mail"
          testID="login-email"
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
          error={fieldErrors.email}
        />

        <TextField
          label="Senha"
          testID="login-password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (fieldErrors.password) {
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }
          }}
          placeholder="Sua senha"
          secureTextEntry
          autoComplete="password"
          error={fieldErrors.password}
        />

        {apiError ? (
          <ErrorState
            title="Não foi possível entrar"
            message={apiError.message}
            testID="login-error"
          />
        ) : null}

        <Button
          label="Entrar"
          onPress={onSubmit}
          size="lg"
          loading={isSubmitting}
          fullWidth
          testID="login-submit"
        />

        <Pressable
          accessibilityRole="link"
          onPress={() => {
            clearError();
            router.push(ROUTES.forgotPassword);
          }}
          style={styles.link}
          testID="login-go-forgot-password"
        >
          <Text style={styles.linkText}>Esqueci minha senha</Text>
        </Pressable>

        <Pressable
          accessibilityRole="link"
          onPress={() => {
            clearError();
            router.push(ROUTES.register);
          }}
          style={styles.link}
          testID="login-go-register"
        >
          <Text style={styles.linkText}>Ainda não tem conta? Criar conta</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  badgeText: {
    ...typography.caption,
    color: colors.accent,
  },
  form: {
    gap: spacing.lg,
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
