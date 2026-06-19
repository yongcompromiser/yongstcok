'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { SeriesData } from '@/hooks/useEconomyChart';

interface HormuzBarChartProps {
  series: SeriesData[];
  isLoading?: boolean;
  height?: number;
}

const formatDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[1]}.${parts[2]}`;
  return dateStr;
};

const formatValue = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

function mergeSeries(series: SeriesData[]) {
  const dateMap = new Map<string, Record<string, number>>();
  for (const s of series) {
    for (const pt of s.data) {
      const row = dateMap.get(pt.date) || {};
      row[s.key] = pt.value;
      dateMap.set(pt.date, row);
    }
  }
  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals } as Record<string, string | number>));
}

export function HormuzBarChart({ series, isLoading, height = 400 }: HormuzBarChartProps) {
  const chartData = useMemo(() => mergeSeries(series), [series]);

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

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={formatValue}
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          tickLine={false}
          axisLine={false}
          width={50}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '13px',
          }}
          formatter={(value: number | string | undefined, name: number | string | undefined) => {
            const key = String(name ?? '');
            const s = series.find((x) => x.key === key);
            const v = Number(value) || 0;
            return [
              `${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}${s?.unit ? ' ' + s.unit : ''}`,
              s?.label || key,
            ];
          }}
        />
        {series.length > 1 && (
          <Legend
            formatter={(value: string) => series.find((s) => s.key === value)?.label || value}
            wrapperStyle={{ fontSize: '12px' }}
          />
        )}
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[2, 2, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
