import { useQuery } from '@tanstack/react-query';

import { fetchPrograms } from './program.service';

export const programQueryKeys = {
  all: ['programs'] as const,
  list: (page: number, size: number) => ['programs', page, size] as const,
};

/** Programs of the user, used by the Treinos tab. */
export function usePrograms(page = 0, size = 20) {
  return useQuery({
    queryKey: programQueryKeys.list(page, size),
    queryFn: () => fetchPrograms(page, size),
    staleTime: 60_000,
  });
}
