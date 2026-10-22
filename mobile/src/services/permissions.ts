import type { NotificationPermissionsStatus } from 'expo-notifications';

/**
 * Runtime permission handling for Android (SPEC 9.1 and 15.5).
 *
 * From Android 13 (API 33) the notification permission must be requested at
 * runtime. Every call degrades gracefully when the module is not available,
 * for example inside Expo Go or on a build without the notification plugin.
 */
export type PermissionOutcome = 'granted' | 'denied' | 'undetermined' | 'unavailable';

type NotificationsModule = typeof import('expo-notifications');

async function loadNotifications(): Promise<NotificationsModule | null> {
  try {
    const module = await import('expo-notifications');
    return module;
  } catch {
    return null;
  }
}

function toOutcome(status: NotificationPermissionsStatus): PermissionOutcome {
  if (status.granted) {
    return 'granted';
  }
  if (status.canAskAgain) {
    return 'undetermined';
  }
  return 'denied';
}

/** Reads the current notification permission without prompting the user. */
export async function getNotificationPermission(): Promise<PermissionOutcome> {
  const notifications = await loadNotifications();
  if (!notifications) {
    return 'unavailable';
  }
  try {
    const status = await notifications.getPermissionsAsync();
    return toOutcome(status);
  } catch {
    return 'unavailable';
  }
}

/**
 * Requests the notification permission at the moment it is needed.
 *
 * The user can deny it: the app keeps working and only loses the reminders.
 */
export async function requestNotificationPermission(): Promise<PermissionOutcome> {
  const notifications = await loadNotifications();
  if (!notifications) {
    return 'unavailable';
  }
  try {
    const current = await notifications.getPermissionsAsync();
    if (current.granted) {
      return 'granted';
    }
    const requested = await notifications.requestPermissionsAsync();
    return toOutcome(requested);
  } catch {
    return 'unavailable';
  }
}

/** Short human readable description of the permission state. */
export function describeNotificationPermission(outcome: PermissionOutcome): string {
  switch (outcome) {
    case 'granted':
      return 'Notificações ativadas.';
    case 'denied':
      return 'Notificações bloqueadas. Você pode ativar nas configurações do sistema.';
    case 'undetermined':
      return 'Notificações ainda não foram autorizadas.';
    default:
      return 'Notificações indisponíveis nesta build.';
  }
}
