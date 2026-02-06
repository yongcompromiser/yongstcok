'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { useTheme } from 'next-themes';
import { formatKRW } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartData = Record<string, any> & { label: string };

interface FinancialBarChartProps {
  data: ChartData[];
  bars: { key: string; name: string; color: string }[];
  height?: number;
}

// 매출/이익 바차트
export function FinancialBarChart({ data, bars, height = 300 }: FinancialBarChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
        <XAxis dataKey="label" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
        <YAxis
          tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
          tickFormatter={(v) => formatKRW(v)}
        />
        <Tooltip
          formatter={(value) => formatKRW(value as number)}
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#fff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            borderRadius: '8px',
            color: isDark ? '#f3f4f6' : '#111827',
          }}
        />
        <Legend />
        {bars.map((bar) => (
          <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.color} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface RatioLineChartProps {
  data: ChartData[];
  lines: { key: string; name: string; color: string }[];
  height?: number;
}

// 비율 라인차트 (마진율, ROE 등)
export function RatioLineChart({ data, lines, height = 300 }: RatioLineChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
        <XAxis dataKey="label" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
        <YAxis
          tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
          tickFormatter={(v) => `${v.toFixed(1)}%`}
        />
        <Tooltip
          formatter={(value) => `${Number(value).toFixed(2)}%`}
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#fff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            borderRadius: '8px',
            color: isDark ? '#f3f4f6' : '#111827',
          }}
        />
        <Legend />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

interface ComposedChartProps {
  data: ChartData[];
  bars: { key: string; name: string; color: string }[];
  lines: { key: string; name: string; color: string }[];
  height?: number;
}

// 바 + 라인 복합 차트
export function FinancialComposedChart({ data, bars, lines, height = 300 }: ComposedChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
        <XAxis dataKey="label" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
        <YAxis
          yAxisId="left"
          tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
          tickFormatter={(v) => formatKRW(v)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
          tickFormatter={(v) => `${v.toFixed(1)}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#fff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            borderRadius: '8px',
            color: isDark ? '#f3f4f6' : '#111827',
          }}
        />
        <Legend />
        {bars.map((bar) => (
          <Bar key={bar.key} yAxisId="left" dataKey={bar.key} name={bar.name} fill={bar.color} radius={[4, 4, 0, 0]} />
        ))}
        {lines.map((line) => (
          <Line
            key={line.key}
            yAxisId="right"
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
