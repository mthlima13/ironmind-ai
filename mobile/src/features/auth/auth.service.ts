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
