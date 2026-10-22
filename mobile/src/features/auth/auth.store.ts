import { create } from 'zustand';

import { api, mapApiError } from '../../services/api';
import { ENDPOINTS, IDEMPOTENCY_HEADER } from '../../services/endpoints';
import { onSessionExpired } from '../../services/sessionEvents';
import { clearOfflineQueue } from '../../storage/offlineQueue';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from '../../storage/secureToken';
import { createIdempotencyKey } from '../../utils/id';
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
  /** Ends the session when the API refuses the stored credentials. */
  expireSession: () => void;
  clearError: () => void;
};

async function persistSession(response: AuthResponse): Promise<void> {
  await saveAccessToken(response.accessToken);
  await saveRefreshToken(response.refreshToken);
}

/**
 * Idempotency key of the registration in progress (SPEC A.3).
 *
 * The key is kept when the request fails for a reason that leaves the
 * outcome unknown (network failure or server error), so the retry sends the
 * same key and the backend never creates two accounts.
 */
type PendingRegistration = {
  key: string;
  email: string;
};

let pendingRegistration: PendingRegistration | null = null;

function shouldReuseIdempotencyKey(error: ApiError): boolean {
  if (error.isNetworkError) {
    return true;
  }
  return error.status !== undefined && error.status >= 500;
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

    const normalizedEmail = email.trim().toLowerCase();
    const idempotencyKey =
      pendingRegistration && pendingRegistration.email === normalizedEmail
        ? pendingRegistration.key
        : createIdempotencyKey();
    pendingRegistration = { key: idempotencyKey, email: normalizedEmail };

    try {
      const response = await api.post<AuthResponse>(
        ENDPOINTS.auth.register,
        {
          name: name.trim(),
          email: normalizedEmail,
          password,
        },
        { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } }
      );
      pendingRegistration = null;
      await persistSession(response.data);
      set({
        status: 'authenticated',
        user: response.data.user,
        error: null,
        isSubmitting: false,
      });
      return true;
    } catch (error) {
      const apiError = mapApiError(error);
      if (!shouldReuseIdempotencyKey(apiError)) {
        pendingRegistration = null;
      }
      set({ error: apiError, isSubmitting: false });
      return false;
    }
  },

  logout: async () => {
    set({ isSubmitting: true });
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        // Revokes the token family on the server (SPEC 7.7 - logout).
        await api.post(
          ENDPOINTS.auth.logout,
          { refreshToken },
          { skipAuthRefresh: true }
        );
      }
    } catch {
      // Ending the session on the device never depends on the network.
    } finally {
      await clearTokens();
      await clearOfflineQueue();
      pendingRegistration = null;
      set({
        status: 'unauthenticated',
        user: null,
        error: null,
        isSubmitting: false,
      });
    }
  },

  expireSession: () => {
    pendingRegistration = null;
    set({
      status: 'unauthenticated',
      user: null,
      error: null,
      isSubmitting: false,
    });
  },

  clearError: () => {
    if (get().error) {
      set({ error: null });
    }
  },
}));

/**
 * The HTTP client renews the session by itself and, when the refresh token
 * is refused, tells the app that the session is over. The store then returns
 * to the login screen without blocking the screen.
 */
onSessionExpired(() => {
  useAuthStore.getState().expireSession();
});

export function selectIsAuthenticated(state: AuthState): boolean {
  return state.status === 'authenticated';
}
