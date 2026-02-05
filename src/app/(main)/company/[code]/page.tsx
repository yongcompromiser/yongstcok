'use client';

import { use } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Star,
  StarOff,
  Building2,
  Calendar,
  DollarSign,
  BarChart3,
  FileText,
  StickyNote,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useStockPrice, useDisclosures } from '@/hooks/useStock';

export default function CompanyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [isWatchlisted, setIsWatchlisted] = useState(false);

  const { data, isLoading, error } = useStockPrice(code);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
      {/* 헤더 */}
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

      {/* 시세 요약 */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">시가</div>
            <div className="text-lg font-bold">
              {price.open.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">고가</div>
            <div className="text-lg font-bold text-red-500">
              {price.high.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">저가</div>
            <div className="text-lg font-bold text-blue-500">
              {price.low.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">전일종가</div>
            <div className="text-lg font-bold">
              {price.prevClose.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">거래량</div>
            <div className="text-lg font-bold">
              {price.volume.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        {(price.marketCap ?? 0) > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">시가총액</div>
              <div className="text-lg font-bold">
                {(price.marketCap ?? 0) >= 10000_0000_0000
                  ? `${((price.marketCap ?? 0) / 10000_0000_0000).toFixed(1)}조`
                  : `${((price.marketCap ?? 0) / 1_0000_0000).toFixed(0)}억`}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 탭 */}
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">
            <Building2 className="h-4 w-4 mr-1" />
            요약
          </TabsTrigger>
          <TabsTrigger value="disclosure">
            <FileText className="h-4 w-4 mr-1" />
            공시
          </TabsTrigger>
          <TabsTrigger value="memo">
            <StickyNote className="h-4 w-4 mr-1" />
            메모
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">차트</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center text-muted-foreground border rounded-md">
                차트 영역 (TradingView 연동 예정)
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disclosure">
          <DisclosureTab symbol={code} />
        </TabsContent>

        <TabsContent value="memo">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">내 메모</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <StickyNote className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>로그인 후 메모를 작성할 수 있습니다</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DisclosureTab({ symbol }: { symbol: string }) {
  const { data: disclosures, isLoading } = useDisclosures(symbol);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">최근 공시</CardTitle>
      </CardHeader>
      <CardContent>
        {disclosures && disclosures.length > 0 ? (
          <div className="space-y-3">
            {disclosures.map((item: any) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-medium text-sm">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.date}</span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            {process.env.NEXT_PUBLIC_DART_ENABLED === 'false'
              ? 'DART API 키가 설정되지 않았습니다'
              : '공시 정보가 없습니다'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
