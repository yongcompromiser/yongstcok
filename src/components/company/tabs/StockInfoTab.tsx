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
import { Shareholder, StockPrice } from '@/types/stock';
import { formatNumber, formatKRW } from '@/lib/utils';

interface StockInfoTabProps {
  totalShares: {
    commonShares: number;
    preferredShares: number;
    treasuryShares: number;
  } | null;
  shareholders: Shareholder[];
  price: StockPrice | null;
  isLoading: boolean;
}

export default function StockInfoTab({ totalShares, shareholders, price, isLoading }: StockInfoTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 주식 총수 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">주식 총수</CardTitle>
        </CardHeader>
        <CardContent>
          {totalShares ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoCard label="보통주" value={formatNumber(totalShares.commonShares) + '주'} />
              <InfoCard label="우선주" value={formatNumber(totalShares.preferredShares) + '주'} />
              <InfoCard label="자기주식" value={formatNumber(totalShares.treasuryShares) + '주'} />
              <InfoCard
                label="시가총액"
                value={price?.marketCap ? formatKRW(price.marketCap) : '-'}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              주식 정보가 없습니다
            </p>
          )}
        </CardContent>
      </Card>

      {/* 최대주주 현황 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">최대주주 현황</CardTitle>
        </CardHeader>
        <CardContent>
          {shareholders && shareholders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>주주명</TableHead>
                    <TableHead>관계</TableHead>
                    <TableHead className="text-right">보유주식수</TableHead>
                    <TableHead className="text-right">지분율</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shareholders.slice(0, 10).map((sh, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{sh.name}</TableCell>
                      <TableCell className="text-muted-foreground">{sh.relation}</TableCell>
                      <TableCell className="text-right">{formatNumber(sh.shares)}주</TableCell>
                      <TableCell className="text-right">{sh.sharePercent.toFixed(2)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              주주 정보가 없습니다
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}
