'use client';

import { useQuery } from '@tanstack/react-query';
import type { CategoryData, EconomyCategory } from '@/lib/api/economy';

export function useEconomyCategory(category: EconomyCategory) {
  return useQuery<CategoryData>({
    queryKey: ['economy', category],
    queryFn: async () => {
      const res = await fetch(`/api/economy?category=${category}`);
      if (!res.ok) throw new Error('경제지표 데이터 조회 실패');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
