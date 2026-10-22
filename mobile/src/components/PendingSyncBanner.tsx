import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography } from '../theme';
import { Button } from './Button';

export type PendingSyncBannerProps = {
  /** Number of operations waiting to be sent to the backend. */
  pendingCount: number;
  /** True when the device has no connectivity. */
  isOffline?: boolean;
  onSync?: () => void;
  testID?: string;
};

/**
 * Offline / pending synchronization state required by SPEC 15.4.
 *
 * The information is never conveyed by color alone: an icon and an explicit
 * label are always present (SPEC 15.2).
 */
export function PendingSyncBanner({
  pendingCount,
  isOffline = false,
  onSync,
  testID,
}: PendingSyncBannerProps) {
  const isOfflineState = isOffline || pendingCount > 0;
  if (!isOfflineState) {
    return null;
  }

  const message = isOffline
    ? 'Sem conexão. As alterações serão sincronizadas quando a internet voltar.'
    : `${pendingCount} ${pendingCount === 1 ? 'alteração pendente' : 'alterações pendentes'} de sincronização.`;

  return (
    <View
      style={[styles.container, isOffline ? styles.offline : styles.pending]}
      accessibilityRole="alert"
      testID={testID ?? 'pending-sync-banner'}
    >
      <Ionicons
        name={isOffline ? 'cloud-offline-outline' : 'sync-outline'}
        size={18}
        color={isOffline ? colors.warning : colors.info}
      />
      <Text style={styles.message}>{message}</Text>
      {onSync && !isOffline ? (
        <Button
          label="Sincronizar"
          onPress={onSync}
          variant="ghost"
          size="md"
          testID="pending-sync-banner-action"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pending: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.info,
  },
  offline: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  message: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
  },
});
