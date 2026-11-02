import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { ROUTES } from '../../navigation/linking';
import {
  useThemedStyles,
  radii,
  spacing,
  typography,
  type ThemeColors,
} from '../../theme';

/**
 * Hero gradient of the welcome screen (SPEC 15.2).
 *
 * This screen has a frozen composition: it does not follow the light/dark
 * theme, and the stop colors always end on the near-black graphite.
 */

/** Legal URLs follow the same configuration used by the profile screen. */
const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL?.trim() ?? '';
const TERMS_OF_USE_URL = process.env.EXPO_PUBLIC_TERMS_URL?.trim() ?? '';

const FEATURES = [
  {
    icon: 'checkbox-outline' as const,
    label: 'Planos de treino personalizados',
  },
  {
    icon: 'headset-outline' as const,
    label: 'Entre em contato para um acompanhamento por um profissional',
  },
  {
    icon: 'stats-chart-outline' as const,
    label: 'Treine de acordo com seu nível',
  },
];

/**
 * Welcome screen (SPEC 15.3): the landing for unauthenticated users.
 *
 * "Continuar" goes to the role selection screen ("Quem é você?"); "Entrar"
 * jumps straight to login. The language pill is decorative on purpose - the
 * app is pt-BR only, so it is rendered as a badge, not as a control.
 */
export function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  const openLegalLink = (url: string) => {
    void Linking.openURL(url);
  };

  return (
    <LinearGradient
      colors={['#4A69E2', '#6F85F0', '#BCC6F5', '#0B0E10']}
      locations={[0, 0.34, 0.56, 0.82]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.fill}
    >
      <StatusBar style="light" />
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
        testID="welcome-screen"
      >
        <View style={styles.topRow}>
          {/* Static language badge (SPEC 15.2): the app ships pt-BR only. */}
          <View
            style={styles.langBadge}
            testID="welcome-lang"
            accessibilityLabel="Idioma: português"
          >
            <Ionicons name="globe-outline" size={15} color="#FFFFFF" />
            <Text style={styles.langText}>PT</Text>
          </View>

          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(ROUTES.login)}
            style={styles.topLogin}
            testID="welcome-go-login"
            hitSlop={12}
          >
            <Text style={styles.topLoginText}>Entrar</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.logoTile}>
            <Ionicons name="barbell" size={44} color="#C8F751" />
          </View>
          <Text style={styles.brand}>IronFit</Text>
          <Text style={styles.tagline}>
            Treine com inteligência. Evolua com dados.
          </Text>
        </View>

        <View style={styles.features} testID="welcome-features">
          {FEATURES.map((feature) => (
            <View key={feature.label} style={styles.feature} testID="welcome-feature">
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={22} color="#4F6B00" />
              </View>
              <Text style={styles.featureLabel}>{feature.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Button
            label="Continuar"
            onPress={() => router.push(ROUTES.funcao)}
            size="lg"
            fullWidth
            style={styles.cta}
            testID="welcome-cta"
          />

          <View style={styles.signinRow}>
            <Text style={styles.signinHint}>Já tem uma conta?</Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push(ROUTES.login)}
              testID="welcome-go-login-bottom"
              hitSlop={12}
            >
              <Text style={styles.signinLink}>Entrar</Text>
            </Pressable>
          </View>

          <Text style={styles.legal}>
            Ao continuar, você concorda com nossos{' '}
            {TERMS_OF_USE_URL ? (
              <Text
                style={styles.legalLink}
                accessibilityRole="link"
                onPress={() => openLegalLink(TERMS_OF_USE_URL)}
              >
                Termos
              </Text>
            ) : (
              <Text style={styles.legalPlain}>Termos</Text>
            )}
            {' & '}
            {PRIVACY_POLICY_URL ? (
              <Text
                style={styles.legalLink}
                accessibilityRole="link"
                onPress={() => openLegalLink(PRIVACY_POLICY_URL)}
              >
                Política de Privacidade
              </Text>
            ) : (
              <Text style={styles.legalPlain}>Política de Privacidade</Text>
            )}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#0B0E10',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  langBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  langText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  topLogin: {
    minHeight: 36,
    justifyContent: 'center',
  },
  topLoginText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  hero: {
    alignItems: 'center',
    marginTop: 34,
  },
  logoTile: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    elevation: 10,
    height: 84,
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#0A0E10',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    width: 84,
  },
  brand: {
    ...typography.display,
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
  },
  tagline: {
    ...typography.bodyStrong,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 8,
    textAlign: 'center',
  },
  features: {
    gap: 10,
    marginTop: 20,
  },
  feature: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    elevation: 6,
    flexDirection: 'row',
    gap: 14,
    minHeight: 76,
    padding: 14,
    paddingHorizontal: 16,
    shadowColor: '#0A0E10',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  featureIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(200, 247, 81, 0.3)',
    borderRadius: radii.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  featureLabel: {
    color: '#14181B',
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  footer: {
    marginTop: 'auto',
  },
  cta: {
    borderRadius: 999,
    elevation: 8,
    shadowColor: '#0A0E10',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 26,
  },
  signinRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  signinHint: {
    color: 'rgba(255, 255, 255, 0.66)',
    fontSize: 14,
  },
  signinLink: {
    color: '#C8F751',
    fontSize: 14,
    fontWeight: '600',
  },
  legal: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },
  legalLink: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 17,
    textDecorationLine: 'underline',
  },
  legalPlain: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 12,
    lineHeight: 17,
  },
});
