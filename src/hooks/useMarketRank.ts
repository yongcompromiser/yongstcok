'use client';

import { useQuery } from '@tanstack/react-query';
import { StockRankItem, ShortSellingItem } from '@/types/stock';

interface RankResponse<T> {
  data: T[];
  date: string;
}

export function useVolumeRanking() {
  return useQuery<RankResponse<StockRankItem>>({
    queryKey: ['fsc', 'volume'],
    queryFn: async () => {
      const res = await fetch('/api/fsc?type=volume');
      if (!res.ok) throw new Error('거래량 데이터 조회 실패');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useTradingValueRanking() {
  return useQuery<RankResponse<StockRankItem>>({
    queryKey: ['fsc', 'trading_value'],
    queryFn: async () => {
      const res = await fetch('/api/fsc?type=trading_value');
      if (!res.ok) throw new Error('거래대금 데이터 조회 실패');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useShortSelling() {
  return useQuery<RankResponse<ShortSellingItem>>({
    queryKey: ['fsc', 'short_selling'],
    queryFn: async () => {
      const res = await fetch('/api/fsc?type=short_selling');
      if (!res.ok) throw new Error('공매도 데이터 조회 실패');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });
}
