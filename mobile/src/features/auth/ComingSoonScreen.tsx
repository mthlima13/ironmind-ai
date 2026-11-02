import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { ROUTES } from '../../navigation/linking';
import { useTheme, useThemedStyles, radii, spacing, typography, type ThemeColors } from '../../theme';

/**
 * "Em breve" interstitial (SPEC 15.3): the personal trainer track is phase 2
 * of the product. It offers the "Continuar como aluno" path so the flow has
 * no dead ends.
 */
export function ComingSoonScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Screen style={styles.centered} testID="coming-soon-screen">
      <View style={styles.lockup}>
        <Ionicons name="barbell" size={30} color={colors.accent} />
        <Text style={styles.wordmark}>
          <Text style={styles.wordmarkStrong}>Iron</Text>
          <Text style={styles.wordmarkLight}>Fit</Text>
        </Text>
      </View>

      <View style={styles.state}>
        <View style={styles.stateIcon}>
          <Ionicons name="time-outline" size={26} color={colors.info} />
        </View>
        <Text style={styles.stateTitle} testID="coming-soon-title">
          Em breve
        </Text>
        <Text style={styles.stateText} testID="coming-soon-text">
          O modo personal trainer está em desenvolvimento. Você vai poder
          montar programas e acompanhar seus alunos por aqui.
        </Text>
        <View style={styles.badge} testID="coming-soon-phase-badge">
          <Text style={styles.badgeText}>Fase 2 do produto</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label="Continuar como aluno"
          size="lg"
          fullWidth
          onPress={() => router.push(ROUTES.register)}
          testID="coming-soon-continue-student"
        />
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(ROUTES.funcao)}
          testID="coming-soon-back-role"
          hitSlop={8}
        >
          <Text style={styles.backLink}>&#8592; Voltar para a escolha</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  lockup: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  wordmark: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
  },
  wordmarkStrong: {
    color: colors.text,
    fontWeight: '700',
  },
  wordmarkLight: {
    color: colors.text,
    fontWeight: '400',
    opacity: 0.75,
  },
  state: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  stateIcon: {
    alignItems: 'center',
    backgroundColor: colors.infoSoft,
    borderRadius: radii.pill,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  stateTitle: {
    ...typography.heading,
    color: colors.text,
    textAlign: 'center',
  },
  stateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.info,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 26,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.info,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  actions: {
    gap: spacing.md,
  },
  backLink: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 12,
    minHeight: 32,
    textAlign: 'center',
  },
});
