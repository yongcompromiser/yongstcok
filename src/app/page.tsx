'use client';

import { useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Star,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketData, useTopStocksInfinite } from '@/hooks/useStock';

function StockCard({
  symbol,
  name,
  price,
  changePercent,
}: {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}) {
  const isPositive = changePercent > 0;
  return (
    <Link href={`/company/${symbol}`}>
      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">{symbol}</p>
        </div>
        <div className="text-right">
          <p className="font-medium">{price.toLocaleString()}원</p>
          <p
            className={`text-sm flex items-center justify-end ${
              isPositive ? 'text-red-500' : 'text-blue-500'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {isPositive ? '+' : ''}
            {changePercent.toFixed(2)}%
          </p>
        </div>
      </div>
    </Link>
  );
}

function IndexDisplay({
  label,
  value,
  change,
  changePercent,
}: {
  label: string;
  value: number;
  change: number;
  changePercent: number;
}) {
  const isPositive = change > 0;
  const isZero = change === 0;
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p
        className={`text-sm ${
          isZero
            ? 'text-muted-foreground'
            : isPositive
            ? 'text-red-500'
            : 'text-blue-500'
        }`}
      >
        {isPositive ? '+' : ''}
        {change.toLocaleString()} ({isPositive ? '+' : ''}
        {changePercent.toFixed(2)}%)
      </p>
    </div>
  );
}

function TopStocksSection({
  type,
  icon,
  title,
}: {
  type: 'rise' | 'fall';
  icon: React.ReactNode;
  title: string;
}) {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTopStocksInfinite(type);

  const observerRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const allStocks = data?.pages.flatMap((page) => page.stocks) ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[480px] overflow-y-auto px-6 pb-4 space-y-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))
          ) : allStocks.length > 0 ? (
            <>
              {allStocks.map((stock, idx) => (
                <StockCard
                  key={`${stock.symbol}-${idx}`}
                  symbol={stock.symbol}
                  name={stock.name}
                  price={stock.price}
                  changePercent={stock.changePercent}
                />
              ))}
              {isFetchingNextPage && (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              <div ref={observerRef} className="h-1" />
            </>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">데이터 없음</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { data: marketData, isLoading } = useMarketData();

  return (
    <div className="p-6 space-y-6">
      {/* 환영 섹션 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          주뇽좌의 주식생활
        </h1>
        <p className="text-muted-foreground">
          한국 주식 시장을 한눈에 분석하세요
        </p>
      </div>

      {/* 퀵 액션 */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/screener">
            <Search className="h-4 w-4 mr-2" />
            스크리너
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/watchlist">
            <Star className="h-4 w-4 mr-2" />
            관심기업
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/compare">
            <BarChart3 className="h-4 w-4 mr-2" />
            기업비교
          </Link>
        </Button>
      </div>

      {/* 시장 지수 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            시장 지수
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : marketData?.index ? (
            <div className="grid gap-4 md:grid-cols-2">
              <IndexDisplay
                label="코스피"
                value={marketData.index.kospi.value}
                change={marketData.index.kospi.change}
                changePercent={marketData.index.kospi.changePercent}
              />
              <IndexDisplay
                label="코스닥"
                value={marketData.index.kosdaq.value}
                change={marketData.index.kosdaq.change}
                changePercent={marketData.index.kosdaq.changePercent}
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">데이터를 불러올 수 없습니다</p>
          )}
        </CardContent>
      </Card>

      {/* 상승/하락 TOP (무한 스크롤) */}
      <div className="grid gap-4 md:grid-cols-2">
        <TopStocksSection
          type="rise"
          icon={<TrendingUp className="h-4 w-4 text-red-500" />}
          title="상승 TOP"
        />
        <TopStocksSection
          type="fall"
          icon={<TrendingDown className="h-4 w-4 text-blue-500" />}
          title="하락 TOP"
        />
      </div>
    </div>
  );
}
