import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles, spacing, typography, type ThemeColors } from '../theme';

export type LoadingStateProps = {
  /** Short description of what is being loaded. */
  label?: string;
  testID?: string;
};

export function LoadingState({ label = 'Carregando…', testID }: LoadingStateProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container} accessibilityRole="progressbar" testID={testID}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
