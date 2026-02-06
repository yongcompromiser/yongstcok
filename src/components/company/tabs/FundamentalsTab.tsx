'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { MultiYearFinancials } from '@/types/stock';
import { RatioLineChart } from '../FinancialChart';

interface FundamentalsTabProps {
  financials: MultiYearFinancials | null;
  isLoading: boolean;
}

interface FundamentalMetrics {
  label: string;
  operatingMargin: number;
  netMargin: number;
  roe: number;
  roa: number;
  debtRatio: number;
}

export default function FundamentalsTab({ financials, isLoading }: FundamentalsTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-80" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!financials || financials.annual.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-8">
            재무 데이터가 없습니다
          </p>
        </CardContent>
      </Card>
    );
  }

  const metrics: FundamentalMetrics[] = financials.annual.map((f) => {
    const operatingMargin = f.revenue ? (f.operatingIncome / f.revenue) * 100 : 0;
    const netMargin = f.revenue ? (f.netIncome / f.revenue) * 100 : 0;
    const roe = f.equity ? (f.netIncome / f.equity) * 100 : 0;
    const roa = f.assets ? (f.netIncome / f.assets) * 100 : 0;
    const debtRatio = f.equity ? (f.liabilities / f.equity) * 100 : 0;

    return { label: f.period, operatingMargin, netMargin, roe, roa, debtRatio };
  });

  return (
    <div className="space-y-4">
      {/* 수익성 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">수익성 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <RatioLineChart
            data={metrics}
            lines={[
              { key: 'operatingMargin', name: '영업이익률', color: '#3b82f6' },
              { key: 'netMargin', name: '순이익률', color: '#10b981' },
              { key: 'roe', name: 'ROE', color: '#f59e0b' },
              { key: 'roa', name: 'ROA', color: '#ef4444' },
            ]}
          />
        </CardContent>
      </Card>

      {/* 펀더멘탈 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">주요 지표</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">지표</TableHead>
                  {metrics.map((m) => (
                    <TableHead key={m.label} className="text-right min-w-[80px]">
                      {m.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <MetricRow label="영업이익률" data={metrics} field="operatingMargin" />
                <MetricRow label="순이익률" data={metrics} field="netMargin" />
                <MetricRow label="ROE" data={metrics} field="roe" />
                <MetricRow label="ROA" data={metrics} field="roa" />
                <MetricRow label="부채비율" data={metrics} field="debtRatio" />
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricRow({
  label,
  data,
  field,
}: {
  label: string;
  data: FundamentalMetrics[];
  field: keyof FundamentalMetrics;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      {data.map((m) => {
        const value = m[field] as number;
        return (
          <TableCell key={m.label} className="text-right">
            {isNaN(value) ? '-' : `${value.toFixed(2)}%`}
          </TableCell>
        );
      })}
    </TableRow>
  );
}
