import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

export type LoadingStateProps = {
  /** Short description of what is being loaded. */
  label?: string;
  testID?: string;
};

export function LoadingState({ label = 'Carregando…', testID }: LoadingStateProps) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" testID={testID}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
