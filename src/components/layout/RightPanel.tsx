'use client';

import Link from 'next/link';
import { Star, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketData } from '@/hooks/useStock';

function PriceChange({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="flex items-center text-red-500 text-sm">
        <TrendingUp className="h-3 w-3 mr-0.5" />+{change.toFixed(2)}%
      </span>
    );
  } else if (change < 0) {
    return (
      <span className="flex items-center text-blue-500 text-sm">
        <TrendingDown className="h-3 w-3 mr-0.5" />
        {change.toFixed(2)}%
      </span>
    );
  }
  return (
    <span className="flex items-center text-muted-foreground text-sm">
      <Minus className="h-3 w-3 mr-0.5" />
      0.00%
    </span>
  );
}

function IndexBadge({ value }: { value: number }) {
  const isPositive = value > 0;
  const isZero = value === 0;
  return (
    <Badge
      variant="outline"
      className={`ml-2 ${
        isZero
          ? ''
          : isPositive
          ? 'text-red-500 border-red-500'
          : 'text-blue-500 border-blue-500'
      }`}
    >
      {isPositive ? '+' : ''}{value.toFixed(2)}%
    </Badge>
  );
}

export function RightPanel() {
  const { data: marketData, isLoading } = useMarketData();

  return (
    <aside className="hidden xl:flex w-72 flex-col border-l bg-background">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* 거래량 상위 종목 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-red-500" />
                상승 TOP
                {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))
              ) : marketData?.topRise?.length > 0 ? (
                marketData.topRise.slice(0, 5).map((stock: any) => (
                  <Link
                    key={stock.symbol}
                    href={`/company/${stock.symbol}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{stock.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {stock.symbol}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {stock.price.toLocaleString()}원
                      </p>
                      <PriceChange change={stock.changePercent} />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  데이터를 불러올 수 없습니다
                </p>
              )}
            </CardContent>
          </Card>

          {/* 시장 현황 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                시장 현황
                {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-6" />
                  <Skeleton className="h-6" />
                </>
              ) : marketData?.index ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">코스피</span>
                    <div className="text-right">
                      <span className="font-medium">
                        {marketData.index.kospi.value.toLocaleString()}
                      </span>
                      <IndexBadge value={marketData.index.kospi.changePercent} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">코스닥</span>
                    <div className="text-right">
                      <span className="font-medium">
                        {marketData.index.kosdaq.value.toLocaleString()}
                      </span>
                      <IndexBadge value={marketData.index.kosdaq.changePercent} />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  데이터를 불러올 수 없습니다
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </aside>
  );
}
