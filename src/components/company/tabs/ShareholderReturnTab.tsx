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
import { DividendData } from '@/types/stock';
import { formatNumber } from '@/lib/utils';
import { RatioLineChart, FinancialBarChart } from '../FinancialChart';

interface ShareholderReturnTabProps {
  dividends: DividendData[];
  isLoading: boolean;
}

export default function ShareholderReturnTab({ dividends, isLoading }: ShareholderReturnTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-80" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!dividends || dividends.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-8">
            배당 정보가 없습니다
          </p>
        </CardContent>
      </Card>
    );
  }

  // 차트 데이터
  const chartData = dividends.map((d) => ({
    label: d.year,
    dividendPerShare: d.dividendPerShare,
    dividendYield: d.dividendYield,
    payoutRatio: d.payoutRatio,
  }));

  return (
    <div className="space-y-4">
      {/* 주당배당금 바차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">주당배당금 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <FinancialBarChart
            data={chartData}
            bars={[
              { key: 'dividendPerShare', name: '주당배당금(원)', color: '#10b981' },
            ]}
            height={250}
          />
        </CardContent>
      </Card>

      {/* 배당수익률 라인차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">배당수익률 / 배당성향 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <RatioLineChart
            data={chartData}
            lines={[
              { key: 'dividendYield', name: '배당수익률(%)', color: '#3b82f6' },
              { key: 'payoutRatio', name: '배당성향(%)', color: '#f59e0b' },
            ]}
            height={250}
          />
        </CardContent>
      </Card>

      {/* 배당 이력 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">배당 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>연도</TableHead>
                  <TableHead className="text-right">주당배당금</TableHead>
                  <TableHead className="text-right">배당수익률</TableHead>
                  <TableHead className="text-right">배당성향</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dividends.map((d) => (
                  <TableRow key={d.year}>
                    <TableCell className="font-medium">{d.year}</TableCell>
                    <TableCell className="text-right">{formatNumber(d.dividendPerShare)}원</TableCell>
                    <TableCell className="text-right">
                      {d.dividendYield ? `${d.dividendYield.toFixed(2)}%` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {d.payoutRatio ? `${d.payoutRatio.toFixed(2)}%` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
