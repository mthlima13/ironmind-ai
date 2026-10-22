import { useEffect, type ReactNode } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';

import { selectHasActiveSession, useSessionStore } from '../features/workouts/session.store';
import { EXIT_DIALOG, resolveBackDecision } from './backActions';

/**
 * Handles the Android system back gesture (SPEC 15.5).
 *
 * - stacked screens go back normally;
 * - the first screen asks for confirmation before closing the app;
 * - a workout session in progress is never discarded without confirmation.
 */
export function BackHandlerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasActiveSession = useSessionStore(selectHasActiveSession);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        const decision = resolveBackDecision({
          canGoBack: router.canGoBack(),
          hasActiveSession,
        });

        if (decision.type === 'navigate-back') {
          router.back();
          return true;
        }

        Alert.alert(
          decision.hasActiveSession
            ? EXIT_DIALOG.sessionTitle
            : EXIT_DIALOG.title,
          decision.hasActiveSession
            ? EXIT_DIALOG.sessionMessage
            : EXIT_DIALOG.message,
          [
            { text: EXIT_DIALOG.cancelLabel, style: 'cancel' },
            {
              text: EXIT_DIALOG.confirmLabel,
              style: 'destructive',
              onPress: () => BackHandler.exitApp(),
            },
          ],
          { cancelable: true }
        );
        return true;
      }
    );

    return () => subscription.remove();
  }, [router, hasActiveSession]);

  return <>{children}</>;
}
