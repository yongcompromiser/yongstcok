'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FearGreedGauge } from '@/components/economy/FearGreedGauge';
import { IndicatorCard } from '@/components/economy/IndicatorCard';
import { useEconomyData } from '@/hooks/useEconomy';

const CURRENCY_LABELS: Record<string, string> = {
  USD: '미국 달러',
  EUR: '유로',
  JPY: '일본 엔 (100엔)',
  CNY: '중국 위안',
};

export default function EconomyPage() {
  const { data, isLoading, refetch, isFetching } = useEconomyData();

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">경제지표 대시보드</h1>
          <p className="text-sm text-muted-foreground">
            금리, 환율, 원자재, 시장 심리를 한눈에
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-1.5 hidden sm:inline">새로고침</span>
        </Button>
      </div>

      {/* 시장 심리 + 환율 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Fear & Greed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">시장 심리</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Skeleton className="h-32 w-48 rounded-full" />
              </div>
            ) : data?.fearGreed ? (
              <FearGreedGauge data={data.fearGreed} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                데이터를 불러올 수 없습니다
              </p>
            )}
          </CardContent>
        </Card>

        {/* 환율 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">환율</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : data?.exchangeRates && data.exchangeRates.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {data.exchangeRates.map((rate) => (
                  <IndicatorCard
                    key={rate.currency}
                    name={CURRENCY_LABELS[rate.currency] || rate.currency}
                    value={rate.rate}
                    change={rate.change}
                    changePercent={rate.changePercent}
                    unit="원"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                데이터를 불러올 수 없습니다
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 미국 주요 지표 (FRED) */}
      {data?.fredIndicators && data.fredIndicators.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">미국 주요 지표</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {data.fredIndicators.map((ind) => (
                <IndicatorCard
                  key={ind.seriesId}
                  name={ind.name}
                  value={ind.value}
                  unit={ind.unit}
                  date={ind.date}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 원자재 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">원자재</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : data?.commodities && data.commodities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {data.commodities.map((c) => (
                <IndicatorCard
                  key={c.name}
                  name={c.name}
                  value={c.price}
                  change={c.change}
                  changePercent={c.changePercent}
                  unit={c.unit}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              데이터를 불러올 수 없습니다
            </p>
          )}
        </CardContent>
      </Card>

      {/* 한국 주요 지표 (ECOS) */}
      {data?.ecosIndicators && data.ecosIndicators.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">한국 주요 지표</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {data.ecosIndicators.map((ind) => (
                <IndicatorCard
                  key={ind.seriesId}
                  name={ind.name}
                  value={ind.value}
                  unit={ind.unit}
                  date={ind.date}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
