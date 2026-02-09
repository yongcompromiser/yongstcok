'use client';

import { useQuery } from '@tanstack/react-query';
import type { TimeSeriesPoint } from '@/lib/api/economyHistory';

interface ChartResponse {
  data: TimeSeriesPoint[];
}

export function useEconomyChart(
  source: string | null,
  params: Record<string, string> = {}
) {
  const paramStr = new URLSearchParams({ source: source || '', ...params }).toString();

  return useQuery<TimeSeriesPoint[]>({
    queryKey: ['economyChart', source, params],
    queryFn: async () => {
      const res = await fetch(`/api/economy/chart?${paramStr}`);
      if (!res.ok) return [];
      const json: ChartResponse = await res.json();
      return json.data || [];
    },
    enabled: !!source,
    staleTime: 30 * 60 * 1000, // 30분
  });
}
