'use client';

import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanyDetail, Disclosure, FinancialData } from '@/types/stock';
import { formatKRW } from '@/lib/utils';
import { useDisclosures } from '@/hooks/useStock';

interface SummaryTabProps {
  symbol: string;
  companyDetail: CompanyDetail | null;
  isLoading: boolean;
}

export default function SummaryTab({ symbol, companyDetail, isLoading }: SummaryTabProps) {
  const { data: disclosures, isLoading: disclosuresLoading } = useDisclosures(symbol);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const info = companyDetail?.info;
  const latestAnnual = companyDetail?.financials?.annual?.slice(-1)[0];

  return (
    <div className="space-y-4">
      {/* 기업 개요 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">기업 개요</CardTitle>
        </CardHeader>
        <CardContent>
          {info ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">대표자</span>
                <p className="font-medium">{info.ceoName || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">설립일</span>
                <p className="font-medium">
                  {info.establishDate
                    ? `${info.establishDate.slice(0, 4)}.${info.establishDate.slice(4, 6)}.${info.establishDate.slice(6, 8)}`
                    : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">결산월</span>
                <p className="font-medium">{info.accountMonth ? `${info.accountMonth}월` : '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">시장</span>
                <p className="font-medium">{info.corpClass === 'Y' ? '유가증권(KOSPI)' : '코스닥(KOSDAQ)'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">기업 정보를 불러올 수 없습니다</p>
          )}
        </CardContent>
      </Card>

      {/* 최근 실적 요약 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 연간 실적{latestAnnual ? ` (${latestAnnual.period})` : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          {latestAnnual ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <SummaryCard label="매출액" value={formatKRW(latestAnnual.revenue)} />
              <SummaryCard label="영업이익" value={formatKRW(latestAnnual.operatingIncome)} />
              <SummaryCard label="순이익" value={formatKRW(latestAnnual.netIncome)} />
              <SummaryCard label="자산총계" value={formatKRW(latestAnnual.assets)} />
              <SummaryCard label="부채총계" value={formatKRW(latestAnnual.liabilities)} />
              <SummaryCard label="자본총계" value={formatKRW(latestAnnual.equity)} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">재무 데이터가 없습니다</p>
          )}
        </CardContent>
      </Card>

      {/* 최근 공시 5건 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 공시</CardTitle>
        </CardHeader>
        <CardContent>
          {disclosuresLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : disclosures && disclosures.length > 0 ? (
            <div className="space-y-2">
              {disclosures.slice(0, 5).map((item: Disclosure) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="space-y-1 min-w-0 mr-2">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <span className="text-xs text-muted-foreground">{item.date}</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              공시 정보가 없습니다
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}
