'use client';

import { useQuery } from '@tanstack/react-query';
import { EconomyData } from '@/types/stock';

export function useEconomyData() {
  return useQuery<EconomyData>({
    queryKey: ['economyData'],
    queryFn: async () => {
      const res = await fetch('/api/economy');
      if (!res.ok) throw new Error('경제지표 데이터 조회 실패');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
}
