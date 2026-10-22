import { create } from 'zustand';

import { api, mapApiError } from '../../services/api';
import { ENDPOINTS } from '../../services/endpoints';
import { clearOfflineQueue } from '../../storage/offlineQueue';
import {
  clearTokens,
  getAccessToken,
  saveAccessToken,
  saveRefreshToken,
} from '../../storage/secureToken';
import type { ApiError, AuthResponse } from '../../types/api';
import type { AuthUser } from '../../types/user';

export type AuthStatus = 'booting' | 'authenticated' | 'unauthenticated';

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  error: ApiError | null;
  isSubmitting: boolean;
  /** Restores the session saved in the secure store. */
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
};

async function persistSession(response: AuthResponse): Promise<void> {
  await saveAccessToken(response.accessToken);
  await saveRefreshToken(response.refreshToken);
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'booting',
  user: null,
  error: null,
  isSubmitting: false,

  hydrate: async () => {
    const token = await getAccessToken();
    if (!token) {
      set({ status: 'unauthenticated', user: null });
      return;
    }

    try {
      const response = await api.get<{ user: AuthUser }>(ENDPOINTS.users.me);
      set({ status: 'authenticated', user: response.data.user, error: null });
    } catch (error) {
      await clearTokens();
      set({ status: 'unauthenticated', user: null, error: mapApiError(error) });
    }
  },

  login: async (email, password) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await api.post<AuthResponse>(ENDPOINTS.auth.login, {
        email: email.trim(),
        password,
      });
      await persistSession(response.data);
      set({
        status: 'authenticated',
        user: response.data.user,
        error: null,
        isSubmitting: false,
      });
      return true;
    } catch (error) {
      set({ error: mapApiError(error), isSubmitting: false });
      return false;
    }
  },

  register: async ({ name, email, password }) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await api.post<AuthResponse>(ENDPOINTS.auth.register, {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      await persistSession(response.data);
      set({
        status: 'authenticated',
        user: response.data.user,
        error: null,
        isSubmitting: false,
      });
      return true;
    } catch (error) {
      set({ error: mapApiError(error), isSubmitting: false });
      return false;
    }
  },

  logout: async () => {
    await clearTokens();
    await clearOfflineQueue();
    set({ status: 'unauthenticated', user: null, error: null });
  },

  clearError: () => {
    if (get().error) {
      set({ error: null });
    }
  },
}));

export function selectIsAuthenticated(state: AuthState): boolean {
  return state.status === 'authenticated';
}
