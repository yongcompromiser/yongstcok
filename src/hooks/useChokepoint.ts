'use client';

import { useQuery } from '@tanstack/react-query';
import type { ChokepointPoint } from '@/lib/api/chokepoint';
import type { LiveSnapshot } from '@/lib/api/aisStream';

interface ChokepointResponse {
  data: ChokepointPoint[];
}

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

// 자체 집계 일별 데이터 (Supabase 누적)
export interface SelfDailyPoint {
  date: string;
  n_total: number;
  n_tanker: number;
  n_cargo: number;
  n_passenger: number;
  n_fishing: number;
  n_other: number;
}

export interface SelfMeta {
  configured: boolean;
  lastRunAt?: string | null;
  lastFound?: number | null;
  runsToday?: number;
}

export function useHormuzSelf(period: string) {
  return useQuery<{ data: SelfDailyPoint[]; meta: SelfMeta }>({
    queryKey: ['chokepoint', 'hormuz', 'self', period],
    queryFn: async () => {
      const res = await fetch(`/api/chokepoint/self?period=${period}`);
      if (!res.ok) return { data: [], meta: { configured: false } };
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
}

// 실시간 AIS 스냅샷 (AISStream) — 30초마다 자동 갱신
export function useHormuzLive() {
  return useQuery<LiveSnapshot>({
    queryKey: ['chokepoint', 'hormuz', 'live'],
    queryFn: async () => {
      const res = await fetch('/api/chokepoint/live');
      if (!res.ok) throw new Error('live fetch failed');
      return res.json() as Promise<LiveSnapshot>;
    },
    refetchInterval: 30 * 1000, // 30초
    staleTime: 25 * 1000,
  });
}
