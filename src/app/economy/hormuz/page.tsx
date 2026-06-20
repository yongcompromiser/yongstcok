'use client';

import { useState, useCallback, useMemo } from 'react';
import { Loader2, RefreshCw, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { IndicatorCard } from '@/components/economy/IndicatorCard';
import { HormuzBarChart } from '@/components/economy/HormuzBarChart';
import type { SeriesData } from '@/hooks/useEconomyChart';
import { useHormuz } from '@/hooks/useChokepoint';
import type { ChokepointMetric, ChokepointPoint } from '@/lib/api/chokepoint';
import type { Period } from '@/lib/api/economyHistory';
import { cn } from '@/lib/utils';

// ── 지표 정의 ──

interface MetricDef {
  key: ChokepointMetric;
  label: string;
  unit: string;
  color: string;
}

const METRICS: MetricDef[] = [
  { key: 'n_total', label: '총 선박', unit: '척', color: '#3b82f6' },
  { key: 'n_tanker', label: '유조선', unit: '척', color: '#ef4444' },
  { key: 'n_cargo', label: '화물선', unit: '척', color: '#16a34a' },
  { key: 'n_container', label: '컨테이너선', unit: '척', color: '#eab308' },
  { key: 'n_dry_bulk', label: '벌크선', unit: '척', color: '#a855f7' },
  { key: 'n_general_cargo', label: '일반화물', unit: '척', color: '#ec4899' },
  { key: 'n_roro', label: 'RoRo', unit: '척', color: '#06b6d4' },
  { key: 'capacity', label: '총 운송능력', unit: 'DWT', color: '#f97316' },
  { key: 'capacity_tanker', label: '유조선 능력', unit: 'DWT', color: '#84cc16' },
];

// 현재값 카드에 표시할 지표
const CARD_METRICS: ChokepointMetric[] = [
  'n_total', 'n_tanker', 'n_cargo', 'n_container', 'n_dry_bulk', 'capacity',
];

const PERIODS: Period[] = ['1M', '3M', '6M', '1Y', '3Y', '5Y'];
const MAX_SELECTED = 5;

// ── 페이지 ──

export default function HormuzPage() {
  const [period, setPeriod] = useState<Period>('3M');
  const [selectedKeys, setSelectedKeys] = useState<ChokepointMetric[]>(['n_total']);

  const { data, isLoading, refetch, isFetching } = useHormuz(period);

  const toggleKey = useCallback((key: ChokepointMetric) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev; // 최소 1개
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= MAX_SELECTED) return prev; // 최대 5개
      return [...prev, key];
    });
  }, []);

  // 선택 지표 → 막대그래프용 SeriesData[]
  const series: SeriesData[] = useMemo(() => {
    if (!data) return [];
    return METRICS.filter((m) => selectedKeys.includes(m.key)).map((m) => ({
      key: m.key,
      label: m.label,
      color: m.color,
      unit: m.unit,
      data: data.map((p) => ({ date: p.date, value: p[m.key] })),
    }));
  }, [data, selectedKeys]);

  // 최신 레코드 (현재값 카드용)
  const latest: ChokepointPoint | undefined = data && data.length > 0 ? data[data.length - 1] : undefined;

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">호르무즈 해협 통행량</h1>
        <p className="text-sm text-muted-foreground">
          IMF PortWatch · 호르무즈 해협(Strait of Hormuz) 일별 선박 통과량 및 운송능력
        </p>
      </div>

      {/* 데이터 안내 */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          위성 AIS 기반 추정치입니다. 집계·검증에 시간이 걸려 <strong>최신 데이터가 보통 며칠~최대 1주
          지연</strong>됩니다(현재 표시되는 마지막 날짜 기준). 또 최근 호르무즈 일대의 GPS 재밍·AIS 신호
          소실(다크 선박)로 값이 실제보다 낮거나 0으로 나올 수 있습니다.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">통행량 추이 (IMF PortWatch)</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-1.5 hidden sm:inline">새로고침</span>
        </Button>
      </div>

      {/* 차트 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">
              {series.length === 1 ? `${series[0].label} 추이` : '통행량 비교'}
            </CardTitle>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                    period === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 지표 칩 선택 */}
          <div className="flex gap-1.5 flex-wrap">
            {METRICS.map((m) => {
              const isSelected = selectedKeys.includes(m.key);
              return (
                <button
                  key={m.key}
                  onClick={() => toggleKey(m.key)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap border transition-colors inline-flex items-center gap-1.5',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                  )}
                >
                  {isSelected && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: m.color }}
                    />
                  )}
                  {m.label}
                </button>
              );
            })}
          </div>

          <HormuzBarChart series={series} isLoading={isLoading} height={400} />
        </CardContent>
      </Card>

      {/* 최신 통행량 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            최신 통행량{latest ? ` · ${latest.date}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : latest ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {CARD_METRICS.map((key) => {
                const m = METRICS.find((x) => x.key === key)!;
                return (
                  <IndicatorCard
                    key={key}
                    name={m.label}
                    value={latest[key]}
                    unit={m.unit}
                    date={latest.date}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              데이터를 불러올 수 없습니다
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
