'use client';

import { useState, useCallback, useMemo } from 'react';
import { Loader2, RefreshCw, Info, Radio, Ship } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { IndicatorCard } from '@/components/economy/IndicatorCard';
import { HormuzBarChart } from '@/components/economy/HormuzBarChart';
import type { SeriesData } from '@/hooks/useEconomyChart';
import { useHormuz, useHormuzLive } from '@/hooks/useChokepoint';
import type { ChokepointMetric, ChokepointPoint } from '@/lib/api/chokepoint';
import { CATEGORY_LABEL, type VesselCategory } from '@/lib/api/aisStream';
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
          위성 AIS 기반 추정치이며 매주 화요일 갱신됩니다. 최근 며칠은 갱신 지연 또는 해당 지역 GPS 재밍·AIS
          신호 소실로 값이 낮거나 0으로 표시될 수 있습니다.
        </p>
      </div>

      {/* 실시간 현황 (AISStream) */}
      <LiveSection />

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

// ── 실시간 현황 (AISStream) ──

const CATEGORY_ORDER: VesselCategory[] = ['tanker', 'cargo', 'passenger', 'fishing', 'other'];
const CATEGORY_COLOR: Record<VesselCategory, string> = {
  tanker: '#ef4444',
  cargo: '#16a34a',
  passenger: '#3b82f6',
  fishing: '#06b6d4',
  other: '#9ca3af',
};

function formatAsOf(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function LiveSection() {
  const { data, isLoading, isFetching, refetch } = useHormuzLive();

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isFetching && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              )}
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            실시간 통행 현황
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          {data?.configured && (
            <span className="text-xs text-muted-foreground">
              {data.asOf ? `${formatAsOf(data.asOf)} 기준 · ${data.windowSec}초 수집` : ''}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-40" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </div>
        ) : !data?.configured ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">실시간 AIS가 설정되지 않았습니다.</p>
              <p>
                aisstream.io에서 무료 API 키를 발급받아 환경변수{' '}
                <code className="px-1 rounded bg-amber-100 dark:bg-amber-900/40">AISSTREAM_API_KEY</code>
                {' '}에 설정하면 호르무즈 해협의 실시간 선박 현황이 표시됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 총 선박 수 */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">현재 해협 내 선박</p>
                <p className="text-4xl font-bold tabular-nums flex items-baseline gap-1.5">
                  <Ship className="h-6 w-6 text-primary self-center" />
                  {data.total}
                  <span className="text-base font-normal text-muted-foreground">척</span>
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* 유형별 분류 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {CATEGORY_ORDER.map((cat) => (
                <div key={cat} className="rounded-lg border p-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLOR[cat] }}
                    />
                    <span className="text-xs text-muted-foreground">{CATEGORY_LABEL[cat]}</span>
                  </div>
                  <p className="text-xl font-semibold tabular-nums mt-1">{data.byCategory[cat]}</p>
                </div>
              ))}
            </div>

            {/* 선박 목록 */}
            {data.vessels.length > 0 && (
              <div className="rounded-lg border divide-y max-h-64 overflow-y-auto">
                {data.vessels.map((v) => (
                  <div key={v.mmsi} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_COLOR[v.category] }}
                      />
                      <span className="truncate font-medium">{v.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {CATEGORY_LABEL[v.category]}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                      {v.sog.toFixed(1)} kn
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              AISStream 실시간 AIS · 30초마다 자동 갱신. AIS 미장착(소형선·군함)·신호 소실(다크 선박)·GPS
              재밍 선박은 집계되지 않을 수 있습니다.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
