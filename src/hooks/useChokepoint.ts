'use client';

import { useQuery } from '@tanstack/react-query';
import type { ChokepointPoint } from '@/lib/api/chokepoint';

interface ChokepointResponse {
  data: ChokepointPoint[];
}

// IMF PortWatch 호르무즈 일별 통행량
export function useHormuz(period: string) {
  return useQuery<ChokepointPoint[]>({
    queryKey: ['chokepoint', 'hormuz', period],
    queryFn: async () => {
      const res = await fetch(`/api/chokepoint?period=${period}`);
      if (!res.ok) return [];
      const json: ChokepointResponse = await res.json();
      return json.data || [];
    },
    staleTime: 30 * 60 * 1000, // 30분
  });
}
