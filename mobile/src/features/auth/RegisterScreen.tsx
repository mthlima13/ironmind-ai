import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { ROUTES } from '../../navigation/linking';
import { useThemedStyles, typography, type ThemeColors } from '../../theme';
import {
  hasErrors,
  validateNameForm,
} from './auth.validation';
import { PersonaBanner } from './PersonaBanner';
import { StepChips } from './StepChips';

/**
 * Step 1 of the first-run flow (SPEC 15.3): "Quem é você?".
 *
 * There is no account to create: the identity of the installation already
 * exists (the UUID on the identity header). This screen only asks for the
 * name used by greetings and forms, and forwards it to the preferences step.
 */
export function RegisterScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const onSubmit = () => {
    const errors = validateNameForm({ name });
    if (hasErrors(errors)) {
      setNameError(errors.name ?? null);
      return;
    }
    // Step 2 must be a ROOT route: the moment completeOnboarding flips the
    // auth guard, the whole auth group is hidden from the stack.
    router.replace({
      pathname: ROUTES.preferencias,
      params: { name: name.trim() },
    });
  };

  return (
    <Screen avoidKeyboard testID="register-screen">
      <StepChips current={1} />

      <Text style={styles.title}>Quem é você?</Text>
      <Text style={styles.subtitle}>
        Sem cadastro e sem senha: seus dados ficam salvos apenas neste
        aparelho.
      </Text>

      <PersonaBanner label="Você escolheu" text="Sou aluno" />

      <TextField
        label="Nome"
        testID="register-name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (nameError) {
            setNameError(null);
          }
        }}
        placeholder="Como devemos te chamar?"
        autoCapitalize="words"
        autoComplete="name"
        error={nameError ?? undefined}
      />

      <Button
        label="Continuar"
        onPress={onSubmit}
        size="lg"
        fullWidth
        testID="register-submit"
      />

      <Text style={styles.nextStepNote}>
        Na próxima etapa definimos suas preferências: unidade, experiência,
        objetivo e dias por semana.
      </Text>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
});
