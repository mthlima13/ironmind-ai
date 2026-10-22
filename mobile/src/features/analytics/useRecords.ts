import { useQuery } from '@tanstack/react-query';

import { fetchRecords } from './analytics.service';
import { analyticsQueryKeys } from './queryKeys';

/** Personal records of the user (SPEC RF-014). */
export function useRecords(page = 0, size = 20) {
  return useQuery({
    queryKey: analyticsQueryKeys.records(page, size),
    queryFn: () => fetchRecords(page, size),
    staleTime: 60_000,
  });
}
