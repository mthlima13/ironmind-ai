/** Query keys shared by the analytics hooks. */
export const analyticsQueryKeys = {
  overview: ['analytics', 'overview'] as const,
  exercise: (exerciseId: string) => ['analytics', 'exercise', exerciseId] as const,
  records: (page: number, size: number) =>
    ['analytics', 'records', page, size] as const,
};
