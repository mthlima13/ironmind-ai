import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateProgramInput } from '../../types/program';
import { createIdempotencyKey } from '../../utils/id';
import {
  createProgram,
  fetchProgram,
  fetchPrograms,
  updateProgram,
} from './program.service';

export const programQueryKeys = {
  all: ['programs'] as const,
  list: (page: number, size: number) => ['programs', page, size] as const,
  detail: (id: string) => ['programs', 'detail', id] as const,
};

/** Programs of the user, used by the Treinos tab. */
export function usePrograms(page = 0, size = 20) {
  return useQuery({
    queryKey: programQueryKeys.list(page, size),
    queryFn: () => fetchPrograms(page, size),
    staleTime: 60_000,
  });
}

/** Program with its days and exercises, used by the details screen. */
export function useProgram(id?: string) {
  return useQuery({
    queryKey: programQueryKeys.detail(id ?? ''),
    queryFn: () => fetchProgram(id as string),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateProgramInput; idempotencyKey?: string }) =>
      createProgram(input, idempotencyKey ?? createIdempotencyKey()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: programQueryKeys.all });
    },
  });
}

export function useUpdateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
      idempotencyKey,
    }: {
      id: string;
      input: CreateProgramInput;
      idempotencyKey?: string;
    }) => updateProgram(id, input, idempotencyKey ?? createIdempotencyKey()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: programQueryKeys.all });
    },
  });
}
