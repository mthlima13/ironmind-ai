import { useQuery } from '@tanstack/react-query';

import { fetchDashboardOverview } from './analytics.service';
import { analyticsQueryKeys } from './queryKeys';

/** Summary cards of the dashboard (SPEC RF-015). */
export function useDashboardOverview() {
  return useQuery({
    queryKey: analyticsQueryKeys.overview,
    queryFn: fetchDashboardOverview,
    staleTime: 60_000,
  });
}
