import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';
import { Button } from './Button';

export type EmptyStateProps = {
  title: string;
  description?: string;
  /** Label of the first use action, e.g. "Criar programa". */
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  testID?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  testID,
}: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          style={styles.action}
          testID="empty-state-action"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.heading,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.sm,
    minWidth: 200,
  },
});
