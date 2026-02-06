'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Star,
  StarOff,
  Building2,
  Briefcase,
  BarChart3,
  Activity,
  TrendingUp as TrendingUpIcon,
  Gift,
  PieChart,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useStockPrice, useCompanyDetail } from '@/hooks/useStock';
import { formatKRW, formatNumber } from '@/lib/utils';

import StockChart from '@/components/company/StockChart';
import SummaryTab from '@/components/company/tabs/SummaryTab';
import BusinessInfoTab from '@/components/company/tabs/BusinessInfoTab';
import FinancialsTab from '@/components/company/tabs/FinancialsTab';
import FundamentalsTab from '@/components/company/tabs/FundamentalsTab';
import ValuationTab from '@/components/company/tabs/ValuationTab';
import ShareholderReturnTab from '@/components/company/tabs/ShareholderReturnTab';
import StockInfoTab from '@/components/company/tabs/StockInfoTab';
import ConsensusTab from '@/components/company/tabs/ConsensusTab';

export default function CompanyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [isWatchlisted, setIsWatchlisted] = useState(false);

  const { data, isLoading, error } = useStockPrice(code);
  const { data: companyDetail, isLoading: detailLoading } = useCompanyDetail(code);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-[400px]" />
        <div className="grid gap-4 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-xl font-medium text-muted-foreground">
          종목 정보를 찾을 수 없습니다
        </p>
        <p className="text-sm text-muted-foreground mt-2">종목코드: {code}</p>
        <Button className="mt-4" asChild>
          <Link href="/">메인으로</Link>
        </Button>
      </div>
    );
  }

  const { stock, price } = data;
  const isPositive = price.changePercent > 0;
  const isNegative = price.changePercent < 0;

  return (
    <div className="p-6 space-y-6">
      {/* 헤더: 종목명 + 코드 + 현재가 + 등락 */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{stock.name}</h1>
            <Badge variant="outline">{stock.symbol}</Badge>
            {stock.sector && <Badge variant="secondary">{stock.sector}</Badge>}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold">
              {price.price.toLocaleString()}원
            </span>
            <span
              className={`flex items-center text-lg ${
                isPositive
                  ? 'text-red-500'
                  : isNegative
                  ? 'text-blue-500'
                  : 'text-muted-foreground'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-5 w-5 mr-1" />
              ) : isNegative ? (
                <TrendingDown className="h-5 w-5 mr-1" />
              ) : null}
              {isPositive ? '+' : ''}
              {price.change.toLocaleString()}원 ({isPositive ? '+' : ''}
              {price.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        <Button
          variant={isWatchlisted ? 'default' : 'outline'}
          onClick={() => setIsWatchlisted(!isWatchlisted)}
        >
          {isWatchlisted ? (
            <>
              <Star className="h-4 w-4 mr-2 fill-current" />
              관심 등록됨
            </>
          ) : (
            <>
              <StarOff className="h-4 w-4 mr-2" />
              관심 등록
            </>
          )}
        </Button>
      </div>

      {/* 캔들스틱 차트 */}
      <StockChart symbol={code} />

      {/* 시세 요약 카드 */}
      <div className="grid gap-3 grid-cols-3 md:grid-cols-6">
        <PriceCard label="시가" value={formatNumber(price.open)} />
        <PriceCard label="고가" value={formatNumber(price.high)} className="text-red-500" />
        <PriceCard label="저가" value={formatNumber(price.low)} className="text-blue-500" />
        <PriceCard label="전일종가" value={formatNumber(price.prevClose)} />
        <PriceCard label="거래량" value={formatNumber(price.volume)} />
        <PriceCard
          label="시가총액"
          value={(price.marketCap ?? 0) > 0 ? formatKRW(price.marketCap!) : '-'}
        />
      </div>

      {/* 8탭 구조 */}
      <Tabs defaultValue="summary">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="summary" className="text-xs sm:text-sm">
            <Building2 className="h-4 w-4 mr-1 hidden sm:inline" />
            요약
          </TabsTrigger>
          <TabsTrigger value="business" className="text-xs sm:text-sm">
            <Briefcase className="h-4 w-4 mr-1 hidden sm:inline" />
            사업정보
          </TabsTrigger>
          <TabsTrigger value="financials" className="text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" />
            재무정보
          </TabsTrigger>
          <TabsTrigger value="fundamentals" className="text-xs sm:text-sm">
            <Activity className="h-4 w-4 mr-1 hidden sm:inline" />
            펀더멘탈
          </TabsTrigger>
          <TabsTrigger value="valuation" className="text-xs sm:text-sm">
            <TrendingUpIcon className="h-4 w-4 mr-1 hidden sm:inline" />
            벨류에이션
          </TabsTrigger>
          <TabsTrigger value="dividend" className="text-xs sm:text-sm">
            <Gift className="h-4 w-4 mr-1 hidden sm:inline" />
            주주환원
          </TabsTrigger>
          <TabsTrigger value="stockinfo" className="text-xs sm:text-sm">
            <PieChart className="h-4 w-4 mr-1 hidden sm:inline" />
            주식정보
          </TabsTrigger>
          <TabsTrigger value="consensus" className="text-xs sm:text-sm">
            <Users className="h-4 w-4 mr-1 hidden sm:inline" />
            컨센서스
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <SummaryTab
            symbol={code}
            companyDetail={companyDetail ?? null}
            isLoading={detailLoading}
          />
        </TabsContent>

        <TabsContent value="business" className="mt-4">
          <BusinessInfoTab
            info={companyDetail?.info ?? null}
            isLoading={detailLoading}
          />
        </TabsContent>

        <TabsContent value="financials" className="mt-4">
          <FinancialsTab
            financials={companyDetail?.financials ?? null}
            isLoading={detailLoading}
          />
        </TabsContent>

        <TabsContent value="fundamentals" className="mt-4">
          <FundamentalsTab
            financials={companyDetail?.financials ?? null}
            isLoading={detailLoading}
          />
        </TabsContent>

        <TabsContent value="valuation" className="mt-4">
          <ValuationTab
            financials={companyDetail?.financials ?? null}
            price={price}
            isLoading={detailLoading}
          />
        </TabsContent>

        <TabsContent value="dividend" className="mt-4">
          <ShareholderReturnTab
            dividends={companyDetail?.dividends ?? []}
            isLoading={detailLoading}
          />
        </TabsContent>

        <TabsContent value="stockinfo" className="mt-4">
          <StockInfoTab
            totalShares={companyDetail?.totalShares ?? null}
            shareholders={companyDetail?.shareholders ?? []}
            price={price}
            isLoading={detailLoading}
          />
        </TabsContent>

        <TabsContent value="consensus" className="mt-4">
          <ConsensusTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PriceCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-lg font-bold ${className || ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
