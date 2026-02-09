'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { SeriesData } from '@/hooks/useEconomyChart';

interface TimeSeriesPoint {
  date: string;
  value: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  isLoading?: boolean;
  height?: number;
  unit?: string;
  color?: string;
}

// 날짜 포맷
const formatDate = (dateStr: string) => {
  if (dateStr.includes('Q')) return dateStr;
  if (dateStr.length === 6) {
    return `${dateStr.slice(2, 4)}.${dateStr.slice(4, 6)}`;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[1]}.${parts[2]}`;
  return dateStr;
};

const formatValue = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export function TimeSeriesChart({
  data,
  isLoading,
  height = 350,
  unit = '',
  color = '#3b82f6',
}: TimeSeriesChartProps) {
  if (isLoading) {
    return <Skeleton className="w-full" style={{ height }} />;
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground border rounded-lg"
        style={{ height }}
      >
        차트 데이터가 없습니다
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          tickLine={false}
          axisLine={false}
          minTickGap={40}
        />
        <YAxis
          tickFormatter={formatValue}
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          tickLine={false}
          axisLine={false}
          width={60}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '13px',
          }}
          labelFormatter={(label) => `${label}`}
          formatter={(value: number | undefined) => [
            `${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit ? ' ' + unit : ''}`,
            '',
          ]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${color.replace('#', '')})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── 멀티 시리즈 차트 ──

interface MultiSeriesChartProps {
  series: SeriesData[];
  isLoading?: boolean;
  height?: number;
  percentMode?: boolean;
}

function mergeSeriesData(series: SeriesData[], percentMode: boolean, indexMode: boolean) {
  const dateMap = new Map<string, Record<string, number>>();

  for (const s of series) {
    const firstVal = s.data.length > 0 ? s.data[0].value : 1;
    for (const pt of s.data) {
      const row = dateMap.get(pt.date) || {};
      if (percentMode && firstVal !== 0) {
        row[s.key] = ((pt.value - firstVal) / Math.abs(firstVal)) * 100;
      } else if (indexMode && firstVal !== 0) {
        row[s.key] = (pt.value / firstVal) * 100;
      } else {
        row[s.key] = pt.value;
      }
      dateMap.set(pt.date, row);
    }
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals } as Record<string, string | number>));
}

export function MultiSeriesChart({
  series,
  isLoading,
  height = 400,
  percentMode = false,
}: MultiSeriesChartProps) {
  // 3개+ 시리즈 & 변화율 OFF → 자동 index(100) 정규화
  const autoIndex = series.length >= 3 && !percentMode;

  const chartData = useMemo(
    () => mergeSeriesData(series, percentMode, autoIndex),
    [series, percentMode, autoIndex]
  );

  // 원래 값 역산용: firstValues[key] = 시리즈 첫 번째 값
  const firstValues = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of series) {
      map[s.key] = s.data.length > 0 ? s.data[0].value : 0;
    }
    return map;
  }, [series]);

  if (isLoading) {
    return <Skeleton className="w-full" style={{ height }} />;
  }

  if (series.length === 0 || chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground border rounded-lg"
        style={{ height }}
      >
        차트 데이터가 없습니다
      </div>
    );
  }

  // 단일 시리즈 → AreaChart
  if (series.length === 1) {
    const s = series[0];
    const singleData = percentMode
      ? chartData.map((d) => ({ date: String(d.date), value: (d[s.key] as number) ?? 0 }))
      : s.data;

    return (
      <TimeSeriesChart
        data={singleData}
        height={height}
        unit={percentMode ? '%' : s.unit}
        color={s.color}
      />
    );
  }

  // 2개 시리즈 + 변화율 OFF → 이중 Y축
  const dualAxis = series.length === 2 && !percentMode;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: dualAxis ? 10 : 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          tickLine={false}
          axisLine={false}
          minTickGap={40}
        />
        {dualAxis ? (
          <>
            <YAxis
              yAxisId="left"
              tickFormatter={formatValue}
              tick={{ fontSize: 11, fill: series[0].color }}
              tickLine={false}
              axisLine={false}
              width={65}
              domain={['auto', 'auto']}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={formatValue}
              tick={{ fontSize: 11, fill: series[1].color }}
              tickLine={false}
              axisLine={false}
              width={65}
              domain={['auto', 'auto']}
            />
          </>
        ) : (
          <YAxis
            tickFormatter={(v: number) => {
              if (percentMode) return `${v.toFixed(1)}%`;
              if (autoIndex) return v.toFixed(0);
              return formatValue(v);
            }}
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            width={65}
            domain={['auto', 'auto']}
            label={autoIndex ? { value: '기준=100', position: 'insideTopLeft', fontSize: 10, fill: '#888', offset: -5 } : undefined}
          />
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '13px',
          }}
          labelFormatter={(label) => `${label}`}
          formatter={(value: any, name: any) => {
            const v = Number(value) || 0;
            const n = String(name || '');
            const s = series.find((s) => s.key === n);
            if (percentMode) {
              return [`${v.toFixed(2)}%`, s?.label || n];
            }
            if (autoIndex) {
              const first = firstValues[n] || 0;
              const original = first !== 0 ? (v / 100) * first : 0;
              const unitStr = s?.unit ? ` ${s.unit}` : '';
              return [
                `${original.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unitStr} (${v.toFixed(1)})`,
                s?.label || n,
              ];
            }
            return [
              `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}${s?.unit ? ' ' + s.unit : ''}`,
              s?.label || n,
            ];
          }}
        />
        <Legend
          formatter={(value: string) => {
            const s = series.find((s) => s.key === value);
            return s?.label || value;
          }}
          wrapperStyle={{ fontSize: '12px' }}
        />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls
            {...(dualAxis ? { yAxisId: i === 0 ? 'left' : 'right' } : {})}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
