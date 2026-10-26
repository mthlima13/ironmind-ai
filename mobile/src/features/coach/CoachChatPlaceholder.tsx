import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { useTheme, useThemedStyles, radii, spacing, typography, type ThemeColors } from '../../theme';

/**
 * Placeholder of the coaching chat (SPEC RF-020, phase 2).
 *
 * The screen is reachable from Treinos and Evolução so the navigation
 * reserved for the feature already exists. The chat itself is not implemented:
 * the AI calls go through the backend only (SPEC 12).
 */
export function CoachChatPlaceholder() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Screen
      title="Coach IA"
      subtitle="Conversa contextualizada sobre os seus registros de treino."
      testID="coach-screen"
    >
      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Ionicons name="chatbubbles-outline" size={28} color={colors.accent} />
        </View>
        <Text style={styles.title}>Recurso planejado</Text>
        <Text style={styles.message}>
          O chat de coaching chega na Fase 2. Quando existir, ele usa o histórico
          de séries, as preferências e as restrições informadas por você, sempre
          como sugestão revisável.
        </Text>
        <Text style={styles.footnote}>
          Nenhuma chamada de IA é feita pelo aplicativo: a IA é acessada pelo
          backend.
        </Text>
      </View>

      <Button
        label="Voltar"
        variant="secondary"
        onPress={() => undefined}
        disabled
        testID="coach-disabled-action"
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
