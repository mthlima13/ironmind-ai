import { api } from '../../services/api';
import { ENDPOINTS } from '../../services/endpoints';
import type { InjuryRestriction } from '../../types/user';

/** Restrictions of the user (SPEC RF-016). */
export async function fetchRestrictions(): Promise<InjuryRestriction[]> {
  const response = await api.get<InjuryRestriction[]>(ENDPOINTS.restrictions.get);
  return response.data;
}

/** Replaces the restrictions of the user. */
export async function updateRestrictions(
  restrictions: InjuryRestriction[]
): Promise<InjuryRestriction[]> {
  const response = await api.put<InjuryRestriction[]>(
    ENDPOINTS.restrictions.put,
    { restrictions }
  );
  return response.data;
}
