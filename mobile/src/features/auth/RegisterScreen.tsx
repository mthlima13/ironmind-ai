import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { ROUTES } from '../../navigation/linking';
import { useThemedStyles, typography, type ThemeColors } from '../../theme';
import { useAuthStore } from './auth.store';
import {
  hasErrors,
  MIN_PASSWORD_LENGTH,
  validateRegisterForm,
  type AuthFieldErrors,
} from './auth.validation';
import { useRegister } from './useAuth';
import { PersonaBanner } from './PersonaBanner';
import { StepChips } from './StepChips';

/**
 * Step 1 of the sign-up flow (SPEC 15.3): the access data.
 *
 * After register() succeeds the user is already authenticated, so step 2
 * (training preferences) must be a ROOT route: the moment the auth guard
 * flips, the whole auth group (this screen included) is hidden from the
 * stack. That is why the success handler replaces the history there instead
 * of pushing another screen inside the auth group.
 */
export function RegisterScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
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
    const registered = await register({ name, email, password });
    if (registered) {
      router.replace(ROUTES.preferencias);
    }
  };

  return (
    <Screen avoidKeyboard testID="register-screen">
      <StepChips current={1} />

      <Text style={styles.title}>Criar conta</Text>
      <Text style={styles.subtitle}>
        Seus dados ficam protegidos e você pode excluir a conta quando quiser.
      </Text>

      <PersonaBanner label="Você escolheu" text="Sou aluno" />

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
        placeholder="Como devemos te chamar?"
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
        placeholder="voce@email.com"
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
        placeholder="Mínimo de 8 caracteres"
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
        label="Continuar"
        onPress={() => {
          void onSubmit();
        }}
        size="lg"
        loading={isSubmitting}
        fullWidth
        testID="register-submit"
      />

      <Text style={styles.nextStepNote}>
        Na próxima etapa definimos suas preferências: unidade, experiência,
        objetivo e dias por semana.
      </Text>

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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  nextStepNote: {
    ...typography.caption,
    color: colors.textMuted,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  subtitle: {
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
