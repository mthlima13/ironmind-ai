import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen } from '../../components/Screen';
import { ROUTES } from '../../navigation/linking';
import { useTheme, useThemedStyles, radii, typography, type ThemeColors } from '../../theme';

/**
 * Role selection screen (SPEC 15.3): "Quem é você?".
 *
 * Reached from the welcome screen. The student track continues to the sign-up
 * form; the personal trainer track opens the "Em breve" interstitial because
 * that role is phase 2 of the product, out of the current MVP scope.
 */
export function RoleScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Screen style={styles.centered} testID="role-screen">
      {/* Decorative corner hatching; ignored by screen readers. */}
      <View pointerEvents="none" style={[styles.hatch, styles.hatchTop]}>
        {Array.from({ length: 7 }, (_, index) => (
          <View key={index} style={styles.hatchLine} />
        ))}
      </View>
      <View pointerEvents="none" style={[styles.hatch, styles.hatchBottom]}>
        {Array.from({ length: 7 }, (_, index) => (
          <View key={index} style={styles.hatchLine} />
        ))}
      </View>

      <View style={styles.lockup}>
        <Ionicons name="barbell" size={40} color={colors.accent} />
        <Text style={styles.wordmark}>
          <Text style={styles.wordmarkStrong}>Iron</Text>
          <Text style={styles.wordmarkLight}>Fit</Text>
        </Text>
      </View>
      <Text style={styles.claim}>Treine com inteligência. Evolua com dados.</Text>

      <Text style={styles.title}>Quem é você?</Text>
      <Text style={styles.subtitle}>
        Escolha como vai usar o IronFit. Você pode mudar isso depois.
      </Text>

      <View style={styles.roles}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sou aluno: treino, registro séries e acompanho minha evolução"
          style={({ pressed }) => [styles.role, pressed && styles.roleActive]}
          onPress={() => router.push(ROUTES.register)}
          testID="role-student"
        >
          <View style={styles.roleIcon}>
            <Ionicons name="person-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>Sou aluno</Text>
            <Text style={styles.roleText}>
              Treino, registro séries e acompanho minha evolução.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sou personal trainer: monto programas, acompanho meus alunos e seus resultados"
          style={({ pressed }) => [styles.role, pressed && styles.roleActive]}
          onPress={() => router.push(ROUTES.embreve)}
          testID="role-personal"
        >
          <View style={styles.roleIcon}>
            <Ionicons name="restaurant-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>Sou personal trainer</Text>
            <Text style={styles.roleText}>
              Monto programas, acompanho meus alunos e seus resultados.
            </Text>
          </View>
          <View style={styles.soonPill}>
            <Text style={styles.soonPillText}>Em breve</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <Text style={styles.note}>
        Na versão atual do app o fluxo é único (aluno). A pessoa treinadora é
        uma extensão em estudo.
      </Text>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  hatch: {
    alignItems: 'center',
    gap: 12,
    height: 200,
    opacity: 0.3,
    overflow: 'hidden',
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    width: 200,
  },
  hatchTop: {
    left: -50,
    top: -60,
  },
  hatchBottom: {
    bottom: -60,
    right: -50,
  },
  hatchLine: {
    backgroundColor: colors.border,
    height: 1,
    width: '170%',
  },
  lockup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 10,
  },
  wordmark: {
    color: colors.text,
    fontSize: 32,
    letterSpacing: -0.5,
    lineHeight: 36,
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
  claim: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  title: {
    ...typography.heading,
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 24,
    textAlign: 'center',
  },
  roles: {
    gap: 12,
  },
  role: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 88,
    padding: 14,
    paddingHorizontal: 16,
  },
  roleActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  roleIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  roleText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  soonPill: {
    backgroundColor: colors.infoSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  soonPillText: {
    color: colors.info,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  note: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 16,
    textAlign: 'center',
  },
});
