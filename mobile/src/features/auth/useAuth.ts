import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from './auth.store';

export function useAuthState() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const error = useAuthStore((state) => state.error);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);

  return { status, user, error, isSubmitting };
}

export function useLogin() {
  const login = useAuthStore((state) => state.login);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);

  const execute = useCallback(
    (email: string, password: string) => login(email, password),
    [login]
  );

  return { login: execute, isSubmitting };
}

export function useRegister() {
  const register = useAuthStore((state) => state.register);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);

  const execute = useCallback(
    (input: { name: string; email: string; password: string }) =>
      register(input),
    [register]
  );

  return { register: execute, isSubmitting };
}

export function useLogout() {
  const logout = useAuthStore((state) => state.logout);
  const clearError = useAuthStore((state) => state.clearError);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const queryClient = useQueryClient();

  const execute = useCallback(async () => {
    clearError();
    await logout();
    // Nothing of the previous account may stay in the cache of the screens.
    queryClient.clear();
  }, [logout, clearError, queryClient]);

  return { logout: execute, isSubmitting };
}

/**
 * Erases the account of the signed user.
 *
 * <p>The session is kept when the server refuses the deletion (wrong password or
 * network failure); on success the store ends the session and the app returns
 * to the login screen. The query cache is cleared so no screen keeps data of
 * the deleted account.
 */
export function useDeleteAccount() {
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const clearError = useAuthStore((state) => state.clearError);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const error = useAuthStore((state) => state.error);
  const queryClient = useQueryClient();

  const execute = useCallback(
    async (password: string) => {
      clearError();
      const deleted = await deleteAccount(password);
      if (deleted) {
        queryClient.clear();
      }
      return deleted;
    },
    [deleteAccount, clearError, queryClient]
  );

  return { deleteAccount: execute, isSubmitting, error, clearError };
}
