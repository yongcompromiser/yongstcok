'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stock, StockPrice, CandleData, CompanyDetail } from '@/types/stock';
import { searchLocalStocks } from '@/lib/stockList';

// 개별 종목 시세 조회
export function useStockPrice(symbol: string | null) {
  return useQuery({
    queryKey: ['stockPrice', symbol],
    queryFn: async (): Promise<{ stock: Stock; price: StockPrice } | null> => {
      if (!symbol) return null;
      const res = await fetch(`/api/stock?symbol=${symbol}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!symbol,
    refetchInterval: 30000, // 30초마다 갱신
  });
}

// 종목 검색 (로컬 데이터 기반 즉시 검색)
export function useStockSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 1) return [];
    const localResults = searchLocalStocks(debouncedQuery);
    return localResults.map((item) => ({
      symbol: item.symbol,
      name: item.name,
      market: item.market as string,
    }));
  }, [debouncedQuery]);

  return {
    data: results as (Stock & { market: string })[],
    isLoading: false,
    isError: false,
  };
}

// 차트 데이터
export function useStockChart(
  symbol: string | null,
  period: 'day' | 'week' | 'month' | 'year' = 'day'
) {
  return useQuery({
    queryKey: ['stockChart', symbol, period],
    queryFn: async (): Promise<CandleData[]> => {
      if (!symbol) return [];
      const res = await fetch(`/api/stock/chart?symbol=${symbol}&period=${period}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.chart || [];
    },
    enabled: !!symbol,
  });
}

// 시장 현황
export function useMarketData() {
  return useQuery({
    queryKey: ['marketData'],
    queryFn: async () => {
      const res = await fetch('/api/stock/market');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60000, // 1분마다 갱신
  });
}

// DART 공시
export function useDisclosures(symbol: string | null) {
  return useQuery({
    queryKey: ['disclosures', symbol],
    queryFn: async () => {
      if (!symbol) return [];
      const res = await fetch(`/api/dart?symbol=${symbol}&type=disclosure`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.disclosures || [];
    },
    enabled: !!symbol,
  });
}

// DART 재무제표
export function useFinancials(symbol: string | null, year?: string) {
  return useQuery({
    queryKey: ['financials', symbol, year],
    queryFn: async () => {
      if (!symbol) return null;
      const y = year || new Date().getFullYear().toString();
      const res = await fetch(`/api/dart?symbol=${symbol}&type=financial&year=${y}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.financial || null;
    },
    enabled: !!symbol,
  });
}

// 기업 상세 통합 데이터 (기업정보 + 다년재무 + 주주 + 배당)
export function useCompanyDetail(symbol: string | null) {
  return useQuery<CompanyDetail | null>({
    queryKey: ['companyDetail', symbol],
    queryFn: async () => {
      if (!symbol) return null;
      const res = await fetch(`/api/dart/company?symbol=${symbol}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5분
  });
}
