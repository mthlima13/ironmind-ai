import { api } from '../../services/api';
import { ENDPOINTS } from '../../services/endpoints';
import type { UserProfile } from '../../types/user';

/** Profile and preferences of the signed user (SPEC RF-002). */
export async function fetchProfile(): Promise<UserProfile> {
  const response = await api.get<UserProfile>(ENDPOINTS.users.me);
  return response.data;
}

/** Updates the profile and the preferences. */
export async function updateProfile(input: {
  name?: string;
  preferences?: Partial<UserProfile['preferences']>;
}): Promise<UserProfile> {
  const response = await api.patch<UserProfile>(ENDPOINTS.users.me, input);
  return response.data;
}

/**
 * Starts the access recovery (SPEC 7.7 - recuperação de acesso).
 *
 * The API always answers the same way, whether the e-mail exists or not, so
 * the screen never reveals if an account is registered.
 */
export async function requestPasswordRecovery(email: string): Promise<void> {
  await api.post(ENDPOINTS.auth.forgotPassword, { email: email.trim() });
}

/**
 * Completes the access recovery with the token of the deep link.
 *
 * The token has a single use and expires in 30 minutes; the API answers
 * `INVALID_RESET_TOKEN` when it is not usable anymore.
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  await api.post(ENDPOINTS.auth.resetPassword, { token, newPassword });
}
