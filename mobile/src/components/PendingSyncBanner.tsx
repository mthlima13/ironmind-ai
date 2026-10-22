import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography } from '../theme';
import { Button } from './Button';

export type PendingSyncBannerProps = {
  /** Number of operations waiting to be sent to the backend. */
  pendingCount: number;
  /** Number of operations permanently rejected by the backend. */
  failedCount?: number;
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
  failedCount = 0,
  isOffline = false,
  onSync,
  testID,
}: PendingSyncBannerProps) {
  const hasFailed = failedCount > 0;
  const isOfflineState = isOffline || pendingCount > 0 || hasFailed;
  if (!isOfflineState) {
    return null;
  }

  const message = isOffline
    ? 'Sem conexão. As alterações serão sincronizadas quando a internet voltar.'
    : pendingCount > 0
      ? `${pendingCount} ${pendingCount === 1 ? 'alteração pendente' : 'alterações pendentes'} de sincronização.`
      : `${failedCount} ${failedCount === 1 ? 'alteração não pôde' : 'alterações não puderam'} ser sincronizada${failedCount === 1 ? '' : 's'}.`;

  const tone = isOffline
    ? styles.offline
    : hasFailed && pendingCount === 0
      ? styles.failed
      : styles.pending;
  const icon = isOffline
    ? 'cloud-offline-outline'
    : hasFailed && pendingCount === 0
      ? 'alert-circle-outline'
      : 'sync-outline';
  const iconColor = isOffline
    ? colors.warning
    : hasFailed && pendingCount === 0
      ? colors.danger
      : colors.info;

  return (
    <View
      style={[styles.container, tone]}
      accessibilityRole="alert"
      testID={testID ?? 'pending-sync-banner'}
    >
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={styles.message}>{message}</Text>
      {onSync && !isOffline && pendingCount > 0 ? (
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
  failed: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  message: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
  },
});
