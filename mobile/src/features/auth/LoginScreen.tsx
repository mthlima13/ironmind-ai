import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { ROUTES } from '../../navigation/linking';
import { useThemedStyles, layout, spacing, typography, type ThemeColors } from '../../theme';
import { useAuthStore } from './auth.store';
import {
  hasErrors,
  validateLoginForm,
  type AuthFieldErrors,
} from './auth.validation';
import { useLogin } from './useAuth';

export function LoginScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
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
      avoidKeyboard
      style={styles.auth}
      testID="login-screen"
    >
      <View style={styles.intro}>
        <Text style={styles.brand}>IronFit</Text>
        <Text style={styles.title}>Treine com inteligência.</Text>
        <Text style={styles.caption}>
          Evolua com dados. Entre para registrar suas séries.
        </Text>
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
          placeholder="voce@email.com"
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
          style={styles.secondaryAction}
          testID="login-go-forgot-password"
        >
          <Text style={styles.secondaryActionText}>Esqueci minha senha</Text>
        </Pressable>

        <View style={styles.signupRow}>
          <Text style={styles.signupHint}>Ainda não tem conta?</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              clearError();
              router.push(ROUTES.register);
            }}
            style={styles.signupLink}
            testID="login-go-register"
          >
            <Text style={styles.signupLinkText}>Criar conta</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  auth: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  intro: {
    gap: spacing.xs,
  },
  brand: {
    ...typography.label,
    color: colors.textMuted,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  secondaryAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
  },
  secondaryActionText: {
    ...typography.bodyStrong,
    color: colors.accent,
  },
  signupRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  signupHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  signupLink: {
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
  },
  signupLinkText: {
    ...typography.caption,
    color: colors.accent,
    fontFamily: 'Inter_600SemiBold',
  },
});
