'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Stock, StockPrice, CandleData, CompanyDetail } from '@/types/stock';

// 전체 종목 리스트 (KRX API → fallback: stockList.ts)
export function useStockList() {
  return useQuery<{ symbol: string; name: string; market: string }[]>({
    queryKey: ['stockList'],
    queryFn: async () => {
      const res = await fetch('/api/stock/list');
      if (!res.ok) return [];
      const data = await res.json();
      return data.stocks || [];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24시간
  });
}

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

// 종목 검색 (캐시된 리스트 즉시 + 서버 API 병합)
export function useStockSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [apiResults, setApiResults] = useState<(Stock & { market: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: stockList } = useStockList();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  // 캐시된 종목 리스트에서 즉시 검색
  const localResults = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 1 || !stockList) return [];
    const q = debouncedQuery.toLowerCase().trim();
    return stockList
      .filter((s) => s.name.toLowerCase().includes(q) || s.symbol.includes(q))
      .slice(0, 15);
  }, [debouncedQuery, stockList]);

  // 네이버 API 검색 (비동기)
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 1) {
      setApiResults([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/stock?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => (res.ok ? res.json() : { results: [] }))
      .then((data) => {
        if (cancelled) return;
        const results = (data.results || []).map((item: any) => ({
          symbol: item.symbol || '',
          name: item.name || '',
          market: item.market || 'KR',
        }));
        setApiResults(results);
      })
      .catch(() => {
        if (!cancelled) setApiResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // 로컬 + API 결과 병합 (중복 제거)
  const merged = useMemo(() => {
    const seen = new Set<string>();
    const combined: (Stock & { market: string })[] = [];

    for (const item of localResults) {
      if (!seen.has(item.symbol)) {
        seen.add(item.symbol);
        combined.push(item as Stock & { market: string });
      }
    }
    for (const item of apiResults) {
      if (!seen.has(item.symbol) && item.symbol) {
        seen.add(item.symbol);
        combined.push(item as Stock & { market: string });
      }
    }
    return combined.slice(0, 15);
  }, [localResults, apiResults]);

  return {
    data: merged,
    isLoading: isLoading && localResults.length === 0,
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

// 상승/하락 TOP 무한 스크롤
export function useTopStocksInfinite(type: 'rise' | 'fall') {
  return useInfiniteQuery({
    queryKey: ['topStocks', type],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const res = await fetch(`/api/stock/market?type=${type}&page=${pageParam}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<{
        stocks: { symbol: string; name: string; price: number; change: number; changePercent: number }[];
        page: number;
        hasMore: boolean;
      }>;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    refetchInterval: 60000,
  });
}
