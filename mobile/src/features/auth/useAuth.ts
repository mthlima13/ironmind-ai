import { useCallback } from 'react';

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

  const execute = useCallback(async () => {
    clearError();
    await logout();
  }, [logout, clearError]);

  return { logout: execute, isSubmitting };
}
