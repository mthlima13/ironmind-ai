/**
 * Decision taken when the Android system back gesture fires (SPEC 15.5).
 *
 * Kept free of React and React Navigation so it can be unit tested.
 */
export type BackDecision =
  | { type: 'navigate-back' }
  | { type: 'confirm-exit'; hasActiveSession: boolean };

export function resolveBackDecision(input: {
  /** True when the navigation stack has a screen to go back to. */
  canGoBack: boolean;
  /** True when a workout session is still running. */
  hasActiveSession: boolean;
}): BackDecision {
  if (input.canGoBack) {
    return { type: 'navigate-back' };
  }
  return { type: 'confirm-exit', hasActiveSession: input.hasActiveSession };
}

export const EXIT_DIALOG = {
  title: 'Sair do IronMind AI?',
  message: 'Você está na tela inicial. Toque em Sair para fechar o aplicativo.',
  sessionTitle: 'Sair com a sessão em andamento?',
  sessionMessage:
    'Sua sessão está salva no aparelho e pode ser retomada. Toque em Sair para fechar o aplicativo.',
  cancelLabel: 'Cancelar',
  confirmLabel: 'Sair',
} as const;
