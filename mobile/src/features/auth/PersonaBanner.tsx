import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, useThemedStyles, radii, spacing, type ThemeColors } from '../../theme';

type PersonaBannerProps = {
  /** Optional small label above the chosen persona. */
  label?: string;
  text: string;
};

/**
 * Small notification banner that echoes the persona picked on the role
 * screen (SPEC 15.3). The checkmark conveys "choice confirmed" beyond color.
 */
export function PersonaBanner({ label, text }: PersonaBannerProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.banner} testID="persona-banner">
      <Ionicons name="checkmark" size={20} color={colors.accent} />
      <View style={styles.info}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm + 4,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  text: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
