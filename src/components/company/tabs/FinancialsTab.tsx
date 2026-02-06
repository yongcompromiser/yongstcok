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
import { MultiYearFinancials, FinancialData } from '@/types/stock';
import { formatKRW } from '@/lib/utils';
import { FinancialBarChart } from '../FinancialChart';

interface FinancialsTabProps {
  financials: MultiYearFinancials | null;
  isLoading: boolean;
}

export default function FinancialsTab({ financials, isLoading }: FinancialsTabProps) {
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

  const annualData = financials.annual;

  // 차트 데이터 변환
  const chartData = annualData.map((f) => ({
    label: f.period,
    revenue: f.revenue,
    operatingIncome: f.operatingIncome,
    netIncome: f.netIncome,
  }));

  return (
    <div className="space-y-4">
      {/* 손익 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">손익 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <FinancialBarChart
            data={chartData}
            bars={[
              { key: 'revenue', name: '매출액', color: '#3b82f6' },
              { key: 'operatingIncome', name: '영업이익', color: '#10b981' },
              { key: 'netIncome', name: '순이익', color: '#f59e0b' },
            ]}
          />
        </CardContent>
      </Card>

      {/* 손익계산서 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">손익계산서 (연간)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">항목</TableHead>
                  {annualData.map((f) => (
                    <TableHead key={f.period} className="text-right min-w-[100px]">
                      {f.period}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <FinancialRow label="매출액" data={annualData} field="revenue" />
                <FinancialRow label="영업이익" data={annualData} field="operatingIncome" />
                <FinancialRow label="순이익" data={annualData} field="netIncome" />
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 재무상태표 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">재무상태표 (연간)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">항목</TableHead>
                  {annualData.map((f) => (
                    <TableHead key={f.period} className="text-right min-w-[100px]">
                      {f.period}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <FinancialRow label="자산총계" data={annualData} field="assets" />
                <FinancialRow label="부채총계" data={annualData} field="liabilities" />
                <FinancialRow label="자본총계" data={annualData} field="equity" />
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FinancialRow({
  label,
  data,
  field,
}: {
  label: string;
  data: FinancialData[];
  field: keyof FinancialData;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      {data.map((f) => (
        <TableCell key={f.period} className="text-right">
          {formatKRW(f[field] as number)}
        </TableCell>
      ))}
    </TableRow>
  );
}
