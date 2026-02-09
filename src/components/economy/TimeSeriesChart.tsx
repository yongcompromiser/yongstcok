'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

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

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    if (dateStr.includes('Q')) return dateStr; // 2024Q1
    if (dateStr.length === 6) {
      // YYYYMM → YY.MM
      return `${dateStr.slice(2, 4)}.${dateStr.slice(4, 6)}`;
    }
    // YYYY-MM-DD → MM.DD
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[1]}.${parts[2]}`;
    return dateStr;
  };

  const formatValue = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

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
