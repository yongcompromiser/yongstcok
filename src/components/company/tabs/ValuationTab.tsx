'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MultiYearFinancials, StockPrice } from '@/types/stock';
import { formatMultiple, formatNumber } from '@/lib/utils';
import { RatioLineChart } from '../FinancialChart';

interface ValuationTabProps {
  financials: MultiYearFinancials | null;
  price: StockPrice | null;
  isLoading: boolean;
}

interface ValuationMetrics {
  label: string;
  per: number;
  pbr: number;
  psr: number;
  eps: number;
  bps: number;
}

export default function ValuationTab({ financials, price, isLoading }: ValuationTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!financials || financials.annual.length === 0 || !price) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-8">
            벨류에이션 데이터가 없습니다
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentPrice = price.price;
  const marketCap = price.marketCap || 0;

  // 최신 연간 데이터 기준으로 밸류에이션 계산
  const latest = financials.annual[financials.annual.length - 1];

  // 간이 계산 (정밀한 주식수 데이터 없으면 시총/주가로 추정)
  const estimatedShares = currentPrice > 0 ? marketCap / currentPrice : 0;

  const currentEPS = estimatedShares > 0 ? latest.netIncome / estimatedShares : 0;
  const currentBPS = estimatedShares > 0 ? latest.equity / estimatedShares : 0;
  const currentPER = currentEPS > 0 ? currentPrice / currentEPS : 0;
  const currentPBR = currentBPS > 0 ? currentPrice / currentBPS : 0;
  const currentPSR = estimatedShares > 0 && latest.revenue > 0
    ? marketCap / latest.revenue
    : 0;

  // 현재 밸류에이션 카드
  const valuationCards = [
    { label: 'PER', value: currentPER > 0 ? formatMultiple(currentPER) + '배' : '-' },
    { label: 'PBR', value: currentPBR > 0 ? formatMultiple(currentPBR) + '배' : '-' },
    { label: 'PSR', value: currentPSR > 0 ? formatMultiple(currentPSR) + '배' : '-' },
    { label: 'EPS', value: currentEPS > 0 ? formatNumber(Math.round(currentEPS)) + '원' : '-' },
    { label: 'BPS', value: currentBPS > 0 ? formatNumber(Math.round(currentBPS)) + '원' : '-' },
  ];

  // 추이 데이터 (연간별 PER/PBR 추이 - 각 연도의 재무로 계산)
  const trendData = financials.annual.map((f) => {
    const eps = estimatedShares > 0 ? f.netIncome / estimatedShares : 0;
    const bps = estimatedShares > 0 ? f.equity / estimatedShares : 0;
    // 과거 PER/PBR은 현재가 기준 (과거 주가 데이터가 없으므로 참고용)
    return {
      label: f.period,
      per: eps > 0 ? currentPrice / eps : 0,
      pbr: bps > 0 ? currentPrice / bps : 0,
    };
  });

  return (
    <div className="space-y-4">
      {/* 현재 밸류에이션 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {valuationCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground">{card.label}</div>
              <div className="text-xl font-bold mt-1">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* PER/PBR 추이 차트 */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">밸류에이션 추이 (현재가 기준)</CardTitle>
          </CardHeader>
          <CardContent>
            <RatioLineChart
              data={trendData.map((d) => ({
                ...d,
                per: d.per,
                pbr: d.pbr * 10, // 스케일 조정
              }))}
              lines={[
                { key: 'per', name: 'PER', color: '#3b82f6' },
                { key: 'pbr', name: 'PBR x10', color: '#ef4444' },
              ]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
