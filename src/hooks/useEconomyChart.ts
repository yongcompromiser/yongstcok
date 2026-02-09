'use client';

import { useQuery, useQueries } from '@tanstack/react-query';
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

// ── 멀티 시리즈 훅 ──

export interface ChartItem {
  key: string;
  label: string;
  source: 'fred' | 'yahoo' | 'ecos' | 'fng';
  params: Record<string, string>;
  unit?: string;
  color?: string;
}

export interface SeriesData {
  key: string;
  label: string;
  color: string;
  data: TimeSeriesPoint[];
  unit: string;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#16a34a', '#eab308', '#a855f7',
  '#ec4899', '#f97316', '#06b6d4', '#84cc16', '#6366f1',
];

export function useMultiEconomyChart(items: ChartItem[], period: string) {
  const queries = useQueries({
    queries: items.map((item, idx) => ({
      queryKey: ['economyChart', item.key, period] as const,
      queryFn: async (): Promise<SeriesData> => {
        try {
          const url = new URLSearchParams({
            source: item.source,
            ...item.params,
            period,
          }).toString();

          const res = await fetch(`/api/economy/chart?${url}`);
          const json: ChartResponse = res.ok ? await res.json() : { data: [] };

          return {
            key: item.key,
            label: item.label,
            color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
            data: json.data || [],
            unit: item.unit || '',
          };
        } catch {
          return {
            key: item.key,
            label: item.label,
            color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
            data: [],
            unit: item.unit || '',
          };
        }
      },
      staleTime: 30 * 60 * 1000,
      retry: 2,
    })),
  });

  const series = queries
    .map((q) => q.data)
    .filter((d): d is SeriesData => !!d && d.data.length > 0);

  const isLoading = queries.some((q) => q.isLoading);

  return { series, isLoading };
}
